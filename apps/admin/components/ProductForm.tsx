"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { slugify } from "../lib/slug";
import { centsToReaisInput } from "../lib/money";
import type { ProductFormState } from "../actions/products";

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
  action: (state: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  defaultValues?: {
    name?: string;
    slug?: string;
    tagline?: string | null;
    description?: string | null;
    priceCents?: number;
    accessMonths?: number;
    grantsAll?: boolean;
    certificateType?: string | null;
    includesMentoring?: boolean;
    maxSeats?: number | null;
    highlight?: boolean;
    isActive?: boolean;
    order?: number;
    stripePriceId?: string | null;
  };
  submitLabel: string;
  successMessage?: string;
};

const labelCls =
  "text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium";
const inputCls =
  "w-full bg-white border border-black/10 rounded-sm px-4 py-3 text-[var(--color-brand-charcoal)] focus:outline-none focus:border-[var(--color-brand-sage)] transition-colors";
const errCls = "text-red-500 text-[10px] font-medium";

export function ProductForm({ action, defaultValues, submitLabel, successMessage }: Props) {
  const [state, formAction] = useActionState<ProductFormState, FormData>(action, undefined);
  const errors = state?.errors;
  const showSuccess =
    successMessage && state && state.errors && Object.keys(state.errors).length === 0;

  const [slugTouched, setSlugTouched] = useState((defaultValues?.slug ?? "").length > 0);
  const [slug, setSlug] = useState(defaultValues?.slug ?? "");
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [grantsAll, setGrantsAll] = useState(defaultValues?.grantsAll ?? false);

  return (
    <form action={formAction} className="flex flex-col gap-6 max-w-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label className={labelCls}>Nome</label>
          <input
            type="text"
            name="name"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            className={inputCls}
            placeholder="Ex.: Formação de Personal Organizer"
          />
          {errors?.name && <span className={errCls}>{errors.name}</span>}
        </div>
        <div className="flex flex-col gap-2">
          <label className={labelCls}>Slug</label>
          <input
            type="text"
            name="slug"
            required
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugTouched(true);
            }}
            className={`${inputCls} font-mono text-sm`}
            placeholder="formacao-po"
          />
          {errors?.slug && <span className={errCls}>{errors.slug}</span>}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelCls}>Tagline</label>
        <input
          type="text"
          name="tagline"
          defaultValue={defaultValues?.tagline ?? ""}
          className={inputCls}
          placeholder="Frase curta de apoio"
        />
        {errors?.tagline && <span className={errCls}>{errors.tagline}</span>}
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelCls}>Descrição</label>
        <textarea
          name="description"
          rows={4}
          defaultValue={defaultValues?.description ?? ""}
          className={`${inputCls} resize-y`}
          placeholder="O que este curso entrega."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex flex-col gap-2">
          <label className={labelCls}>Preço (R$)</label>
          <input
            type="text"
            inputMode="decimal"
            name="priceCents"
            required
            defaultValue={centsToReaisInput(defaultValues?.priceCents)}
            className={`${inputCls} font-mono`}
            placeholder="2000,00"
          />
          <span className="text-[10px] text-[var(--color-brand-charcoal)]/50">
            Em reais. Ex.: 2000 ou 2.000,00
          </span>
          {errors?.priceCents && <span className={errCls}>{errors.priceCents}</span>}
        </div>
        <div className="flex flex-col gap-2">
          <label className={labelCls}>Meses de acesso</label>
          <input
            type="number"
            name="accessMonths"
            required
            min={1}
            defaultValue={defaultValues?.accessMonths ?? 12}
            className={`${inputCls} font-mono`}
          />
          {errors?.accessMonths && <span className={errCls}>{errors.accessMonths}</span>}
        </div>
        <div className="flex flex-col gap-2">
          <label className={labelCls}>Ordem</label>
          <input
            type="number"
            name="order"
            required
            min={0}
            defaultValue={defaultValues?.order ?? 0}
            className={`${inputCls} font-mono`}
          />
          {errors?.order && <span className={errCls}>{errors.order}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label className={labelCls}>Certificado</label>
          <select
            name="certificateType"
            defaultValue={defaultValues?.certificateType ?? ""}
            className={inputCls}
          >
            <option value="">— não emite —</option>
            <option value="DECLARATION">Declaração de horas</option>
            <option value="PROFESSIONAL">Certificado profissional</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className={labelCls}>Vagas (Founder)</label>
          <input
            type="number"
            name="maxSeats"
            min={0}
            defaultValue={defaultValues?.maxSeats ?? ""}
            className={`${inputCls} font-mono`}
            placeholder="Vazio = ilimitado"
          />
          {errors?.maxSeats && <span className={errCls}>{errors.maxSeats}</span>}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelCls}>Stripe Price ID</label>
        <input
          type="text"
          name="stripePriceId"
          defaultValue={defaultValues?.stripePriceId ?? ""}
          className={`${inputCls} font-mono text-sm`}
          placeholder="price_1AbC..."
        />
        <span className="text-[10px] text-[var(--color-brand-charcoal)]/50">
          Preço de pagamento único no Stripe. Sem isso, o botão de compra fica desabilitado.
        </span>
        {errors?.stripePriceId && <span className={errCls}>{errors.stripePriceId}</span>}
      </div>

      <div className="flex flex-col gap-3 border-t border-black/10 pt-5">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="grantsAll"
            checked={grantsAll}
            onChange={(e) => setGrantsAll(e.target.checked)}
            className="mt-0.5 accent-[var(--color-brand-sage)] cursor-pointer"
          />
          <span className="text-xs text-[var(--color-brand-charcoal)]/70 leading-relaxed">
            <strong>Concede acesso a tudo</strong> — Premium/Founder. Inclui conteúdo
            futuro na janela de acesso. Ignora a composição de módulos abaixo.
          </span>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="includesMentoring"
            defaultChecked={defaultValues?.includesMentoring ?? false}
            className="mt-0.5 accent-[var(--color-brand-gold)] cursor-pointer"
          />
          <span className="text-xs text-[var(--color-brand-charcoal)]/70 leading-relaxed">
            <strong>Inclui mentoria</strong> — desbloqueia a área de mentoria com a Simone.
          </span>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="highlight"
            defaultChecked={defaultValues?.highlight ?? false}
            className="mt-0.5 accent-[var(--color-brand-gold)] cursor-pointer"
          />
          <span className="text-xs text-[var(--color-brand-charcoal)]/70 leading-relaxed">
            <strong>Recomendado</strong> — destaca na página de planos. Marca aqui desmarca os outros.
          </span>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={defaultValues?.isActive ?? true}
            className="mt-0.5 accent-[var(--color-brand-sage)] cursor-pointer"
          />
          <span className="text-xs text-[var(--color-brand-charcoal)]/70 leading-relaxed">
            <strong>Ativo</strong> — quando desativado, não aparece à venda.
          </span>
        </label>
      </div>

      {errors?.form && <div className="text-red-500 text-xs font-medium">{errors.form}</div>}
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
