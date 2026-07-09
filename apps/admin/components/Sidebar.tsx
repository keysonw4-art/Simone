"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  PlayCircle,
  Users,
  CreditCard,
  Tag,
  LifeBuoy,
  FileText,
  LogOut,
} from "lucide-react";
import type { Role } from "@repo/database";
import { logoutAction } from "../actions/auth";

const navItems = [
  { href: "/", label: "Visão Geral", icon: LayoutDashboard },
  { href: "/cursos", label: "Cursos", icon: PlayCircle },
  { href: "/alunos", label: "Alunos", icon: Users },
  { href: "/planos", label: "Planos", icon: Tag },
  { href: "/assinaturas", label: "Assinaturas", icon: CreditCard },
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

  return (
    <aside className="w-72 bg-white border-r border-black/5 flex flex-col h-screen sticky top-0 z-20 shadow-sm">
      {/* Brand */}
      <div className="p-8 border-b border-black/5 text-center">
        <h1 className="font-serif text-2xl tracking-widest text-[var(--color-brand-sage)]">
          SIMONE MENDES
        </h1>
        <p className="text-[9px] uppercase tracking-[0.3em] text-[var(--color-brand-charcoal)]/60 mt-1">
          Admin
        </p>
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
  );
}
