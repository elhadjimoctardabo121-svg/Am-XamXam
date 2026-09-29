import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminConfig } from "@/lib/env";

/**
 * Client Supabase avec la clé service_role : contourne les RLS. À n'utiliser
 * QUE dans des routes serveur qui vérifient elles-mêmes l'authenticité de
 * l'appelant par un autre moyen (ex. signature IPN PayTech) — jamais dans
 * une Server Action déclenchée par un élève.
 */
export function createAdminClient() {
  const config = getSupabaseAdminConfig();
  if (!config) return null;
  return createSupabaseClient(config.url, config.key, { auth: { persistSession: false } });
}
