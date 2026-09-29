-- Verrouillage par appareil : un compte n'est utilisable que sur l'appareil
-- où il a été créé (identifié par un cookie longue durée côté client, pas
-- une empreinte navigateur). Un nouvel appareil déclenche un e-mail de
-- confirmation (lien à usage unique, expirant, et lié à l'appareil qui l'a
-- demandé — donc non partageable : l'ouvrir depuis un autre appareil échoue
-- faute de correspondance de cookie). Un seul appareil actif à la fois :
-- confirmer un nouvel appareil remplace l'ancien.

create table public.trusted_devices (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  device_id  text not null,
  trusted_at timestamptz not null default now()
);

create table public.device_confirmations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  device_id  text not null,
  token      text not null unique,
  expires_at timestamptz not null default now() + interval '30 minutes',
  created_at timestamptz not null default now()
);
create index device_confirmations_lookup_idx on public.device_confirmations (user_id, device_id, created_at desc);

alter table public.trusted_devices enable row level security;
revoke all on public.trusted_devices from anon, authenticated;
grant select on public.trusted_devices to authenticated;
create policy trusted_devices_self_read on public.trusted_devices for select to authenticated
  using (user_id = auth.uid());

alter table public.device_confirmations enable row level security;
revoke all on public.device_confirmations from anon, authenticated;
-- Pas d'accès direct côté client : uniquement via les fonctions ci-dessous
-- (SECURITY DEFINER), pour ne jamais exposer les tokens en base via une
-- requête select ordinaire mal filtrée.

-- Enregistre (ou remplace) l'appareil de confiance de l'utilisateur courant.
-- Appelée à l'inscription et à la confirmation d'un nouvel appareil.
create function public.register_trusted_device(p_device_id text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null or coalesce(trim(p_device_id), '') = '' then
    raise exception 'Appareil invalide' using errcode = '22023';
  end if;
  insert into public.trusted_devices (user_id, device_id, trusted_at)
  values (auth.uid(), p_device_id, now())
  on conflict (user_id) do update set device_id = excluded.device_id, trusted_at = now();
end;
$$;
grant execute on function public.register_trusted_device(text) to authenticated;

-- Vrai si l'appareil courant est celui enregistré pour l'utilisateur. Faux
-- (y compris) si aucun appareil n'a encore été enregistré : un compte créé
-- avant cette fonctionnalité devra confirmer son appareil une première fois.
create function public.is_device_trusted(p_device_id text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.trusted_devices
    where user_id = auth.uid() and device_id = p_device_id
  );
$$;
grant execute on function public.is_device_trusted(text) to authenticated;

-- Crée (ou réutilise, si une demande récente non expirée existe déjà pour ne
-- pas spammer) un jeton de confirmation pour l'appareil courant et purge les
-- anciennes demandes expirées de l'utilisateur.
create function public.request_device_confirmation(p_device_id text) returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_token text;
begin
  if auth.uid() is null or coalesce(trim(p_device_id), '') = '' then
    raise exception 'Appareil invalide' using errcode = '22023';
  end if;

  delete from public.device_confirmations
  where user_id = auth.uid() and expires_at < now();

  select token into v_token
  from public.device_confirmations
  where user_id = auth.uid() and device_id = p_device_id and created_at > now() - interval '2 minutes'
  order by created_at desc
  limit 1;
  if v_token is not null then
    return v_token;
  end if;

  -- Deux uuid v4 concaténés (sans tiret) : 256 bits d'aléa, sans dépendre de
  -- l'extension pgcrypto (gen_random_uuid() est dans le cœur de Postgres depuis la 13).
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.device_confirmations (user_id, device_id, token)
  values (auth.uid(), p_device_id, v_token);
  return v_token;
end;
$$;
grant execute on function public.request_device_confirmation(text) to authenticated;

-- Valide le jeton ET l'appareil (le cookie envoyé par le navigateur qui
-- ouvre le lien doit correspondre à celui qui a fait la demande) : c'est ce
-- qui rend le lien non partageable, indépendamment de sa présence dans
-- l'e-mail. Remplace l'appareil de confiance en cas de succès.
create function public.confirm_device(p_token text, p_device_id text) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_found boolean;
begin
  if auth.uid() is null then
    return false;
  end if;
  select exists (
    select 1 from public.device_confirmations
    where token = p_token and user_id = auth.uid() and device_id = p_device_id and expires_at > now()
  ) into v_found;
  if not v_found then
    return false;
  end if;

  insert into public.trusted_devices (user_id, device_id, trusted_at)
  values (auth.uid(), p_device_id, now())
  on conflict (user_id) do update set device_id = excluded.device_id, trusted_at = now();

  delete from public.device_confirmations where user_id = auth.uid();
  return true;
end;
$$;
grant execute on function public.confirm_device(text, text) to authenticated;
