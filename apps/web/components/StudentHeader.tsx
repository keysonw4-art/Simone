"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { LogOut, User, Menu, X } from "lucide-react";
import { logoutAction } from "../actions/auth";

type Props = {
  user: {
    name: string | null | undefined;
    email: string | null | undefined;
    role?: string;
  };
};

const NAV = [
  { href: "/aluno/cursos", label: "Cursos" },
  { href: "/aluno/favoritos", label: "Favoritos" },
  { href: "/aluno/certificados", label: "Certificados" },
  { href: "/aluno/suporte", label: "Suporte" },
];

export function StudentHeader({ user }: Props) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Fecha o menu mobile ao navegar
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const display = user.name?.trim() || user.email || "Aluno";

  let roleLabel = "Aluno";
  if (user.role === "SUPER_ADMIN") roleLabel = "Super Admin";
  if (user.role === "ADMIN") roleLabel = "Administrador";

  const isStaff = user.role === "ADMIN" || user.role === "SUPER_ADMIN";

  return (
    <header className="w-full sticky top-0 z-50 backdrop-blur-md bg-[var(--color-brand-offwhite)]/80 border-b border-black/5">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-6">
        <Link href="/aluno" className="flex items-center gap-3 flex-shrink-0">
          <div className="w-10 h-10 border border-[var(--color-brand-gold)]/50 flex items-center justify-center text-[var(--color-brand-gold)] font-serif text-base tracking-tighter">
            SM
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="font-serif text-base text-[var(--color-brand-charcoal)] tracking-widest leading-none">
              SIMONE MENDES
            </span>
            <span className="text-[9px] uppercase tracking-[0.2em] text-[var(--color-brand-charcoal)]/60 mt-1">
              Portal do Aluno
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-[11px] uppercase font-medium tracking-[0.15em]">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`transition-colors ${
                  active
                    ? "text-[var(--color-brand-sage)]"
                    : "text-[var(--color-brand-charcoal)]/60 hover:text-[var(--color-brand-charcoal)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="hidden lg:flex flex-col text-right">
            <span className="text-xs text-[var(--color-brand-charcoal)] font-medium">
              {display}
            </span>
            <span className="text-[9px] uppercase tracking-[0.2em] text-[var(--color-brand-charcoal)]/50 mt-0.5">
              {roleLabel}
            </span>
          </div>

          {isStaff && (
            <a
              href={process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3000"}
              className="hidden lg:flex items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--color-brand-sage)] hover:text-white transition-colors px-3 py-2 border border-[var(--color-brand-sage)] rounded-sm hover:bg-[var(--color-brand-sage)]"
            >
              Ir para Admin
            </a>
          )}

          <Link
            href="/aluno/perfil"
            aria-label="Perfil"
            className={`flex items-center gap-2 text-[10px] uppercase tracking-widest transition-colors px-3 py-2 border rounded-sm ${
              pathname.startsWith("/aluno/perfil")
                ? "text-[var(--color-brand-sage)] border-[var(--color-brand-sage)]"
                : "text-[var(--color-brand-charcoal)]/60 border-black/10 hover:text-[var(--color-brand-sage)] hover:border-[var(--color-brand-sage)]"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Perfil</span>
          </Link>

          <form action={logoutAction}>
            <button
              type="submit"
              aria-label="Sair"
              className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--color-brand-charcoal)]/60 hover:text-red-500 transition-colors px-3 py-2 border border-black/10 rounded-sm hover:border-red-200"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </form>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuOpen}
            className="md:hidden flex items-center justify-center w-10 h-10 border border-black/10 rounded-sm text-[var(--color-brand-charcoal)]/70 hover:border-[var(--color-brand-sage)] hover:text-[var(--color-brand-sage)] transition-colors"
          >
            {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Menu mobile */}
      {menuOpen && (
        <nav className="md:hidden border-t border-black/5 bg-[var(--color-brand-offwhite)]/95 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-6 py-2 flex flex-col">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`py-3 text-xs uppercase tracking-[0.15em] border-b border-black/5 last:border-b-0 transition-colors ${
                    active
                      ? "text-[var(--color-brand-sage)] font-medium"
                      : "text-[var(--color-brand-charcoal)]/70"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            {isStaff && (
              <a
                href={
                  process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3000"
                }
                className="py-3 text-xs uppercase tracking-[0.15em] text-[var(--color-brand-sage)] border-t border-black/5"
              >
                Ir para Admin
              </a>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
