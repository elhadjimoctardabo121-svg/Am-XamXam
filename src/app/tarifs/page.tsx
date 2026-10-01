import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AssistantWidget } from "@/components/assistant-widget";
import { ConfigNotice, Logo } from "@/components/ui";
import { getSupabaseConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Tarifs" };

// Numéro WhatsApp de l'équipe, format wa.me (indicatif pays sans "+" ni "0").
const WHATSAPP_NUMBER = "221763906517";

function whatsappOrderUrl(planName: string) {
  const text = `Bonjour, je voudrais un code d'accès Am-XamXAm pour l'offre « ${planName} ».`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

export default async function TarifsPage() {
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
  if (!user) redirect("/connexion?next=/tarifs");

  const { data: plans } = await supabase
    .from("plans")
    .select("id, name, price_fcfa, duration_days, scope")
    .eq("active", true)
    .order("position");

  return (
    <>
      <div className="hero-bg pb-10">
        <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/tableau-de-bord" aria-label="Accueil">
            <Logo tone="light" />
          </Link>
          <Link href="/code" className="text-sm font-bold text-white underline underline-offset-4">
            J&apos;ai un code
          </Link>
        </header>
        <div className="mx-auto w-full max-w-3xl px-4 pt-2">
          <h1 className="rise text-2xl font-bold sm:text-3xl">Débloquer tout le programme</h1>
          <p className="rise-2 mt-1 text-white/85">
            Choisis une offre, demande ton code sur WhatsApp (paiement Orange Money / Wave hors plateforme), puis
            active-le depuis « J&apos;ai un code ».
          </p>
        </div>
      </div>

      <main className="mx-auto -mt-6 grid w-full max-w-3xl flex-1 gap-4 px-4 pb-10 sm:grid-cols-2">
        {(plans ?? []).map((plan) => (
          <div key={plan.id} className="rounded-3xl border border-line bg-surface p-5">
            <p className="text-lg font-bold">{plan.name}</p>
            <p className="mt-1 text-3xl font-bold text-brand">
              {plan.price_fcfa > 0 ? (
                <>
                  {plan.price_fcfa.toLocaleString("fr-FR")} <span className="text-base font-bold text-muted">FCFA</span>
                </>
              ) : (
                "Gratuit"
              )}
            </p>
            <p className="mt-1 text-sm text-muted">
              {plan.scope === "matiere" ? "Une matière au choix, accès illimité" : `${plan.duration_days} jours`}
            </p>
            <a
              href={whatsappOrderUrl(plan.name)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-brand-ink hover:brightness-95"
            >
              {plan.price_fcfa > 0 ? "Demander un code sur WhatsApp" : "Demander l'essai gratuit"}
            </a>
          </div>
        ))}
      </main>
      <AssistantWidget />
    </>
  );
}
