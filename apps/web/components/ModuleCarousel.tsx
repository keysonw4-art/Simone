"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowLeft, BookOpen } from "lucide-react";

export type CarouselModule = {
  slug: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  sectionCount: number;
  progressPct: number;
};

export function ModuleCarousel({ modulos }: { modulos: CarouselModule[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  // Recalcula em qual extremidade estamos pra habilitar/desabilitar as setas.
  const sync = () => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  };

  useEffect(() => {
    sync();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      el.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  // "Página" = a largura visível (≈3 cards no desktop, 1 no mobile). O scroll
  // suave + snap dá o efeito de avançar de 3 em 3 com animação.
  const page = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" });
  };

  const hasArrows = modulos.length > 3;

  return (
    <div className="relative">
      {hasArrows && (
        <div className="flex justify-end gap-2 mb-4">
          <button
            type="button"
            onClick={() => page(-1)}
            disabled={atStart}
            aria-label="Módulos anteriores"
            className="w-10 h-10 flex items-center justify-center rounded-full border border-black/10 text-[var(--color-brand-charcoal)]/70 hover:border-[var(--color-brand-sage)] hover:text-[var(--color-brand-sage)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => page(1)}
            disabled={atEnd}
            aria-label="Próximos módulos"
            className="w-10 h-10 flex items-center justify-center rounded-full border border-black/10 text-[var(--color-brand-charcoal)]/70 hover:border-[var(--color-brand-sage)] hover:text-[var(--color-brand-sage)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <div
        ref={trackRef}
        className="flex gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {modulos.map((mod, i) => (
          <Link
            key={mod.slug}
            href={`/aluno/cursos/${mod.slug}`}
            className="group snap-start shrink-0 w-[85%] sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] bg-white border border-black/5 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col"
          >
            <div className="w-full h-44 bg-[var(--color-brand-charcoal)]/5 flex items-center justify-center relative overflow-hidden">
              {mod.thumbnail ? (
                <Image unoptimized fill sizes="(max-width: 640px) 85vw, (max-width: 1024px) 50vw, 33vw"
                  src={mod.thumbnail}
                  alt={mod.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              ) : (
                <BookOpen className="w-12 h-12 text-[var(--color-brand-charcoal)]/20" />
              )}
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors"></div>
              <div className="absolute top-3 left-3 bg-white/90 text-[var(--color-brand-charcoal)] text-[9px] uppercase tracking-widest font-semibold px-2 py-1 rounded-sm">
                Módulo {i + 1}
              </div>
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-serif text-xl text-[var(--color-brand-charcoal)] group-hover:text-[var(--color-brand-sage)] transition-colors">
                  {mod.title}
                </h3>
                <span className="text-[11px] font-medium text-[var(--color-brand-sage)] whitespace-nowrap mt-1">
                  {mod.progressPct}%
                </span>
              </div>

              {/* Barra de progresso do módulo */}
              <div className="h-1 bg-black/5 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-[var(--color-brand-sage)] transition-all duration-700"
                  style={{ width: `${mod.progressPct}%` }}
                ></div>
              </div>

              {mod.description && (
                <p className="text-xs text-[var(--color-brand-charcoal)]/60 line-clamp-2 mb-4 leading-relaxed">
                  {mod.description}
                </p>
              )}
              <div className="mt-auto flex items-center justify-between text-[10px] uppercase tracking-widest">
                <span className="text-[var(--color-brand-charcoal)]/50">
                  {mod.sectionCount} {mod.sectionCount === 1 ? "seção" : "seções"}
                </span>
                <span className="text-[var(--color-brand-sage)] font-medium flex items-center gap-1">
                  Acessar{" "}
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
