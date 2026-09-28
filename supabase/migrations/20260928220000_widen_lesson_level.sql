-- Le chapitre IV d'Histoire (3ème) compte 6 leçons (13 à 18) : la limite
-- initiale de 5 leçons par chapitre était trop stricte au vu du contenu réel.
alter table public.lessons drop constraint lessons_level_check;
alter table public.lessons add constraint lessons_level_check check (level between 1 and 10);
