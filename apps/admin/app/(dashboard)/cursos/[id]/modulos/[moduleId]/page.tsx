import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Plus } from "lucide-react";
import { prisma } from "@repo/database";
import {
  deleteModuleAction,
  updateModuleAction,
} from "../../../../../../actions/modules";
import { ModuleForm } from "../../../../../../components/ModuleForm";
import { LessonListItem } from "../../../../../../components/LessonListItem";
import { DangerActionButton } from "../../../../../../components/DangerActionButton";

export default async function EditarModuloPage({
  params,
}: {
  params: Promise<{ id: string; moduleId: string }>;
}) {
  const { id, moduleId } = await params;

  const course = await prisma.course.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, title: true },
  });
  if (!course) notFound();

  const mod = await prisma.module.findFirst({
    where: { id: moduleId, courseId: course.id, deletedAt: null },
    select: { id: true, title: true, description: true, createdAt: true },
  });
  if (!mod) notFound();

  const lessons = await prisma.lesson.findMany({
    where: { moduleId: mod.id, deletedAt: null },
    orderBy: { order: "asc" },
    select: {
      id: true,
      title: true,
      vimeoVideoId: true,
      isProtected: true,
    },
  });

  const boundUpdate = updateModuleAction.bind(null, course.id, mod.id);
  const boundDelete = deleteModuleAction.bind(null, course.id, mod.id);

  return (
    <div>
      <Link
        href={`/cursos/${course.id}`}
        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/60 hover:text-[var(--color-brand-sage)] mb-6 transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" /> {course.title}
      </Link>

      <header className="mb-10 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-4xl text-[var(--color-brand-charcoal)] tracking-wide">
            {mod.title}
          </h1>
          <p className="text-[var(--color-brand-charcoal)]/60 mt-2 text-sm uppercase tracking-widest">
            {lessons.length} aula(s) • criado em{" "}
            {mod.createdAt.toLocaleDateString("pt-BR")}
          </p>
        </div>
        <DangerActionButton
          action={boundDelete}
          label="Excluir Seção"
          confirmMessage="Excluir esta seção?"
        />
      </header>

      <section className="mb-12">
        <h2 className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium mb-6">
          Dados da seção
        </h2>
        <ModuleForm
          action={boundUpdate}
          defaultValues={{ title: mod.title, description: mod.description }}
          submitLabel="Salvar Alterações"
          successMessage="Alterações salvas."
        />
      </section>

      <section>
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium">
            Aulas
          </h2>
          <Link
            href={`/cursos/${course.id}/modulos/${mod.id}/aulas/novo`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-brand-sage)] text-white text-[10px] uppercase tracking-widest rounded-sm hover:bg-[var(--color-brand-charcoal)] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Nova Aula
          </Link>
        </div>

        <div className="bg-white border border-black/5 rounded-lg overflow-hidden">
          {lessons.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-[var(--color-brand-charcoal)]/40 text-sm uppercase tracking-widest">
                Nenhuma aula criada ainda
              </p>
            </div>
          ) : (
            lessons.map((l, i) => (
              <LessonListItem
                key={l.id}
                courseId={course.id}
                moduleId={mod.id}
                lesson={l}
                isFirst={i === 0}
                isLast={i === lessons.length - 1}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
