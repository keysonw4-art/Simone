import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@repo/database";
import { ArrowLeft, PlayCircle, CheckCircle2 } from "lucide-react";
import { requireLessonAccess } from "@/lib/subscriptionGuard";
import { ProgressButton } from "@/components/ProgressButton";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";
import { VimeoPlayer } from "@/components/VimeoPlayer";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>;
}) {
  const resolvedParams = await params;
  const { user } = await requireLessonAccess(resolvedParams.lessonId);

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

  if (!course) notFound();

  // Encontrar a aula atual iterando pelos módulos
  let currentLesson = null;
  let currentModule = null;

  for (const module of course.modules) {
    const lesson = module.lessons.find((l) => l.id === resolvedParams.lessonId);
    if (lesson) {
      currentLesson = lesson;
      currentModule = module;
      break;
    }
  }

  if (!currentLesson) notFound();

  const isCompleted = currentLesson.progress[0]?.isCompleted || false;

  const isFavorited = !!(await prisma.favorite.findUnique({
    where: { userId_lessonId: { userId: user.id, lessonId: currentLesson.id } },
    select: { id: true },
  }));

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[var(--color-brand-offwhite)] relative z-10">
      {/* Área Principal (Player de Vídeo) */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <Link
            href={`/aluno/cursos/${course.slug}`}
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/50 hover:text-[var(--color-brand-sage)] transition-colors mb-8"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar para o Curso
          </Link>

          <VimeoPlayer lessonId={currentLesson.id} />

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-12">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--color-brand-sage)] font-medium mb-3">
                {currentModule?.title}
              </div>
              <h1 className="font-serif text-3xl md:text-4xl text-[var(--color-brand-charcoal)] mb-4">
                {currentLesson.title}
              </h1>
              {currentLesson.description && (
                <p className="text-sm md:text-base text-[var(--color-brand-charcoal)]/70 leading-relaxed max-w-3xl">
                  {currentLesson.description}
                </p>
              )}
            </div>
            <div className="flex-shrink-0 flex flex-col sm:flex-row gap-3">
              <FavoriteToggleButton
                kind="lesson"
                id={currentLesson.id}
                initial={isFavorited}
              />
              <ProgressButton
                lessonId={currentLesson.id}
                isCompleted={isCompleted}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Direita (Navegação do Curso) */}
      <div className="w-full lg:w-96 bg-white border-l border-black/5 overflow-y-auto hidden lg:block h-screen sticky top-0">
        <div className="p-6 border-b border-black/5 bg-[var(--color-brand-offwhite)]/30">
          <h3 className="font-serif text-lg text-[var(--color-brand-charcoal)] leading-tight">
            {course.title}
          </h3>
        </div>

        <div className="divide-y divide-black/5">
          {course.modules.map((module, mIndex) => (
            <div key={module.id} className="bg-white">
              <div className="p-4 bg-black/5">
                <h4 className="text-[10px] uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium">
                  Módulo {mIndex + 1}
                </h4>
                <div className="text-sm font-medium text-[var(--color-brand-charcoal)] mt-1">
                  {module.title}
                </div>
              </div>

              <div>
                {module.lessons.map((lesson, lIndex) => {
                  const isCurrent = lesson.id === currentLesson?.id;
                  const lessonCompleted = lesson.progress[0]?.isCompleted;

                  return (
                    <Link
                      key={lesson.id}
                      href={`/aluno/cursos/${course.slug}/aulas/${lesson.id}`}
                      className={`group flex items-center p-4 transition-colors border-l-2 ${
                        isCurrent
                          ? "bg-[var(--color-brand-sage)]/5 border-[var(--color-brand-sage)]"
                          : "border-transparent hover:bg-black/5"
                      }`}
                    >
                      <div className="mr-4 flex-shrink-0">
                        {lessonCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-[var(--color-brand-sage)]" />
                        ) : (
                          <PlayCircle
                            className={`w-4 h-4 ${
                              isCurrent
                                ? "text-[var(--color-brand-sage)]"
                                : "text-[var(--color-brand-charcoal)]/30 group-hover:text-[var(--color-brand-charcoal)]/50"
                            }`}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-xs truncate ${
                            isCurrent
                              ? "text-[var(--color-brand-sage)] font-medium"
                              : "text-[var(--color-brand-charcoal)]/80 group-hover:text-[var(--color-brand-charcoal)]"
                          }`}
                        >
                          {lIndex + 1}. {lesson.title}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
