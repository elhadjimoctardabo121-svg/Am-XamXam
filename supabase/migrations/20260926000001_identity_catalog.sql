-- Incrément 1 : identité, catalogue de contenus, abonnements, audit, RLS.
--
-- Règles de ce fichier (à respecter pour toute nouvelle table) :
--   1. RLS activée sur chaque table du schéma public.
--   2. Aucun droit par défaut : on révoque tout à anon/authenticated puis on
--      accorde explicitement, colonne par colonne quand c'est nécessaire.
--   3. Les fonctions SECURITY DEFINER fixent search_path = '' et qualifient tout.
--   4. Les contenus sont "premium" et "draft" par défaut (fermé par défaut).

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.user_role           as enum ('student', 'parent', 'teacher', 'editor', 'admin');
create type public.content_status      as enum ('draft', 'in_review', 'validated', 'published', 'archived');
create type public.access_tier         as enum ('free', 'premium');
create type public.consent_status      as enum ('pending', 'granted', 'revoked');
create type public.subscription_status as enum ('active', 'expired', 'cancelled');
create type public.link_status         as enum ('pending', 'accepted', 'revoked');

-- ---------------------------------------------------------------------------
-- Utilitaires
-- ---------------------------------------------------------------------------
create function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Référentiel : classes (niveaux scolaires) et matières
-- ---------------------------------------------------------------------------
create table public.classes (
  id       uuid primary key default gen_random_uuid(),
  code     text not null unique,
  name     text not null,
  exam     text not null,            -- 'BFEM' | 'BAC'
  position smallint not null default 0
);

create table public.subjects (
  id       uuid primary key default gen_random_uuid(),
  code     text not null unique,
  name     text not null,
  position smallint not null default 0
);

-- ---------------------------------------------------------------------------
-- Identité
-- ---------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  role         public.user_role not null default 'student',
  display_name text not null default '' check (char_length(display_name) <= 60),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.students (
  id         uuid primary key references public.profiles (id) on delete cascade,
  class_id   uuid references public.classes (id),
  series     text,                   -- série de Terminale, à définir (décision section 25)
  exam_date  date,
  is_minor   boolean not null default true,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger students_updated_at before update on public.students
  for each row execute function public.set_updated_at();

create table public.parents (
  id         uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.teachers (
  id         uuid primary key references public.profiles (id) on delete cascade,
  school     text,
  created_at timestamptz not null default now()
);

create table public.parent_student_links (
  parent_id  uuid not null references public.parents (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  status     public.link_status not null default 'pending',
  created_at timestamptz not null default now(),
  primary key (parent_id, student_id)
);

create table public.consents (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.students (id) on delete cascade,
  parent_email text not null,
  status       public.consent_status not null default 'pending',
  requested_at timestamptz not null default now(),
  granted_at   timestamptz
);
create index consents_student_idx on public.consents (student_id);

-- ---------------------------------------------------------------------------
-- Catalogue : chapitres et leçons (6 niveaux de contenu, le 6e = exercices)
-- ---------------------------------------------------------------------------
create table public.chapters (
  id            uuid primary key default gen_random_uuid(),
  class_id      uuid not null references public.classes (id),
  subject_id    uuid not null references public.subjects (id),
  slug          text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title         text not null,
  position      smallint not null default 0,
  summary       text,
  status        public.content_status not null default 'draft',
  access_tier   public.access_tier not null default 'premium',
  source        text,
  reference     text,
  curriculum_ref text,
  reviewed_by   uuid references public.profiles (id),
  reviewed_at   timestamptz,
  created_by    uuid references public.profiles (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (class_id, subject_id, slug)
);
create index chapters_browse_idx on public.chapters (class_id, subject_id, position);
create trigger chapters_updated_at before update on public.chapters
  for each row execute function public.set_updated_at();

create table public.lessons (
  id          uuid primary key default gen_random_uuid(),
  chapter_id  uuid not null references public.chapters (id) on delete cascade,
  level       smallint not null check (level between 1 and 5),
  title       text not null,
  body_md     text not null default '',
  status      public.content_status not null default 'draft',
  access_tier public.access_tier not null default 'premium',
  source      text,
  reference   text,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (chapter_id, level)
);
create trigger lessons_updated_at before update on public.lessons
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Abonnements (écrits uniquement par le serveur : webhook, code, admin)
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  class_id   uuid references public.classes (id),   -- null = toutes les classes
  plan       text not null,
  status     public.subscription_status not null default 'active',
  source     text not null default 'payment'
             check (source in ('payment', 'code', 'referral', 'promo', 'admin')),
  starts_at  timestamptz not null default now(),
  ends_at    timestamptz not null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index subscriptions_active_idx on public.subscriptions (user_id, status, ends_at);

-- ---------------------------------------------------------------------------
-- Journal d'audit (append-only, écrit par triggers et fonctions serveur)
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id         bigint generated always as identity primary key,
  actor_id   uuid,
  action     text not null,
  entity     text not null,
  entity_id  uuid,
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs (entity, entity_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Fonctions d'autorisation (utilisées par les politiques RLS)
-- ---------------------------------------------------------------------------
create function public.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  );
$$;

create function public.is_staff() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('editor', 'admin')
  );
$$;

-- Droit d'accès à un contenu d'un niveau (classe) donné.
create function public.has_access(p_tier public.access_tier, p_class_id uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select p_tier = 'free'
      or exists (
        select 1 from public.subscriptions s
        where s.user_id = auth.uid()
          and s.status = 'active'
          and s.starts_at <= now()
          and s.ends_at > now()
          and (s.class_id is null or s.class_id = p_class_id)
      );
$$;

-- Une leçon est lisible si elle et son chapitre sont publiés ET que l'accès est ouvert.
create function public.lesson_readable(
  p_chapter_id uuid, p_status public.content_status, p_tier public.access_tier
) returns boolean
language sql stable security definer set search_path = ''
as $$
  select p_status = 'published'
     and exists (
       select 1 from public.chapters c
       where c.id = p_chapter_id
         and c.status = 'published'
         and public.has_access(p_tier, c.class_id)
     );
$$;

-- ---------------------------------------------------------------------------
-- Création automatique du profil à l'inscription
-- Le rôle n'est JAMAIS lu depuis les métadonnées : toujours 'student'.
-- ---------------------------------------------------------------------------
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_minor  boolean := case lower(coalesce(new.raw_user_meta_data ->> 'is_minor', 'true'))
                        when 'false' then false else true end;
  v_parent text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'parent_email', '')), '');
begin
  insert into public.profiles (id, role, display_name)
  values (new.id, 'student', left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 60));

  insert into public.students (id, is_minor) values (new.id, v_minor);

  if v_minor and v_parent is not null then
    insert into public.consents (student_id, parent_email) values (new.id, v_parent);
  end if;
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Workflow de validation : brouillon → relu → validé → publié
--   * création : toujours en brouillon (sauf import serveur sans utilisateur)
--   * "validé" : posé par un éditeur/admin, qui devient reviewed_by
--   * "publié" : admin uniquement, et seulement depuis "validé"
--   * jamais de publication sans validateur humain identifié
-- ---------------------------------------------------------------------------
create function public.enforce_content_rules() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    if v_actor is not null and new.status <> 'draft' then
      raise exception 'Un contenu doit être créé en brouillon' using errcode = '42501';
    end if;
    if v_actor is not null then
      new.created_by := v_actor;
    end if;
  elsif new.status is distinct from old.status then
    if new.status = 'validated' and v_actor is not null then
      new.reviewed_by := v_actor;
      new.reviewed_at := now();
    end if;
    if new.status = 'published' then
      if old.status <> 'validated' then
        raise exception 'Seul un contenu validé peut être publié' using errcode = '42501';
      end if;
      if v_actor is not null and not public.is_admin() then
        raise exception 'Seul un administrateur peut publier' using errcode = '42501';
      end if;
    end if;
  end if;

  if new.status = 'published' and new.reviewed_by is null then
    raise exception 'Publication impossible sans validateur humain' using errcode = '42501';
  end if;
  return new;
end;
$$;

create function public.audit_content_status() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_from public.content_status;
begin
  if tg_op = 'UPDATE' then
    v_from := old.status;
    if new.status is not distinct from v_from then
      return new;
    end if;
  end if;

  insert into public.audit_logs (actor_id, action, entity, entity_id, meta)
  values (
    auth.uid(),
    'content.status_changed',
    tg_table_name,
    new.id,
    jsonb_build_object('from', v_from, 'to', new.status)
  );
  return new;
end;
$$;

create trigger chapters_rules before insert or update on public.chapters
  for each row execute function public.enforce_content_rules();
create trigger lessons_rules before insert or update on public.lessons
  for each row execute function public.enforce_content_rules();
create trigger chapters_audit after insert or update on public.chapters
  for each row execute function public.audit_content_status();
create trigger lessons_audit after insert or update on public.lessons
  for each row execute function public.audit_content_status();

-- ---------------------------------------------------------------------------
-- Droits : tout révoquer, puis accorder explicitement
-- ---------------------------------------------------------------------------
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant select on public.classes, public.subjects to anon, authenticated;
grant select on public.chapters, public.lessons  to anon, authenticated;

grant select on public.profiles, public.students, public.parents, public.teachers,
                public.parent_student_links, public.consents, public.subscriptions,
                public.audit_logs to authenticated;

-- Colonnes modifiables par l'utilisateur lui-même (le rôle et is_minor ne le sont pas).
grant update (display_name) on public.profiles to authenticated;
grant update (class_id, series, exam_date, onboarded_at) on public.students to authenticated;

-- Écriture du catalogue : autorisée aux rôles éditeur/admin par les politiques RLS.
grant insert, update, delete on public.chapters, public.lessons to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.classes              enable row level security;
alter table public.subjects             enable row level security;
alter table public.profiles             enable row level security;
alter table public.students             enable row level security;
alter table public.parents              enable row level security;
alter table public.teachers             enable row level security;
alter table public.parent_student_links enable row level security;
alter table public.consents             enable row level security;
alter table public.chapters             enable row level security;
alter table public.lessons              enable row level security;
alter table public.subscriptions        enable row level security;
alter table public.audit_logs           enable row level security;

-- Référentiel public en lecture, écriture par le serveur (service_role) uniquement.
create policy classes_read  on public.classes  for select to anon, authenticated using (true);
create policy subjects_read on public.subjects for select to anon, authenticated using (true);

-- Identité
create policy profiles_read_own on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy students_read_own on public.students for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy students_update_own on public.students for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy parents_read_own on public.parents for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy teachers_read_own on public.teachers for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy links_read_involved on public.parent_student_links for select to authenticated
  using (parent_id = auth.uid() or student_id = auth.uid() or public.is_admin());

create policy consents_read_own on public.consents for select to authenticated
  using (student_id = auth.uid() or public.is_admin());

-- Catalogue : chapitres publiés visibles par tous (métadonnées), édition par le staff.
create policy chapters_read_published on public.chapters for select to anon, authenticated
  using (status = 'published');
create policy chapters_staff_all on public.chapters for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Corps des leçons : publié ET (gratuit OU droit actif). Le staff voit tout.
create policy lessons_read_allowed on public.lessons for select to anon, authenticated
  using (public.lesson_readable(chapter_id, status, access_tier));
create policy lessons_staff_all on public.lessons for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Abonnements et audit : lecture seule (les siens ; l'admin voit tout).
create policy subscriptions_read_own on public.subscriptions for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy audit_logs_admin_read on public.audit_logs for select to authenticated
  using (public.is_admin());
