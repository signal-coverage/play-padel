# Roadmap

The core booking product (browse → book → cancel for players; courts/availability/reservations for owners) is done and fully real — see [PROJECT_STATUS.md](PROJECT_STATUS.md). What's below is what's genuinely still open, grouped by rough priority.

## Phase 1 — close out what's half-built

- ~~**Payments**~~ — done. Mercado Pago Checkout Pro wired at booking time: clubs can require prepayment (`Club.requiresPrepayment`), which creates a 15-minute `SCHEDULED` hold + invoice and redirects to checkout; `POST /api/webhooks/mercadopago` confirms or voids based on the signature-verified payment outcome, and both self-cancel and owner-cancel refund `COMPLETED` payments before cancelling.
- ~~**Audit logging**~~ — fully done, end to end. `logAudit()` is called from reservations, courts, club, and player-onboarding mutations; `GET /api/clubs/audit-logs` exposes it; and `/dashboard/audit-logs` (owner nav) renders it with entity/action filters and pagination.
- ~~**Notifications cleanup**~~ — done. Deleted the orphaned `core/events/event-bus.ts` and `core/notifications/handlers/notification.handlers.tsx` (the one non-duplicated handler misused the "reminder" email template as a booking confirmation, so it wasn't worth wiring as-is). Wired the real, correctly-designed reminder feature instead: `GET /api/cron/notifications` (Vercel Cron, daily) calls the already-correct `getPendingReservationReminders()` and dispatches emails.
- **Real-time court availability** — currently 15s polling via React Query. `ws`/`@types/ws` are installed but unused. Decide between a WebSocket server, Server-Sent Events, or just tuning the polling interval, before investing more here.
- ~~**Court closures**~~ — done. Owners can block a court for a date/time range with a required reason (`CourtClosure` model), optionally applied to all courts at once; closed slots render distinctly to players and booking one is rejected server-side. Blocked (not auto-resolved) if it overlaps active reservations.
- ~~**Court physical characteristics**~~ — done (2026-09-02, migration `20260902205935_add_court_physical_characteristics`). `wallType`/`netType` (free-text/select) and a `lighting` boolean now live on `Court`, editable via `WallTypeField`/`NetTypeField` in `CourtFormSheet` (`app/dashboard/courts/_components/CourtsView/components/CourtFormSheet/`).
- ~~**Bulk edit across courts**~~ — done. `BulkEditCourtsSheet` (`app/dashboard/courts/_components/CourtsView/components/BulkEditCourtsSheet/`) lets an owner apply a field change to multiple selected courts at once.
- Minimum reservation duration remains the one queued court-management sub-feature from the original idea with no implementation yet.
- ~~**Club-wide operating hours**~~ — done (2026-09-02, migration `20260902031149_add_club_operating_hours`). A club-level weekly availability template now exists (onboarding's Operating Hours step + the Club Settings "Operating Hours" tab), used as the default for a new court's own schedule when none is set explicitly.
- ~~**Cross-midnight availability windows**~~ — done. A club/court can now have hours like open 09:00 / close 02:00 the next day — `core/courts/schemas/court.schema.ts` no longer requires end-after-start, and `core/courts/services/courts.service.ts`'s new `resolveWindowEnd` helper rolls the end time to the next day when needed (`getCourtSlots`/`getClubsAvailability`).
- ~~**Club payout method alternative to Mercado Pago**~~ — done. A club can now configure a bank-transfer payout account (`BankTransferAccountSettingsCard`, migration `20260904030017_add_club_bank_transfer_account`) as an alternative to connecting Mercado Pago; the Club Operational Gate treats either as satisfying its payout-method requirement.
- ~~**Club-status admin control & membership reactivation**~~ — done. `/admin/club-status` lets an operator change a club's status; `POST /api/clubs/membership/reactivate` lets an owner resume a lapsed membership.
- ~~**Move plan selection out of onboarding**~~ — done. The onboarding wizard's Plan step was removed entirely; plan purchase now happens post-onboarding through `components/PlanSelectionModal/`, backed by real Mercado Pago preapproval (recurring subscription) billing in `core/billing/services/membership.service.ts`, including payer-identification (CUIT/DNI) prefill and save-for-future.

## Phase 2 — player identity & social features

All of this is currently mocked UI with no backing schema (see the Player Overview section of [PROJECT_STATUS.md](PROJECT_STATUS.md)):

- ~~Player style (preferred side, dominant hand) as real, editable profile data.~~ — done.
- Doubles partner history (who you've played with, how often).
- Tournaments, match history, and player rankings — no `Tournament`/`Match` model exists yet at all; this is new schema, not a rewire.

## Phase 3 — hardening

- **Security** — no rate limiting, no CSRF-specific review, no API throttling, no CAPTCHA on public forms. Re-confirmed 2026-09-04 (repo-wide search of `proxy.ts`/`lib/` for any rate-limit primitive): still zero. This app has real users and live Mercado Pago payments, so treat this as higher-urgency than a typical "hardening" bucket — see the prioritized list in [BACKLOG.md](BACKLOG.md) and [SECURITY.md](SECURITY.md).
- **Preview deployments hit the production database** — only one Neon branch/compute exists for this project; every Vercel preview deployment currently reads/writes prod data. See [BACKLOG.md](BACKLOG.md)'s P0 list.
- ~~**Landing page**~~ — done. Rewritten to describe real, shipped platform capabilities instead of fabricated marketing content (see [PROJECT_STATUS.md](PROJECT_STATUS.md)). Only remaining gap: footer contact email/phone and social links are still placeholder pending real business info.

## Longer-term / aspirational

- Mobile app.
- Push notifications.
- Player search / discovery.
