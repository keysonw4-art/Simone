"use client";

import { useTransition } from "react";
import { toggleLessonProgress } from "../actions/progress";
import { CheckCircle2, Circle } from "lucide-react";

type Props = {
  lessonId: string;
  isCompleted: boolean;
};

export function ProgressButton({ lessonId, isCompleted }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      await toggleLessonProgress(lessonId, !isCompleted);
    });
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest transition-all duration-300 rounded-sm border ${
        isCompleted
          ? "bg-[var(--color-brand-sage)]/10 text-[var(--color-brand-sage)] border-[var(--color-brand-sage)]/30 hover:bg-[var(--color-brand-sage)]/20"
          : "bg-transparent text-[var(--color-brand-charcoal)]/60 border-black/10 hover:border-[var(--color-brand-sage)]/50 hover:text-[var(--color-brand-sage)]"
      } ${isPending ? "opacity-50 cursor-wait" : ""}`}
    >
      {isCompleted ? (
        <>
          <CheckCircle2 className="w-4 h-4" />
          Concluída
        </>
      ) : (
        <>
          <Circle className="w-4 h-4" />
          Marcar como concluída
        </>
      )}
    </button>
  );
}
