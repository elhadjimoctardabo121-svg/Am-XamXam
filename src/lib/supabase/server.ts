import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "@/lib/env";

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super("Supabase n'est pas configuré (NEXT_PUBLIC_SUPABASE_URL / clé publique).");
  }
}

/** Client Supabase côté serveur, lié aux cookies de la requête (RLS appliquée avec l'identité de l'utilisateur). */
export async function createClient() {
  const config = getSupabaseConfig();
  if (!config) throw new SupabaseNotConfiguredError();
  const store = await cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Appelé depuis un Server Component : le proxy s'occupe de rafraîchir la session.
        }
      },
    },
  });
}
