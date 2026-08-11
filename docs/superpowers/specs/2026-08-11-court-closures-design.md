# Court Blocking / Scheduled Closures

**Date:** 2026-08-11
**Status:** Design approved by user, spec pending final review before implementation planning.

## Goal

Let a club owner take a court out of the booking pool for a time range — a quick ad-hoc block (a private event this afternoon) or a planned multi-day closure (resurfacing, renovation) — without touching the court's recurring weekly availability template. This is the first of four sub-features split out of the original "Court Management enhancements" idea (the other three — per-court minimum reservation duration, court characteristics, and bulk edit across courts — are queued as separate follow-up brainstorms).

## Scope decisions (resolved during brainstorming)

- **One mechanism covers both use cases**: a closure is a `[startsAt, endsAt]` range, so a 2-hour ad-hoc block and a 5-day renovation closure are the same kind of record, just different durations.
- **Always per-court in the data model**; a "whole club" creation shortcut exists only in the UI (loops the create call across every active court), not as a separate club-wide concept.
- **Creating a closure that overlaps existing active reservations is blocked**, not auto-resolved — the owner sees which reservations conflict and cancels/reschedules those manually first (via the existing cancel-with-refund flow), then retries. No automatic cancellation or refunding is triggered by closure creation.
- **Reason is required and player-visible.** A closed slot renders distinctly from a booked ("locked") slot in the booking grid, with the reason shown.
- **Management lives next to the existing per-court "Weekly availability" action** on the Courts page, not a separate top-level page — a new "Closures" sheet per court, listing past/upcoming closures with a "New closure" form.
- **No editing** — cancel and recreate to change dates. **No recurring closures** — that's what the existing weekly `CourtAvailability` template is for; closures are exceptions to it. **No retroactive closures** — `endsAt` must be in the future (starting "now" for an emergency closure is fine).

## Data model

```prisma
model CourtClosure {
  id          String    @id @default(cuid())
  courtId     String
  court       Court     @relation(fields: [courtId], references: [id])
  startsAt    DateTime
  endsAt      DateTime
  reason      String
  createdAt   DateTime  @default(now())
  createdBy   String
  cancelledAt DateTime?
  cancelledBy String?

  @@index([courtId, startsAt, endsAt])
  @@map("court_closures")
}
```

A closure is "active" when `cancelledAt` is null and `endsAt` is in the future — no separate boolean flag, matching the `deletedAt`-style soft-delete pattern already used on `Court`.

## Booking-flow integration

- `Slot.status` (currently `"free" | "locked"`) gains `"closed"`. A closed slot carries its `reason`, the same way a locked slot carries a `reservationId`.
- `getCourtSlots` (`core/courts/services/courts.service.ts`) — used by both the player Browse Courts grid and the owner Reservations grid — additionally fetches active closures overlapping the requested date and marks any overlapping slot `"closed"`, checked before the existing reservation-overlap check (a slot can't be both `"closed"` and `"locked"`).
- `checkCourtConflict` (`core/reservations/services/reservations.service.ts`, called from `createReservation`) also checks for an overlapping active closure and rejects the booking ("This court is closed: {reason}") if one exists — the actual server-side gate, independent of whatever the grid last rendered, so a closure created after the grid loaded still can't be raced by a booking attempt.
- `createClosure` (new function) checks for overlapping active reservations (`ACTIVE_RESERVATION_STATUSES`) on that court before creating the row; if any exist, it throws with the conflicting reservations listed rather than creating the closure.
- `CourtAvailabilityGrid` (shared component) renders `"closed"` slots visually distinct from `"locked"` ones and non-clickable for players, with the reason visible. Exact visual treatment (styling) is an implementation detail, not a design decision — it follows this component's existing patterns.

## Management UI

- Each row in the owner's Courts table (`/dashboard/courts`) gets a new "Closures" action next to "Weekly availability", opening a `ClosuresSheet` — same `Sheet`-fetching-on-open pattern as the existing `AvailabilitySheet`.
- The sheet lists the court's closures, upcoming/active first then past; future/active ones get a "Cancel" action, past ones are read-only history.
- A "New closure" button opens a form in the same sheet: start date/time, end date/time, reason (required text), and an "Apply to all courts" checkbox that loops the create call across every active court in the club, reporting per-court success/conflict (a conflict on one court doesn't block the others).
- Conflict errors from `createClosure` render inline in the form, listing the specific overlapping reservations.

## New surfaces

- `POST /api/clubs/courts/[courtId]/closures` — create a closure for one court (owner-only, `requireOwnerClub()`).
- `GET /api/clubs/courts/[courtId]/closures` — list a court's closures (owner-only).
- `POST /api/clubs/courts/[courtId]/closures/[closureId]/cancel` — cancel a future/active closure (owner-only).
- No changes needed to the player-facing availability route (`GET /api/player/clubs/[clubId]/availability`) beyond what `getCourtSlots` already produces — the new `"closed"` slot status flows through automatically.

## Audit logging

`createClosure` and `cancelClosure` call `logAudit` with new `AuditAction` literals `"closure.created"` / `"closure.cancelled"`, matching every other owner mutation in this codebase (`entity: "CourtClosure"`).

## Design language / reuse

No new visual primitives. Reuses the existing `Sheet` pattern (`AvailabilitySheet` is the direct template), the existing inline-form-error pattern for conflict messages, and `CourtAvailabilityGrid`'s existing slot-rendering structure (adding one more status alongside `"free"`/`"locked"`).

## Non-goals

- Editing an existing closure — cancel and recreate instead.
- Recurring closures — use the existing weekly `CourtAvailability` template for anything that repeats.
- Automatic cancellation or refunding of conflicting reservations when a closure is created — creation is blocked instead.
- Retroactive (fully historical) closures.
- The other three "Court Management enhancements" sub-features (minimum reservation duration, court characteristics, bulk edit across courts) — each gets its own future brainstorm/spec/plan.
