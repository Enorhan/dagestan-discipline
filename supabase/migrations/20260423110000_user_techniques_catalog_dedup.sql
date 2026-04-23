-- One library row per user per catalog technique.
-- Prior to this migration, addCatalogTechniqueToLibrary wrote to user_techniques
-- with a deterministic primary key `lib-<catalog_technique_id>`, which collided
-- across users and triggered RLS denials for anyone forking a technique another
-- user had already saved.
--
-- The client now generates a random id per fork; this unique index enforces the
-- intended invariant at the DB level so future callers cannot reintroduce the
-- collision. Existing rows are safe (verified: zero duplicates on prod).

create unique index if not exists user_techniques_user_catalog_uidx
  on public.user_techniques (user_id, catalog_technique_id)
  where catalog_technique_id is not null;

