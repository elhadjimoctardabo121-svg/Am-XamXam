import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/ui";

export const metadata: Metadata = { title: "Paiement annulé" };

export default function PaymentCancelPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-8 text-center">
      <h1 className="text-2xl font-bold">Paiement annulé</h1>
      <p className="text-muted">Aucun montant n&apos;a été débité. Tu peux réessayer quand tu veux.</p>
      <Link href="/tarifs" className={buttonClass("primary")}>
        Retour aux tarifs
      </Link>
    </main>
  );
}
