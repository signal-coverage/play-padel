# Court Slot Waitlist — Design

**Status:** Approved by user (conversational brainstorming, 2026-08-19). Proceeding directly to implementation plan per explicit "go ahead and implement it" — this doc is the durable record of what was agreed.

## Goal

Let a player ask to be notified when a specific court's specific time slot — currently showing "Locked" because someone else has it reserved — becomes free again, without building a reservation queue or reworking availability computation.

## Scope

- **Waitlist unit:** one exact `(courtId, scheduledStart)` slot. Not a club, not a date, not a time range. Matches the existing per-slot booking model exactly.
- **Trigger:** any reservation cancellation on that exact slot, through the existing single cancellation entry point (`cancelReservation` in `core/reservations/services/reservations.service.ts`). Not triggered by a `SCHEDULED` hold lapsing unbooked (that slot was never actually taken from the waitlisted player's perspective — it just never got confirmed, and the existing lazy-expiry already makes it show as free without anyone needing to be told).
- **Fulfillment:** a broadcast notification to everyone waiting on that slot, each with a link back to the court's schedule. Whoever books first — waitlisted or not — gets it, through the completely unchanged normal booking flow. No reserved claim window, no priority order, no change to `getCourtSlots`/`getClubsAvailability`.
- **Non-goals for this round:** leaving/cancelling a waitlist entry once joined (a player who changes their mind just ignores the notification if it arrives — joining costs them nothing and blocks nothing); a "My Waitlist" management page; re-notifying an already-`NOTIFIED` entry if the slot frees up again later (they'd need to rejoin).

## Data model

New Prisma model, added to `prisma/schema.prisma` near `Reservation`:

```prisma
enum WaitlistEntryStatus {
  WAITING
  NOTIFIED
}

model WaitlistEntry {
  id             String              @id @default(cuid())
  clubId         String
  club           Club                @relation(fields: [clubId], references: [id])
  courtId        String
  court          Court               @relation(fields: [courtId], references: [id])
  courtName      String
  userId         String
  user           UserProfile         @relation(fields: [userId], references: [id])
  scheduledStart DateTime
  scheduledEnd   DateTime
  status         WaitlistEntryStatus @default(WAITING)
  notifiedAt     DateTime?
  createdAt      DateTime            @default(now())
  updatedAt      DateTime            @updatedAt

  @@unique([courtId, scheduledStart, userId])
  @@index([courtId, scheduledStart, status])
  @@map("waitlist_entries")
}
```

- `courtName` is denormalized (matches `Reservation.courtName`'s existing convention — the notification email needs it without a join, and it's stable enough not to bother syncing).
- The unique constraint means a player has exactly one row per slot, ever. Rejoining after a `NOTIFIED` entry (they missed it, or the slot got taken and freed again) resets that same row back to `WAITING` and clears `notifiedAt` — no duplicate-row bookkeeping.
- `clubId` is denormalized from `courtId`'s club (same pattern as `Reservation.clubId`) — needed for `logAudit`'s clubId-scoped calls and any future club-scoped waitlist listing.
- `Court` and `UserProfile` both need a back-relation (`waitlistEntries WaitlistEntry[]`) added for Prisma's relational integrity — no `onDelete` behavior needed beyond Prisma's default (Restrict), since a court/user with active waitlist entries existing is not a scenario this app currently creates deletion pressure for (courts soft-delete via `deletedAt`, users get anonymized not deleted).

## Service layer — `core/waitlist/`

New domain module, matching the existing `core/<domain>/{types,services}` structure (mirrors `core/notifications/`, `core/audit/`, etc. — no `schemas/` needed, the only user input is which slot, validated by existence checks, not a Zod form schema).

`core/waitlist/types/index.ts`:

```ts
export type WaitlistEntryStatus = "WAITING" | "NOTIFIED";

export interface WaitlistEntry {
  id: string;
  clubId: string;
  courtId: string;
  courtName: string;
  userId: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  status: WaitlistEntryStatus;
  notifiedAt?: Date;
  createdAt: Date;
}
```

`core/waitlist/services/waitlist.service.ts`:

```ts
export async function joinWaitlist(params: {
  courtId: string;
  courtName: string;
  clubId: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  userId: string;
}): Promise<WaitlistEntry>;
```

Upserts on the `(courtId, scheduledStart, userId)` unique key: creates a `WAITING` row if none exists; if one exists and is `NOTIFIED`, resets it to `WAITING` (clears `notifiedAt`); if one exists and is already `WAITING`, it's a no-op returning the existing row (idempotent — a double-click doesn't error).

```ts
export async function hasActiveWaitlistEntry(
  courtId: string,
  scheduledStart: Date,
  userId: string,
): Promise<boolean>;
```

Used by the availability endpoint to tell the UI whether to show "Notify me" or "You're waitlisted" for a given slot+player. `true` only for `WAITING` (a `NOTIFIED` entry means they were already told — showing them as still-waiting would be misleading if they check back later without having rejoined).

```ts
export async function notifyWaitlistForSlot(
  courtId: string,
  scheduledStart: Date,
): Promise<void>;
```

Finds every `WAITING` entry for the exact `(courtId, scheduledStart)`, and for each: renders and dispatches a notification email, flips it to `NOTIFIED` with `notifiedAt: new Date()`. Non-throwing at the call site (mirrors `cancelReservation`'s existing `try { ... } catch { /* notification failure must not affect reservation cancellation */ }` pattern for the cancellation-confirmation email) — a notification failure for one waitlisted player must not block the others or the cancellation itself. Iterates and dispatches per-entry with each one wrapped in its own try/catch, so one bad email address doesn't stop the rest of the list from being notified.

## Integration point

`core/reservations/services/reservations.service.ts`'s `cancelReservation`, after the existing cancellation-confirmation notification block (same non-throwing pattern, same place in the function — right before the `logAudit` call):

```ts
try {
  await notifyWaitlistForSlot(row.courtId, row.scheduledStart);
} catch {
  // waitlist notification failure must not affect reservation cancellation
}
```

No other cancellation path exists to hook (confirmed: `cancelReservation` is the single shared entry point for both player self-cancel and owner-cancel).

## API routes

`app/api/player/waitlist/route.ts` — `POST`, body `{ courtId: string; scheduledStart: string (ISO); scheduledEnd: string (ISO) }`. Auth via `auth()` (same pattern as every other player-facing route), looks up the court's name and clubId server-side (never trust client-supplied `courtName`/`clubId` — same principle as every other write endpoint in this codebase), calls `joinWaitlist`, returns the entry. 401 if unauthenticated, 404 if the court doesn't exist, 400 for a malformed date.

`app/api/player/clubs/[clubId]/availability/route.ts` — extended, not replaced. After computing `courtsWithSlots` (unchanged), for each `locked` slot in the response, add a `waitlisted: boolean` field computed via `hasActiveWaitlistEntry(court.id, slot.start, userId)` (the route already has `userId` from `auth()`). `free`/`closed` slots don't need the field (a player can't waitlist for a slot that isn't locked). This is N calls to `hasActiveWaitlistEntry` for N locked slots on this endpoint — acceptable here (unlike the just-fixed `/api/player/clubs` N+1, this endpoint is already scoped to one club/one date's courts, a small bounded number of locked slots, not multiplied across every active club in the system).

## UI changes

`core/courts/types` (or wherever `Slot` is re-exported to `components/CourtAvailabilityGrid`) — `Slot` gains an optional `waitlisted?: boolean`, populated only for locked slots per the API change above.

`components/CourtAvailabilityGrid/components/SlotCell/SlotCell.tsx` — currently a locked slot renders as a plain non-interactive `<div>` for the `"player"` variant (`isSlotInteractive` returns `false` for `locked` + `player`). Add a new optional prop `onJoinWaitlist?: (courtId: string, slot: Slot) => void`, deliberately separate from `onSlotClick` (which stays exclusively "book a free slot" — zero behavior change for the owner-side `ReservationsView.tsx` grid, which won't pass this new prop). When `slot.status === "locked"`, `variant === "player"`, and `onJoinWaitlist` is provided: render a small button inside the cell — "Notify me" if `!slot.waitlisted`, calling `onJoinWaitlist`; "Waitlisted" (disabled, checkmark) if `slot.waitlisted`. When `onJoinWaitlist` is omitted (owner variant, or any consumer that doesn't opt in), behavior is byte-identical to today.

`components/CourtAvailabilityGrid/CourtAvailabilityGrid.tsx` / `types.ts` — thread `onJoinWaitlist` through as a new optional prop, passed to each `SlotCell`.

`app/dashboard/browse/_components/BrowseCourts/components/CourtSchedulePanel/CourtSchedulePanel.tsx` — passes a real `onJoinWaitlist` handler (POSTs to the new route, then re-fetches/invalidates the availability query so the button flips to "Waitlisted" — matching however the existing booking-confirmation flow already triggers a refetch after a successful action).

## Notification

`lib/email/templates/WaitlistSlotAvailable.tsx` — new React Email template, matching `ReservationCancelled.tsx`'s existing structure/styling exactly (same component library, same layout conventions). Content: court name, the freed date/time, a link to `/dashboard/browse?club=<clubId>&court=<courtId>&date=<date>` (reuses Browse Courts' existing shareable-URL querystring convention, already supported per `BrowseCourts.tsx`'s `useQueryState` wiring).

Dispatched via the existing `dispatch()` from `@/lib/notifications/dispatcher` with `type: "RESERVATION_REMINDER"` — wait, this needs a new `NotificationType`. Add `"WAITLIST_SLOT_AVAILABLE"` to the `NotificationType` union in `core/notifications/types/index.ts` (currently `"RESERVATION_REMINDER" | "RESERVATION_CANCELLED" | "PAYMENT_CONFIRMED"`).

## Audit logging

Add `"waitlist.notified"` to `AuditAction` (`core/audit/types/index.ts`) and its display label (`app/dashboard/audit-logs/_components/AuditLogsView/consts.ts`). `notifyWaitlistForSlot` calls `logAudit` once per notified entry (`clubId`, `userId` = the waitlisted player, `action: "waitlist.notified"`, `entity: "WaitlistEntry"`, `entityId` = the entry's id) — gives the owner-facing audit log visibility into waitlist activity, matching how every other player-facing state change in this codebase is already audited.

`"waitlist.joined"` is deliberately NOT added — joining a waitlist is a low-stakes, player-initiated, reversible-by-rejoining action with no club-owner-relevant consequence, unlike a cancellation or a payment; keeping the audit log's signal-to-noise ratio intact matters more than exhaustive coverage here.

## Error handling / edge cases

- **Double-join (already `WAITING`):** `joinWaitlist` is idempotent, returns the existing row, no error surfaced to the UI.
- **Joining a slot that's actually free right now:** the "Notify me" button only renders for `locked` slots in the first place (per the `SlotCell` change above), so this can't happen through the normal UI — but the API route itself doesn't need to defensively re-check slot status server-side beyond "does this court exist," since joining a waitlist for a currently-free slot is harmless (worst case: an unnecessary row that never gets notified because the slot never gets cancelled-and-refreed while `WAITING`, since `notifyWaitlistForSlot` is only ever called from `cancelReservation`).
- **Notification dispatch failure for one of several waitlisted players:** doesn't block the others (per-entry try/catch in `notifyWaitlistForSlot`) or the cancellation itself (outer try/catch at the `cancelReservation` call site).
- **A `SCHEDULED` (unpaid) hold lapsing:** does NOT trigger waitlist notification — that path never calls `cancelReservation` (per the existing "Handled lazily" design, an expired hold just stops counting as blocking; nothing actively cancels it). This means a player who wanted a slot that was tied up in an abandoned checkout won't get pinged the moment it lapses. Documented here as a known, accepted gap for this round — closing it would mean hooking the lazy-expiry check itself, which happens on every slot read (`getCourtSlots`), a much hotter path than a real cancellation; not worth the complexity for what's a genuinely rare case (someone starts checkout, then abandons it) versus an explicit cancel.

## Testing strategy (Strict TDD Mode)

- `core/waitlist/services/waitlist.service.test.ts` (new, mocked Prisma per this codebase's established pattern): `joinWaitlist` creates on first join, is idempotent on a second `WAITING` join, resets a `NOTIFIED` row back to `WAITING` on rejoin; `hasActiveWaitlistEntry` returns true only for `WAITING`, false for `NOTIFIED` or no row; `notifyWaitlistForSlot` notifies every `WAITING` entry for the exact slot (not other slots on the same court, not other courts), flips each to `NOTIFIED`, and one entry's dispatch failure doesn't stop the rest from being processed.
- `core/reservations/services/reservations.service.test.ts` — extend (or the relevant existing cancellation test file) to confirm `cancelReservation` calls `notifyWaitlistForSlot` with the cancelled reservation's exact `courtId`/`scheduledStart`, and that a thrown error from it doesn't propagate out of `cancelReservation`.
- API route tests for `POST /api/player/waitlist` if this codebase has a convention for testing route handlers directly (per the Clerk webhook work, it doesn't strongly — route-level tests aren't this codebase's existing pattern; service-layer TDD is where the real coverage lives, matching precedent).
- `SlotCell`'s new conditional rendering (waitlisted vs. not, player vs. owner) is a good candidate for whatever this codebase's existing component-test convention is, if any exists for `CourtAvailabilityGrid`'s subcomponents (none currently do — this would be a first, and adding one is not required to match existing coverage norms, but flagged here as an option for whoever writes the implementation plan to decide).

## Self-review notes

- Placeholder scan: none found — every section has concrete field names, function signatures, and file paths.
- Internal consistency: the "no exclusive claim window" decision is reflected consistently in the Scope, Fulfillment, Data model (no `claimExpiresAt`/`CLAIMED`/`EXPIRED` states — only `WAITING`/`NOTIFIED`), and Error handling sections — nothing contradicts it.
- Scope check: focused enough for a single implementation plan (one new domain module, one existing-function hook, one existing-endpoint extension, one existing-component extension, one new email template). Not decomposed further.
- Ambiguity check: the one genuinely debatable point (should `notifyWaitlistForSlot` also be triggered by lazy hold-expiry, not just explicit cancellation) is called out explicitly as an accepted non-goal with reasoning, not left silently ambiguous.
