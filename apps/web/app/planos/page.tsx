import Link from "next/link";
import { auth } from "@repo/auth";
import { prisma } from "@repo/database";
import { ArrowLeft, Check } from "lucide-react";

function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function parseBenefits(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((v): v is string => typeof v === "string");
    }
  } catch {
    // fallback abaixo
  }
  return raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

export default async function PlanosPage() {
  const [session, plans] = await Promise.all([
    auth(),
    prisma.plan.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { order: "asc" },
    }),
  ]);

  const isLogged = !!session?.user;

  return (
    <div className="min-h-screen bg-[var(--color-brand-offwhite)] py-16 md:py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <Link
          href={isLogged ? "/aluno" : "/"}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/50 hover:text-[var(--color-brand-sage)] transition-colors mb-12"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {isLogged ? "Voltar para sua área" : "Voltar para o início"}
        </Link>

        <header className="text-center mb-16 max-w-2xl mx-auto">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-brand-charcoal)]/60 mb-4">
            Planos
          </p>
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-[var(--color-brand-charcoal)] tracking-tight leading-[1.1] mb-6">
            Encontre o plano ideal para sua jornada.
          </h1>
          <p className="text-base text-[var(--color-brand-charcoal)]/70 font-light leading-relaxed">
            Conteúdos exclusivos, suporte direto e materiais práticos.
            Comece quando quiser, cancele quando precisar.
          </p>
        </header>

        {plans.length === 0 ? (
          <div className="bg-white border border-black/5 rounded-lg p-12 text-center max-w-2xl mx-auto">
            <p className="text-[var(--color-brand-charcoal)]/40 text-sm uppercase tracking-widest">
              Nenhum plano disponível no momento.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan) => {
              const benefits = parseBenefits(plan.benefits);
              return (
                <article
                  key={plan.id}
                  className={`relative bg-white rounded-lg shadow-sm flex flex-col ${
                    plan.highlight
                      ? "border-2 border-[var(--color-brand-gold)] md:scale-105 md:-my-3"
                      : "border border-black/5"
                  }`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--color-brand-gold)] text-white text-[10px] uppercase tracking-widest px-4 py-1 rounded-sm font-medium">
                      Recomendado
                    </div>
                  )}

                  <div className="p-8 border-b border-black/5">
                    <h2 className="font-serif text-3xl text-[var(--color-brand-charcoal)] tracking-wide mb-1">
                      {plan.name}
                    </h2>
                    {plan.tagline && (
                      <p className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/50 mb-6">
                        {plan.tagline}
                      </p>
                    )}
                    <div className="flex items-baseline gap-2">
                      <span className="font-serif text-4xl text-[var(--color-brand-charcoal)]">
                        {formatBRL(plan.priceCents)}
                      </span>
                      <span className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/50">
                        / mês
                      </span>
                    </div>
                  </div>

                  <ul className="p-8 flex-1 flex flex-col gap-4">
                    {benefits.map((benefit) => (
                      <li key={benefit} className="flex items-start gap-3">
                        <Check
                          className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                            plan.highlight
                              ? "text-[var(--color-brand-gold)]"
                              : "text-[var(--color-brand-sage)]"
                          }`}
                        />
                        <span className="text-sm text-[var(--color-brand-charcoal)]/80 leading-relaxed">
                          {benefit}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="p-8 pt-0">
                    {isLogged ? (
                      <button
                        type="button"
                        disabled
                        className={`w-full px-6 py-4 text-xs font-semibold uppercase tracking-[0.2em] rounded-sm cursor-not-allowed opacity-60 ${
                          plan.highlight
                            ? "bg-[var(--color-brand-gold)] text-white"
                            : "bg-[var(--color-brand-sage)] text-white"
                        }`}
                        title="Pagamento será integrado em fase posterior"
                      >
                        Assinar (em breve)
                      </button>
                    ) : (
                      <Link
                        href="/signup"
                        className={`block text-center w-full px-6 py-4 text-xs font-semibold uppercase tracking-[0.2em] rounded-sm transition-colors ${
                          plan.highlight
                            ? "bg-[var(--color-brand-gold)] text-white hover:bg-[var(--color-brand-charcoal)]"
                            : "bg-[var(--color-brand-sage)] text-white hover:bg-[var(--color-brand-charcoal)]"
                        }`}
                      >
                        Criar conta
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <p className="text-center text-xs text-[var(--color-brand-charcoal)]/50 mt-12 max-w-2xl mx-auto leading-relaxed">
          Integração de pagamento via Stripe entra em fase posterior. Por ora,
          ativação de assinatura é feita manualmente pelo administrador.
        </p>
      </div>
    </div>
  );
}
