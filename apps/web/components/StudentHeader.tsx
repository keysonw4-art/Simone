"use client";

import Link from "next/link";
import { LogOut, User } from "lucide-react";
import { logoutAction } from "../actions/auth";

type Props = {
  user: {
    name: string | null | undefined;
    email: string | null | undefined;
    role?: string;
  };
};

export function StudentHeader({ user }: Props) {
  const display = user.name?.trim() || user.email || "Aluno";

  let roleLabel = "Aluno";
  if (user.role === "SUPER_ADMIN") roleLabel = "Super Admin";
  if (user.role === "ADMIN") roleLabel = "Administrador";

  return (
    <header className="w-full sticky top-0 z-50 backdrop-blur-xl bg-[var(--color-brand-offwhite)]/80 border-b border-[var(--color-brand-gold)]/10">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/aluno" className="flex items-center gap-3">
          <div className="w-10 h-10 border border-[var(--color-brand-gold)]/50 flex items-center justify-center text-[var(--color-brand-gold)] font-serif text-base tracking-tighter">
            SM
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-base text-[var(--color-brand-charcoal)] tracking-widest leading-none">
              SIMONE MENDES
            </span>
            <span className="text-[9px] uppercase tracking-[0.2em] text-[var(--color-brand-charcoal)]/60 mt-1">
              Portal do Aluno
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-6">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs text-[var(--color-brand-charcoal)] font-medium">
              {display}
            </span>
            <span className="text-[9px] uppercase tracking-[0.2em] text-[var(--color-brand-charcoal)]/50 mt-0.5">
              {roleLabel}
            </span>
          </div>

          {(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && (
            <a
              href={process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3000"}
              className="hidden sm:flex items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--color-brand-sage)] hover:text-white transition-colors px-3 py-2 border border-[var(--color-brand-sage)] rounded-sm hover:bg-[var(--color-brand-sage)]"
            >
              Ir para Admin
            </a>
          )}

          <Link
            href="/aluno/perfil"
            className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--color-brand-charcoal)]/60 hover:text-[var(--color-brand-sage)] transition-colors px-3 py-2 border border-black/10 rounded-sm hover:border-[var(--color-brand-sage)]"
          >
            <User className="w-3.5 h-3.5" /> Perfil
          </Link>

          <form action={logoutAction}>
            <button
              type="submit"
              className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--color-brand-charcoal)]/60 hover:text-red-500 transition-colors px-3 py-2 border border-black/10 rounded-sm hover:border-red-200"
            >
              <LogOut className="w-3.5 h-3.5" /> Sair
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
