import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AuthShell } from "@/components/ui";
import { ClassPicker } from "@/components/forms";
import { getSupabaseConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Ta classe" };

export default async function OnboardingPage() {
  await connection(); // page privée : jamais prérendue
  if (getSupabaseConfig()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/connexion?next=/onboarding");
    const { data: student } = await supabase.from("students").select("class_id").eq("id", user.id).single();
    if (student?.class_id) redirect("/tableau-de-bord");
  }

  return (
    <AuthShell title="En quelle classe es-tu ?" intro="Nous adaptons les cours et les exercices à ton examen.">
      <ClassPicker />
    </AuthShell>
  );
}
