-- Hand-authored migration: Prisma's schema language has no syntax for a
-- Postgres EXCLUDE constraint, so this can't be generated from schema.prisma
-- and won't show up there. It's the DB-level backstop against a genuine
-- double-booking race (two concurrent createReservation calls both passing
-- the application-level conflict check before either write lands) — see
-- core/reservations/services/reservations.service.ts's checkCourtConflict
-- for the equivalent (best-effort, not race-proof) application-level check.
--
-- Deliberately scoped to status = 'CONFIRMED' only (not the broader
-- SCHEDULED-inclusive ACTIVE_RESERVATION_STATUSES the app-level check uses):
-- a plain DB constraint can't express "a SCHEDULED hold past its
-- paymentExpiresAt no longer blocks" (that requires comparing against
-- now(), which a constraint can't do), so including SCHEDULED here would
-- incorrectly block re-booking an already-lapsed hold. CONFIRMED-only is
-- strictly narrower than the app-level check — it never rejects anything
-- the app logic would allow — while still closing the highest-stakes gap:
-- two genuinely CONFIRMED, paid bookings for the same court/time.
--
-- IMPORTANT for future schema changes: this constraint is NOT represented
-- in schema.prisma. A `prisma migrate reset` replays migration history (this
-- file included) so it's safe; but do not hand-write a new migration that
-- touches the "reservations" table without checking this constraint still
-- applies as expected.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "reservations"
ADD CONSTRAINT "reservations_no_overlapping_confirmed"
EXCLUDE USING gist (
  "courtId" WITH =,
  tsrange("scheduledStart", "scheduledEnd") WITH &&
)
WHERE (status = 'CONFIRMED');
