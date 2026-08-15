# Play Padel — Project Status

_Last updated: 2026-08-15_

A padel-club booking platform: players browse clubs/courts and book time slots; club owners manage their courts, availability, and reservations.

Convention used below: a feature described in plain text is fully wired to a real Prisma-backed API. Where a `(mocked: ...)` note is present, that feature's data is hardcoded/placeholder and needs real backend work before it's production-ready.

Related docs: [ARCHITECTURE.md](ARCHITECTURE.md) (stack, diagrams, folder structure), [API.md](API.md) (full route list), [DATABASE.md](DATABASE.md) (Prisma models + ERD), [ROADMAP.md](ROADMAP.md) (what's next), [SECURITY.md](SECURITY.md).

No model exists yet for tournaments, matches, doubles partners, or player style/handedness — this is why the Player Overview features below are mocked.

## Auth & Onboarding

- Login / signup — Clerk's `<SignIn>`/`<SignUp>` components, redirect to `/dashboard` (login) or `/onboarding` (signup after account creation).
- SSO callback — Clerk's `<AuthenticateWithRedirectCallback>`.
- Onboarding wizard — multi-step form branching on player vs. owner, submits to `/api/onboarding`. Player path upserts `UserProfile`; owner path creates a real `Club` row then upserts `UserProfile` with `role: "owner"`. Continue/Submit are disabled until the current step's own required fields are actually valid (checked via an independent zod parse, not RHF's own error state, so nothing flashes red before the user has touched a field).
  - **Player flow**: Profile (name, email, phone, gender) → Location (address, country/province/city cascading picker, zip code) → Padel style (category, preferred side, dominant hand) → Terms.
  - **Owner flow**: Club Basics (name, email, phone, address, country/province/city, zip code) → Legal & Billing (legal name, CUIT-formatted tax ID) → Plan → Profile (display name + full review summary) → Terms.
  - Google OAuth auto-fill — name, email, and avatar (`photoURL`) are pulled from Clerk's normalized user data (populated from Google's `given_name`/`family_name`/profile photo on sign-up) and pre-fill the relevant fields; still fully editable.
  - Cross-field auto-fill chains — club `legalName` and the owner's `displayName` track the club `name` live until manually overridden; `country` is auto-detected from the phone field's calling code.
  - Phone field — a compound field with a searchable calling-code combobox (real flag icons via `country-flag-icons`, not emoji) next to a plain number input. Selecting a code sets `country` directly; the number itself is formatted live to the **selected country's own real national convention** via `libphonenumber-js`'s `AsYouType` (not a single hardcoded format), with a matching per-country example placeholder.
  - Location — real cascading Country → Province/State → City picker (`country-state-city` npm data, no external API), shared between both flows via one `useCountryProvinceCityFields` hook so the parent step can lay the fields out however it needs.
  - Plan step — four real tiers on `Club.plan` (`BASIC`/`PRO`/`PLUS`/`MAX`, ARS pricing, a monthly/annual billing toggle with an exact "save 2 months" annual discount, PRO marked "Most Popular"), still only a plan-tier signal — does not create `Court` rows (real court creation happens later in `/dashboard/courts`).
  - Terms & conditions checkbox — enforced at submit time. (mocked: acceptance itself is never persisted — no `acceptedTermsAt`/version field exists on `UserProfile`)
- Invite-error page — static error message, shown when profile provisioning fails; no logic of its own.

## Landing Page (`/`)

Rewritten to describe real, shipped platform capabilities instead of fabricated marketing content. Sections that had zero backing feature (a fake "+2,400 players" hero badge, an Events section with no `Event` model anywhere, and five fabricated testimonials from invented people) were removed entirely rather than reworded — there was nothing real to describe them as. Section order: Header → Hero → Trusted (stats) → About (accordion) → Features (carousel) → CTA banner → Footer.

- Hero, header, CTA banner, footer shell — static, no data; copy describes the real dual-sided value (players book, owners manage).
- "How It Works" stats strip — real capability highlights (4 plan tiers, real-time court availability, secure Mercado Pago payments), not fabricated social-proof numbers. `app/_components/LandingTrusted/consts.ts`.
- "Why join us" accordion — real-time booking, built-in secure payments, owner tooling (courts/availability/audit trail), player profiles (preferred side/dominant hand/skill category). `app/_components/LandingAbout/consts.ts`.
- Platform Features carousel — reframed from a single club's physical "facilities" to actual software capabilities (availability, booking, payments, closures, profiles, plans, audit trail, Argentina-specific localization), reusing the same stock imagery. `app/_components/LandingFeatures/consts.ts` (`PLATFORM_FEATURES`, renamed from `FACILITIES`).
- Footer contact info and social links — still placeholder (email/phone, social links point to `#`) — this one gap remains open; no real business contact info exists anywhere to substitute. `app/_components/LandingFooter/consts.ts`.

## Player Dashboard (`/dashboard`, role: player)

**Bento cards (Hero, Skill Overview, Session Load, Progress & Goals, Schedule)** — all fully real, computed from the player's actual reservation history via `useMyReservations()`.

**Player Overview sidebar/banner**:

- Player style card (preferred side + dominant-hand badge) — real, editable data. `preferredSide`/`dominantHand` are nullable `UserProfile` columns, now also collected upfront in the onboarding wizard's Padel style step; a pencil icon still opens `EditPlayerStyleDialog` to change them later via `PATCH /api/me`, and unset values render "Not set yet". Served through `usePlayerOverviewData()` (`PlayerOverview/hooks.ts`) reading `useAuth().user`.
- Latest partner card (name, avatar, times played together, last played) — clicking it opens the shared `PlayerProfileCard` (skill level, side, handedness, email, phone). (mocked: the partner itself is still `MOCK_LATEST_PARTNER`, `PlayerOverview/consts.ts` — no real partner-history model exists yet, so the card is fed extended mock data rather than a real player)
- Performance summary (tournament record, preferred position, latest results). (mocked: entire `PerformanceSummary` — `MOCK_PERFORMANCE`, same file)

**Players directory** (`/dashboard/players`) — fully real: a public, searchable (client-side, by name) list of every active player, backed by `GET /api/players`. Each row opens the same `PlayerProfileCard` used by the Latest Partner card, populated from real `UserProfile` data.

**Browse Courts** (`/dashboard/browse`) — fully real: club picker, per-court availability grid (15s live poll), and the book-slot flow all hit real Prisma-backed endpoints with server-side conflict checks. If the club has `requiresPrepayment` set, booking a slot creates a 15-minute `SCHEDULED` hold and redirects to a real Mercado Pago Checkout Pro session instead of confirming instantly; `BookingConfirmDialog` branches its copy/button label accordingly. A slot inside an active court closure renders distinctly (dashed border, non-clickable) with its reason shown on hover, and booking it is also rejected server-side. `/dashboard/browse/payment-return` polls the player's own reservation list to show a processing/success/failed state after returning from checkout.

**My Reservations** (`/dashboard/my-reservations`) — fully real: reservation list and self-cancel flow (2-hour cutoff enforced server-side).

## Owner Dashboard (`/dashboard`, role: owner)

Everything here is fully real — no mocked data found on the owner side.

- **Courts** (`/dashboard/courts`) — court list/table, create/edit form (including a "Price (per reservation)" field, used when the club requires prepayment), deactivate (soft delete), weekly availability editor, and a "Closures" action per court that opens a drawer to block the court for a date/time range with a required reason (shown to players); lists past/upcoming closures with cancel actions, and an "apply to all courts" checkbox loops the create call across every active court. Creating a closure is blocked (409) if it overlaps active reservations. All backed by `/api/clubs/courts*`.
- **Reservations** (`/dashboard/reservations`) — availability grid, reservations table, slot details dialog, and Complete/No-show/Cancel actions (owner-cancel refunds any `COMPLETED` payment via Mercado Pago first). All backed by `/api/clubs/reservations*`.
- **Club Settings** (`/dashboard/settings/club`) — club profile form (name, legal name, tax ID, contact, a "Require online payment at booking" toggle for `requiresPrepayment`), 1:1 with the `Club` model. Timezone/currency are no longer user-facing anywhere in the app (removed from this form, from onboarding, and from every other surface that showed them) — every club is implicitly Buenos Aires time / ARS, silently defaulted rather than asked for or editable, since there was never more than one real value in practice. Note: there's no club-wide "operating hours" concept — scheduling is only expressed per-court.
- **Dashboard Home owner cards** (Hero, Schedule, Utilization, Overview, Activity) — all computed from a shared `useOwnerReservationSummary()` hook hitting real reservation data.
- **Audit Log** (`/dashboard/audit-logs`) — fully real: filterable (entity, action), paginated table over `GET /api/clubs/audit-logs`.

## Backend domains (`core/`)

- `clubs`, `courts`, `reservations`, `users`, `audit` — real Prisma-backed services, all reachable from `app/api` routes, all exercised by real mutations or the UI described above. `logAudit()` is called from every real owner/player mutation: reservations (created/cancelled/completed/no_show), courts (created/updated/deactivated), court closures (created/cancelled), club (created at owner onboarding, updated via Club Settings), and player onboarding (created). `AuditLog.clubId` is nullable to allow club-less events like player-profile creation. `GET /api/clubs/audit-logs` and the `/dashboard/audit-logs` page let an owner view their club's trail with filters and pagination.
- `billing` — invoice/payment logic (create/issue/void invoices, record payments, refunds, cash summaries) is implemented against real `Invoice`/`Payment` models, and is now reachable from the HTTP layer: `POST /api/player/reservations` creates and issues an invoice when a club requires prepayment, and `POST /api/webhooks/mercadopago` records the resulting `DIGITAL` payment (and logs a `"payment.confirmed"` audit event) or voids the invoice, depending on the payment outcome. Real Mercado Pago integration lives in `lib/mercadopago/` (`client.ts`, `preferences.ts`, `payments.ts`, `webhookSignature.ts`, `refunds.ts`) — thin wrappers around the `mercadopago` npm SDK. Both self-cancel and owner-cancel now refund any `COMPLETED` payment via Mercado Pago before cancelling; a refund failure blocks the cancellation instead of silently proceeding.
- `notifications` — persisting `Notification` rows and actual email delivery (via Resend) work for all three flows now: reservation cancellation, invoice paid, and reservation reminders. `GET /api/cron/notifications` (Vercel Cron, daily at 08:00, see `vercel.json`) calls `getPendingReservationReminders()` and dispatches a `RESERVATION_REMINDER` email per pending reservation; dedup (no more than one reminder per user per calendar day) is handled inside that function. The route isn't Clerk-authenticated (Cron has no session) — it checks its own `CRON_SECRET` bearer token instead, and `proxy.ts` allowlists `/api/cron/*` accordingly.
