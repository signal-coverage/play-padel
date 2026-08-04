# Play Padel — Project Status

_Last updated: 2026-08-04_

A padel-club booking platform: players browse clubs/courts and book time slots; club owners manage their courts, availability, and reservations.

Convention used below: a feature described in plain text is fully wired to a real Prisma-backed API. Where a `(mocked: ...)` note is present, that feature's data is hardcoded/placeholder and needs real backend work before it's production-ready.

## Tech stack

- Next.js (App Router) + TypeScript
- Clerk — authentication
- Prisma + Neon Postgres — database
- Tailwind CSS + shadcn/ui
- Resend — transactional email

## Data model (Prisma — `prisma/schema.prisma`)

- `Club` — a padel club/tenant (name, contact, timezone, currency, plan, status)
- `UserProfile` — a person (owner or player), optionally linked to a `Club`
- `Court` — a physical court belonging to a club
- `CourtAvailability` — weekly recurring open-hours template for a court
- `Reservation` — a booking of a court by a user, with a status lifecycle (SCHEDULED/CONFIRMED/CANCELLED/COMPLETED/NO_SHOW)
- `Invoice` — a billing document for a user
- `Payment` — a manually recorded payment against an invoice
- `Notification` — a persisted record of an outbound notification attempt
- `AuditLog` — a generic audit trail row

No model exists yet for tournaments, matches, doubles partners, or player style/handedness — this is why the features listed under "not yet backed by the schema" below are mocked.

## Routes

- **Public**: `/` (landing), `/login`, `/signup`, `/sso-callback`, `/invite-error`, `/onboarding`
- **Player**: `/dashboard`, `/dashboard/browse`, `/dashboard/my-reservations`
- **Owner**: `/dashboard`, `/dashboard/courts`, `/dashboard/reservations`, `/dashboard/settings/club`

Route protection (`proxy.ts`): Clerk middleware protects every route except the public list above.

## Auth & Onboarding

- Login / signup — Clerk's `<SignIn>`/`<SignUp>` components, redirect to `/dashboard` (login) or `/onboarding` (signup after account creation).
- SSO callback — Clerk's `<AuthenticateWithRedirectCallback>`.
- Onboarding wizard — multi-step form branching on player vs. owner, submits to `/api/onboarding`. Player path upserts `UserProfile`; owner path creates a real `Club` row then upserts `UserProfile` with `role: "owner"`.
  - Court-range/plan step — only maps to `Club.plan`, does not create `Court` rows (by design — real court creation happens later in `/dashboard/courts`).
  - Terms & conditions checkbox — enforced at submit time. (mocked: acceptance itself is never persisted — no `acceptedTermsAt`/version field exists on `UserProfile`)
- Invite-error page — static error message, shown when profile provisioning fails; no logic of its own.

## Landing Page (`/`)

Entirely a marketing shell — every content section below is placeholder copy, disconnected from any real club/court/user data:

- Hero, header, CTA banner, footer shell — static, no data.
- "Beyond the Court" stats section (member count, satisfaction rate, coach count). (mocked: hardcoded `STATS` array, `app/_components/LandingTrusted/consts.ts`)
- "Why join us" accordion. (mocked: hardcoded `ABOUT_ITEMS`, `app/_components/LandingAbout/consts.ts`)
- Facilities grid. (mocked: hardcoded `FACILITIES` array, unrelated to any real club's actual courts, `app/_components/LandingFeatures/consts.ts`)
- Events grid. (mocked: hardcoded `EVENTS` array — no `Event` model or service exists at all, `app/_components/LandingEvents/consts.ts`)
- Testimonials carousel. (mocked: hardcoded fake names/quotes, `app/_components/LandingTestimonials/consts.ts`)
- Footer contact info and social links. (mocked: placeholder email/phone, all social links point to `#`, `app/_components/LandingFooter/consts.ts`)

## Player Dashboard (`/dashboard`, role: player)

**Bento cards (Hero, Skill Overview, Session Load, Progress & Goals, Schedule)** — all fully real, computed from the player's actual reservation history via `useMyReservations()`.

**Player Overview sidebar/banner** — the whole section is currently mocked:

- Player style card (preferred side + dominant-hand badge). (mocked: `preferredSide`, `dominantHand` — hardcoded in `MOCK_PLAYER_STYLE`, `PlayerOverview/consts.ts`)
- Latest partner card (name, avatar, times played together, last played). (mocked: entire `PartnerSummary` — `MOCK_LATEST_PARTNER`, same file; its "View full profile" button is also disabled with a "Coming soon" label since no profile page exists)
- Performance summary (tournament record, preferred position, latest results). (mocked: entire `PerformanceSummary` — `MOCK_PERFORMANCE`, same file)
- All three are served through `usePlayerOverviewData()` (`PlayerOverview/hooks.ts`), which returns the mock constants directly with no API call at all.

**Browse Courts** (`/dashboard/browse`) — fully real: club picker, per-court availability grid (15s live poll), and the book-slot flow all hit real Prisma-backed endpoints with server-side conflict checks.

**My Reservations** (`/dashboard/my-reservations`) — fully real: reservation list and self-cancel flow (2-hour cutoff enforced server-side).

## Owner Dashboard (`/dashboard`, role: owner)

Everything here is fully real — no mocked data found on the owner side.

- **Courts** (`/dashboard/courts`) — court list/table, create/edit form, deactivate (soft delete), and weekly availability editor. All backed by `/api/clubs/courts*`.
- **Reservations** (`/dashboard/reservations`) — availability grid, reservations table, slot details dialog, and Complete/No-show/Cancel actions. All backed by `/api/clubs/reservations*`.
- **Club Settings** (`/dashboard/settings/club`) — club profile form (name, legal name, tax ID, contact, timezone, currency), 1:1 with the `Club` model. Note: there's no club-wide "operating hours" concept — scheduling is only expressed per-court.
- **Dashboard Home owner cards** (Hero, Schedule, Utilization, Overview, Activity) — all computed from a shared `useOwnerReservationSummary()` hook hitting real reservation data.

## Backend domains (`core/`)

- `clubs`, `courts`, `reservations`, `users` — real Prisma-backed services, all reachable from `app/api` routes, all exercised by the UI described above.
- `billing` — invoice/payment logic (create/issue/void invoices, record payments, cash summaries) is implemented against real `Invoice`/`Payment` models. (mocked: no external payment gateway is wired anywhere — Stripe/MercadoPago were grepped for repo-wide with zero hits; only manual cash/card/transfer entries are supported. Additionally, **no `app/api` route calls this domain at all** — it's unreachable from the HTTP layer entirely, `core/billing/services/billing.service.ts`)
- `notifications` — persisting `Notification` rows and actual email delivery (via Resend) both work for the two flows that call them (reservation cancellation, invoice paid). (mocked/dead: `getPendingReservationReminders` has no cron/route caller anywhere, so reminder notifications never fire in practice; separately, `core/notifications/handlers/notification.handlers.tsx` registers event-bus listeners that are never imported by anything, making them dead code)
- `audit` — `logAudit()`/`listAuditLogs()` do real Prisma I/O against `AuditLog`, but (mocked/dead: nothing in the codebase ever calls `logAudit()` — the model, service, and DB table all exist, but no audit row is ever written)
- `events` — a working generic pub/sub event bus, but (mocked/dead: nothing ever calls `.emit()`, and its only registered consumer is never imported — fully orphaned)

No HTTP routes exist for `billing`, `notifications`, or `audit` — these three domains have real service-layer code but zero API surface exposing them.

## Notes

- `README.md` at the repo root previously contained leftover boilerplate from the template this project started from; it has since been rewritten to describe Play Padel accurately.
