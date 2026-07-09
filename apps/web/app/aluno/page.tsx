import Link from "next/link";
import { auth } from "@repo/auth";
import { prisma } from "@repo/database";
import { ArrowRight, PlayCircle, BookOpen } from "lucide-react";

export default async function AlunoHomePage() {
  const session = await auth();
  const firstName =
    session?.user?.name?.trim().split(" ")[0] ?? "aluno(a)";

  // Verifica se o aluno possui alguma assinatura ativa
  const hasActiveSubscription =
    session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN"
      ? true
      : await prisma.subscription.findFirst({
          where: {
            userId: session?.user?.id,
            isActive: true,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
        });

  // Se tiver assinatura ativa, busca os cursos disponíveis
  const courses = hasActiveSubscription
    ? await prisma.course.findMany({
        where: { isArchived: false, deletedAt: null },
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { modules: true },
          },
        },
      })
    : [];

  return (
    <div className="max-w-7xl mx-auto px-6 py-16 md:py-24 relative z-10">
      <header className="mb-16">
        <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-brand-charcoal)]/60 mb-3">
          Bem-vindo(a)
        </p>
        <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-[var(--color-brand-charcoal)] tracking-tight leading-[1.1]">
          Olá, <em className="text-[var(--color-brand-gold)] font-medium not-italic">{firstName}</em>.
        </h1>
        <p className="mt-6 text-base text-[var(--color-brand-charcoal)]/70 max-w-2xl font-light leading-relaxed">
          Esse é o seu espaço na plataforma. Abaixo você encontra seus cursos,
          materiais e detalhes da conta.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {!hasActiveSubscription && (
          <div className="bg-white border border-black/5 rounded-lg p-10 shadow-sm md:col-span-2 flex flex-col items-center text-center">
            <div className="w-16 h-16 border border-[var(--color-brand-sage)]/30 flex items-center justify-center mb-6 text-[var(--color-brand-sage)] rounded-sm">
              <PlayCircle className="w-6 h-6" />
            </div>
            <h2 className="font-serif text-3xl text-[var(--color-brand-charcoal)] tracking-wide mb-3">
              Seus cursos
            </h2>
            <p className="text-base text-[var(--color-brand-charcoal)]/60 leading-relaxed max-w-lg mb-8">
              Você ainda não está matriculado em nenhum curso. Assim que ativar
              sua assinatura, todo o conteúdo aparece aqui.
            </p>
            <Link
              href="/planos"
              className="bg-[var(--color-brand-sage)] text-white px-8 py-4 text-xs font-semibold uppercase tracking-[0.2em] hover:bg-[var(--color-brand-charcoal)] transition-colors duration-500 shadow-xl shadow-[var(--color-brand-sage)]/20"
            >
              Conhecer os planos
            </Link>
          </div>
        )}

        <div className="bg-white border border-black/5 rounded-lg p-10 shadow-sm">
          <div className="w-12 h-12 border border-[var(--color-brand-gold)]/30 flex items-center justify-center mb-6 text-[var(--color-brand-gold)] rounded-sm font-serif text-base">
            i
          </div>
          <h2 className="font-serif text-2xl text-[var(--color-brand-charcoal)] tracking-wide mb-3">
            Sua conta
          </h2>
          <p className="text-sm text-[var(--color-brand-charcoal)]/60 leading-relaxed">
            E-mail:{" "}
            <span className="text-[var(--color-brand-charcoal)] font-medium">
              {session?.user?.email}
            </span>
          </p>
          <p className="text-xs text-[var(--color-brand-charcoal)]/50 mt-4 leading-relaxed">
            Em breve você poderá editar perfil, alterar senha e gerenciar
            assinatura por aqui.
          </p>
          <div className="flex flex-col gap-2 mt-6">
            <Link
              href="/aluno/suporte"
              className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--color-brand-sage)] hover:text-[var(--color-brand-charcoal)] transition-colors"
            >
              Falar com o suporte <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/aluno/certificados"
              className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--color-brand-sage)] hover:text-[var(--color-brand-charcoal)] transition-colors"
            >
              Meus certificados <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/aluno/favoritos"
              className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--color-brand-sage)] hover:text-[var(--color-brand-charcoal)] transition-colors"
            >
              Meus favoritos <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {hasActiveSubscription && courses.length > 0 && (
        <div>
          <h2 className="font-serif text-3xl text-[var(--color-brand-charcoal)] mb-8 tracking-wide">
            Meus Cursos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Link
                key={course.id}
                href={`/aluno/cursos/${course.slug}`}
                className="group bg-white border border-black/5 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col"
              >
                <div className="w-full h-48 bg-[var(--color-brand-charcoal)]/5 flex items-center justify-center relative overflow-hidden">
                  {course.thumbnail ? (
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
                      {course._count.modules} módulos
                    </span>
                    <span className="text-[var(--color-brand-sage)] font-medium flex items-center gap-1">
                      Acessar <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
