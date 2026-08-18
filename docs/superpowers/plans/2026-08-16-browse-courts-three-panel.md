# Browse Courts Three-Panel Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Browse Courts' club-picker-cards + single shared availability grid with three always-visible panels (clubs 20% → that club's courts 60% → selected court's schedule 20%), reusing the `DataTable` component from the Players Directory plan and the existing `CourtAvailabilityGrid` for the schedule panel.

**Architecture:** Two small backend extensions (court metadata pass-through; a new per-club availability-today aggregation) feed three new panel components composed inside `BrowseCourts.tsx`. Booking mechanics (`BookingConfirmDialog`, confetti, analytics, Mercado Pago) are untouched — this only changes how a player navigates to a bookable slot.

**Tech Stack:** Next.js 16 App Router, TypeScript, `@tanstack/react-query`, `nuqs` for URL state, Vitest for pure-function tests, the `DataTable` component from `docs/superpowers/plans/2026-08-16-datatable-players-directory.md` (already implemented and verified).

**Spec:** `docs/superpowers/specs/2026-08-16-browse-courts-three-panel-design.md`

## Global Constraints

- No changes to booking mechanics: `BookingConfirmDialog`, confetti, analytics events, the Mercado Pago Checkout Pro flow, `PaymentReturnView`, cancellation, PDF receipts.
- Static panel widths (20% / 60% / 20%), no animated resizing — only a content fade-in when a panel first populates.
- No price-range filter (price is sortable only).
- Mobile: drill-down (one panel full-screen at a time, forward navigation with a back control).
- No git commands in any task — do not `git add`/`commit`/`rm` anything. Every task ends with a plain verification step (typecheck/lint/manual check), never a commit. This is a hard project rule with zero exceptions.
- Follow the existing SRP file convention and `index.ts` alphabetical-export ordering (enforced by `eslint-rules/sort-index-exports.mjs`).
- English-only code, comments, and UI copy.

---

### Task 1: Court metadata pass-through (surface, color, indoor)

**Files:**

- Modify: `components/CourtAvailabilityGrid/types.ts`
- Modify: `app/dashboard/browse/_components/BrowseCourts/types.ts`
- Modify: `app/dashboard/browse/_components/BrowseCourts/utils.ts`
- Modify: `app/api/player/clubs/[clubId]/availability/route.ts`

**Interfaces:**

- Produces: `CourtColumn` gains optional `surface?: string`, `color?: string`, `indoor?: boolean` — Task 4 (`ClubCourtsPanel`) reads these three fields. These are additive/optional, so the existing owner-side `ReservationsView` (which also constructs `CourtColumn` values, in its own `utils.ts`) keeps compiling unchanged — it simply won't populate them.

- [ ] **Step 1: Add the three fields to `CourtColumn` in `components/CourtAvailabilityGrid/types.ts`**

Current:

```typescript
export type CourtColumn = {
  id: string;
  name: string;
  /** Per-reservation price, when the court has one configured (undefined means "not set"; 0 means genuinely free — the two are not the same). */
  price?: number;
  slots: Slot[];
};
```

Replace with:

```typescript
export type CourtColumn = {
  id: string;
  name: string;
  /** Per-reservation price, when the court has one configured (undefined means "not set"; 0 means genuinely free — the two are not the same). */
  price?: number;
  /** Free-text surface/field type (e.g. "clay", "cristal"). Only read by Browse Courts' court-metadata panel — CourtAvailabilityGrid itself never displays this. */
  surface?: string;
  /** Court accent color (hex-ish string, same convention as the owner-side CourtsTable swatch). Only read by Browse Courts' court-metadata panel. */
  color?: string;
  /** Whether the court is indoor. Only read by Browse Courts' court-metadata panel. */
  indoor?: boolean;
  slots: Slot[];
};
```

- [ ] **Step 2: Add the same three fields to `RawCourt` in `app/dashboard/browse/_components/BrowseCourts/types.ts`**

Current:

```typescript
export type RawCourt = {
  id: string;
  name: string;
  price?: number;
  slots: RawSlot[];
};
```

Replace with:

```typescript
export type RawCourt = {
  id: string;
  name: string;
  price?: number;
  surface?: string;
  color?: string;
  indoor?: boolean;
  slots: RawSlot[];
};
```

- [ ] **Step 3: Pass the fields through in `toCourtColumns` in `app/dashboard/browse/_components/BrowseCourts/utils.ts`**

Current:

```typescript
export function toCourtColumns(raw: RawCourt[]): CourtColumn[] {
  return raw.map((court) => ({
    id: court.id,
    name: court.name,
    price: court.price,
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

Replace with:

```typescript
export function toCourtColumns(raw: RawCourt[]): CourtColumn[] {
  return raw.map((court) => ({
    id: court.id,
    name: court.name,
    price: court.price,
    surface: court.surface,
    color: court.color,
    indoor: court.indoor,
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

- [ ] **Step 4: Include the fields in the API route's per-court map, in `app/api/player/clubs/[clubId]/availability/route.ts`**

Current:

```typescript
const courts = await listCourtsByClub(clubId);
const courtsWithSlots = await Promise.all(
  courts.map(async (court) => ({
    id: court.id,
    name: court.name,
    price: court.price,
    slots: await getCourtSlots(court.id, date),
  })),
);
```

Replace with:

```typescript
const courts = await listCourtsByClub(clubId);
const courtsWithSlots = await Promise.all(
  courts.map(async (court) => ({
    id: court.id,
    name: court.name,
    price: court.price,
    surface: court.surface,
    color: court.color,
    indoor: court.indoor,
    slots: await getCourtSlots(court.id, date),
  })),
);
```

- [ ] **Step 5: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean, or only the pre-existing unrelated `eslint-rules/sort-index-exports.mjs` warning. Specifically confirm `app/dashboard/reservations/_components/ReservationsView/utils.ts` (the owner-side `CourtColumn` producer) still compiles — it should, since the three new fields are optional.

---

### Task 2: Club availability-today aggregation (TDD)

**Files:**

- Modify: `core/courts/services/courts.service.ts`
- Test: `core/courts/services/hasAnyFreeSlot.test.ts`
- Modify: `app/api/player/clubs/route.ts`
- Modify: `app/dashboard/browse/_components/BrowseCourts/types.ts`
- Modify: `app/dashboard/browse/_components/BrowseCourts/hooks.ts`
- Modify: `docs/API.md`

**Interfaces:**

- Produces: `hasAnyFreeSlot(courtSlots: Slot[][]): boolean` (pure, exported from `core/courts/services/courts.service.ts`); `ClubBrowseSummary = Club & { courtCount: number; hasAvailabilityToday: boolean }` (exported from `app/dashboard/browse/_components/BrowseCourts/types.ts`); `useActiveClubs(date: Date)` now takes a `date` argument and returns `ClubBrowseSummary[]`. Task 3 (`ClubListPanel`) consumes `ClubBrowseSummary` and the updated `useActiveClubs` signature.
- Consumes: `listActiveClubs` (`core/clubs/services/clubs.service.ts`, no-arg, returns `Club[]`), `listCourtsByClub(clubId: string): Promise<Court[]>` and `getCourtSlots(courtId: string, date: Date): Promise<Slot[]>` (`core/courts/services/courts.service.ts`), `Slot`/`SlotStatus` (`core/courts/types`).

- [ ] **Step 1: Write the failing test `core/courts/services/hasAnyFreeSlot.test.ts`**

```typescript
import { describe, expect, it, vi } from "vitest";

// courts.service.ts eagerly constructs a real Prisma/Neon client at import
// time (same reason the self-cancel-cutoff test needs this) — mock it so
// importing the module for this one pure function doesn't require a real
// DATABASE_URL.
vi.mock("@/infrastructure/db/client", () => ({
  prisma: {},
}));

import { hasAnyFreeSlot } from "./courts.service";
import type { Slot } from "@/core/courts/types";

function makeSlot(status: Slot["status"]): Slot {
  return { start: new Date(), end: new Date(), status };
}

describe("hasAnyFreeSlot", () => {
  it("returns false for an empty list of courts", () => {
    expect(hasAnyFreeSlot([])).toBe(false);
  });

  it("returns false when a court has slots but none are free", () => {
    const courts: Slot[][] = [[makeSlot("locked"), makeSlot("closed")]];
    expect(hasAnyFreeSlot(courts)).toBe(false);
  });

  it("returns false across multiple courts when none has a free slot", () => {
    const courts: Slot[][] = [
      [makeSlot("locked")],
      [makeSlot("closed"), makeSlot("locked")],
    ];
    expect(hasAnyFreeSlot(courts)).toBe(false);
  });

  it("returns true when at least one slot on any court is free", () => {
    const courts: Slot[][] = [
      [makeSlot("locked")],
      [makeSlot("locked"), makeSlot("free")],
    ];
    expect(hasAnyFreeSlot(courts)).toBe(true);
  });

  it("returns false when a court has zero slots at all", () => {
    const courts: Slot[][] = [[], []];
    expect(hasAnyFreeSlot(courts)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run core/courts/services/hasAnyFreeSlot.test.ts`
Expected: FAIL — `hasAnyFreeSlot` is not exported from `courts.service.ts` yet.

- [ ] **Step 3: Add `hasAnyFreeSlot` to `core/courts/services/courts.service.ts`**

Add this exported function anywhere alongside the other exports (e.g. right after `getCourtSlots`):

```typescript
/** True if any slot on any given court is free. Pure — takes each court's already-computed slots, does no DB access itself. */
export function hasAnyFreeSlot(courtSlots: Slot[][]): boolean {
  return courtSlots.some((slots) =>
    slots.some((slot) => slot.status === "free"),
  );
}
```

(If `Slot` isn't already imported into this file, add `import type { Slot } from "@/core/courts/types";` — check the file's existing imports first, since `getCourtSlots`'s own return type already needs `Slot`, so it's very likely already imported.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run core/courts/services/hasAnyFreeSlot.test.ts`
Expected: PASS, all 5 cases green.

- [ ] **Step 5: Add `ClubBrowseSummary` to `app/dashboard/browse/_components/BrowseCourts/types.ts`**

Add near the top of the file (it already imports nothing from `@/core/clubs/types`, so add that import):

```typescript
import type { Club } from "@/core/clubs/types";

export type ClubBrowseSummary = Club & {
  courtCount: number;
  hasAvailabilityToday: boolean;
};
```

- [ ] **Step 6: Rewrite `app/api/player/clubs/route.ts`**

Current:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { listActiveClubs } from "@/core/clubs/services/clubs.service";

// Player-facing club list: any signed-in user can browse clubs to book a
// court at (see docs/reservation-flow.md). No role check beyond auth.
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clubs = await listActiveClubs();
  return NextResponse.json({ clubs });
}
```

Replace with:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { listActiveClubs } from "@/core/clubs/services/clubs.service";
import {
  listCourtsByClub,
  getCourtSlots,
  hasAnyFreeSlot,
} from "@/core/courts/services/courts.service";
import type { ClubBrowseSummary } from "@/app/dashboard/browse/_components/BrowseCourts/types";

// Player-facing club list: any signed-in user can browse clubs to book a
// court at (see docs/reservation-flow.md). No role check beyond auth.
// Requires ?date= so each club can report whether it has any bookable slot
// that day — the Browse Courts club panel grays out clubs with none.
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dateParam = request.nextUrl.searchParams.get("date");
  const date = dateParam ? parseLocalDate(dateParam) : null;
  if (!date) {
    return NextResponse.json(
      { error: "Missing or invalid date (expected YYYY-MM-DD)" },
      { status: 400 },
    );
  }

  const activeClubs = await listActiveClubs();
  const clubs: ClubBrowseSummary[] = await Promise.all(
    activeClubs.map(async (club) => {
      const courts = await listCourtsByClub(club.id);
      const slotsByCourt = await Promise.all(
        courts.map((court) => getCourtSlots(court.id, date)),
      );
      return {
        ...club,
        courtCount: courts.length,
        hasAvailabilityToday: hasAnyFreeSlot(slotsByCourt),
      };
    }),
  );

  return NextResponse.json({ clubs });
}

// "YYYY-MM-DD" -> local-midnight Date. Same convention (and same reasoning
// — getCourtSlots derives dayOfWeek from the server's local calendar day)
// as app/api/player/clubs/[clubId]/availability/route.ts's own helper of
// the same name; duplicated rather than shared since that route's version
// isn't exported and this project doesn't currently have a shared
// date-parsing util module worth introducing for one six-line function.
function parseLocalDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return Number.isNaN(date.getTime()) ? null : date;
}
```

- [ ] **Step 7: Update `useActiveClubs` in `app/dashboard/browse/_components/BrowseCourts/hooks.ts`**

Current:

```typescript
export function useActiveClubs() {
  return useQuery({
    queryKey: playerClubsQueryKey,
    queryFn: () =>
      fetchJson<{ clubs: Club[] }>("/api/player/clubs").then((d) => d.clubs),
  });
}
```

Replace with:

```typescript
export function useActiveClubs(date: Date) {
  const dateKey = toDateKey(date);
  return useQuery({
    queryKey: [...playerClubsQueryKey, dateKey],
    queryFn: () =>
      fetchJson<{ clubs: ClubBrowseSummary[] }>(
        `/api/player/clubs?date=${dateKey}`,
      ).then((d) => d.clubs),
  });
}
```

Update this file's imports: remove `import type { Club } from "@/core/clubs/types";` if nothing else in the file uses `Club` (check first), and add `import type { ClubBrowseSummary } from "./types";` (the file already imports `toDateKey` from `./utils`, so no new import needed for that).

- [ ] **Step 8: Update `docs/API.md`'s row for this route**

Current line 24:

```
| GET    | `/api/player/clubs`                       | Lists active clubs (for the club picker).                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
```

Replace with:

```
| GET    | `/api/player/clubs?date=YYYY-MM-DD`       | Lists active clubs with `courtCount` and `hasAvailabilityToday` for the given date (Browse Courts' club panel).                                                                                                                                                                                                                                                                                                                                                                            |
```

(Match whatever the actual current column widths/padding in that table are — this is a markdown table, exact whitespace doesn't need to align perfectly, just keep it a valid table row.)

- [ ] **Step 9: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean, or only the pre-existing unrelated warning. This step will surface the `BrowseCourts.tsx` call site (`useActiveClubs()` called with no argument) as a type error — that's expected and gets fixed in Task 6, not here. Confirm the error is exactly that one call site and nothing else.

---

### Task 3: `ClubListPanel` (left, 20%)

**Files:**

- Create: `app/dashboard/browse/_components/BrowseCourts/components/ClubListPanel/types.ts`
- Create: `app/dashboard/browse/_components/BrowseCourts/components/ClubListPanel/utils.ts`
- Test: `app/dashboard/browse/_components/BrowseCourts/components/ClubListPanel/utils.test.ts`
- Create: `app/dashboard/browse/_components/BrowseCourts/components/ClubListPanel/ClubListPanel.tsx`
- Create: `app/dashboard/browse/_components/BrowseCourts/components/ClubListPanel/index.ts`

**Interfaces:**

- Consumes: `ClubBrowseSummary` (`../../types`, Task 2); `DataTable`/`DataTableColumn` (`@/components/DataTable`); `StatusBox` (`@/components/StatusBox`); `getInitials` (`@/app/dashboard/_components/DashboardHome/components/PlayerOverview/utils`); `cn` (`@/lib/utils/utils`).
- Produces: `ClubListPanel` component (props: `clubs: ClubBrowseSummary[]`, `selectedClubId: string | null`, `onSelectClub: (clubId: string) => void`, `isLoading: boolean`) — Task 6 renders it.

- [ ] **Step 1: Write `types.ts`**

```typescript
import type { ClubBrowseSummary } from "../../types";

export type ClubListPanelProps = {
  clubs: ClubBrowseSummary[];
  selectedClubId: string | null;
  onSelectClub: (clubId: string) => void;
  isLoading: boolean;
};
```

- [ ] **Step 2: Write the failing test `utils.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { filterClubs, sortClubs } from "./utils";
import type { ClubBrowseSummary } from "../../types";
import type { ClubSort } from "./utils";

function makeClub(overrides: Partial<ClubBrowseSummary>): ClubBrowseSummary {
  return {
    id: "1",
    name: "Test Club",
    email: "club@example.com",
    timezone: "America/Argentina/Buenos_Aires",
    currency: "ARS",
    plan: "BASIC",
    status: "ACTIVE",
    requiresPrepayment: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: "owner-1",
    updatedBy: "owner-1",
    courtCount: 0,
    hasAvailabilityToday: true,
    ...overrides,
  };
}

describe("filterClubs", () => {
  it("returns all clubs when the query is empty", () => {
    const clubs = [makeClub({ id: "1" }), makeClub({ id: "2" })];
    expect(filterClubs(clubs, "")).toHaveLength(2);
  });

  it("filters by name, case-insensitively", () => {
    const clubs = [
      makeClub({ id: "1", name: "Padel Norte" }),
      makeClub({ id: "2", name: "Sur Padel Club" }),
    ];
    const result = filterClubs(clubs, "norte");
    expect(result.map((c) => c.id)).toEqual(["1"]);
  });
});

describe("sortClubs", () => {
  it("sorts by name ascending and descending", () => {
    const clubs = [
      makeClub({ id: "1", name: "Zeta" }),
      makeClub({ id: "2", name: "Alfa" }),
    ];
    const asc: ClubSort = { field: "name", direction: "asc" };
    expect(sortClubs(clubs, asc).map((c) => c.id)).toEqual(["2", "1"]);
    const desc: ClubSort = { field: "name", direction: "desc" };
    expect(sortClubs(clubs, desc).map((c) => c.id)).toEqual(["1", "2"]);
  });

  it("sorts by courtCount ascending and descending", () => {
    const clubs = [
      makeClub({ id: "1", courtCount: 5 }),
      makeClub({ id: "2", courtCount: 2 }),
    ];
    const asc: ClubSort = { field: "courtCount", direction: "asc" };
    expect(sortClubs(clubs, asc).map((c) => c.id)).toEqual(["2", "1"]);
    const desc: ClubSort = { field: "courtCount", direction: "desc" };
    expect(sortClubs(clubs, desc).map((c) => c.id)).toEqual(["1", "2"]);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run app/dashboard/browse/_components/BrowseCourts/components/ClubListPanel/utils.test.ts`
Expected: FAIL — `./utils` doesn't exist yet.

- [ ] **Step 4: Write `utils.ts`**

```typescript
import type { ClubBrowseSummary } from "../../types";

export type ClubSortField = "name" | "courtCount";
export type ClubSort = { field: ClubSortField; direction: "asc" | "desc" };

export function filterClubs(
  clubs: ClubBrowseSummary[],
  query: string,
): ClubBrowseSummary[] {
  const normalizedQuery = query.trim().toLowerCase();
  return clubs.filter((club) =>
    club.name.toLowerCase().includes(normalizedQuery),
  );
}

export function sortClubs(
  clubs: ClubBrowseSummary[],
  sort: ClubSort,
): ClubBrowseSummary[] {
  return [...clubs].sort((a, b) => {
    const result =
      sort.field === "name"
        ? a.name.localeCompare(b.name)
        : a.courtCount - b.courtCount;
    return sort.direction === "asc" ? result : -result;
  });
}
```

(Neither field can be null/undefined here — `name` and `courtCount` are always set on `ClubBrowseSummary` — so no nulls-last handling is needed, unlike the Players Directory sort.)

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run app/dashboard/browse/_components/BrowseCourts/components/ClubListPanel/utils.test.ts`
Expected: PASS, all 4 cases green.

- [ ] **Step 6: Write `ClubListPanel.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/DataTable";
import { StatusBox } from "@/components/StatusBox";
import { getInitials } from "@/app/dashboard/_components/DashboardHome/components/PlayerOverview/utils";
import { cn } from "@/lib/utils/utils";
import { filterClubs, sortClubs } from "./utils";
import type { DataTableColumn } from "@/components/DataTable";
import type { ClubBrowseSummary } from "../../types";
import type { ClubListPanelProps } from "./types";
import type { ClubSort } from "./utils";

const DEFAULT_SORT: ClubSort = { field: "name", direction: "asc" };

export function ClubListPanel({
  clubs,
  selectedClubId,
  onSelectClub,
  isLoading,
}: ClubListPanelProps) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ClubSort>(DEFAULT_SORT);

  const visibleClubs = useMemo(() => {
    const filtered = filterClubs(clubs, query);
    return sortClubs(filtered, sort);
  }, [clubs, query, sort]);

  const columns: DataTableColumn<ClubBrowseSummary>[] = useMemo(
    () => [
      {
        key: "club",
        header: "Club",
        cell: (club) => (
          <button
            type="button"
            onClick={() => onSelectClub(club.id)}
            aria-pressed={club.id === selectedClubId}
            className={cn(
              "flex w-full items-center gap-2 rounded-sm p-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              club.id === selectedClubId && "bg-muted",
              !club.hasAvailabilityToday && "opacity-50",
            )}
          >
            <Avatar>
              {club.logoUrl && <AvatarImage src={club.logoUrl} alt="" />}
              <AvatarFallback>{getInitials(club.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{club.name}</p>
              <Badge variant="outline" className="mt-0.5">
                {club.courtCount} {club.courtCount === 1 ? "court" : "courts"}
              </Badge>
            </div>
          </button>
        ),
      },
    ],
    [selectedClubId, onSelectClub],
  );

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search clubs..."
          className="pl-8"
        />
      </div>

      <div className="flex items-center gap-1.5">
        <Select
          value={sort.field}
          onValueChange={(value) =>
            setSort({ ...sort, field: value as ClubSort["field"] })
          }
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="courtCount">Court count</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={
            sort.direction === "asc"
              ? "Sort ascending, click to sort descending"
              : "Sort descending, click to sort ascending"
          }
          onClick={() =>
            setSort({
              ...sort,
              direction: sort.direction === "asc" ? "desc" : "asc",
            })
          }
        >
          {sort.direction === "asc" ? <ArrowUp /> : <ArrowDown />}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <DataTable
          columns={columns}
          rows={visibleClubs}
          rowKey={(club) => club.id}
          isLoading={isLoading}
          loadingLabel="Loading clubs…"
          emptyState={<StatusBox>No clubs match your search.</StatusBox>}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Write `index.ts`**

```typescript
export { ClubListPanel } from "./ClubListPanel";
export type { ClubListPanelProps } from "./types";
```

- [ ] **Step 8: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean, or only the pre-existing unrelated warning. This component has no consumer yet (Task 6 wires it in), so it should be inert.

---

### Task 4: `ClubCourtsPanel` (middle, 60%)

**Files:**

- Create: `app/dashboard/browse/_components/BrowseCourts/components/ClubCourtsPanel/types.ts`
- Create: `app/dashboard/browse/_components/BrowseCourts/components/ClubCourtsPanel/utils.ts`
- Test: `app/dashboard/browse/_components/BrowseCourts/components/ClubCourtsPanel/utils.test.ts`
- Create: `app/dashboard/browse/_components/BrowseCourts/components/ClubCourtsPanel/ClubCourtsPanel.tsx`
- Create: `app/dashboard/browse/_components/BrowseCourts/components/ClubCourtsPanel/index.ts`

**Interfaces:**

- Consumes: `CourtColumn` (`@/components/CourtAvailabilityGrid`, extended in Task 1 with `surface`/`color`/`indoor`); `DataTable`/`DataTableColumn` (`@/components/DataTable`); `StatusBox`; `surfaceLabel`/`indoorLabel` (`@/app/dashboard/courts/_components/CourtsView/utils` — already exist, reused here the same way `ClubCard` already reaches into a sibling feature's utils for `getInitials`).
- Produces: `ClubCourtsPanel` component (props: `courts: CourtColumn[]`, `selectedClubId: string | null`, `selectedCourtId: string | null`, `onSelectCourt: (courtId: string) => void`, `isLoading: boolean`) — Task 6 renders it.

- [ ] **Step 1: Write `types.ts`**

```typescript
import type { CourtColumn } from "@/components/CourtAvailabilityGrid";

export type ClubCourtsPanelProps = {
  courts: CourtColumn[];
  selectedClubId: string | null;
  selectedCourtId: string | null;
  onSelectCourt: (courtId: string) => void;
  isLoading: boolean;
};
```

- [ ] **Step 2: Write the failing test `utils.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { filterCourts, sortCourts } from "./utils";
import type { CourtColumn } from "@/components/CourtAvailabilityGrid";
import type { CourtFilters, CourtSort } from "./utils";

const NO_FILTERS: CourtFilters = {
  surface: "all",
  indoor: "all",
  color: "all",
};

function makeCourt(overrides: Partial<CourtColumn>): CourtColumn {
  return {
    id: "1",
    name: "Court 1",
    slots: [],
    ...overrides,
  };
}

describe("filterCourts", () => {
  it("returns all courts when no filters are applied", () => {
    const courts = [makeCourt({ id: "1" }), makeCourt({ id: "2" })];
    expect(filterCourts(courts, NO_FILTERS)).toHaveLength(2);
  });

  it("filters by exact surface value", () => {
    const courts = [
      makeCourt({ id: "1", surface: "clay" }),
      makeCourt({ id: "2", surface: "cristal" }),
    ];
    const result = filterCourts(courts, { ...NO_FILTERS, surface: "clay" });
    expect(result.map((c) => c.id)).toEqual(["1"]);
  });

  it("filters by indoor", () => {
    const courts = [
      makeCourt({ id: "1", indoor: true }),
      makeCourt({ id: "2", indoor: false }),
    ];
    const result = filterCourts(courts, { ...NO_FILTERS, indoor: "indoor" });
    expect(result.map((c) => c.id)).toEqual(["1"]);
  });

  it("filters by outdoor, treating an unset indoor as outdoor", () => {
    const courts = [
      makeCourt({ id: "1", indoor: true }),
      makeCourt({ id: "2" }),
    ];
    const result = filterCourts(courts, { ...NO_FILTERS, indoor: "outdoor" });
    expect(result.map((c) => c.id)).toEqual(["2"]);
  });

  it("filters by color", () => {
    const courts = [
      makeCourt({ id: "1", color: "#0000ff" }),
      makeCourt({ id: "2", color: "#ff0000" }),
    ];
    const result = filterCourts(courts, { ...NO_FILTERS, color: "#ff0000" });
    expect(result.map((c) => c.id)).toEqual(["2"]);
  });

  it("combines surface and indoor filters (AND logic)", () => {
    const courts = [
      makeCourt({ id: "1", surface: "clay", indoor: true }),
      makeCourt({ id: "2", surface: "clay", indoor: false }),
    ];
    const result = filterCourts(courts, {
      ...NO_FILTERS,
      surface: "clay",
      indoor: "indoor",
    });
    expect(result.map((c) => c.id)).toEqual(["1"]);
  });
});

describe("sortCourts", () => {
  it("sorts by name ascending and descending", () => {
    const courts = [
      makeCourt({ id: "1", name: "Zeta" }),
      makeCourt({ id: "2", name: "Alfa" }),
    ];
    const asc: CourtSort = { field: "name", direction: "asc" };
    expect(sortCourts(courts, asc).map((c) => c.id)).toEqual(["2", "1"]);
    const desc: CourtSort = { field: "name", direction: "desc" };
    expect(sortCourts(courts, desc).map((c) => c.id)).toEqual(["1", "2"]);
  });

  it("sorts by surface, with unset surface always last regardless of direction", () => {
    const courts = [
      makeCourt({ id: "1", surface: "cristal" }),
      makeCourt({ id: "2" }),
      makeCourt({ id: "3", surface: "clay" }),
    ];
    const asc: CourtSort = { field: "surface", direction: "asc" };
    expect(sortCourts(courts, asc).map((c) => c.id)).toEqual(["3", "1", "2"]);
    const desc: CourtSort = { field: "surface", direction: "desc" };
    expect(sortCourts(courts, desc).map((c) => c.id)).toEqual(["1", "3", "2"]);
  });

  it("sorts by price, with unset price always last regardless of direction", () => {
    const courts = [
      makeCourt({ id: "1", price: 5000 }),
      makeCourt({ id: "2" }),
      makeCourt({ id: "3", price: 2000 }),
    ];
    const asc: CourtSort = { field: "price", direction: "asc" };
    expect(sortCourts(courts, asc).map((c) => c.id)).toEqual(["3", "1", "2"]);
    const desc: CourtSort = { field: "price", direction: "desc" };
    expect(sortCourts(courts, desc).map((c) => c.id)).toEqual(["1", "3", "2"]);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run app/dashboard/browse/_components/BrowseCourts/components/ClubCourtsPanel/utils.test.ts`
Expected: FAIL — `./utils` doesn't exist yet.

- [ ] **Step 4: Write `utils.ts`**

```typescript
import type { CourtColumn } from "@/components/CourtAvailabilityGrid";

export type CourtFilters = {
  surface: string; // "all" | the exact surface value to match
  indoor: "all" | "indoor" | "outdoor";
  color: string; // "all" | the exact color value to match
};

export type CourtSortField = "name" | "surface" | "price";
export type CourtSort = { field: CourtSortField; direction: "asc" | "desc" };

export function filterCourts(
  courts: CourtColumn[],
  filters: CourtFilters,
): CourtColumn[] {
  return courts.filter((court) => {
    if (filters.surface !== "all" && court.surface !== filters.surface) {
      return false;
    }
    if (filters.indoor !== "all") {
      const isIndoor = court.indoor === true;
      if (filters.indoor === "indoor" && !isIndoor) return false;
      if (filters.indoor === "outdoor" && isIndoor) return false;
    }
    if (filters.color !== "all" && court.color !== filters.color) {
      return false;
    }
    return true;
  });
}

// Undefined always sorts last, regardless of asc/desc — matches the same
// convention used in Players Directory's sortPlayers (see
// app/dashboard/players/_components/PlayersDirectory/utils.ts).
function compareWithUndefinedLast<T>(
  a: T | undefined,
  b: T | undefined,
  compare: (a: T, b: T) => number,
  direction: "asc" | "desc",
): number {
  if (a === undefined && b === undefined) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;
  const result = compare(a, b);
  return direction === "asc" ? result : -result;
}

export function sortCourts(
  courts: CourtColumn[],
  sort: CourtSort,
): CourtColumn[] {
  return [...courts].sort((a, b) => {
    switch (sort.field) {
      case "name": {
        const result = a.name.localeCompare(b.name);
        return sort.direction === "asc" ? result : -result;
      }
      case "surface":
        return compareWithUndefinedLast(
          a.surface,
          b.surface,
          (x, y) => x.localeCompare(y),
          sort.direction,
        );
      case "price":
        return compareWithUndefinedLast(
          a.price,
          b.price,
          (x, y) => x - y,
          sort.direction,
        );
    }
  });
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run app/dashboard/browse/_components/BrowseCourts/components/ClubCourtsPanel/utils.test.ts`
Expected: PASS, all 9 cases green.

- [ ] **Step 6: Write `ClubCourtsPanel.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/DataTable";
import { StatusBox } from "@/components/StatusBox";
import {
  indoorLabel,
  surfaceLabel,
} from "@/app/dashboard/courts/_components/CourtsView/utils";
import { cn } from "@/lib/utils/utils";
import { filterCourts, sortCourts } from "./utils";
import type { DataTableColumn } from "@/components/DataTable";
import type { CourtColumn } from "@/components/CourtAvailabilityGrid";
import type { ClubCourtsPanelProps } from "./types";
import type { CourtFilters, CourtSort } from "./utils";

const DEFAULT_FILTERS: CourtFilters = {
  surface: "all",
  indoor: "all",
  color: "all",
};
const DEFAULT_SORT: CourtSort = { field: "name", direction: "asc" };

function uniqueDefinedValues(values: (string | undefined)[]): string[] {
  return [...new Set(values.filter((v): v is string => !!v))];
}

export function ClubCourtsPanel({
  courts,
  selectedClubId,
  selectedCourtId,
  onSelectCourt,
  isLoading,
}: ClubCourtsPanelProps) {
  const [filters, setFilters] = useState<CourtFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<CourtSort>(DEFAULT_SORT);

  const surfaceOptions = useMemo(
    () => uniqueDefinedValues(courts.map((c) => c.surface)),
    [courts],
  );
  const colorOptions = useMemo(
    () => uniqueDefinedValues(courts.map((c) => c.color)),
    [courts],
  );

  const visibleCourts = useMemo(() => {
    const filtered = filterCourts(courts, filters);
    return sortCourts(filtered, sort);
  }, [courts, filters, sort]);

  function updateFilter<K extends keyof CourtFilters>(
    key: K,
    value: CourtFilters[K],
  ) {
    setFilters({ ...filters, [key]: value });
  }

  const columns: DataTableColumn<CourtColumn>[] = useMemo(
    () => [
      {
        key: "court",
        header: "Court",
        cell: (court) => (
          <button
            type="button"
            onClick={() => onSelectCourt(court.id)}
            aria-pressed={court.id === selectedCourtId}
            className={cn(
              "rounded-sm p-1 text-left text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              court.id === selectedCourtId && "bg-muted",
            )}
          >
            {court.name}
          </button>
        ),
      },
      {
        key: "surface",
        header: "Surface",
        cell: (court) => surfaceLabel(court.surface),
      },
      {
        key: "color",
        header: "Color",
        cell: (court) => (
          <span className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: court.color ?? "#94a3b8" }}
              aria-hidden="true"
            />
            {court.color ?? "—"}
          </span>
        ),
      },
      {
        key: "price",
        header: "Price",
        cell: (court) => (court.price !== undefined ? `$${court.price}` : "—"),
      },
    ],
    [selectedCourtId, onSelectCourt],
  );

  if (!selectedClubId) {
    return <StatusBox>Select a club to see its courts.</StatusBox>;
  }

  if (!isLoading && courts.length === 0) {
    return <StatusBox>No courts available for today.</StatusBox>;
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <Select
          value={filters.surface}
          onValueChange={(value) => updateFilter("surface", value)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Surface" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All surfaces</SelectItem>
            {surfaceOptions.map((surface) => (
              <SelectItem key={surface} value={surface}>
                {surfaceLabel(surface)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.indoor}
          onValueChange={(value) =>
            updateFilter("indoor", value as CourtFilters["indoor"])
          }
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Indoor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All courts</SelectItem>
            <SelectItem value="indoor">{indoorLabel(true)}</SelectItem>
            <SelectItem value="outdoor">{indoorLabel(false)}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.color}
          onValueChange={(value) => updateFilter("color", value)}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Color" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All colors</SelectItem>
            {colorOptions.map((color) => (
              <SelectItem key={color} value={color}>
                {color}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-1.5">
          <Select
            value={sort.field}
            onValueChange={(value) =>
              setSort({ ...sort, field: value as CourtSort["field"] })
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="surface">Surface</SelectItem>
              <SelectItem value="price">Price</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={
              sort.direction === "asc"
                ? "Sort ascending, click to sort descending"
                : "Sort descending, click to sort ascending"
            }
            onClick={() =>
              setSort({
                ...sort,
                direction: sort.direction === "asc" ? "desc" : "asc",
              })
            }
          >
            {sort.direction === "asc" ? <ArrowUp /> : <ArrowDown />}
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <DataTable
          columns={columns}
          rows={visibleCourts}
          rowKey={(court) => court.id}
          isLoading={isLoading}
          loadingLabel="Loading courts…"
          emptyState={<StatusBox>No courts match your filters.</StatusBox>}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Write `index.ts`**

```typescript
export { ClubCourtsPanel } from "./ClubCourtsPanel";
export type { ClubCourtsPanelProps } from "./types";
```

- [ ] **Step 8: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean, or only the pre-existing unrelated warning. Confirm `surfaceLabel`/`indoorLabel` import correctly from `@/app/dashboard/courts/_components/CourtsView/utils` (they're exported there already — no change needed to that file).

---

### Task 5: `CourtSchedulePanel` (right, 20%)

**Files:**

- Create: `app/dashboard/browse/_components/BrowseCourts/components/CourtSchedulePanel/types.ts`
- Create: `app/dashboard/browse/_components/BrowseCourts/components/CourtSchedulePanel/CourtSchedulePanel.tsx`
- Create: `app/dashboard/browse/_components/BrowseCourts/components/CourtSchedulePanel/index.ts`

**Interfaces:**

- Consumes: `CourtAvailabilityGrid`, `Slot`, `CourtColumn` (`@/components/CourtAvailabilityGrid`); `StatusBox`.
- Produces: `CourtSchedulePanel` component (props: `date: Date`, `onDateChange: (date: Date) => void`, `selectedCourt: CourtColumn | null`, `onSlotClick: (courtId: string, slot: Slot) => void`, `isLoading: boolean`, `isUpdating: boolean`, `isError: boolean`, `rowCount: number | undefined`) — Task 6 renders it. No new component logic: this is `CourtAvailabilityGrid` narrowed to a single-element `courts` array.

- [ ] **Step 1: Write `types.ts`**

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

- [ ] **Step 2: Write `CourtSchedulePanel.tsx`**

```tsx
"use client";

import { CourtAvailabilityGrid } from "@/components/CourtAvailabilityGrid";
import { StatusBox } from "@/components/StatusBox";
import type { CourtSchedulePanelProps } from "./types";

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
  if (!selectedCourt) {
    return <StatusBox>Select a court to see its schedule.</StatusBox>;
  }

  return (
    <CourtAvailabilityGrid
      date={date}
      courts={[selectedCourt]}
      variant="player"
      onSlotClick={onSlotClick}
      onDateChange={onDateChange}
      isLoading={isLoading}
      isUpdating={isUpdating}
      isError={isError}
      columnCount={1}
      rowCount={rowCount}
    />
  );
}
```

- [ ] **Step 3: Write `index.ts`**

```typescript
export { CourtSchedulePanel } from "./CourtSchedulePanel";
export type { CourtSchedulePanelProps } from "./types";
```

- [ ] **Step 4: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean, or only the pre-existing unrelated warning.

---

### Task 6: Wire the three panels into `BrowseCourts.tsx`, add the `court` URL param, mobile drill-down, remove `ClubPicker`

**Files:**

- Modify: `app/dashboard/browse/_components/BrowseCourts/BrowseCourts.tsx`
- Delete: `app/dashboard/browse/_components/BrowseCourts/components/ClubPicker/` (entire folder — confirmed via repo-wide search to have no consumers outside this one file)

**Interfaces:**

- Consumes: everything from Tasks 1–5 (`ClubListPanel`, `ClubCourtsPanel`, `CourtSchedulePanel`, the updated `useActiveClubs(date)`, `ClubBrowseSummary`), plus the existing `useClubAvailability`, `useBookSlot`, `BookingConfirmDialog`, `useGuardedDialogClose`, `useIsMobile` (`@/hooks/use-mobile`).
- Produces: the final `BrowseCourts` export — no change to its own public shape (still a zero-prop component rendered by `app/dashboard/browse/page.tsx`, which already wraps it in `NuqsAdapter` and needs no changes).

Current content of `BrowseCourts.tsx` (being replaced):

```tsx
"use client";

import { useState } from "react";
import { useQueryState, parseAsString } from "nuqs";
import { toast } from "sonner";
import { useReducedMotion } from "framer-motion";
import { track } from "@vercel/analytics";
import { CourtAvailabilityGrid } from "@/components/CourtAvailabilityGrid";
import type { Slot } from "@/components/CourtAvailabilityGrid";
import { useGuardedDialogClose } from "@/hooks/use-guarded-dialog-close";
import { fireSuccessConfetti } from "@/lib/utils/confetti";
import { ClubPicker } from "./components/ClubPicker";
import { BookingConfirmDialog } from "./components/BookingConfirmDialog";
import { useActiveClubs, useClubAvailability, useBookSlot } from "./hooks";
import { parseAsLocalDate } from "./utils";
import type { SelectedSlot } from "./types";

export function BrowseCourts() {
  const [clubId, setClubId] = useQueryState("club", parseAsString);
  const [defaultDate] = useState(() => new Date());
  const [date, setDate] = useQueryState(
    "date",
    parseAsLocalDate.withDefault(defaultDate),
  );
  const [selected, setSelected] = useState<SelectedSlot | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const { data: clubs, isLoading: clubsLoading } = useActiveClubs();
  const {
    data: courts,
    isLoading: availabilityLoading,
    isUpdating: availabilityUpdating,
    isError: availabilityError,
    columnCount,
    rowCount,
  } = useClubAvailability(clubId, date);
  const bookSlot = useBookSlot();
  const handleDialogClose = useGuardedDialogClose(bookSlot.isPending, () =>
    setSelected(null),
  );

  const currentClub = clubs?.find((c) => c.id === clubId);

  function handleSlotClick(courtId: string, slot: Slot) {
    if (slot.status !== "free") return;
    const court = courts?.find((c) => c.id === courtId);
    if (!court) return;
    setSelected({ courtId, courtName: court.name, price: court.price, slot });
  }

  async function handleConfirm() {
    if (!selected) return;
    try {
      const result = (await bookSlot.mutateAsync({
        courtId: selected.courtId,
        scheduledStart: selected.slot.start.toISOString(),
        scheduledEnd: selected.slot.end.toISOString(),
      })) as { checkoutUrl?: string };

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }

      toast.success("Reservation confirmed.");
      track("booking_confirmed");
      if (!shouldReduceMotion) {
        fireSuccessConfetti();
      }
      setSelected(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not book this slot.",
      );
    }
  }

  return (
    <div className="flex flex-col gap-6 lg:h-full">
      <div className="shrink-0">
        <h1 className="text-2xl font-semibold tracking-tight">Browse Courts</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pick a club and reserve a free slot.
        </p>
      </div>

      <ClubPicker
        clubs={clubs ?? []}
        value={clubId}
        onChange={setClubId}
        isLoading={clubsLoading}
      />

      <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {clubId ? (
          <CourtAvailabilityGrid
            date={date}
            courts={courts ?? []}
            variant="player"
            onSlotClick={handleSlotClick}
            onDateChange={setDate}
            isLoading={availabilityLoading}
            isUpdating={availabilityUpdating}
            isError={availabilityError}
            columnCount={columnCount}
            rowCount={rowCount}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Select a club to see court availability.
          </p>
        )}
      </div>

      <BookingConfirmDialog
        open={!!selected}
        onOpenChange={handleDialogClose}
        courtName={selected?.courtName ?? ""}
        slot={selected?.slot ?? null}
        price={selected?.price}
        currency={currentClub?.currency ?? "USD"}
        isSubmitting={bookSlot.isPending}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
```

- [ ] **Step 1: Replace `BrowseCourts.tsx` with the three-panel version**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useQueryState, parseAsString } from "nuqs";
import { toast } from "sonner";
import { useReducedMotion } from "framer-motion";
import { track } from "@vercel/analytics";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Slot } from "@/components/CourtAvailabilityGrid";
import { useGuardedDialogClose } from "@/hooks/use-guarded-dialog-close";
import { useIsMobile } from "@/hooks/use-mobile";
import { fireSuccessConfetti } from "@/lib/utils/confetti";
import { ClubListPanel } from "./components/ClubListPanel";
import { ClubCourtsPanel } from "./components/ClubCourtsPanel";
import { CourtSchedulePanel } from "./components/CourtSchedulePanel";
import { BookingConfirmDialog } from "./components/BookingConfirmDialog";
import { useActiveClubs, useClubAvailability, useBookSlot } from "./hooks";
import { parseAsLocalDate } from "./utils";
import type { SelectedSlot } from "./types";

export function BrowseCourts() {
  const [clubId, setClubId] = useQueryState("club", parseAsString);
  const [courtId, setCourtId] = useQueryState("court", parseAsString);
  const [defaultDate] = useState(() => new Date());
  const [date, setDate] = useQueryState(
    "date",
    parseAsLocalDate.withDefault(defaultDate),
  );
  const [selected, setSelected] = useState<SelectedSlot | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const isMobile = useIsMobile();

  const { data: clubs, isLoading: clubsLoading } = useActiveClubs(date);
  const {
    data: courts,
    isLoading: availabilityLoading,
    isUpdating: availabilityUpdating,
    isError: availabilityError,
    rowCount,
  } = useClubAvailability(clubId, date);
  const bookSlot = useBookSlot();
  const handleDialogClose = useGuardedDialogClose(bookSlot.isPending, () =>
    setSelected(null),
  );

  const currentClub = clubs?.find((c) => c.id === clubId);
  const selectedCourt = (courts ?? []).find((c) => c.id === courtId) ?? null;

  // A court selected under one club shouldn't silently carry over once the
  // courts list changes (club switch, or the selected court closing/being
  // deactivated) — clear it if it's no longer in the current list.
  useEffect(() => {
    if (courtId && courts && !courts.some((c) => c.id === courtId)) {
      setCourtId(null);
    }
  }, [courts, courtId, setCourtId]);

  function handleSelectClub(id: string) {
    setClubId(id);
    setCourtId(null);
  }

  function handleBackToClubs() {
    setClubId(null);
    setCourtId(null);
  }

  function handleSlotClick(courtId: string, slot: Slot) {
    if (slot.status !== "free") return;
    const court = courts?.find((c) => c.id === courtId);
    if (!court) return;
    setSelected({ courtId, courtName: court.name, price: court.price, slot });
  }

  async function handleConfirm() {
    if (!selected) return;
    try {
      const result = (await bookSlot.mutateAsync({
        courtId: selected.courtId,
        scheduledStart: selected.slot.start.toISOString(),
        scheduledEnd: selected.slot.end.toISOString(),
      })) as { checkoutUrl?: string };

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }

      toast.success("Reservation confirmed.");
      track("booking_confirmed");
      if (!shouldReduceMotion) {
        fireSuccessConfetti();
      }
      setSelected(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not book this slot.",
      );
    }
  }

  const clubListPanel = (
    <ClubListPanel
      clubs={clubs ?? []}
      selectedClubId={clubId}
      onSelectClub={handleSelectClub}
      isLoading={clubsLoading}
    />
  );

  const courtsPanel = (
    <ClubCourtsPanel
      courts={courts ?? []}
      selectedClubId={clubId}
      selectedCourtId={courtId}
      onSelectCourt={setCourtId}
      isLoading={availabilityLoading}
    />
  );

  const schedulePanel = (
    <CourtSchedulePanel
      date={date}
      onDateChange={setDate}
      selectedCourt={selectedCourt}
      onSlotClick={handleSlotClick}
      isLoading={availabilityLoading}
      isUpdating={availabilityUpdating}
      isError={availabilityError}
      rowCount={rowCount}
    />
  );

  return (
    <div className="flex flex-col gap-6 lg:h-full">
      <div className="shrink-0">
        <h1 className="text-2xl font-semibold tracking-tight">Browse Courts</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pick a club, then a court, then a free slot to reserve.
        </p>
      </div>

      {isMobile ? (
        <div className="flex flex-col gap-3 lg:min-h-0 lg:flex-1">
          {!clubId && clubListPanel}
          {clubId && !courtId && (
            <div className="flex flex-col gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-fit"
                onClick={handleBackToClubs}
              >
                <ArrowLeft /> Back to clubs
              </Button>
              {courtsPanel}
            </div>
          )}
          {clubId && courtId && (
            <div className="flex flex-col gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-fit"
                onClick={() => setCourtId(null)}
              >
                <ArrowLeft /> Back to courts
              </Button>
              {schedulePanel}
            </div>
          )}
        </div>
      ) : (
        <div className="flex gap-4 lg:min-h-0 lg:flex-1">
          <div className="w-[20%] min-w-0">{clubListPanel}</div>
          <div className="w-[60%] min-w-0">{courtsPanel}</div>
          <div className="w-[20%] min-w-0">{schedulePanel}</div>
        </div>
      )}

      <BookingConfirmDialog
        open={!!selected}
        onOpenChange={handleDialogClose}
        courtName={selected?.courtName ?? ""}
        slot={selected?.slot ?? null}
        price={selected?.price}
        currency={currentClub?.currency ?? "USD"}
        isSubmitting={bookSlot.isPending}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
```

Note: `columnCount` from `useClubAvailability` is no longer destructured/used — `CourtSchedulePanel` always passes a hardcoded `columnCount={1}` internally (Task 5), since the schedule panel only ever shows one court regardless of how many the club has.

- [ ] **Step 2: Delete the now-unused `ClubPicker` component**

Plain filesystem delete of the whole `app/dashboard/browse/_components/BrowseCourts/components/ClubPicker/` directory (not `git rm`).

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean — this is where every prior piece finally gets consumed, so it's where a wiring mistake would surface. The Task 2 Step 9 error (`useActiveClubs()` called with no argument) should now be resolved since this step passes `date`.

- [ ] **Step 4: Manual verification**

Run `npm run dev`, sign in as a player, open `/dashboard/browse` and check:

- Desktop (≥768px): three panels visible side by side at roughly 20/60/20 width. Clubs list shows avatar, name, court count; a club with no bookable slots today looks visually dimmed but is still clickable.
- Selecting a club populates the middle panel with that club's courts (name/surface/color swatch/price); selecting a grayed-out club shows "No courts available for today" in the middle panel instead.
- Selecting a court populates the right panel with that court's schedule (same grid as before, just one column).
- Clicking a free slot opens the same `BookingConfirmDialog` as before (desktop dialog / mobile drawer depending on viewport), and completing a booking still works (confetti/toast/analytics on success, or a Mercado Pago redirect for a prepayment club).
- Filters/sort on both the club list and the court list narrow/reorder correctly and combine (AND logic) as expected.
- The URL reflects `?club=...&court=...&date=...` and refreshing the page restores the same three-panel state.
- Shrink the browser below ~768px: only one panel shows at a time, with a working "Back to clubs"/"Back to courts" button at each step.
