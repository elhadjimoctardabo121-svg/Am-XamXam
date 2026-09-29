import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AssistantWidget } from "@/components/assistant-widget";
import { RedeemCodeForm } from "@/components/forms";
import { ConfigNotice, Logo } from "@/components/ui";
import { getSupabaseConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Activer un code" };

export default async function CodePage() {
  await connection();

  if (!getSupabaseConfig()) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
        <ConfigNotice />
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/code");

  return (
    <>
      <div className="hero-bg pb-10">
        <header className="mx-auto flex w-full max-w-md items-center justify-between px-4 py-4">
          <Link href="/tableau-de-bord" aria-label="Accueil">
            <Logo tone="light" />
          </Link>
        </header>
        <div className="mx-auto w-full max-w-md px-4 pt-2">
          <h1 className="rise text-2xl font-bold sm:text-3xl">Activer un code</h1>
          <p className="rise-2 mt-1 text-white/85">
            Reçu un code cadeau ou d&apos;abonnement ? Entre-le ici pour débloquer ton accès.
          </p>
        </div>
      </div>

      <main className="mx-auto -mt-6 w-full max-w-md flex-1 px-4 pb-10">
        <div className="rounded-3xl border border-line bg-surface p-5 sm:p-7">
          <RedeemCodeForm />
        </div>
      </main>
      <AssistantWidget />
    </>
  );
}
