import { requireAdminPage } from "@/lib/requireAdmin";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@repo/database";
import {
  updateProductAction,
  deleteProductAction,
  setProductCoursesAction,
} from "../../../../actions/products";
import { ProductForm } from "../../../../components/ProductForm";
import { ProductComposition } from "../../../../components/ProductComposition";
import { DangerActionButton } from "../../../../components/DangerActionButton";

export default async function EditarProdutoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage();
  const { id } = await params;

  const product = await prisma.product.findFirst({
    where: { id, deletedAt: null },
    include: { productCourses: { select: { courseId: true } } },
  });
  if (!product) notFound();

  const courses = await prisma.course.findMany({
    where: { deletedAt: null, isArchived: false },
    orderBy: [{ category: "asc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      category: true,
      modules: {
        where: { deletedAt: null },
        select: { _count: { select: { lessons: { where: { deletedAt: null } } } } },
      },
    },
  });

  const moduleOptions = courses.map((c) => ({
    id: c.id,
    title: c.title,
    category: c.category,
    lessonsCount: c.modules.reduce((acc, m) => acc + m._count.lessons, 0),
  }));

  const selectedIds = product.productCourses.map((pc) => pc.courseId);

  const boundUpdate = updateProductAction.bind(null, product.id);
  const boundDelete = deleteProductAction.bind(null, product.id);
  const boundSetCourses = setProductCoursesAction.bind(null, product.id);

  return (
    <div>
      <Link
        href="/produtos"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/60 hover:text-[var(--color-brand-sage)] mb-6 transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" /> Cursos
      </Link>

      <header className="mb-10 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-4xl text-[var(--color-brand-charcoal)] tracking-wide">
            {product.name}
          </h1>
          <p className="text-[var(--color-brand-charcoal)]/60 mt-2 text-sm uppercase tracking-widest">
            Curso · produto
          </p>
        </div>
        <DangerActionButton
          action={boundDelete}
          label="Excluir curso"
          confirmMessage="Excluir este curso? As compras existentes não são afetadas."
        />
      </header>

      <section className="mb-14">
        <h2 className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium mb-6">
          Dados do curso
        </h2>
        <ProductForm
          action={boundUpdate}
          defaultValues={{
            name: product.name,
            slug: product.slug,
            tagline: product.tagline,
            description: product.description,
            priceCents: product.priceCents,
            accessMonths: product.accessMonths,
            grantsAll: product.grantsAll,
            certificateType: product.certificateType,
            includesMentoring: product.includesMentoring,
            maxSeats: product.maxSeats,
            highlight: product.highlight,
            isActive: product.isActive,
            order: product.order,
            stripePriceId: product.stripePriceId,
          }}
          submitLabel="Salvar alterações"
          successMessage="Alterações salvas."
        />
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium mb-2">
          Composição — módulos deste curso
        </h2>
        <p className="text-xs text-[var(--color-brand-charcoal)]/50 mb-6 max-w-xl">
          Marque os módulos que este curso concede. Um módulo pode estar em vários
          cursos e ainda ser vendido avulso.
        </p>
        <ProductComposition
          action={boundSetCourses}
          modules={moduleOptions}
          selectedIds={selectedIds}
          disabled={product.grantsAll}
        />
      </section>
    </div>
  );
}
