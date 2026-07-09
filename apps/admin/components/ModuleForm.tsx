"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ModuleFormState } from "../actions/modules";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-8 py-3 bg-[var(--color-brand-sage)] text-white text-xs uppercase tracking-widest rounded-sm hover:bg-[var(--color-brand-charcoal)] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {pending ? "Salvando..." : label}
    </button>
  );
}

type Props = {
  action: (
    state: ModuleFormState,
    formData: FormData,
  ) => Promise<ModuleFormState>;
  defaultValues?: { title?: string; description?: string | null };
  submitLabel: string;
  successMessage?: string;
};

export function ModuleForm({
  action,
  defaultValues,
  submitLabel,
  successMessage,
}: Props) {
  const [state, formAction] = useActionState<ModuleFormState, FormData>(
    action,
    undefined,
  );
  const errors = state?.errors;
  const showSuccess =
    successMessage &&
    state &&
    state.errors &&
    Object.keys(state.errors).length === 0;

  return (
    <form action={formAction} className="flex flex-col gap-6 max-w-2xl">
      <div className="flex flex-col gap-2">
        <label className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium">
          Título
        </label>
        <input
          type="text"
          name="title"
          required
          defaultValue={defaultValues?.title ?? ""}
          className="w-full bg-white border border-black/10 rounded-sm px-4 py-3 text-[var(--color-brand-charcoal)] focus:outline-none focus:border-[var(--color-brand-sage)] transition-colors"
          placeholder="Ex.: Introdução"
        />
        {errors?.title && (
          <span className="text-red-500 text-[10px] font-medium">
            {errors.title}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium">
          Descrição
        </label>
        <textarea
          name="description"
          rows={4}
          defaultValue={defaultValues?.description ?? ""}
          className="w-full bg-white border border-black/10 rounded-sm px-4 py-3 text-[var(--color-brand-charcoal)] focus:outline-none focus:border-[var(--color-brand-sage)] transition-colors resize-y"
          placeholder="Resumo do módulo (opcional)"
        />
        {errors?.description && (
          <span className="text-red-500 text-[10px] font-medium">
            {errors.description}
          </span>
        )}
      </div>

      {errors?.form && (
        <div className="text-red-500 text-xs font-medium">{errors.form}</div>
      )}
      {showSuccess && (
        <div className="text-[var(--color-brand-sage)] text-xs font-medium">
          {successMessage}
        </div>
      )}

      <div className="pt-2">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
