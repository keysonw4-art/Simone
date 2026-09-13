"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  PlayCircle,
  GraduationCap,
  Users,
  LifeBuoy,
  FileText,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import type { Role } from "@repo/database";
import { logoutAction } from "../actions/auth";

const navItems = [
  { href: "/", label: "Visão Geral", icon: LayoutDashboard },
  { href: "/produtos", label: "Cursos", icon: GraduationCap },
  { href: "/cursos", label: "Módulos", icon: PlayCircle },
  { href: "/alunos", label: "Alunos", icon: Users },
  { href: "/suporte", label: "Suporte", icon: LifeBuoy },
  { href: "/logs", label: "Logs", icon: FileText },
];

const roleLabels: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  SUPPORT: "Suporte",
  STUDENT: "Aluno",
};

type SidebarProps = {
  user: {
    name: string | null | undefined;
    email: string | null | undefined;
    role: Role;
  };
};

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Fecha o drawer ao navegar
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Trava o scroll do body quando o drawer está aberto (mobile)
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  return (
    <>
      {/* Barra superior — só mobile */}
      <header className="md:hidden fixed top-0 inset-x-0 h-16 z-30 bg-white border-b border-black/5 flex items-center justify-between px-4 shadow-sm">
        <Link href="/" className="flex flex-col">
          <span className="font-serif text-base tracking-widest text-[var(--color-brand-sage)] leading-none">
            SIMONE MENDES
          </span>
          <span className="text-[8px] uppercase tracking-[0.3em] text-[var(--color-brand-charcoal)]/60 mt-0.5">
            Admin
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          className="w-10 h-10 flex items-center justify-center border border-black/10 rounded-sm text-[var(--color-brand-charcoal)]/70"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Backdrop — só mobile, quando aberto */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — drawer no mobile, fixa no desktop */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 w-72 max-w-[85vw] md:max-w-none bg-white border-r border-black/5 flex flex-col h-screen shadow-sm transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        {/* Brand + close (mobile) */}
        <div className="p-8 border-b border-black/5 text-center relative">
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
            className="md:hidden absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-[var(--color-brand-charcoal)]/50 hover:text-[var(--color-brand-charcoal)]"
          >
            <X className="w-5 h-5" />
          </button>
          <Link href="/" className="block hover:opacity-80 transition-opacity">
            <h1 className="font-serif text-2xl tracking-widest text-[var(--color-brand-sage)]">
              SIMONE MENDES
            </h1>
            <p className="text-[9px] uppercase tracking-[0.3em] text-[var(--color-brand-charcoal)]/60 mt-1">
              Admin
            </p>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-8 flex flex-col gap-1 px-4 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isActive
                    ? "bg-[var(--color-brand-sage)]/10 text-[var(--color-brand-sage)] px-6 py-4 rounded-sm text-xs uppercase tracking-[0.15em] border-l-2 border-[var(--color-brand-sage)] flex items-center gap-3 font-medium"
                    : "hover:bg-black/5 px-6 py-4 rounded-sm text-xs uppercase tracking-[0.15em] text-[var(--color-brand-charcoal)]/70 hover:text-[var(--color-brand-charcoal)] transition-colors flex items-center gap-3 border-l-2 border-transparent"
                }
              >
                <Icon className="w-4 h-4" /> {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User + logout */}
        <div className="border-t border-black/5">
          <div className="px-6 py-4 flex flex-col gap-0.5">
            <p className="text-xs font-medium text-[var(--color-brand-charcoal)] truncate">
              {user.name ?? user.email ?? "Usuário"}
            </p>
            <p className="text-[9px] uppercase tracking-[0.2em] text-[var(--color-brand-charcoal)]/50">
              {roleLabels[user.role]}
            </p>
          </div>
          <form action={logoutAction} className="border-t border-black/5">
            <button
              type="submit"
              className="w-full px-6 py-4 flex items-center gap-3 text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/50 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
