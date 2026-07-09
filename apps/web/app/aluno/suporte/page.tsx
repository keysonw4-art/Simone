import Link from "next/link";
import { Plus, MessageCircle } from "lucide-react";
import { prisma } from "@repo/database";
import { auth } from "@repo/auth";
import { redirect } from "next/navigation";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  OPEN: { label: "Aberto", color: "bg-[var(--color-brand-sage)]/10 text-[var(--color-brand-sage)]" },
  IN_PROGRESS: { label: "Em atendimento", color: "bg-[var(--color-brand-gold)]/10 text-[var(--color-brand-gold)]" },
  RESOLVED: { label: "Resolvido", color: "bg-black/5 text-[var(--color-brand-charcoal)]/70" },
  CLOSED: { label: "Fechado", color: "bg-black/5 text-[var(--color-brand-charcoal)]/50" },
};

export default async function SuportePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tickets = await prisma.supportTicket.findMany({
    where: { userId: session.user.id, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { messages: { where: { isInternal: false } } } } },
  });

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <header className="mb-12 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-brand-charcoal)]/60 mb-2">
            Suporte
          </p>
          <h1 className="font-serif text-4xl md:text-5xl text-[var(--color-brand-charcoal)] tracking-tight">
            Seus chamados
          </h1>
        </div>
        <Link
          href="/aluno/suporte/novo"
          className="inline-flex items-center gap-2 px-5 py-3 bg-[var(--color-brand-sage)] text-white text-xs uppercase tracking-widest rounded-sm hover:bg-[var(--color-brand-charcoal)] transition-colors"
        >
          <Plus className="w-4 h-4" /> Novo Chamado
        </Link>
      </header>

      {tickets.length === 0 ? (
        <div className="bg-white border border-black/5 rounded-lg p-16 text-center">
          <MessageCircle className="w-10 h-10 text-[var(--color-brand-charcoal)]/20 mx-auto mb-4" />
          <p className="text-sm text-[var(--color-brand-charcoal)]/60 mb-2">
            Você ainda não abriu nenhum chamado.
          </p>
          <p className="text-xs text-[var(--color-brand-charcoal)]/40">
            Use o suporte para tirar dúvidas, relatar problemas ou pedir ajuda.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-black/5 rounded-lg overflow-hidden divide-y divide-black/5">
          {tickets.map((t) => {
            const meta = STATUS_LABELS[t.status] ?? STATUS_LABELS.OPEN;
            return (
              <Link
                key={t.id}
                href={`/aluno/suporte/${t.id}`}
                className="block px-6 py-5 hover:bg-black/[0.015] transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono text-[10px] text-[var(--color-brand-charcoal)]/50">
                        {t.publicId}
                      </span>
                      <span
                        className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-sm ${meta!.color}`}
                      >
                        {meta!.label}
                      </span>
                    </div>
                    <h3 className="text-base font-medium text-[var(--color-brand-charcoal)] truncate">
                      {t.subject}
                    </h3>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <span className="text-[10px] text-[var(--color-brand-charcoal)]/50">
                      {t._count.messages} msg
                    </span>
                    <span className="text-[10px] text-[var(--color-brand-charcoal)]/40 whitespace-nowrap">
                      {t.updatedAt.toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
