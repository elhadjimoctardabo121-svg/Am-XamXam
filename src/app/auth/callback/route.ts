import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/env";
import { DEVICE_COOKIE, safeNext } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

/** Reçoit le lien de confirmation d'e-mail ou de réinitialisation (flux PKCE) et ouvre la session. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code && getSupabaseConfig()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Lie l'appareil qui vient de confirmer l'e-mail : c'est la toute première
      // connexion réelle de ce compte (le cas le plus courant à l'inscription).
      const deviceId = (await cookies()).get(DEVICE_COOKIE)?.value;
      if (deviceId) await supabase.rpc("register_trusted_device", { p_device_id: deviceId });
      return NextResponse.redirect(new URL(next, origin));
    }
  }
  return NextResponse.redirect(new URL("/connexion?erreur=lien", origin));
}
