"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AdminActionState = { error?: string; message?: string };

const CONTENT_TABLES = ["chapters", "lessons", "exercises", "exam_papers"] as const;
type ContentTable = (typeof CONTENT_TABLES)[number];

/** Change le statut de workflow et/ou l'accès (gratuit/premium) d'un chapitre, d'une leçon ou d'un exercice.
 *  La RLS (policy *_staff_all) et le trigger enforce_content_rules font respecter les règles
 *  (brouillon → relu → validé → publié, publication réservée à l'admin) : ceci n'est qu'un formulaire. */
export async function updateContentRow(
  _prev: AdminActionState | undefined,
  fd: FormData,
): Promise<AdminActionState> {
  const table = String(fd.get("table") ?? "");
  const id = String(fd.get("id") ?? "");
  const status = String(fd.get("status") ?? "");
  const accessTier = String(fd.get("accessTier") ?? "");
  const returnPath = String(fd.get("returnPath") ?? "/admin/contenus");
  if (!CONTENT_TABLES.includes(table as ContentTable) || !id || !status || !accessTier) {
    return { error: "Requête invalide." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from(table as ContentTable)
    .update({ status, access_tier: accessTier })
    .eq("id", id);
  if (error) return { error: `Échec : ${error.message}` };

  revalidatePath(returnPath);
  return { message: "Enregistré." };
}

/** Crée un code d'accès (abonnement ou cadeau) lié à une offre. */
export async function createAccessCode(_prev: AdminActionState | undefined, fd: FormData): Promise<AdminActionState> {
  const planId = String(fd.get("planId") ?? "");
  const type = String(fd.get("type") ?? "abonnement");
  const subjectId = fd.get("subjectId") ? String(fd.get("subjectId")) : null;
  const maxUses = Math.max(1, Number(fd.get("maxUses") ?? 1) || 1);
  const expiresAtRaw = String(fd.get("expiresAt") ?? "");
  if (!planId) return { error: "Choisis une offre." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée, reconnecte-toi." };

  const code = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  const { error } = await supabase.from("access_codes").insert({
    code,
    type,
    plan_id: planId,
    subject_id: subjectId,
    max_uses: maxUses,
    expires_at: expiresAtRaw ? new Date(expiresAtRaw).toISOString() : null,
    created_by: user.id,
  });
  if (error) return { error: `Échec : ${error.message}` };

  revalidatePath("/admin/codes");
  return { message: `Code créé : ${code}` };
}

/** Active/désactive un code existant (ex. code compromis ou promo terminée). */
export async function toggleAccessCode(_prev: AdminActionState | undefined, fd: FormData): Promise<AdminActionState> {
  const id = String(fd.get("id") ?? "");
  const nextActive = fd.get("nextActive") === "true";
  if (!id) return { error: "Requête invalide." };

  const supabase = await createClient();
  const { error } = await supabase.from("access_codes").update({ active: nextActive }).eq("id", id);
  if (error) return { error: `Échec : ${error.message}` };

  revalidatePath("/admin/codes");
  return { message: nextActive ? "Code réactivé." : "Code désactivé." };
}

/** Change le rôle d'un utilisateur — passe par admin_set_role() qui vérifie is_admin() côté serveur. */
export async function setUserRole(_prev: AdminActionState | undefined, fd: FormData): Promise<AdminActionState> {
  const userId = String(fd.get("userId") ?? "");
  const role = String(fd.get("role") ?? "");
  if (!userId || !role) return { error: "Requête invalide." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_role", { p_user_id: userId, p_role: role });
  if (error) return { error: error.code === "42501" ? error.message : `Échec : ${error.message}` };

  revalidatePath("/admin/utilisateurs");
  return { message: "Rôle mis à jour." };
}

/** Accorde un abonnement manuellement (geste commercial, correction d'erreur de paiement...). */
export async function grantSubscription(_prev: AdminActionState | undefined, fd: FormData): Promise<AdminActionState> {
  const userId = String(fd.get("userId") ?? "");
  const planId = String(fd.get("planId") ?? "");
  const subjectId = fd.get("subjectId") ? String(fd.get("subjectId")) : null;
  if (!userId || !planId) return { error: "Requête invalide." };

  const supabase = await createClient();
  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("code, duration_days, scope")
    .eq("id", planId)
    .single();
  if (planError || !plan) return { error: "Offre introuvable." };
  if (plan.scope === "matiere" && !subjectId) return { error: "Choisis une matière pour ce pack." };

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("class_id")
    .eq("id", userId)
    .single();
  if (studentError || !student?.class_id) return { error: "Cet élève n'a pas encore choisi sa classe." };

  const { error } = await supabase.from("subscriptions").insert({
    user_id: userId,
    class_id: plan.scope === "classe" ? student.class_id : null,
    subject_id: plan.scope === "matiere" ? subjectId : null,
    plan: plan.code,
    status: "active",
    source: "admin",
    starts_at: new Date().toISOString(),
    ends_at: new Date(Date.now() + plan.duration_days * 86_400_000).toISOString(),
  });
  if (error) return { error: `Échec : ${error.message}` };

  revalidatePath("/admin/utilisateurs");
  return { message: "Abonnement accordé." };
}

/** Crée un sujet BFEM (brouillon) : la rédaction du sujet/corrigé se fait ensuite via
 *  la mise à jour directe en base ou une future page d'édition ; ce formulaire couvre
 *  la création initiale, indispensable puisqu'il n'existe pas d'import SQL pour cette
 *  rubrique tant que le contenu source n'est pas disponible. */
export async function createExamPaper(_prev: AdminActionState | undefined, fd: FormData): Promise<AdminActionState> {
  const classId = String(fd.get("classId") ?? "");
  const subjectId = String(fd.get("subjectId") ?? "");
  const year = Number(fd.get("year") ?? 0);
  const title = String(fd.get("title") ?? "").trim() || "BFEM";
  const statementMd = String(fd.get("statementMd") ?? "");
  const correctionMd = String(fd.get("correctionMd") ?? "");
  if (!classId || !subjectId || !year) return { error: "Classe, matière et année sont obligatoires." };

  const supabase = await createClient();

  // Plusieurs sujets peuvent exister pour la même (classe, matière, année) :
  // on s'ajoute après le dernier déjà présent plutôt que de forcer position=1.
  const { data: last } = await supabase
    .from("exam_papers")
    .select("position")
    .eq("class_id", classId)
    .eq("subject_id", subjectId)
    .eq("year", year)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = (last?.position ?? 0) + 1;

  const { error } = await supabase.from("exam_papers").insert({
    class_id: classId,
    subject_id: subjectId,
    year,
    position,
    title,
    statement_md: statementMd,
    correction_md: correctionMd,
  });
  if (error) return { error: `Échec : ${error.message}` };

  revalidatePath("/admin/bfem");
  return { message: "Sujet créé en brouillon — publie-le depuis la liste une fois relu." };
}

/** Annule un abonnement (erreur, remboursement...). */
export async function cancelSubscription(_prev: AdminActionState | undefined, fd: FormData): Promise<AdminActionState> {
  const id = String(fd.get("id") ?? "");
  if (!id) return { error: "Requête invalide." };

  const supabase = await createClient();
  const { error } = await supabase.from("subscriptions").update({ status: "cancelled" }).eq("id", id);
  if (error) return { error: `Échec : ${error.message}` };

  revalidatePath("/admin/utilisateurs");
  return { message: "Abonnement annulé." };
}
