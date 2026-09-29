-- Le contenu réel disponible pour les "sujets BFEM 2026" est une série de
-- plusieurs sujets probables par matière (5 à 15, un par thème/chapitre),
-- pas un seul sujet par année comme le supposait le schéma initial.
-- On élargit : plusieurs sujets par (classe, matière, examen, année),
-- ordonnés par position.

alter table public.exam_papers drop constraint exam_papers_class_id_subject_id_exam_year_key;
alter table public.exam_papers add column position smallint not null default 1;
alter table public.exam_papers add constraint exam_papers_position_unique
  unique (class_id, subject_id, exam, year, position);
