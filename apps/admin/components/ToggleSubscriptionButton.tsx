"use client";

import { useState, useTransition } from "react";
import { toggleSubscriptionAction } from "../actions/subscriptions";

type Props = {
  subscriptionId: string;
  isActive: boolean;
};

export function ToggleSubscriptionButton({ subscriptionId, isActive }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleToggle = () => {
    setError(null);
    startTransition(async () => {
      const result = await toggleSubscriptionAction(subscriptionId);
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className={`text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-sm transition-colors border disabled:opacity-50 disabled:cursor-not-allowed ${
          isActive
            ? "border-red-500/20 text-red-600 hover:bg-red-50"
            : "border-[var(--color-brand-sage)]/20 text-[var(--color-brand-sage)] hover:bg-[var(--color-brand-sage)]/5"
        }`}
      >
        {isPending ? "Aguarde..." : isActive ? "Desativar" : "Ativar"}
      </button>
      {error && (
        <span className="text-red-500 text-[10px] font-medium max-w-[180px] text-right">
          {error}
        </span>
      )}
    </div>
  );
}
