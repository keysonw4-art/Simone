import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, UserCircle } from "lucide-react";
import { prisma } from "@repo/database";
import { auth } from "@repo/auth";
import { SubscriptionForm } from "../../../../components/SubscriptionForm";
import { ToggleSubscriptionButton } from "../../../../components/ToggleSubscriptionButton";
import { UserRoleControl } from "../../../../components/UserRoleControl";
import { UserBlockControl } from "../../../../components/UserBlockControl";

export default async function AlunoDetalhesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const currentAdminId = session?.user?.id;
  const currentAdminRole = session?.user?.role;

  const student = await prisma.user.findUnique({
    where: { id, deletedAt: null },
    include: {
      subscriptions: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!student) notFound();

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
          Conceder Assinatura
        </h2>
        <SubscriptionForm userId={student.id} />
      </section>

      <section>
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium">
            Histórico de Assinaturas
          </h2>
        </div>

        <div className="bg-white border border-black/5 rounded-lg overflow-hidden">
          {student.subscriptions.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-[var(--color-brand-charcoal)]/40 text-sm uppercase tracking-widest">
                Este aluno não possui assinaturas.
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-black/5 text-[10px] uppercase tracking-widest text-[var(--color-brand-charcoal)]/60">
                  <th className="text-left px-6 py-4 font-medium">Plano</th>
                  <th className="text-left px-6 py-4 font-medium">Status</th>
                  <th className="text-left px-6 py-4 font-medium">Data de Criação</th>
                  <th className="text-left px-6 py-4 font-medium">Expira em</th>
                  <th className="text-right px-6 py-4 font-medium">Ação</th>
                </tr>
              </thead>
              <tbody>
                {student.subscriptions.map((sub) => (
                  <tr
                    key={sub.id}
                    className="border-b border-black/5 last:border-b-0 hover:bg-black/[0.015] transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-[var(--color-brand-charcoal)]">
                      {sub.planType}
                    </td>
                    <td className="px-6 py-4">
                      {sub.isActive ? (
                        <span className="text-[10px] uppercase tracking-widest px-2 py-1 bg-[var(--color-brand-sage)]/10 text-[var(--color-brand-sage)] rounded-sm">
                          Ativa
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase tracking-widest px-2 py-1 bg-red-500/10 text-red-600 rounded-sm">
                          Inativa
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-[var(--color-brand-charcoal)]/60">
                      {sub.createdAt.toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-6 py-4 text-xs text-[var(--color-brand-charcoal)]/60">
                      {sub.expiresAt
                        ? sub.expiresAt.toLocaleDateString("pt-BR")
                        : "Vitalício"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ToggleSubscriptionButton
                        subscriptionId={sub.id}
                        isActive={sub.isActive}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
