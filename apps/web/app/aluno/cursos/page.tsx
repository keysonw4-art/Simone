import Link from "next/link";
import {
  CheckCircle2,
  ArrowRight,
  BookOpen,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import { prisma } from "@repo/database";
import { requireSession } from "@/lib/subscriptionGuard";
import { resolveStudentAccess } from "@/lib/entitlements";
import { PaymentConfirming } from "@/components/PaymentConfirming";

export default async function CursosIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ compra?: string; assinatura?: string }>;
}) {
  const [user, sp] = await Promise.all([requireSession(), searchParams]);
  const justBought = sp?.compra === "sucesso" || sp?.assinatura === "sucesso";

  const access = await resolveStudentAccess(user.id, user.role);

  if (access.hasAny) {
    const courses = await prisma.course.findMany({
      where: {
        isArchived: false,
        deletedAt: null,
        ...(access.accessAll ? {} : { id: { in: [...access.courseIds] } }),
      },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { modules: true } } },
    });

    return (
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-24 relative z-10">
        {justBought && (
          <div className="max-w-2xl mb-10 rounded-sm border border-[var(--color-brand-sage)]/30 bg-[var(--color-brand-sage)]/5 px-6 py-5 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[var(--color-brand-sage)] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[var(--color-brand-charcoal)]">
                Compra confirmada. Boas-vindas.
              </p>
              <p className="text-xs text-[var(--color-brand-charcoal)]/60 mt-0.5">
                Seu acesso já está liberado abaixo.
              </p>
            </div>
          </div>
        )}

        <header className="mb-12 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-brand-charcoal)]/60 mb-3">
              Meus Cursos
            </p>
            <h1 className="font-serif text-4xl md:text-5xl text-[var(--color-brand-charcoal)] tracking-tight leading-[1.1]">
              {access.accessAll ? "Seu catálogo completo" : "Seu conteúdo"}
            </h1>
          </div>
          {!access.accessAll && (
            <Link
              href="/planos"
              className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--color-brand-sage)] hover:text-[var(--color-brand-charcoal)] transition-colors"
            >
              Ver mais cursos <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </header>

        {courses.length === 0 ? (
          <div className="text-center py-16 bg-white border border-black/5 rounded-sm">
            <p className="text-sm text-[var(--color-brand-charcoal)]/50 uppercase tracking-widest">
              Nenhum módulo disponível no momento
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Link
                key={course.id}
                href={`/aluno/cursos/${course.slug}`}
                className="group bg-white border border-black/5 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col"
              >
                <div className="w-full h-48 bg-[var(--color-brand-charcoal)]/5 flex items-center justify-center relative overflow-hidden">
                  {course.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    <BookOpen className="w-12 h-12 text-[var(--color-brand-charcoal)]/20" />
                  )}
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors"></div>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="font-serif text-xl text-[var(--color-brand-charcoal)] mb-2 group-hover:text-[var(--color-brand-sage)] transition-colors">
                    {course.title}
                  </h3>
                  {course.description && (
                    <p className="text-xs text-[var(--color-brand-charcoal)]/60 line-clamp-2 mb-4 leading-relaxed">
                      {course.description}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between text-[10px] uppercase tracking-widest">
                    <span className="text-[var(--color-brand-charcoal)]/50">
                      {course._count.modules}{" "}
                      {course._count.modules === 1 ? "seção" : "seções"}
                    </span>
                    <span className="text-[var(--color-brand-sage)] font-medium flex items-center gap-1">
                      Acessar{" "}
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Sem acesso → aulas de cortesia (isProtected=false) + CTA de compra
  const freeLessons = await prisma.lesson.findMany({
    where: {
      isProtected: false,
      deletedAt: null,
      module: {
        deletedAt: null,
        course: { isArchived: false, deletedAt: null },
      },
    },
    orderBy: [
      { module: { course: { createdAt: "asc" } } },
      { module: { order: "asc" } },
      { order: "asc" },
    ],
    select: {
      id: true,
      title: true,
      description: true,
      module: {
        select: {
          id: true,
          title: true,
          course: {
            select: { id: true, title: true, slug: true, thumbnail: true },
          },
        },
      },
    },
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-16 md:py-24 relative z-10">
      {justBought && <PaymentConfirming />}

      <header className="mb-12">
        <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-brand-sage)] mb-3 flex items-center gap-2">
          <Sparkles className="w-3 h-3" /> Aulas de cortesia
        </p>
        <h1 className="font-serif text-4xl md:text-5xl text-[var(--color-brand-charcoal)] tracking-tight leading-[1.1] mb-4">
          Uma amostra do{" "}
          <em className="text-[var(--color-brand-sage)] font-medium not-italic">
            método
          </em>
          .
        </h1>
        <p className="text-base text-[var(--color-brand-charcoal)]/70 max-w-2xl font-light leading-relaxed">
          Você ainda não tem acesso ativo. Estas aulas estão liberadas por
          cortesia para você experimentar o conteúdo.
        </p>
      </header>

      {freeLessons.length === 0 ? (
        <div className="bg-white border border-black/5 rounded-lg p-10 shadow-sm text-center mb-12">
          <div className="w-16 h-16 border border-[var(--color-brand-sage)]/30 flex items-center justify-center mx-auto mb-6 text-[var(--color-brand-sage)] rounded-sm">
            <PlayCircle className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-2xl text-[var(--color-brand-charcoal)] mb-3">
            Aulas de cortesia em breve
          </h2>
          <p className="text-sm text-[var(--color-brand-charcoal)]/60 max-w-md mx-auto">
            Estamos preparando uma amostra do conteúdo. Enquanto isso, conheça
            os cursos e escolha o que combina com você.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {freeLessons.map((lesson) => (
            <Link
              key={lesson.id}
              href={`/aluno/cursos/${lesson.module.course.slug}/aulas/${lesson.id}`}
              className="group bg-white border border-black/5 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col"
            >
              <div className="w-full h-40 bg-[var(--color-brand-charcoal)]/5 flex items-center justify-center relative overflow-hidden">
                {lesson.module.course.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={lesson.module.course.thumbnail}
                    alt={lesson.module.course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                ) : (
                  <PlayCircle className="w-10 h-10 text-[var(--color-brand-charcoal)]/20" />
                )}
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors"></div>
                <div className="absolute top-3 right-3 bg-[var(--color-brand-sage)]/95 text-white text-[9px] uppercase tracking-widest font-medium px-2 py-1 rounded-sm">
                  Cortesia
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="text-[10px] uppercase tracking-widest text-[var(--color-brand-charcoal)]/40 mb-2">
                  {lesson.module.course.title} · {lesson.module.title}
                </div>
                <h3 className="font-serif text-lg text-[var(--color-brand-charcoal)] mb-1 group-hover:text-[var(--color-brand-sage)] transition-colors line-clamp-2">
                  {lesson.title}
                </h3>
                {lesson.description && (
                  <p className="text-xs text-[var(--color-brand-charcoal)]/60 line-clamp-2 leading-relaxed">
                    {lesson.description}
                  </p>
                )}
                <div className="mt-4 text-[10px] uppercase tracking-widest text-[var(--color-brand-sage)] font-medium flex items-center gap-1">
                  Assistir agora{" "}
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="bg-white border border-black/5 rounded-lg overflow-hidden shadow-sm relative">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-[var(--color-brand-sage)] via-[var(--color-brand-gold)] to-[var(--color-brand-sage)]"></div>
        <div className="p-10 md:p-14 flex flex-col md:flex-row items-start md:items-center gap-8 justify-between">
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-brand-charcoal)]/50 mb-3">
              Pronto para ir mais fundo?
            </p>
            <h2 className="font-serif text-3xl md:text-4xl text-[var(--color-brand-charcoal)] mb-3 tracking-tight leading-tight">
              Gostou do conteúdo?
              <br />
              <em className="text-[var(--color-brand-sage)] font-medium not-italic">
                Comece agora.
              </em>
            </h2>
            <p className="text-sm text-[var(--color-brand-charcoal)]/60 max-w-lg font-light leading-relaxed">
              Escolha um curso completo ou compre módulos avulsos. Compra única,
              acesso por prazo, sem mensalidade.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
            <Link
              href="/planos"
              className="bg-[var(--color-brand-sage)] text-white px-8 py-4 text-xs font-semibold uppercase tracking-[0.2em] hover:bg-[var(--color-brand-charcoal)] transition-colors duration-500 whitespace-nowrap flex items-center justify-center gap-3 group shadow-xl shadow-[var(--color-brand-sage)]/20"
            >
              Ver cursos{" "}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/avulsos"
              className="border border-[var(--color-brand-charcoal)]/20 text-[var(--color-brand-charcoal)] px-8 py-4 text-xs font-semibold uppercase tracking-[0.2em] hover:border-[var(--color-brand-sage)] hover:text-[var(--color-brand-sage)] transition-colors duration-500 whitespace-nowrap flex items-center justify-center"
            >
              Avulsos
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
