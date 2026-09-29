"use server";

import { aiProvider, type ChatMessage } from "@/lib/ai";
import { createClient } from "@/lib/supabase/server";

const SYSTEM_PROMPT = `Tu es l'assistant pédagogique d'Am-XamXAm, une plateforme sénégalaise qui aide les élèves de Troisième et de Terminale à préparer le BFEM et le BAC (Histoire, Géographie, Éducation civique).
Réponds toujours en français, simplement, avec un niveau adapté à un(e) collégien(ne)/lycéen(ne) sénégalais(e).
Tu peux : expliquer une notion, donner un exemple concret, poser une question pour vérifier la compréhension, proposer un petit exercice, aider à comprendre une correction.
Reste court (quelques phrases ou puces), jamais un pavé de texte.
Tu ne remplaces jamais un enseignant : si la question dépasse le programme ou nécessite un avis humain, dis-le et encourage à en parler à son professeur.`;

const FREE_TRIAL_LIMIT = 5; // à vie, pour un élève sans abonnement — goûter l'assistant avant de payer.
const PREMIUM_DAILY_LIMIT = 30; // par jour, une fois abonné.

export type AssistantResult = { reply: string } | { error: string; locked?: boolean };

/** 5 questions gratuites à vie pour tout élève, puis réservé aux abonnés
 *  Premium (30 messages/jour) — décision produit. Quota pour contrôler la
 *  consommation du quota gratuit Workers AI (cahier des charges, section
 *  26). Aucune conversation n'est stockée (section 37). */
export async function askAssistant(history: ChatMessage[], message: string): Promise<AssistantResult> {
  const text = message.trim();
  if (!text) return { error: "Écris une question." };
  if (text.length > 1000) return { error: "Message trop long (1000 caractères maximum)." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Connecte-toi d'abord." };

  const { data: activeSub } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .gt("ends_at", new Date().toISOString())
    .limit(1)
    .maybeSingle();

  if (!activeSub) {
    const { data: pastUsage } = await supabase.from("ai_usage").select("message_count").eq("user_id", user.id);
    const lifetimeTotal = (pastUsage ?? []).reduce((sum, r) => sum + r.message_count, 0);
    if (lifetimeTotal >= FREE_TRIAL_LIMIT) {
      return {
        error: `Tu as utilisé tes ${FREE_TRIAL_LIMIT} questions gratuites à l'assistant. Abonne-toi pour continuer à en profiter.`,
        locked: true,
      };
    }
  }

  const { data: usage, error: usageError } = await supabase.rpc("increment_ai_usage").single();
  if (usageError || !usage) return { error: "Une erreur est survenue. Réessaie dans un instant." };
  if (activeSub && (usage as { message_count: number }).message_count > PREMIUM_DAILY_LIMIT) {
    return { error: `Limite de ${PREMIUM_DAILY_LIMIT} messages par jour atteinte. Reviens demain !` };
  }

  try {
    const reply = await aiProvider.chat([...history.slice(-8), { role: "user", content: text }], SYSTEM_PROMPT);
    return { reply: reply || "Désolé, je n'ai pas de réponse à te proposer pour l'instant." };
  } catch (err) {
    console.error("askAssistant: aiProvider.chat failed", err);
    return { error: "L'assistant est momentanément indisponible. Réessaie dans un instant." };
  }
}
