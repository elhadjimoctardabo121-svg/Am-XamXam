import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/env";
import { routeDecision } from "@/lib/routes";

/**
 * Rafraîchit la session Supabase à chaque navigation et protège les pages privées.
 * La décision d'accès fine (RLS) reste dans la base : ceci n'est qu'une commodité de navigation.
 */
export async function proxy(request: NextRequest) {
  const config = getSupabaseConfig();
  if (!config) return NextResponse.next();

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

  // getClaims vérifie la signature du jeton ; il ne fait pas confiance au simple contenu du cookie.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);

  const { pathname, search } = request.nextUrl;
  const decision = routeDecision(pathname, search, signedIn);
  if (decision.action === "next") return response;

  const url = request.nextUrl.clone();
  url.pathname = decision.to;
  url.search = "";
  if (decision.next) url.searchParams.set("next", decision.next);
  const redirect = NextResponse.redirect(url);
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)"],
};
