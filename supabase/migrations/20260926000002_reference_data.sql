-- Données de référence : niveaux scolaires et matières du lancement.
-- Aucun chapitre n'est inséré ici : le contenu vient du programme officiel,
-- saisi et validé par des enseignants (voir document stratégique, sections 9 et 22).

insert into public.classes (code, name, exam, position) values
  ('3eme',      'Troisième', 'BFEM', 1),
  ('terminale', 'Terminale', 'BAC',  2);

insert into public.subjects (code, name, position) values
  ('histoire',          'Histoire',           1),
  ('geographie',        'Géographie',         2),
  ('education-civique', 'Éducation civique',  3);
