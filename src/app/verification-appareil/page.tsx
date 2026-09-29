import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { sendDeviceConfirmationEmail } from "@/app/actions/device";
import { signOut } from "@/app/actions/auth";
import { safeNext } from "@/lib/routes";

export const metadata: Metadata = { title: "Vérification de l'appareil" };

export default async function VerificationAppareilPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erreur?: string }>;
}) {
  await connection();
  const params = await searchParams;
  const next = safeNext(params.next);
  const result = await sendDeviceConfirmationEmail(next);
  const resend = async () => {
    "use server";
    await sendDeviceConfirmationEmail(next);
  };

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-8 text-center">
      <span className="text-4xl" aria-hidden="true">
        🔐
      </span>
      <p className="text-lg font-bold">Nouvel appareil détecté</p>
      <p className="text-muted">
        Pour protéger ton compte, chaque connexion depuis un appareil différent doit être confirmée par e-mail. On
        vient de t&apos;envoyer un lien de confirmation — ouvre-le <b>depuis cet appareil</b> (le lien ne fonctionne
        pas ailleurs).
      </p>
      {params.erreur && (
        <p className="text-sm font-medium text-danger">
          Ce lien est invalide, expiré, ou n&apos;a pas été ouvert depuis l&apos;appareil qui a demandé la connexion.
        </p>
      )}
      {result.error && <p className="text-sm font-medium text-danger">{result.error}</p>}
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <form action={resend}>
          <button
            type="submit"
            className="w-full rounded-xl border border-line px-4 py-2 text-sm font-bold sm:w-auto"
          >
            Renvoyer l&apos;e-mail
          </button>
        </form>
        <form action={signOut}>
          <button type="submit" className="text-sm font-bold text-brand underline underline-offset-4">
            Ce n&apos;est pas moi — se déconnecter
          </button>
        </form>
      </div>
    </main>
  );
}
