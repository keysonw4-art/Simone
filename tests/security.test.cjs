const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { createRequire } = require("node:module");
const { NextResponse } = require("next/server");

const root = path.resolve(__dirname, "..");
const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const secondId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
function load(file, mocks = {}, env = {}) {
  const filename = path.join(root, file);
  const localRequire = createRequire(filename);
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText;
  vm.runInNewContext(
    code,
    {
      module: mod,
      exports: mod.exports,
      require: (name) => {
        if (name in mocks) return mocks[name];
        if (
          name.startsWith("@repo/") ||
          name.startsWith("@/") ||
          name.startsWith("./") ||
          name.startsWith("../")
        )
          throw new Error("Unmocked dependency: " + name);
        return localRequire(name);
      },
      Buffer,
      Error,
      Date,
      Headers,
      Request,
      Response,
      FormData,
      URL,
      process: {
        env: {
          NODE_ENV: "test",
          AUTH_SECRET: "isolated-security-test-not-for-production",
          ...env,
        },
      },
      console: { ...console, warn() {}, error() {} },
      setTimeout,
      clearTimeout,
    },
    { filename },
  );
  return mod.exports;
}

function security(prisma = {}) {
  return load("packages/auth/src/security.ts", {
    "@repo/database": { prisma },
    "next/headers": { headers: async () => new Headers() },
  });
}

test("redirects reject external, protocol-relative and control-character destinations", () => {
  const { safeRedirectTo } = security();
  for (const bad of [
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/\r\nevil",
    null,
  ]) {
    assert.equal(safeRedirectTo(bad, "/aluno"), "/aluno");
  }
  assert.equal(safeRedirectTo("/aluno/cursos?x=1"), "/aluno/cursos?x=1");
});

test("password validation enforces the bcrypt byte limit, not just character count", () => {
  const { PasswordSchema } = security();
  assert.equal(PasswordSchema.safeParse("SenhaTeste123").success, true);
  assert.equal(
    PasswordSchema.safeParse("Á".repeat(40) + "abc123").success,
    false,
  );
  assert.equal(PasswordSchema.safeParse("a".repeat(73) + "1").success, false);
});

test("rate limiting uses a bound atomic upsert and does not extend denied windows", async () => {
  let statement;
  const { consumeRateLimit } = security({
    $queryRaw: async (strings, ...values) => {
      statement = { sql: strings.join("?"), values };
      return [];
    },
  });
  assert.equal(
    await consumeRateLimit("login", "x';DROP TABLE User;--", 5, 60),
    false,
  );
  assert.match(statement.sql, /ON CONFLICT/);
  assert.match(
    statement.sql,
    /WHERE .*expiresAt.*CURRENT_TIMESTAMP OR .*hits.*< \?/s,
  );
  assert.doesNotMatch(statement.sql, /DROP TABLE/);
  assert.match(statement.values[0], /^[a-f0-9]{64}$/);
});

test("JWT has an absolute lifetime and rejects pre-migration sessions", async () => {
  const { authConfig } = load("packages/auth/src/config.ts");
  const jwt = authConfig.callbacks.jwt;
  assert.equal(await jwt({ token: { id } }), null);
  assert.equal(
    await jwt({ token: { id, authTime: Date.now() / 1000 - 7 * 86400 } }),
    null,
  );
  const current = await jwt({
    token: {},
    user: { id, role: "STUDENT", sessionVersion: 3 },
  });
  assert.equal(current.sessionVersion, 3);
  assert.equal(current.role, "STUDENT");
});

test("current database role, block and session generation override JWT claims", async () => {
  let configuration;
  let user = {
    role: "STUDENT",
    sessionVersion: 2,
    blockedAt: null,
    deletedAt: null,
  };
  const { authConfig } = load("packages/auth/src/config.ts");
  load("packages/auth/src/index.ts", {
    "next-auth": (config) => {
      configuration = config;
      return {};
    },
    "next-auth/providers/credentials": (config) => config,
    "@repo/database": { prisma: { user: { findUnique: async () => user } } },
    "./config": { authConfig },
    "./logging": {},
    "./rateLimit": {},
    "./security": security(),
  });
  const token = {
    id,
    role: "SUPER_ADMIN",
    sessionVersion: 2,
    authTime: Date.now() / 1000,
  };
  assert.equal(
    (await configuration.callbacks.jwt({ token: { ...token } })).role,
    "STUDENT",
  );
  user = { ...user, blockedAt: new Date() };
  assert.equal(
    await configuration.callbacks.jwt({ token: { ...token } }),
    null,
  );
  user = { ...user, blockedAt: null, sessionVersion: 3 };
  assert.equal(
    await configuration.callbacks.jwt({ token: { ...token } }),
    null,
  );
});

test("CSP generates fresh nonces, replaces forged headers and disallows eval in production", () => {
  const { createCspHeaders } = load(
    "packages/auth/src/csp.ts",
    {},
    { NODE_ENV: "production" },
  );
  const one = createCspHeaders(new Headers({ "x-nonce": "attacker" }), "web");
  const two = createCspHeaders(new Headers(), "web");
  assert.notEqual(one.headers.get("x-nonce"), "attacker");
  assert.notEqual(one.headers.get("x-nonce"), two.headers.get("x-nonce"));
  assert.match(one.policy, /frame-src https:\/\/player.vimeo.com/);
  const scripts = one.policy
    .split(";")
    .find((s) => s.trim().startsWith("script-src "));
  assert.doesNotMatch(scripts, /unsafe-inline|unsafe-eval/);
});

test("access expiry clamps month-end without rolling into another month", () => {
  const { addAccessMonths } = load("apps/web/lib/commerce.ts");
  assert.equal(
    addAccessMonths(new Date("2026-01-31T12:00:00Z"), 1).toISOString(),
    "2026-02-28T12:00:00.000Z",
  );
  assert.equal(
    addAccessMonths(new Date("2024-02-29T12:00:00Z"), 12).toISOString(),
    "2025-02-28T12:00:00.000Z",
  );
});

test("two simultaneous password reset attempts cannot both succeed", async () => {
  let generation = 0;
  let writes = 0;
  let chain = Promise.resolve();
  let usedAt = null;
  const tx = {
    user: {
      updateMany: async ({ where }) => {
        if (where.sessionVersion !== generation) return { count: 0 };
        generation++;
        return { count: 1 };
      },
      update: async () => {
        writes++;
      },
    },
    passwordResetToken: {
      updateMany: async ({ where }) => {
        if (where.id) {
          if (usedAt) return { count: 0 };
          usedAt = new Date();
        }
        return { count: 1 };
      },
    },
    auditLog: { create: async () => ({}) },
  };
  const prisma = {
    passwordResetToken: {
      findUnique: async () => ({
        id,
        userId: secondId,
        sessionVersion: 0,
        usedAt,
        expiresAt: new Date(Date.now() + 60000),
      }),
    },
    $transaction: (fn) => {
      const result = chain.then(() => fn(tx));
      chain = result.catch(() => {});
      return result;
    },
  };
  const { resetPasswordAction } = load("packages/auth/src/passwordReset.ts", {
    "@repo/database": { prisma },
    "@repo/email": {},
    "./security": {
      ...security(),
      consumeRateLimit: async () => true,
      requestIp: async () => "test",
    },
    bcryptjs: { hash: async () => "test-hash" },
  });
  const form = () => {
    const f = new FormData();
    f.set("token", "a".repeat(64));
    f.set("password", "NovaSenha123");
    f.set("confirm", "NovaSenha123");
    return f;
  };
  const result = await Promise.all([
    resetPasswordAction(undefined, form()),
    resetPasswordAction(undefined, form()),
  ]);
  assert.equal(result.filter((r) => r.ok).length, 1);
  assert.equal(writes, 1);
  assert.equal(generation, 1);
});

function webhookFixture({
  paid = true,
  matching = true,
  delivery = true,
} = {}) {
  const snapshot = {
    version: 1,
    kind: "course",
    id: secondId,
    name: "Dobras",
    priceId: "price_test",
    priceCents: 19700,
    currency: "brl",
    accessMonths: 12,
    grantsAll: false,
    courseIds: [secondId],
    certificateType: "DECLARATION",
  };
  let order = {
    id,
    userId: secondId,
    courseId: secondId,
    productId: null,
    amountCents: 19700,
    status: "PENDING",
    snapshot,
    user: {
      stripeCustomerId: "cus_test",
      email: "test@example.invalid",
      name: "Teste",
    },
    paymentEventAt: 0n,
  };
  let grants = 0;
  let transactionCount = 0;
  const session = {
    id: "cs_test",
    mode: "payment",
    payment_status: paid ? "paid" : "unpaid",
    payment_intent: "pi_test",
    customer: "cus_test",
    metadata: { purchaseId: id, userId: secondId },
    currency: "brl",
    amount_total: matching ? 19700 : 1,
    created: 1780000000,
    line_items: { data: [{ price: { id: "price_test" }, quantity: 1 }] },
  };
  let event = {
    id: "evt_test",
    type: "checkout.session.completed",
    created: 1780000001,
    data: { object: session },
  };
  const prisma = {
    purchase: {
      findUnique: async () => order,
      findUniqueOrThrow: async () => order,
      update: async ({ data }) => {
        order = { ...order, ...data };
        return order;
      },
      updateMany: async () => ({ count: 1 }),
    },
    entitlement: {
      createMany: async ({ data }) => {
        grants += data.length;
      },
    },
    auditLog: { create: async () => ({}) },
    systemLog: { create: async () => ({}) },
    $queryRaw: async () => [],
    $transaction: async (fn) => {
      transactionCount++;
      return fn(prisma);
    },
  };
  const stripe = {
    webhooks: { constructEvent: () => event },
    checkout: { sessions: { retrieve: async () => session } },
    paymentIntents: {
      retrieve: async () => ({
        status: "succeeded",
        latest_charge: {
          created: 1780000001,
          amount_refunded: 0,
          disputed: false,
        },
      }),
    },
    charges: {
      retrieve: async () => ({
        id: "ch_test",
        payment_intent: "pi_test",
        refunded: true,
        amount_refunded: 19700,
      }),
    },
  };
  const route = load(
    "apps/web/app/api/stripe/webhook/route.ts",
    {
      "next/server": { NextResponse },
      "@repo/database": { prisma },
      "@repo/email": {
        sendPurchaseConfirmationEmail: async () => ({ ok: true }),
      },
      "@/lib/stripe": { getStripe: () => stripe },
      "@/lib/commerce": load("apps/web/lib/commerce.ts"),
      "@/lib/emailDelivery": { deliverOnce: async () => delivery },
    },
    { STRIPE_WEBHOOK_SECRET: "whsec_fixture" },
  );
  return {
    post: () =>
      route.POST(
        new Request("https://test.invalid/api/stripe/webhook", {
          method: "POST",
          headers: { "stripe-signature": "fixture" },
          body: "{}",
        }),
      ),
    stats: () => ({ order, grants, transactionCount }),
    refund: () => {
      event = {
        ...event,
        type: "charge.refunded",
        data: { object: { id: "ch_test" } },
      };
    },
  };
}

test("unpaid checkout never grants access", async () => {
  const f = webhookFixture({ paid: false });
  assert.equal((await f.post()).status, 200);
  assert.equal(f.stats().grants, 0);
  assert.equal(f.stats().transactionCount, 0);
});
test("a price mismatch rejects fulfillment", async () => {
  const f = webhookFixture({ matching: false });
  assert.equal((await f.post()).status, 500);
  assert.equal(f.stats().grants, 0);
});
test("a repeated paid checkout grants access only once", async () => {
  const f = webhookFixture();
  assert.equal((await f.post()).status, 200);
  assert.equal((await f.post()).status, 200);
  assert.equal(f.stats().grants, 1);
  assert.equal(f.stats().order.status, "PAID");
});
test("full refund disables access without deleting purchase history", async () => {
  const f = webhookFixture();
  await f.post();
  f.refund();
  assert.equal((await f.post()).status, 200);
  assert.equal(f.stats().order.status, "REFUNDED");
  assert.equal(f.stats().order.accessSuspended, true);
});
test("email failure keeps paid access and asks Stripe to retry idempotently", async () => {
  const f = webhookFixture({ delivery: false });
  assert.equal((await f.post()).status, 500);
  assert.equal(f.stats().order.status, "PAID");
  await f.post();
  assert.equal(f.stats().grants, 1);
});

async function certificateFixture({
  complete = true,
  type = "PROFESSIONAL",
  entitled = true,
} = {}) {
  let creates = 0;
  const tx = {
    $queryRaw: async () => [],
    user: { findFirst: async () => ({ name: "Aluno" }) },
    purchase: {
      findMany: async () =>
        entitled
          ? [
              {
                id,
                productId: id,
                snapshot: null,
                product: {
                  name: "Formação",
                  certificateType: type,
                  productCourses: [{ courseId: id }, { courseId: secondId }],
                },
                entitlements: [
                  { scope: "ALL", expiresAt: new Date(Date.now() + 60000) },
                ],
              },
            ]
          : [],
    },
    course: {
      findMany: async () =>
        [id, secondId].map((value) => ({
          id: value,
          modules: [{ lessons: [{ id: value }] }],
        })),
    },
    progress: { count: async () => (complete ? 2 : 1) },
    certificate: {
      findFirst: async () => null,
      create: async ({ data }) => {
        creates++;
        return data;
      },
    },
    certificateCounter: { upsert: async () => ({}) },
    auditLog: { create: async () => ({}) },
  };
  const { issueCertificateIfEligible } = load("apps/web/lib/certificates.ts", {
    "@repo/database": { prisma: { $transaction: (fn) => fn(tx) } },
    "./commerce": load("apps/web/lib/commerce.ts"),
  });
  return {
    certificate: await issueCertificateIfEligible(secondId, id),
    creates,
  };
}
test("one completed module cannot issue a full formation certificate", async () => {
  assert.equal((await certificateFixture({ complete: false })).creates, 0);
});
test("certificateType null is respected and missing access is rejected", async () => {
  assert.equal((await certificateFixture({ type: null })).creates, 0);
  assert.equal((await certificateFixture({ entitled: false })).creates, 0);
});
test("100% of the purchased curriculum issues the configured product certificate", async () => {
  const { certificate, creates } = await certificateFixture();
  assert.equal(creates, 1);
  assert.equal(certificate.productId, id);
  assert.equal(certificate.courseId, null);
  assert.equal(certificate.type, "PROFESSIONAL");
});

test("image pixel bombs are rejected before any storage write", async () => {
  const sharp = createRequire(path.join(root, "packages/storage/package.json"))(
    "sharp",
  );
  let writes = 0;
  class StorageUploadError extends Error {}
  const { uploadImage } = load("packages/storage/src/upload.ts", {
    "./client": {
      serverClient: () => {
        writes++;
        throw new Error("must not write");
      },
    },
    "./errors": { StorageUploadError, StorageValidationError: Error },
  });
  const image = await sharp({
    create: { width: 4100, height: 4100, channels: 3, background: "#fff" },
  })
    .png()
    .toBuffer();
  await assert.rejects(
    uploadImage({
      bucket: "fotos-perfil",
      path: "test.webp",
      file: new Blob([image], { type: "image/png" }),
    }),
    StorageUploadError,
  );
  assert.equal(writes, 0);
});

test("all admin audit writes are attached to the transaction client", () => {
  for (const filename of fs
    .readdirSync(path.join(root, "apps/admin/actions"))
    .filter((f) => f.endsWith(".ts"))) {
    const source = ts.createSourceFile(
      filename,
      fs.readFileSync(path.join(root, "apps/admin/actions", filename), "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    const visit = (node) => {
      if (
        ts.isCallExpression(node) &&
        node.expression.getText(source) === "logAuditEvent"
      ) {
        assert.equal(
          node.arguments.length,
          2,
          filename + ": audit must receive tx",
        );
        assert.equal(node.arguments[1].getText(source), "tx", filename);
      }
      if (
        ts.isCallExpression(node) &&
        node.expression.getText(source) === "prisma.$transaction"
      ) {
        const callback = node.arguments[0];
        if (callback && ts.isArrowFunction(callback)) {
          const inspect = (child) => {
            if (ts.isCallExpression(child)) {
              const called = child.expression.getText(source);
              assert.ok(
                !called.startsWith("prisma."),
                filename + ": query escaped transaction: " + called,
              );
              assert.ok(
                !["uploadFile", "uploadImage", "deleteObject"].includes(called),
                filename + ": storage must stay outside DB transaction",
              );
            }
            ts.forEachChild(child, inspect);
          };
          inspect(callback.body);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
});

test("protected video checks the exact course and archived parent hierarchy", async () => {
  let filter;
  let checkedCourse;
  const { GET } = load("apps/web/app/api/lesson/[lessonId]/video/route.ts", {
    "next/server": { NextResponse },
    "@repo/auth": { auth: async () => ({ user: { id, role: "STUDENT" } }) },
    "@repo/auth/security": {
      ...security(),
      consumeRateLimit: async () => true,
    },
    "@repo/database": {
      prisma: {
        lesson: {
          findFirst: async ({ where }) => {
            filter = where;
            return {
              id,
              vimeoVideoId: "1234",
              isProtected: true,
              module: { courseId: secondId },
            };
          },
        },
        systemLog: { create: async () => ({}) },
      },
    },
    "@/lib/entitlements": {
      hasCourseEntitlement: async (_user, course) => {
        checkedCourse = course;
        return false;
      },
    },
  });
  const response = await GET(new Request("https://test.invalid"), {
    params: Promise.resolve({ lessonId: id }),
  });
  assert.equal(response.status, 403);
  assert.equal(checkedCourse, secondId);
  assert.equal(filter.module.deletedAt, null);
  assert.equal(filter.module.course.isArchived, false);
});

test("legacy bcrypt upgrades are conditional and never overwrite a concurrent reset", async () => {
  const { authConfig } = load("packages/auth/src/config.ts");
  for (const [rounds, matches, affected] of [
    [10, true, 1],
    [10, true, 0],
    [12, true, 1],
    [10, false, 1],
  ]) {
    let configuration;
    const updates = [];
    let hashes = 0;
    const user = {
      id,
      email: "student@example.invalid",
      role: "STUDENT",
      name: "Fixture",
      sessionVersion: 4,
      passwordHash: "previous-hash",
      blockedAt: null,
      deletedAt: null,
    };
    load("packages/auth/src/index.ts", {
      "next-auth": (config) => {
        configuration = config;
        return {};
      },
      "next-auth/providers/credentials": (config) => config,
      "@repo/database": {
        prisma: {
          user: {
            findUnique: async () => user,
            updateMany: async (args) => {
              updates.push(args);
              return { count: affected };
            },
          },
        },
      },
      bcryptjs: {
        compare: async () => matches,
        getRounds: () => rounds,
        hash: async (_password, cost) => {
          hashes++;
          assert.equal(cost, 12);
          return "upgraded-hash";
        },
      },
      "./config": { authConfig },
      "./logging": {
        extractIp: () => "127.0.0.1",
        logLoginFailure: async () => {},
      },
      "./rateLimit": { checkLoginRateLimit: async () => ({ blocked: false }) },
      "./security": security(),
    });
    const result = await configuration.providers[0].authorize(
      { email: user.email, password: "FixturePassword123" },
      new Request("https://test.invalid"),
    );
    const shouldUpgrade = matches && rounds < 12;
    assert.equal(hashes, shouldUpgrade ? 1 : 0);
    assert.equal(updates.length, shouldUpgrade ? 1 : 0);
    if (shouldUpgrade) {
      assert.equal(updates[0].where.passwordHash, "previous-hash");
      assert.equal(updates[0].where.sessionVersion, 4);
      assert.equal(updates[0].where.blockedAt, null);
      assert.equal(updates[0].where.deletedAt, null);
      assert.equal(updates[0].data.passwordHash, "upgraded-hash");
    }
    if (matches) assert.equal(result.sessionVersion, 4);
    else assert.equal(result, null);
  }
});

test("public cron invocation cannot reach the database", async () => {
  const { GET } = load(
    "apps/web/app/api/cron/expiry-warning/route.ts",
    {
      "next/server": { NextResponse },
      "@repo/database": { prisma: {} },
      "@repo/email": {},
      "@repo/auth/security": {},
      "@/lib/emailDelivery": {},
    },
    { CRON_SECRET: "private-fixture" },
  );
  assert.equal((await GET(new Request("https://test.invalid"))).status, 401);
});
