# Reservation Flow — MVP rules

These are the rules I'm using to drive the schema and `core/reservations` design, since nothing had been specified yet. Treat this as a starting default, not something carved in stone — flag anything you want changed and the schema/services get adjusted accordingly.

## Slot model

- A club defines its courts' opening hours via a recurring weekly template (`CourtAvailability`, one row per day-of-week + start/end — this is the renamed `WorkingHours`).
- Within those opening hours, slots are fixed-duration blocks (default **90 minutes**, configurable per court) — matches standard padel booking practice.
- A slot's state is derived, not stored: **free** (no active reservation overlaps it) or **locked** (an active reservation overlaps it). No separate "slot" table — reservations are the source of truth, slots are computed on read.

## Booking

- Instant confirmation, no owner approval step. A regular user picks a free slot → `Reservation` is created with status `CONFIRMED` immediately. Keeps the MVP simple; an approval queue can be added later if clubs need it.
- One active reservation per user per overlapping time range across all clubs (prevents double-booking two courts at once) — enforced at the service layer, not the DB, since it spans clubs.

## Visibility

- Regular users see only free/locked per slot — never who holds a locked slot. Only the owner (and staff, if that role ever exists) can see the reserver's identity and contact info for their own club's reservations.

## Cancellation

- A user can self-cancel up to **2 hours before** `scheduledStart`. Inside that window, cancellation must go through the owner (phone/in-person — no self-service UI for late cancellation in the MVP).
- Owner can cancel or mark `NO_SHOW`/`COMPLETED` on any of their club's reservations at any time.

## Payment

- **No payment required to book** in the MVP — reservations are confirmed without a charge; payment happens in person at the club. This defers the "no gateway installed yet" gap noted in `docs/migration-analysis.md` without blocking the booking flow.
- `Invoice`/`Payment` models stay in the schema (a club may still want to record a cash/card payment against a reservation after the fact) but nothing in the booking path requires them to succeed.
- Real gateway integration (Mercado Pago) becomes a later phase, per `docs/roadmap.md`, once/if upfront payment is required.

## Real-time

- Owners' court view should reflect new/cancelled reservations without a manual refresh. Per `docs/roadmap.md`, the MVP approach is React Query polling (`refetchInterval`) rather than WebSockets, since no real-time infra exists yet and polling is far less work to ship correctly.

## Explicitly out of scope for MVP

- Recurring/series bookings, waitlists, staff sub-accounts, custom roles/permissions, upfront payment, multi-court combo bookings.
