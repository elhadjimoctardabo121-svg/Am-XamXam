# Am-XamXAm — Conditions d'utilisation et Politique de confidentialité (brouillon)

> **Statut : brouillon de travail, pas un texte juridique définitif.** Les pages en ligne (`/conditions` et `/confidentialite`) affichent aujourd'hui la même réserve : ce document doit être relu et validé par un juriste sénégalais avant d'être considéré comme opposable, en particulier parce que (1) des paiements réels sont négociés via WhatsApp puis activés par code, et (2) la plateforme accueille des mineurs. Ce texte reprend fidèlement ce que l'application fait réellement — il ne doit pas être publié tel quel sans cette relecture.

---

# Partie A — Conditions d'utilisation

## 1. Objet

Les présentes conditions régissent l'utilisation de la plateforme Am-XamXAm (le "Service"), un service d'aide à la préparation du BFEM (et à terme du BAC) édité par [Raison sociale / porteur de projet à compléter], accessible via le site web et l'application installable (PWA).

## 2. Création de compte

- Le Service est ouvert aux élèves préparant le BFEM. Un compte nécessite un e-mail valide et un mot de passe.
- Un utilisateur **mineur** doit indiquer son statut et fournir un e-mail parental lors de l'inscription (case dédiée dans le formulaire).
- Chaque compte est destiné à un seul utilisateur. **Un compte n'est utilisable que depuis l'appareil sur lequel il a été créé** ; une connexion depuis un autre appareil nécessite une confirmation par e-mail, envoyée à l'adresse du compte. Ce mécanisme vise à empêcher le partage d'un même compte entre plusieurs personnes.
- L'utilisateur est responsable de la confidentialité de son mot de passe et de l'accès à sa boîte e-mail.

## 3. Contenu et usage autorisé

- Le contenu pédagogique (leçons, exercices, sujets d'examen et corrigés) est fourni à des fins d'apprentissage personnel.
- La copie, la reproduction, la redistribution ou la revente du contenu, en tout ou partie, est interdite sans autorisation écrite préalable. Certaines mesures techniques (désactivation de la sélection/copie sur le contenu pédagogique) sont mises en place à titre dissuasif ; elles ne constituent pas une garantie technique absolue et leur contournement reste une violation des présentes conditions.
- Les sujets d'examen fournis sont des **sujets probables**, élaborés à partir du programme officiel : ils ne garantissent pas la présence de ces questions exactes à l'examen réel.

## 4. Abonnements et paiement

- Certains contenus sont accessibles gratuitement (dont, à ce jour, deux sujets BFEM par matière) ; l'accès complet nécessite un abonnement payant ou un code d'accès valide.
- Les plans, durées et tarifs en vigueur sont affichés sur la page `/tarifs` et peuvent évoluer ; le tarif applicable est celui affiché au moment de l'achat.
- Le paiement se négocie directement avec l'équipe sur WhatsApp (mobile money), hors plateforme : Am-XamXAm ne stocke aucune donnée de carte bancaire ni de compte mobile money, et ne voit jamais la transaction elle-même.
- **[À trancher avec un juriste avant publication]** : politique de remboursement (délai de rétractation, cas d'erreur de paiement, non-remboursement après activation, etc.) — actuellement non formalisée dans l'application.

## 5. Assistant pédagogique (IA)

- L'assistant fournit des réponses générées automatiquement à visée pédagogique. Ses réponses peuvent être incomplètes ou contenir des erreurs et ne remplacent pas un enseignant.
- L'usage est limité (questions gratuites à vie pour tout compte, quota quotidien pour les abonnés) ; ces limites peuvent évoluer.

## 6. Suspension et résiliation

- Am-XamXAm peut suspendre un compte en cas d'usage frauduleux constaté (partage de compte contournant délibérément le verrou par appareil, tentative de copie massive du contenu, paiement frauduleux).
- L'utilisateur peut demander la suppression de son compte à tout moment (voir Partie B, §7).

## 7. Responsabilité

- Le Service est fourni "en l'état". Am-XamXAm met en œuvre des moyens raisonnables pour assurer la disponibilité et l'exactitude du contenu, sans garantir une disponibilité continue ni l'absence totale d'erreur dans le contenu pédagogique.
- **[À trancher avec un juriste]** : clause de limitation de responsabilité, droit applicable, juridiction compétente en cas de litige.

---

# Partie B — Politique de confidentialité

## 1. Qui collecte les données

Am-XamXAm, éditeur du Service. Les données sont hébergées chez des sous-traitants techniques (Supabase pour la base de données, Cloudflare pour l'hébergement applicatif) le paiement se négociant directement sur WhatsApp, hors plateforme.

## 2. Données collectées

| Donnée | Finalité | Obligatoire ? |
|---|---|---|
| Prénom / nom affiché | Personnalisation du compte | Oui |
| Adresse e-mail | Connexion, confirmation d'appareil, e-mails de rappel/confirmation | Oui |
| Mot de passe | Authentification (stocké de façon chiffrée par Supabase, jamais en clair) | Oui |
| Classe | Accès au contenu correspondant | Oui |
| Statut mineur + e-mail parent | Conformité protection des mineurs | Si mineur |
| Historique d'abonnement / paiement (montant, date, plan) | Gestion de l'accès, support | Automatique à l'achat |
| Identifiant d'appareil (cookie technique) | Sécurité du compte (verrou par appareil) | Automatique |
| Compteur de questions posées à l'assistant IA | Application du quota d'usage | Automatique — **le contenu des questions n'est pas conservé** |

**Ce qui n'est jamais collecté** : numéro de carte bancaire ou de compte mobile money (le paiement se négocie sur WhatsApp, en dehors de la plateforme), contenu des conversations avec l'assistant IA, données de géolocalisation précise.

## 3. Ce que nous ne faisons jamais

- Aucune revente ni partage des données personnelles à des tiers à des fins commerciales.
- Aucune publicité ciblée basée sur les données des utilisateurs à l'intérieur du Service.
- Aucun accès aux conversations de l'assistant par un tiers autre que l'élève lui-même (elles ne sont de toute façon pas stockées au-delà de l'échange en cours).

## 4. Sécurité des données

- Contrôle d'accès strict au niveau de la base de données elle-même (Row Level Security) : un utilisateur ne peut techniquement accéder qu'à ses propres données, indépendamment de l'interface utilisée.
- Le personnel Am-XamXAm ayant accès aux données d'administration est limité aux rôles staff/admin, eux-mêmes tracés.

## 5. Durée de conservation

- Compte actif : conservation tant que le compte existe.
- Compte supprimé : **[à préciser avec un juriste]** — délai de purge effective à formaliser (recommandation courante : suppression sous 30 jours, sauf obligation légale de conservation des données de facturation, généralement plusieurs années au Sénégal — à confirmer).

## 6. Mineurs

- Un utilisateur mineur doit renseigner un e-mail parental à l'inscription.
- **[À trancher avec un juriste]** : mécanisme de consentement parental actif (aujourd'hui, le champ est collecté mais son exploitation — ex. envoi d'une confirmation au parent — n'est pas encore automatisée dans l'application ; à formaliser avant une ouverture publique à grande échelle).

## 7. Droits de l'utilisateur

Conformément à la réglementation sénégalaise sur les données personnelles, tout utilisateur (ou son représentant légal pour un mineur) peut demander :
- l'accès aux données le concernant,
- leur rectification,
- leur suppression,
- le retrait de son consentement (fermeture de compte).

Demande à adresser à **[adresse de contact à définir]**.

## 8. Déclaration auprès de l'autorité compétente

**[À faire avant ouverture publique]** : déclaration/autorisation auprès de la Commission de protection des données personnelles (CDP) du Sénégal, requise pour un traitement de données incluant des mineurs et des données de paiement.

---

## Note finale pour le porteur de projet

Les sections marquées **[À trancher/À faire avec un juriste]** sont les points bloquants restants avant de retirer la mention "version provisoire" des pages `/conditions` et `/confidentialite`. Tant qu'elles ne sont pas résolues, il est recommandé de garder ces pages en l'état actuel plutôt que de publier ce brouillon tel quel.
