# Owner Dashboard Card Improvements

**Date:** 2026-08-10
**Status:** Implemented (7/7 done). `npx tsc --noEmit` and `npx eslint` clean across every touched file.

Companion to `2026-08-10-dashboard-card-improvements.md` (the player-side pass) — same method: grounded in the actual current content of each owner dashboard card, not generic ideas. Implemented top to bottom, one at a time.

## Checklist

- [x] 1. **Hero Card (Owner)** — add an empty state for a brand-new club with zero courts/bookings (currently shows three "0" pills under a static "Your club today" heading, no CTA — unlike the player Hero, which swaps to a CTA banner when empty)
- [x] 2. **Hero Card (Owner)** — add "Busiest Court" and "Hours Booked" pills, scoped to today (mirrors `getFavoriteCourt`/`getHoursPlayed`'s existing pattern from the player side, kept at today's scope to match this card's existing 3 pills rather than mixing in an all-time stat)
- [x] 3. **Skill Overview (Owner)** — improve the empty state to match the player side's treatment (icon + encouraging copy instead of plain text)
- [x] 4. **Session Load (Owner)** — fix `getCancellationRate` to also count `NO_SHOW`, not just `CANCELLED`. Real bug: `getPlayerMissedRate`'s own code comment claims parity with this exact owner metric, but the owner side only ever counted cancellations. Needs `summarizeReservationsByDay` to also expose a `noShow` count per day (currently only `total`/`cancelled`).
- [x] 5. **Session Load (Owner)** — add a trend indicator vs. the previous period, mirroring the player side's addition
- [x] 6. **Progress & Goals (Owner)** — add a "longest streak" stat by reusing the existing `getLongestStreak` util — `OwnerActivity` already builds the exact `{active: boolean}[]` shape it needs, just never calls it
- [x] 7. **Schedule (Owner)** — add the booking player's name to each upcoming list item. `Reservation.userName` is already denormalized and already flows through the fetch; `UpcomingItem`'s type just doesn't carry it yet. The single most useful missing field for an owner scanning "who's coming."

## Noted, deliberately not on this list

- **Revenue visibility** (`Invoice`/`Payment` data completely unused on the dashboard) — needs new service-layer aggregation in `core/`, not a quick card tweak. Bigger scope, parked the same way the player-side pass parked its bigger items.
- Two separate owner data-fetching paths (`useDayReservations`/`useActiveCourts` for Hero vs. `useOwnerReservationSummary`/`useUpcomingReservations` for the other 4 cards) — not a bug today, just a duplication worth knowing about if a "today" stat ever needs to reconcile exactly across cards.
- Two markers-building code paths (`buildMarkersFromSummary` vs. `buildMarkersFromReservations`) that must stay logic-consistent by hand — currently correct, flagged as a latent maintenance risk, not something to refactor as part of this pass.
