# Dashboard Card Improvements

**Date:** 2026-08-10
**Status:** Implemented (11/12 done, 1 descoped — see item 3). `npx tsc --noEmit` and `npx eslint` clean across every touched file.

Grounded in the actual current content of each player dashboard card (all real data unless noted). Ordered as presented to the user; implemented top to bottom, one at a time.

## Checklist

- [x] 1. **Hero Card** — add total hours played stat (sum `scheduledEnd - scheduledStart` across non-cancelled reservations; not computed anywhere today)
- [x] 2. **Hero Card** — add member-since / tenure stat (`UserProfile.createdAt`)
- [x] ~~3. **Hero Card** — enrich "Favorite Court" with `Court.indoor`/`surface` instead of a bare name~~ — **descoped during implementation**: `Reservation` only carries a denormalized `courtId`/`courtName`, no court metadata. Doing this properly means joining `Court` at the service layer (Prisma `include`) and threading new fields through `Reservation`/`PlayerReservation` types — a real service-layer change, disproportionate to this one display enrichment. Skipped rather than forced.
- [x] 4. **Skill Overview Card** — add a time-of-day insight ("you mostly play in the evenings"), same pattern as the existing busiest-weekday calc, bucketed from `scheduledStart`
- [x] 5. **Skill Overview Card** — improve the empty state for new users with zero activity (currently a single sparse line in a centered box)
- [x] 6. **Session Load Card** — add a trend indicator vs. the previous 8-week window (currently a flat snapshot with no up/down signal)
- [x] 7. **Session Load Card** — add the player's own cancellation/no-show rate (mirrors `getCancellationRate`, already computed on the owner side from the same `ReservationStatus` data)
- [x] 8. **Progress & Goals Card** — add a "longest streak" stat (consecutive active days), giving the "Goals" half of the card's name an actual signal
- [x] 9. **Schedule Card** — enrich the upcoming list with end time (duration) and `notes`, not just court + start time
- [x] 10. **Schedule Card** — add an inline cancel action to upcoming list items (the cancel flow exists elsewhere but isn't wired into this card)
- [x] 11. **Schedule Card** — allow calendar month navigation instead of locking to the current month (`disableNavigation`)
- [x] 12. **Player Overview** — fix the Position badge inconsistency: `PerformanceSummarySection`'s mocked `preferredPosition` ("forehand") can silently contradict the real, editable `PlayerStyleSection.preferredSide` shown right above it. Real bug, fix regardless of the mock-data question below.

## Noted, deliberately not on this list

- Personalizing the Hero banner photo (needs real per-club/per-user imagery, not just a code change)
- A real skill-progression history for `padelCategory` (no history table exists; would need schema work)
- Merging or clearly differentiating `ProgressGoalsCard`'s 30-day dot grid and `ScheduleCard`'s month calendar (both answer "which days did I play" — a real design decision, not a quick add)
- Rebuilding `LatestPartnerCard`/`PerformanceSummarySection` on real data (blocked on a `Match`/`Tournament`/partner-pairing schema that doesn't exist yet — tracked separately in `ROADMAP.md`)
- Renaming "Progress & Goals" — a naming/scope call, not implemented silently as part of this pass
