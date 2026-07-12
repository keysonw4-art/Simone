"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { LessonFormState } from "../actions/lessons";

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
    state: LessonFormState,
    formData: FormData,
  ) => Promise<LessonFormState>;
  defaultValues?: {
    title?: string;
    description?: string | null;
    vimeoVideoId?: string | null;
    isProtected?: boolean;
  };
  submitLabel: string;
  successMessage?: string;
};

export function LessonForm({
  action,
  defaultValues,
  submitLabel,
  successMessage,
}: Props) {
  const [state, formAction] = useActionState<LessonFormState, FormData>(
    action,
    undefined,
  );
  const errors = state?.errors;
  const showSuccess =
    successMessage &&
    state &&
    state.errors &&
    Object.keys(state.errors).length === 0;
  const protectedDefault = defaultValues?.isProtected ?? true;

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
          placeholder="Ex.: Como começar"
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
          placeholder="Resumo da aula (opcional)"
        />
        {errors?.description && (
          <span className="text-red-500 text-[10px] font-medium">
            {errors.description}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium">
          Vimeo Video ID
        </label>
        <input
          type="text"
          name="vimeoVideoId"
          inputMode="numeric"
          pattern="\d+"
          defaultValue={defaultValues?.vimeoVideoId ?? ""}
          className="w-full bg-white border border-black/10 rounded-sm px-4 py-3 text-[var(--color-brand-charcoal)] focus:outline-none focus:border-[var(--color-brand-sage)] transition-colors font-mono"
          placeholder="824804225"
        />
        <span className="text-[10px] text-[var(--color-brand-charcoal)]/50 leading-relaxed">
          Apenas o número do vídeo, sem <code>https://vimeo.com/</code>. Você
          encontra na URL do seu vídeo: <code>vimeo.com/<strong>824804225</strong></code>.
        </span>
        {errors?.vimeoVideoId && (
          <span className="text-red-500 text-[10px] font-medium">
            {errors.vimeoVideoId}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1 pt-2">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="isProtected"
            defaultChecked={protectedDefault}
            className="mt-0.5 accent-[var(--color-brand-sage)] cursor-pointer"
          />
          <span className="text-xs text-[var(--color-brand-charcoal)]/70 leading-relaxed">
            Aula protegida — só alunos com assinatura ativa visualizam.
          </span>
        </label>
        {errors?.isProtected && (
          <span className="text-red-500 text-[10px] font-medium">
            {errors.isProtected}
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
