import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/ui";
import { ResetRequestForm } from "@/components/forms";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Mot de passe oublié"
      intro="Entre ton adresse e-mail : nous t'envoyons un lien pour choisir un nouveau mot de passe."
    >
      <ResetRequestForm />
      <Link href="/connexion" className="min-h-11 text-center text-sm font-bold text-brand underline underline-offset-4">
        Retour à la connexion
      </Link>
    </AuthShell>
  );
}
