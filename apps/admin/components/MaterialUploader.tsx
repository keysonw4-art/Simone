"use client";

import { useActionState, useRef, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { FileUp } from "lucide-react";
import {
  uploadMaterialAction,
  type MaterialFormState,
} from "../actions/materials";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-5 py-2.5 bg-[var(--color-brand-sage)] text-white text-[10px] uppercase tracking-widest rounded-sm hover:bg-[var(--color-brand-charcoal)] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {pending ? "Enviando..." : "Enviar Material"}
    </button>
  );
}

export function MaterialUploader({ courseId }: { courseId: string }) {
  const bound = uploadMaterialAction.bind(null, courseId);
  const [state, formAction] = useActionState<MaterialFormState, FormData>(
    bound,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const errors = state?.errors;
  const succeeded =
    state && state.errors && Object.keys(state.errors).length === 0;

  useEffect(() => {
    if (succeeded) formRef.current?.reset();
  }, [succeeded]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="bg-white border border-black/5 rounded-lg p-6"
    >
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 rounded-sm bg-[var(--color-brand-sage)]/10 flex items-center justify-center text-[var(--color-brand-sage)] flex-shrink-0">
          <FileUp className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium mb-0.5">
            Novo Material
          </h3>
          <p className="text-[10px] text-[var(--color-brand-charcoal)]/50 leading-relaxed">
            PDF, planilhas, checklists, ZIPs. Máximo 50 MB.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium">
            Título
          </label>
          <input
            type="text"
            name="title"
            required
            className="bg-white border border-black/10 rounded-sm px-3 py-2 text-sm text-[var(--color-brand-charcoal)] focus:outline-none focus:border-[var(--color-brand-sage)] transition-colors"
            placeholder="Ex.: Checklist de organização"
          />
          {errors?.title && (
            <span className="text-red-500 text-[10px] font-medium">
              {errors.title}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium">
            Plano mínimo
          </label>
          <select
            name="requiredPlan"
            required
            defaultValue="BASIC"
            className="bg-white border border-black/10 rounded-sm px-3 py-2 text-sm text-[var(--color-brand-charcoal)] focus:outline-none focus:border-[var(--color-brand-sage)] transition-colors"
          >
            <option value="BASIC">Básico (acessível a todos com plano)</option>
            <option value="INTERMEDIATE">Intermediário</option>
            <option value="PREMIUM">Premium</option>
          </select>
          {errors?.requiredPlan && (
            <span className="text-red-500 text-[10px] font-medium">
              {errors.requiredPlan}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 mb-4">
        <label className="text-[10px] uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium">
          Descrição (opcional)
        </label>
        <textarea
          name="description"
          rows={2}
          className="bg-white border border-black/10 rounded-sm px-3 py-2 text-sm text-[var(--color-brand-charcoal)] focus:outline-none focus:border-[var(--color-brand-sage)] transition-colors resize-y"
          placeholder="Breve descrição do conteúdo"
        />
        {errors?.description && (
          <span className="text-red-500 text-[10px] font-medium">
            {errors.description}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5 mb-6">
        <label className="text-[10px] uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium">
          Arquivo
        </label>
        <input
          type="file"
          name="file"
          required
          className="text-xs text-[var(--color-brand-charcoal)]/70 file:mr-3 file:px-3 file:py-2 file:rounded-sm file:border-0 file:bg-[var(--color-brand-charcoal)]/5 file:text-[var(--color-brand-charcoal)]/70 file:text-[10px] file:uppercase file:tracking-widest hover:file:bg-[var(--color-brand-charcoal)]/10 file:cursor-pointer"
        />
        {errors?.file && (
          <span className="text-red-500 text-[10px] font-medium">
            {errors.file}
          </span>
        )}
      </div>

      {errors?.form && (
        <div className="text-red-500 text-xs font-medium mb-4">
          {errors.form}
        </div>
      )}
      {succeeded && (
        <div className="text-[var(--color-brand-sage)] text-xs font-medium mb-4">
          Material adicionado.
        </div>
      )}

      <SubmitButton />
    </form>
  );
}
