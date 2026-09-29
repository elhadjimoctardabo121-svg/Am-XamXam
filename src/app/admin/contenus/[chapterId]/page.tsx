import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentRowForm, CreateLessonResourceForm, DeleteLessonResourceForm } from "@/components/forms";
import { createClient } from "@/lib/supabase/server";

type Params = { chapterId: string };

export const metadata: Metadata = { title: "Admin — Chapitre" };

const EXERCISE_TYPE_LABELS: Record<string, string> = {
  dissertation: "Dissertation",
  commentaire: "Commentaire",
  qcm: "QCM",
  quiz: "Quiz éclair",
  autre: "Exercice",
};

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  texte: "Texte",
  image: "Image",
  video: "Vidéo",
  audio: "Audio",
  autre: "Autre",
};

export default async function AdminChapterPage({ params }: { params: Promise<Params> }) {
  const { chapterId } = await params;
  const supabase = await createClient();

  const { data: chapter } = await supabase
    .from("chapters")
    .select("id, title, status, access_tier, classes(name), subjects(name)")
    .eq("id", chapterId)
    .single();
  if (!chapter) notFound();

  const [{ data: lessons }, { data: exercises }] = await Promise.all([
    supabase
      .from("lessons")
      .select(
        "id, level, title, status, access_tier, exercises(id, position, type, title, status, access_tier), lesson_resources(id, position, type, title, url)",
      )
      .eq("chapter_id", chapterId)
      .order("level"),
    supabase
      .from("exercises")
      .select("id, position, type, title, status, access_tier")
      .eq("chapter_id", chapterId)
      .order("position"),
  ]);

  const returnPath = `/admin/contenus/${chapterId}`;
  const c = chapter as unknown as {
    id: string;
    title: string;
    status: string;
    access_tier: string;
    classes: { name: string } | null;
    subjects: { name: string } | null;
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/contenus" className="text-sm font-bold text-brand underline underline-offset-4">
          ← Tous les contenus
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{c.title}</h1>
        <p className="text-sm text-muted">
          {c.classes?.name} · {c.subjects?.name}
        </p>
        <div className="mt-2">
          <ContentRowForm table="chapters" id={c.id} status={c.status} accessTier={c.access_tier} returnPath={returnPath} />
        </div>
      </div>

      <section>
        <h2 className="font-bold">Leçons</h2>
        <ul className="mt-2 flex flex-col gap-3">
          {(lessons ?? []).map((l) => (
            <li key={l.id} className="rounded-xl border border-line bg-surface p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  Leçon {l.level} — {l.title}
                </span>
                <ContentRowForm table="lessons" id={l.id} status={l.status} accessTier={l.access_tier} returnPath={returnPath} />
              </div>
              {l.exercises.length > 0 && (
                <ul className="mt-2 flex flex-col gap-2 border-t border-line pt-2">
                  {l.exercises.map((e) => (
                    <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 pl-4 text-sm">
                      <span>
                        Exercice de leçon — {EXERCISE_TYPE_LABELS[e.type] ?? e.type} — {e.title}
                      </span>
                      <ContentRowForm table="exercises" id={e.id} status={e.status} accessTier={e.access_tier} returnPath={returnPath} />
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-2 border-t border-line pt-2">
                <p className="pl-4 text-xs font-bold text-muted">Ressources complémentaires</p>
                {l.lesson_resources.length > 0 && (
                  <ul className="mt-1 flex flex-col gap-1">
                    {l.lesson_resources.map((r) => (
                      <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 pl-4 text-sm">
                        <span>
                          {RESOURCE_TYPE_LABELS[r.type] ?? r.type} — {r.title}
                        </span>
                        <DeleteLessonResourceForm id={r.id} returnPath={returnPath} />
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-1">
                  <CreateLessonResourceForm lessonId={l.id} returnPath={returnPath} />
                </div>
              </div>
            </li>
          ))}
          {(lessons ?? []).length === 0 && <li className="text-sm text-muted">Aucune leçon.</li>}
        </ul>
      </section>

      <section>
        <h2 className="font-bold">Exercices de chapitre</h2>
        <ul className="mt-2 flex flex-col gap-2">
          {(exercises ?? []).map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface p-3">
              <span>
                {EXERCISE_TYPE_LABELS[e.type] ?? e.type} — {e.title}
              </span>
              <ContentRowForm table="exercises" id={e.id} status={e.status} accessTier={e.access_tier} returnPath={returnPath} />
            </li>
          ))}
          {(exercises ?? []).length === 0 && <li className="text-sm text-muted">Aucun exercice.</li>}
        </ul>
      </section>
    </div>
  );
}
