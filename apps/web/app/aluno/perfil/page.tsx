import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { prisma } from "@repo/database";
import { auth } from "@repo/auth";
import { AccountDangerZone } from "../../../components/AccountDangerZone";
import { AvatarUploader } from "../../../components/AvatarUploader";
import { getAvatarSignedUrl } from "../../../lib/avatar";

export default async function PerfilPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findFirst({
    where: { id: session.user.id, deletedAt: null },
    select: {
      publicId: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      acceptedTermsAt: true,
      avatarPath: true,
      _count: {
        select: {
          purchases: true,
          progress: true,
          supportTickets: { where: { deletedAt: null } },
        },
      },
    },
  });

  if (!user) redirect("/login");

  const avatarUrl = await getAvatarSignedUrl(user.avatarPath);

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <Link
        href="/aluno"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/50 hover:text-[var(--color-brand-sage)] transition-colors mb-10"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Voltar
      </Link>

      <header className="mb-12">
        <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-brand-charcoal)]/60 mb-2">
          Perfil
        </p>
        <h1 className="font-serif text-4xl md:text-5xl text-[var(--color-brand-charcoal)] tracking-tight">
          Sua conta
        </h1>
      </header>

      <section className="mb-12">
        <h2 className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium mb-4">
          Foto de perfil
        </h2>
        <AvatarUploader initialUrl={avatarUrl} />
      </section>

      <section className="mb-12">
        <h2 className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium mb-4">
          Dados Cadastrais
        </h2>
        <div className="bg-white border border-black/5 rounded-lg p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field label="ID Público" value={user.publicId} mono />
          <Field label="Nome" value={user.name ?? "—"} />
          <Field label="E-mail" value={user.email} mono />
          <Field
            label="Cadastrado em"
            value={user.createdAt.toLocaleDateString("pt-BR")}
          />
          <Field
            label="Termos aceitos em"
            value={
              user.acceptedTermsAt
                ? user.acceptedTermsAt.toLocaleDateString("pt-BR")
                : "—"
            }
          />
          <Field label="Perfil" value={user.role} mono />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[10px] uppercase tracking-widest text-[var(--color-brand-charcoal)]/50">
          <span>{user._count.purchases} compra(s) no histórico</span>
          <span>{user._count.progress} aula(s) com progresso</span>
          <span>{user._count.supportTickets} chamado(s) abertos</span>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium mb-4">
          Seus direitos (LGPD)
        </h2>
        <div className="bg-white border border-black/5 rounded-lg p-6 md:p-8">
          <p className="text-sm text-[var(--color-brand-charcoal)]/70 leading-relaxed mb-6">
            Você tem direito de acessar, exportar e excluir os dados pessoais
            que mantemos sobre você. Para ler na íntegra como tratamos seus
            dados, consulte nossa{" "}
            <Link
              href="/privacidade"
              className="text-[var(--color-brand-sage)] underline hover:text-[var(--color-brand-charcoal)]"
            >
              Política de Privacidade
            </Link>
            .
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="/api/aluno/exportar-dados"
              className="group flex items-center gap-4 px-5 py-4 border border-black/10 rounded-sm hover:border-[var(--color-brand-sage)] hover:bg-[var(--color-brand-sage)]/5 transition-colors"
            >
              <div className="w-10 h-10 rounded-sm bg-[var(--color-brand-sage)]/10 flex items-center justify-center text-[var(--color-brand-sage)]">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/80 font-medium group-hover:text-[var(--color-brand-sage)]">
                  Exportar meus dados
                </div>
                <div className="text-[10px] text-[var(--color-brand-charcoal)]/50 mt-0.5">
                  Download de um JSON com tudo
                </div>
              </div>
            </a>
            <Link
              href="/privacidade"
              className="group flex items-center gap-4 px-5 py-4 border border-black/10 rounded-sm hover:border-[var(--color-brand-charcoal)]/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-sm bg-black/5 flex items-center justify-center text-[var(--color-brand-charcoal)]/60">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/80 font-medium">
                  Política de Privacidade
                </div>
                <div className="text-[10px] text-[var(--color-brand-charcoal)]/50 mt-0.5">
                  Como tratamos seus dados
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-widest text-red-600 font-medium mb-4">
          Zona de risco
        </h2>
        <AccountDangerZone />
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-[var(--color-brand-charcoal)]/50 mb-1">
        {label}
      </div>
      <div
        className={
          mono
            ? "text-sm font-mono text-[var(--color-brand-charcoal)] truncate"
            : "text-sm text-[var(--color-brand-charcoal)] truncate"
        }
      >
        {value}
      </div>
    </div>
  );
}
