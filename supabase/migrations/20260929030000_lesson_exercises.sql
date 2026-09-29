-- Exercices par leçon (distincts des exercices de fin de chapitre) : QCM,
-- quiz éclair, dissertation ou commentaire, rattachés à UNE leçon précise
-- plutôt qu'à tout le chapitre. On réutilise la table exercises existante
-- (même workflow, même RLS, même lecteur interactif) au lieu d'en dupliquer
-- une : chapter_id devient optionnel, lesson_id s'ajoute, exactement un des
-- deux doit être renseigné.

alter table public.exercises alter column chapter_id drop not null;
alter table public.exercises add column lesson_id uuid references public.lessons (id) on delete cascade;

alter table public.exercises add constraint exercises_scope_check
  check ((chapter_id is not null and lesson_id is null) or (chapter_id is null and lesson_id is not null));

-- L'ancienne contrainte (chapter_id, position) ne convient plus : elle
-- interdirait deux exercices de leçons différentes à la même position.
alter table public.exercises drop constraint exercises_chapter_id_position_key;
create unique index exercises_chapter_position_idx on public.exercises (chapter_id, position) where chapter_id is not null;
create unique index exercises_lesson_position_idx on public.exercises (lesson_id, position) where lesson_id is not null;

create index exercises_lesson_idx on public.exercises (lesson_id) where lesson_id is not null;

-- lesson_readable() ne convient qu'aux lignes qui connaissent déjà leur
-- chapter_id directement ; un exercice de leçon ne l'a plus. On ajoute une
-- fonction dédiée qui résout le chapitre via lesson_id quand nécessaire,
-- et on bascule la policy de lecture des exercices dessus.
create function public.exercise_readable(
  p_chapter_id uuid, p_lesson_id uuid, p_status public.content_status, p_tier public.access_type
) returns boolean
language sql stable security definer set search_path = ''
as $$
  select p_status = 'published'
     and exists (
       select 1 from public.chapters c
       where c.id = coalesce(p_chapter_id, (select l.chapter_id from public.lessons l where l.id = p_lesson_id))
         and c.status = 'published'
         and public.has_access(p_tier, c.class_id, c.subject_id)
     );
$$;

drop policy exercises_read_allowed on public.exercises;
create policy exercises_read_allowed on public.exercises for select to anon, authenticated
  using (public.exercise_readable(chapter_id, lesson_id, status, access_tier));
