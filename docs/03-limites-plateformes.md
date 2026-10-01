# Am-XamXAm — Limites des plateformes utilisées et seuils d'abonnement

> Objectif : savoir, avant que ça arrive, à quel moment une plateforme gratuite risque de bloquer le service, et quand il devient nécessaire (ou juste plus confortable) de payer. Chiffres vérifiés à la date de rédaction (29/09/2026) — **à revérifier sur les pages officielles avant toute décision**, ces grilles tarifaires évoluent.

## 1. Cloudflare Workers (hébergement de l'application)

| Limite | Plan gratuit | Plan payant (5 $/mois) |
|---|---|---|
| Requêtes / jour | 100 000 | Illimité |
| Temps CPU par requête | 10 ms | 30 s par défaut (jusqu'à 5 min) |
| Taille du Worker | 64 MiB | 64 MiB (identique) |
| Sous-requêtes par exécution | 50 | 10 000 (jusqu'à 10M) |

**Risque concret pour Am-XamXAm** : le temps CPU de 10 ms sur le plan gratuit est la limite la plus susceptible d'être touchée en premier, pas le nombre de requêtes — une page qui fait plusieurs requêtes Supabase + rendu peut dépasser 10 ms de calcul serveur pur en cas de pic de trafic ou de logique plus lourde (ex. l'assistant IA, les jointures complexes du panel admin).

**Signal d'alerte à surveiller** : erreurs `Worker exceeded CPU time limit` dans les journaux (`npx wrangler tail`) ou dans le tableau de bord Cloudflare → Analytics.

**Quand s'abonner (5 $/mois)** : dès l'apparition de ces erreurs en usage réel, ou en anticipation avant une rentrée scolaire (pic prévisible de connexions simultanées). Coût faible, à ne pas repousser si le symptôme apparaît — c'est le composant qui sert *toutes* les pages.

## 2. Cloudflare Workers AI (assistant pédagogique)

| Limite | Valeur |
|---|---|
| Neurones gratuits / jour | 10 000 |
| Au-delà | 0,011 $ / 1 000 neurones |
| Réinitialisation | Chaque jour à 00h00 UTC |

**Risque concret** : au-delà du quota gratuit quotidien, les réponses de l'assistant échouent (ou basculent en erreur silencieuse si le code n'est pas vigilant — voir guide des opérations, §7). Le nombre exact de conversations couvert par 10 000 neurones/jour dépend de la longueur des échanges ; à surveiller via le tableau de bord Cloudflare Workers AI plutôt que d'estimer a priori.

**Quand s'abonner** : ce n'est pas un "abonnement" classique mais un dépassement facturé à l'usage — aucune action nécessaire tant que le quota gratuit suffit. Le vrai geste de prévention est de **surveiller la consommation quotidienne** dans le tableau de bord dès que le nombre d'élèves actifs augmente significativement, pour anticiper un dépassement plutôt que le découvrir via des plaintes.

## 3. Supabase (base de données, authentification)

| Limite | Plan gratuit | Plan Pro (25 $/mois) |
|---|---|---|
| Taille de la base | 500 Mo | 8 Go inclus |
| Utilisateurs actifs / mois | 50 000 | 100 000 |
| Bande passante sortante | 5 Go | 250 Go |
| Stockage fichiers | 1 Go | 100 Go |
| Sauvegardes | — | Quotidiennes, conservées 7 jours |

**Risque concret et le plus dangereux du lot** : **un projet Supabase gratuit est automatiquement mis en pause après 7 jours sans activité.** Si la plateforme traverse une période creuse (grandes vacances scolaires, par exemple), la base de données peut se retrouver suspendue et le site entier devient inaccessible jusqu'à réactivation manuelle dans le tableau de bord Supabase.

**Quand s'abonner (25 $/mois)** : dès que l'un de ces signaux apparaît :
- une période prévisible de faible trafic de plus d'une semaine (vacances) → **passer au Pro avant**, pas après ;
- la base approche 500 Mo (contenu pédagogique + utilisateurs + paiements) ;
- besoin de sauvegardes automatiques garanties (recommandé dès qu'il y a des utilisateurs payants réels — perdre l'historique des paiements ou des comptes n'est pas acceptable en dessous de ce seuil).

## 4. Make.com (automatisations e-mail)

| Limite | Plan gratuit | Plan Core (9 $/mois) |
|---|---|---|
| Opérations / mois | 1 000 | 10 000 |
| Scénarios actifs simultanés | **2 maximum** | Illimité |
| Fréquence minimale d'exécution | 15 minutes | À la minute |

**Risque concret et déjà d'actualité** : Am-XamXAm utilise **déjà 2 scénarios actifs** (rappels d'abonnement + confirmations paiement/code/appareil) — soit **la totalité du quota gratuit de scénarios**. Toute nouvelle automatisation (ex. relance des paiements échoués, notifications admin, synchronisation d'un futur outil) nécessitera soit de fusionner la logique dans un scénario existant, soit de passer au plan payant.

**Quand s'abonner (9 $/mois)** : dès qu'une troisième automatisation devient nécessaire, ou si le volume d'e-mails envoyés (rappels + confirmations combinés) approche 1 000/mois — plausible dès quelques centaines d'abonnés actifs (chaque abonnement génère jusqu'à 3 rappels + 1 confirmation).

## 5. Paiement

Plus de passerelle de paiement en ligne : le paiement se négocie directement sur WhatsApp (mobile money), hors plateforme — donc pas de limite technique de ce type à surveiller ici. Point à garder à l'œil : le temps de réponse humain sur WhatsApp devient le nouveau goulot d'étranglement du parcours d'achat, pas un plafond technique.

## 6. Synthèse — ordre de priorité si un budget doit être ouvert

1. **Supabase Pro (25 $/mois)** — dès qu'une coupure de service liée à l'inactivité devient un risque réel (vacances) ou que des paiements réels commencent à transiter sans sauvegarde garantie. C'est le risque le plus silencieux (le site peut tomber sans avertissement).
2. **Make.com Core (9 $/mois)** — dès qu'une 3ᵉ automatisation est nécessaire, ce qui est probable assez tôt vu le quota de 2 scénarios déjà atteint.
3. **Cloudflare Workers Paid (5 $/mois)** — réactif, à activer au premier signe d'erreur de temps CPU, ou proactif avant un pic de trafic prévisible (rentrée).
4. **Cloudflare Workers AI** — pas un abonnement à date fixe, juste une facturation à l'usage au-delà du quota gratuit quotidien ; à laisser tel quel et simplement surveiller.

Coût total si les 3 premiers seuils sont franchis : environ **39 $/mois** (~24 000 FCFA/mois) — à comparer au chiffre d'affaires généré par les abonnements avant de décider, mais à ne jamais laisser la question Supabase (pause automatique) traîner au-delà d'une semaine de doute.
