-- Règle métier : les sujets BFEM sont premium par défaut (déjà le cas via la
-- valeur par défaut de access_tier) et AU PLUS UN sujet gratuit peut exister
-- à la fois, tous classes/matières confondues (une seule "vitrine" pour
-- donner un aperçu sans abonnement). Imposé au niveau base, pas seulement
-- par convention côté admin : ça protège même contre un import SQL futur
-- qui libérerait plusieurs sujets par erreur.
create unique index exam_papers_single_free_idx
  on public.exam_papers ((access_tier = 'free'))
  where access_tier = 'free';
