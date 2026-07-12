"use client";

import Link from "next/link";
import { ArrowUp, ArrowDown, Lock, LockOpen } from "lucide-react";
import {
  deleteLessonAction,
  moveLessonDownAction,
  moveLessonUpAction,
  toggleLessonProtectedAction,
} from "../actions/lessons";

type Props = {
  courseId: string;
  moduleId: string;
  lesson: {
    id: string;
    title: string;
    isProtected: boolean;
    vimeoVideoId: string | null;
  };
  isFirst: boolean;
  isLast: boolean;
};

const iconBtn =
  "p-1.5 border border-black/10 rounded-sm hover:border-[var(--color-brand-charcoal)]/30 hover:bg-black/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed";

export function LessonListItem({
  courseId,
  moduleId,
  lesson,
  isFirst,
  isLast,
}: Props) {
  const moveUp = moveLessonUpAction.bind(null, courseId, moduleId, lesson.id);
  const moveDown = moveLessonDownAction.bind(null, courseId, moduleId, lesson.id);
  const toggle = toggleLessonProtectedAction.bind(null, courseId, moduleId, lesson.id);
  const remove = deleteLessonAction.bind(null, courseId, moduleId, lesson.id);

  return (
    <div className="flex items-center gap-4 px-6 py-4 border-b border-black/5 last:border-b-0 hover:bg-black/[0.015] transition-colors">
      <div className="flex flex-col gap-1">
        <form action={moveUp}>
          <button type="submit" disabled={isFirst} className={iconBtn} aria-label="Mover para cima">
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </form>
        <form action={moveDown}>
          <button type="submit" disabled={isLast} className={iconBtn} aria-label="Mover para baixo">
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      <div className="flex-1 min-w-0">
        <Link
          href={`/cursos/${courseId}/modulos/${moduleId}/aulas/${lesson.id}`}
          className="text-sm font-medium text-[var(--color-brand-charcoal)] hover:text-[var(--color-brand-sage)] transition-colors"
        >
          {lesson.title}
        </Link>
        {lesson.vimeoVideoId && (
          <p className="text-[10px] text-[var(--color-brand-charcoal)]/50 mt-0.5 font-mono truncate">
            vimeo:{lesson.vimeoVideoId}
          </p>
        )}
      </div>

      <form action={toggle} title={lesson.isProtected ? "Tornar pública" : "Tornar protegida"}>
        <button
          type="submit"
          className={
            lesson.isProtected
              ? "p-2 border border-[var(--color-brand-sage)]/30 text-[var(--color-brand-sage)] bg-[var(--color-brand-sage)]/5 rounded-sm hover:bg-[var(--color-brand-sage)]/10 transition-colors"
              : "p-2 border border-black/10 text-[var(--color-brand-charcoal)]/50 rounded-sm hover:bg-black/5 transition-colors"
          }
          aria-label={lesson.isProtected ? "Protegida" : "Pública"}
        >
          {lesson.isProtected ? (
            <Lock className="w-3.5 h-3.5" />
          ) : (
            <LockOpen className="w-3.5 h-3.5" />
          )}
        </button>
      </form>

      <div className="flex items-center gap-2">
        <Link
          href={`/cursos/${courseId}/modulos/${moduleId}/aulas/${lesson.id}`}
          className="px-3 py-1.5 text-[10px] uppercase tracking-widest border border-black/10 text-[var(--color-brand-charcoal)]/70 hover:border-[var(--color-brand-sage)] hover:text-[var(--color-brand-sage)] rounded-sm transition-colors"
        >
          Editar
        </Link>
        <form
          action={remove}
          onSubmit={(e) => {
            if (!confirm("Excluir esta aula?")) {
              e.preventDefault();
            }
          }}
        >
          <button
            type="submit"
            className="px-3 py-1.5 text-[10px] uppercase tracking-widest border border-red-200 text-red-500/70 hover:border-red-500 hover:text-red-500 rounded-sm transition-colors"
          >
            Excluir
          </button>
        </form>
      </div>
    </div>
  );
}
