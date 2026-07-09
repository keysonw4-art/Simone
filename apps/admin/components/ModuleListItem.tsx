"use client";

import Link from "next/link";
import { ArrowUp, ArrowDown } from "lucide-react";
import {
  deleteModuleAction,
  moveModuleDownAction,
  moveModuleUpAction,
} from "../actions/modules";

type Props = {
  courseId: string;
  module: {
    id: string;
    title: string;
    description: string | null;
    order: number;
    _count: { lessons: number };
  };
  isFirst: boolean;
  isLast: boolean;
};

const iconBtn =
  "p-1.5 border border-black/10 rounded-sm hover:border-[var(--color-brand-charcoal)]/30 hover:bg-black/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed";

export function ModuleListItem({ courseId, module, isFirst, isLast }: Props) {
  const moveUp = moveModuleUpAction.bind(null, courseId, module.id);
  const moveDown = moveModuleDownAction.bind(null, courseId, module.id);
  const remove = deleteModuleAction.bind(null, courseId, module.id);

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
          href={`/cursos/${courseId}/modulos/${module.id}`}
          className="text-sm font-medium text-[var(--color-brand-charcoal)] hover:text-[var(--color-brand-sage)] transition-colors"
        >
          {module.title}
        </Link>
        {module.description && (
          <p className="text-xs text-[var(--color-brand-charcoal)]/60 mt-0.5 truncate">
            {module.description}
          </p>
        )}
      </div>

      <div className="text-xs text-[var(--color-brand-charcoal)]/60 whitespace-nowrap">
        {module._count.lessons} aula(s)
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={`/cursos/${courseId}/modulos/${module.id}`}
          className="px-3 py-1.5 text-[10px] uppercase tracking-widest border border-black/10 text-[var(--color-brand-charcoal)]/70 hover:border-[var(--color-brand-sage)] hover:text-[var(--color-brand-sage)] rounded-sm transition-colors"
        >
          Editar
        </Link>
        <form
          action={remove}
          onSubmit={(e) => {
            if (!confirm("Excluir este módulo? As aulas dentro dele permanecem no banco.")) {
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
