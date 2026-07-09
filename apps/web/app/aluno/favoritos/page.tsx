import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Star, PlayCircle, Layers } from "lucide-react";
import { prisma } from "@repo/database";
import { auth } from "@repo/auth";

export default async function FavoritosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const favorites = await prisma.favorite.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      lesson: {
        select: {
          id: true,
          title: true,
          module: { select: { title: true, course: { select: { slug: true, title: true } } } },
        },
      },
      module: {
        select: {
          id: true,
          title: true,
          course: { select: { slug: true, title: true } },
        },
      },
    },
  });

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <Link
        href="/aluno"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/50 hover:text-[var(--color-brand-sage)] transition-colors mb-10"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Voltar
      </Link>

      <header className="mb-12">
        <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-brand-charcoal)]/60 mb-2">
          Favoritos
        </p>
        <h1 className="font-serif text-4xl md:text-5xl text-[var(--color-brand-charcoal)] tracking-tight">
          Salvos por você
        </h1>
        <p className="text-sm text-[var(--color-brand-charcoal)]/70 mt-4 max-w-xl leading-relaxed">
          Aulas e módulos que você marcou como favoritos. Continue de onde
          parou, revise conteúdos importantes, monte sua trilha pessoal.
        </p>
      </header>

      {favorites.length === 0 ? (
        <div className="bg-white border border-black/5 rounded-lg p-16 text-center">
          <Star className="w-10 h-10 text-[var(--color-brand-charcoal)]/20 mx-auto mb-4" />
          <p className="text-sm text-[var(--color-brand-charcoal)]/60 mb-2">
            Você ainda não tem favoritos.
          </p>
          <p className="text-xs text-[var(--color-brand-charcoal)]/40">
            Ao assistir uma aula ou navegar por um módulo, use a estrela para salvar.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {favorites.map((f) => {
            if (f.lesson) {
              const l = f.lesson;
              return (
                <Link
                  key={f.id}
                  href={`/aluno/cursos/${l.module.course.slug}/aulas/${l.id}`}
                  className="group bg-white border border-black/5 rounded-lg p-5 flex items-center gap-5 hover:border-[var(--color-brand-sage)]/30 hover:bg-black/[0.015] transition-colors"
                >
                  <div className="w-11 h-11 rounded-sm bg-[var(--color-brand-sage)]/10 text-[var(--color-brand-sage)] flex items-center justify-center flex-shrink-0">
                    <PlayCircle className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-widest text-[var(--color-brand-charcoal)]/40 mb-1">
                      Aula · {l.module.course.title} · {l.module.title}
                    </div>
                    <h3 className="text-base font-medium text-[var(--color-brand-charcoal)] group-hover:text-[var(--color-brand-sage)] transition-colors truncate">
                      {l.title}
                    </h3>
                  </div>
                  <span className="text-[10px] text-[var(--color-brand-charcoal)]/40 whitespace-nowrap">
                    {f.createdAt.toLocaleDateString("pt-BR")}
                  </span>
                </Link>
              );
            }
            if (f.module) {
              const m = f.module;
              return (
                <Link
                  key={f.id}
                  href={`/aluno/cursos/${m.course.slug}`}
                  className="group bg-white border border-black/5 rounded-lg p-5 flex items-center gap-5 hover:border-[var(--color-brand-gold)]/30 hover:bg-black/[0.015] transition-colors"
                >
                  <div className="w-11 h-11 rounded-sm bg-[var(--color-brand-gold)]/10 text-[var(--color-brand-gold)] flex items-center justify-center flex-shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-widest text-[var(--color-brand-charcoal)]/40 mb-1">
                      Módulo · {m.course.title}
                    </div>
                    <h3 className="text-base font-medium text-[var(--color-brand-charcoal)] group-hover:text-[var(--color-brand-gold)] transition-colors truncate">
                      {m.title}
                    </h3>
                  </div>
                  <span className="text-[10px] text-[var(--color-brand-charcoal)]/40 whitespace-nowrap">
                    {f.createdAt.toLocaleDateString("pt-BR")}
                  </span>
                </Link>
              );
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
}
