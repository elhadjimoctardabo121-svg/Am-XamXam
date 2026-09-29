import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin — Paiements" };

type PaymentRow = {
  id: string;
  provider: string;
  amount_fcfa: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  plans: { name: string } | null;
  profiles: { display_name: string } | null;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  success: "Réussi",
  failed: "Échoué",
  refunded: "Remboursé",
};

export default async function AdminPaymentsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("payments")
    .select("id, provider, amount_fcfa, status, created_at, paid_at, plans(name), profiles(display_name)")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (data ?? []) as unknown as PaymentRow[];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Paiements</h1>
      <p className="text-sm text-muted">
        Lecture seule : le statut définitif (réussi/échoué) est écrit uniquement par le webhook PayTech.
      </p>
      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line bg-surface text-left">
              <th className="p-3">Date</th>
              <th className="p-3">Élève</th>
              <th className="p-3">Offre</th>
              <th className="p-3">Montant</th>
              <th className="p-3">Fournisseur</th>
              <th className="p-3">Statut</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b border-line last:border-0">
                <td className="p-3">{new Date(p.created_at).toLocaleString("fr-FR")}</td>
                <td className="p-3">{p.profiles?.display_name ?? "—"}</td>
                <td className="p-3">{p.plans?.name ?? "—"}</td>
                <td className="p-3">{p.amount_fcfa.toLocaleString("fr-FR")} FCFA</td>
                <td className="p-3">{p.provider}</td>
                <td className="p-3">{STATUS_LABELS[p.status] ?? p.status}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-muted">
                  Aucun paiement pour l&apos;instant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
