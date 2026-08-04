# Dashboard Home — Player Overview Sidebar

**Date:** 2026-08-01
**Status:** Approved by user, ready for implementation planning.

## Goal

Add a "Player Overview" section to the player's Dashboard Home, showing at-a-glance info about their playing style (preferred side), most recent doubles partner, and performance stats (tournament record, preferred position, latest tournament results). Owners are unaffected — their Dashboard Home stays exactly as it is today.

## Scope decisions (resolved during brainstorming)

- **No backend changes.** The app's data model has no concept of preferred playing side, doubles partners/co-players on a reservation, or tournaments/matches at all (confirmed against `prisma/schema.prisma` — `Reservation` tracks a single booking user, no partner relation; no `Tournament`/`Match` model exists). This feature ships **UI-first with mock data**, shaped like plausible future real data, clearly labeled as placeholder. Wiring to real data is a separate future project once those backend concepts actually exist.
- **Dashboard Home only.** Not the root `app/dashboard/layout.tsx` (which wraps every dashboard route, including owner-only pages like Club Settings). The two-column split lives inside `DashboardHome.tsx`.
- **Player-only.** Owners keep today's single-column, full-width bento grid unchanged. The new left column only renders for `role === "player"`.

## Layout

### Desktop (`lg:` and up)

```
<div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_2fr] gap-3 lg:gap-4 lg:min-h-0 lg:flex-1">
  <PlayerOverviewCard className="hidden lg:block" />   {/* new */}
  <PlayerOverviewBanner className="lg:hidden" />        {/* new */}
  <div className="...">                                 {/* existing AnimatePresence/search bento block — untouched */}
</div>
```

The right column is exactly today's existing search/filter/bento-grid block, moved into a grid cell with no behavior change — same search, same filtering, same cards. The left column is new and is _not_ searchable/filterable; it's a fixed sidebar.

### Mobile (below `lg:`)

Instead of stacking a full-height overview card above the booking content (which would push the actually-useful content far down the page), the left column collapses to a compact tappable banner. Tapping it opens a `Sheet` (this app's existing mobile-drawer primitive, already used by `CourtFormSheet`/`AvailabilitySheet`) containing the exact same content as the desktop card — no duplicated markup between compact and expanded views.

This mirrors the existing `AppNavbar`/`MobileBottomNav` pattern in this codebase: two sibling components, each visible only at its own breakpoint via Tailwind's `hidden`/`lg:hidden` (fully removed from layout when hidden, no JS viewport detection, no hydration flicker).

## Component architecture

Following this project's established convention (one render output per component; components that need more than one output split into their own folders; consts/utils/types always in their own files):

```
DashboardHome/components/PlayerOverview/
  PlayerOverviewContent/          — shared core: renders PlayerStyleSection + PerformanceSummarySection, no Card wrapper
    PlayerOverviewContent.tsx
    types.ts                     — PreferredSide, MatchResult, PartnerSummary, PerformanceSummary shapes
    consts.ts                    — MOCK_PLAYER_STYLE, MOCK_LATEST_PARTNER, MOCK_PERFORMANCE (placeholder data)

  PlayerOverviewCard/             — desktop shell
    PlayerOverviewCard.tsx        — <Card><PlayerOverviewContent /></Card>

  PlayerOverviewBanner/           — mobile shell
    PlayerOverviewBanner.tsx      — compact tappable row; owns Sheet open/close state
    components/
      BannerPreview/              — the compact row's own content (icon + label + tiny preview + chevron)

  components/
    PlayerStyleSection/           — top section
      PlayerStyleSection.tsx      — lays out PadelSideDiagram + LatestPartnerCard together
      components/
        PadelSideDiagram/         — SVG court illustration, highlights forehand/backhand half
          PadelSideDiagram.tsx
          types.ts
        LatestPartnerCard/        — compact trigger + Popover (profile summary + CTA)
          LatestPartnerCard.tsx
          types.ts

    PerformanceSummarySection/    — bottom section
      PerformanceSummarySection.tsx
      components/
        TournamentRecord/         — built on the existing shared StatValue component, plus a small trophy/cup SVG accent
          TournamentRecord.tsx
        LatestTournamentResults/  — row of compact W/L outcome chips
          LatestTournamentResults.tsx
          types.ts
```

`PlayerOverviewCard` and `PlayerOverviewBanner` are both thin shells around the same `PlayerOverviewContent` — same pattern already used by `HeroCard`'s `OwnerHero`/`PlayerHero` wrapping a shared `HeroShell`.

## Content details

### `PadelSideDiagram`

A simple top-down court SVG (outline, center line, net) with one half tinted (`bg-primary/15`-equivalent fill) based on preferred side. Mapping: **Forehand → right half, Backhand → left half** (the conventional padel "drive"/"revés" split for a right-handed player). This is a real assumption baked into the visual — flagged for the user to correct after seeing it if the convention doesn't match what they meant.

### `LatestPartnerCard`

Compact row (avatar + name + chevron) as a `Popover` trigger. Popover content: larger avatar, name, one or two quick facts (mock, e.g. "Played together 5 times"), and a "View full profile" button — rendered visibly but disabled with a short "Coming soon" note, since no profile page exists yet (per this codebase's established writing convention: never leave a dead control with no explanation).

### Mobile banner (`BannerPreview`)

One compact row: racket/court icon + "Your player overview" label + a tiny preview (preferred-side badge + partner avatar) + a chevron. Tapping opens the `Sheet`.

### Performance Summary (bottom section)

- **`TournamentRecord`**: one combined `StatValue` (`variant="stacked"`) showing "Tournaments" → "5/12" (won/played), with a small trophy/cup SVG icon accent next to it for visual identity.
- **Preferred position badge**: a small `Badge` reusing the same forehand/backhand icon language as `PadelSideDiagram`, so the two sections agree visually rather than introducing a second way to represent the same fact.
- **`LatestTournamentResults`**: a compact row of small colored outcome chips (green "W" / red "L"), most-recent match first, for the latest tournament.

## Mock data

All mock data lives in `PlayerOverviewContent/consts.ts`, shaped like plausible future real data (so swapping in real API calls later is a drop-in replacement of the data source, not a rewrite of the components). Each mock constant is clearly commented as placeholder.

## Design language / reuse

No new visual primitives beyond `PadelSideDiagram` and `LatestTournamentResults`' outcome chips — everything else reuses what already exists in this codebase: `Card`, `Popover`, `Badge`, `Sheet`, and the shared `StatValue` component (built during this session's duplication-consolidation pass). Spacing, radius, and typography follow the same conventions already established across the other `DashboardHome` cards.

## Non-goals

- No backend/schema changes (no `preferredSide` field, no partner/match/tournament models).
- No real profile page (the "View full profile" CTA is a visible, disabled placeholder).
- No change to the owner's Dashboard Home view.
- No change to `app/dashboard/layout.tsx`.
