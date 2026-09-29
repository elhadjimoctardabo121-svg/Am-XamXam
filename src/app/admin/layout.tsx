import type { ReactNode } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { signOut } from "@/app/actions/auth";
import { requireStaff } from "@/lib/admin";
import { ConfigNotice, Logo } from "@/components/ui";
import { getSupabaseConfig } from "@/lib/env";

const NAV = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/contenus", label: "Contenus" },
  { href: "/admin/codes", label: "Codes d'accès" },
  { href: "/admin/utilisateurs", label: "Utilisateurs" },
  { href: "/admin/paiements", label: "Paiements" },
] as const;

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await connection();
  if (!getSupabaseConfig()) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
        <ConfigNotice />
      </main>
    );
  }

  const staff = await requireStaff();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/admin" aria-label="Admin — accueil">
              <Logo />
            </Link>
            <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-ink">
              {staff.role === "admin" ? "Administrateur" : "Éditeur"} · {staff.displayName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/tableau-de-bord" className="min-h-11 content-center text-sm font-bold text-brand underline underline-offset-4">
              ← Retour au site
            </Link>
            <form action={signOut}>
              <button type="submit" className="min-h-11 rounded-xl border border-line px-3 text-sm font-bold hover:bg-line/40">
                Me déconnecter
              </button>
            </form>
          </div>
        </div>
        <nav className="mx-auto w-full max-w-5xl overflow-x-auto px-4 pb-2">
          <ul className="flex gap-1 text-sm font-bold">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="inline-block min-h-11 content-center rounded-xl px-3 hover:bg-line/40">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
