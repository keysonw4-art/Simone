"use client";

import { useFormStatus } from "react-dom";

type ModuleOption = {
  id: string;
  title: string;
  category: string | null;
  lessonsCount: number;
};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-6 py-2.5 bg-[var(--color-brand-sage)] text-white text-[10px] uppercase tracking-widest rounded-sm hover:bg-[var(--color-brand-charcoal)] transition-colors disabled:opacity-70"
    >
      {pending ? "Salvando..." : "Salvar composição"}
    </button>
  );
}

const CAT_LABELS: Record<string, string> = {
  FORMACAO: "Formação",
  PRATICO: "Prático",
  TEORICO: "Teórico",
  ESPECIALIZADO: "Especializado",
  LINHA_DOMESTICA: "Linha Doméstica",
};

export function ProductComposition({
  action,
  modules,
  selectedIds,
  disabled,
}: {
  action: (formData: FormData) => void | Promise<void>;
  modules: ModuleOption[];
  selectedIds: string[];
  disabled: boolean;
}) {
  const selected = new Set(selectedIds);

  if (modules.length === 0) {
    return (
      <div className="bg-white border border-black/5 rounded-sm p-6 text-sm text-[var(--color-brand-charcoal)]/50">
        Nenhum módulo cadastrado ainda. Crie módulos primeiro para compô-los aqui.
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      {disabled && <p className="text-sm text-[var(--color-brand-charcoal)]/70">Este curso libera todos os módulos. Selecione abaixo apenas a grade obrigatória para emissão do certificado; os demais continuam acessíveis.</p>}
      <div className="bg-white border border-black/5 rounded-sm divide-y divide-black/5">
        {modules.map((m) => (
          <label
            key={m.id}
            className="flex items-center gap-4 px-5 py-3.5 cursor-pointer hover:bg-black/[0.015] transition-colors"
          >
            <input
              type="checkbox"
              name="courseIds"
              value={m.id}
              defaultChecked={selected.has(m.id)}
              className="accent-[var(--color-brand-sage)] cursor-pointer"
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-[var(--color-brand-charcoal)] truncate">
                {m.title}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--color-brand-charcoal)]/40 mt-0.5">
                {m.category ? CAT_LABELS[m.category] ?? m.category : "sem categoria"}
                {" · "}
                {m.lessonsCount} {m.lessonsCount === 1 ? "aula" : "aulas"}
              </div>
            </div>
          </label>
        ))}
      </div>
      <div>
        <SaveButton />
      </div>
    </form>
  );
}
