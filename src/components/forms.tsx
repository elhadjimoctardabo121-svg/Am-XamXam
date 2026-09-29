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
import { redeemAccessCode } from "@/app/actions/access-code";
import { initiatePayment } from "@/app/actions/payment";
import {
  cancelSubscription,
  createAccessCode,
  grantSubscription,
  setUserRole,
  toggleAccessCode,
  updateContentRow,
} from "@/app/actions/admin";
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

export function RedeemCodeForm() {
  const [state, action, pending] = useActionState(redeemAccessCode, undefined);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {state?.success && (
        <Alert tone="success">
          Code activé ! « {state.success.planName} » est actif jusqu&apos;au{" "}
          {new Date(state.success.endsAt).toLocaleDateString("fr-FR")}.
        </Alert>
      )}
      <Field
        label="Code"
        name="code"
        autoComplete="off"
        hint="Sensible à la casse ignorée : majuscules ou minuscules, ça marche pareil."
      />
      <Submit pending={pending}>Activer</Submit>
    </form>
  );
}

export function PlanCheckoutForm({
  planId,
  scope,
  subjects,
}: {
  planId: string;
  scope: string;
  subjects: { id: string; code: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(initiatePayment, undefined);
  return (
    <form action={action} className="mt-4 flex flex-col gap-2">
      <input type="hidden" name="planId" value={planId} />
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {scope === "matiere" && (
        <select
          name="subjectId"
          required
          className="min-h-11 rounded-xl border border-line bg-transparent px-3 text-sm"
          defaultValue=""
        >
          <option value="" disabled>
            Choisis la matière
          </option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      )}
      <Submit pending={pending}>Payer avec PayTech</Submit>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

const selectClass = "min-h-9 rounded-lg border border-line bg-transparent px-2 text-sm";
const miniButtonClass =
  "min-h-9 rounded-lg bg-brand px-3 text-xs font-bold text-brand-ink disabled:opacity-60";

function MiniFeedback({ state }: { state: AdminFormState }) {
  if (state?.error) return <span className="text-xs font-bold text-danger">{state.error}</span>;
  if (state?.message) return <span className="text-xs font-bold text-brand">{state.message}</span>;
  return null;
}

type AdminFormState = { error?: string; message?: string } | undefined;

const STATUS_OPTIONS = [
  { value: "draft", label: "Brouillon" },
  { value: "in_review", label: "En relecture" },
  { value: "validated", label: "Validé" },
  { value: "published", label: "Publié" },
  { value: "archived", label: "Archivé" },
] as const;

const TIER_OPTIONS = [
  { value: "free", label: "Gratuit" },
  { value: "premium", label: "Premium" },
  { value: "pack", label: "Pack matière" },
  { value: "admin_only", label: "Staff uniquement" },
] as const;

export function ContentRowForm({
  table,
  id,
  status,
  accessTier,
  returnPath,
}: {
  table: "chapters" | "lessons" | "exercises";
  id: string;
  status: string;
  accessTier: string;
  returnPath: string;
}) {
  const [state, action, pending] = useActionState(updateContentRow, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="table" value={table} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="returnPath" value={returnPath} />
      <select name="status" defaultValue={status} className={selectClass}>
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <select name="accessTier" defaultValue={accessTier} className={selectClass}>
        {TIER_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <button type="submit" disabled={pending} className={miniButtonClass}>
        {pending ? "…" : "Enregistrer"}
      </button>
      <MiniFeedback state={state} />
    </form>
  );
}

export function CreateAccessCodeForm({
  plans,
  subjects,
}: {
  plans: { id: string; name: string; scope: string }[];
  subjects: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(createAccessCode, undefined);
  const [scope, setScope] = useState<string>(plans[0]?.scope ?? "classe");
  return (
    <form action={action} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
      <h3 className="font-bold">Créer un code</h3>
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {state?.message && <Alert tone="success">{state.message}</Alert>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-bold">
          Offre
          <select
            name="planId"
            required
            className="mt-1 block min-h-11 w-full rounded-xl border border-line bg-transparent px-3"
            onChange={(e) => setScope(plans.find((p) => p.id === e.target.value)?.scope ?? "classe")}
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold">
          Type
          <select name="type" className="mt-1 block min-h-11 w-full rounded-xl border border-line bg-transparent px-3">
            <option value="abonnement">Abonnement</option>
            <option value="cadeau">Cadeau</option>
          </select>
        </label>
        {scope === "matiere" && (
          <label className="text-sm font-bold sm:col-span-2">
            Matière
            <select
              name="subjectId"
              required
              className="mt-1 block min-h-11 w-full rounded-xl border border-line bg-transparent px-3"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="text-sm font-bold">
          Nombre d&apos;utilisations
          <input
            name="maxUses"
            type="number"
            min={1}
            defaultValue={1}
            className="mt-1 block min-h-11 w-full rounded-xl border border-line bg-transparent px-3"
          />
        </label>
        <label className="text-sm font-bold">
          Expire le (optionnel)
          <input
            name="expiresAt"
            type="date"
            className="mt-1 block min-h-11 w-full rounded-xl border border-line bg-transparent px-3"
          />
        </label>
      </div>
      <button type="submit" disabled={pending} className={buttonClass("primary")}>
        {pending ? "Un instant…" : "Créer le code"}
      </button>
    </form>
  );
}

export function ToggleAccessCodeForm({ id, active }: { id: string; active: boolean }) {
  const [state, action, pending] = useActionState(toggleAccessCode, undefined);
  return (
    <form action={action} className="inline-flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="nextActive" value={String(!active)} />
      <button type="submit" disabled={pending} className={miniButtonClass}>
        {pending ? "…" : active ? "Désactiver" : "Réactiver"}
      </button>
      <MiniFeedback state={state} />
    </form>
  );
}

export function SetRoleForm({ userId, role }: { userId: string; role: string }) {
  const [state, action, pending] = useActionState(setUserRole, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <select name="role" defaultValue={role} className={selectClass}>
        <option value="student">Élève</option>
        <option value="parent">Parent</option>
        <option value="teacher">Enseignant</option>
        <option value="editor">Éditeur</option>
        <option value="admin">Admin</option>
      </select>
      <button type="submit" disabled={pending} className={miniButtonClass}>
        {pending ? "…" : "Changer"}
      </button>
      <MiniFeedback state={state} />
    </form>
  );
}

export function GrantSubscriptionForm({
  userId,
  plans,
  subjects,
}: {
  userId: string;
  plans: { id: string; name: string; scope: string }[];
  subjects: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(grantSubscription, undefined);
  const [scope, setScope] = useState<string>(plans[0]?.scope ?? "classe");
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <select
        name="planId"
        required
        className={selectClass}
        onChange={(e) => setScope(plans.find((p) => p.id === e.target.value)?.scope ?? "classe")}
      >
        {plans.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      {scope === "matiere" && (
        <select name="subjectId" required className={selectClass}>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      )}
      <button type="submit" disabled={pending} className={miniButtonClass}>
        {pending ? "…" : "Offrir un abonnement"}
      </button>
      <MiniFeedback state={state} />
    </form>
  );
}

export function CancelSubscriptionForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(cancelSubscription, undefined);
  return (
    <form action={action} className="inline-flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending} className="min-h-9 rounded-lg border border-danger px-3 text-xs font-bold text-danger disabled:opacity-60">
        {pending ? "…" : "Annuler"}
      </button>
      <MiniFeedback state={state} />
    </form>
  );
}
