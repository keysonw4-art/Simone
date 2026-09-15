import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/subscriptionGuard";
import { getOwnedProductBySlug } from "@/lib/entitlements";
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
    </div>
  );
}
