# Player Overview Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Player Overview" section (preferred side, latest partner, performance stats) to the player's Dashboard Home, as a desktop two-column layout / mobile expandable banner, using mock data only.

**Architecture:** A new `PlayerOverview` component tree under `DashboardHome/components/`, built bottom-up from small leaf components (SVG court diagram, partner popover, stat displays) into a shared `PlayerOverviewContent`, wrapped by two responsive shells (`PlayerOverviewCard` for desktop, `PlayerOverviewBanner` for mobile). The existing search/bento grid is extracted into its own `SearchableCardsGrid` component first (pure refactor, zero behavior change) so it can be reused unchanged in both the new player two-column layout and the untouched owner layout.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS v4, shadcn/ui (Card, Popover, Sheet, Badge, Avatar, Button), lucide-react icons, framer-motion (already used by the extracted grid, untouched).

## Global Constraints

- **No backend/schema changes.** No `preferredSide` field, no partner/match/tournament models. All data in this feature is mock, defined in one `consts.ts`, shaped like plausible future real data.
- **Full spec:** `docs/superpowers/specs/2026-08-01-player-overview-sidebar-design.md` — read it before starting if anything below is unclear.
- **No test runner exists in this project** (confirmed: no `test` script, no jest/vitest/@testing-library in `package.json`). Verification for every task is: `npx tsc --noEmit` (must be clean — this project has zero tolerance for new type errors), `npm run lint` (must show no _new_ errors — 6 pre-existing errors in unrelated files are expected and must be ignored, not "fixed"), and a manual/visual check once a component is reachable in the running app (dev server + browser, Playwright MCP tools if available).
- **Do NOT run any git commands that mutate state** — no `commit`, `push`, `stash`, ever, at any step. The user owns all git operations in this project. Skip any "Commit" step a generic template might suggest.
- **Component convention (already established in this codebase):** every component renders exactly one output (two only if one is a loading state). If a component's render logic would branch into multiple structurally different outputs, split it into a dispatcher + leaf components, each in its own folder. Consts/types/utils always live in their own files, never inlined in the component file. Match the existing per-folder shape: `Component.tsx` + `types.ts` + `consts.ts`/`utils.ts` as needed + `index.ts` barrel export (check a few existing folders like `app/dashboard/_components/DashboardHome/components/HeroCard/components/StatPill/` for the exact barrel-export convention before writing your first file).
- **Icons:** lucide-react only, this project's sole icon library. Match stroke weight to nearby text weight (default lucide `strokeWidth={2}` is this project's baseline).
- **Colors/tokens:** use this project's existing semantic Tailwind classes (`bg-primary`, `text-muted-foreground`, `bg-success`, etc. — see `app/globals.css` for the full token list) — never hardcode a hex/rgb color.
- **`cn()` helper** lives at `@/lib/utils/utils` (not `@/lib/utils`).

---

### Task 1: Shared types, mock data, and initials helper

**Files:**

- Create: `app/dashboard/_components/DashboardHome/components/PlayerOverview/types.ts`
- Create: `app/dashboard/_components/DashboardHome/components/PlayerOverview/consts.ts`
- Create: `app/dashboard/_components/DashboardHome/components/PlayerOverview/utils.ts`

**Interfaces:**

- Produces: `PreferredSide` (`"forehand" | "backhand"`), `MatchResult` (`"W" | "L"`), `PlayerStyle` (`{ preferredSide: PreferredSide }`), `PartnerSummary` (`{ name: string; avatarUrl: string | null; timesPlayedTogether: number; lastPlayedLabel: string }`), `PerformanceSummary` (`{ tournamentsWon: number; tournamentsPlayed: number; preferredPosition: PreferredSide; latestTournamentName: string; latestResults: MatchResult[] }`) — all exported from `types.ts`.
- Produces: `MOCK_PLAYER_STYLE: PlayerStyle`, `MOCK_LATEST_PARTNER: PartnerSummary`, `MOCK_PERFORMANCE: PerformanceSummary` — exported from `consts.ts`.
- Produces: `getInitials(name: string): string` — exported from `utils.ts`.

- [ ] **Step 1: Write `types.ts`**

```ts
export type PreferredSide = "forehand" | "backhand";

export type MatchResult = "W" | "L";

export type PlayerStyle = {
  preferredSide: PreferredSide;
};

export type PartnerSummary = {
  name: string;
  avatarUrl: string | null;
  timesPlayedTogether: number;
  lastPlayedLabel: string;
};

export type PerformanceSummary = {
  tournamentsWon: number;
  tournamentsPlayed: number;
  preferredPosition: PreferredSide;
  latestTournamentName: string;
  latestResults: MatchResult[];
};
```

- [ ] **Step 2: Write `consts.ts`**

```ts
import type { PartnerSummary, PerformanceSummary, PlayerStyle } from "./types";

// Placeholder data — this app has no backend concept yet for preferred
// side, doubles partners, or tournaments/matches (confirmed against
// prisma/schema.prisma: Reservation tracks a single booking user only,
// no Tournament/Match model exists). See
// docs/superpowers/specs/2026-08-01-player-overview-sidebar-design.md.
// Replace with real data once those features exist — the shape here is
// deliberately close to what a real API response would look like.

export const MOCK_PLAYER_STYLE: PlayerStyle = {
  preferredSide: "forehand",
};

export const MOCK_LATEST_PARTNER: PartnerSummary = {
  name: "Sofía Martínez",
  avatarUrl: null,
  timesPlayedTogether: 5,
  lastPlayedLabel: "3 days ago",
};

export const MOCK_PERFORMANCE: PerformanceSummary = {
  tournamentsWon: 5,
  tournamentsPlayed: 12,
  preferredPosition: "forehand",
  latestTournamentName: "Summer Open 2026",
  latestResults: ["W", "W", "L", "W"],
};
```

- [ ] **Step 3: Write `utils.ts`**

```ts
export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: clean, no new errors (these are plain data/type files with no external dependencies, should be trivially correct).

---

### Task 2: Extract the existing search/bento grid into `SearchableCardsGrid`

This is a **pure refactor** — the exact current JSX/logic moves into a new component, parameterized by `role`/`query` instead of computing them inline. Zero visual or behavioral change. Do this before touching anything else so the risky part of the final integration (Task 12) is as small as possible.

Read `app/dashboard/_components/DashboardHome/DashboardHome.tsx` in full first to confirm it still matches what's described below (it may have shifted slightly).

**Files:**

- Create: `app/dashboard/_components/DashboardHome/components/SearchableCardsGrid/types.ts`
- Create: `app/dashboard/_components/DashboardHome/components/SearchableCardsGrid/consts.ts`
- Create: `app/dashboard/_components/DashboardHome/components/SearchableCardsGrid/SearchableCardsGrid.tsx`
- Create: `app/dashboard/_components/DashboardHome/components/SearchableCardsGrid/index.ts`
- Modify: `app/dashboard/_components/DashboardHome/DashboardHome.tsx`

**Interfaces:**

- Produces: `SearchableCardsGrid({ role, query }: { role: SystemRole; query: string }): JSX.Element` — the sole export, used directly by `DashboardHome.tsx` in this task and again in Task 12.

- [ ] **Step 1: Write `types.ts`**

```ts
import type { ComponentType } from "react";
import type { SystemRole } from "@/providers/auth-provider";

export type CardProps = { role: SystemRole; className?: string };

export type SearchableCardDefinition = {
  key: string;
  title: string;
  Component: ComponentType<CardProps>;
};

export type SearchableCardsGridProps = {
  role: SystemRole;
  query: string;
};
```

- [ ] **Step 2: Write `consts.ts`**

```ts
import { SkillOverviewCard } from "../SkillOverviewCard";
import { SessionLoadCard } from "../SessionLoadCard";
import { ProgressGoalsCard } from "../ProgressGoalsCard";
import { ScheduleCard } from "../ScheduleCard";
import type { SearchableCardDefinition } from "./types";

// HeroCard is excluded — it's a CTA banner with no title text, so it can
// never match a search term.
export const SEARCHABLE_CARDS: SearchableCardDefinition[] = [
  {
    key: "skillOverview",
    title: "Skill Overview",
    Component: SkillOverviewCard,
  },
  { key: "sessionLoad", title: "Session Load", Component: SessionLoadCard },
  {
    key: "progressGoals",
    title: "Progress & Goals",
    Component: ProgressGoalsCard,
  },
  { key: "schedule", title: "Schedule", Component: ScheduleCard },
];
```

- [ ] **Step 3: Write `SearchableCardsGrid.tsx`**

This is the existing `AnimatePresence`/`motion.div` block from `DashboardHome.tsx`, moved verbatim, with `normalizedQuery`/`isFiltering`/`matches` now computed from the `query` prop instead of local state.

```tsx
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { HeroCard } from "../HeroCard";
import { SkillOverviewCard } from "../SkillOverviewCard";
import { SessionLoadCard } from "../SessionLoadCard";
import { ProgressGoalsCard } from "../ProgressGoalsCard";
import { ScheduleCard } from "../ScheduleCard";
import { SEARCHABLE_CARDS } from "./consts";
import type { SearchableCardsGridProps } from "./types";

export function SearchableCardsGrid({ role, query }: SearchableCardsGridProps) {
  const normalizedQuery = query.trim().toLowerCase();
  const isFiltering = normalizedQuery.length > 0;
  const matches = SEARCHABLE_CARDS.filter((card) =>
    card.title.toLowerCase().includes(normalizedQuery),
  );

  return (
    <AnimatePresence mode="wait" initial={false}>
      {isFiltering ? (
        matches.length > 0 ? (
          <motion.div
            key="filtered"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="grid auto-rows-min grid-cols-1 content-start gap-3 overflow-y-auto sm:grid-cols-2 lg:min-h-0 lg:flex-1 lg:grid-cols-3 lg:gap-4"
          >
            <AnimatePresence mode="popLayout">
              {matches.map(({ key, Component }) => (
                <motion.div
                  key={key}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                >
                  <Component role={role} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center justify-center py-8 text-sm text-muted-foreground lg:flex-1"
          >
            No cards match &ldquo;{query}&rdquo;.
          </motion.div>
        )
      ) : (
        <motion.div
          key="bento"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="grid grid-cols-1 gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-3 lg:grid-rows-[minmax(max-content,1fr)_minmax(max-content,1fr)] lg:gap-4 lg:overflow-y-auto"
        >
          <HeroCard role={role} className="lg:col-span-2" />
          <SkillOverviewCard role={role} />
          <div className="flex min-h-0 flex-col gap-3 lg:gap-4">
            <SessionLoadCard role={role} className="lg:min-h-52 lg:flex-1" />
            <ProgressGoalsCard role={role} className="lg:min-h-0 lg:flex-1" />
          </div>
          <ScheduleCard role={role} className="lg:col-span-2" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

**Important:** before writing this file, re-read the CURRENT `DashboardHome.tsx` and diff it mentally against the block above — if anything differs (e.g. a className changed since this plan was written), preserve the CURRENT version's exact classes/props, not this plan's snapshot. The goal is byte-for-byte behavioral equivalence, not matching this plan literally if the source has moved on.

- [ ] **Step 4: Write `index.ts`**

```ts
export { SearchableCardsGrid } from "./SearchableCardsGrid";
```

(Check an existing folder's `index.ts`, e.g. `HeroCard/components/StatPill/index.ts`, to confirm this barrel-export style matches the established convention before finalizing.)

- [ ] **Step 5: Update `DashboardHome.tsx`**

Remove the now-extracted `SEARCHABLE_CARDS`/`CardProps` type, the `motion`/`AnimatePresence` imports (no longer needed here), the individual card imports (`HeroCard`, `SkillOverviewCard`, `SessionLoadCard`, `ProgressGoalsCard`, `ScheduleCard` — no longer used directly in this file), and the `normalizedQuery`/`isFiltering`/`matches` computation. Replace the whole `<AnimatePresence>...</AnimatePresence>` JSX block with:

```tsx
<SearchableCardsGrid role={role} query={query} />
```

Add the import: `import { SearchableCardsGrid } from "./components/SearchableCardsGrid";`

The resulting file should look like:

```tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { tennisBall, tennisCourt } from "@/assets/icons";
import { SearchableCardsGrid } from "./components/SearchableCardsGrid";

export function DashboardHome() {
  const { user, loading } = useAuth();
  const [query, setQuery] = useState("");

  if (loading || !user || !user.role) return null;

  const name = user.displayName ?? user.email ?? "";
  const role = user.role;

  return (
    <div className="flex flex-col gap-3 lg:h-full">
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          Welcome{name && `, ${name}`}
          {role === "owner" ? (
            <Image src={tennisCourt.default} alt="" className="h-4.5 w-4.5" />
          ) : (
            <Image src={tennisBall.default} alt="" className="h-4.5 w-4.5" />
          )}
        </h1>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search cards…"
              className="w-48 pl-8 sm:w-64"
            />
          </div>
          {role === "owner" && (
            <Button asChild size="sm">
              <Link href="/dashboard/settings/club">
                <Sparkles className="h-4 w-4" />
                Upgrade
              </Link>
            </Button>
          )}
        </div>
      </div>

      <SearchableCardsGrid role={role} query={query} />
    </div>
  );
}
```

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit` — expect clean.
Run: `npm run lint` — expect only the 6 pre-existing unrelated errors, nothing new.
Manual check: start the dev server if not already running, open `/dashboard` in a browser as a player, confirm the bento grid renders exactly as before (all 5 cards, correct layout), then type into the search box and confirm filtering still works (matching cards animate in, "No cards match" appears for a nonsense query, clearing the box restores the bento grid). This is the most important manual check in the whole plan — it proves the extraction didn't change anything before we build on top of it.

---

### Task 3: `PadelSideDiagram`

**Files:**

- Create: `app/dashboard/_components/DashboardHome/components/PlayerOverview/components/PlayerStyleSection/components/PadelSideDiagram/PadelSideDiagram.tsx`
- Create: `.../PadelSideDiagram/types.ts`
- Create: `.../PadelSideDiagram/index.ts`

**Interfaces:**

- Consumes: `PreferredSide` from `../../../../types` (i.e. `PlayerOverview/types.ts`).
- Produces: `PadelSideDiagram({ side, className }: PadelSideDiagramProps): JSX.Element`.

- [ ] **Step 1: Write `types.ts`**

```ts
import type { PreferredSide } from "../../../../types";

export type PadelSideDiagramProps = {
  side: PreferredSide;
  className?: string;
};
```

- [ ] **Step 2: Write `PadelSideDiagram.tsx`**

A simple top-down court: outer rect (muted fill, bordered), one half tinted with the primary color depending on side, a vertical center line, and a dashed horizontal line suggesting the net. Forehand → right half highlighted; backhand → left half highlighted (this mapping is a real assumption — the user has already been told this and agreed to review it once built).

```tsx
import { cn } from "@/lib/utils/utils";
import type { PadelSideDiagramProps } from "./types";

export function PadelSideDiagram({ side, className }: PadelSideDiagramProps) {
  const isRightSide = side === "forehand";

  return (
    <svg
      viewBox="0 0 120 90"
      className={cn("shrink-0", className)}
      role="img"
      aria-label={
        side === "forehand"
          ? "Preferred side: forehand (right side of the court)"
          : "Preferred side: backhand (left side of the court)"
      }
    >
      <rect
        x="2"
        y="2"
        width="116"
        height="86"
        rx="6"
        className="fill-muted stroke-border"
        strokeWidth="2"
      />
      <rect
        x={isRightSide ? "61" : "2"}
        y="2"
        width="57"
        height="86"
        rx="4"
        className="fill-primary/20"
      />
      <line
        x1="60"
        y1="2"
        x2="60"
        y2="88"
        className="stroke-border"
        strokeWidth="1.5"
      />
      <line
        x1="2"
        y1="45"
        x2="118"
        y2="45"
        className="stroke-border"
        strokeWidth="1"
        strokeDasharray="3 3"
      />
    </svg>
  );
}
```

- [ ] **Step 3: Write `index.ts`**

```ts
export { PadelSideDiagram } from "./PadelSideDiagram";
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` — expect clean. This component isn't mounted anywhere yet, so no visual check is possible until Task 5; re-read the file once more against the spec (court diagram, correct side highlighted) as a self-check.

---

### Task 4: `LatestPartnerCard`

**Files:**

- Create: `.../PlayerStyleSection/components/LatestPartnerCard/LatestPartnerCard.tsx`
- Create: `.../LatestPartnerCard/types.ts`
- Create: `.../LatestPartnerCard/index.ts`

**Interfaces:**

- Consumes: `PartnerSummary` from `../../../../types`; `getInitials` from `../../../../utils`.
- Produces: `LatestPartnerCard({ partner }: LatestPartnerCardProps): JSX.Element`.

- [ ] **Step 1: Write `types.ts`**

```ts
import type { PartnerSummary } from "../../../../types";

export type LatestPartnerCardProps = {
  partner: PartnerSummary;
};
```

- [ ] **Step 2: Write `LatestPartnerCard.tsx`**

```tsx
import { ChevronRight } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getInitials } from "../../../../utils";
import type { LatestPartnerCardProps } from "./types";

export function LatestPartnerCard({ partner }: LatestPartnerCardProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-lg border border-border p-2 text-left transition-colors hover:bg-muted/50"
        >
          <Avatar size="sm">
            {partner.avatarUrl && (
              <AvatarImage src={partner.avatarUrl} alt="" />
            )}
            <AvatarFallback>{getInitials(partner.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{partner.name}</p>
            <p className="text-[11px] text-muted-foreground">Latest partner</p>
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="flex items-center gap-3">
          <Avatar size="lg">
            {partner.avatarUrl && (
              <AvatarImage src={partner.avatarUrl} alt="" />
            )}
            <AvatarFallback>{getInitials(partner.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{partner.name}</p>
            <p className="text-xs text-muted-foreground">
              Played together {partner.timesPlayedTogether} times
            </p>
            <p className="text-xs text-muted-foreground">
              Last played {partner.lastPlayedLabel}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          aria-disabled="true"
          disabled
          title="Coming soon"
        >
          View full profile
        </Button>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 3: Write `index.ts`**

```ts
export { LatestPartnerCard } from "./LatestPartnerCard";
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` — expect clean. Note: `Avatar`'s `size` prop is `"default" | "sm" | "lg"` (confirmed by reading `components/ui/avatar.tsx`) — if this type ever changes, `tsc` will catch a mismatch here immediately.

---

### Task 5: `PlayerStyleSection`

Composes Tasks 3 and 4 into the top section.

**Files:**

- Create: `app/dashboard/_components/DashboardHome/components/PlayerOverview/components/PlayerStyleSection/PlayerStyleSection.tsx`
- Create: `.../PlayerStyleSection/types.ts`
- Create: `.../PlayerStyleSection/index.ts`

**Interfaces:**

- Consumes: `PadelSideDiagram` from `./components/PadelSideDiagram` (Task 3); `LatestPartnerCard` from `./components/LatestPartnerCard` (Task 4); `PlayerStyle`/`PartnerSummary` from `../../types`.
- Produces: `PlayerStyleSection({ playerStyle, partner }: PlayerStyleSectionProps): JSX.Element`.

- [ ] **Step 1: Write `types.ts`**

```ts
import type { PartnerSummary, PlayerStyle } from "../../types";

export type PlayerStyleSectionProps = {
  playerStyle: PlayerStyle;
  partner: PartnerSummary;
};
```

- [ ] **Step 2: Write `PlayerStyleSection.tsx`**

```tsx
import { PadelSideDiagram } from "./components/PadelSideDiagram";
import { LatestPartnerCard } from "./components/LatestPartnerCard";
import type { PlayerStyleSectionProps } from "./types";

export function PlayerStyleSection({
  playerStyle,
  partner,
}: PlayerStyleSectionProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <PadelSideDiagram
          side={playerStyle.preferredSide}
          className="h-16 w-24"
        />
        <div>
          <p className="text-xs text-muted-foreground">Preferred side</p>
          <p className="text-sm font-semibold capitalize">
            {playerStyle.preferredSide}
          </p>
        </div>
      </div>
      <LatestPartnerCard partner={partner} />
    </div>
  );
}
```

- [ ] **Step 3: Write `index.ts`**

```ts
export { PlayerStyleSection } from "./PlayerStyleSection";
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` — expect clean.

---

### Task 6: `TournamentRecord`

**Files:**

- Create: `.../PerformanceSummarySection/components/TournamentRecord/TournamentRecord.tsx`
- Create: `.../TournamentRecord/types.ts`
- Create: `.../TournamentRecord/index.ts`

**Interfaces:**

- Consumes: `StatValue` from `@/components/StatValue` (built during this session's earlier duplication-consolidation pass — `variant: "pill" | "stacked" | "row" | "inline"`, `label: string`, `value: string`).
- Produces: `TournamentRecord({ won, played }: TournamentRecordProps): JSX.Element`.

- [ ] **Step 1: Write `types.ts`**

```ts
export type TournamentRecordProps = {
  won: number;
  played: number;
};
```

- [ ] **Step 2: Write `TournamentRecord.tsx`**

Uses lucide's `Trophy` icon as the "cup" visual accent (keeps the app's one-icon-library convention rather than hand-authoring custom art).

```tsx
import { Trophy } from "lucide-react";
import { StatValue } from "@/components/StatValue";
import type { TournamentRecordProps } from "./types";

export function TournamentRecord({ won, played }: TournamentRecordProps) {
  return (
    <div className="flex items-center gap-2">
      <Trophy className="size-4 shrink-0 text-primary" />
      <StatValue
        variant="stacked"
        label="Tournaments"
        value={`${won}/${played}`}
      />
    </div>
  );
}
```

- [ ] **Step 3: Write `index.ts`**

```ts
export { TournamentRecord } from "./TournamentRecord";
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` — expect clean. Confirm `@/components/StatValue`'s exported prop type actually accepts `variant="stacked"` plus `label`/`value` strings (it does, per this session's earlier work — `tsc` will fail loudly here if that's ever changed).

---

### Task 7: `LatestTournamentResults`

**Files:**

- Create: `.../PerformanceSummarySection/components/LatestTournamentResults/LatestTournamentResults.tsx`
- Create: `.../LatestTournamentResults/types.ts`
- Create: `.../LatestTournamentResults/index.ts`

**Interfaces:**

- Consumes: `MatchResult` from `../../../../types`; `cn` from `@/lib/utils/utils`.
- Produces: `LatestTournamentResults({ tournamentName, results }: LatestTournamentResultsProps): JSX.Element`.

- [ ] **Step 1: Write `types.ts`**

```ts
import type { MatchResult } from "../../../../types";

export type LatestTournamentResultsProps = {
  tournamentName: string;
  results: MatchResult[];
};
```

- [ ] **Step 2: Write `LatestTournamentResults.tsx`**

```tsx
import { cn } from "@/lib/utils/utils";
import type { LatestTournamentResultsProps } from "./types";

export function LatestTournamentResults({
  tournamentName,
  results,
}: LatestTournamentResultsProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="truncate text-xs text-muted-foreground">{tournamentName}</p>
      <div className="flex gap-1">
        {results.map((result, index) => (
          <span
            key={index}
            className={cn(
              "flex size-5 items-center justify-center rounded-full text-[10px] font-semibold",
              result === "W"
                ? "bg-success text-success-foreground"
                : "bg-destructive text-white",
            )}
          >
            {result}
          </span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write `index.ts`**

```ts
export { LatestTournamentResults } from "./LatestTournamentResults";
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` — expect clean. Confirm `bg-success`/`text-success-foreground` are real tokens (check `app/globals.css` — they were added during this session's earlier whole-app-polish pass).

---

### Task 8: `PerformanceSummarySection`

Composes Tasks 6 and 7, plus a preferred-position `Badge`.

**Files:**

- Create: `app/dashboard/_components/DashboardHome/components/PlayerOverview/components/PerformanceSummarySection/PerformanceSummarySection.tsx`
- Create: `.../PerformanceSummarySection/types.ts`
- Create: `.../PerformanceSummarySection/index.ts`

**Interfaces:**

- Consumes: `TournamentRecord` (Task 6), `LatestTournamentResults` (Task 7), `Badge` from `@/components/ui/badge`, `PerformanceSummary` from `../../types`.
- Produces: `PerformanceSummarySection({ performance }: PerformanceSummarySectionProps): JSX.Element`.

- [ ] **Step 1: Write `types.ts`**

```ts
import type { PerformanceSummary } from "../../types";

export type PerformanceSummarySectionProps = {
  performance: PerformanceSummary;
};
```

- [ ] **Step 2: Write `PerformanceSummarySection.tsx`**

```tsx
import { Badge } from "@/components/ui/badge";
import { TournamentRecord } from "./components/TournamentRecord";
import { LatestTournamentResults } from "./components/LatestTournamentResults";
import type { PerformanceSummarySectionProps } from "./types";

export function PerformanceSummarySection({
  performance,
}: PerformanceSummarySectionProps) {
  return (
    <div className="flex flex-col gap-3 border-t border-border pt-3">
      <div className="flex flex-wrap items-center gap-3">
        <TournamentRecord
          won={performance.tournamentsWon}
          played={performance.tournamentsPlayed}
        />
        <Badge variant="outline" className="capitalize">
          {performance.preferredPosition}
        </Badge>
      </div>
      <LatestTournamentResults
        tournamentName={performance.latestTournamentName}
        results={performance.latestResults}
      />
    </div>
  );
}
```

- [ ] **Step 3: Write `index.ts`**

```ts
export { PerformanceSummarySection } from "./PerformanceSummarySection";
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` — expect clean.

---

### Task 9: `PlayerOverviewContent`

Composes Task 5 and Task 8 — the shared core reused by both the desktop card and the mobile sheet.

**Files:**

- Create: `app/dashboard/_components/DashboardHome/components/PlayerOverview/PlayerOverviewContent/PlayerOverviewContent.tsx`
- Create: `.../PlayerOverviewContent/index.ts`

**Interfaces:**

- Consumes: `PlayerStyleSection` (Task 5), `PerformanceSummarySection` (Task 8), `MOCK_PLAYER_STYLE`/`MOCK_LATEST_PARTNER`/`MOCK_PERFORMANCE` (Task 1).
- Produces: `PlayerOverviewContent(): JSX.Element` — no props; reads mock data directly (per the spec's explicit UI-first/no-props-layer decision — this is the one file that will change when real data arrives).

- [ ] **Step 1: Write `PlayerOverviewContent.tsx`**

```tsx
import { PlayerStyleSection } from "../components/PlayerStyleSection";
import { PerformanceSummarySection } from "../components/PerformanceSummarySection";
import {
  MOCK_LATEST_PARTNER,
  MOCK_PERFORMANCE,
  MOCK_PLAYER_STYLE,
} from "../consts";

export function PlayerOverviewContent() {
  return (
    <div className="flex flex-col gap-4">
      <PlayerStyleSection
        playerStyle={MOCK_PLAYER_STYLE}
        partner={MOCK_LATEST_PARTNER}
      />
      <PerformanceSummarySection performance={MOCK_PERFORMANCE} />
    </div>
  );
}
```

- [ ] **Step 2: Write `index.ts`**

```ts
export { PlayerOverviewContent } from "./PlayerOverviewContent";
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` — expect clean.

---

### Task 10: `PlayerOverviewCard` (desktop shell)

**Files:**

- Create: `app/dashboard/_components/DashboardHome/components/PlayerOverview/PlayerOverviewCard/PlayerOverviewCard.tsx`
- Create: `.../PlayerOverviewCard/types.ts`
- Create: `.../PlayerOverviewCard/index.ts`

**Interfaces:**

- Consumes: `PlayerOverviewContent` (Task 9); `Card`/`CardHeader`/`CardTitle`/`CardContent` from `@/components/ui/card`.
- Produces: `PlayerOverviewCard({ className }: PlayerOverviewCardProps): JSX.Element` — hidden below `lg:`, visible at `lg:` and up.

- [ ] **Step 1: Write `types.ts`**

```ts
export type PlayerOverviewCardProps = {
  className?: string;
};
```

- [ ] **Step 2: Write `PlayerOverviewCard.tsx`**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/utils";
import { PlayerOverviewContent } from "../PlayerOverviewContent";
import type { PlayerOverviewCardProps } from "./types";

export function PlayerOverviewCard({ className }: PlayerOverviewCardProps) {
  return (
    <Card className={cn("hidden rounded-2xl lg:block", className)}>
      <CardHeader>
        <CardTitle>Player Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <PlayerOverviewContent />
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Write `index.ts`**

```ts
export { PlayerOverviewCard } from "./PlayerOverviewCard";
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` — expect clean. Not yet mounted anywhere reachable; visual check happens in Task 12.

---

### Task 11: `PlayerOverviewBanner` (mobile shell)

**Files:**

- Create: `.../PlayerOverviewBanner/components/BannerPreview/BannerPreview.tsx`
- Create: `.../BannerPreview/types.ts`
- Create: `.../BannerPreview/index.ts`
- Create: `app/dashboard/_components/DashboardHome/components/PlayerOverview/PlayerOverviewBanner/PlayerOverviewBanner.tsx`
- Create: `.../PlayerOverviewBanner/types.ts`
- Create: `.../PlayerOverviewBanner/index.ts`

**Interfaces:**

- Consumes: `PlayerOverviewContent` (Task 9); `getInitials` (Task 1); `MOCK_LATEST_PARTNER` (Task 1); `Sheet`/`SheetContent`/`SheetHeader`/`SheetTitle` from `@/components/ui/sheet`; `Avatar`/`AvatarFallback` from `@/components/ui/avatar`.
- Produces: `BannerPreview({ partnerInitials }: BannerPreviewProps): JSX.Element`; `PlayerOverviewBanner({ className }: PlayerOverviewBannerProps): JSX.Element` — visible below `lg:`, hidden at `lg:` and up, owns its own Sheet open/close state.

- [ ] **Step 1: Write `BannerPreview/types.ts`**

```ts
export type BannerPreviewProps = {
  partnerInitials: string;
};
```

- [ ] **Step 2: Write `BannerPreview/BannerPreview.tsx`**

```tsx
import { ChevronRight, LayoutGrid } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { BannerPreviewProps } from "./types";

export function BannerPreview({ partnerInitials }: BannerPreviewProps) {
  return (
    <div className="flex w-full items-center gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <LayoutGrid className="size-4" />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="text-sm font-medium">Your player overview</p>
        <p className="truncate text-xs text-muted-foreground">
          Preferred side, partner &amp; stats
        </p>
      </div>
      <Avatar size="sm">
        <AvatarFallback>{partnerInitials}</AvatarFallback>
      </Avatar>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </div>
  );
}
```

- [ ] **Step 3: Write `BannerPreview/index.ts`**

```ts
export { BannerPreview } from "./BannerPreview";
```

- [ ] **Step 4: Write `PlayerOverviewBanner/types.ts`**

```ts
export type PlayerOverviewBannerProps = {
  className?: string;
};
```

- [ ] **Step 5: Write `PlayerOverviewBanner/PlayerOverviewBanner.tsx`**

Owns its own `open` state (a plain `useState` — no async mutation/pending state is involved here, so the `useGuardedDialogClose` hook from this session's earlier consolidation work does not apply).

```tsx
"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils/utils";
import { getInitials } from "../utils";
import { MOCK_LATEST_PARTNER } from "../consts";
import { PlayerOverviewContent } from "../PlayerOverviewContent";
import { BannerPreview } from "./components/BannerPreview";
import type { PlayerOverviewBannerProps } from "./types";

export function PlayerOverviewBanner({ className }: PlayerOverviewBannerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center rounded-2xl border border-border bg-card p-3 lg:hidden",
          className,
        )}
      >
        <BannerPreview
          partnerInitials={getInitials(MOCK_LATEST_PARTNER.name)}
        />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Player Overview</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto px-4 pb-4">
            <PlayerOverviewContent />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
```

- [ ] **Step 6: Write `PlayerOverviewBanner/index.ts`**

```ts
export { PlayerOverviewBanner } from "./PlayerOverviewBanner";
```

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit` — expect clean. Confirm `SheetContent`'s `side` prop accepts `"bottom"` (it does — `"top" | "right" | "bottom" | "left"`, confirmed by reading `components/ui/sheet.tsx`).

---

### Task 12: Wire everything into `DashboardHome.tsx`

**Files:**

- Modify: `app/dashboard/_components/DashboardHome/DashboardHome.tsx`

**Interfaces:**

- Consumes: `PlayerOverviewCard` (Task 10), `PlayerOverviewBanner` (Task 11), `SearchableCardsGrid` (Task 2, unchanged).

- [ ] **Step 1: Add imports**

```tsx
import { PlayerOverviewCard } from "./components/PlayerOverview/PlayerOverviewCard";
import { PlayerOverviewBanner } from "./components/PlayerOverview/PlayerOverviewBanner";
```

- [ ] **Step 2: Replace the single `<SearchableCardsGrid role={role} query={query} />` line with the role-conditional layout**

```tsx
{
  role === "player" ? (
    <div className="grid grid-cols-1 gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_2fr] lg:gap-4">
      <PlayerOverviewCard />
      <PlayerOverviewBanner />
      <SearchableCardsGrid role={role} query={query} />
    </div>
  ) : (
    <SearchableCardsGrid role={role} query={query} />
  );
}
```

Note why this works without modifying `SearchableCardsGrid` at all: its own `lg:min-h-0 lg:flex-1` classes matter when it's a _direct flex child_ of the root `flex flex-col` (the owner branch, unchanged) — in the player branch it becomes a CSS Grid item instead, where those flex-specific classes are simply inert (grid items ignore `flex-*` utilities), and the grid's default `align-items: stretch` naturally makes it match `PlayerOverviewCard`'s height, satisfying the original ask that "this card should be positioned on the right side... aligned horizontally with the right card (same height level)." No new bug, no wasted classes causing harm — just a set of classes that only apply in one of the two contexts it's now used in.

`PlayerOverviewCard` and `PlayerOverviewBanner` handle their own responsive visibility internally (`hidden lg:block` / `lg:hidden` baked into each component) — no extra wrapper classes needed here.

- [ ] **Step 3: Verify — typecheck and lint**

Run: `npx tsc --noEmit` — expect clean.
Run: `npm run lint` — expect only the 6 pre-existing unrelated errors.

- [ ] **Step 4: Verify — visual, desktop**

Start the dev server if not running. Open `/dashboard` as a **player** account at a `lg:`-and-up viewport width (e.g. 1440×900). Confirm:

- A "Player Overview" card appears on the left, roughly the same height as the content on the right.
- Top section shows the court diagram (right half tinted, since `MOCK_PLAYER_STYLE.preferredSide` is `"forehand"`) next to "Preferred side / Forehand", and a "Sofía Martínez / Latest partner" row below it.
- Clicking the partner row opens a popover with a larger avatar, "Played together 5 times", "Last played 3 days ago", and a disabled "View full profile" button.
- Bottom section (below a divider) shows a trophy icon + "Tournaments / 5/12", a "Forehand" badge, and 4 small W/W/L/W circles labeled "Summer Open 2026".
- The right column still shows the existing bento grid, and the search box still filters it exactly as it did before this task.

- [ ] **Step 5: Verify — visual, mobile and owner**

Resize to a mobile width (e.g. 390×844). Confirm the desktop card is gone and a compact banner ("Your player overview" + tiny avatar + chevron) appears above the bento grid; tapping it opens a bottom sheet with the same content as the desktop card.

Switch to (or check with) an **owner** account. Confirm the Dashboard Home looks exactly as it did before this whole plan — no Player Overview card or banner anywhere, same single-column bento grid.

---

## Self-Review Notes

- **Spec coverage:** every section of the design doc (layout/responsive behavior, component tree, court diagram + partner popover, performance stats + trophy icon, mock data, owner-unaffected, `layout.tsx`-untouched) maps to a task above.
- **No placeholders:** every step has real, complete code — no `// TODO`, no "add appropriate styling," no unshown test code (there is no test runner in this project, so "tests" are the `tsc`/lint/manual-check triad stated in Global Constraints, applied identically and explicitly per task rather than invented per-task pytest-style snippets that would not reflect this codebase's reality).
- **Type consistency:** `PreferredSide`/`MatchResult`/`PlayerStyle`/`PartnerSummary`/`PerformanceSummary` are defined once in Task 1 and only ever imported, never redefined, across Tasks 3–11. `StatValue`'s `variant`/`label`/`value` props (Task 6) match its actual existing signature from this session's earlier work. `SearchableCardsGrid`'s `{ role, query }` props (Task 2) are used identically in both call sites created by Task 12.
