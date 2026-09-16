import Link from "next/link";
import { auth } from "@repo/auth";
import { prisma } from "@repo/database";
import { ArrowLeft, PlayCircle } from "lucide-react";
import { startModuleCheckoutAction } from "@/actions/billing";
import { getUserAccess } from "@/lib/entitlements";

function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

const CAT_ORDER = [
  "PRATICO",
  "TEORICO",
  "ESPECIALIZADO",
  "LINHA_DOMESTICA",
  "FORMACAO",
];
const CAT_LABELS: Record<string, string> = {
  PRATICO: "Práticos",
  TEORICO: "Teóricos",
  ESPECIALIZADO: "Especializados",
  LINHA_DOMESTICA: "Linha Doméstica",
  FORMACAO: "Formação",
};

export default async function AvulsosPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; erro?: string }>;
}) {
  const [session, modules, sp] = await Promise.all([
    auth(),
    prisma.course.findMany({
      where: { soldStandalone: true, isArchived: false, deletedAt: null },
      orderBy: [{ category: "asc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        standalonePriceCents: true,
        standaloneStripePriceId: true,
      },
    }),
    searchParams,
  ]);

  const isLogged = !!session?.user;
  const access = isLogged ? await getUserAccess(session!.user.id) : null;

  const owns = (courseId: string) =>
    !!access && (access.grantsAll || access.courseIds.has(courseId));

  // Agrupa por categoria
  const groups = new Map<string, typeof modules>();
  for (const m of modules) {
    const key = m.category ?? "OUTROS";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }
  const orderedKeys = [
    ...CAT_ORDER.filter((k) => groups.has(k)),
    ...[...groups.keys()].filter((k) => !CAT_ORDER.includes(k)),
  ];

  const banner =
    sp?.checkout === "cancelado"
      ? {
          tone: "neutro" as const,
          text: "Compra cancelada. Nenhuma cobrança foi realizada.",
        }
      : sp?.erro === "indisponivel"
        ? {
            tone: "erro" as const,
            text: "Este módulo ainda não está disponível para compra.",
          }
        : sp?.erro === "preco"
          ? {
              tone: "erro" as const,
              text: "O pagamento deste módulo está temporariamente indisponível.",
            }
          : sp?.erro === "pagamento" || sp?.erro === "checkout"
            ? {
                tone: "erro" as const,
                text: "Não foi possível iniciar o pagamento. Nenhuma cobrança foi realizada. Tente novamente em instantes.",
              }
            : sp?.erro === "limite"
              ? {
                  tone: "erro" as const,
                  text: "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.",
                }
              : null;

  return (
    <div className="min-h-screen bg-[var(--color-brand-offwhite)] py-16 md:py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <Link
          href={isLogged ? "/aluno" : "/"}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/50 hover:text-[var(--color-brand-sage)] transition-colors mb-12"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {isLogged ? "Voltar para sua área" : "Voltar para o início"}
        </Link>

        <header className="text-center mb-16 max-w-2xl mx-auto">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-brand-charcoal)]/60 mb-4">
            Avulsos
          </p>
          <h1 className="font-serif text-4xl md:text-5xl text-[var(--color-brand-charcoal)] tracking-tight leading-[1.1] mb-6">
            Módulos soltos, no seu ritmo.
          </h1>
          <p className="text-base text-[var(--color-brand-charcoal)]/70 font-light leading-relaxed">
            Compre só o módulo que você quer, com 12 meses de acesso. Ou veja os{" "}
            <Link
              href="/planos"
              className="text-[var(--color-brand-sage)] underline underline-offset-2"
            >
              cursos completos
            </Link>
            .
          </p>
        </header>

        {banner && (
          <div
            role="status"
            className={`max-w-2xl mx-auto mb-10 rounded-sm border px-5 py-4 text-sm text-center ${
              banner.tone === "erro"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-black/10 bg-white text-[var(--color-brand-charcoal)]/70"
            }`}
          >
            {banner.text}
          </div>
        )}

        {modules.length === 0 ? (
          <div className="bg-white border border-black/5 rounded-lg p-12 text-center max-w-2xl mx-auto">
            <p className="text-[var(--color-brand-charcoal)]/40 text-sm uppercase tracking-widest">
              Nenhum módulo avulso disponível no momento.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-14">
            {orderedKeys.map((key) => (
              <section key={key}>
                <h2 className="text-[11px] uppercase tracking-[0.3em] text-[var(--color-brand-sage)] mb-6">
                  {CAT_LABELS[key] ?? "Outros"}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {groups.get(key)!.map((m) => {
                    const owned = owns(m.id);
                    const buyable = !!m.standaloneStripePriceId;
                    return (
                      <article
                        key={m.id}
                        className="bg-white border border-black/5 rounded-lg p-6 flex flex-col shadow-sm"
                      >
                        <div className="w-10 h-10 rounded-sm bg-[var(--color-brand-sage)]/10 text-[var(--color-brand-sage)] flex items-center justify-center mb-4">
                          <PlayCircle className="w-5 h-5" />
                        </div>
                        <h3 className="font-serif text-lg text-[var(--color-brand-charcoal)] mb-2 leading-tight">
                          {m.title}
                        </h3>
                        {m.description && (
                          <p className="text-xs text-[var(--color-brand-charcoal)]/60 leading-relaxed line-clamp-3 mb-4">
                            {m.description}
                          </p>
                        )}
                        <div className="mt-auto">
                          {m.standalonePriceCents != null && (
                            <div className="font-serif text-2xl text-[var(--color-brand-charcoal)] mb-3">
                              {formatBRL(m.standalonePriceCents)}
                            </div>
                          )}
                          {owned ? (
                            <div className="text-center text-[11px] font-semibold uppercase tracking-widest text-[var(--color-brand-sage)] border border-[var(--color-brand-sage)]/30 rounded-sm py-3">
                              Você já tem acesso
                            </div>
                          ) : !isLogged ? (
                            <Link
                              href="/signup"
                              className="block text-center w-full px-5 py-3 text-[11px] font-semibold uppercase tracking-widest rounded-sm bg-[var(--color-brand-sage)] text-white hover:bg-[var(--color-brand-charcoal)] transition-colors"
                            >
                              Criar conta
                            </Link>
                          ) : buyable ? (
                            <form
                              action={startModuleCheckoutAction.bind(
                                null,
                                m.id,
                              )}
                            >
                              <button
                                type="submit"
                                className="w-full px-5 py-3 text-[11px] font-semibold uppercase tracking-widest rounded-sm bg-[var(--color-brand-sage)] text-white hover:bg-[var(--color-brand-charcoal)] transition-colors"
                              >
                                Comprar módulo
                              </button>
                            </form>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="w-full px-5 py-3 text-[11px] font-semibold uppercase tracking-widest rounded-sm bg-[var(--color-brand-charcoal)]/20 text-white cursor-not-allowed"
                            >
                              Em breve
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
