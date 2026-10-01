import type { Metadata } from "next";
import { AuthShell } from "@/components/ui";

export const metadata: Metadata = { title: "Politique de confidentialité" };

export default function PrivacyPage() {
  return (
    <AuthShell
      title="Politique de confidentialité"
      intro="Ce que nous collectons, pourquoi, et ce que nous ne faisons jamais."
    >
      <section className="flex flex-col gap-2">
        <h2 className="font-bold">1. Ce que nous collectons</h2>
        <ul className="list-disc space-y-1 pl-5 text-muted">
          <li>Prénom/nom affiché, e-mail et mot de passe (chiffré) — pour créer et sécuriser ton compte.</li>
          <li>Ta classe — pour te montrer le bon contenu.</li>
          <li>Si tu es mineur : la case &quot;mineur&quot; et l&apos;e-mail d&apos;un parent.</li>
          <li>Historique d&apos;abonnement et de paiement (montant, date, plan) — pour gérer ton accès.</li>
          <li>Un identifiant d&apos;appareil (cookie technique) — pour la sécurité de ton compte (verrou par appareil).</li>
          <li>
            Un compteur de questions posées à l&apos;assistant IA — pour appliquer le quota. Le contenu de tes
            questions n&apos;est jamais conservé.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-bold">2. Ce que nous ne faisons jamais</h2>
        <ul className="list-disc space-y-1 pl-5 text-muted">
          <li>Aucune revente ni partage de tes données à des tiers à des fins commerciales.</li>
          <li>Aucune publicité ciblée basée sur tes données à l&apos;intérieur du service.</li>
          <li>Aucun stockage de numéro de carte bancaire ou de compte mobile money (le paiement se fait hors plateforme, par WhatsApp).</li>
          <li>Aucun accès de tiers à tes conversations avec l&apos;assistant — elles ne sont de toute façon pas conservées.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-bold">3. Sécurité</h2>
        <p className="text-muted">
          Nos règles d&apos;accès aux données sont appliquées directement au niveau de la base de données : un
          utilisateur ne peut techniquement accéder qu&apos;à ses propres données, quelle que soit l&apos;interface
          utilisée. L&apos;accès administrateur est limité au personnel autorisé, lui-même tracé.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-bold">4. Tes droits</h2>
        <p className="text-muted">
          Conformément à la réglementation sénégalaise sur les données personnelles, tu peux (ou ton parent, si tu
          es mineur) demander l&apos;accès à tes données, leur rectification, leur suppression, ou retirer ton
          consentement en fermant ton compte. Pour toute demande, contacte-nous via les coordonnées indiquées sur le
          site.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-bold">5. Conservation</h2>
        <p className="text-muted">
          Tes données sont conservées tant que ton compte existe. En cas de suppression, elles sont purgées, sous
          réserve d&apos;une éventuelle obligation légale de conservation des données de facturation.
        </p>
      </section>

      <p className="text-xs text-muted">
        La déclaration de ce traitement auprès de la Commission de protection des données personnelles du Sénégal,
        ainsi que le mécanisme actif de consentement parental pour les mineurs, sont en cours de finalisation avec un
        conseil juridique local.
      </p>
    </AuthShell>
  );
}
