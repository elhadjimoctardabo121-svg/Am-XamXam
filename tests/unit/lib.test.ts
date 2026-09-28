import { describe, expect, it } from "vitest";
import { routeDecision, safeNext } from "@/lib/routes";
import {
  classSchema,
  newPasswordSchema,
  resetRequestSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validation";

describe("safeNext (anti open-redirect)", () => {
  it.each([
    ["/tableau-de-bord", "/tableau-de-bord"],
    ["/chapitres?classe=3eme", "/chapitres?classe=3eme"],
    [null, "/tableau-de-bord"],
    ["", "/tableau-de-bord"],
    ["https://evil.example", "/tableau-de-bord"],
    ["//evil.example", "/tableau-de-bord"],
    ["/\\evil.example", "/tableau-de-bord"],
    ["/\t/evil.example", "/tableau-de-bord"],
    ["javascript:alert(1)", "/tableau-de-bord"],
    ["evil", "/tableau-de-bord"],
  ])("%j -> %s", (input, expected) => {
    expect(safeNext(input)).toBe(expected);
  });

  it("accepte un fallback personnalisé", () => {
    expect(safeNext("//x.y", "/onboarding")).toBe("/onboarding");
  });
});

describe("routeDecision", () => {
  it("renvoie un visiteur vers la connexion en gardant la destination", () => {
    expect(routeDecision("/tableau-de-bord", "?a=1", false)).toEqual({
      action: "redirect",
      to: "/connexion",
      next: "/tableau-de-bord?a=1",
    });
    expect(routeDecision("/onboarding", "", false)).toMatchObject({ action: "redirect", to: "/connexion" });
    expect(routeDecision("/mot-de-passe/nouveau", "", false)).toMatchObject({ to: "/connexion" });
  });

  it("renvoie un utilisateur connecté loin des pages d'accueil de compte", () => {
    for (const p of ["/connexion", "/inscription", "/mot-de-passe-oublie"]) {
      expect(routeDecision(p, "", true)).toEqual({ action: "redirect", to: "/tableau-de-bord" });
    }
  });

  it("laisse passer les pages publiques et les pages autorisées", () => {
    expect(routeDecision("/", "", false)).toEqual({ action: "next" });
    expect(routeDecision("/confidentialite", "", false)).toEqual({ action: "next" });
    expect(routeDecision("/auth/callback", "?code=x", false)).toEqual({ action: "next" });
    expect(routeDecision("/tableau-de-bord", "", true)).toEqual({ action: "next" });
    expect(routeDecision("/connexionx", "", true)).toEqual({ action: "next" });
  });
});

describe("signUpSchema", () => {
  const base = {
    displayName: "Awa",
    email: "awa@example.com",
    password: "motdepasse1",
    isMinor: false,
    acceptTerms: true,
  };

  it("accepte une inscription majeure valide", () => {
    expect(signUpSchema.safeParse(base).success).toBe(true);
  });

  it("exige l'e-mail d'un parent pour un mineur, différent de celui de l'élève", () => {
    const noParent = signUpSchema.safeParse({ ...base, isMinor: true });
    expect(noParent.success).toBe(false);
    const same = signUpSchema.safeParse({ ...base, isMinor: true, parentEmail: "AWA@example.com" });
    expect(same.success).toBe(false);
    const ok = signUpSchema.safeParse({ ...base, isMinor: true, parentEmail: "parent@example.com" });
    expect(ok.success).toBe(true);
  });

  it("refuse mot de passe court, e-mail invalide, prénom trop court et conditions non acceptées", () => {
    const r = signUpSchema.safeParse({
      ...base,
      password: "court",
      email: "pas-un-email",
      displayName: "A",
      acceptTerms: false,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path[0]);
      expect(paths).toEqual(expect.arrayContaining(["password", "email", "displayName", "acceptTerms"]));
    }
  });

  it("limite le mot de passe à 72 caractères (limite bcrypt)", () => {
    expect(signUpSchema.safeParse({ ...base, password: "a".repeat(73) }).success).toBe(false);
  });
});

describe("autres schémas", () => {
  it("connexion : e-mail valide et mot de passe non vide", () => {
    expect(signInSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
    expect(signInSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });

  it("réinitialisation : e-mail valide", () => {
    expect(resetRequestSchema.safeParse({ email: "nope" }).success).toBe(false);
  });

  it("nouveau mot de passe : confirmation identique", () => {
    expect(newPasswordSchema.safeParse({ password: "motdepasse1", confirm: "motdepasse2" }).success).toBe(false);
    expect(newPasswordSchema.safeParse({ password: "motdepasse1", confirm: "motdepasse1" }).success).toBe(true);
  });

  it("classe : uniquement 3eme ou terminale", () => {
    expect(classSchema.safeParse({ classCode: "3eme" }).success).toBe(true);
    expect(classSchema.safeParse({ classCode: "terminale" }).success).toBe(true);
    expect(classSchema.safeParse({ classCode: "seconde" }).success).toBe(false);
    expect(classSchema.safeParse({}).success).toBe(false);
  });
});
