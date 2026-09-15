import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { requireSession } from "@/lib/subscriptionGuard";
import { getOwnedProductBySlug, getAccessibleAvulsos } from "@/lib/entitlements";
import { ModuleCarousel } from "@/components/ModuleCarousel";

export default async function ProdutoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await requireSession();
  const { slug } = await params;

  // Posse checada no servidor — slug vem da URL, então isto é a barreira
  // anti-IDOR: sem compra ativa (ou staff/grantsAll), retorna null → 404.
  const view = await getOwnedProductBySlug(user.id, slug);
  if (!view) notFound();

  const { product, modulos } = view;
  // Avulsos que o aluno acessa (por qualquer via) — sempre listados à parte.
  const avulsos = await getAccessibleAvulsos(user.id);

  return (
    <div className="max-w-7xl mx-auto px-6 py-16 md:py-24 relative z-10">
      <Link
        href="/aluno/cursos"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/50 hover:text-[var(--color-brand-sage)] transition-colors mb-10"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Voltar para Meus Cursos
      </Link>

      <header className="mb-12 max-w-3xl">
        <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-brand-charcoal)]/60 mb-3">
          Curso
        </p>
        <h1 className="font-serif text-4xl md:text-5xl text-[var(--color-brand-charcoal)] tracking-tight leading-[1.1] mb-4">
          {product.name}
        </h1>
        {(product.tagline || product.description) && (
          <p className="text-base text-[var(--color-brand-charcoal)]/70 leading-relaxed font-light">
            {product.description || product.tagline}
          </p>
        )}
      </header>

      {modulos.length === 0 ? (
        <div className="text-center py-16 bg-white border border-black/5 rounded-sm">
          <p className="text-sm text-[var(--color-brand-charcoal)]/50 uppercase tracking-widest">
            Nenhum módulo disponível neste curso ainda
          </p>
        </div>
      ) : (
        <ModuleCarousel modulos={modulos} />
      )}

      {/* Avulsos — módulos marcados como avulso que o aluno acessa, sempre à
          parte (reforça a sensação de um produto mais completo). */}
      {avulsos.length > 0 && (
        <section className="mt-20">
          <header className="mb-6">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-brand-charcoal)]/60 mb-1">
              Também incluído
            </p>
            <h2 className="font-serif text-2xl md:text-3xl text-[var(--color-brand-charcoal)] tracking-tight">
              Módulos avulsos
            </h2>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {avulsos.map((mod) => (
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
                  {mod.description && (
                    <p className="text-xs text-[var(--color-brand-charcoal)]/60 line-clamp-2 mb-4 leading-relaxed">
                      {mod.description}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-end text-[10px] uppercase tracking-widest">
                    <span className="text-[var(--color-brand-sage)] font-medium flex items-center gap-1">
                      Acessar{" "}
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
