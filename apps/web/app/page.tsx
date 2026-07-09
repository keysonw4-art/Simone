"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, Play } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero reveal
      gsap.fromTo(textRef.current, 
        { y: 50, opacity: 0 }, 
        { y: 0, opacity: 1, duration: 1.2, ease: "power3.out", delay: 0.2 }
      );
      
      gsap.fromTo(cardRef.current,
        { y: 100, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 1.5, ease: "power3.out", delay: 0.4 }
      );
    }, heroRef);
    
    return () => ctx.revert();
  }, []);

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden" ref={heroRef}>
      {/* Background with subtle gradient/blur */}
      <div className="absolute inset-0 bg-[var(--color-brand-offwhite)] z-[-2]"></div>
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[var(--color-brand-gold)]/5 rounded-full blur-[120px] z-[-1] translate-x-1/3 -translate-y-1/3"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[var(--color-brand-sage)]/5 rounded-full blur-[100px] z-[-1] -translate-x-1/4 translate-y-1/4"></div>

      {/* Header Glassmorphism */}
      <header className="w-full fixed top-0 z-50 backdrop-blur-xl bg-[var(--color-brand-offwhite)]/60 border-b border-[var(--color-brand-gold)]/10">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 border border-[var(--color-brand-gold)]/50 flex items-center justify-center text-[var(--color-brand-gold)] font-serif text-xl tracking-tighter">SM</div>
            <div className="flex flex-col">
              <span className="font-serif text-xl text-[var(--color-brand-charcoal)] tracking-widest leading-none">SIMONE MENDES</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-brand-charcoal)]/60 mt-1">Organizer Premium</span>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-10 text-xs uppercase font-medium tracking-[0.15em] text-[var(--color-brand-charcoal)]/70">
            <a href="#" className="hover:text-[var(--color-brand-gold)] transition-colors">Método</a>
            <a href="#" className="hover:text-[var(--color-brand-gold)] transition-colors">Meus Cursos</a>
            <a href="#" className="hover:text-[var(--color-brand-gold)] transition-colors">Suporte</a>
          </nav>
          <Link
            href="/login"
            className="bg-[var(--color-brand-charcoal)] text-white px-8 py-3 text-xs uppercase tracking-[0.15em] hover:bg-[var(--color-brand-sage)] transition-colors duration-500 flex items-center gap-2 group"
          >
            Área do Aluno
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pt-40 pb-24 text-center relative z-10">
        <h1 ref={textRef} className="font-serif text-5xl md:text-7xl lg:text-[5.5rem] text-[var(--color-brand-charcoal)] mb-8 leading-[1.1] max-w-5xl opacity-0">
          Transformando <i className="text-[var(--color-brand-gold)]">Espaços</i>,<br /> Restaurando a Paz.
        </h1>
        
        {/* Glass Card central */}
        <div ref={cardRef} className="mt-12 w-full max-w-4xl backdrop-blur-md bg-white/40 border border-white/60 shadow-2xl rounded-sm p-1 opacity-0">
          <div className="border border-[var(--color-brand-gold)]/20 p-10 md:p-16 flex flex-col items-center bg-white/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-brand-gold)]/10 blur-[40px]"></div>
            
            <p className="text-lg md:text-xl text-[var(--color-brand-charcoal)]/80 max-w-2xl mb-12 font-light leading-relaxed">
              O ecossistema definitivo para a sua jornada de organização. Acesse seus cursos, metodologias exclusivas e materiais complementares com a elegância que seu estilo de vida exige.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 w-full justify-center relative z-10">
              <Link
                href="/signup"
                className="bg-[var(--color-brand-sage)] text-white px-10 py-5 text-xs font-semibold uppercase tracking-[0.2em] hover:bg-[var(--color-brand-charcoal)] transition-colors duration-500 shadow-xl shadow-[var(--color-brand-sage)]/20 text-center"
              >
                Iniciar Jornada
              </Link>
              <button className="bg-transparent text-[var(--color-brand-charcoal)] border border-[var(--color-brand-charcoal)]/30 px-10 py-5 text-xs font-semibold uppercase tracking-[0.2em] hover:border-[var(--color-brand-gold)] hover:text-[var(--color-brand-gold)] transition-colors duration-500 flex items-center justify-center gap-3">
                <Play className="w-3 h-3" />
                Assistir Trailer
              </button>
            </div>
          </div>
        </div>
      </main>
      
      {/* Spacer para mostrar o Lenis Smooth Scroll funcionando */}
      <div className="h-[50vh] flex items-center justify-center text-[var(--color-brand-charcoal)]/30 font-serif">
        Scroll suave ativado
      </div>
    </div>
  );
}
