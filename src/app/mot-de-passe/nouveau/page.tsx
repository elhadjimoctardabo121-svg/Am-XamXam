import type { Metadata } from "next";
import { AuthShell } from "@/components/ui";
import { NewPasswordForm } from "@/components/forms";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

export default function NewPasswordPage() {
  return (
    <AuthShell title="Choisis un nouveau mot de passe">
      <NewPasswordForm />
    </AuthShell>
  );
}
