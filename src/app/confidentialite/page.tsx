import type { Metadata } from "next";
import { AuthShell } from "@/components/ui";

export const metadata: Metadata = { title: "Politique de confidentialité" };

export default function PrivacyPage() {
  return (
    <AuthShell title="Politique de confidentialité" intro="Version provisoire pour la bêta.">
      <p className="text-muted">
        Principes déjà appliqués par l&apos;application : collecte minimale (prénom, e-mail, classe), aucune
        revente de données, aucune publicité ciblée, conversations avec l&apos;assistant visibles par l&apos;élève
        seul, consentement d&apos;un parent pour les mineurs. Le texte juridique définitif, la déclaration à la
        Commission de protection des données personnelles et le seuil d&apos;âge du consentement doivent être
        confirmés par un juriste local avant l&apos;ouverture publique.
      </p>
    </AuthShell>
  );
}
