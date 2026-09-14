import { requireAdminPage } from "@/lib/requireAdmin";
import Link from "next/link";
import { Plus, Award, Sparkles, Users } from "lucide-react";
import { prisma } from "@repo/database";

function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export default async function ProdutosPage() {
  await requireAdminPage();
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    orderBy: { order: "asc" },
    include: { _count: { select: { productCourses: true } } },
  });

  return (
    <div>
      <header className="mb-10 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-4xl text-[var(--color-brand-charcoal)] tracking-wide">
            Cursos
          </h1>
          <p className="text-[var(--color-brand-charcoal)]/60 mt-2 text-sm uppercase tracking-widest">
            Produtos vendáveis, montados a partir dos módulos
          </p>
        </div>
        <Link
          href="/produtos/novo"
          className="inline-flex items-center gap-2 px-5 py-3 bg-[var(--color-brand-sage)] text-white text-[10px] uppercase tracking-widest rounded-sm hover:bg-[var(--color-brand-charcoal)] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Novo curso
        </Link>
      </header>

      {products.length === 0 ? (
        <div className="bg-white border border-black/5 rounded-lg p-16 text-center">
          <p className="text-sm text-[var(--color-brand-charcoal)]/50 uppercase tracking-widest">
            Nenhum curso cadastrado ainda
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {products.map((p) => (
            <Link
              key={p.id}
              href={`/produtos/${p.id}`}
              className="group bg-white border border-black/5 rounded-lg p-5 flex items-center gap-5 hover:border-[var(--color-brand-sage)]/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-medium text-[var(--color-brand-charcoal)] group-hover:text-[var(--color-brand-sage)] transition-colors">
                    {p.name}
                  </h2>
                  {p.highlight && (
                    <span className="text-[9px] uppercase tracking-widest text-[var(--color-brand-gold)] font-medium">
                      Recomendado
                    </span>
                  )}
                  {!p.isActive && (
                    <span className="text-[9px] uppercase tracking-widest text-[var(--color-brand-charcoal)]/40 border border-black/10 rounded px-1.5 py-0.5">
                      Inativo
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-[10px] uppercase tracking-widest text-[var(--color-brand-charcoal)]/50 flex-wrap">
                  <span>{p.accessMonths} meses</span>
                  {p.grantsAll ? (
                    <span className="text-[var(--color-brand-sage)]">Acesso total</span>
                  ) : (
                    <span>{p._count.productCourses} módulos</span>
                  )}
                  {p.certificateType && (
                    <span className="inline-flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      {p.certificateType === "PROFESSIONAL" ? "Profissional" : "Declaração"}
                    </span>
                  )}
                  {p.includesMentoring && (
                    <span className="inline-flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Mentoria
                    </span>
                  )}
                  {p.maxSeats != null && (
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3 h-3" /> {p.seatsSold}/{p.maxSeats}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-serif text-2xl text-[var(--color-brand-charcoal)]">
                  {formatBRL(p.priceCents)}
                </div>
                {!p.stripePriceId && (
                  <div className="text-[9px] uppercase tracking-widest text-[var(--color-brand-gold)] mt-1">
                    sem Stripe
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
