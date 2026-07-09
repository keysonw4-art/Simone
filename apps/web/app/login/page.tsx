"use client";
import { useActionState, useRef, useEffect } from "react";
import gsap from "gsap";
import { useFormStatus } from "react-dom";
import { loginAction } from "@repo/auth/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button 
      type="submit" 
      disabled={pending}
      className="mt-4 w-full bg-[var(--color-brand-sage)] text-white py-4 rounded-sm text-xs uppercase tracking-widest hover:bg-[var(--color-brand-charcoal)] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {pending ? "Acessando..." : "Entrar"}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useActionState(loginAction, undefined);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.fromTo(formRef.current, 
      { y: 40, opacity: 0 }, 
      { y: 0, opacity: 1, duration: 1, ease: "power3.out" }
    );
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-brand-offwhite)] relative overflow-hidden font-sans">
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[var(--color-brand-sage)]/5 rounded-full blur-[120px] pointer-events-none -translate-y-1/4 translate-x-1/4"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[var(--color-brand-gold)]/5 rounded-full blur-[100px] pointer-events-none translate-y-1/4 -translate-x-1/4"></div>

      <div ref={formRef} className="w-full max-w-md bg-white p-10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-black/5 relative z-10">
        <div className="text-center mb-10">
          <h1 className="font-serif text-3xl tracking-widest text-[var(--color-brand-sage)] mb-1">SIMONE MENDES</h1>
          <p className="text-[9px] uppercase tracking-[0.3em] text-[var(--color-brand-charcoal)]/60">Portal do Aluno</p>
        </div>

        <form action={formAction} className="flex flex-col gap-6">
          <input type="hidden" name="redirectTo" value="/aluno" />
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium">E-mail</label>
            <input 
              type="email" 
              name="email"
              required
              className="w-full bg-transparent border-b border-black/10 px-0 py-2 text-[var(--color-brand-charcoal)] focus:outline-none focus:border-[var(--color-brand-sage)] transition-colors"
              placeholder="seu@email.com"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium">Senha</label>
            <input 
              type="password" 
              name="password"
              required
              className="w-full bg-transparent border-b border-black/10 px-0 py-2 text-[var(--color-brand-charcoal)] focus:outline-none focus:border-[var(--color-brand-sage)] transition-colors"
              placeholder="••••••••"
            />
          </div>

          {state?.error && (
            <div className="text-red-500 text-xs font-medium text-center">
              {state.error}
            </div>
          )}

          <SubmitButton />
        </form>

        <div className="text-center mt-8">
          <a
            href="/signup"
            className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/60 hover:text-[var(--color-brand-sage)] transition-colors"
          >
            Não tem conta? Criar conta
          </a>
        </div>
      </div>
    </div>
  );
}
