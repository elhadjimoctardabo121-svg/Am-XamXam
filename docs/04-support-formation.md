# Am-XamXAm — Support de formation
### Prise en main de la plateforme pour l'équipe (staff / administrateurs)

> Format : une diapositive par section (séparées par `---`). Utilisable tel quel en le collant dans un outil de présentation, ou lu directement comme guide.

---

## Diapositive 1 — Objectif de cette formation

À l'issue de cette session, chaque membre de l'équipe doit savoir :
1. Ce que voit et vit un élève sur la plateforme, du début à la fin.
2. Comment ajouter/valider/publier un contenu depuis le panel admin.
3. Comment gérer un paiement, un code d'accès, un compte élève.
4. Quels signaux surveiller pour éviter une panne évitable.

---

## Diapositive 2 — Le parcours élève, en un coup d'œil

1. **Inscription** → confirmation e-mail obligatoire → choix de la classe.
2. **Tableau de bord** → accès aux matières (Histoire, Géographie, Éducation civique).
3. Dans une matière : **chapitres → leçons → exercices**, avec un bandeau "🔒 réservé aux abonnés" dès qu'un contenu est premium — jamais un vide silencieux.
4. **Sujets BFEM probables** : 2 gratuits par matière, le reste verrouillé de la même façon.
5. **Assistant IA** (bouton flottant) : 5 questions gratuites à vie, puis 30/jour une fois abonné.
6. **Abonnement** : `/tarifs` → paiement mobile money (PayTech) ou saisie d'un code d'accès.

---

## Diapositive 3 — Le modèle économique en une phrase

Tout est **gratuit en aperçu, premium pour aller plus loin** : jamais de mur total. Chaque contenu verrouillé pointe directement vers la page d'abonnement — c'est le principal moteur de conversion, donc ne jamais publier un contenu premium sans que son verrou soit visible et cliquable.

---

## Diapositive 4 — Les plans d'abonnement actuels

| Plan | Prix | Durée |
|---|---|---|
| Mensuel | 1 500 FCFA | 30 jours |
| Trimestriel | 3 500 FCFA | 90 jours |
| Semestriel | 6 500 FCFA | 180 jours |
| Annuel | 9 500 FCFA | 365 jours |
| Pack une matière | 7 500 FCFA | Accès quasi permanent |

Le pack "une matière" est pensé pour l'élève qui a besoin de renforcer un seul point faible, pas toute la classe.

---

## Diapositive 5 — Le panel admin : où et pour qui

Accessible sur `/admin`, réservé aux comptes `staff`/`admin` (contrôlé en base de données, pas seulement dans l'interface — un compte élève ne peut physiquement pas y accéder même en devinant l'URL).

Cinq rubriques :
- **Contenus** — chapitres, leçons, exercices.
- **Sujets BFEM** — sujets probables et corrigés.
- **Codes** — génération et suivi des codes d'accès.
- **Paiements** — historique des transactions.
- **Utilisateurs** — gestion des rôles et comptes.

---

## Diapositive 6 — Ajouter un contenu : le workflow en 3 étapes

Un contenu n'est **jamais visible aux élèves tant qu'il n'est pas publié**, même s'il existe déjà en base :

1. **Brouillon** — création initiale, visible uniquement au staff.
2. **Validé** — relu et approuvé par un second regard (recommandé : ne pas publier son propre contenu sans relecture).
3. **Publié** — visible aux élèves, selon la règle gratuit/premium définie.

Chaque changement de statut est tracé (qui, quand) — utile en cas de contenu erroné à corriger a posteriori.

---

## Diapositive 7 — Gérer un code d'accès

Utile pour un partenariat, une promotion, ou un remplacement de paiement direct.
1. Générer le code depuis `/admin/codes`, en choisissant la portée (classe entière ou une matière) et la durée.
2. Transmettre le code à l'élève par le canal choisi (hors plateforme — SMS, affiche, partenaire).
3. L'élève l'active depuis `/code` — l'accès est identique à un abonnement payé équivalent.

---

## Diapositive 8 — Gérer un paiement

Le paiement passe entièrement par PayTech (Orange Money, Wave, carte) — **jamais d'activation manuelle d'un abonnement en se basant sur une simple déclaration de l'élève**. L'activation est automatique dès que PayTech confirme la transaction côté serveur. En cas de doute sur un paiement, vérifier l'historique dans `/admin/paiements` avant toute action manuelle.

---

## Diapositive 9 — Le verrou par appareil : ce qu'un élève va vivre (et comment l'expliquer)

Un compte n'est utilisable que sur l'appareil où il a été créé. Si un élève change de téléphone ou efface ses données de navigation, il devra **confirmer par e-mail** depuis ce nouvel appareil avant de retrouver l'accès.

**Ce qu'il faut savoir dire à un élève inquiet** : ce n'est pas un bug, c'est une protection contre le partage d'un compte payant entre plusieurs personnes — un e-mail avec un lien de confirmation suffit à débloquer la situation en quelques minutes, à condition d'ouvrir le lien depuis le même appareil qui a demandé la connexion (le lien ne fonctionne pas s'il est transféré ailleurs).

---

## Diapositive 10 — L'assistant IA : ce qu'il peut et ne peut pas faire

- Répond aux questions pédagogiques dans la limite du quota (5 questions gratuites à vie, 30/jour pour les abonnés).
- **Ne mémorise aucune conversation** — chaque question est indépendante, aucun historique n'est conservé.
- Utile pour orienter un élève qui pose une question hors-sujet vers le contenu pertinent de la plateforme plutôt que de tout attendre de l'IA.

---

## Diapositive 11 — Signaux à surveiller (remonter à l'équipe technique si observés)

- Messages d'erreur récurrents de l'assistant IA ("momentanément indisponible").
- Site inaccessible après une période de faibles connexions (risque de pause automatique de la base de données — voir document "Limites des plateformes").
- Plaintes d'élèves sur un contenu premium censé être gratuit, ou l'inverse — vérifier le statut d'accès du contenu concerné dans `/admin/contenus`.
- Un élève bloqué en boucle sur la page de vérification d'appareil sans recevoir d'e-mail — vérifier d'abord ses dossiers spam avant toute intervention technique.

---

## Diapositive 12 — Ce qui n'est pas encore disponible (pour répondre correctement aux questions)

- **Terminale / BAC** : en pause de développement, aucune date annoncée.
- **Application `.apk`** (Play Store) : la plateforme est disponible en PWA (installable depuis le navigateur), pas encore en tant qu'application de store.
- **Domaine personnalisé** : le site est encore sur une adresse Cloudflare gratuite, pas sur "am-xamxam.com" ou équivalent.
