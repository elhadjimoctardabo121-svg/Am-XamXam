-- Prépare la base pour les automatisations Make (Phase 8) : rappels
-- d'expiration d'abonnement + e-mails de confirmation.
--
-- Problème à résoudre : Make (via la clé service_role, exposée par
-- PostgREST) ne peut PAS lire le schéma `auth` — seul `public` est exposé.
-- Il faut donc copier l'e-mail dans `profiles` pour que Make (et plus tard
-- l'admin) puisse l'utiliser sans toucher à auth.users.

alter table public.profiles add column email text;

-- Recopie l'e-mail à l'inscription (en plus du reste, inchangé).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_minor  boolean := case lower(coalesce(new.raw_user_meta_data ->> 'is_minor', 'true'))
                        when 'false' then false else true end;
  v_parent text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'parent_email', '')), '');
begin
  insert into public.profiles (id, role, display_name, email)
  values (new.id, 'student', left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 60), new.email);

  insert into public.students (id, is_minor) values (new.id, v_minor);

  if v_minor and v_parent is not null then
    insert into public.consents (student_id, parent_email) values (new.id, v_parent);
  end if;
  return new;
end;
$$;

-- Comble les comptes déjà inscrits avant cette migration.
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

-- ---------------------------------------------------------------------------
-- Suivi des rappels déjà envoyés (évite les doublons d'un jour sur l'autre).
-- ---------------------------------------------------------------------------
alter table public.subscriptions
  add column reminder_7d_sent_at timestamptz,
  add column reminder_3d_sent_at timestamptz,
  add column reminder_1d_sent_at timestamptz;

-- ---------------------------------------------------------------------------
-- Vue consommée par le scénario Make quotidien : ne renvoie QUE les
-- abonnements pour lesquels un rappel précis doit partir aujourd'hui. Toute
-- la logique de seuil (7j/3j/1j, déjà envoyé ou non) vit ici, en SQL testé,
-- plutôt que dans le scénario Make — plus simple à vérifier, moins fragile.
-- Pas de grant anon/authenticated : seule la clé service_role (utilisée par
-- Make) peut la lire, comme pour email_logs.
-- ---------------------------------------------------------------------------
create view public.subscription_reminders_due as
select
  s.id as subscription_id,
  s.user_id,
  p.email,
  p.display_name,
  s.plan,
  s.ends_at,
  case
    when s.ends_at::date - current_date = 7 then '7d'
    when s.ends_at::date - current_date = 3 then '3d'
    when s.ends_at::date - current_date = 1 then '1d'
  end as reminder_kind
from public.subscriptions s
join public.profiles p on p.id = s.user_id
where s.status = 'active'
  and p.email is not null
  and (
    (s.ends_at::date - current_date = 7 and s.reminder_7d_sent_at is null)
    or (s.ends_at::date - current_date = 3 and s.reminder_3d_sent_at is null)
    or (s.ends_at::date - current_date = 1 and s.reminder_1d_sent_at is null)
  );

revoke all on public.subscription_reminders_due from anon, authenticated;
