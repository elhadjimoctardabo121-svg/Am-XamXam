import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/env";
import { routeDecision, DEVICE_GATED, DEVICE_COOKIE } from "@/lib/routes";

const DEVICE_COOKIE_OPTIONS = {
  maxAge: 60 * 60 * 24 * 400,
  sameSite: "lax" as const,
  secure: true,
  httpOnly: true,
  path: "/",
};

/**
 * Rafraîchit la session Supabase à chaque navigation et protège les pages privées.
 * La décision d'accès fine (RLS) reste dans la base : ceci n'est qu'une commodité de navigation.
 */
export async function proxy(request: NextRequest) {
  const config = getSupabaseConfig();
  if (!config) return NextResponse.next();

  // Identifiant d'appareil longue durée, posé dès la première visite (avant même
  // l'inscription) pour que le compte puisse être lié à cet appareil dès sa création.
  // Posé sur `request.cookies` en premier pour que la session Supabase ci-dessous
  // (qui peut reconstruire `response` depuis `request`) le voie déjà présent.
  const isNewDevice = !request.cookies.get(DEVICE_COOKIE)?.value;
  const deviceId = isNewDevice ? crypto.randomUUID() : request.cookies.get(DEVICE_COOKIE)!.value;
  if (isNewDevice) request.cookies.set(DEVICE_COOKIE, deviceId);

  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  // Applique le cookie d'appareil (nouveau) à la réponse finale, quelle qu'elle
  // soit (page, redirection…), puisque `response` peut avoir été reconstruit
  // entre-temps par la session Supabase ci-dessus.
  const finish = (res: NextResponse) => {
    if (isNewDevice) res.cookies.set(DEVICE_COOKIE, deviceId, DEVICE_COOKIE_OPTIONS);
    return res;
  };

  // getClaims vérifie la signature du jeton ; il ne fait pas confiance au simple contenu du cookie.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);

  const { pathname, search } = request.nextUrl;
  const decision = routeDecision(pathname, search, signedIn);
  if (decision.action === "next") {
    // Verrou par appareil : uniquement sur les pages protégées, une fois connecté,
    // et jamais sur la page de vérification elle-même (sinon boucle de redirection).
    if (signedIn && pathname !== "/verification-appareil" && DEVICE_GATED.some((p) => matchesGated(pathname, p))) {
      // En panne (ou fonction pas encore déployée en base) : on n'ouvre pas grand,
      // mais on ne bloque pas non plus tout le monde — l'accès est simplement inchangé.
      const { data: trusted, error: trustError } = await supabase.rpc("is_device_trusted", { p_device_id: deviceId });
      if (!trustError && !trusted) {
        const url = request.nextUrl.clone();
        url.pathname = "/verification-appareil";
        url.search = "";
        url.searchParams.set("next", pathname + search);
        const redirect = NextResponse.redirect(url);
        for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
        return finish(redirect);
      }
    }
    return finish(response);
  }

  const url = request.nextUrl.clone();
  url.pathname = decision.to;
  url.search = "";
  if (decision.next) url.searchParams.set("next", decision.next);
  const redirect = NextResponse.redirect(url);
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
  return finish(redirect);
}

const matchesGated = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)"],
};
