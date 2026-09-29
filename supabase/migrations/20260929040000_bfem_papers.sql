-- Sujets d'examen (BFEM pour l'instant) avec corrigé, organisés par année
-- puis par matière. Contenu indépendant des chapitres/leçons (un sujet
-- couvre tout le programme d'une session), donc une table à part plutôt
-- qu'un rattachement à exercises. Même workflow de statut et même règle de
-- lecture (gratuit/premium) que le reste du catalogue.

create table public.exam_papers (
  id            uuid primary key default gen_random_uuid(),
  class_id      uuid not null references public.classes (id),
  subject_id    uuid not null references public.subjects (id),
  exam          text not null default 'BFEM' check (exam in ('BFEM', 'BAC')),
  year          smallint not null check (year between 2000 and 2100),
  title         text not null,
  statement_md  text not null default '',
  correction_md text not null default '',
  status        public.content_status not null default 'draft',
  access_tier   public.access_type not null default 'premium',
  source        text,
  reference     text,
  reviewed_by   uuid references public.profiles (id),
  reviewed_at   timestamptz,
  created_by    uuid references public.profiles (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (class_id, subject_id, exam, year)
);
create index exam_papers_browse_idx on public.exam_papers (class_id, exam, year desc, subject_id);

create trigger exam_papers_updated_at before update on public.exam_papers
  for each row execute function public.set_updated_at();
create trigger exam_papers_rules before insert or update on public.exam_papers
  for each row execute function public.enforce_content_rules();
create trigger exam_papers_audit after insert or update on public.exam_papers
  for each row execute function public.audit_content_status();

alter table public.exam_papers enable row level security;
revoke all on public.exam_papers from anon, authenticated;
grant select on public.exam_papers to anon, authenticated;
grant insert, update, delete on public.exam_papers to authenticated;

-- Même règle que les leçons : publié + (gratuit ou abonnement actif couvrant
-- la classe et la matière). lesson_readable() convient telle quelle : elle ne
-- lit que (status, access_tier) + la classe/matière du chapitre — ici on lui
-- passe directement class_id/subject_id du sujet au lieu de les résoudre via
-- un chapitre, donc on réutilise has_access() directement plutôt que
-- lesson_readable() (qui attend un chapter_id).
create policy exam_papers_read_allowed on public.exam_papers for select to anon, authenticated
  using (status = 'published' and public.has_access(access_tier, class_id, subject_id));
create policy exam_papers_staff_all on public.exam_papers for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
