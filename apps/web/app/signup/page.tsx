"use client";
import { useActionState, useRef, useEffect } from "react";
import gsap from "gsap";
import { useFormStatus } from "react-dom";
import { signupAction } from "@repo/auth/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-4 w-full bg-[var(--color-brand-sage)] text-white py-4 rounded-sm text-xs uppercase tracking-widest hover:bg-[var(--color-brand-charcoal)] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {pending ? "Criando conta..." : "Criar Conta"}
    </button>
  );
}

export default function SignupPage() {
  const [state, formAction] = useActionState(signupAction, undefined);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.fromTo(
      formRef.current,
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, ease: "power3.out" },
    );
  }, []);

  const errors = state?.errors;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-brand-offwhite)] relative overflow-hidden font-sans py-12">
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[var(--color-brand-sage)]/5 rounded-full blur-[120px] pointer-events-none -translate-y-1/4 translate-x-1/4"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[var(--color-brand-gold)]/5 rounded-full blur-[100px] pointer-events-none translate-y-1/4 -translate-x-1/4"></div>

      <div
        ref={formRef}
        className="w-full max-w-md bg-white p-10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-black/5 relative z-10"
      >
        <div className="text-center mb-10">
          <h1 className="font-serif text-3xl tracking-widest text-[var(--color-brand-sage)] mb-1">
            SIMONE MENDES
          </h1>
          <p className="text-[9px] uppercase tracking-[0.3em] text-[var(--color-brand-charcoal)]/60">
            Criar Conta
          </p>
        </div>

        <form action={formAction} className="flex flex-col gap-6">
          <input type="hidden" name="redirectTo" value="/aluno" />
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium">
              Nome
            </label>
            <input
              type="text"
              name="name"
              required
              autoComplete="name"
              className="w-full bg-transparent border-b border-black/10 px-0 py-2 text-[var(--color-brand-charcoal)] focus:outline-none focus:border-[var(--color-brand-sage)] transition-colors"
              placeholder="Seu nome completo"
            />
            {errors?.name && (
              <span className="text-red-500 text-[10px] font-medium">
                {errors.name}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium">
              E-mail
            </label>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="w-full bg-transparent border-b border-black/10 px-0 py-2 text-[var(--color-brand-charcoal)] focus:outline-none focus:border-[var(--color-brand-sage)] transition-colors"
              placeholder="seu@email.com"
            />
            {errors?.email && (
              <span className="text-red-500 text-[10px] font-medium">
                {errors.email}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium">
              Senha
            </label>
            <input
              type="password"
              name="password"
              required
              autoComplete="new-password"
              minLength={8}
              className="w-full bg-transparent border-b border-black/10 px-0 py-2 text-[var(--color-brand-charcoal)] focus:outline-none focus:border-[var(--color-brand-sage)] transition-colors"
              placeholder="mínimo 8 caracteres"
            />
            {errors?.password && (
              <span className="text-red-500 text-[10px] font-medium">
                {errors.password}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1 pt-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="acceptTerms"
                required
                className="mt-0.5 accent-[var(--color-brand-sage)] cursor-pointer"
              />
              <span className="text-xs text-[var(--color-brand-charcoal)]/70 leading-relaxed">
                Li e aceito os{" "}
                <a href="/termos" className="text-[var(--color-brand-sage)] underline">
                  Termos de Uso
                </a>{" "}
                e a{" "}
                <a href="/privacidade" className="text-[var(--color-brand-sage)] underline">
                  Política de Privacidade
                </a>
                .
              </span>
            </label>
            {errors?.acceptTerms && (
              <span className="text-red-500 text-[10px] font-medium">
                {errors.acceptTerms}
              </span>
            )}
          </div>

          {errors?.form && (
            <div className="text-red-500 text-xs font-medium text-center">
              {errors.form}
            </div>
          )}

          <SubmitButton />
        </form>

        <div className="text-center mt-8">
          <a
            href="/login"
            className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/60 hover:text-[var(--color-brand-sage)] transition-colors"
          >
            Já tem conta? Entrar
          </a>
        </div>
      </div>
    </div>
  );
}
