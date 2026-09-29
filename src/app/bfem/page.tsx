import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AssistantWidget } from "@/components/assistant-widget";
import { ConfigNotice, Logo } from "@/components/ui";
import { getSupabaseConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Sujets BFEM" };

type PaperRow = {
  id: string;
  year: number;
  position: number;
  title: string;
  subject_id: string;
  subjects: { name: string } | null;
};
type LockedCount = { subject_id: string; year: number; locked_count: number };

export default async function BfemPage() {
  await connection();
  if (!getSupabaseConfig()) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
        <ConfigNotice />
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/bfem");

  const { data: student } = await supabase.from("students").select("class_id").eq("id", user.id).single();
  if (!student?.class_id) redirect("/onboarding");

  const [{ data }, { data: subjects }, { data: locked }] = await Promise.all([
    supabase
      .from("exam_papers")
      .select("id, year, position, title, subject_id, subjects(name)")
      .eq("class_id", student.class_id)
      .order("year", { ascending: false })
      .order("position"),
    supabase.from("subjects").select("id, name"),
    supabase.rpc("exam_papers_locked_counts", { p_class_id: student.class_id }),
  ]);

  const rows = (data ?? []) as unknown as PaperRow[];
  const subjectNameById = new Map((subjects ?? []).map((s) => [s.id, s.name] as const));
  const lockedRows = (locked ?? []) as LockedCount[];

  // Groupe par année puis par matière : plusieurs sujets probables peuvent
  // exister pour la même (année, matière). On inclut aussi les groupes qui
  // n'ont AUCUN sujet accessible mais dont des sujets premium existent
  // (verrouillés, jamais totalement invisibles — même logique que les leçons).
  const byYear = new Map<number, Map<string, { papers: PaperRow[]; lockedCount: number }>>();
  const group = (year: number, subjectName: string) => {
    const bySubject = byYear.get(year) ?? new Map<string, { papers: PaperRow[]; lockedCount: number }>();
    const entry = bySubject.get(subjectName) ?? { papers: [], lockedCount: 0 };
    bySubject.set(subjectName, entry);
    byYear.set(year, bySubject);
    return entry;
  };
  for (const r of rows) group(r.year, r.subjects?.name ?? "").papers.push(r);
  for (const l of lockedRows) {
    const subjectName = subjectNameById.get(l.subject_id) ?? "";
    group(l.year, subjectName).lockedCount = l.locked_count;
  }

  return (
    <>
      <div className="hero-bg pb-10">
        <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-4">
          <Link href="/tableau-de-bord" aria-label="Accueil">
            <Logo tone="light" />
          </Link>
          <Link href="/tableau-de-bord" className="text-sm font-bold text-white underline underline-offset-4">
            ← Tableau de bord
          </Link>
        </header>
        <div className="mx-auto w-full max-w-2xl px-4 pt-4">
          <h1 className="rise text-2xl font-bold sm:text-3xl">Sujets BFEM</h1>
          <p className="rise-2 mt-1 text-white/80">Sujets probables, avec corrigé, pour t&apos;entraîner avant l&apos;examen.</p>
        </div>
      </div>

      <main className="mx-auto -mt-6 flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pb-10">
        {byYear.size === 0 && (
          <p className="rounded-2xl border border-line bg-surface p-5 text-muted">
            Aucun sujet disponible pour l&apos;instant. Reviens bientôt.
          </p>
        )}
        {[...byYear.entries()].map(([year, bySubject]) => (
          <section key={year} className="rounded-2xl border border-line bg-surface p-4">
            <h2 className="font-bold">Sujets probables</h2>
            {[...bySubject.entries()].map(([subjectName, { papers, lockedCount }]) => (
              <div key={subjectName} className="mt-3 first:mt-2">
                <h3 className="text-sm font-bold text-muted">{subjectName}</h3>
                <ul className="mt-1 flex flex-col gap-1">
                  {papers.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/bfem/${p.id}`}
                        className="block rounded-xl px-2 py-2 text-sm hover:bg-line/50"
                      >
                        {p.title}
                      </Link>
                    </li>
                  ))}
                  {lockedCount > 0 && (
                    <li>
                      <Link
                        href="/tarifs"
                        className="flex items-center justify-between rounded-xl bg-brand-soft px-2 py-2 text-sm font-bold hover:brightness-95"
                      >
                        <span aria-hidden="true">🔒</span> {lockedCount} sujet{lockedCount > 1 ? "s" : ""} de plus
                        réservé{lockedCount > 1 ? "s" : ""} aux abonnés
                        <span className="text-brand">Débloquer →</span>
                      </Link>
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </section>
        ))}
      </main>
      <AssistantWidget />
    </>
  );
}
