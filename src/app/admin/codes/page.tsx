import type { Metadata } from "next";
import { CreateAccessCodeForm, ToggleAccessCodeForm } from "@/components/forms";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin — Codes d'accès" };

type CodeRow = {
  id: string;
  code: string;
  type: string;
  active: boolean;
  max_uses: number;
  uses_count: number;
  expires_at: string | null;
  plans: { name: string } | null;
  subjects: { name: string } | null;
};

export default async function AdminCodesPage() {
  const supabase = await createClient();
  const [{ data: codes }, { data: plans }, { data: subjects }] = await Promise.all([
    supabase
      .from("access_codes")
      .select("id, code, type, active, max_uses, uses_count, expires_at, plans(name), subjects(name)")
      .order("created_at", { ascending: false }),
    supabase.from("plans").select("id, name, scope").eq("active", true).order("position"),
    supabase.from("subjects").select("id, name").order("position"),
  ]);

  const rows = (codes ?? []) as unknown as CodeRow[];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Codes d&apos;accès</h1>
      <CreateAccessCodeForm plans={plans ?? []} subjects={subjects ?? []} />

      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line bg-surface text-left">
              <th className="p-3">Code</th>
              <th className="p-3">Offre</th>
              <th className="p-3">Utilisations</th>
              <th className="p-3">Expire</th>
              <th className="p-3">Statut</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-b border-line last:border-0">
                <td className="p-3 font-mono font-bold">{c.code}</td>
                <td className="p-3">
                  {c.plans?.name}
                  {c.subjects?.name ? ` (${c.subjects.name})` : ""}
                </td>
                <td className="p-3">
                  {c.uses_count} / {c.max_uses}
                </td>
                <td className="p-3">{c.expires_at ? new Date(c.expires_at).toLocaleDateString("fr-FR") : "—"}</td>
                <td className="p-3">{c.active ? "Actif" : "Désactivé"}</td>
                <td className="p-3">
                  <ToggleAccessCodeForm id={c.id} active={c.active} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-muted">
                  Aucun code créé pour l&apos;instant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
