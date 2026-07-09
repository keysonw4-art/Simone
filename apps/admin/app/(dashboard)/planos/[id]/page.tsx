import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@repo/database";
import { updatePlanAction } from "../../../../actions/plans";
import { PlanForm } from "../../../../components/PlanForm";

function parseBenefits(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((v): v is string => typeof v === "string");
    }
  } catch {
    // fallback abaixo
  }
  return raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

export default async function EditarPlanoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const plan = await prisma.plan.findFirst({
    where: { id, deletedAt: null },
  });
  if (!plan) notFound();

  const boundAction = updatePlanAction.bind(null, plan.id);

  return (
    <div>
      <Link
        href="/planos"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/60 hover:text-[var(--color-brand-sage)] mb-6 transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" /> Planos
      </Link>

      <header className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="font-serif text-4xl text-[var(--color-brand-charcoal)] tracking-wide">
            {plan.name}
          </h1>
          <code className="text-xs font-mono px-2 py-1 bg-[var(--color-brand-charcoal)]/5 text-[var(--color-brand-charcoal)]/70 rounded-sm">
            {plan.type}
          </code>
        </div>
        <p className="text-[var(--color-brand-charcoal)]/60 text-sm uppercase tracking-widest">
          Edite preço, benefícios e visibilidade
        </p>
      </header>

      <PlanForm
        action={boundAction}
        defaultValues={{
          name: plan.name,
          tagline: plan.tagline,
          priceCents: plan.priceCents,
          benefits: parseBenefits(plan.benefits),
          highlight: plan.highlight,
          isActive: plan.isActive,
          order: plan.order,
        }}
        submitLabel="Salvar Alterações"
        successMessage="Alterações salvas."
      />
    </div>
  );
}
