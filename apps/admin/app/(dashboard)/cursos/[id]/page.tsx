import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Plus } from "lucide-react";
import { prisma } from "@repo/database";
import { updateCourseAction } from "../../../../actions/courses";
import { CourseForm } from "../../../../components/CourseForm";
import { CourseRowActions } from "../../../../components/CourseRowActions";
import { ModuleListItem } from "../../../../components/ModuleListItem";
import { CourseThumbnailUploader } from "../../../../components/CourseThumbnailUploader";
import { MaterialUploader } from "../../../../components/MaterialUploader";
import { MaterialListItem } from "../../../../components/MaterialListItem";

export default async function EditarCursoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const course = await prisma.course.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      thumbnail: true,
      isArchived: true,
      category: true,
      workloadHours: true,
      soldStandalone: true,
      standalonePriceCents: true,
      standaloneStripePriceId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!course) notFound();

  const modules = await prisma.module.findMany({
    where: { courseId: course.id, deletedAt: null },
    orderBy: { order: "asc" },
    select: {
      id: true,
      title: true,
      description: true,
      order: true,
      _count: { select: { lessons: { where: { deletedAt: null } } } },
    },
  });

  const materials = await prisma.material.findMany({
    where: { courseId: course.id, deletedAt: null },
    orderBy: { order: "asc" },
    select: {
      id: true,
      title: true,
      description: true,
      filename: true,
      sizeBytes: true,
      requiredPlan: true,
    },
  });

  const boundUpdate = updateCourseAction.bind(null, course.id);

  return (
    <div>
      <Link
        href="/cursos"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/60 hover:text-[var(--color-brand-sage)] mb-6 transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" /> Módulos
      </Link>

      <header className="mb-10 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="font-serif text-4xl text-[var(--color-brand-charcoal)] tracking-wide">
              {course.title}
            </h1>
            {course.isArchived && (
              <span className="text-[10px] uppercase tracking-widest px-2 py-1 bg-black/5 text-[var(--color-brand-charcoal)]/60 rounded-sm">
                Arquivado
              </span>
            )}
          </div>
          <p className="text-[var(--color-brand-charcoal)]/60 text-sm uppercase tracking-widest">
            {modules.length} seção(ões) • criado em{" "}
            {course.createdAt.toLocaleDateString("pt-BR")}
          </p>
        </div>
        <CourseRowActions
          courseId={course.id}
          isArchived={course.isArchived}
        />
      </header>

      <section className="mb-12">
        <h2 className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium mb-6">
          Imagem
        </h2>
        <CourseThumbnailUploader
          courseId={course.id}
          currentUrl={course.thumbnail}
        />
      </section>

      <section className="mb-12">
        <h2 className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium mb-6">
          Dados do módulo
        </h2>
        <CourseForm
          action={boundUpdate}
          defaultValues={{
            title: course.title,
            slug: course.slug,
            description: course.description,
            thumbnail: course.thumbnail,
            category: course.category,
            workloadHours: course.workloadHours,
            soldStandalone: course.soldStandalone,
            standalonePriceCents: course.standalonePriceCents,
            standaloneStripePriceId: course.standaloneStripePriceId,
          }}
          submitLabel="Salvar Alterações"
          successMessage="Alterações salvas."
        />
      </section>

      <section>
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium">
            Seções
          </h2>
          <Link
            href={`/cursos/${course.id}/modulos/novo`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-brand-sage)] text-white text-[10px] uppercase tracking-widest rounded-sm hover:bg-[var(--color-brand-charcoal)] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Nova Seção
          </Link>
        </div>

        <div className="bg-white border border-black/5 rounded-lg overflow-hidden">
          {modules.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-[var(--color-brand-charcoal)]/40 text-sm uppercase tracking-widest">
                Nenhuma seção criada ainda
              </p>
            </div>
          ) : (
            modules.map((m, i) => (
              <ModuleListItem
                key={m.id}
                courseId={course.id}
                module={m}
                isFirst={i === 0}
                isLast={i === modules.length - 1}
              />
            ))
          )}
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-6">
          <h2 className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium">
            Materiais
          </h2>
          <p className="text-[10px] text-[var(--color-brand-charcoal)]/50 mt-1">
            PDFs, planilhas, checklists — controle de acesso por plano.
          </p>
        </div>

        <div className="mb-6">
          <MaterialUploader courseId={course.id} />
        </div>

        <div className="bg-white border border-black/5 rounded-lg overflow-hidden">
          {materials.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-[var(--color-brand-charcoal)]/40 text-xs uppercase tracking-widest">
                Nenhum material anexado ainda
              </p>
            </div>
          ) : (
            materials.map((m, i) => (
              <MaterialListItem
                key={m.id}
                courseId={course.id}
                material={m}
                isFirst={i === 0}
                isLast={i === materials.length - 1}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
