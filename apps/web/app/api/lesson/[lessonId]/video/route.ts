import { NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { auth } from "@repo/auth";
import { hasCourseEntitlement } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

/**
 * Retorna a URL do player Vimeo pro cliente montar o iframe.
 * Servidor valida:
 * - Sessão obrigatória
 * - Aula existe, não soft-deleted
 * - Se lesson.isProtected: aluno precisa de assinatura ativa
 *   (ADMIN/SUPER_ADMIN bypassam)
 *
 * URL só existe em memória do server + response JSON — nunca no HTML
 * do server-render.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ lessonId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { lessonId } = await ctx.params;

  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, deletedAt: null },
    select: {
      id: true,
      vimeoVideoId: true,
      isProtected: true,
      module: { select: { courseId: true } },
    },
  });
  if (!lesson) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (!lesson.vimeoVideoId) {
    return NextResponse.json({ error: "no_video" }, { status: 404 });
  }

  const role = session.user.role;
  const isStaff = role === "ADMIN" || role === "SUPER_ADMIN";

  if (lesson.isProtected && !isStaff) {
    // Acesso concedido só por entitlement ativo que cobre este módulo
    // (scope ALL ou COURSE). Assinatura legada NÃO concede acesso — o
    // fallback antigo dava acesso a qualquer curso pra qualquer assinante.
    const allowed = await hasCourseEntitlement(
      session.user.id,
      lesson.module.courseId,
    );

    if (!allowed) {
      await prisma.systemLog
        .create({
          data: {
            userId: session.user.id,
            event: "access_denied",
            origin: "lesson_video",
            description: JSON.stringify({
              lessonId: lesson.id,
              reason: "no_access",
            }),
          },
        })
        .catch(() => {});
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const url = `https://player.vimeo.com/video/${lesson.vimeoVideoId}?title=0&byline=0&portrait=0`;

  return NextResponse.json(
    { url },
    { headers: { "Cache-Control": "no-store" } },
  );
}
