import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ConfigNotice, Logo } from "@/components/ui";
import { getSupabaseConfig } from "@/lib/env";
import { renderLessonMarkdown } from "@/lib/markdown";
import { createClient } from "@/lib/supabase/server";

type Params = { id: string };

const TYPE_LABELS: Record<string, string> = {
  dissertation: "Dissertation",
  commentaire: "Commentaire de document",
  qcm: "QCM",
  quiz: "Quiz éclair",
  autre: "Exercice",
};

type ExerciseRow = {
  id: string;
  title: string;
  type: string;
  statement_md: string;
  correction_md: string;
  chapters: { title: string; subject_id: string; subjects: { code: string; name: string } } | null;
};

export const metadata: Metadata = { title: "Exercice" };

export default async function ExercisePage({ params }: { params: Promise<Params> }) {
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
  if (!user) redirect(`/connexion?next=/exercices/${id}`);

  // RLS (lesson_readable, réutilisée pour les exercices) filtre déjà l'accès.
  const { data } = await supabase
    .from("exercises")
    .select("id, title, type, statement_md, correction_md, chapters(title, subject_id, subjects(code, name))")
    .eq("id", id)
    .single();

  const exercise = data as ExerciseRow | null;
  if (!exercise) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-4 py-8 text-center">
        <p className="text-lg font-bold">Contenu non disponible</p>
        <p className="text-muted">
          Cet exercice n&apos;existe pas, ou nécessite un abonnement actif pour être consulté.
        </p>
        <Link href="/tableau-de-bord" className="font-bold text-brand underline underline-offset-4">
          Retour au tableau de bord
        </Link>
      </main>
    );
  }

  const subject = exercise.chapters?.subjects;

  return (
    <>
      <div className="hero-bg pb-10">
        <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-4">
          <Link href="/tableau-de-bord" aria-label="Accueil">
            <Logo tone="light" />
          </Link>
          {subject && (
            <Link
              href={`/matieres/${subject.code}`}
              className="text-sm font-bold text-white underline underline-offset-4"
            >
              ← {subject.name}
            </Link>
          )}
        </header>
        <div className="mx-auto w-full max-w-2xl px-4 pt-2">
          {exercise.chapters?.title && (
            <p className="rise text-sm font-bold text-white/80">{exercise.chapters.title}</p>
          )}
          <h1 className="rise-2 text-2xl font-bold sm:text-3xl">{exercise.title}</h1>
          <span className="rise-2 mt-1 inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-bold ring-1 ring-white/25">
            {TYPE_LABELS[exercise.type] ?? exercise.type}
          </span>
        </div>
      </div>

      <main className="mx-auto -mt-6 w-full max-w-2xl flex-1 px-4 pb-10">
        <article className="rounded-3xl border border-line bg-surface p-5 sm:p-7">
          {renderLessonMarkdown(exercise.statement_md)}
        </article>

        {exercise.correction_md && (
          <details className="mt-4 rounded-3xl border border-line bg-surface p-5 sm:p-7">
            <summary className="cursor-pointer font-bold text-brand">Voir le corrigé</summary>
            <div className="mt-3">{renderLessonMarkdown(exercise.correction_md)}</div>
          </details>
        )}
      </main>
    </>
  );
}
