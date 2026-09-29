-- Correction : la règle "au plus UN sujet gratuit, tous sujets confondus"
-- (migration 20260929050000) empêchait de fait tout élève non abonné de
-- consulter un seul sujet BFEM 2026, puisque les 45 sujets importés sont
-- tous premium par défaut — seul un compte déjà abonné les voyait. Nouvelle
-- règle : au plus DEUX sujets gratuits PAR MATIÈRE (vitrine plus généreuse,
-- mais toujours limitée), le reste reste premium.
drop index if exists public.exam_papers_single_free_idx;

create function public.enforce_exam_papers_free_limit() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_free_count integer;
begin
  if new.access_tier = 'free' then
    select count(*) into v_free_count
    from public.exam_papers
    where subject_id = new.subject_id
      and access_tier = 'free'
      and id <> new.id;
    if v_free_count >= 2 then
      raise exception 'Au plus deux sujets gratuits par matière' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger exam_papers_free_limit before insert or update of access_tier, subject_id on public.exam_papers
  for each row execute function public.enforce_exam_papers_free_limit();
