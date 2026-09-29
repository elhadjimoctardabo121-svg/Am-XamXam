import type { Metadata } from "next";
import Link from "next/link";
import { ContentRowForm } from "@/components/forms";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin — Contenus" };

type ChapterRow = {
  id: string;
  title: string;
  position: number;
  status: string;
  access_tier: string;
  classes: { name: string } | null;
  subjects: { name: string } | null;
};

export default async function AdminContentPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("chapters")
    .select("id, title, position, status, access_tier, classes(name), subjects(name)")
    .order("position");

  const rows = (data ?? []) as unknown as ChapterRow[];
  rows.sort((a, b) => {
    const cls = (a.classes?.name ?? "").localeCompare(b.classes?.name ?? "");
    if (cls !== 0) return cls;
    const subj = (a.subjects?.name ?? "").localeCompare(b.subjects?.name ?? "");
    if (subj !== 0) return subj;
    return a.position - b.position;
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Contenus</h1>
      <p className="text-sm text-muted">
        Change le statut (brouillon → relecture → validé → publié) et l&apos;accès (gratuit/premium). Un
        contenu doit être <strong>validé</strong> avant de pouvoir être <strong>publié</strong>, et seul un
        administrateur peut publier.
      </p>
      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line bg-surface text-left">
              <th className="p-3">Classe</th>
              <th className="p-3">Matière</th>
              <th className="p-3">Chapitre</th>
              <th className="p-3">Statut / accès</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-b border-line last:border-0">
                <td className="p-3">{c.classes?.name}</td>
                <td className="p-3">{c.subjects?.name}</td>
                <td className="p-3">
                  <Link href={`/admin/contenus/${c.id}`} className="font-bold text-brand underline underline-offset-4">
                    {c.title}
                  </Link>
                </td>
                <td className="p-3">
                  <ContentRowForm
                    table="chapters"
                    id={c.id}
                    status={c.status}
                    accessTier={c.access_tier}
                    returnPath="/admin/contenus"
                  />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-muted">
                  Aucun chapitre pour l&apos;instant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
