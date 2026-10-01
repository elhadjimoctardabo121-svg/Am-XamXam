# Am-XamXAm — Cahier des charges (état des lieux au 29/09/2026)

> Ce document décrit l'application telle qu'elle existe réellement aujourd'hui, reconstitué à partir du travail effectué. Il sert de référence pour tout développement futur, tout repreneur technique, ou tout partenaire à qui présenter le produit.

## 1. Vision et positionnement

Am-XamXAm ("Je sais" en wolof) est une plateforme sénégalaise de préparation aux examens **BFEM** (Troisième) et, à terme, **BAC** (Terminale — actuellement en pause de développement). Elle combine :
- un catalogue de cours structuré (leçons, chapitres, exercices corrigés),
- des sujets d'examen probables avec corrigés,
- un assistant pédagogique conversationnel (IA),
- un modèle freemium avec abonnement activé par code (demandé sur WhatsApp, payé hors plateforme en mobile money).

Public cible : élèves sénégalais de 3ème, sur mobile en priorité (connexion parfois limitée).

## 2. Périmètre fonctionnel actuel

### 2.1 Catalogue pédagogique
- Matières couvertes : **Histoire, Géographie, Éducation civique** (classe 3ème / BFEM).
- Structure : Matière → Chapitre → Leçon (avec corps en Markdown simplifié) → Exercices.
- Deux types d'exercices : rattachés à un chapitre, ou rattachés directement à une leçon.
- Workflow de contenu à 3 états : `brouillon` → `validé` → `publié`, avec traçabilité (`created_by`, `reviewed_by`, `reviewed_at`) et audit des changements de statut.
- Terminale/BAC : schéma de données déjà prêt à l'extension (classes multiples), mais aucun contenu créé — **mis en pause à la demande du porteur de projet**.

### 2.2 Sujets d'examen (BFEM)
- 45 sujets probables importés (15 par matière × 3 matières), chacun avec énoncé et corrigé complet.
- Un sujet peut combiner plusieurs sous-parties (ex. dissertation + commentaire de document) fusionnées en un seul contenu.
- Accès : **2 sujets gratuits par matière**, le reste réservé aux abonnés — mais toujours *visible* (verrouillé, jamais invisible), avec incitation à l'abonnement.
- Étiquetage volontairement sans année affichée ("Sujets probables") pour ne pas laisser croire qu'il s'agit de sujets d'une session déjà passée.

### 2.3 Modèle d'accès et monétisation
- Contenu à deux niveaux : `free` / `premium`, vérifié en base (pas seulement côté interface) via une fonction `has_access()`.
- Plans actifs :

  | Plan | Prix | Durée | Portée |
  |---|---|---|---|
  | Abonnement mensuel | 1 500 FCFA | 30 jours | Toute la classe |
  | Abonnement trimestriel | 3 500 FCFA | 90 jours | Toute la classe |
  | Abonnement semestriel | 6 500 FCFA | 180 jours | Toute la classe |
  | Abonnement annuel | 9 500 FCFA | 365 jours | Toute la classe |
  | Pack — une matière au choix | 7 500 FCFA | ~100 ans (accès permanent) | Une matière |

- Paiement : l'élève demande un code sur **WhatsApp**, paie en mobile money (Orange Money / Wave) hors plateforme, puis active lui-même le code reçu depuis /code.
- Alternative : **codes d'accès** distribués hors-ligne (ex. partenariats, promotions), activables depuis l'app, avec la même granularité d'accès qu'un abonnement payé.

### 2.4 Assistant IA conversationnel
- Basé sur Cloudflare Workers AI (modèle Llama 3.2 3B, multilingue), pas d'abonnement API tiers payant.
- Accès : 5 questions gratuites **à vie** pour tout élève ; 30 questions/jour pour les abonnés Premium.
- Aucune conversation n'est stockée (seul un compteur d'usage l'est, pour appliquer le quota).
- Bouton flottant, disponible sur toutes les pages protégées.

### 2.5 Comptes et sécurité
- Authentification Supabase Auth (email + mot de passe), confirmation d'e-mail obligatoire.
- Gestion des mineurs : case "mineur" à l'inscription avec e-mail parent (renseigné mais non encore exploité activement).
- Row Level Security (RLS) PostgreSQL sur **toutes** les tables : la sécurité d'accès n'est jamais uniquement côté interface, toujours vérifiée en base.
- **Verrou par appareil** : un compte n'est utilisable que sur l'appareil où il a été créé (cookie longue durée, pas une simple session). Toute connexion depuis un appareil différent déclenche un e-mail de confirmation dont le lien de validation est lié à l'appareil demandeur (donc non transférable). Objectif : limiter le partage d'un compte payant entre plusieurs élèves.
- Contenu pédagogique protégé contre la copie basique (sélection, copier-coller, clic droit désactivés) — dissuasion, pas protection absolue.

### 2.6 Back-office (panel admin)
Réservé aux rôles `staff`/`admin`, avec contrôle d'accès en base (pas seulement dans l'interface) :
- **Contenus** : création/édition/validation/publication des chapitres, leçons, exercices.
- **Sujets BFEM** : gestion des sujets d'examen.
- **Codes** : génération et suivi des codes d'accès.
- **Codes** (même rubrique que ci-dessus) : génération de codes pour chaque durée (mensuel, trimestriel, semestriel, annuel, pack matière, essai 1 semaine).
- **Utilisateurs** : gestion des rôles et comptes.

### 2.7 Automatisations (Make.com)
- **Rappels d'expiration d'abonnement** : scénario quotidien qui identifie les abonnements arrivant à échéance (J-7, J-3, J-1) et envoie un e-mail de rappel, une seule fois par palier.
- **E-mails de confirmation** : paiement confirmé, code activé, nouvel appareil détecté — envoyés via un unique webhook déclenché par l'application.
- Coût : 0 FCFA supplémentaire (comptes Make/Gmail/Cloudflare déjà existants, dans leurs quotas gratuits).

### 2.8 Application installable (PWA)
- Manifeste + service worker + icônes : installable sur écran d'accueil Android et iPhone, sans passer par un store.
- Le service worker ne met en cache que les fichiers statiques (jamais les pages), pour ne jamais servir de contenu premium périmé à la mauvaise personne.
- Une vraie `.apk` (Play Store) reste une option future, non démarrée (choix explicite : "PWA d'abord").

## 3. Architecture technique (résumé — détails dans le guide des opérations)

- **Front/back** : Next.js 16.3.6 (App Router, Server Components, Server Actions).
- **Hébergement** : Cloudflare Workers (adaptateur OpenNext), déployé sur `amxamxam.amxamxam.workers.dev` (pas encore de domaine personnalisé).
- **Base de données** : Supabase (PostgreSQL managé, Auth, Row Level Security).
- **IA** : Cloudflare Workers AI (inférence incluse dans le compte Cloudflare).
- **Automatisation** : Make.com.
- **Paiement** : aucun en ligne — codes d'accès distribués via demande WhatsApp.
- **Tests** : suite automatisée (PGlite — Postgres en mémoire) qui rejoue les vraies migrations et vérifie chaque règle de sécurité/accès avant toute mise en production.

## 4. Ce qui reste hors périmètre actuel

- Contenu Terminale/BAC (en pause).
- Plan de test manuel formalisé sur l'ensemble des parcours utilisateurs (au-delà des tests automatisés).
- Application `.apk` native (TWA), domaine personnalisé.
- Statistiques d'usage réelles à grande échelle (produit encore jeune, pas de recul de plusieurs mois).

## 5. Principes directeurs qui ont guidé les choix techniques

1. **Sécurité en base, jamais seulement côté interface** — toute règle d'accès (gratuit/premium, rôle staff, propriétaire des données) est vérifiée par PostgreSQL (RLS + fonctions `SECURITY DEFINER`), pas uniquement dans le code de l'application.
2. **Coût marginal proche de zéro** — chaque brique choisie (Cloudflare Workers AI, Make.com sur comptes existants, PWA plutôt que store payant) évite d'ajouter un abonnement tiers tant que ce n'est pas indispensable.
3. **Fiabilité avant fonctionnalité** — une panne d'un service externe (Make, IA) ne doit jamais casser une action critique déjà réussie (ex. un paiement confirmé n'est jamais annulé parce que l'e-mail de confirmation a échoué).
4. **Mobile et connexion limitée en priorité** — poids des pages, PWA, contenu textuel léger.
5. **Contenu jamais totalement invisible** — un élève non abonné voit toujours qu'un contenu premium existe (verrouillé), avec un chemin direct vers l'abonnement, plutôt qu'un vide silencieux.
