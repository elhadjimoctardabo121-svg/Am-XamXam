export type SupabaseConfig = { url: string; key: string };

/** Renvoie null si Supabase n'est pas configuré (l'app affiche alors un message clair au lieu de planter). */
export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}

/**
 * Clé service_role : contourne les RLS. Réservée aux routes serveur non
 * authentifiées appelées par un tiers de confiance (ex. le webhook IPN de
 * PayTech) — jamais exposée au navigateur, jamais utilisée dans une Server
 * Action déclenchée directement par un élève.
 */
export function getSupabaseAdminConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}
