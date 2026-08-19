# Court Slot Waitlist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a player ask to be notified when a specific court's specific time slot frees up, via a broadcast email to everyone waiting when a cancellation happens — no reserved claim window, no change to slot availability computation.

**Architecture:** A new `core/waitlist/` domain module (types + services) owns a new `WaitlistEntry` Prisma model. It hooks into the single existing cancellation entry point (`cancelReservation`) to notify waitlisted players, extends the player-facing availability API to report per-slot waitlist status, and extends the shared `CourtAvailabilityGrid`/`SlotCell` component with a new opt-in prop so the owner-side reservations grid is completely unaffected.

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma/Neon Postgres, TanStack Query, Vitest, `@react-email/components` + Resend.

**Spec:** [docs/superpowers/specs/2026-08-19-court-waitlist-design.md](../specs/2026-08-19-court-waitlist-design.md)

## Global Constraints

- No git commands in any task — this project's standing rule is zero git mutations, ever. Every task ends with a plain verification step, never a commit.
- No `npx prisma db push` or `npx prisma migrate` in any task — both are DB-mutating and forbidden. Task 1's schema edit is text-only; the user runs `db push` themselves once every task is complete (see Task 9's final note).
- `npx prisma generate` (schema → TypeScript client only, no DB access) IS allowed and is REQUIRED after Task 1 for later tasks to typecheck against the new `WaitlistEntry` model — see the orchestrator note at the end of Task 1.
- Strict TDD Mode is active: service-layer functions get RED-then-GREEN tests, mocking `@/infrastructure/db/client`'s `prisma` export (see `core/courts/services/hasAnyFreeSlot.test.ts` or `core/users/services/users.service.test.ts` for the established mocking pattern).
- Follow the existing `core/<domain>/{types,services}` module convention (e.g. `core/notifications/`, `core/audit/`) — no `schemas/` subfolder needed here (no Zod form validation, just an existence check).
- New/modified shared UI props must be optional and additive — the owner-side `app/dashboard/reservations/_components/ReservationsView/ReservationsView.tsx`'s `CourtAvailabilityGrid` usage must render identically to before, with zero changes to that file.
- English-only code, comments, and UI copy.
- Every file this plan touches may also contain unrelated, legitimate, already-shipped changes from other work in this repo — read each file's actual current content before editing rather than trusting only the snippets below, captured at plan-writing time.

---

### Task 1: Prisma schema — `WaitlistEntry`

**Files:**

- Modify: `prisma/schema.prisma`

**Interfaces:**

- Produces: `WaitlistEntry` model and `WaitlistEntryStatus` enum (fields: `id`, `clubId`, `courtId`, `courtName`, `userId`, `scheduledStart`, `scheduledEnd`, `status`, `notifiedAt`, `createdAt`, `updatedAt`) — consumed by Task 4's service layer once the Prisma client is regenerated (see the orchestrator note at the end of this task).

- [ ] **Step 1: Add the enum and model**

Read `prisma/schema.prisma`, find the `Reservation` model (search for `model Reservation`). Add the following directly after it:

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

- [ ] **Step 2: Add back-relations**

Find `model Court { ... }` and add one new line inside its field list (anywhere among the existing relation fields, e.g. near `reservations` if that field exists on `Court`, otherwise near the end before the closing `}`):

```prisma
  waitlistEntries WaitlistEntry[]
```

Find `model UserProfile { ... }` and add the same line (it already has a `reservations Reservation[]` field — add this directly after it):

```prisma
  waitlistEntries WaitlistEntry[]
```

Find `model Club { ... }` and add the same line (Club already has relation fields like `courts`/`reservations` if present — add near them):

```prisma
  waitlistEntries WaitlistEntry[]
```

- [ ] **Step 3: Verify the schema is syntactically valid**

Run: `npx prisma validate`
Expected: `The schema at prisma\schema.prisma is valid 🚀` (or equivalent success message, no error output).

**Orchestrator note (not a task step — do this yourself between Task 1 and Task 2, not inside the implementer's dispatch):** once Task 1's implementer reports DONE, run `npx prisma generate` yourself before dispatching Task 2. This only reads `schema.prisma` and regenerates the local TypeScript client — it does not touch the database and is not blocked by the no-DB-mutation rule — but every later task's `npx tsc --noEmit` step will show a spurious "WaitlistEntry does not exist on PrismaClient" error until this runs once. If `npx prisma generate` is blocked by sandbox permissions when a subagent tries it, that confirms it needs to run in the orchestrator's own turn, not a dispatched task.

---

### Task 2: `NotificationType` and `AuditAction` additions

**Files:**

- Modify: `core/notifications/types/index.ts`
- Modify: `core/audit/types/index.ts`
- Modify: `app/dashboard/audit-logs/_components/AuditLogsView/consts.ts`

**Interfaces:**

- Produces: `"WAITLIST_SLOT_AVAILABLE"` as a valid `NotificationType` value; `"waitlist.notified"` as a valid `AuditAction` value with a display label — both consumed by Task 4's `notifyWaitlistForSlot`.

- [ ] **Step 1: Add the notification type**

In `core/notifications/types/index.ts`, current:

```typescript
export type NotificationType =
  "RESERVATION_REMINDER" | "RESERVATION_CANCELLED" | "PAYMENT_CONFIRMED";
```

Replace with:

```typescript
export type NotificationType =
  | "RESERVATION_REMINDER"
  | "RESERVATION_CANCELLED"
  | "PAYMENT_CONFIRMED"
  | "WAITLIST_SLOT_AVAILABLE";
```

- [ ] **Step 2: Add the audit action**

In `core/audit/types/index.ts`, current:

```typescript
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

Read the actual current file first — it may already have grown (e.g. it may already include `"user.updated"`/`"user.anonymized"` from earlier work). Add `"waitlist.notified"` to the union (anywhere logical, e.g. at the end before the closing `;`), without removing or reordering any existing member.

- [ ] **Step 3: Add the display label and entity option**

In `app/dashboard/audit-logs/_components/AuditLogsView/consts.ts`, read the actual current `AUDIT_ACTION_LABELS` object and `AUDIT_ENTITY_OPTIONS` array first (both may have grown since this plan was written). Add one new entry to `AUDIT_ACTION_LABELS`:

```typescript
  "waitlist.notified": "Waitlist notified",
```

And add `"WaitlistEntry"` to `AUDIT_ENTITY_OPTIONS` (append it — the existing array is alphabetically ordered: `Club, Court, CourtClosure, Payment, Reservation, UserProfile` — `WaitlistEntry` sorts after all of them).

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean (aside from the pre-existing unrelated `eslint-rules/sort-index-exports.mjs` warning).

---

### Task 3: Email template — `WaitlistSlotAvailable`

**Files:**

- Create: `lib/email/templates/WaitlistSlotAvailable.tsx`

**Interfaces:**

- Produces: `WaitlistSlotAvailable` React component, props `{ userName: string; courtName: string; scheduledStart: Date; clubId: string; courtId: string; dateKey: string }` — consumed by Task 4's `notifyWaitlistForSlot`.

- [ ] **Step 1: Write the template**

Mirror `lib/email/templates/ReservationCancelled.tsx`'s exact structure and inline-style objects (read that file first — it uses `@react-email/components`' `Body`/`Container`/`Head`/`Heading`/`Hr`/`Html`/`Preview`/`Section`/`Text`, with `main`/`container`/`h1`/`text`/`infoBox`/`infoLine`/`hr`/`footer` style constants defined at module scope below the component).

```tsx
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface WaitlistSlotAvailableProps {
  userName: string;
  courtName: string;
  scheduledStart: Date;
  clubId: string;
  courtId: string;
  dateKey: string;
}

export function WaitlistSlotAvailable({
  userName,
  courtName,
  scheduledStart,
  clubId,
  courtId,
  dateKey,
}: WaitlistSlotAvailableProps) {
  const formattedDate = scheduledStart.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = scheduledStart.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const bookingUrl = `https://playpadel.app/dashboard/browse?club=${clubId}&court=${courtId}&date=${dateKey}`;

  return (
    <Html>
      <Head />
      <Preview>A slot you were waiting for just opened up</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>A Slot Just Opened Up</Heading>
          <Text style={text}>Hello {userName},</Text>
          <Text style={text}>
            Good news — a slot you asked to be notified about is now free:
          </Text>
          <Section style={infoBox}>
            <Text style={infoLine}>
              <strong>Date:</strong> {formattedDate}
            </Text>
            <Text style={infoLine}>
              <strong>Time:</strong> {formattedTime}
            </Text>
            <Text style={infoLine}>
              <strong>Court:</strong> {courtName}
            </Text>
          </Section>
          <Section style={{ marginTop: "24px" }}>
            <Button style={button} href={bookingUrl}>
              Book it now
            </Button>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>
            This slot is available on a first-come, first-served basis — other
            players may have also asked to be notified.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = { backgroundColor: "#f6f9fc", fontFamily: "sans-serif" };
const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px",
  maxWidth: "600px",
};
const h1 = { color: "#1a1a1a", fontSize: "24px", fontWeight: "bold" };
const text = { color: "#374151", fontSize: "14px", lineHeight: "24px" };
const infoBox = {
  backgroundColor: "#f3f4f6",
  borderRadius: "8px",
  padding: "16px",
  marginTop: "16px",
};
const infoLine = { color: "#374151", fontSize: "14px", margin: "4px 0" };
const button = {
  backgroundColor: "#1a1a1a",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px 20px",
};
const hr = { borderColor: "#e5e7eb", margin: "20px 0" };
const footer = { color: "#6b7280", fontSize: "12px" };
```

Note the hardcoded `https://playpadel.app` origin matches `lib/notifications/dispatcher.ts`'s existing `FROM_ADDRESS = "noreply@playpadel.app"` convention — this codebase does not currently have an environment-based base-URL helper for email templates; introducing one is out of scope for this plan (YAGNI — follow the existing hardcoded-domain pattern, don't add new infrastructure for one template).

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

---

### Task 4: `core/waitlist/` module — types and services (TDD)

**Files:**

- Create: `core/waitlist/types/index.ts`
- Create: `core/waitlist/services/waitlist.service.ts`
- Create: `core/waitlist/services/waitlist.service.test.ts`

**Interfaces:**

- Consumes: `WaitlistEntry`/`WaitlistEntryStatus` (Task 1, via the regenerated Prisma client), `NotificationType.WAITLIST_SLOT_AVAILABLE` and `AuditAction."waitlist.notified"` (Task 2), `WaitlistSlotAvailable` (Task 3), `dispatch` from `@/lib/notifications/dispatcher`, `logAudit` from `@/core/audit/services/audit.service`.
- Produces: `joinWaitlist(params)`, `hasActiveWaitlistEntry(courtId, scheduledStart, userId)`, `notifyWaitlistForSlot(courtId, scheduledStart)` — consumed by Task 5 (hook), Task 6 (join route), Task 7 (availability route).

- [ ] **Step 1: Write `core/waitlist/types/index.ts`**

```typescript
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

- [ ] **Step 2: Write the failing tests**

Read `core/users/services/users.service.test.ts` first for this codebase's exact Prisma-mocking convention (mocking `@/infrastructure/db/client`'s `prisma` export with `vi.fn()`-based method mocks). Also read `lib/notifications/dispatcher.ts`'s `dispatch` signature (already reproduced in the spec — takes `{ type, clubId, recipientId, recipientEmail, recipientName, subject, html }`) and `core/audit/services/audit.service.ts`'s `logAudit` signature.

Create `core/waitlist/services/waitlist.service.test.ts`:

```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    waitlistEntry: {
      upsert: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/notifications/dispatcher", () => ({
  dispatch: vi.fn(),
}));

vi.mock("@/core/audit/services/audit.service", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@react-email/render", () => ({
  render: vi.fn().mockResolvedValue("<html>mock</html>"),
}));

vi.mock("@/infrastructure/db/client", async () => {
  const actual = {};
  return actual;
});

import { prisma } from "@/infrastructure/db/client";
import { dispatch } from "@/lib/notifications/dispatcher";
import { logAudit } from "@/core/audit/services/audit.service";
import {
  joinWaitlist,
  hasActiveWaitlistEntry,
  notifyWaitlistForSlot,
} from "./waitlist.service";

const upsertMock = prisma.waitlistEntry.upsert as ReturnType<typeof vi.fn>;
const findFirstMock = prisma.waitlistEntry.findFirst as ReturnType<
  typeof vi.fn
>;
const findManyMock = prisma.waitlistEntry.findMany as ReturnType<typeof vi.fn>;
const updateMock = prisma.waitlistEntry.update as ReturnType<typeof vi.fn>;
const dispatchMock = dispatch as ReturnType<typeof vi.fn>;

function makeRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "wl_1",
    clubId: "club_1",
    courtId: "court_1",
    courtName: "Court 1",
    userId: "user_1",
    scheduledStart: new Date("2026-09-01T18:00:00"),
    scheduledEnd: new Date("2026-09-01T19:00:00"),
    status: "WAITING",
    notifiedAt: null,
    createdAt: new Date("2026-08-01T00:00:00"),
    updatedAt: new Date("2026-08-01T00:00:00"),
    ...overrides,
  };
}

describe("joinWaitlist", () => {
  beforeEach(() => {
    upsertMock.mockReset();
  });

  it("upserts on the (courtId, scheduledStart, userId) unique key", async () => {
    upsertMock.mockResolvedValue(makeRow());

    await joinWaitlist({
      courtId: "court_1",
      courtName: "Court 1",
      clubId: "club_1",
      scheduledStart: new Date("2026-09-01T18:00:00"),
      scheduledEnd: new Date("2026-09-01T19:00:00"),
      userId: "user_1",
    });

    expect(upsertMock).toHaveBeenCalledTimes(1);
    const call = upsertMock.mock.calls[0][0];
    expect(call.where).toEqual({
      courtId_scheduledStart_userId: {
        courtId: "court_1",
        scheduledStart: new Date("2026-09-01T18:00:00"),
        userId: "user_1",
      },
    });
  });

  it("resets an existing NOTIFIED row back to WAITING on the update branch", async () => {
    upsertMock.mockResolvedValue(makeRow());

    await joinWaitlist({
      courtId: "court_1",
      courtName: "Court 1",
      clubId: "club_1",
      scheduledStart: new Date("2026-09-01T18:00:00"),
      scheduledEnd: new Date("2026-09-01T19:00:00"),
      userId: "user_1",
    });

    const call = upsertMock.mock.calls[0][0];
    expect(call.update).toEqual({ status: "WAITING", notifiedAt: null });
  });
});

describe("hasActiveWaitlistEntry", () => {
  beforeEach(() => {
    findFirstMock.mockReset();
  });

  it("returns true when a WAITING row exists", async () => {
    findFirstMock.mockResolvedValue(makeRow({ status: "WAITING" }));

    const result = await hasActiveWaitlistEntry(
      "court_1",
      new Date("2026-09-01T18:00:00"),
      "user_1",
    );

    expect(result).toBe(true);
    expect(findFirstMock).toHaveBeenCalledWith({
      where: {
        courtId: "court_1",
        scheduledStart: new Date("2026-09-01T18:00:00"),
        userId: "user_1",
        status: "WAITING",
      },
    });
  });

  it("returns false when no row exists", async () => {
    findFirstMock.mockResolvedValue(null);

    const result = await hasActiveWaitlistEntry(
      "court_1",
      new Date("2026-09-01T18:00:00"),
      "user_1",
    );

    expect(result).toBe(false);
  });
});

describe("notifyWaitlistForSlot", () => {
  beforeEach(() => {
    findManyMock.mockReset();
    updateMock.mockReset();
    dispatchMock.mockReset();
  });

  it("notifies every WAITING entry for the exact slot and flips each to NOTIFIED", async () => {
    findManyMock.mockResolvedValue([
      makeRow({ id: "wl_1", userId: "user_1" }),
      makeRow({ id: "wl_2", userId: "user_2" }),
    ]);
    updateMock.mockResolvedValue(makeRow());

    await notifyWaitlistForSlot("court_1", new Date("2026-09-01T18:00:00"));

    expect(findManyMock).toHaveBeenCalledWith({
      where: {
        courtId: "court_1",
        scheduledStart: new Date("2026-09-01T18:00:00"),
        status: "WAITING",
      },
    });
    expect(dispatchMock).toHaveBeenCalledTimes(2);
    expect(updateMock).toHaveBeenCalledTimes(2);
    expect(updateMock.mock.calls[0][0].where).toEqual({ id: "wl_1" });
    expect(updateMock.mock.calls[0][0].data.status).toBe("NOTIFIED");
    expect(updateMock.mock.calls[1][0].where).toEqual({ id: "wl_2" });
  });

  it("does not let one entry's dispatch failure stop the rest from being notified", async () => {
    findManyMock.mockResolvedValue([
      makeRow({ id: "wl_1", userId: "user_1" }),
      makeRow({ id: "wl_2", userId: "user_2" }),
    ]);
    dispatchMock
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(undefined);
    updateMock.mockResolvedValue(makeRow());

    await notifyWaitlistForSlot("court_1", new Date("2026-09-01T18:00:00"));

    expect(dispatchMock).toHaveBeenCalledTimes(2);
    // The second entry must still be processed despite the first's failure.
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock.mock.calls[0][0].where).toEqual({ id: "wl_2" });
  });
});
```

- [ ] **Step 3: Run the tests, confirm they fail**

Run: `npx vitest run core/waitlist/services/waitlist.service.test.ts`
Expected: FAIL — `waitlist.service.ts` doesn't exist yet, so the import fails.

- [ ] **Step 4: Implement `core/waitlist/services/waitlist.service.ts`**

```typescript
import { prisma } from "@/infrastructure/db/client";
import { render } from "@react-email/render";
import * as React from "react";
import { dispatch } from "@/lib/notifications/dispatcher";
import { logAudit } from "@/core/audit/services/audit.service";
import { WaitlistSlotAvailable } from "@/lib/email/templates/WaitlistSlotAvailable";
import type { WaitlistEntry, WaitlistEntryStatus } from "@/core/waitlist/types";

type WaitlistEntryRow = NonNullable<
  Awaited<ReturnType<typeof prisma.waitlistEntry.findFirst>>
>;

function toWaitlistEntry(row: WaitlistEntryRow): WaitlistEntry {
  return {
    id: row.id,
    clubId: row.clubId,
    courtId: row.courtId,
    courtName: row.courtName,
    userId: row.userId,
    scheduledStart: row.scheduledStart,
    scheduledEnd: row.scheduledEnd,
    status: row.status as WaitlistEntryStatus,
    notifiedAt: row.notifiedAt ?? undefined,
    createdAt: row.createdAt,
  };
}

export interface JoinWaitlistParams {
  courtId: string;
  courtName: string;
  clubId: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  userId: string;
}

/**
 * Idempotent join: creates a WAITING row on first join, resets an existing
 * NOTIFIED row back to WAITING on rejoin, and is a no-op (returns the
 * existing row) if already WAITING — see docs/superpowers/specs/
 * 2026-08-19-court-waitlist-design.md.
 */
export async function joinWaitlist(
  params: JoinWaitlistParams,
): Promise<WaitlistEntry> {
  const row = await prisma.waitlistEntry.upsert({
    where: {
      courtId_scheduledStart_userId: {
        courtId: params.courtId,
        scheduledStart: params.scheduledStart,
        userId: params.userId,
      },
    },
    create: {
      clubId: params.clubId,
      courtId: params.courtId,
      courtName: params.courtName,
      userId: params.userId,
      scheduledStart: params.scheduledStart,
      scheduledEnd: params.scheduledEnd,
      status: "WAITING",
    },
    update: {
      status: "WAITING",
      notifiedAt: null,
    },
  });
  return toWaitlistEntry(row);
}

/**
 * True only for an active (WAITING) entry — a NOTIFIED entry means this
 * player was already told, so the UI should not show them as still waiting
 * unless they explicitly rejoin.
 */
export async function hasActiveWaitlistEntry(
  courtId: string,
  scheduledStart: Date,
  userId: string,
): Promise<boolean> {
  const row = await prisma.waitlistEntry.findFirst({
    where: { courtId, scheduledStart, userId, status: "WAITING" },
  });
  return row !== null;
}

/**
 * Notifies every WAITING entry for the exact (courtId, scheduledStart) slot
 * — a broadcast, not a queue: there is no reserved claim window, so everyone
 * waiting is told at once and the normal booking flow decides who gets it.
 * Each entry is processed independently so one dispatch failure doesn't
 * block the rest. Never throws — callers (cancelReservation) wrap this in
 * their own non-throwing guard, but this function is defensive on its own
 * terms too since it fans out over multiple independent recipients.
 */
export async function notifyWaitlistForSlot(
  courtId: string,
  scheduledStart: Date,
): Promise<void> {
  const entries = await prisma.waitlistEntry.findMany({
    where: { courtId, scheduledStart, status: "WAITING" },
  });

  for (const entry of entries) {
    try {
      const user = await prisma.userProfile.findUnique({
        where: { id: entry.userId },
        select: { email: true, displayName: true },
      });
      const userName = user?.displayName ?? "there";

      const dateKey = `${entry.scheduledStart.getFullYear()}-${String(
        entry.scheduledStart.getMonth() + 1,
      ).padStart(
        2,
        "0",
      )}-${String(entry.scheduledStart.getDate()).padStart(2, "0")}`;

      const html = await render(
        React.createElement(WaitlistSlotAvailable, {
          userName,
          courtName: entry.courtName,
          scheduledStart: entry.scheduledStart,
          clubId: entry.clubId,
          courtId: entry.courtId,
          dateKey,
        }),
      );

      await dispatch({
        type: "WAITLIST_SLOT_AVAILABLE",
        clubId: entry.clubId,
        recipientId: entry.userId,
        recipientEmail: user?.email ?? null,
        recipientName: userName,
        subject: "A slot you were waiting for just opened up",
        html,
      });

      await prisma.waitlistEntry.update({
        where: { id: entry.id },
        data: { status: "NOTIFIED", notifiedAt: new Date() },
      });

      logAudit({
        clubId: entry.clubId,
        userId: entry.userId,
        userDisplayName: userName,
        action: "waitlist.notified",
        entity: "WaitlistEntry",
        entityId: entry.id,
        metadata: { courtId: entry.courtId, courtName: entry.courtName },
      });
    } catch (err) {
      console.error(
        `[waitlist] Failed to notify entry ${entry.id} for court ${courtId}:`,
        err,
      );
      // Continue to the next entry — one failure must not block the rest.
    }
  }
}
```

- [ ] **Step 5: Run the tests, confirm they pass**

Run: `npx vitest run core/waitlist/services/waitlist.service.test.ts`
Expected: PASS, all tests green.

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

---

### Task 5: Hook `cancelReservation` into the waitlist

**Files:**

- Modify: `core/reservations/services/reservations.service.ts`

**Interfaces:**

- Consumes: `notifyWaitlistForSlot` (Task 4).

- [ ] **Step 1: Read the current file**

Read `core/reservations/services/reservations.service.ts`'s `cancelReservation` function in full (its current shape is reproduced accurately in the spec doc, but re-verify against the live file — it may have evolved). Find the existing non-throwing cancellation-confirmation-email block (`try { ... const html = await render(...ReservationCancelled...); await dispatch({...}); } catch { /* notification failure must not affect reservation cancellation */ }`) and the `logAudit` call that follows it.

- [ ] **Step 2: Add the waitlist hook**

Add a new import: `import { notifyWaitlistForSlot } from "@/core/waitlist/services/waitlist.service";`

Insert a new non-throwing block between the existing cancellation-email `try/catch` and the `logAudit` call:

```typescript
try {
  await notifyWaitlistForSlot(row.courtId, row.scheduledStart);
} catch {
  // waitlist notification failure must not affect reservation cancellation
}
```

(`notifyWaitlistForSlot` itself already catches per-entry failures internally per Task 4 — this outer guard protects against a failure in `notifyWaitlistForSlot`'s own top-level `findMany` call, e.g. a transient DB error, from propagating out of `cancelReservation`.)

- [ ] **Step 3: Write the test**

No test file currently covers `cancelReservation` directly (`core/reservations/services/` only has `reservation-conflict.test.ts` and `self-cancel-cutoff.test.ts`, different concerns — confirmed by search at plan-writing time; re-confirm with your own search before creating a new file, in case this has changed). Create `core/reservations/services/cancelReservation.test.ts`:

```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    reservation: { update: vi.fn() },
    userProfile: { findUnique: vi.fn() },
  },
}));

vi.mock("@react-email/render", () => ({
  render: vi.fn().mockResolvedValue("<html>mock</html>"),
}));

vi.mock("@/lib/notifications/dispatcher", () => ({
  dispatch: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/core/audit/services/audit.service", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@/core/waitlist/services/waitlist.service", () => ({
  notifyWaitlistForSlot: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "@/infrastructure/db/client";
import { notifyWaitlistForSlot } from "@/core/waitlist/services/waitlist.service";
import { cancelReservation } from "./reservations.service";

const updateMock = prisma.reservation.update as ReturnType<typeof vi.fn>;
const findUniqueMock = prisma.userProfile.findUnique as ReturnType<
  typeof vi.fn
>;
const notifyWaitlistMock = notifyWaitlistForSlot as ReturnType<typeof vi.fn>;

function makeReservationRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "res_1",
    clubId: "club_1",
    userId: "user_1",
    userName: "Alex",
    courtId: "court_1",
    courtName: "Court 1",
    status: "CANCELLED",
    scheduledStart: new Date("2026-09-01T18:00:00"),
    scheduledEnd: new Date("2026-09-01T19:00:00"),
    cancelledAt: new Date(),
    cancelledBy: "user_1",
    ...overrides,
  };
}

describe("cancelReservation", () => {
  beforeEach(() => {
    updateMock.mockReset();
    findUniqueMock.mockReset();
    notifyWaitlistMock.mockReset();
    updateMock.mockResolvedValue(makeReservationRow());
    findUniqueMock.mockResolvedValue({
      email: "alex@example.com",
      displayName: "Alex",
    });
  });

  it("notifies the waitlist for the cancelled reservation's exact court and start time", async () => {
    await cancelReservation("res_1", "user_1");

    expect(notifyWaitlistMock).toHaveBeenCalledWith(
      "court_1",
      new Date("2026-09-01T18:00:00"),
    );
  });

  it("does not let a waitlist notification failure propagate out of cancelReservation", async () => {
    notifyWaitlistMock.mockRejectedValue(new Error("boom"));

    await expect(cancelReservation("res_1", "user_1")).resolves.toBeDefined();
  });
});
```

- [ ] **Step 4: Run tests and verify**

Run: `npx vitest run` (the relevant test file(s) for `cancelReservation`), then `npx tsc --noEmit && npm run lint`.
Expected: all pass, clean.

---

### Task 6: Join-waitlist API route

**Files:**

- Create: `app/api/player/waitlist/route.ts`

**Interfaces:**

- Consumes: `joinWaitlist` (Task 4).

- [ ] **Step 1: Write the route**

Read `app/api/player/clubs/[clubId]/availability/route.ts` and `app/api/onboarding/route.ts` first for this codebase's exact auth/validation/error-response conventions.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/infrastructure/db/client";
import { joinWaitlist } from "@/core/waitlist/services/waitlist.service";

// Never trust client-supplied courtName/clubId — look the court up
// server-side, same principle as every other write endpoint in this
// codebase.
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const courtId = body?.courtId;
  const scheduledStartRaw = body?.scheduledStart;
  const scheduledEndRaw = body?.scheduledEnd;

  if (
    typeof courtId !== "string" ||
    typeof scheduledStartRaw !== "string" ||
    typeof scheduledEndRaw !== "string"
  ) {
    return NextResponse.json(
      { error: "Missing or invalid courtId/scheduledStart/scheduledEnd" },
      { status: 400 },
    );
  }

  const scheduledStart = new Date(scheduledStartRaw);
  const scheduledEnd = new Date(scheduledEndRaw);
  if (
    Number.isNaN(scheduledStart.getTime()) ||
    Number.isNaN(scheduledEnd.getTime())
  ) {
    return NextResponse.json(
      { error: "scheduledStart/scheduledEnd must be valid ISO dates" },
      { status: 400 },
    );
  }

  const court = await prisma.court.findUnique({
    where: { id: courtId },
    select: { id: true, name: true, clubId: true },
  });
  if (!court) {
    return NextResponse.json({ error: "Court not found" }, { status: 404 });
  }

  try {
    const entry = await joinWaitlist({
      courtId: court.id,
      courtName: court.name,
      clubId: court.clubId,
      scheduledStart,
      scheduledEnd,
      userId,
    });
    return NextResponse.json({ entry });
  } catch {
    return NextResponse.json(
      { error: "Could not join the waitlist for this slot" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

---

### Task 7: Extend the player club-availability route with `waitlisted`

**Files:**

- Modify: `app/api/player/clubs/[clubId]/availability/route.ts`

**Interfaces:**

- Consumes: `hasActiveWaitlistEntry` (Task 4).
- Produces: each `locked` slot in this route's response gains a `waitlisted: boolean` field — consumed by Task 8 (client type + UI).

- [ ] **Step 1: Read the current file**

Read `app/api/player/clubs/[clubId]/availability/route.ts` in full (reproduced accurately in the spec doc — re-verify against the live file).

- [ ] **Step 2: Add the waitlist check**

Add the import: `import { hasActiveWaitlistEntry } from "@/core/waitlist/services/waitlist.service";`

Current:

```typescript
const courts = await listCourtsByClub(clubId);
const courtsWithSlots = await Promise.all(
  courts.map(async (court) => ({
    id: court.id,
    name: court.name,
    reservationFee: court.reservationFee,
    surface: court.surface,
    color: court.color,
    indoor: court.indoor,
    photoUrl: court.photoUrl,
    courtPrice: court.courtPrice,
    slotDurationMinutes: court.slotDurationMinutes,
    slots: await getCourtSlots(court.id, date),
  })),
);
```

Replace with:

```typescript
const courts = await listCourtsByClub(clubId);
const courtsWithSlots = await Promise.all(
  courts.map(async (court) => {
    const slots = await getCourtSlots(court.id, date);
    const slotsWithWaitlist = await Promise.all(
      slots.map(async (slot) => {
        if (slot.status !== "locked") return slot;
        const waitlisted = await hasActiveWaitlistEntry(
          court.id,
          slot.start,
          userId,
        );
        return { ...slot, waitlisted };
      }),
    );
    return {
      id: court.id,
      name: court.name,
      reservationFee: court.reservationFee,
      surface: court.surface,
      color: court.color,
      indoor: court.indoor,
      photoUrl: court.photoUrl,
      courtPrice: court.courtPrice,
      slotDurationMinutes: court.slotDurationMinutes,
      slots: slotsWithWaitlist,
    };
  }),
);
```

- [ ] **Step 3: Add `waitlisted` to the `Slot` type**

In `core/courts/types/index.ts`, find the `Slot` interface (currently `{ start: Date; end: Date; status: SlotStatus; reservationId?: string; closureReason?: string; }`). Add one field:

```typescript
export interface Slot {
  start: Date;
  end: Date;
  status: SlotStatus;
  reservationId?: string;
  closureReason?: string;
  /** Only meaningful when status is "locked" — true if the CURRENT player has an active (WAITING) waitlist entry for this exact slot. Undefined/false for a free or closed slot, or a locked slot the current player hasn't joined the waitlist for. */
  waitlisted?: boolean;
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

---

### Task 8: `SlotCell` / `CourtAvailabilityGrid` — the `onJoinWaitlist` prop

**Files:**

- Modify: `components/CourtAvailabilityGrid/types.ts`
- Modify: `components/CourtAvailabilityGrid/CourtAvailabilityGrid.tsx`
- Modify: `components/CourtAvailabilityGrid/components/SlotCell/types.ts`
- Modify: `components/CourtAvailabilityGrid/components/SlotCell/SlotCell.tsx`

**Interfaces:**

- Consumes: `Slot.waitlisted` (Task 7).
- Produces: `CourtAvailabilityGridProps.onJoinWaitlist?: (courtId: string, slot: Slot) => void` — consumed by Task 9 (`CourtSchedulePanel`/`BrowseCourts`).

- [ ] **Step 1: Add `waitlisted` to this module's own `Slot` type**

`components/CourtAvailabilityGrid/types.ts` defines its own `Slot` type — it is NOT a re-export of `core/courts/types`' `Slot` (Task 7 added `waitlisted` to that one; this is a separate, UI-layer type definition that `SlotCell`/`CourtAvailabilityGrid` actually consume, and needs the same field added independently). Read the current file, find:

```typescript
export type Slot = {
  start: Date;
  end: Date;
  status: SlotStatus;
  reservationId?: string;
  closureReason?: string;
};
```

Replace with:

```typescript
export type Slot = {
  start: Date;
  end: Date;
  status: SlotStatus;
  reservationId?: string;
  closureReason?: string;
  /** Only meaningful when status is "locked" — true if the current player has an active waitlist entry for this exact slot. */
  waitlisted?: boolean;
};
```

- [ ] **Step 2: Add `onJoinWaitlist` to `CourtAvailabilityGridProps`**

In the same file, read the current `CourtAvailabilityGridProps` (reproduced in the spec, re-verify against the live file — it already has `hideDayNavigator` from a recent change). Add one new optional field, documented similarly to the existing `onSlotClick`:

```typescript
  /** Renders a "Notify me" affordance on locked slots for the "player" variant only, instead of the plain non-interactive "Locked" label. Omit to render locked slots exactly as before (no waitlist UI at all) — this is how the owner-side variant, which never passes this prop, stays completely unaffected. */
  onJoinWaitlist?: (courtId: string, slot: Slot) => void;
```

- [ ] **Step 3: Thread it through `CourtAvailabilityGrid.tsx`**

Read the current file (reproduced in the spec, re-verify against the live file — it already has `hideDayNavigator` wired). Add `onJoinWaitlist` to the destructured props, and pass it to each `<SlotCell ... />` call:

Current (inside the `<TableCell>` loop):

```tsx
<TableCell key={court.id} className="py-1.5 pr-3">
  <SlotCell
    slot={row.slotsByCourtId.get(court.id)}
    courtId={court.id}
    courtName={court.name}
    variant={variant}
    onSlotClick={showsStaleData ? undefined : onSlotClick}
  />
</TableCell>
```

Replace with:

```tsx
<TableCell key={court.id} className="py-1.5 pr-3">
  <SlotCell
    slot={row.slotsByCourtId.get(court.id)}
    courtId={court.id}
    courtName={court.name}
    variant={variant}
    onSlotClick={showsStaleData ? undefined : onSlotClick}
    onJoinWaitlist={showsStaleData ? undefined : onJoinWaitlist}
  />
</TableCell>
```

(Same `showsStaleData` guard as `onSlotClick` — a click landing mid-refetch shouldn't be able to join a waitlist for what might be stale slot data, mirroring the existing reasoning for booking clicks.)

- [ ] **Step 4: Add `onJoinWaitlist` to `SlotCellProps`**

In `components/CourtAvailabilityGrid/components/SlotCell/types.ts`, current:

```typescript
import type { CourtAvailabilityGridVariant, Slot } from "../../types";

export type SlotCellProps = {
  slot: Slot | undefined;
  courtId: string;
  courtName: string;
  variant: CourtAvailabilityGridVariant;
  onSlotClick?: (courtId: string, slot: Slot) => void;
};
```

Replace with:

```typescript
import type { CourtAvailabilityGridVariant, Slot } from "../../types";

export type SlotCellProps = {
  slot: Slot | undefined;
  courtId: string;
  courtName: string;
  variant: CourtAvailabilityGridVariant;
  onSlotClick?: (courtId: string, slot: Slot) => void;
  onJoinWaitlist?: (courtId: string, slot: Slot) => void;
};
```

- [ ] **Step 5: Rewrite `SlotCell.tsx`**

Current (reproduced accurately here — re-verify against the live file first):

```tsx
"use client";

import { formatSlotTime, isSlotInteractive } from "../../utils";
import { emptySlotClassName, getSlotClassName } from "./styles";
import type { SlotCellProps } from "./types";

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
        aria-label={
          slot.status === "closed" && slot.closureReason
            ? `Closed: ${slot.closureReason}`
            : undefined
        }
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

Replace with:

```tsx
"use client";

import { formatSlotTime, isSlotInteractive } from "../../utils";
import { emptySlotClassName, getSlotClassName } from "./styles";
import type { SlotCellProps } from "./types";

export function SlotCell({
  slot,
  courtId,
  courtName,
  variant,
  onSlotClick,
  onJoinWaitlist,
}: SlotCellProps) {
  if (!slot) {
    return <div className={emptySlotClassName} aria-hidden="true" />;
  }

  const startTime = formatSlotTime(slot.start);
  const endTime = formatSlotTime(slot.end);

  // A locked slot with a wired-up onJoinWaitlist handler gets its own
  // dedicated rendering branch, deliberately separate from the
  // free/closed/interactive logic below: this is not "booking" (onSlotClick
  // stays exclusively that), it's a completely different action with its
  // own two states (offer to join / already joined). Any caller that
  // doesn't pass onJoinWaitlist (including every owner-side consumer) never
  // enters this branch, so its behavior is byte-identical to before this
  // feature existed.
  if (slot.status === "locked" && variant === "player" && onJoinWaitlist) {
    if (slot.waitlisted) {
      return (
        <div
          className={getSlotClassName(slot.status, false)}
          aria-label={`${courtName}, ${startTime}–${endTime}, you're on the waitlist`}
        >
          Waitlisted
        </div>
      );
    }
    return (
      <button
        type="button"
        className={getSlotClassName(slot.status, true)}
        aria-label={`Get notified if ${courtName}, ${startTime}–${endTime} frees up`}
        onClick={() => onJoinWaitlist(courtId, slot)}
      >
        Notify me
      </button>
    );
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
        aria-label={
          slot.status === "closed" && slot.closureReason
            ? `Closed: ${slot.closureReason}`
            : undefined
        }
      >
        {label}
      </div>
    );
  }

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

(`startTime`/`endTime` are now computed once, unconditionally, near the top — cheap pure string formatting, harmless to compute even on the branches that don't use them, and needed by both the new waitlist branch and the existing interactive-booking branch.)

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 7: Manual sanity check**

Confirm by reading (not running — this is a pure UI/props change with no behavior to execute yet, since nothing calls `onJoinWaitlist` until Task 9) that `app/dashboard/reservations/_components/ReservationsView/ReservationsView.tsx`'s existing `<CourtAvailabilityGrid variant="owner" ... />` call is completely untouched by this task's diff (it never passes `onJoinWaitlist`, so `SlotCell`'s new branch condition `variant === "player" && onJoinWaitlist` can never be true for it).

---

### Task 9: Wire it up end-to-end in Browse Courts

**Files:**

- Modify: `app/dashboard/browse/_components/BrowseCourts/types.ts`
- Modify: `app/dashboard/browse/_components/BrowseCourts/utils.ts`
- Modify: `app/dashboard/browse/_components/BrowseCourts/hooks.ts`
- Modify: `app/dashboard/browse/_components/BrowseCourts/components/CourtSchedulePanel/types.ts`
- Modify: `app/dashboard/browse/_components/BrowseCourts/components/CourtSchedulePanel/CourtSchedulePanel.tsx`
- Modify: `app/dashboard/browse/_components/BrowseCourts/BrowseCourts.tsx`

**Interfaces:**

- Consumes: `onJoinWaitlist` (Task 8), `POST /api/player/waitlist` (Task 6), `waitlisted` on the availability response (Task 7).

- [ ] **Step 1: Add `waitlisted` to `RawSlot`, and add `JoinWaitlistInput`**

In `app/dashboard/browse/_components/BrowseCourts/types.ts`, current `RawSlot`:

```typescript
export type RawSlot = {
  start: string;
  end: string;
  status: "free" | "locked" | "closed";
  reservationId?: string;
  closureReason?: string;
};
```

Replace with:

```typescript
export type RawSlot = {
  start: string;
  end: string;
  status: "free" | "locked" | "closed";
  reservationId?: string;
  closureReason?: string;
  waitlisted?: boolean;
};
```

Also add a `JoinWaitlistInput` type to the same file, matching `BookSlotInput`'s existing shape:

```typescript
export type JoinWaitlistInput = {
  courtId: string;
  scheduledStart: string;
  scheduledEnd: string;
};
```

- [ ] **Step 2: Thread `waitlisted` through `toCourtColumns`**

In `app/dashboard/browse/_components/BrowseCourts/utils.ts`, current (inside `toCourtColumns`):

```typescript
    slots: court.slots.map((slot) => ({
      start: new Date(slot.start),
      end: new Date(slot.end),
      status: slot.status,
      ...(slot.reservationId && { reservationId: slot.reservationId }),
      ...(slot.closureReason && { closureReason: slot.closureReason }),
    })),
```

Replace with:

```typescript
    slots: court.slots.map((slot) => ({
      start: new Date(slot.start),
      end: new Date(slot.end),
      status: slot.status,
      ...(slot.reservationId && { reservationId: slot.reservationId }),
      ...(slot.closureReason && { closureReason: slot.closureReason }),
      ...(slot.waitlisted && { waitlisted: slot.waitlisted }),
    })),
```

- [ ] **Step 3: Add `useJoinWaitlist` mutation hook**

In `app/dashboard/browse/_components/BrowseCourts/hooks.ts`, read the existing `useBookSlot` hook (reproduced accurately in the spec/earlier reads — re-verify against the live file) and add a new hook mirroring its exact pattern, right after it:

```typescript
export function useJoinWaitlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: JoinWaitlistInput) =>
      fetchJson("/api/player/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: playerClubAvailabilityBaseKey,
      });
    },
  });
}
```

Add `JoinWaitlistInput` to the existing `import type { BookSlotInput, ClubBrowseSummary, RawCourt } from "./types";` line at the top of the file.

- [ ] **Step 4: Add `onJoinWaitlist` to `CourtSchedulePanelProps`**

In `app/dashboard/browse/_components/BrowseCourts/components/CourtSchedulePanel/types.ts`, current:

```typescript
import type { CourtColumn, Slot } from "@/components/CourtAvailabilityGrid";

export type CourtSchedulePanelProps = {
  date: Date;
  onDateChange: (date: Date) => void;
  selectedCourt: CourtColumn | null;
  onSlotClick: (courtId: string, slot: Slot) => void;
  isLoading: boolean;
  isUpdating: boolean;
  isError: boolean;
  rowCount: number | undefined;
};
```

Replace with:

```typescript
import type { CourtColumn, Slot } from "@/components/CourtAvailabilityGrid";

export type CourtSchedulePanelProps = {
  date: Date;
  onDateChange: (date: Date) => void;
  selectedCourt: CourtColumn | null;
  onSlotClick: (courtId: string, slot: Slot) => void;
  onJoinWaitlist: (courtId: string, slot: Slot) => void;
  isLoading: boolean;
  isUpdating: boolean;
  isError: boolean;
  rowCount: number | undefined;
};
```

- [ ] **Step 5: Pass it through `CourtSchedulePanel.tsx`**

Read the current file (reproduced accurately earlier in this session — re-verify against the live file, it already has `hideDayNavigator` wired from a recent change). Add `onJoinWaitlist` to the destructured props and pass it to `<CourtAvailabilityGrid ... />`:

Current:

```tsx
export function CourtSchedulePanel({
  date,
  onDateChange,
  selectedCourt,
  onSlotClick,
  isLoading,
  isUpdating,
  isError,
  rowCount,
}: CourtSchedulePanelProps) {
```

Replace with:

```tsx
export function CourtSchedulePanel({
  date,
  onDateChange,
  selectedCourt,
  onSlotClick,
  onJoinWaitlist,
  isLoading,
  isUpdating,
  isError,
  rowCount,
}: CourtSchedulePanelProps) {
```

And in the `<CourtAvailabilityGrid ... />` JSX further down, add `onJoinWaitlist={onJoinWaitlist}` alongside the existing `onSlotClick={onSlotClick}` and `hideDayNavigator` props.

- [ ] **Step 6: Wire the real handler in `BrowseCourts.tsx`**

Read the current file in full (already touched by two earlier changes this session — the top-level `DayNavigator` and the currency-race guard — re-verify against the live file, don't assume only the spec's excerpt exists).

Add `useJoinWaitlist` to the existing `import { useActiveClubs, useClubAvailability, useBookSlot } from "./hooks";` line (becomes `useActiveClubs, useClubAvailability, useBookSlot, useJoinWaitlist`).

Add a mutation instance near the existing `const bookSlot = useBookSlot();` line:

```typescript
const joinWaitlist = useJoinWaitlist();
```

Add a handler function near the existing `handleSlotClick`:

```typescript
function handleJoinWaitlist(courtId: string, slot: Slot) {
  joinWaitlist.mutate({
    courtId,
    scheduledStart: slot.start.toISOString(),
    scheduledEnd: slot.end.toISOString(),
  });
}
```

Find the `<CourtSchedulePanel ... />` JSX call (inside the `schedulePanel` variable definition) and add `onJoinWaitlist={handleJoinWaitlist}` alongside its existing `onSlotClick={handleSlotClick}` prop.

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: clean, full suite passes.

- [ ] **Step 8: Manual verification**

Run `npm run dev`. As a player, navigate to Browse Courts, find a locked slot, confirm it now shows a "Notify me" button instead of a plain "Locked" label, click it, confirm it flips to "Waitlisted" (disabled) without a full page reload. As an owner, open Reservations and confirm its `CourtAvailabilityGrid` usage is completely unaffected (locked slots still show as before — this component has no waitlist UI at all for the owner variant).

- [ ] **Step 9: Final note for the user (not a code step)**

Once all 9 tasks are complete and reviewed, the user needs to run `npx prisma db push` themselves to sync the new `WaitlistEntry` table and `WaitlistEntryStatus` enum to the actual database — this plan's tasks only ever edit `schema.prisma` as text and run the DB-safe `npx prisma generate` (Task 1), never `db push`/`migrate`, per this project's standing no-DB-mutation rule for Claude.
