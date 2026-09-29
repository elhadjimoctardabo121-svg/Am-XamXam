-- Ressources complémentaires par leçon (texte, image, vidéo, audio), sous
-- forme de liens externes — pour aider à la compréhension sans héberger de
-- fichiers volumineux nous-mêmes (voir marge du Worker Cloudflare, audit
-- technique section 15). Une ressource suit strictement la visibilité de sa
-- leçon : pas de statut ni de palier gratuit/premium propres, pour éviter le
-- même genre de désynchronisation déjà rencontré sur les exercices.

create table public.lesson_resources (
  id         uuid primary key default gen_random_uuid(),
  lesson_id  uuid not null references public.lessons (id) on delete cascade,
  type       text not null check (type in ('texte', 'image', 'video', 'audio', 'autre')),
  title      text not null,
  url        text not null check (url ~* '^https?://'),
  position   smallint not null default 1,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lesson_id, position)
);
create index lesson_resources_lesson_idx on public.lesson_resources (lesson_id);

create trigger lesson_resources_updated_at before update on public.lesson_resources
  for each row execute function public.set_updated_at();

alter table public.lesson_resources enable row level security;
revoke all on public.lesson_resources from anon, authenticated;
grant select on public.lesson_resources to anon, authenticated;
grant insert, update, delete on public.lesson_resources to authenticated;

create policy lesson_resources_read_allowed on public.lesson_resources for select to anon, authenticated
  using (
    exists (
      select 1 from public.lessons l
      where l.id = lesson_id
        and public.lesson_readable(l.chapter_id, l.status, l.access_tier)
    )
  );
create policy lesson_resources_staff_all on public.lesson_resources for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
