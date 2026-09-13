-- Hand-authored migration: `slug` must be unique and NOT NULL, but there is
-- no single static default that satisfies uniqueness for every existing row
-- — Prisma's own `@@unique`/`@default` syntax can't express "derive this
-- from another column, then disambiguate collisions" as a schema-only
-- change. Mirrors this repo's existing pattern for the same problem (see
-- 20260906020000_courts_no_duplicate_active_name).
--
-- Steps: (1) add the column nullable, (2) backfill every existing club from
-- its own name using the same normalization lib/slug.ts's slugify() applies
-- in application code (lowercase, non-alphanumeric runs collapsed to one
-- hyphen, leading/trailing hyphens trimmed), (3) disambiguate any resulting
-- duplicate slugs by appending -2, -3, ... in creation order, (4) fall back
-- to the club's own id for the rare case a name normalizes to an empty
-- string (e.g. an emoji-only name), (5) enforce NOT NULL + UNIQUE.
ALTER TABLE "clubs" ADD COLUMN "slug" TEXT;

UPDATE "clubs"
SET "slug" = regexp_replace(
  regexp_replace(lower(trim("name")), '[^a-z0-9]+', '-', 'g'),
  '^-+|-+$', '', 'g'
);

WITH ranked AS (
  SELECT "id", "slug",
    ROW_NUMBER() OVER (PARTITION BY "slug" ORDER BY "createdAt") AS rn
  FROM "clubs"
)
UPDATE "clubs" c
SET "slug" = c."slug" || '-' || ranked.rn
FROM ranked
WHERE c."id" = ranked."id" AND ranked.rn > 1;

UPDATE "clubs" SET "slug" = "id" WHERE "slug" IS NULL OR "slug" = '';

ALTER TABLE "clubs" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "clubs_slug_key" ON "clubs"("slug");
