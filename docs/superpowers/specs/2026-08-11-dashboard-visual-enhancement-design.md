# Dashboard Visual Enhancement

**Date:** 2026-08-11
**Status:** Design approved by user, spec pending final review before implementation planning.

## Goal

The authenticated dashboard (as opposed to the landing/auth/onboarding flow already reviewed and fixed in this session) reads as flatter and less finished than the rest of the app. Visual inspection via Playwright (logged-in session, both light and dark mode, across `/dashboard`, `/dashboard/browse`, `/dashboard/players`) surfaced two distinct problems, split into two phases the user approved in order.

## Findings (from visual inspection, not just source reading)

- **Light mode under-uses the brand accent.** The token system already maps `--primary` (navy) and `--accent` (yellow) correctly per theme, but dashboard components only ever reach for `primary`. Toggling dark mode made the app look noticeably more "alive" — CTA button, badges, and icons all pick up yellow — but only because dark theme's `--primary` role happens to be yellow, not because any component deliberately chose an accent color. Light mode (the default, what most users see) never does the equivalent.
- **Uniform border-radius everywhere.** Buttons, cards, badges, avatars, and inputs all share the same `1.5rem`-derived radius scale with no variation by element importance/size — flattens hierarchy.
- **Flat shadows.** `globals.css` already defines a `--shadow-card` token using `color-mix` for a tinted shadow, but cards may not actually be consuming it (needs verification during implementation).
- **Sparse secondary spots on the home dashboard.** `SkillOverviewCard` is mostly empty whitespace around one small icon before any play data exists.
- **`Browse Courts` is nearly blank on load.** Just a heading, one `<Select>` ("Select a club"), and a line of help text until a club is picked — no visual anchor.
- **`Players` directory rows under-use their width.** Each row is a bordered pill (avatar + name + subtitle) filling roughly two-thirds of the row width, with dead space trailing and no secondary content (category, activity, actions).
- Could not evaluate the filled state of `CourtAvailabilityGrid` (the actual court/slot picker under Browse Courts) — the only test club in the dev database has no courts configured. This is a data gap, not a design finding, and is out of scope here.

## Phase 1 — Bring the brand forward

Token/detail work only. No layout or component-structure changes.

- **Deliberate accent placement in light mode**: apply `text-accent`/`bg-accent` (the same way the landing page already does, e.g. `text-accent` on "Connect." in the hero) to specific load-bearing spots — key stat numbers (tournament record, skill category), the active/today cell in the dashboard's calendar, badge highlights (Position, W/L record chips). Not a blanket swap of navy — buttons and nav stay navy (`primary`), this is about adding intentional yellow pops where landing-page precedent already exists.
- **Border-radius hierarchy**: tighten inner/small elements (badges, avatar chips, small pills) to a smaller radius than outer containers (cards, sheets), which keep the current soft radius. Establishes a visible size→importance relationship instead of one uniform shape.
- **Tinted shadows**: verify whether cards consume the existing `--shadow-card` token; wire it in wherever cards currently fall back to a flat default shadow.
- **Fill sparse spots**: give `SkillOverviewCard`'s empty state a more intentional treatment (small illustration/pattern) consistent with how other empty states in the app are already handled, rather than one icon floating in a large empty box.

**Scope**: `app/dashboard/_components/DashboardHome/**` (bento cards, `StatValue`, badge/pill usages), `app/globals.css` (shadow wiring only, no new color tokens).

## Phase 2 — Restructure the empty secondary views

Structural component work, larger diff than Phase 1.

- **`Browse Courts`**: replace the bare `<Select>` with a visual club picker — cards showing club name/location (and logo if available) — so the page has real content on first load instead of a near-blank screen. The date-nav + `CourtAvailabilityGrid` below it, once a club is selected, is unchanged by this phase.
- **`Players` directory**: replace the current bare-pill list rows with a responsive card grid, matching how player identity is already presented elsewhere in the app (`PlayerProfileCard`). Cards should use the reclaimed width meaningfully (category badge, etc.) rather than just being a wider version of the same bare content — exact card content is an implementation-level judgment call, following the existing `PlayerProfileCard` pattern where reasonable.

**Scope**: `app/dashboard/browse/**`, `app/dashboard/players/**` (`PlayersDirectory`, `PlayerRow` → new card component).

## Design language / reuse

No new visual primitives beyond what Phase 1 introduces (accent usage, radius scale, shadow token). Phase 2's player card should follow `PlayerProfileCard`'s existing conventions rather than inventing a new card style. Both phases apply the project's existing SRP file-structure convention to any new/restructured components.

## Non-goals

- No change to the home dashboard's overall bento grid structure or card positions — Phase 1 is color/depth/detail only.
- No change to `CourtAvailabilityGrid`'s filled-state rendering — unverifiable in the current dev database (no courts configured for the only test club) and out of scope regardless.
- No brand hue/palette changes — navy and yellow stay as defined in `globals.css`; this is about _where_ the existing accent is applied, not introducing new colors.
- No navigation or information-architecture changes (nav stays `Dashboard / Browse Courts / My Reservations / Players`).
- `My Reservations` (`app/dashboard/my-reservations/**`) was not inspected and is not part of either phase.
