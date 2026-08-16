# Backlog — Ready Now vs. Needs Decisions

_Last updated: 2026-08-15_

Full-app review findings, split into two lists: things with no open questions that could be picked up and built today, and things that need a decision, a spec, or at least a brainstorm before writing code. Related docs: [PROJECT_STATUS.md](PROJECT_STATUS.md) (what's real vs. mocked), [ROADMAP.md](roadmap.md), [SECURITY.md](SECURITY.md), [DESIGN_SKILLS_PLAN.md](DESIGN_SKILLS_PLAN.md), [COMPLIANCE.md](COMPLIANCE.md) (legal detail — not duplicated here).

## Ready to implement now

No open questions — pick any of these up directly.

- **Fix the false "no payment required" line** in the onboarding terms placeholder (`app/onboarding/terms-content.ts`) — contradicts the live Mercado Pago flow.
- **Persist terms acceptance** — add `acceptedTermsAt`/version to `UserProfile` and write it on submit; currently enforced client-side but never recorded.
- **Add a global error boundary** (`app/error.tsx`, `app/global-error.tsx`) — none exists; an unhandled exception currently falls through to Next's default screen.
- **Validate the club logo URL field** with `z.string().url()` instead of a bare string.
- **Add an 18+ self-certification checkbox** at signup (matches the policy already decided in [COMPLIANCE.md](COMPLIANCE.md)).
- **Retire `docs/PlayPadel_Documentation_Recommendations.md`** — stale, contradicts `PROJECT_STATUS.md` (says payments/audit/notifications aren't done; they are).
- **Fix the stale line in `roadmap.md`** ("every landing section is placeholder") — already contradicted by `PROJECT_STATUS.md`'s landing section.
- **Add custom Vercel Analytics events** at real conversion moments (signup complete, booking confirmed, payment confirmed) — currently only default page views.
- **Stand up Vitest + first tests**: reservation conflict validation, the 2-hour self-cancel cutoff, Mercado Pago webhook signature verification. Zero tests exist today.
- **Add a CI workflow** (`.github/workflows`) running lint + tests on PRs.
- **`canvas-confetti` burst** on booking/payment success (matches the idea you already had).
- **`vaul` bottom-sheet** for the mobile booking-confirmation drawer instead of a centered dialog.
- **`cmdk` command palette** (Cmd+K) for owner navigation between Courts/Reservations/Settings — the dependency is already installed and unused.
- **`@react-pdf/renderer` invoice/receipt PDFs** — the `Invoice`/`Payment` models already exist to back this.
- **`nuqs`-synced filters** on Browse Courts — shareable/bookmarkable search state.
- **Run the queued animation/accessibility pass** on `app/dashboard/browse/**` and `app/dashboard/my-reservations/**` — already scoped in `DESIGN_SKILLS_PLAN.md`, just never executed; the most important player flow has had zero polish investment compared to everything else.
- **Run the queued `dataviz` pass** on the Recharts dashboard cards — also already scoped, marked "pending."
- **Add route-transition animation** between pages — framer-motion patterns already exist for in-page reveals, just not for navigation.

## Needs decisions, brainstorming, or spec planning

- **Terms of Service & Privacy Policy content, and wiring `/terms`/`/privacy` live** — blocked on attorney review, see [COMPLIANCE.md](COMPLIANCE.md).
- **Footer contact email/phone + social links** — needs real business info, not something to invent.
- **Crash-reporting/error-monitoring service** (e.g. Sentry) — needs a provider choice + account/DSN.
- **Clerk webhook handling** (`user.deleted`/`user.updated`) — `svix` is already installed and unused, but wiring it needs a data-retention decision first: hard-delete, soft-delete, or anonymize a `UserProfile` and its reservations when the Clerk account goes away (ties to the *derecho de supresión* gap in [COMPLIANCE.md](COMPLIANCE.md)).
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
