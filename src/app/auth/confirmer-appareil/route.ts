import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/env";
import { DEVICE_COOKIE, safeNext } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

/**
 * Valide le lien de confirmation d'appareil. Le token seul ne suffit pas : le
 * cookie d'appareil du navigateur qui ouvre ce lien doit correspondre à celui
 * qui a fait la demande (voir confirm_device en base) — c'est ce qui rend le
 * lien non partageable, pas seulement son caractère à usage unique.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const token = searchParams.get("token");
  const next = safeNext(searchParams.get("next"));

  if (token && getSupabaseConfig()) {
    const supabase = await createClient();
    const deviceId = (await cookies()).get(DEVICE_COOKIE)?.value;
    if (deviceId) {
      const { data: ok } = await supabase.rpc("confirm_device", { p_token: token, p_device_id: deviceId });
      if (ok) return NextResponse.redirect(new URL(next, origin));
    }
  }
  return NextResponse.redirect(new URL("/verification-appareil?erreur=lien", origin));
}
