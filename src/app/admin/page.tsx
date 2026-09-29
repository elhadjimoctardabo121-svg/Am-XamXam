import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin — Tableau de bord" };

function StatCard({ label, value, href }: { label: string; value: string; href?: string }) {
  const content = (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
  return href ? (
    <Link href={href} className="block hover:-translate-y-0.5 transition">
      {content}
    </Link>
  ) : (
    content
  );
}

export default async function AdminHomePage() {
  const supabase = await createClient();

  const [{ count: students }, { count: activeSubs }, { count: pendingPayments }, { data: successPayments }] =
    await Promise.all([
      supabase.from("students").select("id", { count: "exact", head: true }),
      supabase
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .gt("ends_at", new Date().toISOString()),
      supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("payments").select("amount_fcfa").eq("status", "success"),
    ]);

  const revenue = (successPayments ?? []).reduce((sum, p: { amount_fcfa: number }) => sum + p.amount_fcfa, 0);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Vue d&apos;ensemble</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Élèves inscrits" value={String(students ?? 0)} href="/admin/utilisateurs" />
        <StatCard label="Abonnements actifs" value={String(activeSubs ?? 0)} href="/admin/utilisateurs" />
        <StatCard label="Paiements en attente" value={String(pendingPayments ?? 0)} href="/admin/paiements" />
        <StatCard label="Revenu total confirmé" value={`${revenue.toLocaleString("fr-FR")} FCFA`} href="/admin/paiements" />
      </div>

      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="font-bold">Accès rapides</h2>
        <ul className="mt-2 flex flex-col gap-2 text-sm">
          <li>
            <Link href="/admin/contenus" className="font-bold text-brand underline underline-offset-4">
              Contenus
            </Link>{" "}
            — valider/publier chapitres, leçons, exercices ; gérer l&apos;accès gratuit/premium.
          </li>
          <li>
            <Link href="/admin/codes" className="font-bold text-brand underline underline-offset-4">
              Codes d&apos;accès
            </Link>{" "}
            — créer des codes d&apos;abonnement ou cadeau.
          </li>
          <li>
            <Link href="/admin/utilisateurs" className="font-bold text-brand underline underline-offset-4">
              Utilisateurs
            </Link>{" "}
            — rôles, abonnements manuels.
          </li>
        </ul>
      </section>
    </div>
  );
}
