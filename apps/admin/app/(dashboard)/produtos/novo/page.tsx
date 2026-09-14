import { requireAdminPage } from "@/lib/requireAdmin";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createProductAction } from "../../../../actions/products";
import { ProductForm } from "../../../../components/ProductForm";

export default async function NovoProdutoPage() {
  await requireAdminPage();
  return (
    <div>
      <Link
        href="/produtos"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/60 hover:text-[var(--color-brand-sage)] mb-6 transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" /> Cursos
      </Link>

      <header className="mb-10">
        <h1 className="font-serif text-4xl text-[var(--color-brand-charcoal)] tracking-wide">
          Novo curso
        </h1>
        <p className="text-[var(--color-brand-charcoal)]/60 mt-2 text-sm uppercase tracking-widest">
          Defina o produto. Os módulos você compõe depois de criar.
        </p>
      </header>

      <ProductForm action={createProductAction} submitLabel="Criar curso" />
    </div>
  );
}
