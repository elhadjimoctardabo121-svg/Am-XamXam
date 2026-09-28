-- Données structurées pour les exercices interactifs (QCM : options + bonne
-- réponse ; quiz : réponse attendue). Reste null pour dissertation/commentaire,
-- qui restent auto-évalués (texte libre, jamais noté automatiquement sans IA).
alter table public.exercises add column data jsonb;
