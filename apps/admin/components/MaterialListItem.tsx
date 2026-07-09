"use client";

import { ArrowUp, ArrowDown, FileText } from "lucide-react";
import type { PlanType } from "@repo/database";
import {
  deleteMaterialAction,
  moveMaterialDownAction,
  moveMaterialUpAction,
} from "../actions/materials";

type Props = {
  courseId: string;
  material: {
    id: string;
    title: string;
    description: string | null;
    filename: string;
    sizeBytes: number;
    requiredPlan: PlanType;
  };
  isFirst: boolean;
  isLast: boolean;
};

const PLAN_LABEL: Record<PlanType, string> = {
  BASIC: "Básico",
  INTERMEDIATE: "Intermediário",
  PREMIUM: "Premium",
};

const PLAN_STYLE: Record<PlanType, string> = {
  BASIC: "bg-[var(--color-brand-sage)]/10 text-[var(--color-brand-sage)]",
  INTERMEDIATE: "bg-[var(--color-brand-gold)]/10 text-[var(--color-brand-gold)]",
  PREMIUM: "bg-[var(--color-brand-charcoal)]/10 text-[var(--color-brand-charcoal)]",
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const iconBtn =
  "p-1.5 border border-black/10 rounded-sm hover:border-[var(--color-brand-charcoal)]/30 hover:bg-black/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed";

export function MaterialListItem({
  courseId,
  material,
  isFirst,
  isLast,
}: Props) {
  const moveUp = moveMaterialUpAction.bind(null, courseId, material.id);
  const moveDown = moveMaterialDownAction.bind(null, courseId, material.id);
  const remove = deleteMaterialAction.bind(null, courseId, material.id);

  return (
    <div className="flex items-center gap-4 px-6 py-4 border-b border-black/5 last:border-b-0 hover:bg-black/[0.015] transition-colors">
      <div className="flex flex-col gap-1">
        <form action={moveUp}>
          <button
            type="submit"
            disabled={isFirst}
            className={iconBtn}
            aria-label="Mover para cima"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </form>
        <form action={moveDown}>
          <button
            type="submit"
            disabled={isLast}
            className={iconBtn}
            aria-label="Mover para baixo"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      <div className="w-10 h-10 rounded-sm bg-[var(--color-brand-charcoal)]/5 text-[var(--color-brand-charcoal)]/60 flex items-center justify-center flex-shrink-0">
        <FileText className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[var(--color-brand-charcoal)] truncate">
          {material.title}
        </div>
        {material.description && (
          <p className="text-xs text-[var(--color-brand-charcoal)]/60 mt-0.5 truncate">
            {material.description}
          </p>
        )}
        <div className="text-[10px] font-mono text-[var(--color-brand-charcoal)]/40 mt-1 truncate">
          {material.filename} · {formatSize(material.sizeBytes)}
        </div>
      </div>

      <span
        className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm whitespace-nowrap ${PLAN_STYLE[material.requiredPlan]}`}
      >
        {PLAN_LABEL[material.requiredPlan]}
      </span>

      <form
        action={remove}
        onSubmit={(e) => {
          if (
            !confirm(
              "Excluir este material? O arquivo será removido do bucket.",
            )
          ) {
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
  );
}
