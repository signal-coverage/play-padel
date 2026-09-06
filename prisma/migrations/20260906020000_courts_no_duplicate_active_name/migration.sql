-- Hand-authored migration: a case-insensitive, soft-delete-aware unique
-- constraint can't be expressed via Prisma's `@@unique` schema syntax (no
-- support for a functional expression like lower(name) or a WHERE
-- predicate), so this doesn't show up in schema.prisma and can't be
-- generated automatically.
--
-- Backs core/courts/services/courts.service.ts's assertNoDuplicateCourtName
-- — the same class of race this session already closed for reservations
-- (see migration 20260905200000): two concurrent createCourt/updateCourt
-- calls for the same club can both pass that application-level check before
-- either write lands, both creating/renaming a court to the exact same name.
--
-- Matches assertNoDuplicateCourtName's own semantics exactly:
--   - case-insensitive (lower(name), not name)
--   - scoped per club (clubId in the index)
--   - soft-delete-aware (WHERE "deletedAt" IS NULL) — a deactivated court's
--     old name stays free to reuse, matching the app-level check's own
--     `deletedAt: null` filter.
--
-- A plain unique CONSTRAINT can't carry a WHERE predicate in Postgres —
-- only a unique INDEX can — but a violation of this index still raises the
-- same SQLSTATE 23505 (unique_violation) a table constraint would.
CREATE UNIQUE INDEX "courts_no_duplicate_active_name"
ON "courts" ("clubId", lower("name"))
WHERE "deletedAt" IS NULL;
