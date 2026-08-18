# Dashboard Visual Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the authenticated dashboard's light mode (the default) feel as branded as the landing page, and give the two emptiest secondary views (Browse Courts, Players) real visual content instead of near-blank chrome.

**Architecture:** Two independent phases. Phase 1 is token/detail-only changes to existing dashboard components (accent color placement, one shadow value, one empty-state heading) — no new components, no layout changes. Phase 2 replaces two specific pieces of UI (`ClubPicker`'s bare `<Select>`, `PlayersDirectory`'s bare-pill list) with new card-based components, following the project's existing SRP file-structure convention and the `OptionCard` component as the reference pattern for selectable cards.

**Tech Stack:** Next.js 16, React 19, Tailwind v4 (CSS-variable theme in `app/globals.css`), shadcn/radix-ui primitives, TanStack Query.

**Source spec:** `docs/superpowers/specs/2026-08-11-dashboard-visual-enhancement-design.md`

## Global Constraints

- **No test framework exists in this project** (confirmed via `package.json` — no jest/vitest/playwright-test, no `test` script). This plan's "test cycle" per task is therefore: **typecheck (`npx tsc --noEmit -p .`) + lint (`npm run lint`) + visual verification via Playwright MCP** (navigate to the affected route using the already-authenticated browser session on `http://localhost:3000`, screenshot before and after) — not automated unit tests. Do not attempt to introduce a test framework as part of this plan; that would be an unrelated architectural change outside this spec's scope.
- **Do not run `git commit`.** Per project convention, the user owns all git operations. Each task ends with the working tree left staged-but-uncommitted (or just modified, do not even `git add`) for the user to review and commit themselves. Do not include a "Commit" step's actual command execution — note where a commit boundary would naturally fall, but stop short of running it.
- Follow the existing SRP file-structure convention exactly: `ComponentName.tsx` (render + local state only), `types.ts` (types/interfaces), `consts.ts` (constants), `styles.ts` (className-factory functions, following `app/onboarding/_components/OptionCard/styles.ts`'s exact pattern: `export function getXClassName(...) { return cn(...) }`), `utils.ts` (pure helpers), `index.ts` (barrel, re-exporting only the component, and the type too if consumed externally). Only create the files a component actually needs — don't scaffold empty ones.
- Dev server is expected running at `http://localhost:3000` (`npm run dev`) with an authenticated player-role session already available in the Playwright MCP browser profile (confirmed working in this session — `http://localhost:3000/dashboard` loads directly into the signed-in dashboard, no login step needed).
- A design premise from the spec did not survive contact with the actual code and should NOT be implemented: the spec's "border-radius hierarchy" item (tighten small elements vs. containers) is **dropped**. Inspecting the real components showed the radius scale already varies sensibly — `HeroCard` uses `rounded-sm`, secondary bento cards use `rounded-sm`, chips/badges/pills are already `rounded-full`/render as full pills at their height. There is no uniform-radius bug to fix. No task below touches border-radius.
- The spec mentioned club "location" as potential card content — **`Club` has no location/address field** (confirmed via `core/clubs/types/index.ts`: only `id`, `name`, `legalName`, `taxId`, `email`, `phone`, `logoUrl`, `timezone`, `currency`, `plan`, `status`, `requiresPrepayment`, audit fields). Task 6 below uses `phone` (falling back to `timezone`) as the card's secondary line instead.

---

## Phase 1 — Bring the brand forward

### Task 1: Strengthen the tinted card shadow

**Files:**

- Modify: `app/globals.css:53`

**Interfaces:** None — this is a single CSS custom property value, consumed only by `components/ui/card.tsx:15` via the `shadow-card` utility class (confirmed as the only consumer repo-wide).

- [ ] **Step 1: Screenshot baseline**

Using the Playwright MCP tools, navigate to `http://localhost:3000/dashboard` and take a full-page screenshot. Note how flat/subtle the card shadows currently look (the current value is barely visible: `0 1px 2px` at 4% opacity).

- [ ] **Step 2: Change the shadow value**

In `app/globals.css`, replace line 53:

```css
--shadow-card: 0 1px 2px color-mix(in oklch, var(--surface) 4%, transparent);
```

with a two-layer shadow tinted toward the theme's actual foreground hue (navy in light mode, near-white in dark mode) instead of the nearly-neutral `--surface` token, giving cards real, perceptible depth instead of a barely-visible 1px line:

```css
--shadow-card:
  0 1px 2px color-mix(in oklch, var(--foreground) 6%, transparent),
  0 6px 16px -4px color-mix(in oklch, var(--foreground) 12%, transparent);
```

- [ ] **Step 3: Verify types and lint**

Run: `npx tsc --noEmit -p .`
Expected: no errors (this is a CSS-only change; typecheck should be unaffected — run it anyway to confirm nothing else broke).

Run: `npm run lint`
Expected: no new errors/warnings.

- [ ] **Step 4: Screenshot and compare, in both themes**

Navigate to `http://localhost:3000/dashboard`, screenshot. Confirm cards now show a visible, soft, navy-tinted shadow (not a harsh black shadow, not imperceptible). Click the theme toggle, screenshot again — confirm the shadow now tints toward the light dark-mode foreground color and still reads as soft depth, not a harsh light glow.

- [ ] **Step 5: Stop for review (do not commit)**

---

### Task 2: Accent the "today" indicator in the dashboard calendar

**Files:**

- Modify: `app/dashboard/_components/DashboardHome/components/ScheduleCard/components/MarkedCalendar/MarkedCalendar.tsx`

**Interfaces:** None — purely a className change inside the existing `DayButton` render function; no prop/type changes.

- [ ] **Step 1: Screenshot baseline**

Navigate to `http://localhost:3000/dashboard`, screenshot the Schedule card's calendar. Note today's date cell currently shows a navy ring (`ring-primary`) — visually similar to the rest of the navy-dominated light-mode UI, not distinct.

- [ ] **Step 2: Change the ring color**

In `MarkedCalendar.tsx`, find this line inside the `DayButton` component override:

```tsx
modifiers.today &&
  "ring-2 ring-primary ring-offset-1 ring-offset-background",
```

Change `ring-primary` to `ring-accent`:

```tsx
modifiers.today &&
  "ring-2 ring-accent ring-offset-1 ring-offset-background",
```

- [ ] **Step 3: Verify types and lint**

Run: `npx tsc --noEmit -p .` — expect no errors.
Run: `npm run lint` — expect no new errors/warnings.

- [ ] **Step 4: Screenshot and compare**

Navigate to `http://localhost:3000/dashboard`, screenshot. Confirm today's date cell now has a yellow ring, distinct from the navy nav/text elsewhere on the page, and confirm the ring is still clearly visible as a ring (not blended into the background) in both light and dark mode.

- [ ] **Step 5: Stop for review (do not commit)**

---

### Task 3: Accent the Skill Overview's key stat value

**Files:**

- Modify: `app/dashboard/_components/DashboardHome/components/SkillOverviewCard/components/PlayerOverview/PlayerOverview.tsx`

**Interfaces:** None — uses `StatValue`'s existing `valueClassName` escape-hatch prop (already defined in `components/StatValue/types.ts`), no changes to `StatValue` itself.

- [ ] **Step 1: Screenshot baseline**

Navigate to `http://localhost:3000/dashboard`, screenshot the Skill Overview card. Note "Category 8 — beginner" currently renders in the default foreground color via `valueClassName="font-semibold"`.

- [ ] **Step 2: Add the accent class**

In `PlayerOverview.tsx`, find:

```tsx
<StatValue
  variant="row"
  label="Skill level"
  value={getPadelCategoryLabel(user?.padelCategory ?? null)}
  valueClassName="font-semibold"
/>
```

Change `valueClassName` to:

```tsx
valueClassName =
  "font-semibold text-accent-foreground bg-accent rounded-full px-2 py-0.5";
```

(This renders the skill-level value as a small yellow chip rather than plain colored text — plain `text-accent` on white background would be a legibility problem, since `--accent` in light mode is `#dffd36`, a bright yellow with poor contrast as text color on white. As a filled chip with `text-accent-foreground` (navy) on `bg-accent` (yellow), contrast is the same navy-on-yellow combination already used correctly elsewhere, e.g. the landing page's CTA button.)

- [ ] **Step 3: Verify types and lint**

Run: `npx tsc --noEmit -p .` — expect no errors.
Run: `npm run lint` — expect no new errors/warnings.

- [ ] **Step 4: Screenshot and compare**

Navigate to `http://localhost:3000/dashboard`, screenshot. Confirm "Category 8 — beginner" now renders as a small yellow chip with navy text, legible, not visually colliding with the card's other content. Toggle dark mode, screenshot, confirm it still reads correctly (dark mode's `--accent` is navy and `--accent-foreground` is light, so the chip should still show correct contrast, just with swapped colors).

- [ ] **Step 5: Stop for review (do not commit)**

---

### Task 4: Accent the Position badge

**Files:**

- Modify: `app/dashboard/_components/DashboardHome/components/PlayerOverview/components/PerformanceSummarySection/PerformanceSummarySection.tsx`

**Interfaces:** None — overrides `Badge`'s className directly at this one call site (the `Badge` component at `components/ui/badge.tsx` already merges a passed `className` after its variant classes via `cn(badgeVariants({ variant }), className)`, so this is a safe, scoped override that doesn't touch the shared primitive or any other `Badge` usage in the app).

- [ ] **Step 1: Screenshot baseline**

Navigate to `http://localhost:3000/dashboard`, screenshot the Player Overview panel. Note the "Position" row's badge ("Forehand") currently renders navy (`bg-primary text-primary-foreground`, the `Badge` default variant) — same navy as most other UI elements.

- [ ] **Step 2: Add the accent override**

In `PerformanceSummarySection.tsx`, find:

```tsx
<Badge>{getPreferredSideLabel(preferredSide)}</Badge>
```

Change to:

```tsx
<Badge className="bg-accent text-accent-foreground [a]:hover:bg-accent/80">
  {getPreferredSideLabel(preferredSide)}
</Badge>
```

(The `[a]:hover:bg-accent/80` matches the same hover-state pattern the `Badge` component's own variants use, e.g. `default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80"` — kept for consistency even though this particular badge isn't a link.)

- [ ] **Step 3: Verify types and lint**

Run: `npx tsc --noEmit -p .` — expect no errors.
Run: `npm run lint` — expect no new errors/warnings.

- [ ] **Step 4: Screenshot and compare**

Navigate to `http://localhost:3000/dashboard`, screenshot. Confirm the Position badge now renders yellow with navy text, distinct from surrounding navy UI. Confirm no other `Badge` usage elsewhere in the app changed (this was a scoped className override, not a change to the shared `Badge` component or its default variant).

- [ ] **Step 5: Stop for review (do not commit)**

---

### Task 5: Give the Skill Overview empty state a heading

**Files:**

- Modify: `app/dashboard/_components/DashboardHome/components/SkillOverviewCard/components/OverviewChart/OverviewChart.tsx`

**Interfaces:** None — adds a new import (`EmptyTitle` from `@/components/ui/empty`, an existing primitive not currently imported in this file) and one new JSX element; no prop/type changes to `OverviewChartProps`.

- [ ] **Step 1: Screenshot baseline**

Navigate to `http://localhost:3000/dashboard`, screenshot the Skill Overview card. Note the empty state (no play history yet) currently shows only a small icon and one line of muted helper text — no heading, feels like a lone icon floating in whitespace.

- [ ] **Step 2: Add the missing title**

In `OverviewChart.tsx`, the current empty-state branch is:

```tsx
if (!hasActivity) {
  return (
    <div className="flex h-24 flex-col items-center justify-center gap-2 text-center">
      <EmptyMedia variant="icon" className="size-8 rounded-full">
        <BarChart3 className="size-4" />
      </EmptyMedia>
      <EmptyDescription className="text-xs">{emptyMessage}</EmptyDescription>
    </div>
  );
}
```

Change the import line at the top of the file from:

```tsx
import { EmptyDescription, EmptyMedia } from "@/components/ui/empty";
```

to:

```tsx
import {
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
```

And change the empty-state branch to:

```tsx
if (!hasActivity) {
  return (
    <div className="flex h-24 flex-col items-center justify-center gap-2 text-center">
      <EmptyMedia variant="icon" className="size-8 rounded-full">
        <BarChart3 className="size-4" />
      </EmptyMedia>
      <EmptyTitle className="text-xs">No patterns yet</EmptyTitle>
      <EmptyDescription className="text-xs">{emptyMessage}</EmptyDescription>
    </div>
  );
}
```

- [ ] **Step 3: Verify types and lint**

Run: `npx tsc --noEmit -p .` — expect no errors.
Run: `npm run lint` — expect no new errors/warnings.

- [ ] **Step 4: Screenshot and compare**

Navigate to `http://localhost:3000/dashboard`, screenshot. Confirm the empty state now shows icon → "No patterns yet" heading → the existing helper description, and still fits within the card without overflow (the container is a fixed `h-24`; confirm the extra line doesn't get clipped — if it does, this step's `h-24` may need to become `h-auto min-h-24` on the outer div, verify visually and adjust if needed before moving on).

- [ ] **Step 5: Stop for review (do not commit)**

---

## Phase 2 — Restructure the empty secondary views

### Task 6: Replace the bare club `<Select>` with a visual club picker

**Files:**

- Create: `app/dashboard/browse/_components/BrowseCourts/components/ClubPicker/components/ClubCard/ClubCard.tsx`
- Create: `app/dashboard/browse/_components/BrowseCourts/components/ClubPicker/components/ClubCard/types.ts`
- Create: `app/dashboard/browse/_components/BrowseCourts/components/ClubPicker/components/ClubCard/styles.ts`
- Create: `app/dashboard/browse/_components/BrowseCourts/components/ClubPicker/components/ClubCard/utils.ts`
- Create: `app/dashboard/browse/_components/BrowseCourts/components/ClubPicker/components/ClubCard/index.ts`
- Modify: `app/dashboard/browse/_components/BrowseCourts/components/ClubPicker/ClubPicker.tsx`
- No change needed: `app/dashboard/browse/_components/BrowseCourts/components/ClubPicker/types.ts` (the `ClubPickerProps` contract — `clubs`, `value`, `onChange`, `isLoading` — stays exactly the same, so `BrowseCourts.tsx` (the parent) needs no changes at all)

**Interfaces:**

- Consumes: `Club` type from `@/core/clubs/types` (fields used: `id`, `name`, `logoUrl?`, `phone?`, `timezone`).
- Produces: `ClubCard` component with props `{ club: Club; selected: boolean; onClick: () => void }` (exported from its `index.ts` as `ClubCard`).

- [ ] **Step 1: Screenshot baseline**

Navigate to `http://localhost:3000/dashboard/browse`, screenshot. Confirm the current state: heading, a bare `<Select>` labeled "Club", and help text — no visual content until a club is picked.

- [ ] **Step 2: Create `ClubCard/types.ts`**

```ts
import type { Club } from "@/core/clubs/types";

export type ClubCardProps = {
  club: Club;
  selected: boolean;
  onClick: () => void;
};
```

- [ ] **Step 3: Create `ClubCard/utils.ts`**

```ts
export function getClubInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}
```

- [ ] **Step 4: Create `ClubCard/styles.ts`**

Following the exact pattern already established in `app/onboarding/_components/OptionCard/styles.ts`:

```ts
import { cn } from "@/lib/utils/utils";

export function getClubCardClassName(selected: boolean) {
  return cn(
    "flex items-center gap-3 rounded-sm border-2 p-3 text-left transition-colors duration-200",
    selected
      ? "border-primary bg-primary/5"
      : "border-border hover:border-muted-foreground/30",
  );
}
```

- [ ] **Step 5: Create `ClubCard/ClubCard.tsx`**

```tsx
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getClubInitials } from "./utils";
import { getClubCardClassName } from "./styles";
import type { ClubCardProps } from "./types";

export function ClubCard({ club, selected, onClick }: ClubCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={getClubCardClassName(selected)}
    >
      <Avatar size="lg">
        {club.logoUrl && <AvatarImage src={club.logoUrl} alt={club.name} />}
        <AvatarFallback>{getClubInitials(club.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 text-left">
        <p className="truncate text-sm font-semibold">{club.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {club.phone ?? club.timezone}
        </p>
      </div>
    </button>
  );
}
```

- [ ] **Step 6: Create `ClubCard/index.ts`**

```ts
export { ClubCard } from "./ClubCard";
```

- [ ] **Step 7: Verify `Avatar`'s `size` prop exists**

Run: `grep -n "size" components/ui/avatar.tsx`
Expected: confirms `Avatar` accepts a `size` prop with a `"lg"` option (already used this way in `components/PlayerProfileCard/PlayerProfileCard.tsx`: `<Avatar size="lg">`). If the prop or `"lg"` value doesn't exist, use whatever size variant `PlayerProfileCard.tsx` actually uses instead — don't guess, match that file exactly.

- [ ] **Step 8: Verify `components/ui/skeleton.tsx` exists**

Run: `test -f components/ui/skeleton.tsx && echo exists`
Expected: `exists` (this component was used earlier in this project's history to fix loading states on `CourtsTable`/`ReservationsTable`/`AuditLogsTable` — confirm it's the same shadcn `Skeleton` primitive before using it in Step 9).

- [ ] **Step 9: Rewrite `ClubPicker.tsx`**

Replace the full current contents of `ClubPicker.tsx`:

```tsx
"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { ClubPickerProps } from "./types";

export function ClubPicker({
  clubs,
  value,
  onChange,
  isLoading,
}: ClubPickerProps) {
  return (
    <div className="flex flex-col gap-1 max-w-xs">
      <Label htmlFor="club-picker">Club</Label>
      <Select
        value={value ?? undefined}
        onValueChange={onChange}
        disabled={isLoading || clubs.length === 0}
      >
        <SelectTrigger id="club-picker">
          <SelectValue
            placeholder={isLoading ? "Loading clubs…" : "Select a club"}
          />
        </SelectTrigger>
        <SelectContent>
          {clubs.map((club) => (
            <SelectItem key={club.id} value={club.id}>
              {club.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

with:

```tsx
"use client";

import { Building2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ClubCard } from "./components/ClubCard";
import type { ClubPickerProps } from "./types";

export function ClubPicker({
  clubs,
  value,
  onChange,
  isLoading,
}: ClubPickerProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Label>Club</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          <Skeleton className="h-16 rounded-sm" />
          <Skeleton className="h-16 rounded-sm" />
        </div>
      </div>
    );
  }

  if (clubs.length === 0) {
    return (
      <Empty>
        <EmptyMedia variant="icon">
          <Building2 />
        </EmptyMedia>
        <EmptyTitle>No clubs available</EmptyTitle>
        <EmptyDescription>
          There are no active clubs to book a court with yet.
        </EmptyDescription>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>Club</Label>
      <div className="grid gap-2 sm:grid-cols-2">
        {clubs.map((club) => (
          <ClubCard
            key={club.id}
            club={club}
            selected={club.id === value}
            onClick={() => onChange(club.id)}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 10: Verify types and lint**

Run: `npx tsc --noEmit -p .`
Expected: no errors. If `Avatar`'s size prop from Step 7 turned out different than `"lg"`, this is where a mismatch would surface — fix `ClubCard.tsx` to match before proceeding.

Run: `npm run lint`
Expected: no new errors/warnings.

- [ ] **Step 11: Screenshot and compare**

Navigate to `http://localhost:3000/dashboard/browse`, screenshot. Confirm: the page now shows a real club card (with initials avatar, since the dev database's club has no `logoUrl`, and its phone or timezone as the secondary line) instead of a bare dropdown. Click the card, confirm `selected` styling applies (border/background change) and the rest of the page (date nav + court availability grid below) still behaves exactly as before — this task must not change anything below the picker.

- [ ] **Step 12: Stop for review (do not commit)**

---

### Task 7: Restructure the Players directory into a card grid

**Files:**

- Create: `app/dashboard/players/_components/PlayersDirectory/components/PlayerCard/PlayerCard.tsx`
- Create: `app/dashboard/players/_components/PlayersDirectory/components/PlayerCard/types.ts`
- Create: `app/dashboard/players/_components/PlayersDirectory/components/PlayerCard/index.ts`
- Modify: `app/dashboard/players/_components/PlayersDirectory/PlayersDirectory.tsx`
- Delete: `app/dashboard/players/_components/PlayersDirectory/components/PlayerRow/PlayerRow.tsx`
- Delete: `app/dashboard/players/_components/PlayersDirectory/components/PlayerRow/types.ts`
- Delete: `app/dashboard/players/_components/PlayersDirectory/components/PlayerRow/index.ts`

**Interfaces:**

- Consumes: `PlayerProfileData` type from `@/components/PlayerProfileCard` (already used by the old `PlayerRow`); `getPadelCategoryLabel` from `@/app/dashboard/_components/DashboardHome/components/SkillOverviewCard/utils`; `getInitials` from `@/app/dashboard/_components/DashboardHome/components/PlayerOverview/utils` (both already imported by the old `PlayerRow.tsx`, confirmed to exist).
- Produces: `PlayerCard` component with props `{ player: PlayerProfileData }` (exported from its `index.ts` as `PlayerCard`) — this is the rename target for every place that imported `PlayerRow`.

- [ ] **Step 1: Screenshot baseline**

Navigate to `http://localhost:3000/dashboard/players`, screenshot. Confirm the current state: full-width bare pills (avatar + name + subtitle), each using roughly two-thirds of the row width with dead space trailing.

- [ ] **Step 2: Create `PlayerCard/types.ts`**

```ts
import type { PlayerProfileData } from "@/components/PlayerProfileCard";

export type PlayerCardProps = {
  player: PlayerProfileData;
};
```

- [ ] **Step 3: Create `PlayerCard/PlayerCard.tsx`**

```tsx
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PlayerProfileCard } from "@/components/PlayerProfileCard";
import { getPadelCategoryLabel } from "@/app/dashboard/_components/DashboardHome/components/SkillOverviewCard/utils";
import { getInitials } from "@/app/dashboard/_components/DashboardHome/components/PlayerOverview/utils";
import type { PlayerCardProps } from "./types";

export function PlayerCard({ player }: PlayerCardProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex flex-col items-center gap-2 rounded-sm border border-border p-4 text-center transition-colors hover:bg-muted/50"
        >
          <Avatar size="lg">
            {player.avatarUrl && (
              <AvatarImage src={player.avatarUrl} alt={player.displayName} />
            )}
            <AvatarFallback>{getInitials(player.displayName)}</AvatarFallback>
          </Avatar>
          <p className="w-full truncate text-sm font-medium">
            {player.displayName}
          </p>
          <Badge variant="outline">
            {getPadelCategoryLabel(player.padelCategory)}
          </Badge>
        </button>
      </DialogTrigger>
      <DialogContent>
        <PlayerProfileCard player={player} />
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Create `PlayerCard/index.ts`**

```ts
export { PlayerCard } from "./PlayerCard";
```

- [ ] **Step 5: Delete the old `PlayerRow` folder**

Delete these 3 files:

- `app/dashboard/players/_components/PlayersDirectory/components/PlayerRow/PlayerRow.tsx`
- `app/dashboard/players/_components/PlayersDirectory/components/PlayerRow/types.ts`
- `app/dashboard/players/_components/PlayersDirectory/components/PlayerRow/index.ts`

- [ ] **Step 6: Update `PlayersDirectory.tsx`**

Change the import line from:

```tsx
import { PlayerRow } from "./components/PlayerRow";
```

to:

```tsx
import { PlayerCard } from "./components/PlayerCard";
```

Change the list-rendering block from:

```tsx
<div className="flex flex-col gap-2">
  {matches.map((player) => (
    <PlayerRow key={player.id} player={player} />
  ))}
</div>
```

to:

```tsx
<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
  {matches.map((player) => (
    <PlayerCard key={player.id} player={player} />
  ))}
</div>
```

- [ ] **Step 7: Grep for any other reference to `PlayerRow`**

Run: `grep -rn "PlayerRow" app/ components/ --include="*.tsx" --include="*.ts"`
Expected: no matches remain anywhere in the codebase (the only consumer was `PlayersDirectory.tsx`, just updated). If any other file references `PlayerRow`, update it to `PlayerCard` following the same pattern before proceeding.

- [ ] **Step 8: Verify types and lint**

Run: `npx tsc --noEmit -p .` — expect no errors.
Run: `npm run lint` — expect no new errors/warnings.

- [ ] **Step 9: Screenshot and compare**

Navigate to `http://localhost:3000/dashboard/players`, screenshot. Confirm players now render as a responsive card grid (2 columns on mobile widths, 3 on `sm`, 4 on `lg`), each card showing avatar, name, and category badge, using its full card width instead of a bare pill with dead space. Click a card, confirm the same `PlayerProfileCard` detail dialog still opens correctly (behavior must be unchanged — only the trigger's visual presentation changed).

- [ ] **Step 10: Stop for review (do not commit)**
