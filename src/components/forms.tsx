"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  chooseClass,
  requestPasswordReset,
  signIn,
  signUp,
  updatePassword,
} from "@/app/actions/auth";
import { Alert, Field, buttonClass } from "@/components/ui";
import type { ActionState, FieldErrors } from "@/lib/validation";

function Feedback({ state }: { state: ActionState | undefined }) {
  if (state?.error) return <Alert tone="error">{state.error}</Alert>;
  if (state?.message) return <Alert tone="success">{state.message}</Alert>;
  return null;
}

function Submit({ pending, children }: { pending: boolean; children: string }) {
  return (
    <button type="submit" disabled={pending} className={buttonClass("primary")}>
      {pending ? "Un instant…" : children}
    </button>
  );
}

function PasswordField({
  name = "password",
  label = "Mot de passe",
  autoComplete,
  errors,
  hint,
}: {
  name?: string;
  label?: string;
  autoComplete: "current-password" | "new-password";
  errors?: FieldErrors;
  hint?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <Field
        label={label}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        errors={errors}
        hint={hint}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-pressed={visible}
        className="mt-1 min-h-11 text-sm font-bold text-brand underline underline-offset-4"
      >
        {visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
      </button>
    </div>
  );
}

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, undefined);
  const v = state?.values;
  if (state?.message) return <Feedback state={state} />;
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Feedback state={state} />
      <Field label="Ton prénom" name="displayName" autoComplete="given-name" defaultValue={v?.displayName} errors={state?.fieldErrors} />
      <Field label="Ton adresse e-mail" name="email" type="email" inputMode="email" autoComplete="email" defaultValue={v?.email} errors={state?.fieldErrors} />
      <PasswordField autoComplete="new-password" errors={state?.fieldErrors} hint="Au moins 8 caractères." />

      <div className="group flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
        <label className="flex min-h-11 items-start gap-3 text-sm font-bold">
          <input
            id="isMinor"
            name="isMinor"
            type="checkbox"
            defaultChecked={v ? v.isMinor === "on" : true}
            className="mt-1 size-5 accent-brand"
          />
          <span>
            J&apos;ai moins de 18 ans
            <span className="block font-medium text-muted">
              Un parent ou un tuteur sera informé de ton inscription.
            </span>
          </span>
        </label>
        <div className="hidden group-has-[#isMinor:checked]:block">
          <Field
            label="E-mail d'un parent ou tuteur"
            name="parentEmail"
            type="email"
            inputMode="email"
            autoComplete="off"
            defaultValue={v?.parentEmail}
            errors={state?.fieldErrors}
            required={false}
          />
        </div>
      </div>

      <div>
        <label className="flex min-h-11 items-start gap-3 text-sm">
          <input name="acceptTerms" type="checkbox" className="mt-1 size-5 accent-brand" />
          <span>
            J&apos;accepte les{" "}
            <Link href="/conditions" className="font-bold text-brand underline underline-offset-4">
              conditions d&apos;utilisation
            </Link>{" "}
            et la{" "}
            <Link href="/confidentialite" className="font-bold text-brand underline underline-offset-4">
              politique de confidentialité
            </Link>
            .
          </span>
        </label>
        {state?.fieldErrors?.acceptTerms?.[0] && (
          <p role="alert" className="mt-1 text-sm font-bold text-danger">
            {state.fieldErrors.acceptTerms[0]}
          </p>
        )}
      </div>

      <Submit pending={pending}>Créer mon compte gratuit</Submit>
    </form>
  );
}

export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signIn, undefined);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Feedback state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Adresse e-mail" name="email" type="email" inputMode="email" autoComplete="email" defaultValue={state?.values?.email} errors={state?.fieldErrors} />
      <PasswordField autoComplete="current-password" errors={state?.fieldErrors} />
      <Submit pending={pending}>Me connecter</Submit>
      <Link href="/mot-de-passe-oublie" className="min-h-11 text-center text-sm font-bold text-brand underline underline-offset-4">
        J&apos;ai oublié mon mot de passe
      </Link>
    </form>
  );
}

export function ResetRequestForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Feedback state={state} />
      <Field label="Adresse e-mail" name="email" type="email" inputMode="email" autoComplete="email" defaultValue={state?.values?.email} errors={state?.fieldErrors} />
      <Submit pending={pending}>Recevoir le lien</Submit>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, undefined);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Feedback state={state} />
      <PasswordField label="Nouveau mot de passe" autoComplete="new-password" errors={state?.fieldErrors} hint="Au moins 8 caractères." />
      <PasswordField name="confirm" label="Confirme le mot de passe" autoComplete="new-password" errors={state?.fieldErrors} />
      <Submit pending={pending}>Enregistrer</Submit>
    </form>
  );
}

const CLASS_OPTIONS = [
  { code: "3eme", title: "Troisième", detail: "Je prépare le BFEM" },
  { code: "terminale", title: "Terminale", detail: "Je prépare le BAC" },
] as const;

export function ClassPicker() {
  const [state, action, pending] = useActionState(chooseClass, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Feedback state={state} />
      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">Ta classe</legend>
        {CLASS_OPTIONS.map((o) => (
          <label
            key={o.code}
            className="flex min-h-16 cursor-pointer items-center gap-4 rounded-2xl border-2 border-line bg-surface p-4 has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand"
          >
            <input type="radio" name="classCode" value={o.code} required className="size-5 accent-brand" />
            <span>
              <span className="block text-lg font-bold">{o.title}</span>
              <span className="block text-sm text-muted">{o.detail}</span>
            </span>
          </label>
        ))}
        {state?.fieldErrors?.classCode?.[0] && (
          <p role="alert" className="text-sm font-bold text-danger">
            {state.fieldErrors.classCode[0]}
          </p>
        )}
      </fieldset>
      <Submit pending={pending}>Continuer</Submit>
    </form>
  );
}
