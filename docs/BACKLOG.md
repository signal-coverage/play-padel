# Backlog — Ready Now vs. Needs Decisions

_Last updated: 2026-08-15_

Full-app review findings, split into two lists: things with no open questions that could be picked up and built today, and things that need a decision, a spec, or at least a brainstorm before writing code. Related docs: [PROJECT_STATUS.md](PROJECT_STATUS.md) (what's real vs. mocked), [ROADMAP.md](roadmap.md), [SECURITY.md](SECURITY.md), [DESIGN_SKILLS_PLAN.md](DESIGN_SKILLS_PLAN.md), [COMPLIANCE.md](COMPLIANCE.md) (legal detail — not duplicated here).

## Ready to implement now

_Status as of 2026-08-16: all 18 items below have been implemented (see [PROJECT_STATUS.md](PROJECT_STATUS.md) and [DESIGN_SKILLS_PLAN.md](DESIGN_SKILLS_PLAN.md) for detail on the two review passes). One item is functionally blocked on a manual step — see the note below._

- ~~**Fix the false "no payment required" line**~~ — done. `app/onboarding/terms-content.ts` now accurately describes the Mercado Pago prepayment flow.
- ~~**Persist terms acceptance**~~ — **partially done, blocked on you.** `acceptedTermsAt DateTime?` was added to `UserProfile` in `prisma/schema.prisma`, but this project has never used Prisma Migrate (no `migrations/` folder — it's always synced via `prisma db push`), and `db push`/`migrate dev` are both DB-mutating commands the harness blocks from automated agents. Run `npx prisma db push` yourself, then ask to resume — `app/api/onboarding/route.ts` still needs to be wired to stamp the field (deliberately left undone until the column actually exists in the DB).
- ~~**Add a global error boundary**~~ — done. `app/error.tsx` + `app/global-error.tsx`, styled to match `app/not-found.tsx`.
- ~~**Validate the club logo URL field**~~ — done. Both `core/clubs/schemas/club.schema.ts` and its client-side mirror in `ClubSettingsView/consts.ts` now use `z.union([z.literal(""), z.string().url()])`.
- ~~**Add an 18+ self-certification checkbox**~~ — done, combined into the existing terms checkbox in `TermsStep.tsx` rather than as a separate control.
- ~~**Retire `docs/PlayPadel_Documentation_Recommendations.md`**~~ — done, deleted.
- ~~**Fix the stale line in `roadmap.md`**~~ — done.
- ~~**Add custom Vercel Analytics events**~~ — done. `signup_completed`, `booking_confirmed`, `payment_confirmed` via `track()` from `@vercel/analytics` (not the `/next` subpath, which only exports the `<Analytics/>` component).
- ~~**Stand up Vitest + first tests**~~ — done. 24 tests across reservation conflict validation, the self-cancel cutoff, and Mercado Pago webhook signature verification.
- ~~**Add a CI workflow**~~ — done. `.github/workflows/ci.yml` (lint, typecheck, test — includes a `prisma generate` step, added after a fresh review caught its absence would break a clean checkout).
- ~~**`canvas-confetti` burst**~~ — done, gated behind `prefers-reduced-motion`.
- ~~**`vaul` bottom-sheet**~~ — done. `components/ui/drawer.tsx` added (didn't exist before); `BookingConfirmDialog` now branches responsively between it and the existing centered Dialog.
- ~~**`cmdk` command palette**~~ — done. Sources its entries from the same nav-links list `AppNavbar`/`NavLinks` already use, filtered by role.
- ~~**`@react-pdf/renderer` invoice/receipt PDFs**~~ — done. `GET /api/player/reservations/[id]/receipt` + a "Receipt" download button on `ReservationRow`, shown only when a completed payment exists.
- ~~**`nuqs`-synced filters`**~~ — done, via a custom local-date parser (nuqs' built-in ISO parser would have encoded the wrong calendar day for Argentina's UTC-3 offset).
- ~~**Run the queued animation/accessibility pass**~~ — done, on both `app/dashboard/browse/**` and `app/dashboard/my-reservations/**`. Findings logged in `DESIGN_SKILLS_PLAN.md`.
- ~~**Run the queued `dataviz` pass**~~ — done, on the one Recharts component that actually existed (`OverviewChart`). Findings logged in `DESIGN_SKILLS_PLAN.md`.
- ~~**Add route-transition animation**~~ — done, via two separate `template.tsx` files (root + dashboard-scoped) so the dashboard navbar itself doesn't remount on every navigation.

## Needs decisions, brainstorming, or spec planning

- **`GET /api/player/clubs?date=` is an unbounded N+1 query** — fetches every active club's courts and each court's slots (4 queries per court) just to compute `hasAvailabilityToday`, on every Browse Courts mount and date change. Fine at today's scale, will not scale past a handful of clubs. Needs a real backend decision: a single aggregate query, a cached/precomputed availability flag, or similar — not a quick fix. Flagged by the Browse Courts three-panel redesign's final review (2026-08-16).
- **Browse Courts' date navigator is only reachable after selecting both a club and a court** — two levels deeper than before the three-panel redesign, so a player can't change the browsing date to see different clubs' availability without first drilling in. Needs a UX decision on where a shared date control should live relative to the three panels (the current per-court `CourtAvailabilityGrid` owns its own navigator internally). Flagged by the same final review, deliberately not redesigned unilaterally mid-fix-wave.
- **Terms of Service & Privacy Policy content, and wiring `/terms`/`/privacy` live** — blocked on attorney review, see [COMPLIANCE.md](COMPLIANCE.md).
- **Footer contact email/phone + social links** — needs real business info, not something to invent.
- **Crash-reporting/error-monitoring service** (e.g. Sentry) — needs a provider choice + account/DSN.
- **Clerk webhook handling** (`user.deleted`/`user.updated`) — `svix` is already installed and unused, but wiring it needs a data-retention decision first: hard-delete, soft-delete, or anonymize a `UserProfile` and its reservations when the Clerk account goes away (ties to the _derecho de supresión_ gap in [COMPLIANCE.md](COMPLIANCE.md)).
- **Decide the fate of the other 4 dead dependencies** (`react-joyride`, `@dnd-kit`, `html2canvas`, `input-otp`) — wire each into a real feature or prune it.
- **`react-joyride` onboarding tour** — needs a decision on which UI moments to highlight and in what order; a small content/design task, not just wiring.
- **`@dnd-kit` drag-to-reorder courts** — needs a decision on whether court order is meaningful anywhere, plus a new `sortOrder` schema field if so.
- **QR check-in per reservation** — needs a decision on the actual physical flow: who scans it, what confirms it, does it replace anything.
- **Doubles partner history** — no schema exists; needs a spec for what counts as "played together" and how it's tracked.
- **Tournaments / matches / player rankings** — no schema at all; needs a full spec (bracket format, scoring, how it ties to reservations).
- **Player search/discovery** — needs a scope decision (search by skill level? location? availability?).
- **Waitlist for fully-booked slots** — needs a decision on notification mechanism and fairness/ordering rules.
- **Recurring/repeating reservations** — needs a decision on conflict handling when a recurring slot collides with something else down the line.
- **Ratings/reviews for clubs/courts** — needs a moderation policy before it can open to the public.
- **Favorites / "book again" shortcut** — mostly a UX-placement decision, otherwise small.
- **Split payment among the group booking together** — needs a real payment-split design (Mercado Pago multi-payer vs. manual settlement).
- **In-app chat between matched players** — needs an abuse-prevention/moderation decision before opening any messaging surface.
- **Owner-side analytics beyond the current dashboard** — needs a decision on what metrics owners actually want.
- **Referral program / loyalty points** — needs a full program design (rewards, fraud prevention).
- **Calendar sync** (.ics / Google Calendar) — needs a decision on one-way export vs. two-way sync.
- **PWA/offline support** — needs a decision on whether offline functionality even makes sense for a live-availability booking app.
- **Mobile app / push notifications** — a big scope decision (native vs. wrapped web, notification infra choice).
- **Multi-language UI (Spanish)** — a direct product decision affecting real end users today, unlike most items on this list which are dev/business-facing.
- **Real-time availability** (WebSocket/SSE vs. tuned polling) — `ws`/`@types/ws` are already installed and unused; needs an architecture decision before more is invested in 15s polling.
- **GA4/Google Search Console setup + sitemap submission** — needs your account access, not something that can be done from the repo.
- **Confirm a staging/preview environment** separate from production exists.
- **Confirm Neon's backup/point-in-time-recovery** is actually enabled on your plan tier.
- **Customizable receipts + real legal invoicing (facturación)** — the current PDF receipt (`lib/pdf/ReceiptDocument/`) is intentionally plain/non-editable. Two separate asks here: (1) letting each club owner customize some fields of their own receipt (not the whole template) — needs a decision on exactly which fields are owner-editable; (2) turning the receipt into an actual legal invoice (factura) recognized by ARCA (formerly AFIP) — needs the business's tax registration/CUIT/invoicing-type details worked out first (this is a real integration with ARCA's electronic invoicing system, not a template change) before any implementation planning makes sense.
- ~~**Player search & Browse Courts table redesign**~~ — done (2026-08-16). `components/DataTable/` (shared primitive) + Players Directory rebuilt as a filterable/sortable table; Browse Courts rebuilt as three panels (clubs → that club's courts → selected court's schedule). Win-rate filter deferred as planned (no `Match`/`Tournament` model). Two follow-ups this surfaced are tracked separately above: the `/api/player/clubs` N+1 query, and the date navigator now being two levels deep.
