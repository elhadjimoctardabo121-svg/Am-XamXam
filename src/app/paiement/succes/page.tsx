import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/ui";

export const metadata: Metadata = { title: "Paiement reçu" };

export default function PaymentSuccessPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-8 text-center">
      <span className="text-5xl" aria-hidden="true">
        🎉
      </span>
      <h1 className="text-2xl font-bold">Paiement en cours de confirmation</h1>
      <p className="text-muted">
        Ton accès s&apos;active automatiquement dès que PayTech confirme le paiement — généralement en quelques
        secondes. Si ton tableau de bord ne montre pas encore le contenu débloqué, réessaie dans une minute.
      </p>
      <Link href="/tableau-de-bord" className={buttonClass("primary")}>
        Aller au tableau de bord
      </Link>
    </main>
  );
}
