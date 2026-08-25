"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { PlanFormState } from "../actions/plans";

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
  action: (state: PlanFormState, formData: FormData) => Promise<PlanFormState>;
  defaultValues: {
    name: string;
    tagline: string | null;
    priceCents: number;
    benefits: string[];
    stripePriceId: string | null;
    highlight: boolean;
    isActive: boolean;
    order: number;
  };
  submitLabel: string;
  successMessage?: string;
};

export function PlanForm({
  action,
  defaultValues,
  submitLabel,
  successMessage,
}: Props) {
  const [state, formAction] = useActionState<PlanFormState, FormData>(
    action,
    undefined,
  );
  const errors = state?.errors;
  const showSuccess =
    successMessage &&
    state &&
    state.errors &&
    Object.keys(state.errors).length === 0;

  const benefitsText = defaultValues.benefits.join("\n");

  return (
    <form action={formAction} className="flex flex-col gap-6 max-w-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium">
            Nome
          </label>
          <input
            type="text"
            name="name"
            required
            defaultValue={defaultValues.name}
            className="w-full bg-white border border-black/10 rounded-sm px-4 py-3 text-[var(--color-brand-charcoal)] focus:outline-none focus:border-[var(--color-brand-sage)] transition-colors"
          />
          {errors?.name && (
            <span className="text-red-500 text-[10px] font-medium">
              {errors.name}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium">
            Tagline
          </label>
          <input
            type="text"
            name="tagline"
            defaultValue={defaultValues.tagline ?? ""}
            className="w-full bg-white border border-black/10 rounded-sm px-4 py-3 text-[var(--color-brand-charcoal)] focus:outline-none focus:border-[var(--color-brand-sage)] transition-colors"
            placeholder="Frase curta de apoio"
          />
          {errors?.tagline && (
            <span className="text-red-500 text-[10px] font-medium">
              {errors.tagline}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium">
            Preço (centavos)
          </label>
          <input
            type="number"
            name="priceCents"
            required
            min={0}
            step={1}
            defaultValue={defaultValues.priceCents}
            className="w-full bg-white border border-black/10 rounded-sm px-4 py-3 text-[var(--color-brand-charcoal)] focus:outline-none focus:border-[var(--color-brand-sage)] transition-colors font-mono"
          />
          <span className="text-[10px] text-[var(--color-brand-charcoal)]/50">
            Ex.: 4700 = R$ 47,00. Exibido formatado em /planos.
          </span>
          {errors?.priceCents && (
            <span className="text-red-500 text-[10px] font-medium">
              {errors.priceCents}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium">
            Ordem
          </label>
          <input
            type="number"
            name="order"
            required
            min={0}
            step={1}
            defaultValue={defaultValues.order}
            className="w-full bg-white border border-black/10 rounded-sm px-4 py-3 text-[var(--color-brand-charcoal)] focus:outline-none focus:border-[var(--color-brand-sage)] transition-colors font-mono w-32"
          />
          {errors?.order && (
            <span className="text-red-500 text-[10px] font-medium">
              {errors.order}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium">
          Benefícios (um por linha)
        </label>
        <textarea
          name="benefits"
          rows={7}
          required
          defaultValue={benefitsText}
          className="w-full bg-white border border-black/10 rounded-sm px-4 py-3 text-[var(--color-brand-charcoal)] focus:outline-none focus:border-[var(--color-brand-sage)] transition-colors resize-y font-mono text-sm"
        />
        {errors?.benefits && (
          <span className="text-red-500 text-[10px] font-medium">
            {errors.benefits}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-black/5 pt-6">
        <label className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium">
          Stripe Price ID
        </label>
        <input
          type="text"
          name="stripePriceId"
          defaultValue={defaultValues.stripePriceId ?? ""}
          className="w-full bg-white border border-black/10 rounded-sm px-4 py-3 text-[var(--color-brand-charcoal)] focus:outline-none focus:border-[var(--color-brand-sage)] transition-colors font-mono text-sm"
          placeholder="price_1AbC..."
        />
        <span className="text-[10px] text-[var(--color-brand-charcoal)]/50 leading-relaxed">
          ID do preço recorrente criado no painel do Stripe (Products → Add
          product → recurring/mês). Enquanto vazio, o botão &quot;Assinar&quot;
          fica desabilitado neste plano.
        </span>
        {errors?.stripePriceId && (
          <span className="text-red-500 text-[10px] font-medium">
            {errors.stripePriceId}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="highlight"
            defaultChecked={defaultValues.highlight}
            className="mt-0.5 accent-[var(--color-brand-gold)] cursor-pointer"
          />
          <span className="text-xs text-[var(--color-brand-charcoal)]/70 leading-relaxed">
            <strong>Recomendado</strong> — destaca esse plano em /planos. Marcar
            aqui desmarca automaticamente os outros.
          </span>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={defaultValues.isActive}
            className="mt-0.5 accent-[var(--color-brand-sage)] cursor-pointer"
          />
          <span className="text-xs text-[var(--color-brand-charcoal)]/70 leading-relaxed">
            <strong>Ativo</strong> — quando desativado, não aparece em /planos.
          </span>
        </label>
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
