"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { paytechProvider } from "@/lib/payment/paytech";
import { createClient } from "@/lib/supabase/server";

export type InitiatePaymentState = { error?: string };

async function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Crée une tentative de paiement "pending" et redirige vers la page de paiement PayTech. */
export async function initiatePayment(
  _prev: InitiatePaymentState | undefined,
  fd: FormData,
): Promise<InitiatePaymentState> {
  const planId = String(fd.get("planId") ?? "");
  const subjectId = fd.get("subjectId") ? String(fd.get("subjectId")) : null;
  if (!planId) return { error: "Choisis une offre." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Connecte-toi d'abord." };

  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("id, name, price_fcfa, scope")
    .eq("id", planId)
    .eq("active", true)
    .single();
  if (planError || !plan) return { error: "Cette offre n'est plus disponible." };
  if (plan.scope === "matiere" && !subjectId) return { error: "Choisis une matière pour ce pack." };

  const { data: payment, error: insertError } = await supabase
    .from("payments")
    .insert({ user_id: user.id, plan_id: plan.id, provider: "paytech", amount_fcfa: plan.price_fcfa, status: "pending" })
    .select("id")
    .single();
  if (insertError || !payment) return { error: "Impossible de démarrer le paiement. Réessaie." };

  const base = await siteUrl();
  const result = await paytechProvider.initiate({
    itemName: plan.name,
    amountFcfa: plan.price_fcfa,
    refCommand: payment.id,
    ipnUrl: `${base}/api/paiement/ipn`,
    successUrl: `${base}/paiement/succes`,
    cancelUrl: `${base}/paiement/annule`,
    customField: { paymentId: payment.id, subjectId },
  });

  if (!result.ok) return { error: result.error };

  redirect(result.redirectUrl);
}
