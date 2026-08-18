# Shared DataTable Component + Players Directory Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Players Directory's card grid with a dense, filterable, sortable table, built on a new reusable `DataTable` component that the Browse Courts redesign (a separate, later plan) will also use.

**Architecture:** A generic, config-driven `DataTable<T>` component (columns + rows + loading/empty states) built directly on the existing `components/ui/table.tsx` primitives — not a new table implementation. `PlayersDirectory` supplies its own columns, a new `PlayersFilterBar` (search + 3 filter dropdowns + sort control), and pure `filterPlayers`/`sortPlayers` functions that do the actual list transformation client-side.

**Tech Stack:** Next.js 16 App Router, TypeScript, React Hook Form is NOT used here (no form, just filter state), `@tanstack/react-query` (existing `usePlayers` hook, unchanged), Radix `Select`/`Dialog` via existing `components/ui/*` wrappers, Vitest for the pure-function tests.

**Spec:** `docs/superpowers/specs/2026-08-16-datatable-players-directory-design.md`

## Global Constraints

- No row-selection checkboxes or bulk actions.
- No pagination — render the full filtered/sorted list, matching today's behavior.
- Filter/sort state is local component state, NOT synced to the URL (this diverges from Browse Courts' nuqs pattern intentionally — see spec's Data Flow section).
- Row click must continue to open the existing `PlayerProfileCard` modal, unchanged.
- Follow the existing SRP file convention: one render output per component; `consts.ts`/`types.ts`/`utils.ts`/`hooks.ts` split out where they already exist or are needed.
- `index.ts` barrel exports must stay alphabetically sorted by exported name (enforced by `eslint-rules/sort-index-exports.mjs`).
- English-only code, comments, and UI copy.
- No win-rate filter/column (no `Match` data model exists — tracked in `docs/BACKLOG.md`, not this plan).

---

### Task 1: Shared `DataTable` component

**Files:**

- Create: `components/DataTable/types.ts`
- Create: `components/DataTable/DataTable.tsx`
- Create: `components/DataTable/index.ts`

**Interfaces:**

- Produces: `DataTable<T>` component, `DataTableColumn<T>` type — both exported from `@/components/DataTable`. Any later consumer (Players Directory now; Browse Courts' club/court panels later) imports these two names.

This is a presentational component with no business logic of its own — following this codebase's existing convention (`CourtsTable`, `ReservationsTable`, `AuditLogsTable` have no test files either), it does not get a dedicated test file. Its correctness is exercised indirectly through Task 5's manual verification.

- [ ] **Step 1: Write `components/DataTable/types.ts`**

```typescript
import type { ReactNode } from "react";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
};

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  isLoading: boolean;
  loadingLabel: string;
  loadingRowCount?: number;
  emptyState: ReactNode;
};
```

- [ ] **Step 2: Write `components/DataTable/DataTable.tsx`**

```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { DataTableProps } from "./types";

const DEFAULT_LOADING_ROW_COUNT = 5;

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading,
  loadingLabel,
  loadingRowCount = DEFAULT_LOADING_ROW_COUNT,
  emptyState,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="overflow-x-auto rounded-sm border">
        <span className="sr-only" role="status">
          {loadingLabel}
        </span>
        <Table aria-hidden="true">
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: loadingRowCount }).map((_, index) => (
              <TableRow key={index}>
                {columns.map((column) => (
                  <TableCell key={column.key}>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (rows.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <div className="overflow-x-auto rounded-sm border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={rowKey(row)}>
              {columns.map((column) => (
                <TableCell key={column.key} className={column.className}>
                  {column.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

Note: there is deliberately no whole-row click handling here. A column whose cell needs to be clickable (Task 5's "Player" column) renders a real `<button>` inside its own `cell` renderer — that keeps native keyboard/focus semantics for free instead of reinventing them on a `<tr>`.

- [ ] **Step 3: Write `components/DataTable/index.ts`**

```typescript
export { DataTable } from "./DataTable";
export type { DataTableColumn, DataTableProps } from "./types";
```

- [ ] **Step 4: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no new errors (this file has no consumers yet, so it should be inert).

- [ ] **Step 5: Commit**

```bash
git add components/DataTable
git commit -m "feat: add reusable DataTable component"
```

---

### Task 2: Players filter/sort types and pure functions (TDD)

**Files:**

- Create: `app/dashboard/players/_components/PlayersDirectory/types.ts`
- Modify: `app/dashboard/players/_components/PlayersDirectory/hooks.ts`
- Create: `app/dashboard/players/_components/PlayersDirectory/utils.ts`
- Test: `app/dashboard/players/_components/PlayersDirectory/utils.test.ts`

**Interfaces:**

- Consumes: `PlayerProfileData` from `@/components/PlayerProfileCard` (existing — `displayName: string`, `avatarUrl: string | null`, `padelCategory: number | null`, `preferredSide: PreferredSide | null`, `dominantHand: DominantHand | null`, `email: string`, `phone: string | null`, plus optional win-rate fields). `PreferredSide`/`DominantHand` from `@/core/users/types` (`"forehand" | "backhand"`, `"right" | "left"`). `getPreferredSideLabel`/`getDominantHandLabel` from `@/core/users/consts`. `getPadelCategoryLabel` from `@/app/dashboard/_components/DashboardHome/components/SkillOverviewCard/utils`.
- Produces: `PlayerListItem` (moved here from `hooks.ts`), `PlayerFilters`, `PlayerSort` types; `filterPlayers(players, query, filters): PlayerListItem[]` and `sortPlayers(players, sort): PlayerListItem[]` functions — Task 3 (consts) and Task 5 (wiring) both import these exact names.

- [ ] **Step 1: Write `types.ts`**

```typescript
import type { PlayerProfileData } from "@/components/PlayerProfileCard";
import type { DominantHand, PreferredSide } from "@/core/users/types";

export type PlayerListItem = PlayerProfileData & { id: string };

export type PlayerFilters = {
  category: "all" | "unknown" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";
  preferredSide: "all" | PreferredSide;
  dominantHand: "all" | DominantHand;
};

export type PlayerSortField =
  "name" | "category" | "preferredSide" | "dominantHand";

export type PlayerSort = {
  field: PlayerSortField;
  direction: "asc" | "desc";
};
```

- [ ] **Step 2: Update `hooks.ts` to import `PlayerListItem` instead of defining it inline**

Current content of `hooks.ts`:

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { playersQueryKey } from "./consts";
import type { PlayerProfileData } from "@/components/PlayerProfileCard";

type PlayerListItem = PlayerProfileData & { id: string };

async function fetchPlayers(): Promise<PlayerListItem[]> {
  const res = await fetch("/api/players");
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error ?? "Could not load players.");
  }
  return body.players;
}

export function usePlayers() {
  return useQuery({
    queryKey: playersQueryKey,
    queryFn: fetchPlayers,
  });
}
```

Replace it with:

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { playersQueryKey } from "./consts";
import type { PlayerListItem } from "./types";

async function fetchPlayers(): Promise<PlayerListItem[]> {
  const res = await fetch("/api/players");
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error ?? "Could not load players.");
  }
  return body.players;
}

export function usePlayers() {
  return useQuery({
    queryKey: playersQueryKey,
    queryFn: fetchPlayers,
  });
}
```

- [ ] **Step 3: Write the failing test `utils.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { filterPlayers, sortPlayers } from "./utils";
import type { PlayerFilters, PlayerListItem, PlayerSort } from "./types";

const NO_FILTERS: PlayerFilters = {
  category: "all",
  preferredSide: "all",
  dominantHand: "all",
};

function makePlayer(overrides: Partial<PlayerListItem>): PlayerListItem {
  return {
    id: "1",
    displayName: "Test Player",
    avatarUrl: null,
    padelCategory: null,
    preferredSide: null,
    dominantHand: null,
    email: "test@example.com",
    phone: null,
    ...overrides,
  };
}

describe("filterPlayers", () => {
  it("returns all players when query is empty and no filters are applied", () => {
    const players = [
      makePlayer({ id: "1", displayName: "Ana" }),
      makePlayer({ id: "2", displayName: "Beto" }),
    ];
    expect(filterPlayers(players, "", NO_FILTERS)).toHaveLength(2);
  });

  it("filters by name query, case-insensitively", () => {
    const players = [
      makePlayer({ id: "1", displayName: "Ana Gomez" }),
      makePlayer({ id: "2", displayName: "Beto Diaz" }),
    ];
    const result = filterPlayers(players, "ana", NO_FILTERS);
    expect(result.map((p) => p.id)).toEqual(["1"]);
  });

  it('matches category "unknown" against a null padelCategory', () => {
    const players = [
      makePlayer({ id: "1", padelCategory: null }),
      makePlayer({ id: "2", padelCategory: 3 }),
    ];
    const result = filterPlayers(players, "", {
      ...NO_FILTERS,
      category: "unknown",
    });
    expect(result.map((p) => p.id)).toEqual(["1"]);
  });

  it("matches a specific numeric category", () => {
    const players = [
      makePlayer({ id: "1", padelCategory: 3 }),
      makePlayer({ id: "2", padelCategory: 5 }),
    ];
    const result = filterPlayers(players, "", {
      ...NO_FILTERS,
      category: "3",
    });
    expect(result.map((p) => p.id)).toEqual(["1"]);
  });

  it("combines the name query with a preferredSide filter (AND logic)", () => {
    const players = [
      makePlayer({ id: "1", displayName: "Ana", preferredSide: "forehand" }),
      makePlayer({ id: "2", displayName: "Ana", preferredSide: "backhand" }),
    ];
    const result = filterPlayers(players, "ana", {
      ...NO_FILTERS,
      preferredSide: "forehand",
    });
    expect(result.map((p) => p.id)).toEqual(["1"]);
  });

  it("filters by dominantHand", () => {
    const players = [
      makePlayer({ id: "1", dominantHand: "right" }),
      makePlayer({ id: "2", dominantHand: "left" }),
    ];
    const result = filterPlayers(players, "", {
      ...NO_FILTERS,
      dominantHand: "left",
    });
    expect(result.map((p) => p.id)).toEqual(["2"]);
  });
});

describe("sortPlayers", () => {
  it("sorts by name ascending and descending", () => {
    const players = [
      makePlayer({ id: "1", displayName: "Beto" }),
      makePlayer({ id: "2", displayName: "Ana" }),
    ];
    const asc: PlayerSort = { field: "name", direction: "asc" };
    expect(sortPlayers(players, asc).map((p) => p.id)).toEqual(["2", "1"]);

    const desc: PlayerSort = { field: "name", direction: "desc" };
    expect(sortPlayers(players, desc).map((p) => p.id)).toEqual(["1", "2"]);
  });

  it("sorts by category numerically, with null always last regardless of direction", () => {
    const players = [
      makePlayer({ id: "1", padelCategory: 5 }),
      makePlayer({ id: "2", padelCategory: null }),
      makePlayer({ id: "3", padelCategory: 2 }),
    ];
    const asc: PlayerSort = { field: "category", direction: "asc" };
    expect(sortPlayers(players, asc).map((p) => p.id)).toEqual(["3", "1", "2"]);

    const desc: PlayerSort = { field: "category", direction: "desc" };
    expect(sortPlayers(players, desc).map((p) => p.id)).toEqual([
      "1",
      "3",
      "2",
    ]);
  });

  it("sorts by preferredSide label, with null always last regardless of direction", () => {
    const players = [
      makePlayer({ id: "1", preferredSide: "forehand" }),
      makePlayer({ id: "2", preferredSide: null }),
      makePlayer({ id: "3", preferredSide: "backhand" }),
    ];
    // "Backhand" < "Forehand" alphabetically
    const asc: PlayerSort = { field: "preferredSide", direction: "asc" };
    expect(sortPlayers(players, asc).map((p) => p.id)).toEqual(["3", "1", "2"]);

    const desc: PlayerSort = { field: "preferredSide", direction: "desc" };
    expect(sortPlayers(players, desc).map((p) => p.id)).toEqual([
      "1",
      "3",
      "2",
    ]);
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx vitest run app/dashboard/players/_components/PlayersDirectory/utils.test.ts`
Expected: FAIL — `utils.ts` does not exist yet (module not found).

- [ ] **Step 5: Write `utils.ts` to make the tests pass**

```typescript
import {
  getDominantHandLabel,
  getPreferredSideLabel,
} from "@/core/users/consts";
import type { DominantHand, PreferredSide } from "@/core/users/types";
import type { PlayerFilters, PlayerListItem, PlayerSort } from "./types";

export function filterPlayers(
  players: PlayerListItem[],
  query: string,
  filters: PlayerFilters,
): PlayerListItem[] {
  const normalizedQuery = query.trim().toLowerCase();
  return players.filter((player) => {
    if (!player.displayName.toLowerCase().includes(normalizedQuery)) {
      return false;
    }
    if (filters.category !== "all") {
      const categoryMatches =
        filters.category === "unknown"
          ? player.padelCategory === null
          : player.padelCategory === Number(filters.category);
      if (!categoryMatches) return false;
    }
    if (
      filters.preferredSide !== "all" &&
      player.preferredSide !== filters.preferredSide
    ) {
      return false;
    }
    if (
      filters.dominantHand !== "all" &&
      player.dominantHand !== filters.dominantHand
    ) {
      return false;
    }
    return true;
  });
}

// Nulls always sort last, regardless of asc/desc — `direction` only ever
// flips the ordering among non-null values.
function compareWithNullsLast<T>(
  a: T | null,
  b: T | null,
  compare: (a: T, b: T) => number,
  direction: "asc" | "desc",
): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  const result = compare(a, b);
  return direction === "asc" ? result : -result;
}

export function sortPlayers(
  players: PlayerListItem[],
  sort: PlayerSort,
): PlayerListItem[] {
  return [...players].sort((a, b) => {
    switch (sort.field) {
      case "name": {
        const result = a.displayName.localeCompare(b.displayName);
        return sort.direction === "asc" ? result : -result;
      }
      case "category":
        return compareWithNullsLast(
          a.padelCategory,
          b.padelCategory,
          (x, y) => x - y,
          sort.direction,
        );
      case "preferredSide":
        return compareWithNullsLast<PreferredSide>(
          a.preferredSide,
          b.preferredSide,
          (x, y) =>
            getPreferredSideLabel(x).localeCompare(getPreferredSideLabel(y)),
          sort.direction,
        );
      case "dominantHand":
        return compareWithNullsLast<DominantHand>(
          a.dominantHand,
          b.dominantHand,
          (x, y) =>
            getDominantHandLabel(x).localeCompare(getDominantHandLabel(y)),
          sort.direction,
        );
    }
  });
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run app/dashboard/players/_components/PlayersDirectory/utils.test.ts`
Expected: PASS, all 9 test cases green.

- [ ] **Step 7: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean (or only the pre-existing unrelated `eslint-rules/sort-index-exports.mjs` warning).

- [ ] **Step 8: Commit**

```bash
git add app/dashboard/players/_components/PlayersDirectory/types.ts \
        app/dashboard/players/_components/PlayersDirectory/hooks.ts \
        app/dashboard/players/_components/PlayersDirectory/utils.ts \
        app/dashboard/players/_components/PlayersDirectory/utils.test.ts
git commit -m "feat: add filter/sort types and pure functions for Players Directory"
```

---

### Task 3: Column definitions and filter/sort option lists

**Files:**

- Delete: `app/dashboard/players/_components/PlayersDirectory/consts.ts`
- Create: `app/dashboard/players/_components/PlayersDirectory/consts.tsx` (same content as today's `consts.ts` plus the additions below — renamed because this step introduces JSX in a `cell` renderer, which requires the `.tsx` extension)

**Interfaces:**

- Consumes: `PlayerListItem` from `./types` (Task 2); `getPadelCategoryLabel` from `@/app/dashboard/_components/DashboardHome/components/SkillOverviewCard/utils`; `getPreferredSideLabel`/`getDominantHandLabel`/`PREFERRED_SIDE_OPTIONS`/`DOMINANT_HAND_OPTIONS` from `@/core/users/consts`; `PADEL_CATEGORY_OPTIONS` from `@/app/onboarding/types`.
- Produces: `STATIC_PLAYER_COLUMNS: DataTableColumn<PlayerListItem>[]` (category/side/hand columns — the avatar+name column is built separately in Task 5 since it needs a click handler), `CATEGORY_FILTER_OPTIONS`, `PREFERRED_SIDE_FILTER_OPTIONS`, `DOMINANT_HAND_FILTER_OPTIONS` (each `{ value: string; label: string }[]`, with an `"all"` entry prepended), `SORT_FIELD_OPTIONS: { value: PlayerSortField; label: string }[]`. Task 4 (filter bar) and Task 5 (wiring) both import these exact names.

Current content of `consts.ts` (keep this line, add everything else below it):

```typescript
export const playersQueryKey = ["players"] as const;
```

- [ ] **Step 1: Append the new exports to `consts.ts`**

```typescript
export const playersQueryKey = ["players"] as const;

import { Badge } from "@/components/ui/badge";
import { PADEL_CATEGORY_OPTIONS } from "@/app/onboarding/types";
import { getPadelCategoryLabel } from "@/app/dashboard/_components/DashboardHome/components/SkillOverviewCard/utils";
import {
  DOMINANT_HAND_OPTIONS,
  PREFERRED_SIDE_OPTIONS,
  getDominantHandLabel,
  getPreferredSideLabel,
} from "@/core/users/consts";
import type { DataTableColumn } from "@/components/DataTable";
import type { PlayerListItem, PlayerSortField } from "./types";

export const STATIC_PLAYER_COLUMNS: DataTableColumn<PlayerListItem>[] = [
  {
    key: "category",
    header: "Category",
    cell: (player) => (
      <Badge variant="outline">
        {getPadelCategoryLabel(player.padelCategory)}
      </Badge>
    ),
  },
  {
    key: "preferredSide",
    header: "Preferred side",
    cell: (player) => getPreferredSideLabel(player.preferredSide),
  },
  {
    key: "dominantHand",
    header: "Dominant hand",
    cell: (player) => getDominantHandLabel(player.dominantHand),
  },
];

export const CATEGORY_FILTER_OPTIONS = [
  { value: "all", label: "All categories" },
  ...PADEL_CATEGORY_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
  })),
];

export const PREFERRED_SIDE_FILTER_OPTIONS = [
  { value: "all", label: "All sides" },
  ...PREFERRED_SIDE_OPTIONS,
];

export const DOMINANT_HAND_FILTER_OPTIONS = [
  { value: "all", label: "All hands" },
  ...DOMINANT_HAND_OPTIONS,
];

export const SORT_FIELD_OPTIONS: { value: PlayerSortField; label: string }[] =
  [
    { value: "name", label: "Name" },
    { value: "category", label: "Category" },
    { value: "preferredSide", label: "Preferred side" },
    { value: "dominantHand", label: "Dominant hand" },
  ];
```

Note: `consts.ts` gains a `.tsx`-shaped import (`Badge`) and JSX in the `cell` renderer, so it must be renamed to `consts.tsx`. Rename the file as part of this step (`consts.ts` → `consts.tsx`) — later imports of `"./consts"` are unaffected since the extension isn't part of the import specifier.

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean — this file has no consumers yet either (Tasks 4/5 wire it up), so no new errors should appear beyond confirming the file itself compiles.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/players/_components/PlayersDirectory/consts.tsx
git rm app/dashboard/players/_components/PlayersDirectory/consts.ts
git commit -m "feat: add Players Directory table columns and filter/sort options"
```

---

### Task 4: `PlayersFilterBar` component

**Files:**

- Create: `app/dashboard/players/_components/PlayersDirectory/components/PlayersFilterBar/PlayersFilterBar.tsx`
- Create: `app/dashboard/players/_components/PlayersDirectory/components/PlayersFilterBar/types.ts`
- Create: `app/dashboard/players/_components/PlayersDirectory/components/PlayersFilterBar/index.ts`

**Interfaces:**

- Consumes: `PlayerFilters`, `PlayerSort` from `../../types` (Task 2); `CATEGORY_FILTER_OPTIONS`, `PREFERRED_SIDE_FILTER_OPTIONS`, `DOMINANT_HAND_FILTER_OPTIONS`, `SORT_FIELD_OPTIONS` from `../../consts` (Task 3); `Select`/`SelectTrigger`/`SelectContent`/`SelectItem`/`SelectValue` from `@/components/ui/select`; `Input` from `@/components/ui/input`; `Button` from `@/components/ui/button`; `ArrowUp`/`ArrowDown`/`Search` from `lucide-react`.
- Produces: `PlayersFilterBar` component — Task 5 renders it.

- [ ] **Step 1: Write `types.ts`**

```typescript
import type { PlayerFilters, PlayerSort } from "../../types";

export type PlayersFilterBarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  filters: PlayerFilters;
  onFiltersChange: (filters: PlayerFilters) => void;
  sort: PlayerSort;
  onSortChange: (sort: PlayerSort) => void;
};
```

- [ ] **Step 2: Write `PlayersFilterBar.tsx`**

```tsx
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CATEGORY_FILTER_OPTIONS,
  DOMINANT_HAND_FILTER_OPTIONS,
  PREFERRED_SIDE_FILTER_OPTIONS,
  SORT_FIELD_OPTIONS,
} from "../../consts";
import type { PlayerFilters, PlayerSortField } from "../../types";
import type { PlayersFilterBarProps } from "./types";

export function PlayersFilterBar({
  query,
  onQueryChange,
  filters,
  onFiltersChange,
  sort,
  onSortChange,
}: PlayersFilterBarProps) {
  function updateFilter<K extends keyof PlayerFilters>(
    key: K,
    value: PlayerFilters[K],
  ) {
    onFiltersChange({ ...filters, [key]: value });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative sm:w-64">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search players by name..."
          className="pl-8"
        />
      </div>

      <Select
        value={filters.category}
        onValueChange={(value) =>
          updateFilter("category", value as PlayerFilters["category"])
        }
      >
        <SelectTrigger className="sm:w-40">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          {CATEGORY_FILTER_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.preferredSide}
        onValueChange={(value) =>
          updateFilter("preferredSide", value as PlayerFilters["preferredSide"])
        }
      >
        <SelectTrigger className="sm:w-40">
          <SelectValue placeholder="Preferred side" />
        </SelectTrigger>
        <SelectContent>
          {PREFERRED_SIDE_FILTER_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.dominantHand}
        onValueChange={(value) =>
          updateFilter("dominantHand", value as PlayerFilters["dominantHand"])
        }
      >
        <SelectTrigger className="sm:w-40">
          <SelectValue placeholder="Dominant hand" />
        </SelectTrigger>
        <SelectContent>
          {DOMINANT_HAND_FILTER_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1.5 sm:ml-auto">
        <Select
          value={sort.field}
          onValueChange={(value) =>
            onSortChange({ ...sort, field: value as PlayerSortField })
          }
        >
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_FIELD_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
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
            onSortChange({
              ...sort,
              direction: sort.direction === "asc" ? "desc" : "asc",
            })
          }
        >
          {sort.direction === "asc" ? <ArrowUp /> : <ArrowDown />}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write `index.ts`**

```typescript
export { PlayersFilterBar } from "./PlayersFilterBar";
```

- [ ] **Step 4: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean (no consumers yet).

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/players/_components/PlayersDirectory/components/PlayersFilterBar
git commit -m "feat: add PlayersFilterBar component"
```

---

### Task 5: Wire everything into `PlayersDirectory.tsx` and remove the old card grid

**Files:**

- Modify: `app/dashboard/players/_components/PlayersDirectory/PlayersDirectory.tsx`
- Delete: `app/dashboard/players/_components/PlayersDirectory/components/PlayerCard/` (entire folder — confirmed via repo-wide search to have no other consumers)

**Interfaces:**

- Consumes: everything produced by Tasks 1–4 (`DataTable` + `DataTableColumn`, `PlayerListItem`/`PlayerFilters`/`PlayerSort`, `filterPlayers`/`sortPlayers`, `STATIC_PLAYER_COLUMNS`, `PlayersFilterBar`), plus the existing `usePlayers` hook, `PlayerProfileCard`, `StatusBox`, `Dialog`/`DialogContent`, `Avatar`/`AvatarImage`/`AvatarFallback`, `getInitials`.
- Produces: the final `PlayersDirectory` export — no change to its own public shape (still a zero-prop component), so nothing outside this folder needs to change.

Current content of `PlayersDirectory.tsx` (being replaced):

```tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { usePlayers } from "./hooks";
import { PlayerCard } from "./components/PlayerCard";

export function PlayersDirectory() {
  const [query, setQuery] = useState("");
  const { data: players, isLoading, isError } = usePlayers();

  const normalizedQuery = query.trim().toLowerCase();
  const matches = (players ?? []).filter((player) =>
    player.displayName.toLowerCase().includes(normalizedQuery),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search players by name..."
          className="pl-8"
        />
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading players...</p>
      )}
      {isError && (
        <p className="text-sm text-destructive">
          Could not load players. Try again later.
        </p>
      )}
      {!isLoading && !isError && matches.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No players match &ldquo;{query}&rdquo;.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {matches.map((player) => (
          <PlayerCard key={player.id} player={player} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 1: Replace `PlayersDirectory.tsx` with the table-based version**

```tsx
"use client";

import { useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DataTable } from "@/components/DataTable";
import { StatusBox } from "@/components/StatusBox";
import { PlayerProfileCard } from "@/components/PlayerProfileCard";
import { getInitials } from "@/app/dashboard/_components/DashboardHome/components/PlayerOverview/utils";
import { usePlayers } from "./hooks";
import { STATIC_PLAYER_COLUMNS } from "./consts";
import { filterPlayers, sortPlayers } from "./utils";
import { PlayersFilterBar } from "./components/PlayersFilterBar";
import type { DataTableColumn } from "@/components/DataTable";
import type { PlayerFilters, PlayerListItem, PlayerSort } from "./types";

const DEFAULT_FILTERS: PlayerFilters = {
  category: "all",
  preferredSide: "all",
  dominantHand: "all",
};

const DEFAULT_SORT: PlayerSort = { field: "name", direction: "asc" };

export function PlayersDirectory() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<PlayerFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<PlayerSort>(DEFAULT_SORT);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerListItem | null>(
    null,
  );

  const { data: players, isLoading, isError } = usePlayers();

  const visiblePlayers = useMemo(() => {
    const filtered = filterPlayers(players ?? [], query, filters);
    return sortPlayers(filtered, sort);
  }, [players, query, filters, sort]);

  const columns: DataTableColumn<PlayerListItem>[] = useMemo(
    () => [
      {
        key: "player",
        header: "Player",
        cell: (player) => (
          <button
            type="button"
            onClick={() => setSelectedPlayer(player)}
            className="flex items-center gap-2 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <Avatar>
              {player.avatarUrl && (
                <AvatarImage src={player.avatarUrl} alt="" />
              )}
              <AvatarFallback>{getInitials(player.displayName)}</AvatarFallback>
            </Avatar>
            <span className="truncate font-medium">{player.displayName}</span>
          </button>
        ),
      },
      ...STATIC_PLAYER_COLUMNS,
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      <PlayersFilterBar
        query={query}
        onQueryChange={setQuery}
        filters={filters}
        onFiltersChange={setFilters}
        sort={sort}
        onSortChange={setSort}
      />

      {isError ? (
        <StatusBox>Could not load players. Try again later.</StatusBox>
      ) : (
        <DataTable
          columns={columns}
          rows={visiblePlayers}
          rowKey={(player) => player.id}
          isLoading={isLoading}
          loadingLabel="Loading players…"
          emptyState={<StatusBox>No players match your filters.</StatusBox>}
        />
      )}

      <Dialog
        open={selectedPlayer !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedPlayer(null);
        }}
      >
        <DialogContent>
          {selectedPlayer && <PlayerProfileCard player={selectedPlayer} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Delete the now-unused `PlayerCard` component**

```bash
git rm -r app/dashboard/players/_components/PlayersDirectory/components/PlayerCard
```

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean — this is the task where every prior piece finally gets consumed, so this is where a wiring mistake (wrong import name, wrong prop shape) would surface.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, sign in, open `/dashboard/players` and check:

- Table renders with Player/Category/Preferred side/Dominant hand columns.
- Typing in the search box filters by name.
- Each filter dropdown narrows the list; combining filters narrows further (AND).
- Changing "Sort by" and toggling the direction button reorders rows correctly, with unset (null) values always at the bottom.
- Clicking a player's name opens the same profile dialog as before, showing category/side/hand/email/phone.
- With no players matching the current filters, the "No players match your filters" empty state shows.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/players/_components/PlayersDirectory/PlayersDirectory.tsx
git commit -m "feat: redesign Players Directory as a filterable, sortable table"
```
