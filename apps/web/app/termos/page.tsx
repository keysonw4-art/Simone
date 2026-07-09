import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-[var(--color-brand-offwhite)] py-16 md:py-24 px-6">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/50 hover:text-[var(--color-brand-sage)] transition-colors mb-12"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar para o início
        </Link>

        <header className="mb-12">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-brand-charcoal)]/60 mb-4">
            Documento legal
          </p>
          <h1 className="font-serif text-4xl md:text-5xl text-[var(--color-brand-charcoal)] tracking-tight leading-[1.1] mb-4">
            Termos de Uso
          </h1>
          <p className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/50">
            Última atualização: a definir
          </p>
        </header>

        <div className="bg-yellow-50 border border-yellow-200 rounded-sm p-4 mb-10 text-xs text-yellow-900 leading-relaxed">
          <strong>Conteúdo pendente.</strong> Este texto será fornecido pela
          equipe jurídica responsável antes do lançamento público da
          plataforma. As seções abaixo são apenas a estrutura inicial.
        </div>

        <article className="space-y-10 text-sm text-[var(--color-brand-charcoal)]/80 leading-relaxed">
          {[
            ["1. Aceitação dos termos", "Condições gerais que o usuário aceita ao se cadastrar e usar a plataforma."],
            ["2. Cadastro e conta", "Requisitos, responsabilidades sobre credenciais, idade mínima."],
            ["3. Planos e assinaturas", "Modelo de cobrança, renovação, cancelamento, reembolso."],
            ["4. Uso da plataforma", "Regras de conduta, restrições, propriedade intelectual."],
            ["5. Conteúdo e direitos autorais", "Titularidade dos cursos, restrição de compartilhamento."],
            ["6. Suspensão e encerramento", "Hipóteses de bloqueio de conta."],
            ["7. Limitação de responsabilidade", "Escopo de garantias e isenções."],
            ["8. Alterações nos termos", "Como mudanças serão comunicadas e aceitas."],
            ["9. Lei aplicável e foro", "Jurisdição."],
            ["10. Contato", "Canal para dúvidas sobre estes termos."],
          ].map(([title, desc]) => (
            <section key={title}>
              <h2 className="font-serif text-2xl text-[var(--color-brand-charcoal)] mb-3 tracking-wide">
                {title}
              </h2>
              <p className="italic text-[var(--color-brand-charcoal)]/50">
                {desc}
              </p>
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}
