import Link from "next/link";
import type { ReactNode } from "react";
import { BRAND } from "@/lib/brand";
import { getSupabaseConfig } from "@/lib/env";
import type { FieldErrors } from "@/lib/validation";

/** Marque : baobab sous un soleil doré, lisible à 16 px. Le texte suit la couleur du contexte. */
export function Logo({ tone = "default", className = "" }: { tone?: "default" | "light"; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 font-bold ${tone === "light" ? "text-white" : "text-ink"} ${className}`}
    >
      <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
        <defs>
          <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#14d19a" />
            <stop offset="1" stopColor="#0a7f5f" />
          </linearGradient>
        </defs>
        <rect width="34" height="34" rx="10" fill="url(#logo-g)" />
        <ellipse cx="17" cy="14" rx="10" ry="6.5" fill="#fff" />
        <path d="M14 29c.5-3.6.3-6-1.1-8.5h8.2c-1.4 2.5-1.6 4.9-1.1 8.5z" fill="#fff" />
        <circle cx="26" cy="7.5" r="3" fill="#ffc83d" />
      </svg>
      <span className="text-xl tracking-tight">{BRAND.name}</span>
    </span>
  );
}

type Variant = "primary" | "secondary" | "gold" | "ghost";
export const buttonClass = (variant: Variant = "primary") =>
  [
    "inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-6 text-base font-bold",
    "transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
    "disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto",
    {
      primary: "bg-brand text-brand-ink shadow-lg shadow-brand/25 hover:-translate-y-0.5 hover:brightness-110",
      secondary: "border border-line bg-surface text-ink hover:bg-brand-soft",
      gold: "bg-accent text-[#0b1b33] shadow-lg shadow-black/30 hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline-white",
      ghost: "border border-white/40 text-white hover:bg-white/10 focus-visible:outline-white",
    }[variant],
  ].join(" ");

export function ButtonLink({
  href,
  variant,
  children,
}: {
  href: string;
  variant?: Variant;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant)}>
      {children}
    </Link>
  );
}

const inputClass =
  "block min-h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink " +
  "placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand " +
  "aria-[invalid=true]:border-danger";

export function Field({
  label,
  name,
  type = "text",
  autoComplete,
  defaultValue,
  errors,
  hint,
  inputMode,
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  defaultValue?: string;
  errors?: FieldErrors;
  hint?: string;
  inputMode?: "email" | "text";
  required?: boolean;
}) {
  const error = errors?.[name]?.[0];
  const describedBy = [error ? `${name}-error` : "", hint ? `${name}-hint` : ""].filter(Boolean).join(" ");
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-bold">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        inputMode={inputMode}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={inputClass}
      />
      {hint && (
        <p id={`${name}-hint`} className="mt-1 text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${name}-error`} role="alert" className="mt-1 text-sm font-bold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function Alert({ tone, children }: { tone: "error" | "success" | "info"; children: ReactNode }) {
  const styles = {
    error: "border-danger text-danger",
    success: "border-brand bg-brand-soft text-ink",
    info: "border-accent text-ink",
  }[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-xl border-l-4 bg-surface px-4 py-3 text-sm font-medium ${styles}`}
    >
      {children}
    </div>
  );
}

/** Écran affiché quand un contenu n'existe pas OU est verrouillé (RLS) : mêmes mots pour les
 *  deux cas (on ne révèle pas lequel), mais toujours un vrai chemin vers l'abonnement/le code. */
export function LockedContentNotice() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-8 text-center">
      <span className="text-4xl" aria-hidden="true">
        🔒
      </span>
      <p className="text-lg font-bold">Contenu non disponible</p>
      <p className="text-muted">
        Ce contenu n&apos;existe pas, ou nécessite un abonnement actif pour être consulté.
      </p>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <ButtonLink href="/tarifs" variant="primary">
          Voir les abonnements
        </ButtonLink>
        <ButtonLink href="/code" variant="secondary">
          J&apos;ai un code
        </ButtonLink>
      </div>
      <Link href="/tableau-de-bord" className="text-sm font-bold text-brand underline underline-offset-4">
        Retour au tableau de bord
      </Link>
    </main>
  );
}

/** Affiché sur les pages qui dépendent de Supabase quand les variables d'environnement manquent. */
export function ConfigNotice() {
  if (getSupabaseConfig()) return null;
  return (
    <Alert tone="info">
      Configuration manquante : renseigne NEXT_PUBLIC_SUPABASE_URL et la clé publique dans .env.local
      (voir README).
    </Alert>
  );
}

/** Page d'authentification : bandeau sombre en dégradé, formulaire sur une feuille qui le chevauche. */
export function AuthShell({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="hero-bg px-4 pb-14 pt-4">
        <div className="mx-auto w-full max-w-md">
          <Link href="/" aria-label={`${BRAND.name} — accueil`} className="inline-block">
            <Logo tone="light" />
          </Link>
          <h1 className="rise mt-6 text-2xl font-bold leading-tight sm:text-3xl">{title}</h1>
          {intro && <p className="rise-2 mt-2 text-white/85">{intro}</p>}
        </div>
      </div>
      <div className="-mt-8 flex-1 rounded-t-3xl bg-bg">
        <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 pb-10 pt-8">
          <ConfigNotice />
          {children}
        </main>
      </div>
    </div>
  );
}
