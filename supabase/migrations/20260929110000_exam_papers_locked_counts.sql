-- Parité avec les chapitres/leçons : un sujet premium doit être visible en
-- tant que "verrouillé" (incite à l'abonnement) plutôt que complètement
-- invisible. La RLS sur exam_papers cache déjà les lignes premium non
-- accessibles (comme lessons_read_allowed le fait pour les leçons) — cette
-- fonction ne renvoie qu'un DÉCOMPTE agrégé par matière/année, jamais de
-- titre ni de contenu, pour que la page puisse afficher "+ N sujets
-- premium" sans exposer quoi que ce soit derrière le verrou.
create function public.exam_papers_locked_counts(p_class_id uuid)
returns table (subject_id uuid, year smallint, locked_count bigint)
language sql stable security definer set search_path = ''
as $$
  select ep.subject_id, ep.year, count(*) as locked_count
  from public.exam_papers ep
  where ep.class_id = p_class_id
    and ep.status = 'published'
    and not public.has_access(ep.access_tier, ep.class_id, ep.subject_id)
  group by ep.subject_id, ep.year;
$$;
grant execute on function public.exam_papers_locked_counts(uuid) to authenticated;
