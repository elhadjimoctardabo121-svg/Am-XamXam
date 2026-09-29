import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { signOut } from "@/app/actions/auth";
import { AssistantWidget } from "@/components/assistant-widget";
import { ConfigNotice, Logo } from "@/components/ui";
import { getSupabaseConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Tableau de bord" };

const SUBJECT_ACCENT: Record<string, { emoji: string; bar: string }> = {
  histoire: { emoji: "📜", bar: "bg-histoire" },
  geographie: { emoji: "🌍", bar: "bg-geographie" },
  "education-civique": { emoji: "⚖️", bar: "bg-civique" },
};

type StudentRow = {
  class_id: string | null;
  classes: { name: string; exam: string } | null;
  profiles: { display_name: string } | null;
};

export default async function DashboardPage() {
  await connection(); // page privée : jamais prérendue, quelle que soit la config au moment du build
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
  if (!user) redirect("/connexion?next=/tableau-de-bord");

  const { data } = await supabase
    .from("students")
    .select("class_id, classes(name, exam), profiles(display_name)")
    .eq("id", user.id)
    .single();
  const student = data as StudentRow | null;
  if (!student?.class_id) redirect("/onboarding");

  const { data: subjects } = await supabase.from("subjects").select("code, name").order("position");
  const firstName = student.profiles?.display_name || "toi";

  return (
    <>
      <div className="hero-bg pb-14">
        <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/tableau-de-bord" aria-label="Accueil">
            <Logo tone="light" />
          </Link>
          <form action={signOut}>
            <button type="submit" className="min-h-11 rounded-xl border border-white/30 px-3 text-sm font-bold text-white hover:bg-white/10">
              Me déconnecter
            </button>
          </form>
        </header>
        <div className="mx-auto w-full max-w-3xl px-4 pt-4">
          <h1 className="rise text-2xl font-bold sm:text-3xl">Bonjour {firstName} 👋</h1>
          <p className="rise-2 mt-1 inline-block rounded-full bg-white/10 px-3 py-1 text-sm font-bold ring-1 ring-white/25">
            {student.classes?.name} · préparation au {student.classes?.exam}
          </p>
        </div>
      </div>

      <main className="mx-auto -mt-8 flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pb-10">
        <section aria-labelledby="progression">
          <h2 id="progression" className="text-lg font-bold">
            Tes matières
          </h2>
          <ul className="mt-3 flex flex-col gap-3">
            {(subjects ?? []).map((s: { code: string; name: string }) => {
              const accent = SUBJECT_ACCENT[s.code] ?? { emoji: "📚", bar: "bg-brand" };
              return (
                <li key={s.code} className="relative overflow-hidden rounded-2xl border border-line bg-surface">
                  <span className={`absolute inset-y-0 left-0 w-1.5 ${accent.bar}`} aria-hidden="true" />
                  <Link
                    href={`/matieres/${s.code}`}
                    className="flex items-center justify-between p-4 pl-5 hover:bg-line/40"
                  >
                    <span className="font-bold">
                      <span aria-hidden="true">{accent.emoji}</span> {s.name}
                    </span>
                    <span className="text-sm text-muted">Voir les chapitres →</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="bfem">
          <h2 id="bfem" className="text-lg font-bold">
            Entraînement examen
          </h2>
          <Link
            href="/bfem"
            className="mt-3 flex items-center justify-between rounded-2xl border border-line bg-surface p-4 hover:bg-line/40"
          >
            <span className="font-bold">
              <span aria-hidden="true">📄</span> Sujets BFEM
            </span>
            <span className="text-sm text-muted">Voir les sessions précédentes →</span>
          </Link>
        </section>
      </main>
      <AssistantWidget />
    </>
  );
}
