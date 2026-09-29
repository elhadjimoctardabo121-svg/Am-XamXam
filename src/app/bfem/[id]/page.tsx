import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { revealExamPaperCorrection } from "@/app/actions/exam-papers";
import { ExercisePlayer } from "@/components/exercise-player";
import { ConfigNotice, Logo } from "@/components/ui";
import { getSupabaseConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type Params = { id: string };

export const metadata: Metadata = { title: "Sujet BFEM" };

type PaperRow = {
  id: string;
  year: number;
  statement_md: string;
  subjects: { code: string; name: string } | null;
};

export default async function BfemPaperPage({ params }: { params: Promise<Params> }) {
  await connection();
  const { id } = await params;

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
  if (!user) redirect(`/connexion?next=/bfem/${id}`);

  // RLS filtre déjà l'accès (publié + gratuit ou abonnement actif) ; le
  // corrigé n'est demandé au serveur qu'au moment où l'élève le révèle.
  const { data } = await supabase
    .from("exam_papers")
    .select("id, year, statement_md, subjects(code, name)")
    .eq("id", id)
    .single();

  const paper = data as PaperRow | null;
  if (!paper) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-4 py-8 text-center">
        <p className="text-lg font-bold">Contenu non disponible</p>
        <p className="text-muted">
          Ce sujet n&apos;existe pas, ou nécessite un abonnement actif pour être consulté.
        </p>
        <Link href="/bfem" className="font-bold text-brand underline underline-offset-4">
          Retour aux sujets BFEM
        </Link>
      </main>
    );
  }

  return (
    <>
      <div className="hero-bg pb-10">
        <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-4">
          <Link href="/tableau-de-bord" aria-label="Accueil">
            <Logo tone="light" />
          </Link>
          <Link href="/bfem" className="text-sm font-bold text-white underline underline-offset-4">
            ← Sujets BFEM
          </Link>
        </header>
        <div className="mx-auto w-full max-w-2xl px-4 pt-2">
          <p className="rise text-sm font-bold text-white/80">BFEM {paper.year}</p>
          <h1 className="rise-2 text-2xl font-bold sm:text-3xl">{paper.subjects?.name}</h1>
        </div>
      </div>

      <main className="mx-auto -mt-6 w-full max-w-2xl flex-1 px-4 pb-10">
        <div className="rounded-3xl border border-line bg-surface p-5 sm:p-7">
          <ExercisePlayer
            type="autre"
            exerciseId={paper.id}
            statementMd={paper.statement_md}
            reveal={revealExamPaperCorrection}
          />
        </div>
      </main>
    </>
  );
}
