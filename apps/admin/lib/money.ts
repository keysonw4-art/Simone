/**
 * Conversão reais <-> centavos para os formulários do admin.
 * O banco guarda em centavos (Int); o admin digita em reais (pt-BR).
 */

/**
 * Interpreta um valor digitado em reais (pt-BR) e devolve centavos.
 * Aceita: "2000", "2.000", "2000,00", "2.000,50", "R$ 2.000,00".
 * Convenção pt-BR: "." = separador de milhar, "," = decimal.
 * Retorna null se vazio ou inválido.
 */
export function reaisToCents(raw: string): number | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  const cleaned = s
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

/** Formata centavos como string de reais editável no input (ex.: "2000,00"). */
export function centsToReaisInput(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}
