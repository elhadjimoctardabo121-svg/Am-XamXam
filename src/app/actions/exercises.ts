"use server";

import { createClient } from "@/lib/supabase/server";

type QcmQuestion = { num: number; correctLabel: string | null };
type QuizQuestion = { num: number; answer: string };

/**
 * Corrige un QCM côté serveur : les bonnes réponses (exercises.data) ne sont
 * JAMAIS envoyées au navigateur avant cet appel, pour empêcher de les lire
 * dans le code source avant de répondre.
 */
export async function correctQcm(
  exerciseId: string,
  answers: Record<number, string>,
): Promise<{ score: number; total: number; correctByNum: Record<number, string> } | { error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercises")
    .select("type, data")
    .eq("id", exerciseId)
    .eq("type", "qcm")
    .single();
  if (error || !data?.data) return { error: "Exercice introuvable." };

  const questions = (data.data as { questions: QcmQuestion[] }).questions;
  const correctByNum: Record<number, string> = {};
  let score = 0;
  for (const q of questions) {
    correctByNum[q.num] = q.correctLabel ?? "";
    if (q.correctLabel && answers[q.num] === q.correctLabel) score += 1;
  }
  return { score, total: questions.length, correctByNum };
}

/** Révèle les réponses attendues d'un quiz éclair (auto-évalué, pas de note automatique). */
export async function revealQuiz(
  exerciseId: string,
): Promise<{ answersByNum: Record<number, string> } | { error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercises")
    .select("type, data")
    .eq("id", exerciseId)
    .eq("type", "quiz")
    .single();
  if (error || !data?.data) return { error: "Exercice introuvable." };

  const questions = (data.data as { questions: QuizQuestion[] }).questions;
  const answersByNum: Record<number, string> = {};
  for (const q of questions) answersByNum[q.num] = q.answer;
  return { answersByNum };
}

/** Révèle le corrigé d'une dissertation ou d'un commentaire (auto-évalué). */
export async function revealCorrection(exerciseId: string): Promise<{ correctionMd: string } | { error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("exercises").select("correction_md").eq("id", exerciseId).single();
  if (error || !data) return { error: "Exercice introuvable." };
  return { correctionMd: data.correction_md ?? "" };
}
