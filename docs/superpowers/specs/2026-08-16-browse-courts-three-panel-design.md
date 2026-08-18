# Browse Courts Three-Panel Redesign

_Design doc — sub-project 2 of 2. Depends on the `DataTable` component from 2026-08-16-datatable-players-directory-design.md; implement and verify that one first._

## Context

Browse Courts (`app/dashboard/browse`) currently flows: `ClubPicker` cards → pick a club → a single shared availability grid showing every one of that club's courts at once (15s live poll), nuqs-synced on `club`+`date`. The user wants this restructured into three always-visible panels — clubs → that club's courts → the selected court's schedule — each narrower than a full page section, so a player can move club → court → time slot without losing context of the earlier steps.

## Goals

Three panels in one row, static widths, no resizing animation (only a content fade-in when a panel first populates — matches this project's established motion-restraint convention):

**Left (20%) — Clubs**

- `DataTable`-based list: club avatar+name, court count.
- Filters: name search, court-count sort/filter.
- A club with zero bookable slots for the selected date renders grayed-out/muted but stays clickable — it is not hidden and not disabled.
- Selecting a grayed-out club shows "No courts available for today" in the middle panel instead of an empty table.

**Middle (60%) — Courts of the selected club**

- `DataTable`-based list: court name, surface/field type, color (small swatch), price.
- Filters: surface type, indoor/outdoor, color (dropdowns). Price is sortable, not filtered — a min/max range felt like more control than requested; add one later if wanted.
- Empty state before any club is selected: "Select a club to see its courts."

**Right (20%) — Schedule for the selected court**

- Not a new component: reuses the existing slot-grid/availability-picker UI, scoped to one court instead of every court in the club, narrowed to fit this column. The live poll now only needs one court's slots — lighter than today's all-courts poll.
- Selecting a free slot opens the existing `BookingConfirmDialog` (desktop dialog / mobile drawer) exactly as today — confetti, analytics events, and the Mercado Pago prepayment redirect are unchanged. This redesign only changes how a player gets to a slot, not what happens once one is picked.
- Empty state before any court is selected: "Select a court to see its schedule."

**Mobile**: the agreed drill-down — each panel takes the full screen, forward navigation with a back control at each step (clubs → courts → schedule). Can be revisited later per your own note.

**URL state**: extends the existing nuqs `club`/`date` params to also carry the selected `court`, plus each panel's active filter/sort — the full three-step view stays shareable and survives a refresh.

## Non-goals

- No changes to booking mechanics — `BookingConfirmDialog`, confetti, analytics events, the Mercado Pago Checkout Pro flow, `PaymentReturnView`, cancellation, and PDF receipts are all untouched.
- No animated panel-width transitions.
- No price-range filter.
- No change to the mobile drill-down approach beyond what's agreed here.

## Architecture

- `BrowseCourts.tsx` restructured from its current `ClubPicker` + single-grid composition into three sibling panels in one flex/grid row (20/60/20).
- `ClubListPanel` (new) — wraps `DataTable`.
- `ClubCourtsPanel` (new) — wraps `DataTable`.
- `CourtSchedulePanel` (new, thin wrapper) — reuses the existing schedule/slot-grid component, just narrowed and scoped to a single court.

## Data flow

- URL state via nuqs: existing `club`, `date` + new `court`, plus club-list and court-table filter/sort params.
- Mobile: same underlying data, different composition (stacked/drill-down instead of three simultaneous panels).

## Error handling

- Club list: empty state if no clubs exist at all (rare edge case) — reuse existing empty-state conventions.
- Court panel: "Select a club to see its courts" (nothing chosen yet) vs. "No courts available for today" (club chosen, zero bookable courts).
- Schedule panel: "Select a court to see its schedule" (nothing chosen yet).

## Testing

- Vitest unit tests for the "does this club have any bookable slot today" computation and for court filter/sort logic, following the pattern already established this session.
- Existing booking-flow tests (conflict validation, cancel cutoff, webhook signature) are untouched, since booking mechanics don't change.

## Confirmed against the current code

- **Schedule/slot-grid component to reuse**: `components/CourtAvailabilityGrid`, which already takes a `CourtColumn[]` prop — the right panel narrows this to a single-element array (one court) instead of the full club.
- **Club availability-today flag**: `GET /api/player/clubs` currently just returns `{ clubs: listActiveClubs() }` — no date param, no court count, no availability signal. It needs extending to accept `?date=` and compute, per club, `courtCount` (via `listCourtsByClub`) and `hasAvailabilityToday` (true if any active court has ≥1 free slot that date, via `getCourtSlots` — the same function `GET /api/player/clubs/[clubId]/availability` already calls per-court, just aggregated across every club instead of one).
- **Court metadata for the middle panel**: `GET /api/player/clubs/[clubId]/availability` currently maps each court to only `{ id, name, price, slots }`, dropping `surface`/`color` even though `listCourtsByClub` already returns the full `Court` row. Needs a two-field addition to that existing map — no new query.

## Out of scope / explicitly deferred

- Animated panel transitions.
- Price-range filtering.
- Any mobile treatment beyond the agreed drill-down.
