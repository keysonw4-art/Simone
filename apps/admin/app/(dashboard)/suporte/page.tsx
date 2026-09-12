import Link from "next/link";
import { prisma } from "@repo/database";
import type { TicketStatus } from "@repo/database";

type StatusFilter = TicketStatus | "all";

function normalizeFilter(v: string | undefined): StatusFilter {
  if (v === "IN_PROGRESS" || v === "RESOLVED" || v === "CLOSED" || v === "OPEN" || v === "all") {
    return v;
  }
  return "OPEN";
}

const STATUS_LABELS: Record<TicketStatus, { label: string; color: string }> = {
  OPEN: { label: "Aberto", color: "bg-[var(--color-brand-sage)]/10 text-[var(--color-brand-sage)]" },
  IN_PROGRESS: { label: "Em atendimento", color: "bg-[var(--color-brand-gold)]/10 text-[var(--color-brand-gold)]" },
  RESOLVED: { label: "Resolvido", color: "bg-black/5 text-[var(--color-brand-charcoal)]/70" },
  CLOSED: { label: "Fechado", color: "bg-black/5 text-[var(--color-brand-charcoal)]/50" },
};

const FILTERS: { key: StatusFilter; label: string; href: string }[] = [
  { key: "OPEN", label: "Abertos", href: "/suporte" },
  { key: "IN_PROGRESS", label: "Em atendimento", href: "/suporte?status=IN_PROGRESS" },
  { key: "RESOLVED", label: "Resolvidos", href: "/suporte?status=RESOLVED" },
  { key: "CLOSED", label: "Fechados", href: "/suporte?status=CLOSED" },
  { key: "all", label: "Todos", href: "/suporte?status=all" },
];

export default async function AdminSuportePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: rawStatus } = await searchParams;
  const filter = normalizeFilter(rawStatus);

  const where = filter === "all"
    ? { deletedAt: null }
    : { deletedAt: null, status: filter };

  const tickets = await prisma.supportTicket.findMany({
    where,
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: {
      user: { select: { name: true, email: true, publicId: true } },
      _count: { select: { messages: true } },
    },
  });

  return (
    <div>
      <header className="mb-10">
        <h1 className="font-serif text-4xl text-[var(--color-brand-charcoal)] tracking-wide">
          Suporte
        </h1>
        <p className="text-[var(--color-brand-charcoal)]/60 mt-2 text-sm uppercase tracking-widest">
          Chamados de alunos
        </p>
      </header>

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {FILTERS.map((f) => {
          const isActive = f.key === filter;
          return (
            <Link
              key={f.key}
              href={f.href}
              className={
                isActive
                  ? "px-4 py-2 text-[10px] uppercase tracking-widest border border-[var(--color-brand-sage)] text-[var(--color-brand-sage)] bg-[var(--color-brand-sage)]/5 rounded-sm"
                  : "px-4 py-2 text-[10px] uppercase tracking-widest border border-black/10 text-[var(--color-brand-charcoal)]/60 hover:border-[var(--color-brand-charcoal)]/30 hover:text-[var(--color-brand-charcoal)] rounded-sm transition-colors"
              }
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <div className="bg-white border border-black/5 rounded-lg overflow-x-auto">
        {tickets.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[var(--color-brand-charcoal)]/40 text-sm uppercase tracking-widest">
              Nenhum chamado neste filtro
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-black/5 text-[10px] uppercase tracking-widest text-[var(--color-brand-charcoal)]/60">
                <th className="text-left px-6 py-4 font-medium">Ticket</th>
                <th className="text-left px-6 py-4 font-medium">Aluno</th>
                <th className="text-left px-6 py-4 font-medium">Assunto</th>
                <th className="text-left px-6 py-4 font-medium">Status</th>
                <th className="text-left px-6 py-4 font-medium">Última atualização</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => {
                const meta = STATUS_LABELS[t.status];
                return (
                  <tr
                    key={t.id}
                    className="border-b border-black/5 last:border-b-0 hover:bg-black/[0.015] transition-colors"
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/suporte/${t.id}`}
                        className="font-mono text-xs text-[var(--color-brand-charcoal)] hover:text-[var(--color-brand-sage)] transition-colors"
                      >
                        {t.publicId}
                      </Link>
                      <div className="text-[10px] text-[var(--color-brand-charcoal)]/40 mt-0.5">
                        {t._count.messages} msg
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="text-[var(--color-brand-charcoal)]">
                        {t.user.name ?? "—"}
                      </div>
                      <div className="text-xs text-[var(--color-brand-charcoal)]/50">
                        {t.user.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/suporte/${t.id}`}
                        className="text-sm text-[var(--color-brand-charcoal)] hover:text-[var(--color-brand-sage)] transition-colors truncate max-w-[320px] block"
                      >
                        {t.subject}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm ${meta.color}`}
                      >
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-[var(--color-brand-charcoal)]/60 whitespace-nowrap">
                      {t.updatedAt.toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
