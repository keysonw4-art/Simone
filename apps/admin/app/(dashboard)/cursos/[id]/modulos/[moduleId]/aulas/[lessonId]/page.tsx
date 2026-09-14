import { requireAdminPage } from "@/lib/requireAdmin";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@repo/database";
import {
  deleteLessonAction,
  updateLessonAction,
} from "../../../../../../../../actions/lessons";
import { LessonForm } from "../../../../../../../../components/LessonForm";
import { DangerActionButton } from "../../../../../../../../components/DangerActionButton";

export default async function EditarAulaPage({
  params,
}: {
  params: Promise<{ id: string; moduleId: string; lessonId: string }>;
}) {
  await requireAdminPage();
  const { id, moduleId, lessonId } = await params;

  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, moduleId, deletedAt: null },
    select: {
      id: true,
      title: true,
      description: true,
      vimeoVideoId: true,
      isProtected: true,
      module: {
        select: {
          id: true,
          title: true,
          courseId: true,
          course: { select: { title: true } },
        },
      },
    },
  });

  if (!lesson || lesson.module.courseId !== id) notFound();

  const boundUpdate = updateLessonAction.bind(null, id, moduleId, lesson.id);
  const boundDelete = deleteLessonAction.bind(null, id, moduleId, lesson.id);

  return (
    <div>
      <Link
        href={`/cursos/${id}/modulos/${moduleId}`}
        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/60 hover:text-[var(--color-brand-sage)] mb-6 transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" /> {lesson.module.title}
      </Link>

      <header className="mb-10 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-4xl text-[var(--color-brand-charcoal)] tracking-wide">
            {lesson.title}
          </h1>
          <p className="text-[var(--color-brand-charcoal)]/60 mt-2 text-sm uppercase tracking-widest">
            {lesson.module.course.title} • {lesson.module.title}
          </p>
        </div>
        <DangerActionButton
          action={boundDelete}
          label="Excluir Aula"
          confirmMessage="Excluir esta aula?"
        />
      </header>

      <LessonForm
        action={boundUpdate}
        defaultValues={{
          title: lesson.title,
          description: lesson.description,
          vimeoVideoId: lesson.vimeoVideoId,
          isProtected: lesson.isProtected,
        }}
        submitLabel="Salvar Alterações"
        successMessage="Alterações salvas."
      />
    </div>
  );
}
