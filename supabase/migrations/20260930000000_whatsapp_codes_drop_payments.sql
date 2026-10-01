-- Remplace le paiement en ligne (PayTech) par une demande de code via
-- WhatsApp : l'élève contacte l'équipe sur WhatsApp, paie hors plateforme
-- (mobile money de la main à la main / dépôt), reçoit un code et l'active
-- lui-même depuis /code. Plus besoin de webhook IPN ni de la table
-- payments, qui ne servait qu'au suivi des transactions PayTech.

-- Nouveau palier : code d'essai d'une semaine, pour laisser un élève tester
-- avant de s'engager sur un abonnement payant.
insert into public.plans (code, name, price_fcfa, duration_days, scope, position)
values ('essai-semaine', 'Essai — 1 semaine', 0, 7, 'classe', 0)
on conflict (code) do nothing;

drop table if exists public.payments;
