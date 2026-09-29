import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AssistantWidget } from "@/components/assistant-widget";
import { ConfigNotice, Logo } from "@/components/ui";
import { getSupabaseConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Sujets BFEM" };

type PaperRow = { id: string; year: number; position: number; title: string; subjects: { name: string } | null };

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

  const { data } = await supabase
    .from("exam_papers")
    .select("id, year, position, title, subjects(name)")
    .eq("class_id", student.class_id)
    .order("year", { ascending: false })
    .order("position");

  const rows = (data ?? []) as unknown as PaperRow[];
  // Groupe par année puis par matière : plusieurs sujets probables peuvent
  // exister pour la même (année, matière).
  const byYear = new Map<number, Map<string, PaperRow[]>>();
  for (const r of rows) {
    const subjectName = r.subjects?.name ?? "";
    const bySubject = byYear.get(r.year) ?? new Map<string, PaperRow[]>();
    const list = bySubject.get(subjectName) ?? [];
    list.push(r);
    bySubject.set(subjectName, list);
    byYear.set(r.year, bySubject);
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
          <p className="rise-2 mt-1 text-white/80">Sujets des sessions précédentes, avec corrigé.</p>
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
            <h2 className="font-bold">BFEM {year}</h2>
            {[...bySubject.entries()].map(([subjectName, papers]) => (
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
