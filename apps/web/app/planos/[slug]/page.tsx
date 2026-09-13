import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@repo/auth";
import { prisma } from "@repo/database";
import { ArrowLeft, Check, Award, Sparkles, PlayCircle } from "lucide-react";
import { startProductCheckoutAction } from "@/actions/billing";
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

export default async function CursoDetalhePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const product = await prisma.product.findFirst({
    where: { slug, isActive: true, deletedAt: null },
    include: {
      productCourses: {
        orderBy: { order: "asc" },
        select: {
          course: {
            select: { id: true, title: true, description: true, workloadHours: true },
          },
        },
      },
    },
  });
  if (!product) notFound();

  const session = await auth();
  const isLogged = !!session?.user;
  const access = isLogged ? await getUserAccess(session!.user.id) : null;

  const owned = access
    ? product.grantsAll
      ? access.grantsAll
      : access.grantsAll ||
        (product.productCourses.length > 0 &&
          product.productCourses.every((pc) => access.courseIds.has(pc.course.id)))
    : false;

  const soldOut = product.maxSeats != null && product.seatsSold >= product.maxSeats;
  const seatsLeft =
    product.maxSeats != null ? Math.max(0, product.maxSeats - product.seatsSold) : null;
  const cert = certLabel(product.certificateType);
  const installment = Math.round(product.priceCents / 10);

  return (
    <div className="min-h-screen bg-[var(--color-brand-offwhite)] py-16 md:py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/planos"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/50 hover:text-[var(--color-brand-sage)] transition-colors mb-10"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Todos os cursos
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10 items-start">
          {/* Conteúdo */}
          <div>
            {product.highlight && (
              <span className="inline-block text-[10px] uppercase tracking-widest text-[var(--color-brand-gold)] font-medium mb-4">
                Recomendado
              </span>
            )}
            <h1 className="font-serif text-4xl md:text-5xl text-[var(--color-brand-charcoal)] tracking-tight leading-[1.1] mb-4">
              {product.name}
            </h1>
            {product.tagline && (
              <p className="text-base text-[var(--color-brand-charcoal)]/70 font-light leading-relaxed mb-6">
                {product.tagline}
              </p>
            )}
            {product.description && (
              <p className="text-sm md:text-base text-[var(--color-brand-charcoal)]/75 leading-relaxed whitespace-pre-line mb-10">
                {product.description}
              </p>
            )}

            {/* O que inclui */}
            <div className="flex flex-col gap-3 mb-10">
              <div className="flex items-start gap-3 text-sm text-[var(--color-brand-charcoal)]/85">
                <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-[var(--color-brand-sage)]" />
                {product.accessMonths} meses de acesso
              </div>
              {cert && (
                <div className="flex items-start gap-3 text-sm text-[var(--color-brand-charcoal)]/85">
                  <Award className="w-4 h-4 mt-0.5 flex-shrink-0 text-[var(--color-brand-sage)]" />
                  {cert}
                </div>
              )}
              {product.includesMentoring && (
                <div className="flex items-start gap-3 text-sm text-[var(--color-brand-charcoal)]/85">
                  <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0 text-[var(--color-brand-gold)]" />
                  Mentoria com a Simone
                </div>
              )}
            </div>

            {/* Módulos inclusos */}
            <h2 className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-brand-charcoal)]/50 mb-4">
              O que você vai aprender
            </h2>
            {product.grantsAll ? (
              <div className="bg-white border border-black/5 rounded-lg p-6 text-sm text-[var(--color-brand-charcoal)]/80 flex items-center gap-3">
                <PlayCircle className="w-5 h-5 text-[var(--color-brand-sage)] flex-shrink-0" />
                Acesso a <strong className="mx-1">todos os módulos</strong> da plataforma, inclusive os que forem lançados durante o seu acesso.
              </div>
            ) : product.productCourses.length > 0 ? (
              <div className="bg-white border border-black/5 rounded-lg divide-y divide-black/5 overflow-hidden">
                {product.productCourses.map((pc) => (
                  <div key={pc.course.id} className="flex items-start gap-4 p-5">
                    <div className="w-9 h-9 rounded-sm bg-[var(--color-brand-sage)]/10 text-[var(--color-brand-sage)] flex items-center justify-center flex-shrink-0">
                      <PlayCircle className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[var(--color-brand-charcoal)]">
                        {pc.course.title}
                        {pc.course.workloadHours != null && (
                          <span className="text-[var(--color-brand-charcoal)]/40 font-normal">
                            {" "}· {pc.course.workloadHours}h
                          </span>
                        )}
                      </div>
                      {pc.course.description && (
                        <p className="text-xs text-[var(--color-brand-charcoal)]/60 mt-0.5 leading-relaxed line-clamp-2">
                          {pc.course.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--color-brand-charcoal)]/50">
                Os módulos deste curso serão anunciados em breve.
              </p>
            )}
          </div>

          {/* Card de compra (sticky no desktop) */}
          <aside className="lg:sticky lg:top-8">
            <div
              className={`bg-white rounded-lg shadow-sm p-7 ${
                product.highlight
                  ? "border-2 border-[var(--color-brand-gold)]"
                  : "border border-black/5"
              }`}
            >
              <div className="flex items-baseline gap-1.5">
                <span className="font-serif text-4xl text-[var(--color-brand-charcoal)]">
                  {formatBRL(product.priceCents)}
                </span>
              </div>
              <p className="text-sm text-[var(--color-brand-charcoal)]/60 mt-1 mb-1">
                ou até{" "}
                <span className="font-medium text-[var(--color-brand-charcoal)]">
                  10x de {formatBRL(installment)}
                </span>
              </p>
              <p className="text-[11px] uppercase tracking-widest text-[var(--color-brand-charcoal)]/45 mb-6">
                {product.accessMonths} meses de acesso · pagamento único
              </p>

              {seatsLeft != null && !owned && (
                <p className="text-[11px] uppercase tracking-widest text-[var(--color-brand-gold)] mb-4">
                  {soldOut ? "Vagas esgotadas" : `${seatsLeft} vagas restantes`}
                </p>
              )}

              {owned ? (
                <Link
                  href="/aluno/cursos"
                  className="block text-center w-full px-6 py-4 text-xs font-semibold uppercase tracking-[0.2em] rounded-sm border border-[var(--color-brand-sage)]/30 text-[var(--color-brand-sage)] hover:bg-[var(--color-brand-sage)]/5 transition-colors"
                >
                  Você já tem acesso — assistir
                </Link>
              ) : !isLogged ? (
                <Link
                  href="/signup"
                  className="block text-center w-full px-6 py-4 text-xs font-semibold uppercase tracking-[0.2em] rounded-sm bg-[var(--color-brand-sage)] text-white hover:bg-[var(--color-brand-charcoal)] transition-colors"
                >
                  Criar conta para comprar
                </Link>
              ) : soldOut || !product.stripePriceId ? (
                <button
                  type="button"
                  disabled
                  className="w-full px-6 py-4 text-xs font-semibold uppercase tracking-[0.2em] rounded-sm bg-[var(--color-brand-charcoal)]/20 text-white cursor-not-allowed"
                >
                  {soldOut ? "Esgotado" : "Em breve"}
                </button>
              ) : (
                <form action={startProductCheckoutAction.bind(null, product.id)}>
                  <button
                    type="submit"
                    className={`w-full px-6 py-4 text-xs font-semibold uppercase tracking-[0.2em] rounded-sm transition-colors ${
                      product.highlight
                        ? "bg-[var(--color-brand-gold)] text-white hover:bg-[var(--color-brand-charcoal)]"
                        : "bg-[var(--color-brand-sage)] text-white hover:bg-[var(--color-brand-charcoal)]"
                    }`}
                  >
                    Comprar curso
                  </button>
                </form>
              )}

              <p className="text-[10px] text-[var(--color-brand-charcoal)]/45 mt-4 leading-relaxed text-center">
                Pagamento seguro pela Stripe. Escolha à vista ou parcelado no
                cartão.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
