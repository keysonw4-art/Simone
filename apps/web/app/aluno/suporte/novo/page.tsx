import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SupportTicketForm } from "../../../../components/SupportTicketForm";

export default function NovoChamadoPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <Link
        href="/aluno/suporte"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/50 hover:text-[var(--color-brand-sage)] transition-colors mb-8"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Voltar para Suporte
      </Link>

      <header className="mb-10">
        <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-brand-charcoal)]/60 mb-2">
          Suporte
        </p>
        <h1 className="font-serif text-4xl text-[var(--color-brand-charcoal)] tracking-tight mb-3">
          Abrir novo chamado
        </h1>
        <p className="text-sm text-[var(--color-brand-charcoal)]/60 max-w-xl leading-relaxed">
          Conte com detalhes o que aconteceu. Quanto mais contexto, mais rápido
          conseguimos te ajudar.
        </p>
      </header>

      <SupportTicketForm />
    </div>
  );
}
