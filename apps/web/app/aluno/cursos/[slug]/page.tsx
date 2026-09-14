import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@repo/database";
import { ArrowLeft, PlayCircle, FileText, Download } from "lucide-react";
import { requireSession } from "@/lib/subscriptionGuard";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";
import { resolveStudentAccess, canAccess } from "@/lib/entitlements";

export default async function CourseDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await requireSession();
  const resolvedParams = await params;

  const course = await prisma.course.findUnique({
    where: { slug: resolvedParams.slug, isArchived: false, deletedAt: null },
    include: {
      modules: {
        where: { deletedAt: null },
        orderBy: { order: "asc" },
        include: {
          lessons: {
            where: { deletedAt: null },
            orderBy: { order: "asc" },
            include: {
              progress: {
                where: { userId: user.id },
              },
            },
          },
        },
      },
    },
  });

  if (!course) {
    notFound();
  }

  // Acesso por-módulo: precisa ter direito a ESTE módulo (Course).
  const access = await resolveStudentAccess(user.id);
  if (!canAccess(access, course.id)) {
    redirect("/aluno/cursos");
  }

  // Estatísticas de progresso
  const totalLessons = course.modules.reduce(
    (acc, mod) => acc + mod.lessons.length,
    0
  );
  const completedLessons = course.modules.reduce((acc, mod) => {
    return (
      acc +
      mod.lessons.filter((lesson) => lesson.progress[0]?.isCompleted).length
    );
  }, 0);

  const progressPercentage =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Favoritos de módulos deste curso (uma query, resolve em O(1) por módulo)
  const moduleIds = course.modules.map((m) => m.id);
  const favoritedModules = moduleIds.length
    ? await prisma.favorite.findMany({
        where: { userId: user.id, moduleId: { in: moduleIds } },
        select: { moduleId: true },
      })
    : [];
  const favoritedModuleSet = new Set(
    favoritedModules.map((f) => f.moduleId as string),
  );

  const materials = await prisma.material.findMany({
    where: { courseId: course.id, deletedAt: null },
    orderBy: { order: "asc" },
    select: {
      id: true,
      title: true,
      description: true,
      filename: true,
      sizeBytes: true,
    },
  });

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <Link
        href="/aluno"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/50 hover:text-[var(--color-brand-sage)] transition-colors mb-12"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Voltar para Meus Cursos
      </Link>

      <div className="mb-16">
        <h1 className="font-serif text-4xl md:text-5xl text-[var(--color-brand-charcoal)] mb-6 tracking-tight">
          {course.title}
        </h1>
        {course.description && (
          <p className="text-base text-[var(--color-brand-charcoal)]/70 leading-relaxed max-w-3xl mb-8">
            {course.description}
          </p>
        )}

        <div className="flex items-center gap-6 text-[10px] uppercase tracking-widest">
          <div className="flex flex-col gap-1">
            <span className="text-[var(--color-brand-charcoal)]/40">Progresso</span>
            <span className="text-[var(--color-brand-sage)] font-medium text-sm">
              {progressPercentage}%
            </span>
          </div>
          <div className="flex-1 max-w-xs h-1 bg-black/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--color-brand-sage)] transition-all duration-1000"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <span className="text-[var(--color-brand-charcoal)]/40">Aulas</span>
            <span className="text-[var(--color-brand-charcoal)] font-medium text-sm">
              {completedLessons} / {totalLessons}
            </span>
          </div>
        </div>
      </div>

      {materials.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/60 mb-4 flex items-center gap-2">
            <FileText className="w-3.5 h-3.5" /> Materiais
          </h2>
          <div className="bg-white border border-black/5 rounded-sm overflow-hidden shadow-sm">
            {materials.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-4 px-5 py-4 border-b border-black/5 last:border-b-0"
              >
                <div className="w-10 h-10 rounded-sm flex items-center justify-center flex-shrink-0 bg-[var(--color-brand-sage)]/10 text-[var(--color-brand-sage)]">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--color-brand-charcoal)] truncate">
                    {m.title}
                  </div>
                  {m.description && (
                    <p className="text-xs text-[var(--color-brand-charcoal)]/60 mt-0.5 truncate">
                      {m.description}
                    </p>
                  )}
                  <div className="text-[10px] text-[var(--color-brand-charcoal)]/40 mt-1">
                    {formatSize(m.sizeBytes)}
                  </div>
                </div>
                <a
                  href={`/api/aluno/download/${m.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-widest border border-[var(--color-brand-sage)]/30 text-[var(--color-brand-sage)] rounded-sm hover:bg-[var(--color-brand-sage)]/5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Baixar
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="space-y-6">
        {course.modules.length === 0 ? (
          <div className="text-center py-16 bg-white border border-black/5 rounded-sm">
            <p className="text-sm text-[var(--color-brand-charcoal)]/50 uppercase tracking-widest">
              Nenhum módulo cadastrado neste curso
            </p>
          </div>
        ) : (
          course.modules.map((module) => (
            <div
              key={module.id}
              className="bg-white border border-black/5 rounded-sm overflow-hidden shadow-sm"
            >
              {module.title.trim() !== "" && (
                <div className="p-6 bg-[var(--color-brand-offwhite)]/50 border-b border-black/5 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif text-2xl text-[var(--color-brand-charcoal)]">
                      {module.title}
                    </h3>
                    {module.description && (
                      <p className="text-sm text-[var(--color-brand-charcoal)]/60 mt-2">
                        {module.description}
                      </p>
                    )}
                  </div>
                  <FavoriteToggleButton
                    kind="module"
                    id={module.id}
                    initial={favoritedModuleSet.has(module.id)}
                    compact
                  />
                </div>
              )}

              <div className="divide-y divide-black/5">
                {module.lessons.length === 0 ? (
                  <div className="p-6 text-xs text-[var(--color-brand-charcoal)]/40 uppercase tracking-widest text-center">
                    Nenhuma aula neste módulo
                  </div>
                ) : (
                  module.lessons.map((lesson, lIndex) => {
                    const isCompleted = lesson.progress[0]?.isCompleted;
                    return (
                      <Link
                        key={lesson.id}
                        href={`/aluno/cursos/${course.slug}/aulas/${lesson.id}`}
                        className="group flex items-center p-6 hover:bg-[var(--color-brand-offwhite)] transition-colors"
                      >
                        <div className="mr-6 flex-shrink-0">
                          {isCompleted ? (
                            <div className="w-8 h-8 rounded-full bg-[var(--color-brand-sage)]/10 text-[var(--color-brand-sage)] flex items-center justify-center">
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full border border-black/10 text-[var(--color-brand-charcoal)]/30 group-hover:border-[var(--color-brand-sage)]/50 group-hover:text-[var(--color-brand-sage)] flex items-center justify-center transition-colors">
                              <PlayCircle className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] uppercase tracking-widest text-[var(--color-brand-charcoal)]/40 mb-1">
                            Aula {lIndex + 1}
                          </div>
                          <h4 className="text-base font-medium text-[var(--color-brand-charcoal)] truncate group-hover:text-[var(--color-brand-sage)] transition-colors">
                            {lesson.title}
                          </h4>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
