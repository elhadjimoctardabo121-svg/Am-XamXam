-- access_tier -> access_type, avec deux valeurs supplémentaires ('pack',
-- 'admin_only'). Dans SA PROPRE migration : Postgres interdit d'utiliser une
-- valeur d'enum tout juste ajoutée dans la même transaction qui l'a créée
-- (et une fonction `language sql` comme has_access, définie juste après,
-- serait analysée immédiatement et échouerait si elle citait 'pack' ici).
alter type public.access_tier rename to access_type;
alter type public.access_type add value 'pack';
alter type public.access_type add value 'admin_only';
