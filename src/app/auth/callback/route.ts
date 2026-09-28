import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/env";
import { safeNext } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

/** Reçoit le lien de confirmation d'e-mail ou de réinitialisation (flux PKCE) et ouvre la session. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code && getSupabaseConfig()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }
  return NextResponse.redirect(new URL("/connexion?erreur=lien", origin));
}
