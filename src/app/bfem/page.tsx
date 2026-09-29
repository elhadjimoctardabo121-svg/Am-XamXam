import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AssistantWidget } from "@/components/assistant-widget";
import { ConfigNotice, Logo } from "@/components/ui";
import { getSupabaseConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Sujets BFEM" };

type PaperRow = { id: string; year: number; subjects: { name: string } | null };

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
    .select("id, year, subjects(name)")
    .eq("class_id", student.class_id)
    .order("year", { ascending: false });

  const rows = (data ?? []) as unknown as PaperRow[];
  const byYear = new Map<number, PaperRow[]>();
  for (const r of rows) {
    const list = byYear.get(r.year) ?? [];
    list.push(r);
    byYear.set(r.year, list);
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
        {[...byYear.entries()].map(([year, papers]) => (
          <section key={year} className="rounded-2xl border border-line bg-surface p-4">
            <h2 className="font-bold">BFEM {year}</h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {papers.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/bfem/${p.id}`}
                    className="inline-block rounded-full border border-line px-3 py-1 text-sm font-bold hover:bg-line/50"
                  >
                    {p.subjects?.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
      <AssistantWidget />
    </>
  );
}
