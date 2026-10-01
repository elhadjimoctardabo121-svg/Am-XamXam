# Am-XamXAm — Guide des opérations

> Comment le projet fonctionne au quotidien : où sont les choses, comment déployer, comment intervenir sans casser la sécurité déjà en place. Destiné à quiconque doit opérer ou reprendre le projet techniquement.

## 1. Comptes et accès nécessaires

| Service | Rôle | Compte |
|---|---|---|
| Cloudflare | Hébergement (Workers), IA, DNS futur | amxamxam121@gmail.com |
| Supabase | Base de données, authentification | projet `ijkjhlhaixemruqbvmpk` |
| Make.com | Automatisations e-mail | organisation "My Organization", équipe "Seydi's space" |
| WhatsApp | Demande de code (paiement mobile money hors plateforme) | numéro WhatsApp de l'équipe |
| GitHub | Code source | `elhadjimoctardabo121-svg/Am-XamXam` |
| Gmail | Envoi des e-mails transactionnels (via Make) | connexion Google dans Make |

## 2. Déploiement

Le code vit dans `plateforme/`. Séquence standard pour publier une modification :

```bash
npx tsc --noEmit      # vérifie les types
npm run test          # 80 tests automatisés (RLS + logique métier) — jamais sauter cette étape
npm run build          # build Next.js
npm run cf:deploy      # publie sur Cloudflare Workers
```

Le site est servi sur `https://amxamxam.amxamxam.workers.dev` (sous-domaine gratuit Cloudflare — aucun domaine personnalisé configuré à ce jour).

**Règle absolue : toute modification qui touche à une table, une règle d'accès ou une fonction SQL doit d'abord passer les tests (`npm run test`) avant d'être déployée.** Ces tests ont détecté plusieurs failles de sécurité réelles avant mise en production (voir §5).

## 3. Base de données : le point le plus sensible

- Les migrations SQL vivent dans `supabase/migrations/`, numérotées par horodatage.
- **Aucune migration n'est appliquée automatiquement** : chaque fichier doit être exécuté manuellement dans l'éditeur SQL de Supabase, dans l'ordre de son horodatage.
- Toute table sensible a la Row Level Security (RLS) activée, avec des politiques explicites — jamais de table ouverte "par défaut".
- Les opérations qui doivent contourner une restriction normale (ex. promouvoir un utilisateur en staff, compter des contenus verrouillés sans révéler leur contenu) passent par des fonctions PostgreSQL `SECURITY DEFINER`, jamais par un accès direct élargi — cela évite qu'un utilisateur puisse s'auto-attribuer un droit via une faille de policy.
- **Écriture directe en base de production interdite en dehors du flux normal de l'application.** Même avec la clé `service_role`, les écritures de test/QA doivent être faites via un compte de test créé et supprimé proprement — jamais en modifiant des données d'élèves réels sans passer par les actions applicatives prévues.

## 4. Secrets et variables d'environnement

- En local : fichier `.env.local` (jamais commité — vérifié dans `.gitignore`).
- En production (Cloudflare Worker) : `npx wrangler secret put NOM_DU_SECRET`, jamais écrit dans un fichier temporaire — toujours passé via un pipe stdin.
- Variables publiques (`NEXT_PUBLIC_*`) : configurées dans `wrangler.jsonc` ou le tableau de bord Cloudflare, jamais dans le code.
- Secrets actuellement configurés : clé Supabase `service_role`, `MAKE_CONFIRMATION_WEBHOOK_URL`.

## 5. Ce que les tests automatisés ont déjà évité en production

Ces exemples concrets justifient pourquoi la suite de tests (`tests/db/rls.test.ts`, ~80 cas, exécutés contre une vraie instance Postgres en mémoire à chaque changement) est une étape obligatoire, pas optionnelle :

- Une conception initiale du contrôle des rôles administrateur aurait permis à un élève de s'auto-promouvoir admin via une policy RLS trop permissive — détecté et corrigé avant mise en ligne.
- Une contrainte métier sur les sujets BFEM gratuits (initialement "un seul sujet gratuit au total") avait pour effet de rendre 45 sujets invisibles à tout élève non abonné — un vrai bug utilisateur détecté a posteriori, corrigé et désormais couvert par un test qui empêche la régression.
- Une règle de calcul de date (rappels d'abonnement) était correcte "en général" mais pouvait échouer selon l'heure d'exécution du test — un bug de fiabilité subtil, corrigé.

## 6. Automatisations Make.com

Deux scénarios actifs (équipe "Seydi's space", ne pas toucher aux scénarios du projet "PILOTE-HG" qui appartient à un autre projet dans le même compte) :

1. **"Am-XamXAm — Rappels d'expiration d'abonnement"** — tourne tous les jours à 08h00, interroge une vue SQL (`subscription_reminders_due`) qui calcule qui doit recevoir un rappel (J-7/J-3/J-1), envoie un e-mail via Gmail, marque le rappel comme envoyé pour ne jamais le renvoyer deux fois.
2. **"Am-XamXAm — Confirmations (paiement / code / premium)"** — déclenché par un webhook appelé depuis l'application à chaque paiement confirmé, code activé, ou nouvel appareil détecté. Un routeur envoie le bon modèle d'e-mail selon le type d'événement.

Pour modifier un scénario : toujours récupérer le blueprint existant (`scenarios_get`) avant de le modifier, ne jamais deviner la structure d'un module — les versions de modules Make ont des champs différents selon leur version.

## 7. Intelligence artificielle (assistant élève)

- Fournisseur : Cloudflare Workers AI, modèle `@cf/meta/llama-3.2-3b-instruct`.
- Le code est écrit derrière une interface (`AiProvider`) : changer de fournisseur (ex. passer à un modèle payant plus puissant) ne demande de modifier qu'un seul fichier (`src/lib/ai/index.ts`), jamais les pages qui l'utilisent.
- **Point de vigilance** : les modèles Cloudflare Workers AI sont parfois dépréciés sans préavis bloquant (le modèle précédent a cessé de fonctionner sans erreur visible côté utilisateur). En cas de panne silencieuse de l'assistant, la première chose à vérifier est le journal Worker en direct (`npx wrangler tail --format pretty`) pour voir l'erreur réelle, et la liste des modèles disponibles sur le tableau de bord Cloudflare.

## 8. Paiement (codes via WhatsApp)

- Flux : l'élève choisit un plan sur /tarifs → bouton WhatsApp pré-rempli → paiement mobile money négocié hors plateforme → le staff génère un code depuis /admin/codes → l'élève l'active sur /code → e-mail de confirmation envoyé.
- Le serveur ne fait jamais confiance à une redirection navigateur pour activer un abonnement : seule la notification serveur-à-serveur (IPN), signée, déclenche l'activation.

## 9. Contenu pédagogique : comment il est ajouté

- Les leçons/exercices/sujets sont rédigés en Markdown simplifié (titres `##`, listes à puces, paragraphes — pas de dépendance externe lourde, pour rester léger sur le Worker Cloudflare).
- Import en masse : les contenus fournis en `.docx` sont extraits via `pandoc` puis transformés en instructions SQL générées par un script, jamais insérés à la main un par un.
- Toute nouvelle donnée de contenu doit respecter le workflow `brouillon → validé → publié` : un contenu n'est jamais visible aux élèves tant qu'il n'est pas explicitement publié.

## 10. Incidents et leur résolution — bonnes pratiques observées

- Ne jamais contourner un blocage de sécurité (ex. refus d'écrire en base de production hors du flux prévu) en cherchant un autre outil pour faire la même chose — le blocage est volontaire, il faut identifier la vraie cause et proposer une alternative sûre (ex. script SQL envoyé au porteur de projet pour exécution manuelle).
- Face à un service externe qui échoue silencieusement (ex. IA), préférer consulter des journaux en direct plutôt que de changer de fournisseur par réflexe — le vrai problème est souvent ailleurs et moins coûteux à corriger.
- Toute nouvelle table ou fonction sensible doit avoir son test avant d'être considérée "terminée".
