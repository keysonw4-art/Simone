import Link from "next/link";
import { prisma } from "@repo/database";
import { Plus } from "lucide-react";
import { CourseRowActions } from "../../../components/CourseRowActions";

type StatusFilter = "active" | "archived" | "all";

function normalizeStatus(value: string | undefined): StatusFilter {
  if (value === "archived" || value === "all") return value;
  return "active";
}

function buildWhere(status: StatusFilter) {
  if (status === "all") return { deletedAt: null };
  return { deletedAt: null, isArchived: status === "archived" };
}

const filters: { key: StatusFilter; label: string; href: string }[] = [
  { key: "active", label: "Ativos", href: "/cursos" },
  { key: "archived", label: "Arquivados", href: "/cursos?status=archived" },
  { key: "all", label: "Todos", href: "/cursos?status=all" },
];

export default async function CursosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: rawStatus } = await searchParams;
  const status = normalizeStatus(rawStatus);

  const courses = await prisma.course.findMany({
    where: buildWhere(status),
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      isArchived: true,
      createdAt: true,
      _count: { select: { modules: true } },
    },
  });

  return (
    <div>
      <header className="mb-10 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-4xl text-[var(--color-brand-charcoal)] tracking-wide">
            Módulos
          </h1>
          <p className="text-[var(--color-brand-charcoal)]/60 mt-2 text-sm uppercase tracking-widest">
            Conteúdo — as peças que montam os cursos
          </p>
        </div>
        <Link
          href="/cursos/novo"
          className="inline-flex items-center gap-2 px-5 py-3 bg-[var(--color-brand-sage)] text-white text-xs uppercase tracking-widest rounded-sm hover:bg-[var(--color-brand-charcoal)] transition-colors"
        >
          <Plus className="w-4 h-4" /> Novo Módulo
        </Link>
      </header>

      <div className="flex items-center gap-2 mb-6">
        {filters.map((f) => {
          const isActive = f.key === status;
          return (
            <Link
              key={f.key}
              href={f.href}
              className={
                isActive
                  ? "px-4 py-2 text-[10px] uppercase tracking-widest border border-[var(--color-brand-sage)] text-[var(--color-brand-sage)] bg-[var(--color-brand-sage)]/5 rounded-sm"
                  : "px-4 py-2 text-[10px] uppercase tracking-widest border border-black/10 text-[var(--color-brand-charcoal)]/60 hover:border-[var(--color-brand-charcoal)]/30 hover:text-[var(--color-brand-charcoal)] rounded-sm transition-colors"
              }
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <div className="bg-white border border-black/5 rounded-lg overflow-x-auto">
        {courses.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[var(--color-brand-charcoal)]/40 text-sm uppercase tracking-widest">
              Nenhum módulo encontrado neste filtro
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-black/5 text-[10px] uppercase tracking-widest text-[var(--color-brand-charcoal)]/60">
                <th className="text-left px-6 py-4 font-medium">Título</th>
                <th className="text-left px-6 py-4 font-medium">Slug</th>
                <th className="text-left px-6 py-4 font-medium">Seções</th>
                <th className="text-left px-6 py-4 font-medium">Status</th>
                <th className="text-left px-6 py-4 font-medium">Criado</th>
                <th className="text-right px-6 py-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr
                  key={course.id}
                  className="border-b border-black/5 last:border-b-0 hover:bg-black/[0.015] transition-colors"
                >
                  <td className="px-6 py-4">
                    <Link
                      href={`/cursos/${course.id}`}
                      className="text-sm font-medium text-[var(--color-brand-charcoal)] hover:text-[var(--color-brand-sage)] transition-colors"
                    >
                      {course.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-[var(--color-brand-charcoal)]/60">
                    {course.slug}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--color-brand-charcoal)]/70">
                    {course._count.modules}
                  </td>
                  <td className="px-6 py-4">
                    {course.isArchived ? (
                      <span className="text-[10px] uppercase tracking-widest px-2 py-1 bg-black/5 text-[var(--color-brand-charcoal)]/60 rounded-sm">
                        Arquivado
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-widest px-2 py-1 bg-[var(--color-brand-sage)]/10 text-[var(--color-brand-sage)] rounded-sm">
                        Ativo
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-[var(--color-brand-charcoal)]/60">
                    {course.createdAt.toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-6 py-4">
                    <CourseRowActions
                      courseId={course.id}
                      isArchived={course.isArchived}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
