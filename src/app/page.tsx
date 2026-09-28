import Link from "next/link";
import { HeroArt } from "@/components/art";
import { ButtonLink, Logo } from "@/components/ui";
import { BRAND } from "@/lib/brand";

const STEPS = [
  { icon: "📖", title: "Apprends", text: "Des cours du programme sénégalais, expliqués simplement, avec un résumé à retenir.", tone: "bg-histoire/20" },
  { icon: "🎯", title: "T'entraîne", text: "Des exercices adaptés à ton niveau, corrigés avec des explications, pas seulement « juste » ou « faux ».", tone: "bg-geographie/20" },
  { icon: "🔧", title: "Répare tes lacunes", text: "L'application repère ce que tu maîtrises mal et te le fait revoir au bon moment.", tone: "bg-civique/20" },
  { icon: "📈", title: "Vois ta progression", text: "Chaque jour, tu sais quoi faire : 5, 15 ou 30 minutes, selon ton temps.", tone: "bg-brand/20" },
];

const SUBJECTS = [
  { emoji: "📜", name: "Histoire", text: "Dates, personnages, événements et relations entre les idées.", bar: "bg-histoire", pct: 68 },
  { emoji: "🌍", name: "Géographie", text: "Cartes, documents, statistiques et croquis.", bar: "bg-geographie", pct: 74 },
  { emoji: "⚖️", name: "Éducation civique", text: "Notions, situations et cas pratiques.", bar: "bg-civique", pct: 81 },
];

export default function Home() {
  return (
    <>
      <div className="hero-bg relative overflow-hidden">
        <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
          <Logo tone="light" />
          <Link
            href="/connexion"
            className="inline-flex min-h-11 items-center rounded-xl border border-white/30 px-4 font-bold text-white hover:bg-white/10"
          >
            Se connecter
          </Link>
        </header>

        <section className="mx-auto grid w-full max-w-5xl items-center gap-8 px-4 pb-10 pt-6 md:grid-cols-2 md:pb-16 md:pt-12">
          <div>
            <p className="rise mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-bold ring-1 ring-white/25">
              <span className="size-2 rounded-full bg-brand-glow" aria-hidden="true" />
              Version bêta · Troisième et Terminale
            </p>
            <h1 className="rise text-4xl font-bold leading-[1.1] sm:text-5xl">
              Ton coach de révision pour le <span className="text-sun">BFEM</span> et le <span className="text-sun">BAC</span>
            </h1>
            <p className="rise-2 mt-4 text-lg text-white/85">
              Histoire, Géographie, Éducation civique : le programme sénégalais, expliqué simplement. {BRAND.tagline}
            </p>
            <div className="rise-3 mt-7 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/inscription" variant="gold">
                Commencer gratuitement
              </ButtonLink>
              <ButtonLink href="/connexion" variant="ghost">
                J&apos;ai déjà un compte
              </ButtonLink>
            </div>
            <p className="mt-3 text-sm text-white/70">Inscription gratuite. Pas de carte bancaire.</p>
          </div>

          {/* Aperçu de l'application (illustratif, non interactif) */}
          <div className="relative mx-auto w-full max-w-sm" aria-hidden="true">
            <HeroArt className="pointer-events-none block w-full" />
            <div className="rise-2 card-glow relative z-10 -mt-14 rounded-3xl bg-surface p-4 text-ink ring-1 ring-black/5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">Aperçu de l&apos;application</p>
              <p className="mt-1 text-lg font-bold">Bonjour Awa 👋</p>
              <div className="mt-3 rounded-2xl bg-brand p-4 text-brand-ink">
                <p className="text-sm font-bold opacity-90">Ta séance du jour</p>
                <p className="text-2xl font-bold">15 minutes</p>
                <div className="mt-2 flex gap-1.5 text-[11px] font-bold">
                  <span className="flex-1 rounded-full bg-white/25 px-2 py-1 text-center">Rappel 5 min</span>
                  <span className="flex-1 rounded-full bg-white/25 px-2 py-1 text-center">Exercice 5 min</span>
                  <span className="flex-1 rounded-full bg-white/25 px-2 py-1 text-center">Correction 5 min</span>
                </div>
              </div>
              <ul className="mt-3 space-y-2">
                {SUBJECTS.map((s) => (
                  <li key={s.name}>
                    <div className="flex justify-between text-sm font-bold">
                      <span>{s.name}</span>
                      <span className="text-muted">{s.pct} %</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-line">
                      <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${s.pct}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4">
        <section aria-labelledby="matieres" className="py-10">
          <h2 id="matieres" className="text-2xl font-bold sm:text-3xl">
            Trois matières pour commencer
          </h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-3">
            {SUBJECTS.map((s) => (
              <li key={s.name} className="card-glow relative overflow-hidden rounded-3xl border border-line bg-surface p-5">
                <span className={`absolute inset-x-0 top-0 h-1.5 ${s.bar}`} aria-hidden="true" />
                <span className="text-3xl" aria-hidden="true">{s.emoji}</span>
                <h3 className="mt-2 text-lg font-bold">{s.name}</h3>
                <p className="mt-1 text-muted">{s.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="comment" className="py-6">
          <h2 id="comment" className="text-2xl font-bold sm:text-3xl">
            Comment ça marche
          </h2>
          <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-3xl border border-line bg-surface p-5">
                <span className={`flex size-12 items-center justify-center rounded-2xl text-2xl ${s.tone}`} aria-hidden="true">
                  {s.icon}
                </span>
                <h3 className="mt-3 font-bold">
                  <span className="text-brand">{i + 1}.</span> {s.title}
                </h3>
                <p className="mt-1 text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="quinze" className="my-10 overflow-hidden rounded-3xl hero-bg p-6 sm:p-8">
          <h2 id="quinze" className="text-2xl font-bold sm:text-3xl">
            « J&apos;ai seulement 15 minutes »
          </h2>
          <p className="mt-2 max-w-xl text-white/85">
            Pas besoin de longues heures : une séance courte et bien construite vaut mieux qu&apos;un long
            moment sans savoir par où commencer.
          </p>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center text-sm font-bold text-[#0b1b33]">
            <div className="rounded-2xl bg-accent p-3">5 min<br /><span className="font-medium">Rappel</span></div>
            <div className="rounded-2xl bg-brand-glow p-3">5 min<br /><span className="font-medium">Exercice</span></div>
            <div className="rounded-2xl bg-white p-3">5 min<br /><span className="font-medium">Correction</span></div>
          </div>
        </section>

        <section aria-labelledby="parents" className="grid gap-4 py-6 md:grid-cols-2">
          <div className="rounded-3xl border border-line bg-surface p-6">
            <h2 id="parents" className="text-xl font-bold">
              🛡️ Pour les parents
            </h2>
            <p className="mt-2 text-muted">
              Un outil sérieux d&apos;accompagnement : régularité, chapitres travaillés, difficultés du moment.
              Les conversations privées de votre enfant avec l&apos;assistant ne vous sont pas transmises.
            </p>
          </div>
          <div className="rounded-3xl border-2 border-accent bg-surface p-6">
            <h2 className="text-xl font-bold">🤝 Notre promesse honnête</h2>
            <p className="mt-2 text-muted">
              Nous ne garantissons pas de résultat à l&apos;examen. Nous t&apos;aidons à savoir quoi travailler,
              à comprendre, à t&apos;entraîner et à corriger tes erreurs. Les chapitres arrivent
              progressivement pendant la bêta.
            </p>
          </div>
        </section>

        <section className="my-10 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">Prêt à savoir quoi apprendre aujourd&apos;hui ?</h2>
          <div className="mt-5 flex justify-center">
            <ButtonLink href="/inscription">Créer mon compte gratuit</ButtonLink>
          </div>
        </section>
      </main>

      <footer className="hero-bg mt-6">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-8 text-sm text-white/80 sm:flex-row sm:items-center sm:justify-between">
          <Logo tone="light" />
          <nav aria-label="Informations légales" className="flex gap-5">
            <Link href="/conditions" className="underline underline-offset-4">Conditions</Link>
            <Link href="/confidentialite" className="underline underline-offset-4">Confidentialité</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
