-- Persisted per-user locale preference (see prisma/schema.prisma's
-- UserProfile.locale doc comment). A plain ADD COLUMN with a literal
-- DEFAULT is metadata-only in Postgres 11+ (no full table rewrite, no
-- backfill pass needed) — every existing row gets 'es' for free, matching
-- this app's own DEFAULT_LOCALE (see i18n/locale.ts).
ALTER TABLE "user_profiles" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'es';
