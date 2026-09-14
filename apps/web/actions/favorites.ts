"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@repo/database";
import { auth } from "@repo/auth";
import { IdSchema, consumeRateLimit } from '@repo/auth/security';

export type ToggleFavoriteResult =
  | { ok: true; favorited: boolean }
  | { ok: false; error: string };

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user;
}

export async function toggleFavoriteLessonAction(
  lessonId: string,
): Promise<ToggleFavoriteResult> {
  const user = await requireUser();
  if (!IdSchema.safeParse(lessonId).success || !await consumeRateLimit('favorite', user.id, 30, 60)) return { ok: false, error: 'Dados inválidos ou limite de solicitações atingido.' };

  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, deletedAt: null, module: { deletedAt: null, course: { deletedAt: null, isArchived: false } } },
    select: { id: true, module: { select: { course: { select: { slug: true } } } } },
  });
  if (!lesson) return { ok: false, error: "Aula não encontrada." };

  const existing = await prisma.favorite.findUnique({
    where: { userId_lessonId: { userId: user.id, lessonId } },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    revalidatePath("/aluno/favoritos");
    revalidatePath(`/aluno/cursos/${lesson.module.course.slug}`);
    revalidatePath(`/aluno/cursos/${lesson.module.course.slug}/aulas/${lessonId}`);
    return { ok: true, favorited: false };
  }

  try {
    await prisma.favorite.create({
      data: { userId: user.id, lessonId },
    });
  } catch (error) {
    // Race: outra request criou entre findUnique e create
    console.error("[favorites] lesson create race:", error);
    return { ok: false, error: "Não foi possível salvar. Tente novamente." };
  }

  revalidatePath("/aluno/favoritos");
  revalidatePath(`/aluno/cursos/${lesson.module.course.slug}`);
  revalidatePath(`/aluno/cursos/${lesson.module.course.slug}/aulas/${lessonId}`);
  return { ok: true, favorited: true };
}

export async function toggleFavoriteModuleAction(
  moduleId: string,
): Promise<ToggleFavoriteResult> {
  const user = await requireUser();
  if (!IdSchema.safeParse(moduleId).success || !await consumeRateLimit('favorite', user.id, 30, 60)) return { ok: false, error: 'Dados inválidos ou limite de solicitações atingido.' };

  const mod = await prisma.module.findFirst({
    where: { id: moduleId, deletedAt: null, course: { deletedAt: null, isArchived: false } },
    select: { id: true, course: { select: { slug: true } } },
  });
  if (!mod) return { ok: false, error: "Módulo não encontrado." };

  const existing = await prisma.favorite.findUnique({
    where: { userId_moduleId: { userId: user.id, moduleId } },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    revalidatePath("/aluno/favoritos");
    revalidatePath(`/aluno/cursos/${mod.course.slug}`);
    return { ok: true, favorited: false };
  }

  try {
    await prisma.favorite.create({
      data: { userId: user.id, moduleId },
    });
  } catch (error) {
    console.error("[favorites] module create race:", error);
    return { ok: false, error: "Não foi possível salvar. Tente novamente." };
  }

  revalidatePath("/aluno/favoritos");
  revalidatePath(`/aluno/cursos/${mod.course.slug}`);
  return { ok: true, favorited: true };
}
