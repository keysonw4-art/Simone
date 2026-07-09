import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacidadePage() {
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
            Política de Privacidade
          </h1>
          <p className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/50">
            Última atualização: a definir
          </p>
        </header>

        <div className="bg-yellow-50 border border-yellow-200 rounded-sm p-4 mb-10 text-xs text-yellow-900 leading-relaxed">
          <strong>Conteúdo pendente.</strong> Este texto será fornecido pela
          equipe responsável antes do lançamento público. A estrutura abaixo
          já reflete os requisitos da LGPD.
        </div>

        <article className="space-y-10 text-sm text-[var(--color-brand-charcoal)]/80 leading-relaxed">
          {[
            ["1. Quem somos", "Identificação do controlador dos dados."],
            ["2. Dados que coletamos", "Nome, e-mail, senha hasheada, progresso de aulas, registros de acesso."],
            ["3. Bases legais", "Consentimento, execução de contrato, obrigação legal, legítimo interesse."],
            ["4. Finalidades", "Operar a plataforma, manter sua conta, processar pagamentos, comunicação."],
            ["5. Compartilhamento", "Operadores: Supabase (banco/storage), Vercel (hospedagem), Stripe (pagamentos), Vimeo (vídeo)."],
            ["6. Cookies e tracking", "Tipos de cookies usados e finalidade de cada um."],
            ["7. Seus direitos (LGPD Art. 18)", "Acesso, correção, exclusão, portabilidade — disponíveis em /aluno/perfil."],
            ["8. Retenção", "Por quanto tempo cada categoria de dado é mantida."],
            ["9. Segurança", "Medidas técnicas: criptografia em trânsito, hashing de senhas, controle de acesso, logs."],
            ["10. Encarregado de Dados (DPO)", "Contato para exercício de direitos."],
            ["11. Alterações nesta política", "Como mudanças serão comunicadas."],
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
