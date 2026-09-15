import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@repo/database";
import { ArrowLeft } from "lucide-react";
import { requireLessonAccess } from "@/lib/subscriptionGuard";
import { ProgressButton } from "@/components/ProgressButton";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";
import { VimeoPlayer } from "@/components/VimeoPlayer";
import { LessonExperience } from "@/components/LessonExperience";

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

  for (const section of course.modules) {
    const lesson = section.lessons.find((l) => l.id === resolvedParams.lessonId);
    if (lesson) {
      currentLesson = lesson;
      currentModule = section;
      break;
    }
  }

  if (!currentLesson) notFound();

  const isCompleted = currentLesson.progress[0]?.isCompleted || false;

  const isFavorited = !!(await prisma.favorite.findUnique({
    where: { userId_lessonId: { userId: user.id, lessonId: currentLesson.id } },
    select: { id: true },
  }));

  // Estrutura serializável pro painel (client): seções + aulas + conclusão.
  const sections = course.modules.map((module) => ({
    id: module.id,
    title: module.title,
    lessons: module.lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      completed: !!lesson.progress[0]?.isCompleted,
    })),
  }));

  return (
    <div className="bg-[var(--color-brand-offwhite)] relative z-10">
      <LessonExperience
        courseSlug={course.slug}
        courseTitle={course.title}
        currentLessonId={currentLesson.id}
        sections={sections}
      >
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
      </LessonExperience>
    </div>
  );
}
