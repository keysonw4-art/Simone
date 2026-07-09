"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  createTicketAction,
  type NewTicketFormState,
} from "../actions/support";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-8 py-4 bg-[var(--color-brand-sage)] text-white text-xs uppercase tracking-widest rounded-sm hover:bg-[var(--color-brand-charcoal)] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {pending ? "Abrindo chamado..." : "Abrir Chamado"}
    </button>
  );
}

export function SupportTicketForm() {
  const [state, formAction] = useActionState<NewTicketFormState, FormData>(
    createTicketAction,
    undefined,
  );
  const errors = state?.errors;
  const values = state?.values;

  return (
    <form action={formAction} className="flex flex-col gap-6 max-w-2xl">
      <div className="flex flex-col gap-2">
        <label className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium">
          Assunto
        </label>
        <input
          type="text"
          name="subject"
          required
          defaultValue={values?.subject ?? ""}
          className="w-full bg-white border border-black/10 rounded-sm px-4 py-3 text-[var(--color-brand-charcoal)] focus:outline-none focus:border-[var(--color-brand-sage)] transition-colors"
          placeholder="Resumo curto da sua dúvida"
        />
        {errors?.subject && (
          <span className="text-red-500 text-[10px] font-medium">
            {errors.subject}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium">
          Mensagem
        </label>
        <textarea
          name="body"
          rows={8}
          required
          defaultValue={values?.body ?? ""}
          className="w-full bg-white border border-black/10 rounded-sm px-4 py-3 text-[var(--color-brand-charcoal)] focus:outline-none focus:border-[var(--color-brand-sage)] transition-colors resize-y"
          placeholder="Descreva sua dúvida ou problema em detalhes."
        />
        {errors?.body && (
          <span className="text-red-500 text-[10px] font-medium">
            {errors.body}
          </span>
        )}
      </div>

      {errors?.form && (
        <div className="text-red-500 text-xs font-medium">{errors.form}</div>
      )}

      <div className="pt-2">
        <SubmitButton />
      </div>
    </form>
  );
}
