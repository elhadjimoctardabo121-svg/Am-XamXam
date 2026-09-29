-- Assistant IA pédagogique (cahier des charges, section 27) : réservé aux
-- abonnés Premium (décision produit), quota quotidien par élève pour
-- contrôler la consommation (section 26). Le contenu des échanges n'est PAS
-- stocké (minimisation des données, section 37) — seul un compteur par
-- jour est conservé.

create table public.ai_usage (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references public.profiles (id),
  day           date not null default current_date,
  message_count integer not null default 0,
  unique (user_id, day)
);

alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon, authenticated;
grant select on public.ai_usage to authenticated;
create policy ai_usage_read_own on public.ai_usage for select to authenticated
  using (user_id = auth.uid() or public.is_staff());

-- Incrémente (ou crée) le compteur du jour pour l'utilisateur courant et le
-- renvoie. SECURITY DEFINER : l'élève n'a pas de droit d'écriture direct sur
-- cette table (seul ce point d'entrée, qui ne peut agir que sur sa propre
-- ligne via auth.uid()).
create function public.increment_ai_usage() returns public.ai_usage
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.ai_usage%rowtype;
begin
  insert into public.ai_usage (user_id, day, message_count)
  values (auth.uid(), current_date, 1)
  on conflict (user_id, day) do update set message_count = public.ai_usage.message_count + 1
  returning * into v_row;
  return v_row;
end;
$$;
revoke all on function public.increment_ai_usage() from public;
grant execute on function public.increment_ai_usage() to authenticated;
