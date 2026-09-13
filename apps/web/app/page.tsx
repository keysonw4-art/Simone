import Link from "next/link";
import { prisma } from "@repo/database";
import { ArrowRight, Compass, LayoutGrid, Repeat } from "lucide-react";
import { LandingHero } from "@/components/landing/LandingHero";
import { Reveal } from "@/components/landing/Reveal";

function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

const PILLARS = [
  {
    icon: Compass,
    title: "Clareza",
    body: "Entender o que fica, o que sai e por quê. A decisão vem antes da caixa organizadora.",
  },
  {
    icon: LayoutGrid,
    title: "Sistema",
    body: "Cada coisa em um lugar que faz sentido para você e que é fácil de manter no dia a dia.",
  },
  {
    icon: Repeat,
    title: "Permanência",
    body: "Hábitos simples para que a ordem dure muito depois da primeira arrumação.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Assine",
    body: "Escolha o plano que combina com o seu momento.",
  },
  {
    n: "02",
    title: "Acesse",
    body: "Cursos, aulas e materiais liberados na sua área, quando quiser.",
  },
  {
    n: "03",
    title: "Transforme",
    body: "Aplique no seu ritmo e veja a mudança acontecer, ambiente por ambiente.",
  },
];

export default async function Home() {
  const plans = await prisma.product.findMany({
    where: { isActive: true, deletedAt: null },
    orderBy: { order: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      tagline: true,
      priceCents: true,
      highlight: true,
    },
  });

  return (
    <div className="relative overflow-hidden">
      {/* Fundo — halos suaves da identidade */}
      <div className="absolute inset-0 bg-[var(--color-brand-offwhite)] -z-20" />
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[var(--color-brand-gold)]/5 rounded-full blur-[120px] -z-10 translate-x-1/3 -translate-y-1/3" />
      <div className="absolute top-[60vh] left-0 w-[600px] h-[600px] bg-[var(--color-brand-sage)]/5 rounded-full blur-[100px] -z-10 -translate-x-1/4" />

      {/* Header */}
      <header className="w-full fixed top-0 z-50 backdrop-blur-md bg-[var(--color-brand-offwhite)]/70 border-b border-black/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-11 h-11 border border-[var(--color-brand-gold)]/50 flex items-center justify-center text-[var(--color-brand-gold)] font-serif text-lg">
              SM
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-lg text-[var(--color-brand-charcoal)] tracking-widest leading-none">
                SIMONE MENDES
              </span>
              <span className="text-[9px] uppercase tracking-[0.2em] text-[var(--color-brand-charcoal)]/60 mt-1">
                Organizer Premium
              </span>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-10 text-xs uppercase font-medium tracking-[0.15em] text-[var(--color-brand-charcoal)]/70">
            <a
              href="#metodo"
              className="hover:text-[var(--color-brand-gold)] transition-colors"
            >
              Método
            </a>
            <a
              href="#planos"
              className="hover:text-[var(--color-brand-gold)] transition-colors"
            >
              Cursos
            </a>
            <Link
              href="/avulsos"
              className="hover:text-[var(--color-brand-gold)] transition-colors"
            >
              Avulsos
            </Link>
            <Link
              href="/aluno/suporte"
              className="hover:text-[var(--color-brand-gold)] transition-colors"
            >
              Suporte
            </Link>
          </nav>
          <Link
            href="/login"
            className="bg-[var(--color-brand-charcoal)] text-white px-4 sm:px-6 py-2.5 sm:py-3 text-[11px] sm:text-xs uppercase tracking-[0.15em] rounded-sm hover:bg-[var(--color-brand-sage)] transition-colors duration-500 flex items-center gap-2 group whitespace-nowrap flex-shrink-0"
          >
            <span className="sm:hidden">Entrar</span>
            <span className="hidden sm:inline">Área do Aluno</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </header>

      <LandingHero />

      {/* Método */}
      <section
        id="metodo"
        className="relative z-10 max-w-6xl mx-auto px-6 py-24 md:py-32 scroll-mt-24"
      >
        <Reveal className="max-w-2xl mb-16">
          <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--color-brand-sage)] mb-4">
            O Método
          </p>
          <h2 className="font-serif text-4xl md:text-5xl text-[var(--color-brand-charcoal)] tracking-tight leading-[1.1] mb-6">
            Organização como um ato de cuidado.
          </h2>
          <p className="text-base md:text-lg text-[var(--color-brand-charcoal)]/70 font-light leading-relaxed">
            Mais do que arrumar, é criar sistemas que cabem na sua rotina e
            permanecem. Uma casa em ordem para uma vida mais leve.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-black/5 border border-black/5 rounded-sm overflow-hidden">
          {PILLARS.map((p, i) => (
            <Reveal key={p.title} delay={i * 80}>
              <div className="bg-[var(--color-brand-offwhite)] h-full p-8 md:p-10">
                <p.icon
                  className="w-6 h-6 text-[var(--color-brand-sage)] mb-6"
                  strokeWidth={1.5}
                />
                <h3 className="font-serif text-2xl text-[var(--color-brand-charcoal)] mb-3">
                  {p.title}
                </h3>
                <p className="text-sm text-[var(--color-brand-charcoal)]/65 leading-relaxed">
                  {p.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Como funciona */}
      <section className="relative z-10 bg-white border-y border-black/5">
        <div className="max-w-6xl mx-auto px-6 py-24 md:py-32">
          <Reveal>
            <h2 className="font-serif text-4xl md:text-5xl text-[var(--color-brand-charcoal)] tracking-tight leading-[1.1] mb-16 max-w-xl">
              Do primeiro acesso à casa transformada.
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 80}>
                <div className="flex flex-col">
                  <span className="font-serif text-5xl text-[var(--color-brand-gold)]/30 mb-5 leading-none">
                    {s.n}
                  </span>
                  <h3 className="font-serif text-2xl text-[var(--color-brand-charcoal)] mb-3">
                    {s.title}
                  </h3>
                  <p className="text-sm text-[var(--color-brand-charcoal)]/65 leading-relaxed">
                    {s.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Planos */}
      {plans.length > 0 && (
        <section
          id="planos"
          className="relative z-10 max-w-6xl mx-auto px-6 py-24 md:py-32 scroll-mt-24"
        >
          <Reveal className="max-w-2xl mb-16">
            <h2 className="font-serif text-4xl md:text-5xl text-[var(--color-brand-charcoal)] tracking-tight leading-[1.1] mb-6">
              Um plano para cada momento.
            </h2>
            <p className="text-base text-[var(--color-brand-charcoal)]/70 font-light leading-relaxed">
              Comece quando quiser, cancele quando precisar. Todo o conteúdo na
              sua área de aluno.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan, i) => (
              <Reveal key={plan.id} delay={i * 80} className="h-full">
                <div
                  className={`h-full bg-white rounded-sm flex flex-col p-8 ${
                    plan.highlight
                      ? "border-2 border-[var(--color-brand-gold)] shadow-lg"
                      : "border border-black/5 shadow-sm"
                  }`}
                >
                  {plan.highlight && (
                    <span className="self-start text-[10px] uppercase tracking-widest text-[var(--color-brand-gold)] font-medium mb-4">
                      Recomendado
                    </span>
                  )}
                  <h3 className="font-serif text-2xl text-[var(--color-brand-charcoal)] mb-1">
                    {plan.name}
                  </h3>
                  {plan.tagline && (
                    <p className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/50 mb-6">
                      {plan.tagline}
                    </p>
                  )}
                  <div className="mb-8">
                    <div className="font-serif text-4xl text-[var(--color-brand-charcoal)]">
                      {formatBRL(plan.priceCents)}
                    </div>
                    <p className="text-xs text-[var(--color-brand-charcoal)]/60 mt-1">
                      ou 10x de {formatBRL(Math.round(plan.priceCents / 10))}
                    </p>
                  </div>
                  <Link
                    href={`/planos/${plan.slug}`}
                    className={`mt-auto block text-center px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] rounded-sm transition-colors ${
                      plan.highlight
                        ? "bg-[var(--color-brand-gold)] text-white hover:bg-[var(--color-brand-charcoal)]"
                        : "bg-[var(--color-brand-sage)] text-white hover:bg-[var(--color-brand-charcoal)]"
                    }`}
                  >
                    Ver detalhes
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-10 flex flex-col sm:flex-row gap-x-8 gap-y-3">
            <Link
              href="/planos"
              className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/60 hover:text-[var(--color-brand-sage)] transition-colors"
            >
              Comparar todos os cursos
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/avulsos"
              className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/60 hover:text-[var(--color-brand-sage)] transition-colors"
            >
              Ou compre módulos avulsos
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Reveal>
        </section>
      )}

      {/* CTA final */}
      <section className="relative z-10 bg-[var(--color-brand-sage)] text-white">
        <div className="max-w-4xl mx-auto px-6 py-24 md:py-32 text-center">
          <Reveal>
            <h2 className="font-serif text-4xl md:text-5xl tracking-tight leading-[1.1] mb-6">
              Comece a sua jornada de organização.
            </h2>
            <p className="text-base md:text-lg text-white/70 font-light leading-relaxed max-w-xl mx-auto mb-10">
              Crie sua conta e dê o primeiro passo para uma casa mais leve, no
              seu tempo.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-3 bg-white text-[var(--color-brand-sage)] px-10 py-4 text-xs font-semibold uppercase tracking-[0.2em] rounded-sm hover:bg-[var(--color-brand-offwhite)] transition-colors duration-500 group"
            >
              Iniciar Jornada
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-[var(--color-brand-offwhite)] border-t border-black/5">
        <div className="max-w-7xl mx-auto px-6 py-14 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <span className="font-serif text-lg text-[var(--color-brand-charcoal)] tracking-widest">
              SIMONE MENDES
            </span>
            <p className="text-xs text-[var(--color-brand-charcoal)]/50 mt-2 max-w-xs leading-relaxed">
              Educação em organização para uma vida com mais leveza.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-8 gap-y-3 text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/60">
            <a href="#metodo" className="hover:text-[var(--color-brand-sage)] transition-colors">
              Método
            </a>
            <a href="#planos" className="hover:text-[var(--color-brand-sage)] transition-colors">
              Cursos
            </a>
            <Link href="/avulsos" className="hover:text-[var(--color-brand-sage)] transition-colors">
              Avulsos
            </Link>
            <Link href="/login" className="hover:text-[var(--color-brand-sage)] transition-colors">
              Área do Aluno
            </Link>
            <Link href="/termos" className="hover:text-[var(--color-brand-sage)] transition-colors">
              Termos
            </Link>
            <Link href="/privacidade" className="hover:text-[var(--color-brand-sage)] transition-colors">
              Privacidade
            </Link>
          </nav>
        </div>
        <div className="max-w-7xl mx-auto px-6 pb-10">
          <p className="text-[11px] text-[var(--color-brand-charcoal)]/40">
            © {new Date().getFullYear()} Simone Mendes. Todos os direitos
            reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
