import type { Metadata } from "next";
import { AuthShell } from "@/components/ui";

export const metadata: Metadata = { title: "Conditions d'utilisation" };

export default function TermsPage() {
  return (
    <AuthShell title="Conditions d'utilisation" intro="Version provisoire pour la bêta.">
      <p className="text-muted">
        Ce texte est un espace réservé. Les conditions d&apos;utilisation et de vente définitives doivent être
        rédigées ou relues par un juriste local avant l&apos;ouverture publique et l&apos;activation des paiements
        (voir le document stratégique, sections 11 et 12).
      </p>
    </AuthShell>
  );
}
