# Am-XamXAm — plateforme éducative BFEM / BAC

Application web mobile-first (Next.js + Tailwind + Supabase) pour préparer le BFEM et le BAC au Sénégal.
Le concept, l'architecture et le plan complet sont dans le document stratégique (sections 1 à 25).

## État : incrément 1 (socle) — voir le plan de la section 23

Fait et testé :

- Schéma PostgreSQL et règles RLS : `supabase/migrations/`
  identité, classes, matières, chapitres, leçons, consentements, abonnements, journal d'audit,
  workflow brouillon → relu → validé → publié.
- 31 tests de sécurité de la base (PGlite, vrai PostgreSQL) : `tests/db/`
- Validation des formulaires et règles de routage : `tests/unit/` (22 tests)
- Écrans : accueil, inscription (avec e-mail du parent pour un mineur), connexion, mot de passe oublié,
  nouveau mot de passe, choix de la classe, tableau de bord (squelette sans contenu), pages légales provisoires.

Pas encore vérifié : le parcours d'authentification de bout en bout avec un vrai projet Supabase
(envoi des e-mails, session, callback). Il nécessite un projet Supabase (voir ci-dessous).

## Démarrer

```bash
npm install
npm test          # base + logique, sans Supabase ni Docker
npm run dev       # http://localhost:3000
```

Sans configuration Supabase, l'app démarre et affiche un message « Configuration manquante ».

## Brancher Supabase

1. Créer un projet Supabase (offre gratuite pour le développement ; **passer en Pro (25 $/mois) avant
   d'accueillir de vrais élèves** : l'offre gratuite met le projet en pause et n'a pas de sauvegardes).
2. Appliquer les migrations, dans l'ordre : coller `supabase/migrations/*.sql` dans l'éditeur SQL,
   ou utiliser la CLI Supabase (`supabase link` puis `supabase db push`).
3. Copier `.env.example` vers `.env.local` et renseigner l'URL et la clé publique.
4. Authentication > URL Configuration : Site URL = `NEXT_PUBLIC_SITE_URL`, et ajouter
   `<site>/auth/callback` aux Redirect URLs.
5. Authentication > Providers > Email : confirmation d'e-mail activée, longueur minimale du mot de passe 8.
6. Ne jamais mettre la clé `service_role` dans le frontend ni dans une variable `NEXT_PUBLIC_*`.

## Règles pour toute nouvelle table

RLS activée, droits révoqués puis accordés explicitement (colonne par colonne si besoin),
fonctions `SECURITY DEFINER` avec `search_path = ''`, contenus « draft » et « premium » par défaut.
Le test « active la RLS sur toutes les tables » échoue si une table est oubliée.

## Structure

```
supabase/migrations/   schéma, RLS, données de référence
tests/db/              tests de sécurité de la base (PGlite)
tests/unit/            tests de la logique applicative
src/proxy.ts           session Supabase + protection des pages privées
src/app/actions/       actions serveur d'authentification
src/lib/               config, clients Supabase, validation, routage
src/components/        composants d'interface
```

Cette version de Next.js a des changements majeurs (par exemple `proxy.ts` remplace `middleware.ts`) :
lire `node_modules/next/dist/docs/` avant de modifier les conventions de fichiers.
