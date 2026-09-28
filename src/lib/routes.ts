/** Routes qui exigent une session, et routes réservées aux visiteurs non connectés. */
const PROTECTED = ["/onboarding", "/tableau-de-bord", "/mot-de-passe/nouveau", "/matieres", "/lecons", "/exercices"];
const GUEST_ONLY = ["/connexion", "/inscription", "/mot-de-passe-oublie"];

const matches = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

export type RouteDecision =
  | { action: "next" }
  | { action: "redirect"; to: string; next?: string };

export function routeDecision(pathname: string, search: string, signedIn: boolean): RouteDecision {
  if (!signedIn && PROTECTED.some((p) => matches(pathname, p))) {
    return { action: "redirect", to: "/connexion", next: pathname + search };
  }
  if (signedIn && GUEST_ONLY.some((p) => matches(pathname, p))) {
    return { action: "redirect", to: "/tableau-de-bord" };
  }
  return { action: "next" };
}

/**
 * N'autorise que les chemins relatifs internes (anti « open redirect »).
 * Tout ce qui pointe vers un autre domaine retombe sur la valeur par défaut.
 */
export function safeNext(raw: string | null | undefined, fallback = "/tableau-de-bord"): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  try {
    const url = new URL(raw, "http://internal.invalid");
    if (url.origin !== "http://internal.invalid") return fallback;
    return url.pathname + url.search;
  } catch {
    return fallback;
  }
}
