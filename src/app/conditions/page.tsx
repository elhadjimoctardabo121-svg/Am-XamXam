import type { Metadata } from "next";
import { AuthShell } from "@/components/ui";

export const metadata: Metadata = { title: "Conditions d'utilisation" };

export default function TermsPage() {
  return (
    <AuthShell
      title="Conditions d'utilisation"
      intro="En utilisant Am-XamXAm, tu acceptes les règles ci-dessous."
    >
      <section className="flex flex-col gap-2">
        <h2 className="font-bold">1. Le service</h2>
        <p className="text-muted">
          Am-XamXAm est un service d&apos;aide à la préparation du BFEM (et, à terme, du BAC) : leçons, exercices
          corrigés et sujets d&apos;examen probables, accessibles sur le web et via l&apos;application installable.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-bold">2. Ton compte</h2>
        <p className="text-muted">
          Un compte nécessite un e-mail valide. Si tu es mineur, tu dois l&apos;indiquer et fournir un e-mail
          parental à l&apos;inscription. Ton compte est personnel : il n&apos;est utilisable que depuis
          l&apos;appareil sur lequel tu l&apos;as créé. Une connexion depuis un autre appareil déclenche un e-mail de
          confirmation, pour éviter qu&apos;il soit partagé entre plusieurs personnes.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-bold">3. Le contenu</h2>
        <p className="text-muted">
          Le contenu (leçons, exercices, sujets et corrigés) est destiné à ton usage personnel. Le copier, le
          redistribuer ou le revendre est interdit. Les sujets fournis sont des <b>sujets probables</b>, élaborés à
          partir du programme officiel : ils ne garantissent pas les questions exactes de l&apos;examen réel.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-bold">4. Abonnement et paiement</h2>
        <p className="text-muted">
          Certains contenus sont gratuits, d&apos;autres nécessitent un abonnement payant ou un code d&apos;accès. Les
          tarifs affichés sur la page Tarifs au moment de l&apos;achat sont ceux qui s&apos;appliquent. Le paiement est
          traité par notre prestataire PayTech (Orange Money, Wave, carte) : nous ne stockons aucune donnée
          bancaire.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-bold">5. L&apos;assistant IA</h2>
        <p className="text-muted">
          L&apos;assistant donne des réponses générées automatiquement à visée pédagogique. Il peut se tromper ou
          être incomplet, et ne remplace pas un enseignant. Son usage est limité (questions gratuites à vie, puis
          quota quotidien pour les abonnés).
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-bold">6. Suspension</h2>
        <p className="text-muted">
          Nous pouvons suspendre un compte en cas d&apos;usage frauduleux constaté (partage délibéré de compte, copie
          massive de contenu, paiement frauduleux). Tu peux demander la suppression de ton compte à tout moment
          (voir la Politique de confidentialité).
        </p>
      </section>

      <p className="text-xs text-muted">
        Ces conditions sont susceptibles d&apos;évoluer, notamment à mesure que certains points (remboursement,
        droit applicable) sont formalisés avec un conseil juridique local. La version en vigueur est toujours celle
        affichée sur cette page.
      </p>
    </AuthShell>
  );
}
