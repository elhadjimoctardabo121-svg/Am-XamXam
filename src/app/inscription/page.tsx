import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/ui";
import { SignUpForm } from "@/components/forms";

export const metadata: Metadata = { title: "Inscription" };

export default function SignUpPage() {
  return (
    <AuthShell
      title="Crée ton compte gratuit"
      intro="Trois questions, et tu accèdes à ta première séance. Nous collectons le strict minimum."
    >
      <SignUpForm />
      <p className="text-center text-sm">
        Déjà inscrit ?{" "}
        <Link href="/connexion" className="font-bold text-brand underline underline-offset-4">
          Connecte-toi
        </Link>
      </p>
    </AuthShell>
  );
}
