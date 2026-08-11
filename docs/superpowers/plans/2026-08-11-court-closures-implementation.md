# Court Blocking / Scheduled Closures Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a club owner block a court for a date/time range (ad-hoc events or multi-day closures), with a required reason shown to players, without touching the court's recurring weekly availability template.

**Architecture:** One new Prisma model (`CourtClosure`, per-court, no recurrence) checked everywhere the app already computes slots or validates a booking — `getCourtSlots` (rendering) and `checkCourtConflict`'s sibling check inside `createReservation` (the actual server-side gate). Management lives in a new `ClosuresSheet`, mirroring the existing `AvailabilitySheet` pattern on the Courts page.

**Tech Stack:** Next.js App Router route handlers, Prisma (Neon Postgres), Zod, React Query, react-hook-form, date-fns.

## Global Constraints

- **No test framework exists in this repo** (no Jest/Vitest, no `test` script). Every task's "Verify" step uses `npx tsc --noEmit` (must report zero errors) plus the manual check described — do not introduce a test framework as part of this plan.
- **No git commands in any step.** This project's owner runs all git operations personally — do not run `git add`/`git commit`/`git push` at any point. Each task ends with "Verify," not "Commit."
- **Prisma workflow:** after any `prisma/schema.prisma` edit, run `npx prisma generate` then `npx prisma db push` — never `npx prisma migrate dev` (this project has no migration history; `migrate dev` will attempt to reset the database).
- **A closure is per-court in the data model** — the "apply to all courts" UI feature loops one create call per court client-side; there is no club-wide closure concept in the schema.
- **No editing an existing closure** — cancel and recreate to change dates. **No recurring closures.** **No auto-cancellation of conflicting reservations** — creating a closure that overlaps active reservations is blocked, listing the conflicts.
- **Barrel export rule still applies:** any `index.ts` this plan touches must stay alphabetically sorted by exported name.
- **One field per line in Sheets/forms**, per `AGENTS.md` — every new form field gets its own full-width row, no grid columns.
- **Component structure convention:** one render output per component (two if there's a loading branch); split multi-branch components into their own folders; consts/utils/types always separate files from the component itself.

---

### Task 1: Schema — `CourtClosure` model

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `CourtClosure` model (`id`, `courtId`, `startsAt`, `endsAt`, `reason`, `createdAt`, `createdBy`, `cancelledAt`, `cancelledBy`) — consumed by every later task.

- [ ] **Step 1: Add the model and the `Court.closures` relation**

In `prisma/schema.prisma`, add `closures CourtClosure[]` to the existing `Court` model, right after the existing `availability CourtAvailability[]` line:

```prisma
model Court {
  id                  String    @id @default(cuid())
  clubId              String
  club                Club      @relation(fields: [clubId], references: [id])
  name                String
  surface             String?
  indoor              Boolean   @default(false)
  color               String?
  slotDurationMinutes Int       @default(90)
  price               Float?
  active              Boolean   @default(true)
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  createdBy           String?
  updatedBy           String?
  deletedAt           DateTime?
  deletedBy           String?

  availability CourtAvailability[]
  closures     CourtClosure[]
  reservations Reservation[]

  @@index([clubId, active])
  @@map("courts")
}
```

Add the new model right after `CourtAvailability`:

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

- [ ] **Step 2: Regenerate the Prisma client and push the schema**

Run:
```bash
npx prisma generate
npx prisma db push
```
Expected: both commands complete with no errors; `db push` reports the new `court_closures` table created.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

---

### Task 2: `core/courts` — types and Zod schema for closures

**Files:**
- Modify: `core/courts/types/index.ts`
- Modify: `core/courts/schemas/court.schema.ts`

**Interfaces:**
- Produces:
  - `CourtClosure` interface (`id`, `courtId`, `startsAt: Date`, `endsAt: Date`, `reason: string`, `createdAt: Date`, `createdBy?: string`, `cancelledAt?: Date`, `cancelledBy?: string`)
  - `CreateClosureInput` interface (`startsAt: string`, `endsAt: string`, `reason: string` — ISO date strings, matching `CreateReservationInput`'s convention)
  - `SlotStatus` extended to `"free" | "locked" | "closed"`
  - `Slot` gains `closureReason?: string`
  - `createClosureSchema` (Zod)

- [ ] **Step 1: Extend `core/courts/types/index.ts`**

Add the two new interfaces (place them near `CourtAvailability`/`AvailabilityEntry`):

```ts
export interface CourtClosure {
  id: string;
  courtId: string;
  startsAt: Date;
  endsAt: Date;
  reason: string;
  createdAt: Date;
  createdBy?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
}

export interface CreateClosureInput {
  startsAt: string;
  endsAt: string;
  reason: string;
}
```

Change the existing `SlotStatus`/`Slot` to:

```ts
export type SlotStatus = "free" | "locked" | "closed";

export interface Slot {
  start: Date;
  end: Date;
  status: SlotStatus;
  reservationId?: string;
  closureReason?: string;
}
```

- [ ] **Step 2: Add `createClosureSchema` to `core/courts/schemas/court.schema.ts`**

Add at the end of the file:

```ts
export const createClosureSchema = z
  .object({
    startsAt: z.string().min(1, "Start is required"),
    endsAt: z.string().min(1, "End is required"),
    reason: z.string().min(1, "Reason is required"),
  })
  .refine((data) => new Date(data.endsAt) > new Date(data.startsAt), {
    message: "End must be after start",
    path: ["endsAt"],
  })
  .refine((data) => new Date(data.endsAt) > new Date(), {
    message: "Closure must not be entirely in the past",
    path: ["endsAt"],
  });
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: this will show errors in files that construct a `Slot` object without accounting for the new `SlotStatus` union member or that exhaustively switch over the old two-value `SlotStatus` — that's expected and will be fixed by Task 3 (server) and Task 7 (client). Confirm the errors are ONLY in `core/courts/services/courts.service.ts` (the `status: overlapping ? "locked" : "free"` ternary — still valid TS, won't error) and note there should be no actual compile errors yet, since adding a union member to a type alias doesn't break existing narrower assignments. If `tsc` is clean, that's correct and expected at this point.

---

### Task 3: `core/courts/services/courts.service.ts` — closure CRUD + `getCourtSlots` integration

**Files:**
- Modify: `core/courts/services/courts.service.ts`

**Interfaces:**
- Consumes: `ACTIVE_RESERVATION_STATUSES` (existing import from `core/reservations/consts.ts`), `logAudit` (existing import), `CourtClosure`/`CreateClosureInput` (Task 2)
- Produces:
  - `listClosuresByCourt(courtId: string): Promise<CourtClosure[]>`
  - `createClosure(clubId: string, courtId: string, input: CreateClosureInput, createdBy: string): Promise<CourtClosure>`
  - `cancelClosure(clubId: string, courtId: string, closureId: string, cancelledBy: string): Promise<CourtClosure>`
  - `getCourtSlots` (existing function) now marks overlapping slots `"closed"` with a `closureReason`, taking precedence over `"locked"`.

- [ ] **Step 1: Add the `format` import and a `CourtClosureRow`/`toCourtClosure` mapper**

Add `format` to the existing `date-fns` import:
```ts
import { startOfDay, endOfDay, addMinutes, format } from "date-fns";
```

Add `CourtClosure`/`CreateClosureInput` to the existing type-only import from `@/core/courts/types`.

Add a new row type and mapper function (near the existing `CourtRow`/`toCourt`):
```ts
type CourtClosureRow = NonNullable<
  Awaited<ReturnType<typeof prisma.courtClosure.findUnique>>
>;

function toCourtClosure(row: CourtClosureRow): CourtClosure {
  return {
    id: row.id,
    courtId: row.courtId,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    reason: row.reason,
    createdAt: row.createdAt,
    createdBy: row.createdBy ?? undefined,
    cancelledAt: row.cancelledAt ?? undefined,
    cancelledBy: row.cancelledBy ?? undefined,
  };
}
```

- [ ] **Step 2: Add `listClosuresByCourt`, `createClosure`, `cancelClosure`**

Add these three exported functions (e.g. after `getCourtAvailability`, before `timeToDateOnDay`):

```ts
export async function listClosuresByCourt(
  courtId: string,
): Promise<CourtClosure[]> {
  const rows = await prisma.courtClosure.findMany({
    where: { courtId },
    orderBy: { startsAt: "desc" },
  });
  return rows.map(toCourtClosure);
}

// Refuses to create a closure that overlaps any active reservation on this
// court — the owner cancels/reschedules those manually first (existing
// cancel-with-refund flow), then retries. No automatic cancellation here.
export async function createClosure(
  clubId: string,
  courtId: string,
  input: CreateClosureInput,
  createdBy: string,
): Promise<CourtClosure> {
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);

  const conflicts = await prisma.reservation.findMany({
    where: {
      courtId,
      status: { in: [...ACTIVE_RESERVATION_STATUSES] },
      scheduledStart: { lt: endsAt },
      scheduledEnd: { gt: startsAt },
      NOT: {
        status: "SCHEDULED",
        paymentExpiresAt: { lt: new Date() },
      },
    },
    select: { scheduledStart: true, scheduledEnd: true },
    orderBy: { scheduledStart: "asc" },
  });

  if (conflicts.length > 0) {
    const list = conflicts
      .map(
        (c) =>
          `${format(c.scheduledStart, "MMM d, HH:mm")}–${format(c.scheduledEnd, "HH:mm")}`,
      )
      .join(", ");
    throw new Error(
      `This closure overlaps ${conflicts.length} active reservation(s): ${list}. Cancel them first, then retry.`,
    );
  }

  const row = await prisma.courtClosure.create({
    data: { courtId, startsAt, endsAt, reason: input.reason, createdBy },
  });

  const creator = await prisma.userProfile.findUnique({
    where: { id: createdBy },
    select: { displayName: true },
  });
  logAudit({
    clubId,
    userId: createdBy,
    userDisplayName: creator?.displayName ?? createdBy,
    action: "court.closure_created",
    entity: "CourtClosure",
    entityId: row.id,
    metadata: { courtId, reason: input.reason },
  });

  return toCourtClosure(row);
}

export async function cancelClosure(
  clubId: string,
  courtId: string,
  closureId: string,
  cancelledBy: string,
): Promise<CourtClosure> {
  const existing = await prisma.courtClosure.findFirst({
    where: { id: closureId, courtId },
  });
  if (!existing) throw new Error("Closure not found");
  if (existing.cancelledAt) throw new Error("Closure is already cancelled");
  if (existing.endsAt <= new Date()) {
    throw new Error("Cannot cancel a closure that has already ended");
  }

  const row = await prisma.courtClosure.update({
    where: { id: closureId },
    data: { cancelledAt: new Date(), cancelledBy },
  });

  const actor = await prisma.userProfile.findUnique({
    where: { id: cancelledBy },
    select: { displayName: true },
  });
  logAudit({
    clubId,
    userId: cancelledBy,
    userDisplayName: actor?.displayName ?? cancelledBy,
    action: "court.closure_cancelled",
    entity: "CourtClosure",
    entityId: row.id,
    metadata: { courtId },
  });

  return toCourtClosure(row);
}
```

- [ ] **Step 3: Update `getCourtSlots` to mark closed slots**

Replace the function's body (keep the signature and the existing `court`/`availabilityRows`/early-return checks unchanged) — add a closures fetch right after the existing `reservations` fetch, and update the per-slot loop:

```ts
export async function getCourtSlots(
  courtId: string,
  date: Date,
): Promise<Slot[]> {
  const court = await prisma.court.findUnique({
    where: { id: courtId },
    select: { slotDurationMinutes: true },
  });
  if (!court) {
    throw new Error("Court not found");
  }

  const dayOfWeek = date.getDay();

  const availabilityRows = await prisma.courtAvailability.findMany({
    where: { courtId, dayOfWeek, active: true },
    orderBy: { startTime: "asc" },
  });

  if (availabilityRows.length === 0) {
    return [];
  }

  const reservations = await prisma.reservation.findMany({
    where: {
      courtId,
      status: { in: [...ACTIVE_RESERVATION_STATUSES] },
      scheduledStart: { gte: startOfDay(date), lte: endOfDay(date) },
      NOT: {
        status: "SCHEDULED",
        paymentExpiresAt: { lt: new Date() },
      },
    },
    select: { id: true, scheduledStart: true, scheduledEnd: true },
  });

  const closures = await prisma.courtClosure.findMany({
    where: {
      courtId,
      cancelledAt: null,
      startsAt: { lte: endOfDay(date) },
      endsAt: { gte: startOfDay(date) },
    },
    select: { startsAt: true, endsAt: true, reason: true },
  });

  const slots: Slot[] = [];

  for (const window of availabilityRows) {
    const windowStart = timeToDateOnDay(date, window.startTime);
    const windowEnd = timeToDateOnDay(date, window.endTime);

    let slotStart = windowStart;
    while (addMinutes(slotStart, court.slotDurationMinutes) <= windowEnd) {
      const slotEnd = addMinutes(slotStart, court.slotDurationMinutes);

      const closure = closures.find(
        (c) => c.startsAt < slotEnd && c.endsAt > slotStart,
      );
      const overlapping = reservations.find(
        (reservation) =>
          reservation.scheduledStart < slotEnd &&
          reservation.scheduledEnd > slotStart,
      );

      slots.push({
        start: slotStart,
        end: slotEnd,
        status: closure ? "closed" : overlapping ? "locked" : "free",
        ...(closure && { closureReason: closure.reason }),
        ...(!closure && overlapping && { reservationId: overlapping.id }),
      });

      slotStart = slotEnd;
    }
  }

  return slots.sort((a, b) => a.start.getTime() - b.start.getTime());
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Manually verify: in `npx prisma studio`, create a `CourtClosure` row for a court/date range with existing weekly availability, then confirm `getCourtSlots(courtId, thatDate)` (exercise via `GET /api/player/clubs/[clubId]/availability?date=...` as a signed-in player) shows the overlapping slots as `"closed"` with the reason.

---

### Task 4: `core/reservations` — block booking against a closure

**Files:**
- Modify: `core/reservations/services/reservations.service.ts`

**Interfaces:**
- Produces: `checkCourtClosureConflict({ courtId, scheduledStart, scheduledEnd }): Promise<string | null>` — returns the closure's `reason` if an active closure overlaps, else `null`.
- Consumes nothing new — queries `prisma.courtClosure` directly (this file already queries `prisma.court` directly elsewhere rather than going through `core/courts`'s service, so this follows the same established pattern instead of introducing a new cross-domain service import).

- [ ] **Step 1: Add `checkCourtClosureConflict`**

Add this new exported function near `checkUserOverlapConflict`:

```ts
/**
 * Is this court closed (an active CourtClosure) for any part of the given
 * time range? Returns the closure's reason if so, for a specific error
 * message — unlike the boolean checkCourtConflict/checkUserOverlapConflict,
 * since "This court is closed: {reason}" is meaningfully more useful to a
 * player than a generic conflict message.
 */
export async function checkCourtClosureConflict({
  courtId,
  scheduledStart,
  scheduledEnd,
}: {
  courtId: string;
  scheduledStart: Date;
  scheduledEnd: Date;
}): Promise<string | null> {
  const closure = await prisma.courtClosure.findFirst({
    where: {
      courtId,
      cancelledAt: null,
      startsAt: { lt: scheduledEnd },
      endsAt: { gt: scheduledStart },
    },
    select: { reason: true },
    orderBy: { startsAt: "asc" },
  });
  return closure?.reason ?? null;
}
```

- [ ] **Step 2: Wire it into `createReservation`**

Find this block inside `createReservation`:
```ts
  const [courtConflict, userConflict] = await Promise.all([
    checkCourtConflict({
      clubId: court.clubId,
      courtId: court.id,
      scheduledStart,
      scheduledEnd,
    }),
    checkUserOverlapConflict({
      userId: input.userId,
      scheduledStart,
      scheduledEnd,
    }),
  ]);

  if (courtConflict) {
    throw new Error("This slot is no longer available. Pick another time.");
  }
  if (userConflict) {
    throw new Error(
      "You already have a reservation at this time. Cancel it or pick a different slot.",
    );
  }
```

Replace it with:
```ts
  const [courtConflict, userConflict, closureReason] = await Promise.all([
    checkCourtConflict({
      clubId: court.clubId,
      courtId: court.id,
      scheduledStart,
      scheduledEnd,
    }),
    checkUserOverlapConflict({
      userId: input.userId,
      scheduledStart,
      scheduledEnd,
    }),
    checkCourtClosureConflict({
      courtId: court.id,
      scheduledStart,
      scheduledEnd,
    }),
  ]);

  if (courtConflict) {
    throw new Error("This slot is no longer available. Pick another time.");
  }
  if (userConflict) {
    throw new Error(
      "You already have a reservation at this time. Cancel it or pick a different slot.",
    );
  }
  if (closureReason) {
    throw new Error(`This court is closed: ${closureReason}`);
  }
```

Do not change anything else in `createReservation` or any other function in this file.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Manually verify: with the `CourtClosure` row created in Task 3's manual check still active, attempt `POST /api/player/reservations` for a slot inside that closure's window — expect a 409 with the message `"This court is closed: {reason}"`.

---

### Task 5: Audit — new actions, labels, entity filter

**Files:**
- Modify: `core/audit/types/index.ts`
- Modify: `app/dashboard/audit-logs/_components/AuditLogsView/consts.ts`

**Interfaces:**
- Produces: `AuditAction` gains `"court.closure_created"` and `"court.closure_cancelled"`.

- [ ] **Step 1: Extend `AuditAction`**

In `core/audit/types/index.ts`:
```ts
export type AuditAction =
  | "reservation.created"
  | "reservation.cancelled"
  | "reservation.completed"
  | "reservation.no_show"
  | "court.created"
  | "court.updated"
  | "court.deactivated"
  | "court.closure_created"
  | "court.closure_cancelled"
  | "club.created"
  | "club.updated"
  | "user.created"
  | "payment.confirmed"
  | "payment.refunded";
```

- [ ] **Step 2: Extend the Audit Log viewer's entity filter and action labels**

In `app/dashboard/audit-logs/_components/AuditLogsView/consts.ts`, add `"CourtClosure"` to `AUDIT_ENTITY_OPTIONS` (alphabetically, between `"Court"` and `"Payment"`):
```ts
export const AUDIT_ENTITY_OPTIONS = [
  "Club",
  "Court",
  "CourtClosure",
  "Payment",
  "Reservation",
  "UserProfile",
] as const;
```

Add the two new labels to `AUDIT_ACTION_LABELS` (this is a `Record<AuditAction, string>` — TypeScript will fail to compile without both, since the type just gained two members):
```ts
  "court.closure_created": "Court closure created",
  "court.closure_cancelled": "Court closure cancelled",
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

---

### Task 6: API routes — closures list/create + cancel

**Files:**
- Create: `app/api/clubs/courts/[courtId]/closures/route.ts`
- Create: `app/api/clubs/courts/[courtId]/closures/[closureId]/cancel/route.ts`

**Interfaces:**
- Consumes: `listClosuresByCourt`, `createClosure`, `cancelClosure` (Task 3), `createClosureSchema` (Task 2), `requireOwnerClub`/`findOwnedCourt` (existing, `app/api/clubs/_lib/`)

- [ ] **Step 1: List + create route**

Create `app/api/clubs/courts/[courtId]/closures/route.ts`:
```ts
import { NextResponse, type NextRequest } from "next/server";
import {
  createClosure,
  listClosuresByCourt,
} from "@/core/courts/services/courts.service";
import { createClosureSchema } from "@/core/courts/schemas/court.schema";
import { requireOwnerClub } from "../../../_lib/require-owner";
import { findOwnedCourt } from "../../../_lib/find-owned-court";

type RouteParams = { params: Promise<{ courtId: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;

  const { courtId } = await params;
  const owned = await findOwnedCourt(authResult.context.clubId, courtId);
  if (!owned) {
    return NextResponse.json({ error: "Court not found" }, { status: 404 });
  }

  const closures = await listClosuresByCourt(courtId);
  return NextResponse.json({ closures });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;

  const { courtId } = await params;
  const owned = await findOwnedCourt(authResult.context.clubId, courtId);
  if (!owned) {
    return NextResponse.json({ error: "Court not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createClosureSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  try {
    const closure = await createClosure(
      authResult.context.clubId,
      courtId,
      parsed.data,
      authResult.context.userId,
    );
    return NextResponse.json({ closure }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create closure";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
```

- [ ] **Step 2: Cancel route**

Create `app/api/clubs/courts/[courtId]/closures/[closureId]/cancel/route.ts`:
```ts
import { NextResponse, type NextRequest } from "next/server";
import { cancelClosure } from "@/core/courts/services/courts.service";
import { requireOwnerClub } from "../../../../../_lib/require-owner";
import { findOwnedCourt } from "../../../../../_lib/find-owned-court";

type RouteParams = { params: Promise<{ courtId: string; closureId: string }> };

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;

  const { courtId, closureId } = await params;
  const owned = await findOwnedCourt(authResult.context.clubId, courtId);
  if (!owned) {
    return NextResponse.json({ error: "Court not found" }, { status: 404 });
  }

  try {
    const closure = await cancelClosure(
      authResult.context.clubId,
      courtId,
      closureId,
      authResult.context.userId,
    );
    return NextResponse.json({ closure });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to cancel closure";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Manually verify as a signed-in owner: `POST /api/clubs/courts/{courtId}/closures` with `{"startsAt": "<future ISO>", "endsAt": "<later ISO>", "reason": "Test"}` → 201; `GET` the same path → the closure appears; `POST .../closures/{closureId}/cancel` → the closure's `cancelledAt` is set; a second cancel attempt → 409 "Closure is already cancelled".

---

### Task 7: `components/CourtAvailabilityGrid` — render `"closed"` slots

**Files:**
- Modify: `components/CourtAvailabilityGrid/types.ts`
- Modify: `components/CourtAvailabilityGrid/utils.ts`
- Modify: `components/CourtAvailabilityGrid/components/SlotCell/SlotCell.tsx`
- Modify: `components/CourtAvailabilityGrid/components/SlotCell/styles.ts`
- Modify: `app/dashboard/browse/_components/BrowseCourts/types.ts`
- Modify: `app/dashboard/browse/_components/BrowseCourts/utils.ts`
- Modify: `app/dashboard/reservations/_components/ReservationsView/types.ts`
- Modify: `app/dashboard/reservations/_components/ReservationsView/utils.ts`

**Interfaces:**
- Produces: `SlotStatus` (this component's own copy, separate from `core/courts/types`'s) extended to `"free" | "locked" | "closed"`; `Slot` gains `closureReason?: string`.

**Important — a gap the type checker won't catch:** both the player's Browse Courts page and the owner's Reservations page have their own independent `RawSlot` type (`status: "free" | "locked"`, no `closureReason`) and their own mapping function (`toCourtColumns` / `toSlot`) that convert the raw API JSON into this component's `Slot` type. Since `"free" | "locked"` is a subtype of `"free" | "locked" | "closed"`, assigning the narrower raw type into the wider `Slot.status` field is type-safe and `tsc --noEmit` will NOT flag it — but at runtime, a server response with `status: "closed"` and a `closureReason` would have `closureReason` silently dropped, since neither mapping function copies a field it doesn't know about. This must be fixed in the same two places or the "Closed" label will render with an empty tooltip and no reason, contradicting the spec's "reason is required and player-visible" requirement.

- [ ] **Step 1: Extend the grid's own `SlotStatus`/`Slot`**

In `components/CourtAvailabilityGrid/types.ts`, change:
```ts
export type SlotStatus = "free" | "locked" | "closed";

export type Slot = {
  start: Date;
  end: Date;
  status: SlotStatus;
  reservationId?: string;
  closureReason?: string;
};
```
(Everything else in this file is unchanged.)

- [ ] **Step 2: Exclude `"closed"` from interactivity**

In `components/CourtAvailabilityGrid/utils.ts`, replace `isSlotInteractive`:
```ts
/**
 * Free slots are interactive whenever a click handler is provided, for both
 * variants. Locked slots are only interactive for the "owner" variant, which
 * uses the click to inspect/cancel the existing reservation. Closed slots are
 * never interactive for either variant — there's no reservation to inspect,
 * and closure management happens in the Closures sheet, not this grid.
 */
export function isSlotInteractive(
  slot: Slot,
  variant: CourtAvailabilityGridVariant,
  hasClickHandler: boolean,
): boolean {
  if (!hasClickHandler) return false;
  if (slot.status === "free") return true;
  if (slot.status === "closed") return false;
  return variant === "owner";
}
```

- [ ] **Step 3: Render a distinct label/aria-label for closed slots**

In `components/CourtAvailabilityGrid/components/SlotCell/SlotCell.tsx`, replace the whole component body:
```tsx
export function SlotCell({
  slot,
  courtId,
  courtName,
  variant,
  onSlotClick,
}: SlotCellProps) {
  if (!slot) {
    return <div className={emptySlotClassName} aria-hidden="true" />;
  }

  const label =
    slot.status === "free"
      ? "Free"
      : slot.status === "closed"
        ? "Closed"
        : "Locked";
  const interactive = isSlotInteractive(slot, variant, Boolean(onSlotClick));

  if (!interactive) {
    return (
      <div
        className={getSlotClassName(slot.status, false)}
        title={slot.status === "closed" ? slot.closureReason : undefined}
      >
        {label}
      </div>
    );
  }

  const startTime = formatSlotTime(slot.start);
  const endTime = formatSlotTime(slot.end);
  const ariaLabel =
    slot.status === "free"
      ? `Book ${courtName}, ${startTime}–${endTime}`
      : `${courtName}, ${startTime}–${endTime}, unavailable`;

  return (
    <button
      type="button"
      className={getSlotClassName(slot.status, true)}
      aria-label={ariaLabel}
      onClick={() => onSlotClick?.(courtId, slot)}
    >
      {label}
    </button>
  );
}
```
(Since Step 2 guarantees `"closed"` is never `interactive`, the closed branch always takes the non-interactive `<div>` path above — where the `title` attribute carries the reason as a hover tooltip. The `ariaLabel` ternary in the interactive/button branch is unchanged from before, since a `"closed"` slot never reaches it.)

- [ ] **Step 4: Add a distinct style for closed slots**

In `components/CourtAvailabilityGrid/components/SlotCell/styles.ts`, replace `getSlotClassName`:
```ts
export function getSlotClassName(status: SlotStatus, interactive: boolean) {
  return cn(
    "flex h-9 w-full items-center justify-center rounded-md border text-xs font-medium transition-colors",
    status === "free"
      ? "border-primary/30 bg-primary/10 text-primary"
      : status === "closed"
        ? "border-dashed border-muted-foreground/30 bg-transparent text-muted-foreground/70"
        : "border-transparent bg-muted text-muted-foreground",
    interactive &&
      "cursor-pointer hover:bg-primary/20 active:bg-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
    !interactive && status === "locked" && "text-muted-foreground/90",
  );
}
```

- [ ] **Step 5: Update the player Browse Courts raw-slot mapping**

In `app/dashboard/browse/_components/BrowseCourts/types.ts`, change `RawSlot`:
```ts
export type RawSlot = {
  start: string;
  end: string;
  status: "free" | "locked" | "closed";
  reservationId?: string;
  closureReason?: string;
};
```

In `app/dashboard/browse/_components/BrowseCourts/utils.ts`, update `toCourtColumns`'s inner mapping to also copy `closureReason`:
```ts
export function toCourtColumns(raw: RawCourt[]): CourtColumn[] {
  return raw.map((court) => ({
    id: court.id,
    name: court.name,
    slots: court.slots.map((slot) => ({
      start: new Date(slot.start),
      end: new Date(slot.end),
      status: slot.status,
      ...(slot.reservationId && { reservationId: slot.reservationId }),
      ...(slot.closureReason && { closureReason: slot.closureReason }),
    })),
  }));
}
```
Do not change anything else in this file (`toDateKey`, `countUniqueSlotStarts` are unrelated).

- [ ] **Step 6: Update the owner Reservations raw-slot mapping**

In `app/dashboard/reservations/_components/ReservationsView/types.ts`, change `RawSlot` the same way:
```ts
export type RawSlot = {
  start: string;
  end: string;
  status: "free" | "locked" | "closed";
  reservationId?: string;
  closureReason?: string;
};
```

In `app/dashboard/reservations/_components/ReservationsView/utils.ts`, update `toSlot`:
```ts
export function toSlot(raw: RawSlot): Slot {
  return {
    start: new Date(raw.start),
    end: new Date(raw.end),
    status: raw.status,
    ...(raw.reservationId && { reservationId: raw.reservationId }),
    ...(raw.closureReason && { closureReason: raw.closureReason }),
  };
}
```
Do not change anything else in this file (`toReservationRecord`, `buildCourtColumns`, `buildReservationMap`, `formatTimeRange`, `isActionable`, `ACTIONABLE_STATUSES` are unrelated — in particular, do not fold `"closed"` into `ACTIONABLE_STATUSES`, which governs reservation lifecycle transitions, not slot rendering, and is a completely separate concept from closures).

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Manually verify in the browser: with the `CourtClosure` from Task 3's manual check still active, load `/dashboard/browse` as a player AND `/dashboard/reservations` as the owner, and confirm both grids show the overlapping slots as "Closed" with a dashed border, non-clickable, with the reason visible on hover in both.

---

### Task 8: `CourtsView` hooks — closures data layer

**Files:**
- Modify: `app/dashboard/courts/_components/CourtsView/hooks.ts`

**Interfaces:**
- Consumes: `CourtClosure`, `CreateClosureInput` (Task 2)
- Produces:
  - `useCourtClosures(courtId: string | null)`
  - `useCreateCourtClosure()`
  - `useCancelCourtClosure()`

- [ ] **Step 1: Add the import and three hooks**

Add `CourtClosure`, `CreateClosureInput` to the existing type-only import from `@/core/courts/types`.

Add at the end of the file:
```ts
export function useCourtClosures(courtId: string | null) {
  return useQuery({
    queryKey: ["court-closures", courtId],
    queryFn: () =>
      fetchJson<{ closures: CourtClosure[] }>(
        `/api/clubs/courts/${courtId}/closures`,
      ).then((data) => data.closures),
    enabled: Boolean(courtId),
  });
}

// No onSuccess/onError toast here, unlike this file's other mutations —
// ClosuresSheet's "apply to all courts" option calls this once per court via
// Promise.allSettled and needs to aggregate the per-court outcomes into a
// single summary toast itself; a toast fired from here per court would be
// redundant (or misleading) alongside that aggregate message.
export function useCreateCourtClosure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      courtId,
      input,
    }: {
      courtId: string;
      input: CreateClosureInput;
    }) =>
      fetchJson<{ closure: CourtClosure }>(
        `/api/clubs/courts/${courtId}/closures`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["court-closures", variables.courtId],
      });
    },
  });
}

export function useCancelCourtClosure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      courtId,
      closureId,
    }: {
      courtId: string;
      closureId: string;
    }) =>
      fetchJson<{ closure: CourtClosure }>(
        `/api/clubs/courts/${courtId}/closures/${closureId}/cancel`,
        { method: "POST" },
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["court-closures", variables.courtId],
      });
      toast.success("Closure cancelled");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

---

### Task 9: `ClosuresSheet` — new management UI

**Files:**
- Create: `app/dashboard/courts/_components/CourtsView/components/ClosuresSheet/ClosuresSheet.tsx`
- Create: `app/dashboard/courts/_components/CourtsView/components/ClosuresSheet/types.ts`
- Create: `app/dashboard/courts/_components/CourtsView/components/ClosuresSheet/index.ts`
- Create: `app/dashboard/courts/_components/CourtsView/components/ClosuresSheet/components/ClosuresList/ClosuresList.tsx`
- Create: `app/dashboard/courts/_components/CourtsView/components/ClosuresSheet/components/ClosuresList/types.ts`
- Create: `app/dashboard/courts/_components/CourtsView/components/ClosuresSheet/components/ClosuresList/index.ts`
- Create: `app/dashboard/courts/_components/CourtsView/components/ClosuresSheet/components/NewClosureForm/NewClosureForm.tsx`
- Create: `app/dashboard/courts/_components/CourtsView/components/ClosuresSheet/components/NewClosureForm/types.ts`
- Create: `app/dashboard/courts/_components/CourtsView/components/ClosuresSheet/components/NewClosureForm/consts.ts`
- Create: `app/dashboard/courts/_components/CourtsView/components/ClosuresSheet/components/NewClosureForm/index.ts`

**Interfaces:**
- Consumes: `useCourtClosures`, `useCreateCourtClosure`, `useCancelCourtClosure` (Task 8), `CourtRecord` (existing, `../../types`), `CourtClosure` (Task 2)
- Produces: `ClosuresSheet` component, exported `ClosuresSheetProps`.

- [ ] **Step 1: `NewClosureForm` — the create form**

Create `components/NewClosureForm/consts.ts`:
```ts
import { z } from "zod";

export const newClosureFormSchema = z
  .object({
    startsAt: z.string().min(1, "Start is required"),
    endsAt: z.string().min(1, "End is required"),
    reason: z.string().min(1, "Reason is required"),
    applyToAllCourts: z.boolean(),
  })
  .refine((data) => new Date(data.endsAt) > new Date(data.startsAt), {
    message: "End must be after start",
    path: ["endsAt"],
  });
```

Create `components/NewClosureForm/types.ts`:
```ts
export type NewClosureFormValues = {
  startsAt: string;
  endsAt: string;
  reason: string;
  applyToAllCourts: boolean;
};

export type NewClosureFormProps = {
  onSubmit: (values: NewClosureFormValues) => Promise<void>;
  isSubmitting: boolean;
  showApplyToAllCourts: boolean;
};
```

Create `components/NewClosureForm/NewClosureForm.tsx`:
```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { newClosureFormSchema } from "./consts";
import type { NewClosureFormValues, NewClosureFormProps } from "./types";

const DEFAULT_VALUES: NewClosureFormValues = {
  startsAt: "",
  endsAt: "",
  reason: "",
  applyToAllCourts: false,
};

export function NewClosureForm({
  onSubmit,
  isSubmitting,
  showApplyToAllCourts,
}: NewClosureFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<NewClosureFormValues>({
    resolver: zodResolver(newClosureFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const applyToAllCourts = watch("applyToAllCourts");

  async function submit(values: NewClosureFormValues) {
    await onSubmit(values);
    reset(DEFAULT_VALUES);
  }

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="flex flex-col gap-4 rounded-lg border p-3"
    >
      <Field>
        <FieldLabel htmlFor="closure-starts-at">Starts</FieldLabel>
        <Input
          id="closure-starts-at"
          type="datetime-local"
          {...register("startsAt")}
          aria-invalid={!!errors.startsAt}
        />
        <FieldError errors={[errors.startsAt]} />
      </Field>

      <Field>
        <FieldLabel htmlFor="closure-ends-at">Ends</FieldLabel>
        <Input
          id="closure-ends-at"
          type="datetime-local"
          {...register("endsAt")}
          aria-invalid={!!errors.endsAt}
        />
        <FieldError errors={[errors.endsAt]} />
      </Field>

      <Field>
        <FieldLabel htmlFor="closure-reason">Reason *</FieldLabel>
        <Input
          id="closure-reason"
          placeholder="Court resurfacing"
          {...register("reason")}
          aria-invalid={!!errors.reason}
        />
        <FieldError errors={[errors.reason]} />
      </Field>

      {showApplyToAllCourts && (
        <Field orientation="horizontal">
          <FieldLabel htmlFor="closure-apply-all">
            Apply to all courts
          </FieldLabel>
          <Switch
            id="closure-apply-all"
            checked={applyToAllCourts}
            onCheckedChange={(checked) =>
              setValue("applyToAllCourts", checked)
            }
          />
        </Field>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating…" : "Create closure"}
      </Button>
    </form>
  );
}
```

Create `components/NewClosureForm/index.ts`:
```ts
export { NewClosureForm } from "./NewClosureForm";
export type { NewClosureFormProps, NewClosureFormValues } from "./types";
```

- [ ] **Step 2: `ClosuresList` — the history/cancel list**

Create `components/ClosuresList/types.ts`:
```ts
import type { CourtClosure } from "@/core/courts/types";

export type ClosuresListProps = {
  closures: CourtClosure[];
  onCancel: (closureId: string) => void;
  cancellingClosureId: string | null;
};
```

Create `components/ClosuresList/ClosuresList.tsx`:
```tsx
"use client";

import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ClosuresListProps } from "./types";

export function ClosuresList({
  closures,
  onCancel,
  cancellingClosureId,
}: ClosuresListProps) {
  if (closures.length === 0) {
    return <p className="text-sm text-muted-foreground">No closures yet.</p>;
  }

  const now = Date.now();

  return (
    <div className="flex flex-col gap-2">
      {closures.map((closure) => {
        const isCancelled = Boolean(closure.cancelledAt);
        const isPast = closure.endsAt.getTime() <= now;
        const isActive = !isCancelled && !isPast;

        return (
          <div
            key={closure.id}
            className="flex items-center justify-between gap-2 rounded-lg border p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{closure.reason}</p>
              <p className="text-xs text-muted-foreground">
                {format(closure.startsAt, "MMM d, HH:mm")} –{" "}
                {format(closure.endsAt, "MMM d, HH:mm")}
              </p>
            </div>
            <Badge
              variant={
                isCancelled ? "outline" : isPast ? "secondary" : "default"
              }
            >
              {isCancelled ? "Cancelled" : isPast ? "Past" : "Active"}
            </Badge>
            {isActive && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={cancellingClosureId === closure.id}
                onClick={() => onCancel(closure.id)}
              >
                {cancellingClosureId === closure.id ? "Cancelling…" : "Cancel"}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

Create `components/ClosuresList/index.ts`:
```ts
export { ClosuresList } from "./ClosuresList";
export type { ClosuresListProps } from "./types";
```

- [ ] **Step 3: `ClosuresSheet` — orchestrates the two above**

Create `types.ts`:
```ts
import type { CourtRecord } from "../../types";

export type ClosuresSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  court: CourtRecord | null;
  courts: CourtRecord[];
};
```

Create `ClosuresSheet.tsx`:
```tsx
"use client";

import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  useCancelCourtClosure,
  useCourtClosures,
  useCreateCourtClosure,
} from "../../hooks";
import { ClosuresList } from "./components/ClosuresList";
import { NewClosureForm } from "./components/NewClosureForm";
import type { NewClosureFormValues } from "./components/NewClosureForm/types";
import type { ClosuresSheetProps } from "./types";

export function ClosuresSheet({
  open,
  onOpenChange,
  court,
  courts,
}: ClosuresSheetProps) {
  const courtId = court?.id ?? null;
  const { data: closures, isLoading } = useCourtClosures(
    open ? courtId : null,
  );
  const createClosure = useCreateCourtClosure();
  const cancelClosure = useCancelCourtClosure();

  async function handleCreate(values: NewClosureFormValues) {
    const targetCourtIds = values.applyToAllCourts
      ? courts.filter((c) => c.active).map((c) => c.id)
      : courtId
        ? [courtId]
        : [];

    if (targetCourtIds.length === 0) return;

    const input = {
      startsAt: new Date(values.startsAt).toISOString(),
      endsAt: new Date(values.endsAt).toISOString(),
      reason: values.reason,
    };

    const results = await Promise.allSettled(
      targetCourtIds.map((id) =>
        createClosure.mutateAsync({ courtId: id, input }),
      ),
    );
    const failures = results.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    );

    if (failures.length === 0) {
      toast.success(
        targetCourtIds.length > 1
          ? `Closure created for ${targetCourtIds.length} courts`
          : "Closure created",
      );
    } else if (failures.length === targetCourtIds.length) {
      toast.error(
        failures[0].reason instanceof Error
          ? failures[0].reason.message
          : "Failed to create closure",
      );
    } else {
      toast.error(
        `Created for ${targetCourtIds.length - failures.length} of ${targetCourtIds.length} courts. ${failures.length} conflicted — check each court's closures.`,
      );
    }
  }

  async function handleCancel(closureId: string) {
    if (!courtId) return;
    try {
      await cancelClosure.mutateAsync({ courtId, closureId });
    } catch {
      // useCancelCourtClosure's onError already surfaces a toast
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent onPointerDownOutside={(e) => e.preventDefault()}>
        <SheetHeader>
          <SheetTitle>Closures</SheetTitle>
          <SheetDescription>
            {court
              ? `Block ${court.name} for maintenance, events, or planned closures.`
              : "Block this court for maintenance, events, or planned closures."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4">
          <NewClosureForm
            onSubmit={handleCreate}
            isSubmitting={createClosure.isPending}
            showApplyToAllCourts={courts.length > 1}
          />

          {isLoading || !closures ? (
            <p className="text-sm text-muted-foreground">
              Loading closures…
            </p>
          ) : (
            <ClosuresList
              closures={closures}
              onCancel={handleCancel}
              cancellingClosureId={
                cancelClosure.isPending
                  ? (cancelClosure.variables?.closureId ?? null)
                  : null
              }
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

Create `index.ts`:
```ts
export { ClosuresSheet } from "./ClosuresSheet";
export type { ClosuresSheetProps } from "./types";
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

---

### Task 10: Wire `ClosuresSheet` into the Courts page

**Files:**
- Modify: `app/dashboard/courts/_components/CourtsView/components/CourtsTable/CourtsTable.tsx`
- Modify: `app/dashboard/courts/_components/CourtsView/components/CourtsTable/types.ts`
- Modify: `app/dashboard/courts/_components/CourtsView/CourtsView.tsx`

**Interfaces:**
- Consumes: `ClosuresSheet` (Task 9)

- [ ] **Step 1: Add the "Closures" row action**

In `CourtsTable/types.ts`, add to `CourtsTableProps`:
```ts
export type CourtsTableProps = {
  courts: CourtRecord[];
  isLoading: boolean;
  onEdit: (court: CourtRecord) => void;
  onEditAvailability: (court: CourtRecord) => void;
  onEditClosures: (court: CourtRecord) => void;
  onDelete: (court: CourtRecord) => void;
  deletingCourtId: string | null;
};
```

In `CourtsTable.tsx`, add `CalendarOff` to the `lucide-react` import, add `onEditClosures` to the destructured props, and add a new button right after the existing "Edit availability" button (before "Edit"):
```tsx
import { CalendarClock, CalendarOff, Pencil, Trash2 } from "lucide-react";
```
```tsx
export function CourtsTable({
  courts,
  isLoading,
  onEdit,
  onEditAvailability,
  onEditClosures,
  onDelete,
  deletingCourtId,
}: CourtsTableProps) {
```
```tsx
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit availability for ${court.name}`}
                    onClick={() => onEditAvailability(court)}
                  >
                    <CalendarClock />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Manage closures for ${court.name}`}
                    onClick={() => onEditClosures(court)}
                  >
                    <CalendarOff />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit ${court.name}`}
                    onClick={() => onEdit(court)}
                  >
                    <Pencil />
                  </Button>
```

- [ ] **Step 2: Wire the sheet into `CourtsView`**

In `CourtsView.tsx`, add the import:
```tsx
import { ClosuresSheet } from "./components/ClosuresSheet";
```

Add new state (next to the existing `availabilityOpen`/`availabilityCourt` state):
```tsx
  const [closuresOpen, setClosuresOpen] = useState(false);
  const [closuresCourt, setClosuresCourt] = useState<CourtRecord | null>(
    null,
  );
```

Add a handler (next to `openAvailability`):
```tsx
  function openClosures(court: CourtRecord) {
    setClosuresCourt(court);
    setClosuresOpen(true);
  }
```

Pass the new prop to `CourtsTable`:
```tsx
      <CourtsTable
        courts={courts}
        isLoading={isLoading}
        onEdit={openEditForm}
        onEditAvailability={openAvailability}
        onEditClosures={openClosures}
        onDelete={setCourtPendingDeletion}
        deletingCourtId={
          deleteCourt.isPending ? (deleteCourt.variables ?? null) : null
        }
      />
```

Render the sheet, right after the existing `<AvailabilitySheet .../>`:
```tsx
      <ClosuresSheet
        open={closuresOpen}
        onOpenChange={setClosuresOpen}
        court={closuresCourt}
        courts={courts}
      />
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Manually verify in the browser: on `/dashboard/courts`, click the new closures icon on a court row — the sheet opens, the create form works, "Apply to all courts" only shows when the club has more than one court, and cancelling a closure updates its badge to "Cancelled" without a page reload.

---

### Task 11: Docs

**Files:**
- Modify: `docs/API.md`
- Modify: `docs/DATABASE.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/PROJECT_STATUS.md`
- Modify: `docs/roadmap.md`

- [ ] **Step 1: `API.md`**

Add a row to the "Owner-facing (club-scoped)" table (or a new small "Closures" subsection right after it) documenting `GET`/`POST /api/clubs/courts/[courtId]/closures` and `POST /api/clubs/courts/[courtId]/closures/[closureId]/cancel`, matching this doc's existing one-line-per-route table style. Note that creating a closure is blocked (409) if it overlaps active reservations, listing them in the error message.

- [ ] **Step 2: `DATABASE.md`**

Add `CourtClosure` to the Models table (purpose: a per-court block for a date/time range, with a required `reason`; `cancelledAt`/`cancelledBy` for the soft-cancel state — no separate `active` boolean). Add it to the ERD text block under `Court`. Note in the `Court` row that `Court.closures` is a new relation.

- [ ] **Step 3: `ARCHITECTURE.md`**

No structural changes needed (no new routes outside the existing `/api/clubs/**` owner-scoped pattern, no new public routes, no proxy.ts changes) — skip unless something else in this doc references the courts/reservations flow in a way this feature would make stale; if so, add one sentence noting `getCourtSlots`/`checkCourtConflict` now also account for closures.

- [ ] **Step 4: `PROJECT_STATUS.md`**

Update the "Courts" bullet under Owner Dashboard to mention the new "Closures" action (block a court for a date/time range, reason shown to players, blocked if it overlaps active reservations). Update the "Browse Courts" bullet under Player Dashboard to mention that a closed slot renders distinctly with its reason.

- [ ] **Step 5: `roadmap.md`**

The original "Court Management enhancements" idea isn't currently listed as its own roadmap line (it was split out during the Payments brainstorm and tracked only in conversation/memory, not in this file) — add a new line under Phase 1 or Phase 2 (whichever this doc's existing grouping best fits) noting closures are done and the other three sub-features (minimum reservation duration, court characteristics, bulk edit across courts) remain queued as separate future work.

- [ ] **Step 6: Verify**

Run: `npm run lint` and `npx tsc --noEmit` as the final whole-plan check.
