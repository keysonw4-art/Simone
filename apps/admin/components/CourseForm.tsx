"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { slugify } from "../lib/slug";
import type { CourseFormState } from "../actions/courses";

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

type CourseFormProps = {
  action: (
    state: CourseFormState,
    formData: FormData,
  ) => Promise<CourseFormState>;
  defaultValues?: {
    title?: string;
    slug?: string;
    description?: string | null;
    thumbnail?: string | null;
  };
  submitLabel: string;
  successMessage?: string;
};

export function CourseForm({
  action,
  defaultValues,
  submitLabel,
  successMessage,
}: CourseFormProps) {
  const [state, formAction] = useActionState<CourseFormState, FormData>(
    action,
    undefined,
  );

  const initialSlug = defaultValues?.slug ?? "";
  const [slugTouched, setSlugTouched] = useState(initialSlug.length > 0);
  const [slug, setSlug] = useState(initialSlug);
  const [title, setTitle] = useState(defaultValues?.title ?? "");

  const errors = state?.errors;
  const showSuccess =
    successMessage && state && state.errors && Object.keys(state.errors).length === 0;

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  }

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
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="w-full bg-white border border-black/10 rounded-sm px-4 py-3 text-[var(--color-brand-charcoal)] focus:outline-none focus:border-[var(--color-brand-sage)] transition-colors"
          placeholder="Ex.: Organize sua Vida em 30 dias"
        />
        {errors?.title && (
          <span className="text-red-500 text-[10px] font-medium">
            {errors.title}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium">
          Slug
        </label>
        <input
          type="text"
          name="slug"
          required
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugTouched(true);
          }}
          className="w-full bg-white border border-black/10 rounded-sm px-4 py-3 text-[var(--color-brand-charcoal)] focus:outline-none focus:border-[var(--color-brand-sage)] transition-colors font-mono text-sm"
          placeholder="organize-sua-vida"
        />
        <span className="text-[10px] text-[var(--color-brand-charcoal)]/50">
          Apenas letras minúsculas, números e hifens. Sugerido a partir do título.
        </span>
        {errors?.slug && (
          <span className="text-red-500 text-[10px] font-medium">
            {errors.slug}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium">
          Descrição
        </label>
        <textarea
          name="description"
          rows={5}
          defaultValue={defaultValues?.description ?? ""}
          className="w-full bg-white border border-black/10 rounded-sm px-4 py-3 text-[var(--color-brand-charcoal)] focus:outline-none focus:border-[var(--color-brand-sage)] transition-colors resize-y"
          placeholder="Descreva brevemente o conteúdo e o objetivo do curso."
        />
        {errors?.description && (
          <span className="text-red-500 text-[10px] font-medium">
            {errors.description}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium">
          Thumbnail (URL)
        </label>
        <input
          type="url"
          name="thumbnail"
          defaultValue={defaultValues?.thumbnail ?? ""}
          className="w-full bg-white border border-black/10 rounded-sm px-4 py-3 text-[var(--color-brand-charcoal)] focus:outline-none focus:border-[var(--color-brand-sage)] transition-colors"
          placeholder="https://..."
        />
        <span className="text-[10px] text-[var(--color-brand-charcoal)]/50">
          Upload via Supabase Storage entra em fase posterior.
        </span>
        {errors?.thumbnail && (
          <span className="text-red-500 text-[10px] font-medium">
            {errors.thumbnail}
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

      <div className="flex items-center gap-4 pt-2">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
