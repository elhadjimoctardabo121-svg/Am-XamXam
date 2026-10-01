-- Bug présent depuis la création de la table (jamais passé par l'interface
-- admin avant aujourd'hui, seulement par SQL direct en tant que service_role,
-- qui ignore RLS/GRANT) : la policy access_codes_staff_all autorise le staff
-- à tout faire sur access_codes, mais Postgres exige AUSSI un GRANT au
-- niveau table — jamais accordé. Résultat : "permission denied for table
-- access_codes" pour n'importe quel membre du staff, même avec la bonne
-- policy RLS.
grant select, insert, update, delete on public.access_codes to authenticated;
