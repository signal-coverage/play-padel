# Payments Integration (Mercado Pago)

**Date:** 2026-08-10
**Status:** Design approved by user; spec pending final review before implementation planning.

## Goal

Let club owners optionally require players to pay online at booking time via Mercado Pago, closing the long-standing gap where `core/billing` has real invoice/payment logic but zero HTTP surface and no gateway integration (see `PROJECT_STATUS.md`, `ROADMAP.md`).

## Scope decisions (resolved during brainstorming)

- **Per-club opt-in** (`Club.requiresPrepayment`) — not global, not per-court. An owner decides whether their whole club requires prepayment.
- **Per-court flat pricing** (`Court.price`) — not a single club-wide price, not time/day-varying pricing.
- **Gateway: Mercado Pago, via Checkout Pro** (hosted redirect) — not Bricks (embedded). Simpler first integration, matches this app's established MVP-simplicity pattern (see `docs/reservation-flow.md`).
- **Slot-hold-with-expiry**: the reservation is created immediately (blocking the slot from double-booking) in a pending-payment state, redirecting to checkout; the hold expires after 15 minutes if payment never completes. Reuses the already-defined-but-previously-unused `SCHEDULED` status rather than adding a new one.
- **Real refunds**: self-cancelling a prepaid reservation within the existing 2-hour free-cancellation window calls Mercado Pago's refund API automatically — not a manual/owner-handled process.
- **Reuses existing `core/billing` Invoice/Payment models and service functions** for the real payment record — this becomes that domain's first real caller, not a parallel/duplicate payment-tracking system.
- **Explicitly deferred to a separate future brainstorm**: Court Management enhancements (temporary court blocking, scheduled closures, per-court minimum reservation duration, bulk edit across courts, court characteristics like floor/wall type). This surfaced as scope creep during this brainstorm's pricing question and was intentionally split out — queued to run right after this spec.

## Data model

```prisma
model Club {
  // ...existing fields
  requiresPrepayment Boolean @default(false)
}

model Court {
  // ...existing fields
  price Float?  // nullable — a court can exist before a price is set
}

model Reservation {
  // ...existing fields
  // Only ever set while status is SCHEDULED (pending-payment hold). Read at
  // conflict-check time to decide whether an unpaid SCHEDULED row still
  // blocks the slot, or has lapsed and should be treated as inactive.
  paymentExpiresAt DateTime?
}
```

No new enums:

- `ReservationStatus.SCHEDULED` (already defined, never previously set anywhere in the codebase) becomes the "pending payment" hold state.
- `PaymentMethod.DIGITAL` (already defined, previously unused since nothing called `core/billing`) is used for Mercado Pago payments.
- `PaymentStatus.REFUNDED` (already defined, previously unused for the same reason) is used when a refund completes.
- `Payment.reference` (already a free-text field) stores the Mercado Pago payment ID, needed later to call the refund API against that specific payment. No schema change needed for this.
- `Invoice.reservationId` (already exists, optional) is the existing link from a paid reservation to its invoice — `Payment` reaches a `Reservation` by going through `Invoice`, no new direct relation needed.

## Booking flow

**Club not opted in** (`requiresPrepayment: false`): today's flow, completely unchanged — instant `CONFIRMED`, pay in person.

**Club opted in**:

0. If the court being booked has no `price` set (`null`), booking is blocked with an explicit error ("This court doesn't have a price set yet — contact the club") rather than silently falling back to a free booking or erroring unhelpfully.
1. Player picks a slot; `createReservation` creates the row as `SCHEDULED` (instead of `CONFIRMED`) with `paymentExpiresAt` set to now + 15 minutes.
2. Server creates a Mercado Pago Checkout Pro preference (amount = `Court.price`, currency = `Club.currency`) and returns the redirect URL.
3. Player is redirected to Mercado Pago, completes payment, is redirected back to a return page in the app.
4. Mercado Pago's webhook (`POST /api/webhooks/mercadopago`, signature-verified) is the source of truth for payment status — the return-page redirect is only a UX nicety, never trusted for confirmation on its own.
5. On webhook-confirmed success: reservation → `CONFIRMED`; a real `Invoice` (status `PAID`) and `Payment` (method `DIGITAL`, status `COMPLETED`, `reference` = the Mercado Pago payment ID) are created via `core/billing`'s existing service functions.
6. On webhook-confirmed failure, or if the 15-minute hold lapses with no successful webhook: the `SCHEDULED` reservation stops counting as active. Handled **lazily** — `checkCourtConflict`/`checkUserOverlapConflict` (which already gate every booking attempt) additionally exclude `SCHEDULED` rows whose `paymentExpiresAt` has passed, rather than a separate cleanup cron job.

## Cancellation & refunds

- `cancelReservation`, when the reservation being cancelled has an associated `COMPLETED` `Payment` (i.e. it was actually paid for) and the cancellation happens within the existing self-cancel window, additionally calls Mercado Pago's refund API for that payment (using the stored `reference`), then records the outcome via `core/billing` (`Payment.status` → `REFUNDED`).
- Owner-initiated cancellation of a paid reservation triggers the same refund call — the "this reservation was paid for and is being cancelled" condition applies regardless of who cancels.

## New surfaces

- **`POST /api/webhooks/mercadopago`** (new route) — signature-verified, already fits the existing `/api/webhooks/*` public-route allowlist in `proxy.ts`. No middleware change needed (unlike `/api/cron/*`, which needed one).
- **`POST /api/player/reservations`** (existing route, extended) — when the target club has `requiresPrepayment: true`, its response includes a `checkoutUrl` (the Mercado Pago Checkout Pro redirect) alongside the created `SCHEDULED` reservation, instead of returning a `CONFIRMED` one. No new endpoint for creating the checkout — this is a response-shape branch on the same route, matching the "branches on `requiresPrepayment`" behavior already described for the dialog.
- **`PATCH /api/clubs`** gains `requiresPrepayment` as an editable field (existing route, extended schema) — surfaced as a toggle in Club Settings.
- Court create/edit (existing `POST`/`PATCH /api/clubs/courts*`) gains `price` as an editable field — surfaced in the court form.
- `BookingConfirmDialog` branches on the club's `requiresPrepayment`: unchanged today for non-prepay clubs; for prepay clubs, confirming calls the extended reservations route and redirects to the returned `checkoutUrl` instead of confirming immediately.
- A new page at **`/dashboard/browse/payment-return`** handling the post-checkout redirect back from Mercado Pago, showing a processing/success/failure state depending on what the webhook has (or hasn't yet) recorded.

## Design language / reuse

No new visual primitives — reuses `BookingConfirmDialog`'s existing pattern (with a branch for the prepay path), the existing Club Settings form pattern for the new toggle, and the existing court form pattern for the new price field. Mercado Pago's own hosted page handles all actual payment UI.

## Non-goals

- Court Management enhancements (blocking, scheduled closures, per-court minimum duration, bulk edit, court characteristics) — split into its own separate brainstorm/spec, queued to run right after this one.
- Per-club or time/day-varying pricing — flat price per court only.
- Embedded (Bricks) checkout — hosted redirect (Checkout Pro) only, for this first integration.
- Subscriptions, marketplace splits, QR/Point in-person payment methods, or any other Mercado Pago product beyond Checkout Pro + refunds.
- Automatic scheduled cleanup of expired `SCHEDULED` holds — handled lazily at conflict-check time instead, no new cron job.
- Currency conversion or multi-currency support — uses each club's existing single `Club.currency` field as-is.
