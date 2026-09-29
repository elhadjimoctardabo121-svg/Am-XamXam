import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AssistantWidget } from "@/components/assistant-widget";
import { ConfigNotice, LockedContentNotice, Logo } from "@/components/ui";
import { getSupabaseConfig } from "@/lib/env";
import { renderLessonMarkdown } from "@/lib/markdown";
import { ProtectedContent } from "@/components/protected-content";
import { createClient } from "@/lib/supabase/server";

type Params = { id: string };

type LessonRow = {
  id: string;
  title: string;
  body_md: string;
  chapter_id: string;
  chapters: { title: string; subject_id: string; subjects: { code: string; name: string } } | null;
  exercises: { id: string; position: number; type: string; title: string }[];
  lesson_resources: { id: string; position: number; type: string; title: string; url: string }[];
};

const EXERCISE_TYPE_LABELS: Record<string, string> = {
  dissertation: "Dissertation",
  commentaire: "Commentaire",
  qcm: "QCM",
  quiz: "Quiz éclair",
  autre: "Exercice",
};

const RESOURCE_TYPE_ICONS: Record<string, string> = {
  texte: "📄",
  image: "🖼️",
  video: "🎬",
  audio: "🎧",
  autre: "🔗",
};

export const metadata: Metadata = { title: "Leçon" };

export default async function LessonPage({ params }: { params: Promise<Params> }) {
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
  if (!user) redirect(`/connexion?next=/lecons/${id}`);

  // RLS (lesson_readable) filtre déjà : publiée ET (gratuite OU abonnement actif).
  // Si la leçon n'apparaît pas ici, elle est verrouillée ou inexistante — même écran.
  const { data } = await supabase
    .from("lessons")
    .select(
      "id, title, body_md, chapter_id, chapters(title, subject_id, subjects(code, name)), exercises(id, position, type, title), lesson_resources(id, position, type, title, url)",
    )
    .eq("id", id)
    .single();

  const lesson = data as LessonRow | null;
  if (!lesson) return <LockedContentNotice />;

  const subject = lesson.chapters?.subjects;

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
          {lesson.chapters?.title && (
            <p className="rise text-sm font-bold text-white/80">{lesson.chapters.title}</p>
          )}
          <h1 className="rise-2 text-2xl font-bold sm:text-3xl">{lesson.title}</h1>
        </div>
      </div>

      <main className="mx-auto -mt-6 w-full max-w-2xl flex-1 px-4 pb-10">
        <article className="rounded-3xl border border-line bg-surface p-5 sm:p-7">
          <ProtectedContent>{renderLessonMarkdown(lesson.body_md)}</ProtectedContent>
        </article>

        {lesson.exercises.length > 0 && (
          <section className="mt-4 rounded-3xl border border-line bg-surface p-5 sm:p-7">
            <h2 className="font-bold">S&apos;entraîner sur cette leçon</h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {[...lesson.exercises]
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
          </section>
        )}

        {lesson.lesson_resources.length > 0 && (
          <section className="mt-4 rounded-3xl border border-line bg-surface p-5 sm:p-7">
            <h2 className="font-bold">Pour aller plus loin</h2>
            <ul className="mt-2 flex flex-col gap-2">
              {[...lesson.lesson_resources]
                .sort((a, b) => a.position - b.position)
                .map((r) => (
                  <li key={r.id}>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-bold hover:bg-line/50"
                    >
                      <span aria-hidden="true">{RESOURCE_TYPE_ICONS[r.type] ?? "🔗"}</span>
                      {r.title}
                    </a>
                  </li>
                ))}
            </ul>
          </section>
        )}
      </main>
      <AssistantWidget />
    </>
  );
}
