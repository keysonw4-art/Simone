"use client";
import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft } from "lucide-react";
import { useFormStatus } from "react-dom";
import { requestPasswordResetAction } from "@repo/auth/password-reset";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 w-full bg-[var(--color-brand-sage)] text-white py-4 rounded-sm text-xs uppercase tracking-widest hover:bg-[var(--color-brand-charcoal)] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {pending ? "Enviando..." : "Enviar link de redefinição"}
    </button>
  );
}

export default function EsqueciSenhaPage() {
  const [state, formAction] = useActionState(requestPasswordResetAction, undefined);
  const sent = state && "ok" in state && state.ok;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-brand-offwhite)] relative overflow-hidden font-sans px-6">
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[var(--color-brand-sage)]/5 rounded-full blur-[120px] pointer-events-none -translate-y-1/4 translate-x-1/4"></div>

      <Link
        href="/login"
        className="absolute top-6 left-6 z-20 inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/50 hover:text-[var(--color-brand-sage)] transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao login
      </Link>

      <div className="w-full max-w-md bg-white p-10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-black/5 relative z-10">
        <div className="text-center mb-8">
          <p className="font-serif text-3xl tracking-widest text-[var(--color-brand-sage)] mb-1">
            SIMONE MENDES
          </p>
          <p className="text-[9px] uppercase tracking-[0.3em] text-[var(--color-brand-charcoal)]/60">
            Recuperar acesso
          </p>
        </div>

        {sent ? (
          <div className="text-center">
            <p className="text-sm text-[var(--color-brand-charcoal)]/80 leading-relaxed">
              Se existir uma conta com esse e-mail, enviamos um link para criar
              uma nova senha. Verifique sua caixa de entrada (e o spam).
            </p>
            <p className="text-xs text-[var(--color-brand-charcoal)]/50 mt-4">
              O link vale por 1 hora.
            </p>
            <Link
              href="/login"
              className="inline-block mt-8 text-xs uppercase tracking-widest text-[var(--color-brand-sage)] hover:text-[var(--color-brand-charcoal)] transition-colors"
            >
              Voltar ao login
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-[var(--color-brand-charcoal)]/70 leading-relaxed mb-6 text-center">
              Informe o e-mail da sua conta e enviaremos um link para você criar
              uma nova senha.
            </p>
            <form action={formAction} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium">
                  E-mail
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full bg-transparent border-b border-black/10 px-0 py-2 text-[var(--color-brand-charcoal)] focus:outline-none focus:border-[var(--color-brand-sage)] transition-colors"
                  placeholder="seu@email.com"
                />
              </div>

              {state && "error" in state && (
                <div className="text-red-500 text-xs font-medium text-center">
                  {state.error}
                </div>
              )}

              <SubmitButton />
            </form>
          </>
        )}
      </div>
    </div>
  );
}
