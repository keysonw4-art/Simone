import Link from "next/link";
import { auth } from "@repo/auth";
import { prisma } from "@repo/database";
import { ArrowLeft, Check, Award, Sparkles } from "lucide-react";
import { getUserAccess } from "@/lib/entitlements";

function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function certLabel(t: string | null): string | null {
  if (t === "PROFESSIONAL") return "Certificado profissional";
  if (t === "DECLARATION") return "Declaração de horas";
  return null;
}

export default async function PlanosPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; erro?: string }>;
}) {
  const [session, products, sp] = await Promise.all([
    auth(),
    prisma.product.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { order: "asc" },
      include: { productCourses: { select: { courseId: true } } },
    }),
    searchParams,
  ]);

  const isLogged = !!session?.user;
  const access = isLogged ? await getUserAccess(session!.user.id) : null;

  function owns(p: (typeof products)[number]): boolean {
    if (!access) return false;
    if (p.grantsAll) return access.grantsAll;
    if (access.grantsAll) return true;
    if (p.productCourses.length === 0) return false;
    return p.productCourses.every((pc) => access.courseIds.has(pc.courseId));
  }

  const banner =
    sp?.checkout === "cancelado"
      ? { tone: "neutro" as const, text: "Compra cancelada. Você pode voltar quando quiser." }
      : sp?.erro === "esgotado"
        ? { tone: "erro" as const, text: "As vagas deste curso se esgotaram." }
        : sp?.erro === "indisponivel"
          ? { tone: "erro" as const, text: "Este curso ainda não está disponível para compra." }
          : sp?.erro === "checkout"
            ? { tone: "erro" as const, text: "Não foi possível iniciar o checkout. Tente novamente." }
            : null;

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
            Cursos
          </p>
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-[var(--color-brand-charcoal)] tracking-tight leading-[1.1] mb-6">
            Escolha o seu caminho.
          </h1>
          <p className="text-base text-[var(--color-brand-charcoal)]/70 font-light leading-relaxed">
            Compra única com acesso por prazo. Sem mensalidade. Também é possível
            comprar módulos avulsos na{" "}
            <Link href="/avulsos" className="text-[var(--color-brand-sage)] underline underline-offset-2">
              página de avulsos
            </Link>
            .
          </p>
        </header>

        {banner && (
          <div
            className={`max-w-2xl mx-auto mb-10 rounded-sm border px-5 py-4 text-sm text-center ${
              banner.tone === "erro"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-black/10 bg-white text-[var(--color-brand-charcoal)]/70"
            }`}
          >
            {banner.text}
          </div>
        )}

        {products.length === 0 ? (
          <div className="bg-white border border-black/5 rounded-lg p-12 text-center max-w-2xl mx-auto">
            <p className="text-[var(--color-brand-charcoal)]/40 text-sm uppercase tracking-widest">
              Nenhum curso disponível no momento.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto items-stretch">
            {products.map((p) => {
              const cert = certLabel(p.certificateType);
              const owned = owns(p);
              const soldOut =
                p.maxSeats != null && p.seatsSold >= p.maxSeats;
              const seatsLeft =
                p.maxSeats != null ? Math.max(0, p.maxSeats - p.seatsSold) : null;

              return (
                <article
                  key={p.id}
                  className={`relative bg-white rounded-lg shadow-sm flex flex-col ${
                    p.highlight
                      ? "border-2 border-[var(--color-brand-gold)]"
                      : "border border-black/5"
                  }`}
                >
                  {p.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--color-brand-gold)] text-white text-[10px] uppercase tracking-widest px-4 py-1 rounded-sm font-medium">
                      Recomendado
                    </div>
                  )}

                  <div className="p-7 flex-1 flex flex-col">
                    <h2 className="font-serif text-2xl text-[var(--color-brand-charcoal)] tracking-wide mb-1">
                      {p.name}
                    </h2>
                    {p.tagline && (
                      <p className="text-[11px] uppercase tracking-widest text-[var(--color-brand-charcoal)]/50 mb-5">
                        {p.tagline}
                      </p>
                    )}

                    <div className="flex items-baseline gap-1.5 mb-1">
                      <span className="font-serif text-3xl text-[var(--color-brand-charcoal)]">
                        {formatBRL(p.priceCents)}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-brand-charcoal)]/60 mb-1">
                      ou 10x de {formatBRL(Math.round(p.priceCents / 10))}
                    </p>
                    <p className="text-[11px] uppercase tracking-widest text-[var(--color-brand-charcoal)]/50 mb-6">
                      {p.accessMonths} meses de acesso
                    </p>

                    <ul className="flex flex-col gap-2.5 mb-6">
                      <li className="flex items-start gap-2.5 text-sm text-[var(--color-brand-charcoal)]/80">
                        <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-[var(--color-brand-sage)]" />
                        {p.grantsAll
                          ? "Acesso a todos os módulos"
                          : `${p.productCourses.length} módulos`}
                      </li>
                      {cert && (
                        <li className="flex items-start gap-2.5 text-sm text-[var(--color-brand-charcoal)]/80">
                          <Award className="w-4 h-4 mt-0.5 flex-shrink-0 text-[var(--color-brand-sage)]" />
                          {cert}
                        </li>
                      )}
                      {p.includesMentoring && (
                        <li className="flex items-start gap-2.5 text-sm text-[var(--color-brand-charcoal)]/80">
                          <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0 text-[var(--color-brand-gold)]" />
                          Mentoria com a Simone
                        </li>
                      )}
                    </ul>

                    {seatsLeft != null && !owned && (
                      <p className="text-[11px] uppercase tracking-widest text-[var(--color-brand-gold)] mb-4">
                        {soldOut ? "Vagas esgotadas" : `${seatsLeft} vagas restantes`}
                      </p>
                    )}

                    <div className="mt-auto pt-2">
                      {owned ? (
                        <Link
                          href="/aluno/cursos"
                          className="block text-center w-full px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] rounded-sm border border-[var(--color-brand-sage)]/30 text-[var(--color-brand-sage)] hover:bg-[var(--color-brand-sage)]/5 transition-colors"
                        >
                          Você já tem acesso
                        </Link>
                      ) : (
                        <Link
                          href={`/planos/${p.slug}`}
                          className={`block text-center w-full px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] rounded-sm transition-colors ${
                            p.highlight
                              ? "bg-[var(--color-brand-gold)] text-white hover:bg-[var(--color-brand-charcoal)]"
                              : "bg-[var(--color-brand-sage)] text-white hover:bg-[var(--color-brand-charcoal)]"
                          }`}
                        >
                          Ver detalhes
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <p className="text-center text-xs text-[var(--color-brand-charcoal)]/50 mt-12 max-w-2xl mx-auto leading-relaxed">
          Pagamento único e seguro pela Stripe. O acesso vale pelo prazo do curso
          e o sistema avisa antes de expirar.
        </p>
      </div>
    </div>
  );
}
