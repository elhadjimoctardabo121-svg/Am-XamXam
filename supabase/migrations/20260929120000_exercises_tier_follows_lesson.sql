-- Diagnostic : les exercices par leçon étaient TOUS en 'premium' (152/152),
-- indépendamment du fait que leur leçon soit gratuite ou non. Résultat : même
-- une leçon gratuite (ex. tout le chapitre I d'Histoire) affichait sa leçon
-- mais aucun de ses exercices aux élèves non abonnés — la section
-- "S'entraîner sur cette leçon" disparaissait entièrement (lesson.exercises
-- vide côté RLS), sans même un message "réservé aux abonnés".
--
-- Règle demandée : l'accès d'un exercice de leçon suit STRICTEMENT celui de
-- sa leçon (leçon gratuite -> exercices gratuits ; leçon premium -> exercices
-- premium, ce qui est déjà correct puisque la leçon elle-même est alors
-- verrouillée en amont). On synchronise l'existant, puis on impose la règle
-- en base pour ne plus jamais pouvoir désynchroniser les deux (même erreur
-- que pour les sujets BFEM : mieux vaut l'empêcher au niveau base qu'au
-- niveau d'un script d'import qui peut l'oublier).

update public.exercises e
set access_tier = l.access_tier
from public.lessons l
where e.lesson_id = l.id
  and e.access_tier is distinct from l.access_tier;

create function public.sync_lesson_exercise_tier() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.lesson_id is not null then
    select l.access_tier into new.access_tier from public.lessons l where l.id = new.lesson_id;
  end if;
  return new;
end;
$$;

create trigger exercises_sync_lesson_tier before insert or update on public.exercises
  for each row execute function public.sync_lesson_exercise_tier();

-- Vérification : doit renvoyer 0 ligne (plus aucune désynchronisation possible).
select count(*) as exercices_desynchronises
from public.exercises e join public.lessons l on l.id = e.lesson_id
where e.access_tier is distinct from l.access_tier;
