"use client";

import { useActionState, useRef, useEffect } from "react";
import { useFormStatus } from "react-dom";
import {
  adminReplyTicketAction,
  type AdminReplyFormState,
} from "../actions/tickets";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-6 py-3 bg-[var(--color-brand-sage)] text-white text-xs uppercase tracking-widest rounded-sm hover:bg-[var(--color-brand-charcoal)] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {pending ? "Enviando..." : "Enviar Resposta"}
    </button>
  );
}

export function TicketReplyForm({ ticketId }: { ticketId: string }) {
  const boundAction = adminReplyTicketAction.bind(null, ticketId);
  const [state, formAction] = useActionState<AdminReplyFormState, FormData>(
    boundAction,
    undefined,
  );
  const errors = state?.errors;
  const formRef = useRef<HTMLFormElement>(null);

  const hadSuccess =
    state && state.errors && Object.keys(state.errors).length === 0;

  useEffect(() => {
    if (hadSuccess) formRef.current?.reset();
  }, [hadSuccess]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-3 p-6 bg-white rounded-lg border border-black/5"
    >
      <label className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium">
        Mensagem
      </label>
      <textarea
        name="body"
        rows={5}
        required
        className="w-full bg-transparent border border-black/10 rounded-sm px-4 py-3 text-[var(--color-brand-charcoal)] focus:outline-none focus:border-[var(--color-brand-sage)] transition-colors resize-y"
        placeholder="Escreva a resposta..."
      />
      {errors?.body && (
        <span className="text-red-500 text-[10px] font-medium">
          {errors.body}
        </span>
      )}

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          name="isInternal"
          className="mt-0.5 accent-[var(--color-brand-gold)] cursor-pointer"
        />
        <span className="text-xs text-[var(--color-brand-charcoal)]/70 leading-relaxed">
          <strong>Nota interna</strong> — só visível para a equipe, não enviada ao aluno.
        </span>
      </label>

      {errors?.form && (
        <span className="text-red-500 text-xs font-medium">{errors.form}</span>
      )}

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
