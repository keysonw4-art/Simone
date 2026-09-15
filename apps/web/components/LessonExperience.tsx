"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { CheckCircle2, PlayCircle, ChevronDown, X, ListChecks } from "lucide-react";

export type SidebarSection = {
  id: string;
  title: string;
  lessons: { id: string; title: string; completed: boolean }[];
};

/**
 * Envolve o player (children) + a navegação do curso num painel recolhível.
 * Desktop: painel docado que empurra o conteúdo ao abrir e some ao recolher.
 * Mobile: drawer sobre um backdrop (modal). Estado único controla os dois.
 */
export function LessonExperience({
  children,
  courseSlug,
  courseTitle,
  currentLessonId,
  sections,
}: {
  children: ReactNode;
  courseSlug: string;
  courseTitle: string;
  currentLessonId: string;
  sections: SidebarSection[];
}) {
  const [open, setOpen] = useState(false);
  const currentSectionId =
    sections.find((s) => s.lessons.some((l) => l.id === currentLessonId))?.id ?? null;
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(currentSectionId ? [currentSectionId] : []),
  );

  // Abre por padrão no desktop; recolhido no mobile.
  useEffect(() => {
    if (typeof window !== "undefined") {
      setOpen(window.matchMedia("(min-width: 1024px)").matches);
    }
  }, []);

  const toggleSection = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="relative min-h-screen">
      {/* Conteúdo (player). No desktop, abre espaço pro painel quando aberto. */}
      <div className={`transition-[padding] duration-300 ${open ? "lg:pr-96" : ""}`}>
        {children}
      </div>

      {/* Botão flutuante abrir/recolher */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Recolher conteúdo" : "Abrir conteúdo do curso"}
        className="fixed z-50 bottom-6 right-6 inline-flex items-center gap-2 bg-[var(--color-brand-charcoal)] text-white px-4 py-3 rounded-full shadow-lg text-[10px] uppercase tracking-widest hover:bg-[var(--color-brand-sage)] transition-colors"
      >
        {open ? <X className="w-4 h-4" /> : <ListChecks className="w-4 h-4" />}
        <span className="hidden sm:inline">{open ? "Fechar" : "Conteúdo"}</span>
      </button>

      {/* Backdrop (mobile) */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Painel */}
      <aside
        className={`fixed top-0 right-0 z-40 h-screen w-96 max-w-[90vw] bg-white border-l border-black/5 shadow-xl overflow-y-auto transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-6 border-b border-black/5 bg-[var(--color-brand-offwhite)]/40 sticky top-0 z-10">
          <p className="text-[9px] uppercase tracking-[0.3em] text-[var(--color-brand-charcoal)]/50 mb-1">
            Conteúdo do curso
          </p>
          <h3 className="font-serif text-lg text-[var(--color-brand-charcoal)] leading-tight pr-8">
            {courseTitle}
          </h3>
        </div>

        <div className="divide-y divide-black/5 pb-24">
          {sections.map((section) => {
            const total = section.lessons.length;
            const done = section.lessons.filter((l) => l.completed).length;
            const pct = total ? Math.round((done / total) * 100) : 0;
            const isOpen = expanded.has(section.id);
            const hasTitle = section.title.trim() !== "";

            return (
              <div key={section.id}>
                {hasTitle && (
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    className="w-full text-left p-4 bg-black/[0.02] hover:bg-black/5 transition-colors flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[var(--color-brand-charcoal)] truncate">
                        {section.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-1 bg-black/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[var(--color-brand-sage)] transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                        <span className="text-[10px] text-[var(--color-brand-charcoal)]/50 whitespace-nowrap">
                          {done}/{total}
                        </span>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-[var(--color-brand-charcoal)]/40 flex-shrink-0 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                )}

                {(isOpen || !hasTitle) && (
                  <div>
                    {section.lessons.map((lesson, i) => {
                      const isCurrent = lesson.id === currentLessonId;
                      return (
                        <Link
                          key={lesson.id}
                          href={`/aluno/cursos/${courseSlug}/aulas/${lesson.id}`}
                          className={`group flex items-center p-4 transition-colors border-l-2 ${
                            isCurrent
                              ? "bg-[var(--color-brand-sage)]/5 border-[var(--color-brand-sage)]"
                              : "border-transparent hover:bg-black/5"
                          }`}
                        >
                          <div className="mr-3 flex-shrink-0">
                            {lesson.completed ? (
                              <CheckCircle2 className="w-4 h-4 text-[var(--color-brand-sage)]" />
                            ) : (
                              <PlayCircle
                                className={`w-4 h-4 ${
                                  isCurrent
                                    ? "text-[var(--color-brand-sage)]"
                                    : "text-[var(--color-brand-charcoal)]/30 group-hover:text-[var(--color-brand-charcoal)]/50"
                                }`}
                              />
                            )}
                          </div>
                          <div
                            className={`flex-1 min-w-0 text-xs truncate ${
                              isCurrent
                                ? "text-[var(--color-brand-sage)] font-medium"
                                : "text-[var(--color-brand-charcoal)]/80 group-hover:text-[var(--color-brand-charcoal)]"
                            }`}
                          >
                            {i + 1}. {lesson.title}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
