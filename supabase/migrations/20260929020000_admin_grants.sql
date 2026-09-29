-- Panneau admin : comble deux trous de permissions nécessaires pour donner au
-- staff un contrôle complet depuis l'app (jusqu'ici tout se faisait par SQL
-- direct avec la clé de service, en dehors de RLS).

-- Un admin doit pouvoir changer le rôle d'un utilisateur (promouvoir un
-- éditeur, par ex.). On NE touche PAS au grant colonne existant (display_name
-- seulement) : accorder update(role) à authenticated ouvrirait la colonne à
-- la policy profiles_update_own (id = auth.uid()), qui ne restreint aucune
-- colonne — un élève pourrait alors se passer admin lui-même (vérifié par la
-- suite de tests RLS). À la place : une fonction SECURITY DEFINER, seul point
-- d'entrée pour changer un rôle, qui vérifie elle-même is_admin().
create function public.admin_set_role(p_user_id uuid, p_role public.user_role) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Réservé aux administrateurs.' using errcode = '42501';
  end if;
  update public.profiles set role = p_role where id = p_user_id;
end;
$$;
revoke all on function public.admin_set_role(uuid, public.user_role) from public;
grant execute on function public.admin_set_role(uuid, public.user_role) to authenticated;

-- Le staff doit pouvoir créer/modifier des abonnements manuellement (geste
-- commercial, correction d'erreur de paiement...). Jusqu'ici seules la
-- fonction redeem_access_code() et le webhook (clé de service) écrivaient
-- dans subscriptions ; aucune policy d'écriture n'existait pour le staff.
grant insert, update, delete on public.subscriptions to authenticated;
create policy subscriptions_staff_all on public.subscriptions for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
