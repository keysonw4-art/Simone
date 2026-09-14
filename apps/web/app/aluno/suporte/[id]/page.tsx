import { Pagination, parsePage, PAGE_SIZE } from "@repo/ui/pagination";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@repo/database";
import { auth } from "@repo/auth";
import { SupportReplyForm } from "../../../../components/SupportReplyForm";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  OPEN: { label: "Aberto", color: "bg-[var(--color-brand-sage)]/10 text-[var(--color-brand-sage)]" },
  IN_PROGRESS: { label: "Em atendimento", color: "bg-[var(--color-brand-gold)]/10 text-[var(--color-brand-gold)]" },
  RESOLVED: { label: "Resolvido", color: "bg-black/5 text-[var(--color-brand-charcoal)]/70" },
  CLOSED: { label: "Fechado", color: "bg-black/5 text-[var(--color-brand-charcoal)]/50" },
};

export default async function TicketDetailPage({
  params,
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const page = parsePage((await searchParams).page);

  const ticket = await prisma.supportTicket.findFirst({
    where: { id, userId: session.user.id, deletedAt: null },
    include: {
      messages: {
        where: { isInternal: false },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: PAGE_SIZE + 1, skip: (page - 1) * PAGE_SIZE,
        include: {
          author: { select: { id: true, name: true, role: true } },
        },
      },
    },
  });

  if (!ticket) notFound();

  const status = STATUS_LABELS[ticket.status] ?? STATUS_LABELS.OPEN;
  const isClosed = ticket.status === "CLOSED";

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <Link
        href="/aluno/suporte"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/50 hover:text-[var(--color-brand-sage)] transition-colors mb-8"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Voltar para Suporte
      </Link>

      <header className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <span className="font-mono text-xs text-[var(--color-brand-charcoal)]/50">
            {ticket.publicId}
          </span>
          <span
            className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-sm ${status!.color}`}
          >
            {status!.label}
          </span>
        </div>
        <h1 className="font-serif text-3xl md:text-4xl text-[var(--color-brand-charcoal)] tracking-tight">
          {ticket.subject}
        </h1>
        <p className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/40 mt-3">
          Aberto em {ticket.createdAt.toLocaleString("pt-BR")}
        </p>
      </header>

      <div className="flex flex-col gap-4 mb-10">
        {[...ticket.messages.slice(0, PAGE_SIZE)].reverse().map((msg) => {
          const isStaff =
            msg.author.role === "ADMIN" ||
            msg.author.role === "SUPER_ADMIN" ||
            msg.author.role === "SUPPORT";
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
                  {isStaff ? "Equipe Simone Mendes" : msg.author.name ?? "Você"}
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
        })}
      </div>

      {isClosed ? (
        <div className="bg-black/5 border border-black/10 rounded-lg p-6 text-center">
          <p className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/50">
            Este chamado está fechado. Abra um novo para retomar.
          </p>
        </div>
      ) : (
        <SupportReplyForm ticketId={ticket.id} />
      )}
      <Pagination page={page} hasMore={ticket.messages.length > PAGE_SIZE} href={`/aluno/suporte/${ticket.id}`} />
    </div>
  );
}
