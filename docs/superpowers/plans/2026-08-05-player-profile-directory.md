# Player Profiles & Directory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `preferredSide`/`dominantHand` real, player-editable `UserProfile` fields; add a public, searchable directory of every player (`/dashboard/players`) that opens a shared `PlayerProfileCard`; rewire `LatestPartnerCard` to open that same card instead of its current disabled "Coming soon" button.

**Architecture:** Two new real `UserProfile` columns (nullable Prisma enums) surfaced through the existing `/api/me` + `AuthProvider` pipeline (same path `padelCategory` already uses), a new public `GET /api/players` route, and one shared presentational `PlayerProfileCard` consumed from two places: a new `/dashboard/players` page and the existing `LatestPartnerCard`.

**Tech Stack:** Next.js App Router, TypeScript, Prisma, Clerk, TanStack React Query, Tailwind CSS v4, shadcn/ui (Dialog, Select, Avatar, Badge, Button), lucide-react.

## Global Constraints

- **Full spec:** `docs/superpowers/specs/2026-08-05-player-profile-directory-design.md` — read it before starting if anything below is unclear.
- **Schema changes use `db push`, never `migrate dev`.** This project has no `prisma/migrations` history; `migrate dev` will try to reset the entire database. See `docs/CONTRIBUTING.md`.
- **No test runner exists in this project** (no `test` script, no jest/vitest/@testing-library). Verification for every task is: `npx tsc --noEmit` (must be clean — zero tolerance for new type errors), `npx eslint <changed files>` (must show zero new errors), and for API/route changes, a description of the manual check to perform (this session cannot reach authenticated routes directly — every route sits behind Clerk middleware with no test credentials available — so manual verification is either done by the user, or via the throwaway-public-route-in-`proxy.ts` + Playwright-screenshot technique used earlier this session, reverted immediately after).
- **Do NOT run any git commands that mutate state** — no `commit`, `push`, `stash`, ever, at any step. The user owns all git operations in this project. Skip any "Commit" step a generic template might suggest.
- **Component convention (already established in this codebase):** every component renders exactly one output (two only if one is a loading state). Consts/types/utils always live in their own files, never inlined in the component file. Every new component folder gets an `index.ts` barrel (`export { X } from "./X";`), and every barrel with 2+ exports is sorted alphabetically by exported name (see `AGENTS.md`).
- **Icons:** lucide-react only.
- **Colors/tokens:** use this project's existing semantic Tailwind classes (`bg-primary`, `text-muted-foreground`, etc.) — never hardcode a hex/rgb color.
- **`cn()` helper** lives at `@/lib/utils/utils`.
- **Search is client-side filtering, not a server round-trip.** This codebase's existing search (`SearchableCardsGrid`) filters an already-fetched list in memory rather than hitting the server per keystroke. `GET /api/players` therefore takes no query params at all — it always returns the full active-player list (no pagination, per the spec's non-goals), and the directory page filters that list by name locally. This is a deliberate deviation from the spec's literal "`?q=` query param" wording, in favor of matching this codebase's established convention; the user-visible behavior (type a name, see matches) is identical either way.

---

### Task 1: Schema — `PreferredSide`/`DominantHand` enums and `UserProfile` fields

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: Prisma enums `PreferredSide` (`forehand`/`backhand`), `DominantHand` (`right`/`left`); `UserProfile.preferredSide: PreferredSide | null`, `UserProfile.dominantHand: DominantHand | null` on the generated client.

- [ ] **Step 1: Add the two enums**

In `prisma/schema.prisma`, add right after the existing `enum Gender { ... }` block:

```prisma
enum PreferredSide {
  forehand
  backhand
}

enum DominantHand {
  right
  left
}
```

- [ ] **Step 2: Add the fields to `UserProfile`**

In the `model UserProfile { ... }` block, add these two lines right after `padelCategory Int?`:

```prisma
  preferredSide PreferredSide?
  dominantHand  DominantHand?
```

- [ ] **Step 3: Regenerate the client**

Run: `npx prisma generate`
Expected: `✔ Generated Prisma Client ... to .\lib\generated\prisma`

- [ ] **Step 4: Push the schema to the database**

Run: `npx prisma db push`
Expected: `Your database is now in sync with your Prisma schema.` — no reset prompt (this is an additive, nullable-column change).

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: clean (nothing references the new fields yet, so nothing can be broken — this step just confirms the client regenerated without errors).

---

### Task 2: Core types and label helpers

**Files:**
- Modify: `core/users/types/index.ts`
- Modify: `core/users/consts.ts`

**Interfaces:**
- Produces: `PreferredSide`, `DominantHand` types; `UserProfile.preferredSide?: PreferredSide`, `UserProfile.dominantHand?: DominantHand` — from `core/users/types`.
- Produces: `PREFERRED_SIDE_OPTIONS: { value: PreferredSide; label: string }[]`, `DOMINANT_HAND_OPTIONS: { value: DominantHand; label: string }[]`, `getPreferredSideLabel(value: PreferredSide | null): string`, `getDominantHandLabel(value: DominantHand | null): string` — from `core/users/consts`.

- [ ] **Step 1: Add the types**

In `core/users/types/index.ts`, replace the full file with:

```ts
export type UserStatus = "ACTIVE" | "INACTIVE" | "PENDING";
export type SystemRole = "owner" | "player";
export type PreferredSide = "forehand" | "backhand";
export type DominantHand = "right" | "left";

export interface UserProfile {
  id: string;
  role: SystemRole;
  // Optional: only club owners belong to a club — players don't.
  clubId?: string;
  displayName: string;
  email: string;
  photoURL?: string;
  phone?: string;
  status: UserStatus;
  // Player-only play-style fields — unset (undefined) until the player
  // edits their profile. Owners never set these.
  preferredSide?: PreferredSide;
  dominantHand?: DominantHand;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}
```

- [ ] **Step 2: Add the options and label helpers**

In `core/users/consts.ts`, replace the full file with:

```ts
import type { DominantHand, PreferredSide, SystemRole } from "@/core/users/types";

export const ROLE_LABEL: Record<SystemRole, string> = {
  owner: "Owner",
  player: "Player",
};

export const PREFERRED_SIDE_OPTIONS: { value: PreferredSide; label: string }[] = [
  { value: "forehand", label: "Forehand" },
  { value: "backhand", label: "Backhand" },
];

export const DOMINANT_HAND_OPTIONS: { value: DominantHand; label: string }[] = [
  { value: "right", label: "Right-handed" },
  { value: "left", label: "Left-handed" },
];

export function getPreferredSideLabel(value: PreferredSide | null): string {
  if (value === null) return "Not set yet";
  return PREFERRED_SIDE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function getDominantHandLabel(value: DominantHand | null): string {
  if (value === null) return "Not set yet";
  return DOMINANT_HAND_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: clean.

Run: `npx eslint core/users/types/index.ts core/users/consts.ts`
Expected: no errors.

---

### Task 3: `/api/me` — return and accept `preferredSide`/`dominantHand`

**Files:**
- Modify: `app/api/me/route.ts`

**Interfaces:**
- Consumes: `prisma` from `@/infrastructure/db/client`; `auth` from `@clerk/nextjs/server`.
- Produces: `GET` returns `{ profile: { role, clubId, padelCategory, preferredSide, dominantHand } | null }`. `PATCH` accepts `{ preferredSide?: "forehand" | "backhand", dominantHand?: "right" | "left" }`, returns `{ profile: { preferredSide, dominantHand } }` on success.

- [ ] **Step 1: Extend the GET select**

Replace the full file with:

```ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/infrastructure/db/client";

// Thin "who am I" lookup: the current Clerk user's own UserProfile.role,
// clubId, padelCategory, preferredSide, dominantHand. Queries Prisma
// directly (same pattern as app/onboarding/layout.tsx) instead of going
// through core/users, which is being migrated to the new owner|player
// SystemRole enum concurrently — this route only reads/writes a few scalar
// fields, so it isn't worth coupling to that in-flux module.
export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ profile: null }, { status: 401 });
  }

  const profile = await prisma.userProfile.findUnique({
    where: { id: userId },
    select: {
      role: true,
      clubId: true,
      padelCategory: true,
      preferredSide: true,
      dominantHand: true,
    },
  });

  return NextResponse.json({ profile });
}

const updatePlayerStyleSchema = z.object({
  preferredSide: z.enum(["forehand", "backhand"]).optional(),
  dominantHand: z.enum(["right", "left"]).optional(),
});

// Player-only self-service edit of their own play-style fields. Anyone
// signed in may call this on their own profile — there is no owner/admin
// path to edit someone else's profile through this route.
export async function PATCH(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updatePlayerStyleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const profile = await prisma.userProfile.update({
    where: { id: userId },
    data: { ...parsed.data, updatedBy: userId },
    select: { preferredSide: true, dominantHand: true },
  });

  return NextResponse.json({ profile });
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: clean.

Run: `npx eslint app/api/me/route.ts`
Expected: no errors.

---

### Task 4: `AuthProvider` — surface the new fields and expose a refetch

**Files:**
- Modify: `providers/auth-provider.tsx`

**Interfaces:**
- Consumes: `PreferredSide`, `DominantHand` from `@/core/users/types`.
- Produces: `AppUser.preferredSide: PreferredSide | null`, `AppUser.dominantHand: DominantHand | null`; `AuthContextValue.refetchProfile: () => Promise<void>`.

- [ ] **Step 1: Extend the types and extract the fetch into a reusable function**

Replace the full file with:

```tsx
"use client";

import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import type { DominantHand, PreferredSide } from "@/core/users/types";

// Mirrors prisma/schema.prisma's SystemRole enum.
export type SystemRole = "owner" | "player";

interface UserProfileSummary {
  role: SystemRole;
  clubId: string | null;
  padelCategory: number | null;
  preferredSide: PreferredSide | null;
  dominantHand: DominantHand | null;
}

export interface AppUser {
  id: string;
  email: string | null;
  displayName: string | null;
  imageUrl: string | null;
  // null until the /api/me lookup resolves, or if no UserProfile row exists
  // yet for this Clerk user (nobody creates one until core/clubs/core/users
  // land — see DashboardGuard for how that gap is currently handled).
  role: SystemRole | null;
  clubId: string | null;
  // Player-only self-reported skill level (1 = highest, 8 = beginner);
  // always null for owners and for players who skipped it during onboarding.
  padelCategory: number | null;
  // Player-only play-style fields, editable from the Player Overview card.
  // Always null for owners and for players who haven't set them yet.
  preferredSide: PreferredSide | null;
  dominantHand: DominantHand | null;
}

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  // Whether the UserProfile (role/clubId) lookup is still in flight. Distinct
  // from `loading`, which only tracks Clerk's own hydration.
  profileLoading: boolean;
  signOut: () => Promise<void>;
  // Re-runs the /api/me lookup and updates `user` in place — call after any
  // mutation that changes the caller's own UserProfile (e.g. editing
  // preferredSide/dominantHand) so the new value shows up everywhere
  // without a full page reload.
  refetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [profile, setProfile] = useState<UserProfileSummary | null>(null);
  // Tracks the in-flight /api/me fetch only for the "clerkUser present"
  // case. The logged-out/not-yet-hydrated case is derived below instead of
  // being written here, so this never needs a synchronous setState in the
  // effect's early-return branch.
  const [profileLoading, setProfileLoading] = useState(true);

  // Thin lookup of this user's own UserProfile fields. Reads Prisma
  // directly (see app/api/me/route.ts) rather than going through
  // core/users, which is mid-migration to the new owner|player enum.
  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/me");
      const data = res.ok ? await res.json() : { profile: null };
      setProfile(data?.profile ?? null);
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    // No clerkUser (still hydrating, or logged out) means there's nothing to
    // fetch. `profileLoading` below is derived to `false` for the logged-out
    // case directly during render, so this effect just skips scheduling —
    // no setState needed for that branch.
    if (!isLoaded || !clerkUser) return;

    let cancelled = false;
    // Kicks off the /api/me fetch and tracks its loading state — the
    // recognized "start fetching, subscribe to its result" effect pattern,
    // not a response to a state change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfileLoading(true);

    fetchProfile().finally(() => {
      if (!cancelled) setProfileLoading(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, clerkUser?.id]);

  const user = useMemo<AppUser | null>(
    () =>
      clerkUser
        ? {
            id: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
            displayName: clerkUser.fullName,
            imageUrl: clerkUser.imageUrl ?? null,
            role: profile?.role ?? null,
            clubId: profile?.clubId ?? null,
            padelCategory: profile?.padelCategory ?? null,
            preferredSide: profile?.preferredSide ?? null,
            dominantHand: profile?.dominantHand ?? null,
          }
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      clerkUser?.id,
      clerkUser?.primaryEmailAddress?.emailAddress,
      clerkUser?.fullName,
      clerkUser?.imageUrl,
      profile,
    ],
  );

  // Mirrors the old effect-driven value exactly: still hydrating -> true;
  // hydrated with no clerkUser (logged out) -> false; hydrated with a
  // clerkUser -> whatever the in-flight fetch state is.
  const isProfileLoading = !isLoaded
    ? true
    : clerkUser
      ? profileLoading
      : false;

  const value = useMemo(
    () => ({
      user: isLoaded ? user : null,
      loading: !isLoaded,
      profileLoading: isProfileLoading,
      signOut: () => signOut(),
      refetchProfile: fetchProfile,
    }),
    [user, isLoaded, isProfileLoading, signOut, fetchProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: clean.

Run: `npx eslint providers/auth-provider.tsx`
Expected: no errors.

---

### Task 5: Retire `MOCK_PLAYER_STYLE` — read real `preferredSide`/`dominantHand`

**Files:**
- Modify: `app/dashboard/_components/DashboardHome/components/PlayerOverview/types.ts`
- Modify: `app/dashboard/_components/DashboardHome/components/PlayerOverview/consts.ts`
- Modify: `app/dashboard/_components/DashboardHome/components/PlayerOverview/hooks.ts`
- Modify: `app/dashboard/_components/DashboardHome/components/PlayerOverview/PlayerOverviewCard/PlayerOverviewCard.tsx`
- Modify: `app/dashboard/_components/DashboardHome/components/PlayerOverview/components/PlayerStyleSection/PlayerStyleSection.tsx`
- Modify: `app/dashboard/_components/DashboardHome/components/PlayerOverview/components/PlayerStyleSection/components/PadelSideDiagram/types.ts`
- Modify: `app/dashboard/_components/DashboardHome/components/PlayerOverview/components/PlayerStyleSection/components/PadelSideDiagram/PadelSideDiagram.tsx`
- Read (no change needed): `app/dashboard/_components/DashboardHome/components/PlayerOverview/PlayerOverviewContent/PlayerOverviewContent.tsx`

**Interfaces:**
- Consumes: `useAuth` from `@/hooks/use-auth`; `getPreferredSideLabel`, `getDominantHandLabel` from `@/core/users/consts`; `PreferredSide`, `DominantHand` from `@/core/users/types`; `court` from `@/assets/icons`.
- Produces: `PlayerStyle` type becomes `{ preferredSide: PreferredSide | null; dominantHand: DominantHand | null }`; `usePlayerOverviewData()` returns real `playerStyle` for the signed-in player.

- [ ] **Step 1: Update `types.ts`**

Replace the full file with:

```ts
import type { DominantHand, PreferredSide } from "@/core/users/types";

export type MatchResult = "W" | "L";

export type PlayerStyle = {
  preferredSide: PreferredSide | null;
  dominantHand: DominantHand | null;
};

export type PartnerSummary = {
  name: string;
  avatarUrl: string | null;
  timesPlayedTogether: number;
  lastPlayedLabel: string;
  padelCategory: number | null;
  preferredSide: PreferredSide | null;
  dominantHand: DominantHand | null;
  email: string;
  phone: string | null;
};

export type PerformanceSummary = {
  tournamentsWon: number;
  tournamentsPlayed: number;
  preferredPosition: PreferredSide;
  latestTournamentName: string;
  latestResults: MatchResult[];
};
```

(`PreferredSide`/`DominantHand` are no longer defined here — they're real types now, imported from `core/users/types`. `PartnerSummary` gains the fields `PlayerProfileCard` needs — populated in Task 8.)

- [ ] **Step 2: Update `consts.ts`**

Replace the full file with:

```ts
import type { PartnerSummary, PerformanceSummary } from "./types";

// Placeholder data — this app has no backend concept yet for doubles
// partners or tournaments/matches (confirmed against prisma/schema.prisma:
// Reservation tracks a single booking user only, no Tournament/Match model
// exists). See docs/superpowers/specs/2026-08-01-player-overview-sidebar-design.md
// and docs/superpowers/specs/2026-08-05-player-profile-directory-design.md.
// preferredSide/dominantHand are real now (see core/users) — only the
// partner and performance data below remain mocked.

export const MOCK_LATEST_PARTNER: PartnerSummary = {
  name: "Sofía Martínez",
  avatarUrl: null,
  timesPlayedTogether: 5,
  lastPlayedLabel: "3 days ago",
  padelCategory: 3,
  preferredSide: "backhand",
  dominantHand: "right",
  email: "sofia.martinez@example.com",
  phone: "+54 9 11 5555-0123",
};

export const MOCK_PERFORMANCE: PerformanceSummary = {
  tournamentsWon: 5,
  tournamentsPlayed: 12,
  preferredPosition: "forehand",
  latestTournamentName: "Summer Open 2026",
  latestResults: ["W", "W", "L", "W"],
};
```

(`MOCK_PLAYER_STYLE` and `DOMINANT_HAND_LABELS` are removed entirely — retired in favor of real data and `core/users/consts`'s label helpers.)

- [ ] **Step 3: Update `hooks.ts`**

Replace the full file with:

```ts
import { useAuth } from "@/hooks/use-auth";
import { MOCK_LATEST_PARTNER, MOCK_PERFORMANCE } from "./consts";
import type { PlayerStyle } from "./types";

export function usePlayerOverviewData() {
  const { user } = useAuth();

  const playerStyle: PlayerStyle = {
    preferredSide: user?.preferredSide ?? null,
    dominantHand: user?.dominantHand ?? null,
  };

  return {
    playerStyle,
    partner: MOCK_LATEST_PARTNER,
    performance: MOCK_PERFORMANCE,
  };
}
```

- [ ] **Step 4: Update `PlayerOverviewCard.tsx`**

Replace the full file with:

```tsx
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/utils";
import { getDominantHandLabel } from "@/core/users/consts";
import { PlayerStyleSection } from "../components/PlayerStyleSection";
import { PerformanceSummarySection } from "../components/PerformanceSummarySection";
import { usePlayerOverviewData } from "../hooks";
import type { PlayerOverviewCardProps } from "./types";

export function PlayerOverviewCard({ className }: PlayerOverviewCardProps) {
  const { playerStyle, partner, performance } = usePlayerOverviewData();

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <Card size="sm" className="rounded-2xl [--card-spacing:--spacing(4)]">
        <CardHeader>
          <CardTitle>Player Overview</CardTitle>
          <CardAction>
            <Badge variant="secondary">
              {getDominantHandLabel(playerStyle.dominantHand)}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <PlayerStyleSection playerStyle={playerStyle} partner={partner} />
        </CardContent>
      </Card>
      <Card
        size="sm"
        className="rounded-2xl [--card-spacing:--spacing(4)] flex-1"
      >
        <CardHeader>
          <CardTitle>Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <PerformanceSummarySection performance={performance} />
        </CardContent>
      </Card>
    </div>
  );
}
```

(Only the import and the Badge's label lookup change — `DOMINANT_HAND_LABELS[...]` becomes `getDominantHandLabel(...)`, which handles `null`.)

- [ ] **Step 5: Update `PlayerStyleSection.tsx`**

Replace the full file with:

```tsx
import { PadelSideDiagram } from "./components/PadelSideDiagram";
import { LatestPartnerCard } from "./components/LatestPartnerCard";
import { getPreferredSideLabel } from "@/core/users/consts";
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
          className="h-28 w-28"
        />
        <div>
          <p className="text-xs text-muted-foreground">Preferred side</p>
          <p className="text-sm font-semibold">
            {getPreferredSideLabel(playerStyle.preferredSide)}
          </p>
        </div>
      </div>
      <LatestPartnerCard partner={partner} />
    </div>
  );
}
```

(`capitalize` + raw string is replaced by `getPreferredSideLabel`, which handles `null` as "Not set yet".)

- [ ] **Step 6: Update `PadelSideDiagram`'s prop type**

Replace `app/dashboard/_components/DashboardHome/components/PlayerOverview/components/PlayerStyleSection/components/PadelSideDiagram/types.ts` with:

```ts
import type { PreferredSide } from "@/core/users/types";

export type PadelSideDiagramProps = {
  side: PreferredSide | null;
  className?: string;
};
```

- [ ] **Step 7: Update `PadelSideDiagram.tsx` to handle `null`**

Replace the full file with:

```tsx
import Image from "next/image";
import { cn } from "@/lib/utils/utils";
import {
  court,
  courtSideLeftSelected,
  courtSideRightSelected,
} from "@/assets/icons";
import type { PadelSideDiagramProps } from "./types";

export function PadelSideDiagram({ side, className }: PadelSideDiagramProps) {
  if (side === null) {
    return (
      <Image
        src={court.default}
        alt="Preferred side: not set yet"
        className={cn("shrink-0", className)}
      />
    );
  }

  const isForehand = side === "forehand";

  return (
    <Image
      src={isForehand ? courtSideRightSelected.default : courtSideLeftSelected.default}
      alt={
        isForehand
          ? "Preferred side: forehand (right side of the court)"
          : "Preferred side: backhand (left side of the court)"
      }
      className={cn("shrink-0", className)}
    />
  );
}
```

- [ ] **Step 8: No change needed in `PlayerOverviewContent.tsx`**

`app/dashboard/_components/DashboardHome/components/PlayerOverview/PlayerOverviewContent/PlayerOverviewContent.tsx` only calls `usePlayerOverviewData()` and passes `playerStyle`/`partner`/`performance` straight through to `PlayerStyleSection`/`PerformanceSummarySection` — it never references `MOCK_PLAYER_STYLE` or `DOMINANT_HAND_LABELS` directly (confirmed by reading it during plan-writing), so it needs no edits. This step is a no-op, listed only so the fact is on record.

- [ ] **Step 9: Verify**

Run: `npx tsc --noEmit`
Expected: clean. Pay special attention to any other file importing `MOCK_PLAYER_STYLE` or `DOMINANT_HAND_LABELS` from `PlayerOverview/consts` — `tsc` will surface these as missing-export errors if any exist; fix each one the same way as Step 4/5 above.

Run: `npx eslint app/dashboard/_components/DashboardHome/components/PlayerOverview`
Expected: no errors.

---

### Task 6: `PlayerProfileCard` shared component

**Files:**
- Create: `components/PlayerProfileCard/PlayerProfileCard.tsx`
- Create: `components/PlayerProfileCard/types.ts`
- Create: `components/PlayerProfileCard/index.ts`

**Interfaces:**
- Consumes: `getPreferredSideLabel`, `getDominantHandLabel` from `@/core/users/consts`; `getPadelCategoryLabel` from `@/app/dashboard/_components/DashboardHome/components/SkillOverviewCard/utils`; `getInitials` from `@/app/dashboard/_components/DashboardHome/components/PlayerOverview/utils`.
- Produces: `PlayerProfileData` type (`{ displayName: string; avatarUrl: string | null; padelCategory: number | null; preferredSide: PreferredSide | null; dominantHand: DominantHand | null; email: string; phone: string | null }`); `PlayerProfileCard({ player }: { player: PlayerProfileData })` — pure content only, no `Dialog` wrapper of its own. Callers wrap it in their own `<Dialog><DialogContent><PlayerProfileCard player={...} /></DialogContent></Dialog>`.

- [ ] **Step 1: Write `types.ts`**

```ts
import type { DominantHand, PreferredSide } from "@/core/users/types";

export type PlayerProfileData = {
  displayName: string;
  avatarUrl: string | null;
  padelCategory: number | null;
  preferredSide: PreferredSide | null;
  dominantHand: DominantHand | null;
  email: string;
  phone: string | null;
};

export type PlayerProfileCardProps = {
  player: PlayerProfileData;
};
```

- [ ] **Step 2: Write `PlayerProfileCard.tsx`**

```tsx
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  getDominantHandLabel,
  getPreferredSideLabel,
} from "@/core/users/consts";
import { getPadelCategoryLabel } from "@/app/dashboard/_components/DashboardHome/components/SkillOverviewCard/utils";
import { getInitials } from "@/app/dashboard/_components/DashboardHome/components/PlayerOverview/utils";
import type { PlayerProfileCardProps } from "./types";

export function PlayerProfileCard({ player }: PlayerProfileCardProps) {
  return (
    <div className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle className="sr-only">{player.displayName}</DialogTitle>
      </DialogHeader>
      <div className="flex items-center gap-3">
        <Avatar size="lg">
          {player.avatarUrl && (
            <AvatarImage src={player.avatarUrl} alt="" />
          )}
          <AvatarFallback>{getInitials(player.displayName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {player.displayName}
          </p>
          <Badge variant="outline" className="mt-1">
            {getPadelCategoryLabel(player.padelCategory)}
          </Badge>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-muted-foreground">Preferred side</p>
          <p className="font-medium">
            {getPreferredSideLabel(player.preferredSide)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Dominant hand</p>
          <p className="font-medium">
            {getDominantHandLabel(player.dominantHand)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Email</p>
          <p className="truncate font-medium">{player.email}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Phone</p>
          <p className="font-medium">{player.phone ?? "Not set yet"}</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write `index.ts`**

```ts
export { PlayerProfileCard } from "./PlayerProfileCard";
export type { PlayerProfileData } from "./types";
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: clean.

Run: `npx eslint components/PlayerProfileCard`
Expected: no errors.

---

### Task 7: `GET /api/players`

**Files:**
- Create: `app/api/players/route.ts`

**Interfaces:**
- Consumes: `prisma` from `@/infrastructure/db/client`; `auth` from `@clerk/nextjs/server`.
- Produces: `GET` returns `{ players: { id: string; displayName: string; avatarUrl: string | null; padelCategory: number | null; preferredSide: "forehand" | "backhand" | null; dominantHand: "right" | "left" | null; email: string; phone: string | null }[] }`.

- [ ] **Step 1: Write the route**

```ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/infrastructure/db/client";

// Public (to any signed-in user, any role) directory of every active
// player — intentionally global, not scoped to a club. No pagination and
// no server-side search: the full list is returned and the client filters
// it by name, matching this codebase's existing search convention (see
// SearchableCardsGrid).
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.userProfile.findMany({
    where: { role: "player", status: "ACTIVE" },
    select: {
      id: true,
      displayName: true,
      photoURL: true,
      padelCategory: true,
      preferredSide: true,
      dominantHand: true,
      email: true,
      phone: true,
    },
    orderBy: { displayName: "asc" },
  });

  const players = rows.map((row) => ({
    id: row.id,
    displayName: row.displayName,
    avatarUrl: row.photoURL,
    padelCategory: row.padelCategory,
    preferredSide: row.preferredSide,
    dominantHand: row.dominantHand,
    email: row.email,
    phone: row.phone,
  }));

  return NextResponse.json({ players });
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: clean.

Run: `npx eslint app/api/players/route.ts`
Expected: no errors.

---

### Task 8: Players directory page

**Files:**
- Create: `app/dashboard/players/page.tsx`
- Create: `app/dashboard/players/_components/PlayersDirectory/PlayersDirectory.tsx`
- Create: `app/dashboard/players/_components/PlayersDirectory/hooks.ts`
- Create: `app/dashboard/players/_components/PlayersDirectory/consts.ts`
- Create: `app/dashboard/players/_components/PlayersDirectory/index.ts`
- Create: `app/dashboard/players/_components/PlayersDirectory/components/PlayerRow/PlayerRow.tsx`
- Create: `app/dashboard/players/_components/PlayersDirectory/components/PlayerRow/types.ts`
- Create: `app/dashboard/players/_components/PlayersDirectory/components/PlayerRow/index.ts`

**Interfaces:**
- Consumes: `PlayerProfileCard`, `PlayerProfileData` from `@/components/PlayerProfileCard`; `getPadelCategoryLabel` from `@/app/dashboard/_components/DashboardHome/components/SkillOverviewCard/utils`; `getInitials` from `@/app/dashboard/_components/DashboardHome/components/PlayerOverview/utils`.
- Produces: `usePlayers(): UseQueryResult<PlayerProfileData & { id: string }[]>`; page rendered at `/dashboard/players`.

- [ ] **Step 1: Write `consts.ts`**

```ts
export const playersQueryKey = ["players"] as const;
```

- [ ] **Step 2: Write `hooks.ts`**

```ts
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

- [ ] **Step 3: Write `PlayerRow/types.ts`**

```ts
import type { PlayerProfileData } from "@/components/PlayerProfileCard";

export type PlayerRowProps = {
  player: PlayerProfileData;
};
```

- [ ] **Step 4: Write `PlayerRow/PlayerRow.tsx`**

```tsx
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlayerProfileCard } from "@/components/PlayerProfileCard";
import { getPadelCategoryLabel } from "@/app/dashboard/_components/DashboardHome/components/SkillOverviewCard/utils";
import { getInitials } from "@/app/dashboard/_components/DashboardHome/components/PlayerOverview/utils";
import type { PlayerRowProps } from "./types";

export function PlayerRow({ player }: PlayerRowProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted/50"
        >
          <Avatar>
            {player.avatarUrl && (
              <AvatarImage src={player.avatarUrl} alt="" />
            )}
            <AvatarFallback>{getInitials(player.displayName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {player.displayName}
            </p>
            <p className="text-xs text-muted-foreground">
              {getPadelCategoryLabel(player.padelCategory)}
            </p>
          </div>
        </button>
      </DialogTrigger>
      <DialogContent>
        <PlayerProfileCard player={player} />
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 5: Write `PlayerRow/index.ts`**

```ts
export { PlayerRow } from "./PlayerRow";
```

- [ ] **Step 6: Write `PlayersDirectory.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { usePlayers } from "./hooks";
import { PlayerRow } from "./components/PlayerRow";

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

      <div className="flex flex-col gap-2">
        {matches.map((player) => (
          <PlayerRow key={player.id} player={player} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Write `index.ts`**

```ts
export { PlayersDirectory } from "./PlayersDirectory";
```

- [ ] **Step 8: Write `page.tsx`**

```tsx
import { PlayersDirectory } from "./_components/PlayersDirectory";

export default function PlayersPage() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <h1 className="text-xl font-semibold tracking-tight">Players</h1>
      <PlayersDirectory />
    </div>
  );
}
```

- [ ] **Step 9: Verify**

Run: `npx tsc --noEmit`
Expected: clean.

Run: `npx eslint app/dashboard/players`
Expected: no errors.

---

### Task 9: Nav entry

**Files:**
- Modify: `app/dashboard/_components/AppNavbar/consts.ts`

**Interfaces:**
- Consumes: `Users` icon from `lucide-react`.

- [ ] **Step 1: Add the icon import and nav item**

In `app/dashboard/_components/AppNavbar/consts.ts`, add `Users` to the `lucide-react` import:

```ts
import {
  LayoutDashboard,
  LayoutGrid,
  CalendarClock,
  CalendarCheck,
  Settings2,
  Compass,
  Users,
  type LucideIcon,
} from "lucide-react";
```

Then add a new entry to `navItems`, right after the `"My Reservations"` entry:

```ts
  {
    title: "Players",
    href: "/dashboard/players",
    icon: Users,
    roles: ["player"],
  },
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: clean.

Run: `npx eslint app/dashboard/_components/AppNavbar/consts.ts`
Expected: no errors.

---

### Task 10: `LatestPartnerCard` opens `PlayerProfileCard`

**Files:**
- Modify: `app/dashboard/_components/DashboardHome/components/PlayerOverview/components/PlayerStyleSection/components/LatestPartnerCard/LatestPartnerCard.tsx`

**Interfaces:**
- Consumes: `PlayerProfileCard` from `@/components/PlayerProfileCard`; `PartnerSummary` from `../../../../types` (unchanged import path, extended shape from Task 5).

- [ ] **Step 1: Replace the Popover with a Dialog opening `PlayerProfileCard`**

Replace the full file with:

```tsx
import { ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlayerProfileCard } from "@/components/PlayerProfileCard";
import { getInitials } from "../../../../utils";
import type { LatestPartnerCardProps } from "./types";

export function LatestPartnerCard({ partner }: LatestPartnerCardProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
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
      </DialogTrigger>
      <DialogContent>
        <PlayerProfileCard
          player={{
            displayName: partner.name,
            avatarUrl: partner.avatarUrl,
            padelCategory: partner.padelCategory,
            preferredSide: partner.preferredSide,
            dominantHand: partner.dominantHand,
            email: partner.email,
            phone: partner.phone,
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
```

(`partner.name` → `displayName` is the only field rename needed — `PartnerSummary` keeps its existing `name` field from Task 5, mapped here into `PlayerProfileData`'s `displayName`.)

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: clean.

Run: `npx eslint app/dashboard/_components/DashboardHome/components/PlayerOverview/components/PlayerStyleSection/components/LatestPartnerCard/LatestPartnerCard.tsx`
Expected: no errors.

---

### Task 11: Edit affordance for `preferredSide`/`dominantHand`

**Files:**
- Create: `app/dashboard/_components/DashboardHome/components/PlayerOverview/components/PlayerStyleSection/components/EditPlayerStyleDialog/EditPlayerStyleDialog.tsx`
- Create: `app/dashboard/_components/DashboardHome/components/PlayerOverview/components/PlayerStyleSection/components/EditPlayerStyleDialog/index.ts`
- Modify: `app/dashboard/_components/DashboardHome/components/PlayerOverview/hooks.ts`
- Modify: `app/dashboard/_components/DashboardHome/components/PlayerOverview/components/PlayerStyleSection/PlayerStyleSection.tsx`

**Interfaces:**
- Consumes: `useAuth` from `@/hooks/use-auth`; `PREFERRED_SIDE_OPTIONS`, `DOMINANT_HAND_OPTIONS` from `@/core/users/consts`; `PreferredSide`, `DominantHand` from `@/core/users/types`.
- Produces: `useUpdatePlayerStyle(): UseMutationResult<..., Error, { preferredSide?: PreferredSide; dominantHand?: DominantHand }>` from `PlayerOverview/hooks.ts`; `<EditPlayerStyleDialog />` (no props — reads/writes the current user's own profile).

- [ ] **Step 1: Add the mutation hook to `hooks.ts`**

Replace the full `app/dashboard/_components/DashboardHome/components/PlayerOverview/hooks.ts` with (this keeps the existing `usePlayerOverviewData` from Task 5 unchanged and adds the new `useUpdatePlayerStyle` below it):

```ts
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { MOCK_LATEST_PARTNER, MOCK_PERFORMANCE } from "./consts";
import type { PlayerStyle } from "./types";
import type { DominantHand, PreferredSide } from "@/core/users/types";

export function usePlayerOverviewData() {
  const { user } = useAuth();

  const playerStyle: PlayerStyle = {
    preferredSide: user?.preferredSide ?? null,
    dominantHand: user?.dominantHand ?? null,
  };

  return {
    playerStyle,
    partner: MOCK_LATEST_PARTNER,
    performance: MOCK_PERFORMANCE,
  };
}

export function useUpdatePlayerStyle() {
  const { refetchProfile } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      preferredSide?: PreferredSide;
      dominantHand?: DominantHand;
    }) => {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error ?? "Could not update your profile.");
      }
      return body;
    },
    onSuccess: () => refetchProfile(),
  });
}
```

- [ ] **Step 2: Write `EditPlayerStyleDialog.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import {
  DOMINANT_HAND_OPTIONS,
  PREFERRED_SIDE_OPTIONS,
} from "@/core/users/consts";
import { useUpdatePlayerStyle } from "../../../../hooks";
import type { DominantHand, PreferredSide } from "@/core/users/types";

export function EditPlayerStyleDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [preferredSide, setPreferredSide] = useState<PreferredSide | undefined>(
    user?.preferredSide ?? undefined,
  );
  const [dominantHand, setDominantHand] = useState<DominantHand | undefined>(
    user?.dominantHand ?? undefined,
  );
  const { mutate, isPending } = useUpdatePlayerStyle();

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      // Reset the form to the current real values every time it opens.
      setPreferredSide(user?.preferredSide ?? undefined);
      setDominantHand(user?.dominantHand ?? undefined);
    }
    setOpen(nextOpen);
  }

  function handleSave() {
    mutate(
      { preferredSide, dominantHand },
      { onSuccess: () => setOpen(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Edit play style">
          <Pencil />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit play style</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">
              Preferred side
            </label>
            <Select
              value={preferredSide}
              onValueChange={(v) => setPreferredSide(v as PreferredSide)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Not set yet" />
              </SelectTrigger>
              <SelectContent>
                {PREFERRED_SIDE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">
              Dominant hand
            </label>
            <Select
              value={dominantHand}
              onValueChange={(v) => setDominantHand(v as DominantHand)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Not set yet" />
              </SelectTrigger>
              <SelectContent>
                {DOMINANT_HAND_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={isPending}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Write `index.ts`**

```ts
export { EditPlayerStyleDialog } from "./EditPlayerStyleDialog";
```

- [ ] **Step 4: Wire it into `PlayerStyleSection.tsx`**

Replace the full file with:

```tsx
import { PadelSideDiagram } from "./components/PadelSideDiagram";
import { LatestPartnerCard } from "./components/LatestPartnerCard";
import { EditPlayerStyleDialog } from "./components/EditPlayerStyleDialog";
import { getPreferredSideLabel } from "@/core/users/consts";
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
          className="h-28 w-28"
        />
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">Preferred side</p>
          <p className="text-sm font-semibold">
            {getPreferredSideLabel(playerStyle.preferredSide)}
          </p>
        </div>
        <EditPlayerStyleDialog />
      </div>
      <LatestPartnerCard partner={partner} />
    </div>
  );
}
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: clean.

Run: `npx eslint app/dashboard/_components/DashboardHome/components/PlayerOverview`
Expected: no errors.

---

### Task 12: Full-project verification and manual check

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck**

Run: `npx tsc --noEmit -p .`
Expected: clean, zero errors anywhere in the project.

- [ ] **Step 2: Full lint on every touched file**

Run:
```bash
npx eslint core/users app/api/me app/api/players app/dashboard/players app/dashboard/_components/AppNavbar app/dashboard/_components/DashboardHome/components/PlayerOverview components/PlayerProfileCard providers/auth-provider.tsx
```
Expected: zero new errors (ignore any pre-existing errors in files this plan didn't touch).

- [ ] **Step 3: Manual verification (requires either the user, or the throwaway-public-route technique)**

Since every route sits behind Clerk middleware and this session has no test credentials, verify manually (or ask the user to) by:
1. Signing in as a player with no `preferredSide`/`dominantHand` set — confirm the Player Overview card shows "Not set yet" for both, and the court diagram renders the plain (unhighlighted) court.
2. Opening the edit dialog (pencil icon), setting both fields, saving — confirm the card updates immediately without a page reload, and the badge/diagram reflect the new value.
3. Navigating to `/dashboard/players` via the new "Players" nav item — confirm the full active-player list loads, typing in the search box filters it by name, and clicking a row opens `PlayerProfileCard` with correct data.
4. Clicking "Latest Partner" on the Player Overview card — confirm it now opens `PlayerProfileCard` (populated from the mock partner) instead of the old disabled-button popover.

If using the throwaway-route technique from earlier this session: add a temporary route under `app/`, temporarily allowlist it in `proxy.ts`'s `isPublicRoute` matcher, screenshot via Playwright, then revert both the temporary route and the `proxy.ts` edit immediately after — never leave either in place.

---

## Non-goals

(Carried forward from the design spec — nothing in this plan should drift into these.)

- No partner win-rate ranking, tournaments, or match history.
- No doubles/co-player booking support.
- No booking UX changes (favorite courts, rebook, filters).
- No visual polish pass on the existing bento cards.
- No club-scoping of the directory — it is intentionally global.
- No pagination on `/api/players`.
- No filtering the directory by anything other than name.
- No editing of any `UserProfile` field other than `preferredSide`/`dominantHand` through `PATCH /api/me`.
- No privacy controls or opt-out from appearing in the public directory.
- No real backing data for `LatestPartnerCard` — it still renders from an extended mock object.
