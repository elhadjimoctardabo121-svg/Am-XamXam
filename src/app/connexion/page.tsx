import type { Metadata } from "next";
import Link from "next/link";
import { Alert, AuthShell } from "@/components/ui";
import { SignInForm } from "@/components/forms";
import { safeNext } from "@/lib/routes";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: PageProps<"/connexion">) {
  const sp = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const next = first(sp.next) ? safeNext(first(sp.next)) : undefined;

  return (
    <AuthShell title="Content de te revoir" intro="Connecte-toi pour retrouver ta séance du jour.">
      {first(sp.erreur) === "lien" && (
        <Alert tone="error">Ce lien n&apos;est plus valide ou a déjà été utilisé. Connecte-toi ou demande un nouveau lien.</Alert>
      )}
      <SignInForm next={next} />
      <p className="text-center text-sm">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="font-bold text-brand underline underline-offset-4">
          Inscris-toi gratuitement
        </Link>
      </p>
    </AuthShell>
  );
}
