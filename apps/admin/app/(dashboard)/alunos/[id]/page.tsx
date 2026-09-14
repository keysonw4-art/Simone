import { requireAdminPage } from "@/lib/requireAdmin";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, UserCircle } from "lucide-react";
import { prisma } from "@repo/database";
import { auth } from "@repo/auth";
import { UserRoleControl } from "../../../../components/UserRoleControl";
import { UserBlockControl } from "../../../../components/UserBlockControl";
import {
  grantAccessAction,
  revokeAccessAction,
} from "../../../../actions/grants";

export default async function AlunoDetalhesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage();
  const { id } = await params;
  const session = await auth();
  const currentAdminId = session?.user?.id;
  const currentAdminRole = session?.user?.role;

  const student = await prisma.user.findUnique({
    where: { id, deletedAt: null },
  });

  if (!student) notFound();

  const [products, avulsoModules, purchases] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { order: "asc" },
      select: { id: true, name: true },
    }),
    prisma.course.findMany({
      where: { soldStandalone: true, isArchived: false, deletedAt: null },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    prisma.purchase.findMany({
      where: { userId: student.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        amountCents: true,
        expiresAt: true,
        createdAt: true,
        product: { select: { name: true } },
        course: { select: { title: true } },
        entitlements: { select: { scope: true, expiresAt: true } },
      },
    }),
  ]);

  const now = new Date();

  return (
    <div>
      <Link
        href="/alunos"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/60 hover:text-[var(--color-brand-sage)] mb-6 transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" /> Voltar para Alunos
      </Link>

      <header className="mb-10 flex items-center gap-6">
        <div className="w-16 h-16 rounded-full bg-black/5 flex items-center justify-center text-[var(--color-brand-charcoal)]/40 border border-black/10">
          <UserCircle className="w-8 h-8" />
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-4xl text-[var(--color-brand-charcoal)] tracking-wide">
              {student.name || "Aluno sem nome"}
            </h1>
            {student.blockedAt && (
              <span className="text-[10px] uppercase tracking-widest px-2 py-1 bg-red-500/10 text-red-600 rounded-sm">
                Bloqueado
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm uppercase tracking-widest text-[var(--color-brand-charcoal)]/60">
            <span className="font-mono text-xs">{student.publicId}</span>
            <span>•</span>
            <span>{student.email}</span>
            <span>•</span>
            <span>Cadastrado em {student.createdAt.toLocaleDateString("pt-BR")}</span>
          </div>
        </div>
      </header>

      <section className="mb-12">
        <h2 className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium mb-6">
          Gestão da Conta
        </h2>
        <div className="bg-white border border-black/5 rounded-lg p-6 flex items-end justify-between gap-6 flex-wrap">
          <UserRoleControl
            targetUserId={student.id}
            currentRole={student.role}
            canAssignAdmin={currentAdminRole === "SUPER_ADMIN"}
          />
          <UserBlockControl
            targetUserId={student.id}
            isBlocked={!!student.blockedAt}
            disabled={
              student.role === "SUPER_ADMIN" || student.id === currentAdminId
            }
          />
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium mb-6">
          Conceder Acesso
        </h2>
        <form
          action={grantAccessAction.bind(null, student.id)}
          className="bg-white border border-black/5 rounded-lg p-6 flex items-end gap-4 flex-wrap"
        >
          <div className="flex flex-col gap-2 flex-1 min-w-[260px]">
            <label className="text-[10px] uppercase tracking-widest text-[var(--color-brand-charcoal)]/60 font-medium">
              Curso ou módulo avulso
            </label>
            <select
              name="target"
              required
              className="w-full bg-white border border-black/10 rounded-sm px-4 py-3 text-sm text-[var(--color-brand-charcoal)] focus:outline-none focus:border-[var(--color-brand-sage)]"
            >
              <option value="">Selecione…</option>
              {products.length > 0 && (
                <optgroup label="Cursos (produtos)">
                  {products.map((p) => (
                    <option key={p.id} value={`product:${p.id}`}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {avulsoModules.length > 0 && (
                <optgroup label="Módulos avulsos">
                  {avulsoModules.map((m) => (
                    <option key={m.id} value={`course:${m.id}`}>
                      {m.title}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-[var(--color-brand-sage)] text-white text-[10px] uppercase tracking-widest rounded-sm hover:bg-[var(--color-brand-charcoal)] transition-colors"
          >
            Conceder acesso
          </button>
        </form>
        <p className="text-[10px] text-[var(--color-brand-charcoal)]/50 mt-2">
          Cria uma compra de valor R$ 0 e libera o acesso pelo prazo do produto
          (12 meses para avulso). Use para founders e cortesias.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium mb-6">
          Acessos
        </h2>
        <div className="bg-white border border-black/5 rounded-lg overflow-x-auto">
          {purchases.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-[var(--color-brand-charcoal)]/40 text-sm uppercase tracking-widest">
                Nenhum acesso registrado.
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b border-black/5 text-[10px] uppercase tracking-widest text-[var(--color-brand-charcoal)]/60">
                  <th className="text-left px-6 py-4 font-medium">Item</th>
                  <th className="text-left px-6 py-4 font-medium">Valor</th>
                  <th className="text-left px-6 py-4 font-medium">Status</th>
                  <th className="text-left px-6 py-4 font-medium">Expira em</th>
                  <th className="text-right px-6 py-4 font-medium">Ação</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((pur) => {
                  const active =
                    !!pur.expiresAt &&
                    pur.expiresAt > now &&
                    pur.entitlements.some((e) => e.expiresAt > now);
                  const label =
                    pur.product?.name ??
                    pur.course?.title ??
                    "(acesso)";
                  return (
                    <tr
                      key={pur.id}
                      className="border-b border-black/5 last:border-b-0"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-[var(--color-brand-charcoal)]">
                        {label}
                      </td>
                      <td className="px-6 py-4 text-xs text-[var(--color-brand-charcoal)]/60">
                        {pur.amountCents === 0
                          ? "Cortesia"
                          : `R$ ${(pur.amountCents / 100).toFixed(2)}`}
                      </td>
                      <td className="px-6 py-4">
                        {active ? (
                          <span className="text-[10px] uppercase tracking-widest px-2 py-1 bg-[var(--color-brand-sage)]/10 text-[var(--color-brand-sage)] rounded-sm">
                            Ativo
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase tracking-widest px-2 py-1 bg-black/5 text-[var(--color-brand-charcoal)]/50 rounded-sm">
                            Expirado
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-[var(--color-brand-charcoal)]/60">
                        {pur.expiresAt
                          ? pur.expiresAt.toLocaleDateString("pt-BR")
                          : "—"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {active && (
                          <form
                            action={revokeAccessAction.bind(null, pur.id, student.id)}
                          >
                            <button
                              type="submit"
                              className="text-[10px] uppercase tracking-widest text-red-500 hover:text-red-700 transition-colors"
                            >
                              Revogar
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
