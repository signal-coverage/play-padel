# Player Profiles & Directory

**Date:** 2026-08-05
**Status:** Approved by user, ready for implementation planning.

## Goal

Let players set their own preferred side and dominant hand (currently mocked in `PlayerOverview`), and let any player browse/search a public directory of every other player in the app, viewing a shared profile card with skill level, play style, and contact info.

## Scope decisions (resolved during brainstorming)

- **`preferredSide` and `dominantHand` become real, editable `UserProfile` fields.** They currently exist only as `MOCK_PLAYER_STYLE` in `PlayerOverview/consts.ts`. Both are nullable — an unset value renders as "Not set yet" (matching this codebase's existing convention for `padelCategory`, see `getPadelCategoryLabel`), not an error or blank space.
- **The directory is public and global**, not scoped to a shared club. Any player can browse/search every other player in the app.
- **The directory is a dedicated page** (`/dashboard/players`), not a modal/drawer — searchable lists work better as a real route, and it's the same weight as the app's other top-level sections.
- **The directory gets its own top-level nav entry** ("Players"), alongside Dashboard / Browse Courts / My Reservations — not just inline links buried inside those pages.
- **Profile card shows contact info** (email, phone) in addition to identity/play-style fields — this is a public directory by design, so that's an accepted tradeoff, not an oversight.
- **`LatestPartnerCard` is rewired to open the same `PlayerProfileCard`** used by the directory, rather than staying on its current disabled "Coming soon" popover. Since `MOCK_LATEST_PARTNER` has no real backing `UserProfile` row (no real partner-history model exists yet — see `PROJECT_STATUS.md`), the mock object itself is extended with the additional mocked fields (`padelCategory`, `preferredSide`, `dominantHand`, `email`, `phone`) needed to render through the shared card. This stays flagged as mocked data everywhere it's documented.
- **Explicitly out of scope for this pass**: partner win-rate ranking, tournaments/match history tables, doubles support, booking UX ideas (favorite courts, rebook, filters), and bento-card visual polish — all discussed during brainstorming and deliberately deferred to later work.

## Data model

New Prisma enums, matching the lowercase-value convention already used by `SystemRole` (not the SCREAMING_CASE convention used by e.g. `ReservationStatus`), since these mirror existing app-level string literal types:

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

Added to `UserProfile` (both nullable — no backfill needed, existing rows simply read as unset):

```prisma
preferredSide PreferredSide?
dominantHand  DominantHand?
```

Applied via `prisma db push` (this project has no migration history — see `CONTRIBUTING.md`), not `prisma migrate dev`.

## API

- **`PATCH /api/me`** (new handler on the existing route) — the authenticated player updates their own `preferredSide`/`dominantHand`. Body: `{ preferredSide?, dominantHand? }`, both optional so either can be set independently. No other `UserProfile` fields are editable through this endpoint in this pass.
- **`GET /api/players`** (new route) — public (any authenticated user), lists `UserProfile` rows where `role: "player"` and `status: "ACTIVE"`. Optional `?q=` query param does a case-insensitive `displayName` search. Returns: `id`, `displayName`, `photoURL`, `padelCategory`, `preferredSide`, `dominantHand`, `email`, `phone`. No pagination in this pass — returns the full matching result set; the app's expected player count doesn't justify the added complexity yet.

## Component architecture

Following this project's established convention (one render output per component; consts/utils/types always in their own files):

```text
components/PlayerProfileCard/              — shared across directory + LatestPartnerCard
  PlayerProfileCard.tsx
  types.ts
  utils.ts                                 — label helpers for preferredSide/dominantHand null states

app/dashboard/players/
  page.tsx
  _components/PlayersDirectory/
    PlayersDirectory.tsx                   — search input + list, owns the fetch
    hooks.ts                               — usePlayers(query) via React Query
    components/PlayerRow/
      PlayerRow.tsx                        — one row, opens PlayerProfileCard on click
      types.ts

app/dashboard/_components/DashboardHome/components/PlayerOverview/components/PlayerStyleSection/components/
  EditPlayerStyleDialog/                   — new: small form (two selects), calls PATCH /api/me
    EditPlayerStyleDialog.tsx
    types.ts
  LatestPartnerCard/                       — existing, modified: swap its Popover for PlayerProfileCard
```

`PlayerProfileCard` accepts a plain data object (not a fetch of its own), so it works identically whether fed by a real `/api/players` row or the extended `MOCK_LATEST_PARTNER` object.

## Content details

### `PlayerProfileCard`

A `Dialog` (not a `Sheet` — this is a compact info card, not a multi-field form/drawer) showing: avatar (photoURL or initials fallback), display name, skill level (`getPadelCategoryLabel`, reused from `SkillOverviewCard/utils.ts`), preferred side, dominant hand, email, phone. Preferred side / dominant hand render "Not set yet" when null, exactly like skill level already does.

### `/dashboard/players`

A search input (debounced, filtering by name via `?q=`) above a list of `PlayerRow`s. Each row shows avatar + name + skill level as a compact preview; clicking opens the full `PlayerProfileCard` for that player.

### Nav entry

New item in `app/dashboard/_components/AppNavbar/consts.ts`'s `navItems` array: `{ title: "Players", href: "/dashboard/players", icon: Users, roles: ["player"] }` (lucide-react `Users` icon), placed alongside the other player-only entries (Browse Courts, My Reservations).

### Edit affordance

A small pencil/edit icon on the existing `PlayerStyleSection` opens `EditPlayerStyleDialog` — two `Select`s (Preferred side: Forehand/Backhand; Dominant hand: Right/Left), each defaulting to the current value or unset, submitting via `PATCH /api/me` and invalidating whatever query backs the Player Overview data on success.

### `LatestPartnerCard`

`MOCK_LATEST_PARTNER` (`PlayerOverview/consts.ts`) gains `padelCategory`, `preferredSide`, `dominantHand`, `email`, `phone` (all mocked, matching the existing comment there about placeholder data). Clicking the card now opens `PlayerProfileCard` fed by this object, instead of the current disabled-button Popover.

## Mock data

Only `MOCK_LATEST_PARTNER` gains fields (still 100% mocked, still commented as such). `MOCK_PLAYER_STYLE` and its mock preferredSide/dominantHand are retired entirely — `PlayerOverviewCard` now reads these two fields from the real authenticated user's profile instead.

## Design language / reuse

No new visual primitives beyond `PlayerProfileCard` itself — reuses `Dialog`, `Avatar`, `Select`, `Badge` (for skill level, matching the existing `Position` badge style in `PerformanceSummarySection`), and `getPadelCategoryLabel`. The "Not set yet" convention for null play-style fields is lifted directly from the existing skill-level pattern rather than inventing a new one.

## Non-goals

- No partner win-rate ranking, tournaments, or match history (needs a `Tournament`/`Match` schema that doesn't exist — separate future project).
- No doubles/co-player booking support.
- No booking UX changes (favorite courts, rebook, filters).
- No visual polish pass on the existing bento cards.
- No club-scoping of the directory — it is intentionally global.
- No pagination on `/api/players` — returns the full result set for now.
- No filtering the directory by anything other than name (no filter by skill level, preferred side, or handedness in this pass).
- No editing of any `UserProfile` field other than `preferredSide`/`dominantHand` through the new `PATCH /api/me` handler.
- No privacy controls or opt-out from appearing in the public directory — every active player is listed with no way to hide their profile or contact info.
- No real backing data for `LatestPartnerCard` — it still renders from an extended mock object, not an actual partner-history record.
