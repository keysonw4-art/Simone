"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Play } from "lucide-react";
import { TrailerModal } from "@/components/TrailerModal";

const TRAILER_VIMEO_ID = process.env.NEXT_PUBLIC_TRAILER_VIMEO_ID;

export function LandingHero() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [trailerOpen, setTrailerOpen] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      if (reduce) {
        // Sem movimento: revela na hora (senão os elementos opacity-0 somem).
        gsap.set(".hero-reveal", { opacity: 1, y: 0 });
        return;
      }
      gsap.fromTo(
        ".hero-reveal",
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1.1,
          ease: "power3.out",
          stagger: 0.12,
          delay: 0.15,
        },
      );
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={rootRef}
      className="relative z-10 min-h-[100dvh] flex flex-col items-center justify-center px-6 pt-28 sm:pt-32 pb-20 text-center"
    >
      <p className="hero-reveal text-[10px] sm:text-[11px] uppercase tracking-[0.25em] sm:tracking-[0.3em] text-[var(--color-brand-sage)] mb-5 sm:mb-6 opacity-0">
        Educação em organização
      </p>

      <h1 className="hero-reveal font-serif text-4xl sm:text-5xl md:text-7xl lg:text-[5.25rem] text-[var(--color-brand-charcoal)] mb-6 sm:mb-8 leading-[1.1] md:leading-[1.08] max-w-4xl opacity-0">
        Transformando <i className="text-[var(--color-brand-gold)] not-italic italic">Espaços</i>,
        <br /> Restaurando a Paz.
      </h1>

      <p className="hero-reveal text-lg md:text-xl text-[var(--color-brand-charcoal)]/70 max-w-xl mb-10 font-light leading-relaxed opacity-0">
        Cursos, metodologias e materiais para transformar a sua relação com a
        casa, no seu tempo.
      </p>

      <div className="hero-reveal flex flex-col sm:flex-row gap-4 w-full max-w-md sm:max-w-none sm:w-auto justify-center opacity-0">
        <Link
          href="/signup"
          className="bg-[var(--color-brand-sage)] text-white px-10 py-4 text-xs font-semibold uppercase tracking-[0.2em] rounded-sm hover:bg-[var(--color-brand-charcoal)] transition-colors duration-500 shadow-xl shadow-[var(--color-brand-sage)]/20 text-center active:translate-y-px"
        >
          Iniciar Jornada
        </Link>
        {TRAILER_VIMEO_ID && (
          <button
            type="button"
            onClick={() => setTrailerOpen(true)}
            className="bg-transparent text-[var(--color-brand-charcoal)] border border-[var(--color-brand-charcoal)]/20 px-10 py-4 text-xs font-semibold uppercase tracking-[0.2em] rounded-sm hover:border-[var(--color-brand-gold)] hover:text-[var(--color-brand-gold)] transition-colors duration-500 flex items-center justify-center gap-3 active:translate-y-px"
          >
            <Play className="w-3 h-3" />
            Assistir Trailer
          </button>
        )}
      </div>

      {trailerOpen && TRAILER_VIMEO_ID && (
        <TrailerModal
          vimeoVideoId={TRAILER_VIMEO_ID}
          onClose={() => setTrailerOpen(false)}
        />
      )}
    </section>
  );
}
