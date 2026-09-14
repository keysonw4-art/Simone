// Runs only the rate-limit fixture in a transaction that ALWAYS rolls back.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
const prisma = new PrismaClient();

async function main() {
  const rollback = new Error('INTENTIONAL_TEST_ROLLBACK');
  let verified = false;
  try {
    await prisma.$transaction(async tx => {
      const mod = { exports: {} };
      const source = fs.readFileSync(path.resolve(__dirname, '../packages/auth/src/security.ts'), 'utf8');
      const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
      vm.runInNewContext(code, { module: mod, exports: mod.exports, Buffer,
        require: name => name === '@repo/database' ? { prisma: tx } : name === 'next/headers' ? {} : require(name) });
      const identity = crypto.randomUUID();
      const key = crypto.createHash('sha256').update('security-fixture:' + identity).digest('hex');
      const results = await Promise.all(Array.from({ length: 20 }, () => mod.exports.consumeRateLimit('security-fixture', identity, 5, 60)));
      assert.equal(results.filter(Boolean).length, 5);
      const before = await tx.rateLimit.findUniqueOrThrow({ where: { key } });
      assert.equal(before.hits, 5);
      assert.equal(await mod.exports.consumeRateLimit('security-fixture', identity, 5, 60), false);
      const after = await tx.rateLimit.findUniqueOrThrow({ where: { key } });
      assert.equal(before.expiresAt.getTime(), after.expiresAt.getTime());
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'security-test:' + identity}, 0))::text`;
      verified = true;
      throw rollback;
    }, { timeout: 15000 });
  } catch (error) { if (error !== rollback) throw error; }
  assert.equal(verified, true);
  console.log('Verified real PostgreSQL: 5/20 attempts accepted, denied window unchanged, transaction lock available; fixture rolled back.');
}
main().catch(error => { console.error({ name: error.name, message: 'Database security verification failed' }); process.exitCode = 1; }).finally(() => prisma.$disconnect());
