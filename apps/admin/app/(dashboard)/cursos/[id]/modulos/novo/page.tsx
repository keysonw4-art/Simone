import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@repo/database";
import { createModuleAction } from "../../../../../../actions/modules";
import { ModuleForm } from "../../../../../../components/ModuleForm";

export default async function NovoModuloPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const course = await prisma.course.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, title: true },
  });
  if (!course) notFound();

  const boundCreate = createModuleAction.bind(null, course.id);

  return (
    <div>
      <Link
        href={`/cursos/${course.id}`}
        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/60 hover:text-[var(--color-brand-sage)] mb-6 transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" /> {course.title}
      </Link>

      <header className="mb-10">
        <h1 className="font-serif text-4xl text-[var(--color-brand-charcoal)] tracking-wide">
          Nova Seção
        </h1>
        <p className="text-[var(--color-brand-charcoal)]/60 mt-2 text-sm uppercase tracking-widest">
          {course.title}
        </p>
      </header>

      <ModuleForm action={boundCreate} submitLabel="Criar Seção" />
    </div>
  );
}
