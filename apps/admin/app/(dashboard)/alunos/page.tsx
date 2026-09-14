import { requireAdminPage } from "@/lib/requireAdmin";
import { Pagination, parsePage, PAGE_SIZE } from "@repo/ui/pagination";
import Link from "next/link";
import { prisma } from "@repo/database";
import { UserCircle } from "lucide-react";

export default async function AlunosPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireAdminPage();
  const page = parsePage((await searchParams).page);
  const rows = await prisma.user.findMany({
    where: { deletedAt: null, role: "STUDENT" },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1, skip: (page - 1) * PAGE_SIZE,
    select: {
      id: true,
      publicId: true,
      name: true,
      email: true,
      createdAt: true,
      _count: {
        select: { entitlements: { where: { expiresAt: { gt: new Date() }, purchase: { status: "PAID", accessSuspended: false } } } },
      },
    },
  });

  const students = rows.slice(0, PAGE_SIZE);
  return (
    <div>
      <header className="mb-12">
        <h1 className="font-serif text-4xl text-[var(--color-brand-charcoal)] tracking-wide">
          Alunos
        </h1>
        <p className="text-[var(--color-brand-charcoal)]/60 mt-2 text-sm uppercase tracking-widest">
          Gestão de usuários · até {PAGE_SIZE} por página
        </p>
      </header>

      <div className="bg-white border border-black/5 rounded-lg overflow-x-auto">
        {students.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[var(--color-brand-charcoal)]/40 text-sm uppercase tracking-widest">
              Nenhum aluno encontrado
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-black/5 text-[10px] uppercase tracking-widest text-[var(--color-brand-charcoal)]/60">
                <th className="text-left px-6 py-4 font-medium">ID Público</th>
                <th className="text-left px-6 py-4 font-medium">Nome / E-mail</th>
                <th className="text-center px-6 py-4 font-medium">Acessos Ativos</th>
                <th className="text-left px-6 py-4 font-medium">Data de Cadastro</th>
                <th className="text-right px-6 py-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr
                  key={student.id}
                  className="border-b border-black/5 last:border-b-0 hover:bg-black/[0.015] transition-colors"
                >
                  <td className="px-6 py-4 font-mono text-xs text-[var(--color-brand-charcoal)]/80">
                    {student.publicId}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center text-[var(--color-brand-charcoal)]/40">
                        <UserCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-[var(--color-brand-charcoal)]">
                          {student.name || "Sem nome"}
                        </div>
                        <div className="text-xs text-[var(--color-brand-charcoal)]/50">
                          {student.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {student._count.entitlements > 0 ? (
                      <span className="text-[10px] uppercase tracking-widest px-2 py-1 bg-[var(--color-brand-sage)]/10 text-[var(--color-brand-sage)] rounded-sm">
                        {student._count.entitlements}
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-widest px-2 py-1 bg-black/5 text-[var(--color-brand-charcoal)]/50 rounded-sm">
                        Nenhuma
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-[var(--color-brand-charcoal)]/60">
                    {student.createdAt.toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/alunos/${student.id}`}
                      className="text-[10px] uppercase tracking-widest text-[var(--color-brand-sage)] hover:text-[var(--color-brand-charcoal)] transition-colors border border-[var(--color-brand-sage)]/20 px-3 py-1.5 rounded-sm hover:border-[var(--color-brand-charcoal)]/20"
                    >
                      Gerenciar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Pagination page={page} hasMore={rows.length > PAGE_SIZE} href="/alunos" />
    </div>
  );
}
