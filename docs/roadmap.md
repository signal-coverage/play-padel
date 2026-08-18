# Roadmap

The core booking product (browse → book → cancel for players; courts/availability/reservations for owners) is done and fully real — see [PROJECT_STATUS.md](PROJECT_STATUS.md). What's below is what's genuinely still open, grouped by rough priority.

## Phase 1 — close out what's half-built

- ~~**Payments**~~ — done. Mercado Pago Checkout Pro wired at booking time: clubs can require prepayment (`Club.requiresPrepayment`), which creates a 15-minute `SCHEDULED` hold + invoice and redirects to checkout; `POST /api/webhooks/mercadopago` confirms or voids based on the signature-verified payment outcome, and both self-cancel and owner-cancel refund `COMPLETED` payments before cancelling.
- ~~**Audit logging**~~ — fully done, end to end. `logAudit()` is called from reservations, courts, club, and player-onboarding mutations; `GET /api/clubs/audit-logs` exposes it; and `/dashboard/audit-logs` (owner nav) renders it with entity/action filters and pagination.
- ~~**Notifications cleanup**~~ — done. Deleted the orphaned `core/events/event-bus.ts` and `core/notifications/handlers/notification.handlers.tsx` (the one non-duplicated handler misused the "reminder" email template as a booking confirmation, so it wasn't worth wiring as-is). Wired the real, correctly-designed reminder feature instead: `GET /api/cron/notifications` (Vercel Cron, daily) calls the already-correct `getPendingReservationReminders()` and dispatches emails.
- **Real-time court availability** — currently 15s polling via React Query. `ws`/`@types/ws` are installed but unused. Decide between a WebSocket server, Server-Sent Events, or just tuning the polling interval, before investing more here.
- ~~**Court closures**~~ — done. Owners can block a court for a date/time range with a required reason (`CourtClosure` model), optionally applied to all courts at once; closed slots render distinctly to players and booking one is rejected server-side. Blocked (not auto-resolved) if it overlaps active reservations. The other three court-management sub-features from the original idea remain queued as separate future work: minimum reservation duration, court characteristics/tags, and bulk edit across courts.

## Phase 2 — player identity & social features

All of this is currently mocked UI with no backing schema (see the Player Overview section of [PROJECT_STATUS.md](PROJECT_STATUS.md)):

- ~~Player style (preferred side, dominant hand) as real, editable profile data.~~ — done.
- Doubles partner history (who you've played with, how often).
- Tournaments, match history, and player rankings — no `Tournament`/`Match` model exists yet at all; this is new schema, not a rewire.

## Phase 3 — hardening

- **Security** — no rate limiting, no CSRF-specific review, no API throttling, no CAPTCHA on public forms. See [SECURITY.md](SECURITY.md).
- ~~**Landing page**~~ — done. Rewritten to describe real, shipped platform capabilities instead of fabricated marketing content (see [PROJECT_STATUS.md](PROJECT_STATUS.md)). Only remaining gap: footer contact email/phone and social links are still placeholder pending real business info.

## Longer-term / aspirational

- Mobile app.
- Push notifications.
- Player search / discovery.
