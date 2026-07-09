import Link from "next/link";
import { prisma } from "@repo/database";

function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export default async function PlanosAdminPage() {
  const plans = await prisma.plan.findMany({
    where: { deletedAt: null },
    orderBy: { order: "asc" },
  });

  return (
    <div>
      <header className="mb-10">
        <h1 className="font-serif text-4xl text-[var(--color-brand-charcoal)] tracking-wide">
          Planos
        </h1>
        <p className="text-[var(--color-brand-charcoal)]/60 mt-2 text-sm uppercase tracking-widest">
          Preço, benefícios e visibilidade
        </p>
      </header>

      {plans.length === 0 ? (
        <div className="bg-white border border-black/5 rounded-lg p-12 text-center">
          <p className="text-[var(--color-brand-charcoal)]/40 text-sm uppercase tracking-widest">
            Nenhum plano cadastrado. Rode <code className="font-mono">prisma db seed</code>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p) => (
            <Link
              key={p.id}
              href={`/planos/${p.id}`}
              className={`group relative bg-white border rounded-lg p-8 shadow-sm hover:shadow-md transition-all ${
                p.highlight
                  ? "border-[var(--color-brand-gold)]/40"
                  : "border-black/5"
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <h2 className="font-serif text-2xl text-[var(--color-brand-charcoal)] tracking-wide">
                  {p.name}
                </h2>
                <div className="flex flex-col items-end gap-1">
                  {p.highlight && (
                    <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 bg-[var(--color-brand-gold)]/10 text-[var(--color-brand-gold)] rounded-sm">
                      Recomendado
                    </span>
                  )}
                  {p.isActive ? (
                    <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 bg-[var(--color-brand-sage)]/10 text-[var(--color-brand-sage)] rounded-sm">
                      Ativo
                    </span>
                  ) : (
                    <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 bg-black/5 text-[var(--color-brand-charcoal)]/50 rounded-sm">
                      Inativo
                    </span>
                  )}
                </div>
              </div>

              {p.tagline && (
                <p className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/50 mb-4">
                  {p.tagline}
                </p>
              )}

              <div className="flex items-baseline gap-2 mb-6">
                <span className="font-serif text-3xl text-[var(--color-brand-charcoal)]">
                  {formatBRL(p.priceCents)}
                </span>
                <span className="text-[10px] uppercase tracking-widest text-[var(--color-brand-charcoal)]/50">
                  / mês
                </span>
              </div>

              <div className="text-[10px] uppercase tracking-widest text-[var(--color-brand-charcoal)]/40 mb-2">
                Tipo · Ordem
              </div>
              <div className="flex items-center gap-3 text-xs text-[var(--color-brand-charcoal)]/70">
                <code className="font-mono">{p.type}</code>
                <span className="text-[var(--color-brand-charcoal)]/30">•</span>
                <span>#{p.order}</span>
              </div>

              <div className="mt-6 pt-6 border-t border-black/5 text-[10px] uppercase tracking-widest text-[var(--color-brand-sage)] group-hover:text-[var(--color-brand-charcoal)] transition-colors">
                Editar →
              </div>
            </Link>
          ))}
        </div>
      )}

      <p className="text-xs text-[var(--color-brand-charcoal)]/50 mt-10 max-w-3xl leading-relaxed">
        Os 3 tipos de plano (BASIC, INTERMEDIATE, PREMIUM) são fixos pelo enum
        no schema. Aqui você edita apresentação, preço e visibilidade — sem
        afetar assinaturas vivas.
      </p>
    </div>
  );
}
