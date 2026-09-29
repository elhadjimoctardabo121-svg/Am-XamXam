/**
 * Abstraction PAYMENT_PROVIDER : le reste de l'app ne connaît que cette
 * interface, jamais "paytech" directement (cahier des charges, section
 * paiement indépendant d'un seul fournisseur). Pour ajouter PayDunya plus
 * tard : un fichier paydunya.ts qui implémente PaymentProvider, puis un
 * bascule ici selon une variable d'environnement.
 */
export type InitiatePaymentParams = {
  itemName: string;
  amountFcfa: number;
  refCommand: string;
  ipnUrl: string;
  successUrl: string;
  cancelUrl: string;
  customField: Record<string, unknown>;
};

export type InitiatePaymentResult =
  | { ok: true; redirectUrl: string }
  | { ok: false; error: string };

export interface PaymentProvider {
  initiate(params: InitiatePaymentParams): Promise<InitiatePaymentResult>;
}
