"use client";

import Link from "next/link";
import {
  archiveCourseAction,
  deleteCourseAction,
  duplicateCourseAction,
} from "../actions/courses";

type Props = {
  courseId: string;
  isArchived: boolean;
};

const baseBtn =
  "px-3 py-1.5 text-[10px] uppercase tracking-widest rounded-sm transition-colors";

export function CourseRowActions({ courseId, isArchived }: Props) {
  const archive = archiveCourseAction.bind(null, courseId);
  const duplicate = duplicateCourseAction.bind(null, courseId);
  const remove = deleteCourseAction.bind(null, courseId);

  return (
    <div className="flex items-center gap-2 justify-end">
      <Link
        href={`/cursos/${courseId}`}
        className={`${baseBtn} border border-black/10 text-[var(--color-brand-charcoal)]/70 hover:border-[var(--color-brand-sage)] hover:text-[var(--color-brand-sage)]`}
      >
        Editar
      </Link>
      <form action={duplicate}>
        <button
          type="submit"
          className={`${baseBtn} border border-black/10 text-[var(--color-brand-charcoal)]/70 hover:border-[var(--color-brand-sage)] hover:text-[var(--color-brand-sage)]`}
        >
          Duplicar
        </button>
      </form>
      <form action={archive}>
        <button
          type="submit"
          className={`${baseBtn} border border-black/10 text-[var(--color-brand-charcoal)]/70 hover:border-[var(--color-brand-charcoal)]`}
        >
          {isArchived ? "Desarquivar" : "Arquivar"}
        </button>
      </form>
      <form
        action={remove}
        onSubmit={(e) => {
          if (!confirm("Excluir este módulo? Esta ação é reversível pelo banco.")) {
            e.preventDefault();
          }
        }}
      >
        <button
          type="submit"
          className={`${baseBtn} border border-red-200 text-red-500/70 hover:border-red-500 hover:text-red-500`}
        >
          Excluir
        </button>
      </form>
    </div>
  );
}
