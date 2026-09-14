import { requireAdminPage } from "@/lib/requireAdmin";
import { Pagination, parsePage, PAGE_SIZE } from "@repo/ui/pagination";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Lock } from "lucide-react";
import { prisma } from "@repo/database";
import type { TicketStatus } from "@repo/database";
import { TicketReplyForm } from "../../../../components/TicketReplyForm";
import { TicketStatusControl } from "../../../../components/TicketStatusControl";

const STATUS_LABELS: Record<TicketStatus, { label: string; color: string }> = {
  OPEN: { label: "Aberto", color: "bg-[var(--color-brand-sage)]/10 text-[var(--color-brand-sage)]" },
  IN_PROGRESS: { label: "Em atendimento", color: "bg-[var(--color-brand-gold)]/10 text-[var(--color-brand-gold)]" },
  RESOLVED: { label: "Resolvido", color: "bg-black/5 text-[var(--color-brand-charcoal)]/70" },
  CLOSED: { label: "Fechado", color: "bg-black/5 text-[var(--color-brand-charcoal)]/50" },
};

export default async function AdminTicketDetailPage({
  params,
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage();
  const { id } = await params;
  const page = parsePage((await searchParams).page);

  const ticket = await prisma.supportTicket.findFirst({
    where: { id, deletedAt: null },
    include: {
      user: { select: { id: true, name: true, email: true, publicId: true, role: true } },
      messages: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: PAGE_SIZE + 1, skip: (page - 1) * PAGE_SIZE,
        include: {
          author: { select: { id: true, name: true, email: true, role: true } },
        },
      },
    },
  });

  if (!ticket) notFound();

  const meta = STATUS_LABELS[ticket.status];

  return (
    <div>
      <Link
        href="/suporte"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/60 hover:text-[var(--color-brand-sage)] mb-6 transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" /> Suporte
      </Link>

      <header className="mb-10 flex items-end justify-between gap-6 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-xs text-[var(--color-brand-charcoal)]/50">
              {ticket.publicId}
            </span>
            <span
              className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm ${meta.color}`}
            >
              {meta.label}
            </span>
          </div>
          <h1 className="font-serif text-3xl md:text-4xl text-[var(--color-brand-charcoal)] tracking-tight mb-2">
            {ticket.subject}
          </h1>
          <p className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/50">
            <Link
              href={`/alunos/${ticket.user.id}`}
              className="hover:text-[var(--color-brand-sage)] transition-colors"
            >
              {ticket.user.name ?? ticket.user.email} · {ticket.user.publicId}
            </Link>
            {" • "}
            Aberto em {ticket.createdAt.toLocaleString("pt-BR")}
          </p>
        </div>
        <TicketStatusControl
          ticketId={ticket.id}
          currentStatus={ticket.status}
        />
      </header>

      <div className="flex flex-col gap-4 mb-10">
        {[...ticket.messages.slice(0, PAGE_SIZE)].reverse().map((msg) => {
          const isStaff =
            msg.author.role === "ADMIN" ||
            msg.author.role === "SUPER_ADMIN" ||
            msg.author.role === "SUPPORT";
          const authorLabel = isStaff
            ? msg.author.name ?? "Equipe"
            : ticket.user.name ?? ticket.user.email ?? "Aluno";

          if (msg.isInternal) {
            return (
              <div
                key={msg.id}
                className="rounded-lg p-6 bg-[var(--color-brand-gold)]/5 border border-dashed border-[var(--color-brand-gold)]/30"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Lock className="w-3.5 h-3.5 text-[var(--color-brand-gold)]" />
                  <span className="text-xs font-medium text-[var(--color-brand-charcoal)]">
                    {authorLabel}
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-[var(--color-brand-gold)]">
                    Nota interna
                  </span>
                  <span className="text-[10px] text-[var(--color-brand-charcoal)]/40">
                    {msg.createdAt.toLocaleString("pt-BR")}
                  </span>
                </div>
                <p className="text-sm text-[var(--color-brand-charcoal)]/80 leading-relaxed whitespace-pre-wrap">
                  {msg.body}
                </p>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`rounded-lg p-6 border ${
                isStaff
                  ? "bg-[var(--color-brand-sage)]/5 border-[var(--color-brand-sage)]/15"
                  : "bg-white border-black/5"
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-medium text-[var(--color-brand-charcoal)]">
                  {authorLabel}
                </span>
                {isStaff && (
                  <span className="text-[10px] uppercase tracking-widest text-[var(--color-brand-sage)]">
                    Equipe
                  </span>
                )}
                <span className="text-[10px] text-[var(--color-brand-charcoal)]/40">
                  {msg.createdAt.toLocaleString("pt-BR")}
                </span>
              </div>
              <p className="text-sm text-[var(--color-brand-charcoal)]/80 leading-relaxed whitespace-pre-wrap">
                {msg.body}
              </p>
            </div>
          );
        })}
      </div>

      <TicketReplyForm ticketId={ticket.id} />
      <Pagination page={page} hasMore={ticket.messages.length > PAGE_SIZE} href={`/suporte/${ticket.id}`} />
    </div>
  );
}
