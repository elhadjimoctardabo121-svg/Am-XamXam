"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSupabaseConfig } from "@/lib/env";
import { safeNext } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import {
  classSchema,
  newPasswordSchema,
  resetRequestSchema,
  signInSchema,
  signUpSchema,
  type ActionState,
} from "@/lib/validation";

const NOT_CONFIGURED: ActionState = {
  error: "Le service n'est pas encore configuré. Réessaie plus tard.",
};
const GENERIC_ERROR: ActionState = { error: "Une erreur est survenue. Réessaie dans un instant." };
const WEAK_PASSWORD = "Ce mot de passe est trop simple. Choisis-en un plus difficile à deviner.";

const text = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
};

async function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function signUp(_prev: ActionState | undefined, fd: FormData): Promise<ActionState> {
  const raw = {
    displayName: text(fd, "displayName"),
    email: text(fd, "email").trim(),
    password: text(fd, "password"),
    isMinor: fd.get("isMinor") === "on",
    parentEmail: text(fd, "parentEmail"),
    acceptTerms: fd.get("acceptTerms") === "on",
  };
  // Les mots de passe ne sont jamais renvoyés au navigateur.
  const values = {
    displayName: raw.displayName,
    email: raw.email,
    parentEmail: raw.parentEmail,
    isMinor: raw.isMinor ? "on" : "",
  };

  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  if (!getSupabaseConfig()) return { ...NOT_CONFIGURED, values };

  const { displayName, email, password, isMinor, parentEmail } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${await siteUrl()}/auth/callback?next=/onboarding`,
      data: { display_name: displayName, is_minor: isMinor, parent_email: isMinor ? parentEmail : null },
    },
  });

  if (error) {
    return { error: error.code === "weak_password" ? WEAK_PASSWORD : GENERIC_ERROR.error, values };
  }
  if (data.session) redirect("/onboarding");
  return {
    message:
      "Presque fini ! Ouvre l'e-mail que nous venons de t'envoyer et clique sur le lien pour activer ton compte.",
    values: { email },
  };
}

export async function signIn(_prev: ActionState | undefined, fd: FormData): Promise<ActionState> {
  const raw = { email: text(fd, "email").trim(), password: text(fd, "password") };
  const values = { email: raw.email };
  const parsed = signInSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  if (!getSupabaseConfig()) return { ...NOT_CONFIGURED, values };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // Message volontairement identique pour « compte inconnu » et « mauvais mot de passe ».
    return {
      error:
        error.code === "email_not_confirmed"
          ? "Ton adresse e-mail n'est pas encore confirmée. Ouvre l'e-mail d'activation."
          : "E-mail ou mot de passe incorrect.",
      values,
    };
  }
  redirect(safeNext(text(fd, "next")));
}

export async function requestPasswordReset(
  _prev: ActionState | undefined,
  fd: FormData,
): Promise<ActionState> {
  const raw = { email: text(fd, "email").trim() };
  const parsed = resetRequestSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values: raw };
  if (!getSupabaseConfig()) return { ...NOT_CONFIGURED, values: raw };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await siteUrl()}/auth/callback?next=/mot-de-passe/nouveau`,
  });
  // Même réponse que le compte existe ou non : on ne révèle pas qui est inscrit.
  return { message: "Si un compte existe avec cette adresse, un e-mail vient d'être envoyé.", values: raw };
}

export async function updatePassword(
  _prev: ActionState | undefined,
  fd: FormData,
): Promise<ActionState> {
  const parsed = newPasswordSchema.safeParse({ password: text(fd, "password"), confirm: text(fd, "confirm") });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  if (!getSupabaseConfig()) return NOT_CONFIGURED;

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return {
      error:
        error.code === "same_password"
          ? "Choisis un mot de passe différent de l'ancien."
          : error.code === "weak_password"
            ? WEAK_PASSWORD
            : GENERIC_ERROR.error,
    };
  }
  redirect("/tableau-de-bord");
}

export async function chooseClass(_prev: ActionState | undefined, fd: FormData): Promise<ActionState> {
  const parsed = classSchema.safeParse({ classCode: text(fd, "classCode") });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  if (!getSupabaseConfig()) return NOT_CONFIGURED;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: cls } = await supabase.from("classes").select("id").eq("code", parsed.data.classCode).single();
  if (!cls) return GENERIC_ERROR;

  // La RLS et les droits par colonne limitent cette mise à jour à la fiche de l'utilisateur.
  const { error } = await supabase
    .from("students")
    .update({ class_id: cls.id, onboarded_at: new Date().toISOString() })
    .eq("id", user.id);
  if (error) return GENERIC_ERROR;
  redirect("/tableau-de-bord");
}

export async function signOut() {
  if (getSupabaseConfig()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
