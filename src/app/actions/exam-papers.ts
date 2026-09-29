"use server";

import { createClient } from "@/lib/supabase/server";

/** Révèle le corrigé d'un sujet d'examen (même principe que revealCorrection
 *  pour les exercices : jamais envoyé au navigateur avant cet appel). */
export async function revealExamPaperCorrection(paperId: string): Promise<{ correctionMd: string } | { error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("exam_papers").select("correction_md").eq("id", paperId).single();
  if (error || !data) return { error: "Sujet introuvable." };
  return { correctionMd: data.correction_md ?? "" };
}
