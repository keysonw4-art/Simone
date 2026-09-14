"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import {
  deleteAccountAction,
  type DeleteAccountState,
} from "../actions/profile";

const CONFIRMATION_WORD = "EXCLUIR";

function SubmitButton({ enabled }: { enabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={!enabled || pending}
      className="px-6 py-3 bg-red-600 text-white text-xs uppercase tracking-widest rounded-sm hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {pending ? "Excluindo..." : "Excluir Conta Permanentemente"}
    </button>
  );
}

export function AccountDangerZone() {
  const [state, formAction] = useActionState<DeleteAccountState, FormData>(
    deleteAccountAction,
    undefined,
  );
  const [typed, setTyped] = useState("");
  const matches = typed.trim() === CONFIRMATION_WORD;

  return (
    <div className="bg-white border border-red-200 rounded-lg p-6 md:p-8">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h3 className="font-serif text-xl text-[var(--color-brand-charcoal)] mb-2">
            Excluir minha conta
          </h3>
          <ul className="text-sm text-[var(--color-brand-charcoal)]/70 leading-relaxed space-y-1 list-disc list-inside">
            <li>Seu e-mail e nome são anonimizados.</li>
            <li>Todas as suas assinaturas ativas são canceladas.</li>
            <li>Você perde acesso imediato ao conteúdo.</li>
            <li>O registro de progresso é mantido sem dados pessoais.</li>
            <li>A ação é registrada para fins de auditoria.</li>
          </ul>
          <p className="text-xs text-[var(--color-brand-charcoal)]/50 mt-3 italic">
            Você pode criar uma nova conta com o mesmo e-mail depois.
          </p>
        </div>
      </div>

      <form action={formAction} className="flex flex-col gap-3">
        <label className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium">
          Digite <strong className="font-mono">{CONFIRMATION_WORD}</strong> para confirmar
        </label>
        <label className="text-xs">Confirme sua senha atual
          <input type="password" name="password" autoComplete="current-password" required className="block border border-black/10 rounded-sm px-3 py-2 mt-2 mb-4" />
        </label>
        <input
          type="text"
          name="confirmation"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          className="w-full max-w-xs bg-transparent border border-black/10 rounded-sm px-4 py-2.5 text-[var(--color-brand-charcoal)] focus:outline-none focus:border-red-500 transition-colors font-mono"
        />
        {state?.error && (
          <span className="text-red-500 text-xs font-medium">{state.error}</span>
        )}
        <div className="pt-2">
          <SubmitButton enabled={matches} />
        </div>
      </form>
    </div>
  );
}
