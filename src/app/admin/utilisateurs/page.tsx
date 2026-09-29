import type { Metadata } from "next";
import { Alert } from "@/components/ui";
import { CancelSubscriptionForm, GrantSubscriptionForm, SetRoleForm } from "@/components/forms";
import { requireStaff } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin — Utilisateurs" };

type StudentRow = {
  id: string;
  class_id: string | null;
  classes: { name: string } | null;
  profiles: { display_name: string; role: string } | null;
};

type SubscriptionRow = {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  ends_at: string;
  subjects: { name: string } | null;
};

export default async function AdminUsersPage() {
  const staff = await requireStaff();
  if (staff.role !== "admin") {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Utilisateurs</h1>
        <Alert tone="info">
          Réservé aux administrateurs : un éditeur ne voit que son propre profil (RLS). Demande à un admin.
        </Alert>
      </div>
    );
  }

  const supabase = await createClient();
  const [{ data: students }, { data: subs }, { data: plans }, { data: subjects }] = await Promise.all([
    supabase.from("students").select("id, class_id, classes(name), profiles(display_name, role)"),
    supabase
      .from("subscriptions")
      .select("id, user_id, plan, status, ends_at, subjects(name)")
      .order("ends_at", { ascending: false }),
    supabase.from("plans").select("id, name, scope").eq("active", true).order("position"),
    supabase.from("subjects").select("id, name").order("position"),
  ]);

  const rows = (students ?? []) as unknown as StudentRow[];
  const subsByUser = new Map<string, SubscriptionRow[]>();
  for (const s of (subs ?? []) as unknown as SubscriptionRow[]) {
    const list = subsByUser.get(s.user_id) ?? [];
    list.push(s);
    subsByUser.set(s.user_id, list);
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Utilisateurs</h1>
      <ul className="flex flex-col gap-4">
        {rows.map((s) => {
          const subscriptions = subsByUser.get(s.id) ?? [];
          return (
            <li key={s.id} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold">{s.profiles?.display_name || "(sans nom)"}</p>
                  <p className="text-sm text-muted">{s.classes?.name ?? "Classe non choisie"}</p>
                </div>
                <SetRoleForm userId={s.id} role={s.profiles?.role ?? "student"} />
              </div>

              <div className="mt-3 border-t border-line pt-3">
                <p className="text-sm font-bold text-muted">Abonnements</p>
                <ul className="mt-1 flex flex-col gap-1">
                  {subscriptions.map((sub) => (
                    <li key={sub.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span>
                        {sub.plan}
                        {sub.subjects?.name ? ` (${sub.subjects.name})` : ""} — {sub.status} — jusqu&apos;au{" "}
                        {new Date(sub.ends_at).toLocaleDateString("fr-FR")}
                      </span>
                      {sub.status === "active" && <CancelSubscriptionForm id={sub.id} />}
                    </li>
                  ))}
                  {subscriptions.length === 0 && <li className="text-sm text-muted">Aucun abonnement.</li>}
                </ul>
                <div className="mt-2">
                  <GrantSubscriptionForm userId={s.id} plans={plans ?? []} subjects={subjects ?? []} />
                </div>
              </div>
            </li>
          );
        })}
        {rows.length === 0 && <li className="text-muted">Aucun élève inscrit pour l&apos;instant.</li>}
      </ul>
    </div>
  );
}
