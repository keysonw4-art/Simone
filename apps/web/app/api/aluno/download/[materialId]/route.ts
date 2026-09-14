import { NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { auth } from "@repo/auth";
import { BUCKETS, getSignedUrl } from "@repo/storage";
import { hasCourseEntitlement } from "@/lib/entitlements";
import { IdSchema, consumeRateLimit } from '@repo/auth/security';

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ materialId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const { materialId } = await ctx.params;
  if (!IdSchema.safeParse(materialId).success) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  if (!await consumeRateLimit('download', session.user.id, 20, 60)) return NextResponse.json({ error: 'rate_limited' }, { status: 429, headers: { 'Retry-After': '60' } });

  const material = await prisma.material.findFirst({
    where: { id: materialId, deletedAt: null, course: { deletedAt: null, isArchived: false } },
    select: {
      id: true,
      path: true,
      filename: true,
      courseId: true,
    },
  });
  if (!material || !material.path) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const role = session.user.role;
  const isStaff = role === "ADMIN" || role === "SUPER_ADMIN";

  if (!isStaff) {
    // Acesso ao material só por entitlement ativo que cobre o módulo do
    // material. Assinatura legada não concede mais acesso.
    const allowed = await hasCourseEntitlement(
      session.user.id,
      material.courseId,
    );
    if (!allowed) {
      await prisma.systemLog
        .create({
          data: {
            userId: session.user.id,
            event: "access_denied",
            origin: "material_download",
            description: JSON.stringify({
              materialId: material.id,
              reason: "no_entitlement",
            }),
          },
        })
        .catch(() => {});
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  let url: string;
  try {
    url = await getSignedUrl(
      BUCKETS.ArquivosAlunos,
      material.path,
      60,
      material.filename,
    );
  } catch (error) {
    console.error("[download] signed URL failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const response = NextResponse.redirect(url, 302);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
