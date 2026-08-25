import Stripe from "stripe";

/**
 * Cliente Stripe do servidor.
 *
 * Fica `null` quando STRIPE_SECRET_KEY não está definida — assim o build e as
 * páginas continuam funcionando sem as chaves (o botão "Assinar" cai no estado
 * "em breve"). Use `getStripe()` só dentro de handlers/actions que realmente
 * precisam cobrar, onde a ausência da chave é um erro de configuração.
 */
const secretKey = process.env.STRIPE_SECRET_KEY;

export const stripe = secretKey
  ? new Stripe(secretKey, { typescript: true })
  : null;

export function getStripe(): Stripe {
  if (!stripe) {
    throw new Error(
      "STRIPE_SECRET_KEY não configurada — integração de pagamento indisponível.",
    );
  }
  return stripe;
}

export const isStripeEnabled = Boolean(secretKey);
