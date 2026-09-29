"use server";

import { createClient } from "@/lib/supabase/server";

export type RedeemState = { error?: string; success?: { planName: string; endsAt: string } };

export async function redeemAccessCode(_prev: RedeemState | undefined, fd: FormData): Promise<RedeemState> {
  const code = String(fd.get("code") ?? "")
    .trim()
    .toUpperCase();
  if (!code) return { error: "Entre un code." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("redeem_access_code", { p_code: code }).single();

  if (error) {
    // Les messages métier (code invalide/expiré/déjà utilisé/classe manquante) sont
    // levés côté SQL avec errcode P0001 : on peut les afficher tels quels.
    return { error: error.code === "P0001" ? error.message : "Une erreur est survenue. Réessaie dans un instant." };
  }

  const row = data as { plan_name: string; ends_at: string };
  return { success: { planName: row.plan_name, endsAt: row.ends_at } };
}
