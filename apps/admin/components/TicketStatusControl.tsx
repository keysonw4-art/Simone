"use client";

import { useState, useTransition } from "react";
import type { TicketStatus } from "@repo/database";
import { updateTicketStatusAction } from "../actions/tickets";

const OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: "OPEN", label: "Aberto" },
  { value: "IN_PROGRESS", label: "Em atendimento" },
  { value: "RESOLVED", label: "Resolvido" },
  { value: "CLOSED", label: "Fechado" },
];

type Props = {
  ticketId: string;
  currentStatus: TicketStatus;
};

export function TicketStatusControl({ ticketId, currentStatus }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<TicketStatus>(currentStatus);

  const handleChange = (next: TicketStatus) => {
    if (next === status) return;
    setError(null);
    const previous = status;
    setStatus(next);
    startTransition(async () => {
      try {
        await updateTicketStatusAction(ticketId, next);
      } catch (e) {
        setStatus(previous);
        setError("Não foi possível alterar o status.");
      }
    });
  };

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <label className="text-[10px] uppercase tracking-widest text-[var(--color-brand-charcoal)]/60 font-medium">
        Status
      </label>
      <select
        value={status}
        disabled={pending}
        onChange={(e) => handleChange(e.target.value as TicketStatus)}
        className="bg-white border border-black/10 rounded-sm px-3 py-2 text-xs text-[var(--color-brand-charcoal)] focus:outline-none focus:border-[var(--color-brand-sage)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && (
        <span className="text-red-500 text-[10px] font-medium">{error}</span>
      )}
    </div>
  );
}
