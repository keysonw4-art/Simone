import Link from "next/link";
import { prisma } from "@repo/database";

export default async function AssinaturasPage() {
  const subscriptions = await prisma.subscription.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          publicId: true,
        },
      },
    },
  });

  return (
    <div>
      <header className="mb-12">
        <h1 className="font-serif text-4xl text-[var(--color-brand-charcoal)] tracking-wide">
          Assinaturas
        </h1>
        <p className="text-[var(--color-brand-charcoal)]/60 mt-2 text-sm uppercase tracking-widest">
          Planos e cobrança ({subscriptions.length})
        </p>
      </header>
      
      <div className="bg-white border border-black/5 rounded-lg overflow-hidden">
        {subscriptions.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[var(--color-brand-charcoal)]/40 text-sm uppercase tracking-widest">
              Nenhuma assinatura encontrada
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-black/5 text-[10px] uppercase tracking-widest text-[var(--color-brand-charcoal)]/60">
                <th className="text-left px-6 py-4 font-medium">Aluno</th>
                <th className="text-left px-6 py-4 font-medium">Plano</th>
                <th className="text-left px-6 py-4 font-medium">Status</th>
                <th className="text-left px-6 py-4 font-medium">Data</th>
                <th className="text-right px-6 py-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub) => (
                <tr
                  key={sub.id}
                  className="border-b border-black/5 last:border-b-0 hover:bg-black/[0.015] transition-colors"
                >
                  <td className="px-6 py-4">
                    <Link
                      href={`/alunos/${sub.userId}`}
                      className="text-sm font-medium text-[var(--color-brand-charcoal)] hover:text-[var(--color-brand-sage)] transition-colors block"
                    >
                      {sub.user.name || "Sem nome"}
                    </Link>
                    <span className="text-xs text-[var(--color-brand-charcoal)]/50">
                      {sub.user.email}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--color-brand-charcoal)]/80">
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
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/alunos/${sub.userId}`}
                      className="text-[10px] uppercase tracking-widest text-[var(--color-brand-sage)] hover:text-[var(--color-brand-charcoal)] transition-colors border border-[var(--color-brand-sage)]/20 px-3 py-1.5 rounded-sm hover:border-[var(--color-brand-charcoal)]/20"
                    >
                      Ver Aluno
                    </Link>
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
