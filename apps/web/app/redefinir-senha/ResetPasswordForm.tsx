"use client";
import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { resetPasswordAction } from "@repo/auth/password-reset";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 w-full bg-[var(--color-brand-sage)] text-white py-4 rounded-sm text-xs uppercase tracking-widest hover:bg-[var(--color-brand-charcoal)] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {pending ? "Salvando..." : "Salvar nova senha"}
    </button>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(resetPasswordAction, undefined);
  const done = state && "ok" in state && state.ok;

  if (done) {
    return (
      <div className="text-center">
        <p className="text-sm text-[var(--color-brand-charcoal)]/80 leading-relaxed">
          Senha alterada com sucesso. Já pode entrar com a nova senha.
        </p>
        <Link
          href="/login"
          className="inline-block mt-8 w-full bg-[var(--color-brand-sage)] text-white py-4 rounded-sm text-xs uppercase tracking-widest hover:bg-[var(--color-brand-charcoal)] transition-all"
        >
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="text-sm text-[var(--color-brand-charcoal)]/70 leading-relaxed mb-6 text-center">
        Crie uma nova senha para sua conta. Mínimo de 10 caracteres, com ao
        menos 1 letra e 1 número.
      </p>
      <form action={formAction} className="flex flex-col gap-6">
        <input type="hidden" name="token" value={token} />

        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium">
            Nova senha
          </label>
          <input
            type="password"
            name="password"
            required
            minLength={10}
            className="w-full bg-transparent border-b border-black/10 px-0 py-2 text-[var(--color-brand-charcoal)] focus:outline-none focus:border-[var(--color-brand-sage)] transition-colors"
            placeholder="••••••••"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium">
            Confirmar senha
          </label>
          <input
            type="password"
            name="confirm"
            required
            minLength={10}
            className="w-full bg-transparent border-b border-black/10 px-0 py-2 text-[var(--color-brand-charcoal)] focus:outline-none focus:border-[var(--color-brand-sage)] transition-colors"
            placeholder="••••••••"
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
  );
}
