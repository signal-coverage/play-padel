# Shared DataTable Component + Players Directory Redesign

_Design doc — sub-project 1 of 2 (see also: 2026-08-16-browse-courts-three-panel-design.md, which depends on this one)._

## Context

The Players Directory (`app/dashboard/players`) currently renders a card grid (`PlayerCard`) with client-side name search over `GET /api/players`. The user wants a denser, table-styled UI (reference: a project-management-style data table — avatar+name column, tag-style badge columns, no checkboxes/bulk actions per explicit decision) with filters and sorting on the player fields that already exist. This also introduces a reusable `DataTable` primitive that the Browse Courts redesign (sub-project 2) will reuse for its club-list and court-list panels.

## Goals

- A generic, reusable `DataTable` component: config-driven columns, a filter-bar slot, a sort-control slot, empty-state and loading-state props.
- Players Directory rebuilt on top of it with:
  - Columns: avatar + name, category, preferred side, dominant hand.
  - Filters: category, preferred side, dominant hand (dropdowns, combinable), plus the existing name search.
  - Sort: same four fields, presented as a "Sort by" dropdown + ascending/descending toggle, styled consistently with the filters.
  - Row click: unchanged — opens the existing `PlayerProfileCard` modal.

## Non-goals

- No row-selection checkboxes or bulk actions (explicitly ruled out).
- No pagination — full filtered list rendered client-side, matching today's behavior. The reference image's pagination footer is not being built; revisit only if the player count grows enough to need it.
- No win-rate filter — no `Match`/`Tournament` data model exists to compute it from (tracked separately in `docs/BACKLOG.md`).
- No change to how player data is fetched (`GET /api/players` stays as-is).

## Architecture

- New `components/DataTable/` (project-root shared component, since it's reused outside the players feature):
  - `DataTable.tsx` — renders a header row from a `columns` config and body rows from a `rows` array; accepts optional `filterBar`/`sortControl` render slots above the table, an `emptyState` node, and a `loading` boolean that renders a skeleton matching the existing table-skeleton convention (`CourtsTable`/`ReservationsTable`/`AuditLogsTable`).
  - `types.ts` — generic `Column<T>` shape (key, header label, optional custom cell renderer).
- `app/dashboard/players/_components/PlayersDirectory/`:
  - `consts.ts` gains the column definitions (avatar+name, category, preferred side, dominant hand) and the filter/sort option lists.
  - `hooks.ts` extended with local filter/sort state (see Data flow) and the derived filtered+sorted list.
  - A new `PlayersFilterBar` sub-component (search input + 3 filter dropdowns + sort dropdown), following the existing SRP folder convention.
  - `PlayersDirectory.tsx` renders `PlayersFilterBar` + `DataTable`, replacing the current card-grid markup.

## Data flow

- No backend changes. Filtering, sorting, and the existing name search are all computed client-side over the already-fetched player list — same pattern as today's search, just extended.
- Filter/sort state is **local component state, not URL-synced.** This wasn't part of what we discussed for Players Directory specifically (only Browse Courts got the nuqs treatment), and it matches the existing name-search behavior, which is also local state today. Revisit if you want shareable filtered views later.

## Error handling

- Reuses the existing query hook's loading/error states — `DataTable`'s `loading` prop drives the skeleton, and a query error falls back to whatever the current directory already shows on failure (no new error UI needed).
- Empty state: "No players match your filters."

## Testing

- Vitest unit tests (following this session's established pattern) for the pure filter/sort functions — e.g. `filterPlayers(players, filters)` and `sortPlayers(players, sortKey, direction)` — deterministic and cheap to test in isolation, including the "no filters applied" and "multiple filters combined" cases.
- No new API/backend logic, so no new integration-level tests needed here.

## Out of scope / explicitly deferred

- Win-rate filter (blocked on a `Match` data model — see `docs/BACKLOG.md`).
- Real pagination.
- Bulk selection/actions.
