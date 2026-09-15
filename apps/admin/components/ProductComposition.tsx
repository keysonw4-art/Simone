"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowUp, ArrowDown, Plus, X } from "lucide-react";

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

const iconBtn =
  "p-1.5 border border-black/10 rounded-sm hover:border-[var(--color-brand-charcoal)]/30 hover:bg-black/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed";

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
  const byId = new Map(modules.map((m) => [m.id, m]));
  // Ordem inicial = ordem salva; ignora ids que não existem mais.
  const [selected, setSelected] = useState<string[]>(
    selectedIds.filter((id) => byId.has(id)),
  );

  const selectedSet = new Set(selected);
  const available = modules.filter((m) => !selectedSet.has(m.id));

  const add = (id: string) => setSelected((s) => [...s, id]);
  const remove = (id: string) => setSelected((s) => s.filter((x) => x !== id));
  const move = (i: number, dir: -1 | 1) =>
    setSelected((s) => {
      const j = i + dir;
      if (j < 0 || j >= s.length) return s;
      const next = [...s];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });

  if (modules.length === 0) {
    return (
      <div className="bg-white border border-black/5 rounded-sm p-6 text-sm text-[var(--color-brand-charcoal)]/50">
        Nenhum módulo cadastrado ainda. Crie módulos primeiro para compô-los aqui.
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-6">
      {disabled && (
        <p className="text-sm text-[var(--color-brand-charcoal)]/70">
          Este curso libera todos os módulos. A ordem abaixo define a sequência
          de estudo e a grade obrigatória para o certificado; os demais módulos
          continuam acessíveis.
        </p>
      )}

      {/* Selecionados — ordenados (a sequência de estudo) */}
      <div>
        <h3 className="text-[10px] uppercase tracking-widest text-[var(--color-brand-charcoal)]/60 mb-3">
          Módulos do curso · sequência ({selected.length})
        </h3>
        {selected.length === 0 ? (
          <div className="bg-white border border-dashed border-black/15 rounded-sm p-6 text-sm text-[var(--color-brand-charcoal)]/40 text-center">
            Nenhum módulo neste curso ainda. Adicione da lista abaixo.
          </div>
        ) : (
          <div className="bg-white border border-black/5 rounded-sm divide-y divide-black/5">
            {selected.map((id, i) => {
              const m = byId.get(id);
              if (!m) return null;
              return (
                <div key={id} className="flex items-center gap-3 px-4 py-3">
                  <input type="hidden" name="courseIds" value={id} />
                  <span className="w-7 text-center font-serif text-lg text-[var(--color-brand-sage)]/70 flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className={iconBtn} aria-label="Subir">
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === selected.length - 1} className={iconBtn} aria-label="Descer">
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-[var(--color-brand-charcoal)] truncate">{m.title}</div>
                    <div className="text-[10px] uppercase tracking-widest text-[var(--color-brand-charcoal)]/40 mt-0.5">
                      {m.category ? CAT_LABELS[m.category] ?? m.category : "sem categoria"}
                      {" · "}
                      {m.lessonsCount} {m.lessonsCount === 1 ? "aula" : "aulas"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(id)}
                    className="p-2 text-[var(--color-brand-charcoal)]/40 hover:text-red-500 transition-colors flex-shrink-0"
                    aria-label="Remover do curso"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Disponíveis — adicionar ao curso */}
      {available.length > 0 && (
        <div>
          <h3 className="text-[10px] uppercase tracking-widest text-[var(--color-brand-charcoal)]/60 mb-3">
            Módulos disponíveis
          </h3>
          <div className="bg-white border border-black/5 rounded-sm divide-y divide-black/5 max-h-80 overflow-y-auto">
            {available.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3 hover:bg-black/[0.015] transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[var(--color-brand-charcoal)] truncate">{m.title}</div>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--color-brand-charcoal)]/40 mt-0.5">
                    {m.category ? CAT_LABELS[m.category] ?? m.category : "sem categoria"}
                    {" · "}
                    {m.lessonsCount} {m.lessonsCount === 1 ? "aula" : "aulas"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => add(m.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-widest border border-[var(--color-brand-sage)]/30 text-[var(--color-brand-sage)] rounded-sm hover:bg-[var(--color-brand-sage)]/5 transition-colors flex-shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <SaveButton />
      </div>
    </form>
  );
}
