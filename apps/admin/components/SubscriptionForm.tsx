"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  createSubscriptionAction,
  type SubscriptionFormState,
} from "../actions/subscriptions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-[var(--color-brand-sage)] text-white px-4 py-2 text-[10px] uppercase tracking-widest rounded-sm hover:bg-[var(--color-brand-charcoal)] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {pending ? "Adicionando..." : "Adicionar Assinatura"}
    </button>
  );
}

export function SubscriptionForm({ userId }: { userId: string }) {
  const boundAction = createSubscriptionAction.bind(null, userId);
  const [state, formAction] = useActionState<SubscriptionFormState, FormData>(
    boundAction,
    undefined,
  );

  const errors = state?.errors;
  const showSuccess =
    state && state.errors && Object.keys(state.errors).length === 0;

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-4 p-6 bg-black/5 rounded-lg border border-black/10"
    >
      <div className="flex-1 min-w-[180px] flex flex-col gap-2">
        <label className="text-[10px] uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium">
          Plano
        </label>
        <select
          name="planType"
          required
          className="w-full bg-transparent border-b border-black/20 px-0 py-2 text-sm text-[var(--color-brand-charcoal)] focus:outline-none focus:border-[var(--color-brand-sage)] transition-colors"
        >
          <option value="">Selecione o plano...</option>
          <option value="BASIC">Básico</option>
          <option value="INTERMEDIATE">Intermediário</option>
          <option value="PREMIUM">Premium</option>
        </select>
        {errors?.planType && (
          <span className="text-red-500 text-[10px] font-medium">
            {errors.planType}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-[180px] flex flex-col gap-2">
        <label className="text-[10px] uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium">
          Expira em (opcional)
        </label>
        <input
          type="date"
          name="expiresAt"
          className="w-full bg-transparent border-b border-black/20 px-0 py-2 text-sm text-[var(--color-brand-charcoal)] focus:outline-none focus:border-[var(--color-brand-sage)] transition-colors"
        />
        {errors?.expiresAt && (
          <span className="text-red-500 text-[10px] font-medium">
            {errors.expiresAt}
          </span>
        )}
      </div>

      <SubmitButton />

      {errors?.form && (
        <p className="w-full text-red-500 text-xs font-medium">{errors.form}</p>
      )}
      {showSuccess && (
        <p className="w-full text-[var(--color-brand-sage)] text-xs font-medium">
          Assinatura criada.
        </p>
      )}
    </form>
  );
}
