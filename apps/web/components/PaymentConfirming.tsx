"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * Mostrado quando o aluno volta do checkout (?assinatura=sucesso) mas o
 * webhook do Stripe ainda não criou a assinatura no banco (corrida normal de
 * poucos segundos). Faz refresh do server component algumas vezes até o acesso
 * aparecer; depois de um limite, orienta a atualizar/contatar suporte.
 */
export function PaymentConfirming() {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);
  const MAX = 6;

  useEffect(() => {
    if (attempts >= MAX) return;
    const t = setTimeout(() => {
      router.refresh();
      setAttempts((n) => n + 1);
    }, 2500);
    return () => clearTimeout(t);
  }, [attempts, router]);

  const gaveUp = attempts >= MAX;

  return (
    <div className="max-w-2xl mx-auto mb-10 rounded-sm border border-[var(--color-brand-sage)]/30 bg-[var(--color-brand-sage)]/5 px-6 py-6 text-center">
      {!gaveUp ? (
        <>
          <Loader2 className="w-6 h-6 text-[var(--color-brand-sage)] mx-auto mb-3 animate-spin" />
          <p className="text-sm text-[var(--color-brand-charcoal)]/80">
            Confirmando seu pagamento...
          </p>
          <p className="text-xs text-[var(--color-brand-charcoal)]/50 mt-1">
            Isso leva só alguns segundos. Não feche esta página.
          </p>
        </>
      ) : (
        <>
          <p className="text-sm text-[var(--color-brand-charcoal)]/80 mb-1">
            Ainda não conseguimos confirmar a liberação do seu acesso.
          </p>
          <p className="text-xs text-[var(--color-brand-charcoal)]/50">
            Se o conteúdo não aparecer em instantes, atualize a página. Persistindo,{" "}
            <Link
              href="/aluno/suporte"
              className="text-[var(--color-brand-sage)] underline underline-offset-2"
            >
              fale com o suporte
            </Link>
            .
          </p>
        </>
      )}
    </div>
  );
}
