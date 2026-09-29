import type { InitiatePaymentParams, InitiatePaymentResult, PaymentProvider } from "./provider";

const BASE_URL = "https://paytech.sn/api";

// Compte non encore validé pour la production par PayTech (vérification
// manuelle de leur côté, voir guide pratique) : on reste en mode test tant
// que PAYTECH_ENV n'est pas explicitement mis à "prod". En mode test, seul
// un montant aléatoire de 100 à 150 FCFA est débité, jamais le vrai montant.
const ENV = process.env.PAYTECH_ENV === "prod" ? "prod" : "test";

function credentials() {
  const apiKey = process.env.PAYTECH_API_KEY;
  const apiSecret = process.env.PAYTECH_API_SECRET;
  return apiKey && apiSecret ? { apiKey, apiSecret } : null;
}

export const paytechProvider: PaymentProvider = {
  async initiate(params: InitiatePaymentParams): Promise<InitiatePaymentResult> {
    const creds = credentials();
    if (!creds) return { ok: false, error: "Paiement non configuré." };

    const response = await fetch(`${BASE_URL}/payment/request-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        API_KEY: creds.apiKey,
        API_SECRET: creds.apiSecret,
      },
      body: JSON.stringify({
        item_name: params.itemName,
        item_price: params.amountFcfa,
        currency: "XOF",
        ref_command: params.refCommand,
        command_name: params.itemName,
        env: ENV,
        ipn_url: params.ipnUrl,
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        custom_field: JSON.stringify(params.customField),
      }),
    });

    const data = (await response.json().catch(() => null)) as
      | { success: 1; redirect_url: string }
      | { success: -1 | 0; message?: string }
      | null;

    if (!data || data.success !== 1) {
      return { ok: false, error: data?.message ?? "Le paiement n'a pas pu être initié." };
    }
    return { ok: true, redirectUrl: data.redirect_url };
  },
};

/**
 * Vérifie qu'une notification IPN vient bien de PayTech : ils renvoient le
 * hash SHA-256 de nos propres clés dans le corps de la requête (méthode
 * documentée par PayTech). On compare, on ne fait jamais confiance à un
 * ref_command seul.
 */
export async function verifyPaytechIpn(fields: {
  api_key_sha256?: string;
  api_secret_sha256?: string;
}): Promise<boolean> {
  const creds = credentials();
  if (!creds || !fields.api_key_sha256 || !fields.api_secret_sha256) return false;

  const sha256 = async (text: string) => {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  };

  const [expectedKey, expectedSecret] = await Promise.all([sha256(creds.apiKey), sha256(creds.apiSecret)]);
  return expectedKey === fields.api_key_sha256 && expectedSecret === fields.api_secret_sha256;
}
