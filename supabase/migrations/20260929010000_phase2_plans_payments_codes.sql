-- Phase 2 : abonnements payants, codes d'accès, notifications, journal d'e-mails.
-- Décisions actées (audit technique, section 18) : PayTech en premier fournisseur
-- de paiement (abstrait derrière la table `payments`, jamais codé en dur dans le
-- reste de l'app) ; prix conservés 1500/3500/6500/7500/9500 FCFA ; codes créés
-- par SQL pour l'instant, pas d'interface admin dans cette passe.

-- (access_tier -> access_type + valeurs 'pack'/'admin_only' : voir la
-- migration précédente, 20260929005000_access_type_enum.sql — à exécuter
-- avant celle-ci, dans une transaction séparée.)

-- ---------------------------------------------------------------------------
-- Abonnements : on ajoute la portée par matière (null = toutes les matières
-- de la classe, comme class_id null = toutes les classes).
-- ---------------------------------------------------------------------------
alter table public.subscriptions add column subject_id uuid references public.subjects (id);

-- has_access() sait maintenant vérifier la matière en plus de la classe.
-- 'premium' et 'pack' se résolvent de la même façon : un abonnement actif
-- qui couvre la classe ET (toutes matières OU la matière demandée) suffit —
-- la distinction entre les deux sert à choisir QUEL plan débloque quoi, pas
-- à changer la logique de vérification. 'admin_only' n'est jamais débloqué
-- par un abonnement (seul le staff y accède, via la policy *_staff_all).
-- (drop d'abord : l'ancienne fonction à 2 arguments ne serait pas remplacée
-- par un create or replace à 3 arguments, elle resterait en double inutile.)
drop function if exists public.has_access(public.access_type, uuid);
create function public.has_access(p_tier public.access_type, p_class_id uuid, p_subject_id uuid default null)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select p_tier = 'free'
      or (
        p_tier in ('premium', 'pack')
        and exists (
          select 1 from public.subscriptions s
          where s.user_id = auth.uid()
            and s.status = 'active'
            and s.starts_at <= now()
            and s.ends_at > now()
            and (s.class_id is null or s.class_id = p_class_id)
            and (s.subject_id is null or s.subject_id = p_subject_id)
        )
      );
$$;

-- lesson_readable transmet désormais la matière du chapitre à has_access.
create or replace function public.lesson_readable(
  p_chapter_id uuid, p_status public.content_status, p_tier public.access_type
) returns boolean
language sql stable security definer set search_path = ''
as $$
  select p_status = 'published'
     and exists (
       select 1 from public.chapters c
       where c.id = p_chapter_id
         and c.status = 'published'
         and public.has_access(p_tier, c.class_id, c.subject_id)
     );
$$;

-- ---------------------------------------------------------------------------
-- Plans : catalogue des offres payantes (lecture publique pour la page tarifs).
-- ---------------------------------------------------------------------------
create table public.plans (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique check (code ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name          text not null,
  price_fcfa    integer not null check (price_fcfa >= 0),
  duration_days integer not null check (duration_days > 0),
  scope         text not null check (scope in ('classe', 'matiere')),
  active        boolean not null default true,
  position      smallint not null default 0,
  created_at    timestamptz not null default now()
);

insert into public.plans (code, name, price_fcfa, duration_days, scope, position) values
  ('mensuel',      'Abonnement mensuel',        1500, 30,    'classe',  1),
  ('trimestriel',  'Abonnement trimestriel',    3500, 90,    'classe',  2),
  ('semestriel',   'Abonnement semestriel',     6500, 180,   'classe',  3),
  ('pack-matiere', 'Pack — une matière au choix', 7500, 36500, 'matiere', 4),
  ('annuel',       'Abonnement annuel',         9500, 365,   'classe',  5);

alter table public.plans enable row level security;
revoke all on public.plans from anon, authenticated;
grant select on public.plans to anon, authenticated;
grant insert, update, delete on public.plans to authenticated;
create policy plans_read_active on public.plans for select to anon, authenticated
  using (active or public.is_staff());
create policy plans_staff_all on public.plans for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- Paiements : trace de chaque tentative, quel que soit le fournisseur
-- (PAYMENT_PROVIDER abstrait — jamais "if paytech" dans le reste du code).
-- L'écriture du statut définitif (succès/échec) se fait via le webhook du
-- fournisseur, exécuté avec la clé de service (hors RLS) : voir guide pratique.
-- ---------------------------------------------------------------------------
create table public.payments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id),
  plan_id      uuid not null references public.plans (id),
  provider     text not null check (provider in ('paytech', 'paydunya', 'manuel')),
  provider_ref text,
  amount_fcfa  integer not null check (amount_fcfa >= 0),
  status       text not null default 'pending' check (status in ('pending', 'success', 'failed', 'refunded')),
  created_at   timestamptz not null default now(),
  paid_at      timestamptz
);
create index payments_user_idx on public.payments (user_id, status);

alter table public.payments enable row level security;
revoke all on public.payments from anon, authenticated;
grant select, insert on public.payments to authenticated;
create policy payments_read_own on public.payments for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
-- Un élève ne peut créer qu'une tentative "pending" pour lui-même : le
-- passage à "success" est réservé au webhook (clé de service, hors RLS).
create policy payments_insert_own_pending on public.payments for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');
create policy payments_staff_all on public.payments for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- Codes d'accès : créés par le staff (SQL pour l'instant), rachetés par
-- l'élève via redeem_access_code() ci-dessous — jamais lus/modifiés
-- directement par un élève (pas de policy de lecture pour lui).
-- ---------------------------------------------------------------------------
create table public.access_codes (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  type       text not null check (type in ('abonnement', 'cadeau')),
  plan_id    uuid not null references public.plans (id),
  subject_id uuid references public.subjects (id), -- requis si le plan est à portée 'matiere'
  max_uses   integer not null default 1 check (max_uses > 0),
  uses_count integer not null default 0 check (uses_count >= 0),
  expires_at timestamptz,
  active     boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.code_activations (
  id              uuid primary key default gen_random_uuid(),
  code_id         uuid not null references public.access_codes (id),
  user_id         uuid not null references public.profiles (id),
  subscription_id uuid references public.subscriptions (id),
  activated_at    timestamptz not null default now(),
  unique (code_id, user_id)
);

alter table public.access_codes enable row level security;
alter table public.code_activations enable row level security;
revoke all on public.access_codes, public.code_activations from anon, authenticated;
grant select on public.code_activations to authenticated;
create policy access_codes_staff_all on public.access_codes for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy code_activations_read_own on public.code_activations for select to authenticated
  using (user_id = auth.uid() or public.is_staff());

-- Rachat atomique d'un code : vérifie validité/quota, crée l'abonnement,
-- incrémente le compteur. SECURITY DEFINER pour pouvoir lire access_codes
-- (l'élève n'a pas la permission de le faire directement) et écrire malgré
-- les policies élève-only sur subscriptions/code_activations.
create function public.redeem_access_code(p_code text)
returns table (plan_name text, ends_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare
  v_code public.access_codes%rowtype;
  v_plan public.plans%rowtype;
  v_class_id uuid;
  v_subscription_id uuid;
begin
  select * into v_code from public.access_codes where code = p_code for update;
  if not found then
    raise exception 'Code invalide.' using errcode = 'P0001';
  end if;
  if not v_code.active or (v_code.expires_at is not null and v_code.expires_at <= now()) then
    raise exception 'Ce code a expiré ou n''est plus actif.' using errcode = 'P0001';
  end if;
  if v_code.uses_count >= v_code.max_uses then
    raise exception 'Ce code a déjà été utilisé le nombre maximum de fois.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.code_activations where code_id = v_code.id and user_id = auth.uid()) then
    raise exception 'Tu as déjà utilisé ce code.' using errcode = 'P0001';
  end if;

  select * into v_plan from public.plans where id = v_code.plan_id;
  if v_plan.scope = 'matiere' and v_code.subject_id is null then
    raise exception 'Code mal configuré : matière manquante.' using errcode = 'P0001';
  end if;

  select s.class_id into v_class_id from public.students s where s.id = auth.uid();
  if not found then
    raise exception 'Choisis d''abord ta classe avant d''utiliser un code.' using errcode = 'P0001';
  end if;

  insert into public.subscriptions (user_id, class_id, subject_id, plan, status, source, starts_at, ends_at)
  values (
    auth.uid(),
    case when v_plan.scope = 'classe' then v_class_id else null end,
    case when v_plan.scope = 'matiere' then v_code.subject_id else null end,
    v_plan.code,
    'active',
    case v_code.type when 'cadeau' then 'promo' else 'code' end,
    now(),
    now() + make_interval(days => v_plan.duration_days)
  )
  returning id into v_subscription_id;

  insert into public.code_activations (code_id, user_id, subscription_id) values (v_code.id, auth.uid(), v_subscription_id);
  update public.access_codes set uses_count = uses_count + 1 where id = v_code.id;

  return query select v_plan.name, (select s.ends_at from public.subscriptions s where s.id = v_subscription_id);
end;
$$;
revoke all on function public.redeem_access_code(text) from public;
grant execute on function public.redeem_access_code(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Notifications in-app (ex. "ton abonnement expire bientôt").
-- ---------------------------------------------------------------------------
create table public.notifications (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles (id),
  type       text not null,
  title      text not null,
  body       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, read_at);

alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select, update on public.notifications to authenticated;
create policy notifications_read_own on public.notifications for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
-- Un élève ne peut que marquer SES notifications comme lues (pas en créer,
-- pas en changer le contenu) : le staff/les fonctions serveur les créent.
create policy notifications_mark_read on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_staff_all on public.notifications for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- Journal des e-mails envoyés (audit, indépendant du fournisseur SMTP).
-- ---------------------------------------------------------------------------
create table public.email_logs (
  id         bigint generated always as identity primary key,
  recipient  text not null,
  template   text not null,
  provider   text not null default 'brevo',
  status     text not null check (status in ('sent', 'failed')),
  error      text,
  sent_at    timestamptz not null default now()
);

alter table public.email_logs enable row level security;
revoke all on public.email_logs from anon, authenticated;
create policy email_logs_staff_all on public.email_logs for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- Réglages globaux (clé/valeur), réservés au staff pour l'instant.
-- ---------------------------------------------------------------------------
create table public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;
create policy app_settings_staff_all on public.app_settings for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
