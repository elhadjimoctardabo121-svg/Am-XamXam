/**
 * Notifie le scénario Make "Confirmations" (code / appareil), qui se charge
 * d'envoyer l'e-mail de confirmation. Ne doit JAMAIS faire échouer
 * l'appelant : l'activation de l'abonnement (déjà faite en base à ce stade)
 * ne dépend pas de Make — au pire l'élève reçoit son accès sans e-mail de
 * confirmation immédiat, ce qui est rattrapable, plutôt que de risquer de
 * casser une activation de code sur une panne externe (cahier des charges,
 * section 35 : gestion des erreurs).
 */
export type ConfirmationEvent =
  | { eventType: "code_activated"; email: string; displayName: string; planName: string; endsAt: string }
  | { eventType: "device_confirmation"; email: string; displayName: string; confirmUrl: string };

export async function notifyMakeConfirmation(event: ConfirmationEvent): Promise<void> {
  const url = process.env.MAKE_CONFIRMATION_WEBHOOK_URL;
  if (!url) return; // pas configuré : silencieux, jamais bloquant.

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: event.eventType,
        email: event.email,
        display_name: event.displayName,
        ...("planName" in event ? { plan_name: event.planName, ends_at: event.endsAt } : {}),
        ...("confirmUrl" in event ? { confirm_url: event.confirmUrl } : {}),
      }),
    });
  } catch {
    // Panne Make/réseau : on avale l'erreur, voir commentaire ci-dessus.
  }
}
