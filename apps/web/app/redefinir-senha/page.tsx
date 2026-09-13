import Link from "next/link";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default async function RedefinirSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-brand-offwhite)] relative overflow-hidden font-sans px-6">
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[var(--color-brand-gold)]/5 rounded-full blur-[100px] pointer-events-none translate-y-1/4 -translate-x-1/4"></div>

      <div className="w-full max-w-md bg-white p-10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-black/5 relative z-10">
        <div className="text-center mb-8">
          <p className="font-serif text-3xl tracking-widest text-[var(--color-brand-sage)] mb-1">
            SIMONE MENDES
          </p>
          <p className="text-[9px] uppercase tracking-[0.3em] text-[var(--color-brand-charcoal)]/60">
            Nova senha
          </p>
        </div>

        {!token ? (
          <div className="text-center">
            <p className="text-sm text-[var(--color-brand-charcoal)]/80 leading-relaxed">
              Link inválido. Peça uma nova redefinição de senha.
            </p>
            <Link
              href="/esqueci-senha"
              className="inline-block mt-8 text-xs uppercase tracking-widest text-[var(--color-brand-sage)] hover:text-[var(--color-brand-charcoal)] transition-colors"
            >
              Pedir novo link
            </Link>
          </div>
        ) : (
          <ResetPasswordForm token={token} />
        )}
      </div>
    </div>
  );
}
