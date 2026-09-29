"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEVICE_COOKIE, safeNext } from "@/lib/routes";
import { siteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { notifyMakeConfirmation } from "@/lib/notify";
import type { ActionState } from "@/lib/validation";

/**
 * Envoie (ou renvoie, dédupliqué côté base sur une fenêtre de 2 minutes) l'e-mail
 * de confirmation pour l'appareil courant. Appelée au premier affichage de la
 * page de vérification, et par le bouton "renvoyer l'e-mail".
 */
export async function sendDeviceConfirmationEmail(next: string): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const deviceId = (await cookies()).get(DEVICE_COOKIE)?.value;
  if (!deviceId) return { error: "Appareil non identifié. Réessaie dans un instant." };

  const { data: trusted } = await supabase.rpc("is_device_trusted", { p_device_id: deviceId });
  if (trusted) redirect(safeNext(next));

  const { data: token, error } = await supabase.rpc("request_device_confirmation", { p_device_id: deviceId });
  if (error || !token) return { error: "Une erreur est survenue. Réessaie dans un instant." };

  const { data: profile } = await supabase.from("profiles").select("email, display_name").eq("id", user.id).single();
  const email = profile?.email ?? user.email;
  if (email) {
    const confirmUrl = `${await siteUrl()}/auth/confirmer-appareil?token=${token}&next=${encodeURIComponent(safeNext(next))}`;
    await notifyMakeConfirmation({
      eventType: "device_confirmation",
      email,
      displayName: profile?.display_name ?? "",
      confirmUrl,
    });
  }
  return { message: "E-mail envoyé." };
}
