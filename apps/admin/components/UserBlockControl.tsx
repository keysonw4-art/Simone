"use client";

import { useState, useTransition } from "react";
import { Ban, Undo2 } from "lucide-react";
import { toggleUserBlockAction } from "../actions/users";

type Props = {
  targetUserId: string;
  isBlocked: boolean;
  disabled?: boolean;
};

export function UserBlockControl({
  targetUserId,
  isBlocked,
  disabled = false,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    if (disabled) return;
    if (
      !isBlocked &&
      !confirm(
        "Bloquear encerra as sessões e suspende o acesso do usuário. Compras e histórico são preservados. Continuar?",
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await toggleUserBlockAction(targetUserId);
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending || disabled}
        className={
          isBlocked
            ? "flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-widest border border-[var(--color-brand-sage)]/30 text-[var(--color-brand-sage)] rounded-sm hover:bg-[var(--color-brand-sage)]/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            : "flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-widest border border-red-200 text-red-600 rounded-sm hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        }
      >
        {isBlocked ? (
          <>
            <Undo2 className="w-3.5 h-3.5" />
            {pending ? "Reativando..." : "Reativar"}
          </>
        ) : (
          <>
            <Ban className="w-3.5 h-3.5" />
            {pending ? "Bloqueando..." : "Bloquear"}
          </>
        )}
      </button>
      {error && (
        <span className="text-red-500 text-[10px] font-medium max-w-[220px] text-right">
          {error}
        </span>
      )}
    </div>
  );
}
