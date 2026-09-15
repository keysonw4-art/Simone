import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@repo/auth";
import { prisma } from "@repo/database";
import { ArrowRight, PlayCircle, BookOpen, Sparkles, GraduationCap } from "lucide-react";
import { getStudentCatalog } from "@/lib/entitlements";

export default async function AlunoHomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user;
  const firstName = user.name?.trim().split(" ")[0] ?? "aluno(a)";

  // Catálogo por Curso (Product) — mesma hierarquia de "Meus Cursos".
  const catalog = await getStudentCatalog(user.id);
  const hasAccess = catalog.hasAny;

  // Sem acesso: amostra de até 3 aulas de cortesia no dashboard
  const previewLessons = hasAccess
    ? []
    : await prisma.lesson.findMany({
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
        take: 3,
        select: {
          id: true,
          title: true,
          module: {
            select: {
              title: true,
              course: {
                select: { title: true, slug: true, thumbnail: true },
              },
            },
          },
        },
      });

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
        {!hasAccess && previewLessons.length === 0 && (
          <div className="bg-white border border-black/5 rounded-lg p-10 shadow-sm md:col-span-2 flex flex-col items-center text-center">
            <div className="w-16 h-16 border border-[var(--color-brand-sage)]/30 flex items-center justify-center mb-6 text-[var(--color-brand-sage)] rounded-sm">
              <PlayCircle className="w-6 h-6" />
            </div>
            <h2 className="font-serif text-3xl text-[var(--color-brand-charcoal)] tracking-wide mb-3">
              Seus cursos
            </h2>
            <p className="text-base text-[var(--color-brand-charcoal)]/60 leading-relaxed max-w-lg mb-8">
              Você ainda não tem acesso a nenhum módulo. Assim que comprar um
              curso ou um avulso, o conteúdo aparece aqui.
            </p>
            <Link
              href="/planos"
              className="bg-[var(--color-brand-sage)] text-white px-8 py-4 text-xs font-semibold uppercase tracking-[0.2em] hover:bg-[var(--color-brand-charcoal)] transition-colors duration-500 shadow-xl shadow-[var(--color-brand-sage)]/20"
            >
              Conhecer os cursos
            </Link>
          </div>
        )}

        {!hasAccess && previewLessons.length > 0 && (
          <div className="bg-white border border-black/5 rounded-lg p-8 md:p-10 shadow-sm md:col-span-2">
            <div className="flex items-start justify-between gap-6 flex-wrap mb-8">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-brand-sage)] mb-2 flex items-center gap-2">
                  <Sparkles className="w-3 h-3" /> Aulas de cortesia
                </p>
                <h2 className="font-serif text-3xl text-[var(--color-brand-charcoal)] tracking-wide">
                  Uma amostra do método
                </h2>
                <p className="text-sm text-[var(--color-brand-charcoal)]/60 mt-2 max-w-lg leading-relaxed">
                  Você ainda não tem acesso ativo. Estas aulas estão liberadas
                  para você experimentar.
                </p>
              </div>
              <Link
                href="/planos"
                className="bg-[var(--color-brand-sage)] text-white px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] hover:bg-[var(--color-brand-charcoal)] transition-colors duration-500 flex items-center gap-2 group whitespace-nowrap"
              >
                Ver planos
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {previewLessons.map((lesson) => (
                <Link
                  key={lesson.id}
                  href={`/aluno/cursos/${lesson.module.course.slug}/aulas/${lesson.id}`}
                  className="group border border-black/5 rounded-sm overflow-hidden hover:shadow-md hover:border-[var(--color-brand-sage)]/20 transition-all duration-300 flex flex-col"
                >
                  <div className="w-full h-28 bg-[var(--color-brand-charcoal)]/5 flex items-center justify-center relative overflow-hidden">
                    {lesson.module.course.thumbnail ? (
                      <Image unoptimized fill sizes="(max-width: 768px) 100vw, 33vw"
                        src={lesson.module.course.thumbnail}
                        alt={lesson.module.course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    ) : (
                      <PlayCircle className="w-8 h-8 text-[var(--color-brand-charcoal)]/20" />
                    )}
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors"></div>
                    <div className="absolute top-2 right-2 bg-[var(--color-brand-sage)]/95 text-white text-[9px] uppercase tracking-widest font-medium px-2 py-0.5 rounded-sm">
                      Cortesia
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="text-[9px] uppercase tracking-widest text-[var(--color-brand-charcoal)]/40 mb-1 truncate">
                      {lesson.module.course.title}
                    </div>
                    <h3 className="font-serif text-base text-[var(--color-brand-charcoal)] group-hover:text-[var(--color-brand-sage)] transition-colors line-clamp-2 leading-tight">
                      {lesson.title}
                    </h3>
                    <div className="mt-3 text-[10px] uppercase tracking-widest text-[var(--color-brand-sage)] font-medium flex items-center gap-1">
                      Assistir{" "}
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <Link
              href="/aluno/cursos"
              className="inline-flex items-center gap-2 mt-8 text-[10px] uppercase tracking-widest text-[var(--color-brand-charcoal)]/60 hover:text-[var(--color-brand-sage)] transition-colors"
            >
              Ver todas as aulas de cortesia
              <ArrowRight className="w-3 h-3" />
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
              {user.email}
            </span>
          </p>

          <div className="flex flex-col gap-2 mt-6 pt-4 border-t border-black/5">
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

      {hasAccess && (catalog.products.length > 0 || catalog.avulsos.length > 0) && (
        <div>
          <h2 className="font-serif text-3xl text-[var(--color-brand-charcoal)] mb-8 tracking-wide">
            Meus Cursos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {catalog.products.map((product) => (
              <Link
                key={product.slug}
                href={`/aluno/produto/${product.slug}`}
                className="group bg-white border border-black/5 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col"
              >
                <div className="w-full h-40 bg-gradient-to-br from-[var(--color-brand-sage)]/10 to-[var(--color-brand-gold)]/10 flex items-center justify-center relative">
                  <GraduationCap className="w-12 h-12 text-[var(--color-brand-sage)]/40" />
                  {product.grantsAll && (
                    <div className="absolute top-3 right-3 bg-[var(--color-brand-gold)] text-white text-[9px] uppercase tracking-widest font-medium px-2 py-1 rounded-sm">
                      Acesso completo
                    </div>
                  )}
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="font-serif text-xl text-[var(--color-brand-charcoal)] mb-2 group-hover:text-[var(--color-brand-sage)] transition-colors">
                    {product.name}
                  </h3>
                  {product.tagline && (
                    <p className="text-xs text-[var(--color-brand-charcoal)]/60 line-clamp-2 mb-4 leading-relaxed">
                      {product.tagline}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between text-[10px] uppercase tracking-widest">
                    <span className="text-[var(--color-brand-charcoal)]/50">
                      {product.moduleCount}{" "}
                      {product.moduleCount === 1 ? "módulo" : "módulos"}
                    </span>
                    <span className="text-[var(--color-brand-sage)] font-medium flex items-center gap-1">
                      Acessar <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}

            {catalog.avulsos.map((mod) => (
              <Link
                key={mod.slug}
                href={`/aluno/cursos/${mod.slug}`}
                className="group bg-white border border-black/5 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col"
              >
                <div className="w-full h-40 bg-[var(--color-brand-charcoal)]/5 flex items-center justify-center relative overflow-hidden">
                  {mod.thumbnail ? (
                    <Image unoptimized fill sizes="(max-width: 768px) 100vw, 33vw"
                      src={mod.thumbnail}
                      alt={mod.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    <BookOpen className="w-12 h-12 text-[var(--color-brand-charcoal)]/20" />
                  )}
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors"></div>
                  <div className="absolute top-3 right-3 bg-[var(--color-brand-charcoal)]/70 text-white text-[9px] uppercase tracking-widest font-medium px-2 py-1 rounded-sm">
                    Avulso
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="font-serif text-xl text-[var(--color-brand-charcoal)] mb-2 group-hover:text-[var(--color-brand-sage)] transition-colors">
                    {mod.title}
                  </h3>
                  <div className="mt-auto flex items-center justify-end text-[10px] uppercase tracking-widest">
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
