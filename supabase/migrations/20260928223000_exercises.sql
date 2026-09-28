-- Ajoute les exercices (dissertation, commentaire, QCM, quiz éclair) rattachés
-- à un chapitre. Réutilise volontairement les mêmes règles que les leçons :
-- même workflow de statut (enforce_content_rules / audit_content_status) et
-- même règle de lecture (lesson_readable, générique malgré son nom : elle ne
-- lit que chapter_id/status/access_tier, valables ici aussi).

create table public.exercises (
  id            uuid primary key default gen_random_uuid(),
  chapter_id    uuid not null references public.chapters (id) on delete cascade,
  position      smallint not null,
  type          text not null check (type in ('dissertation', 'commentaire', 'qcm', 'quiz', 'autre')),
  title         text not null,
  statement_md  text not null default '',
  correction_md text not null default '',
  status        public.content_status not null default 'draft',
  access_tier   public.access_tier not null default 'premium',
  source        text,
  reference     text,
  reviewed_by   uuid references public.profiles (id),
  reviewed_at   timestamptz,
  created_by    uuid references public.profiles (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (chapter_id, position)
);
create index exercises_browse_idx on public.exercises (chapter_id, position);

create trigger exercises_updated_at before update on public.exercises
  for each row execute function public.set_updated_at();
create trigger exercises_rules before insert or update on public.exercises
  for each row execute function public.enforce_content_rules();
create trigger exercises_audit after insert or update on public.exercises
  for each row execute function public.audit_content_status();

alter table public.exercises enable row level security;

revoke all on public.exercises from anon, authenticated;
grant select on public.exercises to anon, authenticated;
grant insert, update, delete on public.exercises to authenticated;

-- Même règle de lecture que les leçons : publié + (gratuit ou abonnement actif).
create policy exercises_read_allowed on public.exercises for select to anon, authenticated
  using (public.lesson_readable(chapter_id, status, access_tier));
create policy exercises_staff_all on public.exercises for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
