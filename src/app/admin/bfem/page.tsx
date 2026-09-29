import type { Metadata } from "next";
import { ContentRowForm, CreateExamPaperForm } from "@/components/forms";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin — Sujets BFEM" };

type PaperRow = {
  id: string;
  year: number;
  position: number;
  title: string;
  status: string;
  access_tier: string;
  classes: { name: string } | null;
  subjects: { name: string } | null;
};

export default async function AdminBfemPage() {
  const supabase = await createClient();
  const [{ data: papers }, { data: classes }, { data: subjects }] = await Promise.all([
    supabase
      .from("exam_papers")
      .select("id, year, position, title, status, access_tier, classes(name), subjects(name)")
      .order("year", { ascending: false })
      .order("position"),
    supabase.from("classes").select("id, name").order("position"),
    supabase.from("subjects").select("id, name").order("position"),
  ]);

  const rows = (papers ?? []) as unknown as PaperRow[];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Sujets BFEM</h1>
      <CreateExamPaperForm classes={classes ?? []} subjects={subjects ?? []} />

      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line bg-surface text-left">
              <th className="p-3">Année</th>
              <th className="p-3">Classe</th>
              <th className="p-3">Matière</th>
              <th className="p-3">Titre</th>
              <th className="p-3">Statut / accès</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b border-line last:border-0">
                <td className="p-3 font-bold">{p.year}</td>
                <td className="p-3">{p.classes?.name}</td>
                <td className="p-3">{p.subjects?.name}</td>
                <td className="p-3">{p.title}</td>
                <td className="p-3">
                  <ContentRowForm
                    table="exam_papers"
                    id={p.id}
                    status={p.status}
                    accessTier={p.access_tier}
                    returnPath="/admin/bfem"
                  />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-muted">
                  Aucun sujet pour l&apos;instant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
