"use client";

import { useState, useTransition } from "react";
import type { Role } from "@repo/database";
import { updateUserRoleAction } from "../actions/users";

type Props = {
  targetUserId: string;
  currentRole: Role;
  canAssignAdmin: boolean;
};

const LABELS: Record<Role, string> = {
  STUDENT: "Aluno",
  SUPPORT: "Suporte",
  ADMIN: "Administrador",
  SUPER_ADMIN: "Super Admin",
};

export function UserRoleControl({
  targetUserId,
  currentRole,
  canAssignAdmin,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [role, setRole] = useState<Role>(currentRole);
  const [error, setError] = useState<string | null>(null);

  if (currentRole === "SUPER_ADMIN") {
    return (
      <span className="text-[10px] uppercase tracking-widest text-[var(--color-brand-charcoal)]/40">
        Super Admin — não editável
      </span>
    );
  }

  const handleChange = (next: Role) => {
    if (next === role) return;
    const previous = role;
    setRole(next);
    setError(null);
    startTransition(async () => {
      const result = await updateUserRoleAction(targetUserId, next);
      if (!result.ok) {
        setRole(previous);
        setError(result.error);
      }
    });
  };

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <label className="text-[10px] uppercase tracking-widest text-[var(--color-brand-charcoal)]/60 font-medium">
        Perfil
      </label>
      <select
        value={role}
        disabled={pending}
        onChange={(e) => handleChange(e.target.value as Role)}
        className="bg-white border border-black/10 rounded-sm px-3 py-2 text-xs text-[var(--color-brand-charcoal)] focus:outline-none focus:border-[var(--color-brand-sage)] disabled:opacity-50"
      >
        <option value="STUDENT">{LABELS.STUDENT}</option>
        <option value="SUPPORT">{LABELS.SUPPORT}</option>
        <option value="ADMIN" disabled={!canAssignAdmin}>
          {LABELS.ADMIN}
          {!canAssignAdmin ? " (só SUPER_ADMIN)" : ""}
        </option>
      </select>
      {error && (
        <span className="text-red-500 text-[10px] font-medium">{error}</span>
      )}
    </div>
  );
}
