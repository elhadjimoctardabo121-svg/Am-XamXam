import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { ConfigNotice, Logo } from "@/components/ui";
import { getSupabaseConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const SUBJECT_NAMES: Record<string, string> = {
  histoire: "Histoire",
  geographie: "Géographie",
  "education-civique": "Éducation civique",
};

type Params = { subject: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { subject } = await params;
  return { title: SUBJECT_NAMES[subject] ?? "Matière" };
}

type ChapterRow = {
  id: string;
  slug: string;
  title: string;
  position: number;
  lessons: { id: string; level: number; title: string }[];
  exercises: { id: string; position: number; type: string; title: string }[];
};

const EXERCISE_TYPE_LABELS: Record<string, string> = {
  dissertation: "Dissertation",
  commentaire: "Commentaire",
  qcm: "QCM",
  quiz: "Quiz éclair",
  autre: "Exercice",
};

export default async function SubjectPage({ params }: { params: Promise<Params> }) {
  await connection();
  const { subject } = await params;
  const subjectName = SUBJECT_NAMES[subject];
  if (!subjectName) notFound();

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
  if (!user) redirect(`/connexion?next=/matieres/${subject}`);

  const { data: student } = await supabase.from("students").select("class_id").eq("id", user.id).single();
  if (!student?.class_id) redirect("/onboarding");

  const { data: chapters } = await supabase
    .from("chapters")
    .select("id, slug, title, position, lessons(id, level, title), exercises(id, position, type, title)")
    .eq("subject_id", (await supabase.from("subjects").select("id").eq("code", subject).single()).data?.id)
    .eq("class_id", student.class_id)
    .order("position");

  const rows = (chapters ?? []) as ChapterRow[];

  return (
    <>
      <div className="hero-bg pb-10">
        <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/tableau-de-bord" aria-label="Accueil">
            <Logo tone="light" />
          </Link>
          <Link href="/tableau-de-bord" className="text-sm font-bold text-white underline underline-offset-4">
            ← Tableau de bord
          </Link>
        </header>
        <div className="mx-auto w-full max-w-3xl px-4 pt-4">
          <h1 className="rise text-2xl font-bold sm:text-3xl">{subjectName}</h1>
        </div>
      </div>

      <main className="mx-auto -mt-6 flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 pb-10">
        {rows.length === 0 && (
          <p className="rounded-2xl border border-line bg-surface p-5 text-muted">
            Aucun chapitre disponible pour l&apos;instant. Reviens bientôt.
          </p>
        )}
        {rows.map((chapter) => (
          <section key={chapter.id} className="rounded-2xl border border-line bg-surface p-4">
            <h2 className="font-bold">{chapter.title}</h2>
            <ul className="mt-2 flex flex-col gap-1">
              {[...chapter.lessons]
                .sort((a, b) => a.level - b.level)
                .map((lesson) => (
                  <li key={lesson.id}>
                    <Link
                      href={`/lecons/${lesson.id}`}
                      className="block rounded-xl px-2 py-2 text-sm hover:bg-line/50"
                    >
                      Leçon {lesson.level} — {lesson.title}
                    </Link>
                  </li>
                ))}
              {chapter.lessons.length === 0 && (
                <li className="px-2 py-1 text-sm text-muted">
                  Leçons à venir, ou réservées aux abonnés Am-XamXAm.
                </li>
              )}
            </ul>

            {chapter.exercises.length > 0 && (
              <>
                <h3 className="mt-3 text-sm font-bold text-muted">Exercices</h3>
                <ul className="mt-1 flex flex-wrap gap-2">
                  {[...chapter.exercises]
                    .sort((a, b) => a.position - b.position)
                    .map((ex) => (
                      <li key={ex.id}>
                        <Link
                          href={`/exercices/${ex.id}`}
                          className="inline-block rounded-full border border-line px-3 py-1 text-xs font-bold hover:bg-line/50"
                        >
                          {EXERCISE_TYPE_LABELS[ex.type] ?? ex.type}
                        </Link>
                      </li>
                    ))}
                </ul>
              </>
            )}
          </section>
        ))}
      </main>
    </>
  );
}
