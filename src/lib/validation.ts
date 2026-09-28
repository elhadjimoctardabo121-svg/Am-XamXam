import { z } from "zod";

export const CLASS_CODES = ["3eme", "terminale"] as const;
export type ClassCode = (typeof CLASS_CODES)[number];

const email = z.email("Entre une adresse e-mail valide.").max(254, "Adresse e-mail trop longue.");
const password = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
  .max(72, "Le mot de passe est limité à 72 caractères.");

export const signUpSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(2, "Ton prénom doit contenir au moins 2 lettres.")
      .max(40, "Ton prénom est trop long (40 caractères maximum)."),
    email,
    password,
    isMinor: z.boolean(),
    parentEmail: z.string().trim().max(254).optional(),
    acceptTerms: z.boolean().refine((v) => v === true, "Tu dois accepter les conditions d'utilisation."),
  })
  .superRefine((v, ctx) => {
    if (!v.isMinor) return;
    const parent = (v.parentEmail ?? "").toLowerCase();
    if (!parent || !z.email().safeParse(parent).success) {
      ctx.addIssue({
        code: "custom",
        path: ["parentEmail"],
        message: "Entre l'adresse e-mail d'un parent ou d'un tuteur.",
      });
    } else if (parent === v.email.toLowerCase()) {
      ctx.addIssue({
        code: "custom",
        path: ["parentEmail"],
        message: "L'adresse du parent doit être différente de la tienne.",
      });
    }
  });

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Entre ton mot de passe.").max(72),
});

export const resetRequestSchema = z.object({ email });

export const newPasswordSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Les deux mots de passe ne sont pas identiques.",
  });

export const classSchema = z.object({
  classCode: z.enum(CLASS_CODES, "Choisis ta classe."),
});

export type FieldErrors = Record<string, string[] | undefined>;

export type ActionState = {
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  values?: Record<string, string>;
};
