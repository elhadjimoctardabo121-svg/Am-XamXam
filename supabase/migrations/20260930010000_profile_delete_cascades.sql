-- Corrige un oubli : supprimer un compte depuis Supabase Auth échouait
-- ("violates foreign key constraint") dès que ce compte avait une activation
-- de code, une notification, ou un usage de l'assistant IA enregistrés —
-- plusieurs clés étrangères vers profiles n'avaient pas de comportement
-- ON DELETE explicite (donc RESTRICT par défaut). Corrige aussi le droit à
-- la suppression déjà promis dans la politique de confidentialité.
--
-- Deux familles de cas :
-- 1) Données PROPRES à l'utilisateur (activations, notifications, usage IA) :
--    supprimées avec lui (CASCADE).
-- 2) Simple ATTRIBUTION sur un contenu qui ne lui appartient pas (ex. un
--    admin qui a créé/validé une leçon) : le contenu doit survivre à la
--    suppression du compte, seule la référence est effacée (SET NULL).

alter table public.ai_usage drop constraint ai_usage_user_id_fkey,
  add constraint ai_usage_user_id_fkey foreign key (user_id) references public.profiles (id) on delete cascade;

alter table public.code_activations drop constraint code_activations_user_id_fkey,
  add constraint code_activations_user_id_fkey foreign key (user_id) references public.profiles (id) on delete cascade;

alter table public.notifications drop constraint notifications_user_id_fkey,
  add constraint notifications_user_id_fkey foreign key (user_id) references public.profiles (id) on delete cascade;

alter table public.access_codes drop constraint access_codes_created_by_fkey,
  add constraint access_codes_created_by_fkey foreign key (created_by) references public.profiles (id) on delete set null;

alter table public.app_settings drop constraint app_settings_updated_by_fkey,
  add constraint app_settings_updated_by_fkey foreign key (updated_by) references public.profiles (id) on delete set null;

alter table public.chapters
  drop constraint chapters_created_by_fkey,
  add constraint chapters_created_by_fkey foreign key (created_by) references public.profiles (id) on delete set null,
  drop constraint chapters_reviewed_by_fkey,
  add constraint chapters_reviewed_by_fkey foreign key (reviewed_by) references public.profiles (id) on delete set null;

alter table public.lessons
  drop constraint lessons_created_by_fkey,
  add constraint lessons_created_by_fkey foreign key (created_by) references public.profiles (id) on delete set null,
  drop constraint lessons_reviewed_by_fkey,
  add constraint lessons_reviewed_by_fkey foreign key (reviewed_by) references public.profiles (id) on delete set null;

alter table public.exercises
  drop constraint exercises_created_by_fkey,
  add constraint exercises_created_by_fkey foreign key (created_by) references public.profiles (id) on delete set null,
  drop constraint exercises_reviewed_by_fkey,
  add constraint exercises_reviewed_by_fkey foreign key (reviewed_by) references public.profiles (id) on delete set null;

alter table public.exam_papers
  drop constraint exam_papers_created_by_fkey,
  add constraint exam_papers_created_by_fkey foreign key (created_by) references public.profiles (id) on delete set null,
  drop constraint exam_papers_reviewed_by_fkey,
  add constraint exam_papers_reviewed_by_fkey foreign key (reviewed_by) references public.profiles (id) on delete set null;

alter table public.lesson_resources drop constraint lesson_resources_created_by_fkey,
  add constraint lesson_resources_created_by_fkey foreign key (created_by) references public.profiles (id) on delete set null;

-- Effet de bord découvert en testant ce qui précède : enforce_content_rules()
-- vérifiait "reviewed_by is null" de façon INCONDITIONNELLE à chaque
-- insert/update d'une ligne publiée — pas seulement au moment où elle
-- DEVIENT publiée. Résultat : le SET NULL ci-dessus sur reviewed_by (compte
-- du relecteur supprimé) se heurtait lui-même à cette règle et bloquait la
-- suppression du compte. La règle doit s'appliquer à la création du
-- contenu et au moment précis de la publication, jamais aux mises à jour
-- ultérieures d'un contenu déjà publié (ex. ce SET NULL, ou un simple
-- changement de titre).
create or replace function public.enforce_content_rules() returns trigger
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
    if new.status = 'published' and new.reviewed_by is null then
      raise exception 'Publication impossible sans validateur humain' using errcode = '42501';
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
      if new.reviewed_by is null then
        raise exception 'Publication impossible sans validateur humain' using errcode = '42501';
      end if;
    end if;
  end if;
  return new;
end;
$$;
