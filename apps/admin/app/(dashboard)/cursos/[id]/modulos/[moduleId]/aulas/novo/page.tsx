import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@repo/database";
import { createLessonAction } from "../../../../../../../../actions/lessons";
import { LessonForm } from "../../../../../../../../components/LessonForm";

export default async function NovaAulaPage({
  params,
}: {
  params: Promise<{ id: string; moduleId: string }>;
}) {
  const { id, moduleId } = await params;

  const mod = await prisma.module.findFirst({
    where: { id: moduleId, courseId: id, deletedAt: null },
    select: {
      id: true,
      title: true,
      course: { select: { id: true, title: true } },
    },
  });
  if (!mod || mod.course.id !== id) notFound();

  const boundCreate = createLessonAction.bind(null, mod.course.id, mod.id);

  return (
    <div>
      <Link
        href={`/cursos/${mod.course.id}/modulos/${mod.id}`}
        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/60 hover:text-[var(--color-brand-sage)] mb-6 transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" /> {mod.title}
      </Link>

      <header className="mb-10">
        <h1 className="font-serif text-4xl text-[var(--color-brand-charcoal)] tracking-wide">
          Nova Aula
        </h1>
        <p className="text-[var(--color-brand-charcoal)]/60 mt-2 text-sm uppercase tracking-widest">
          {mod.course.title} • {mod.title}
        </p>
      </header>

      <LessonForm action={boundCreate} submitLabel="Criar Aula" />
    </div>
  );
}
