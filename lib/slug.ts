/**
 * Normalizes a display name into a URL-safe slug: lowercase, every run of
 * non-alphanumeric characters collapsed to a single hyphen, leading/trailing
 * hyphens trimmed. Mirrors, byte-for-byte, the Postgres regex this same
 * normalization runs as in prisma/migrations/20260913050000_add_club_slug's
 * one-time backfill — keep the two in sync if either ever changes.
 *
 * Not guaranteed unique on its own — callers that persist a slug (e.g.
 * createClub in core/clubs/services/clubs.service.ts) must check for an
 * existing collision and disambiguate (e.g. append "-2") themselves.
 */
export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
