# Bank Transfer as a Player-Selectable Payment Method

**Date:** 2026-09-11
**Status:** Design approved by user; spec pending final review before implementation planning.

## Goal

Today every paid reservation (`app/api/player/reservations/route.ts`) redirects unconditionally to Mercado Pago Checkout Pro (`createCheckoutPreference`) — `ClubBankTransferAccount` exists only to satisfy `CLUB_OPERATIONAL_WHERE` (club-level "how do you get paid" gate) and to render in Club Settings. It is never offered to the player at checkout. This spec lets a player choose bank transfer as an alternative to Mercado Pago when the club has one configured, with a manual, WhatsApp-mediated confirmation flow owned by the club.

## Non-goals (explicitly deferred)

- **Minimum booking lead time** (e.g. "can't book less than 2 hours before the slot starts"). Raised during this brainstorm, but it's a global rule independent of payment method — queued as its own follow-up proposal.
- **WhatsApp bot / automatic receipt confirmation.** The club still has to manually confirm the money arrived; a bot could only pre-fill/notify, not replace that manual step. Noted as future work, not designed here.
- **Proof-of-transfer upload.** Confirmation is trust-based: the player sends the receipt via WhatsApp (outside the app), the club confirms manually in-app. No file upload/storage added by this change.

## Scope decisions (resolved during brainstorming)

- **Extensible payment-method architecture**: a new `getAvailablePaymentMethods(clubId): ReservationPaymentMethod[]` derives what to offer from what's actually configured, instead of hardcoding a MP/Transfer binary — a third method later only extends this list. `BookingConfirmDialog` only shows a method-selection step when 2+ methods are available; a club with just one configured method sees zero behavior change from today.
- **New type `ReservationPaymentMethod = "MERCADOPAGO" | "TRANSFER"`** — distinct from `core/billing`'s existing `PaymentMethod` (`"CASH" | "CARD" | "TRANSFER" | "DIGITAL"`), which models how an invoice was actually settled (including walk-in cash/card) and is a different concern. Mercado Pago payments keep recording as `PaymentMethod.DIGITAL`, unchanged.
- **WhatsApp number lives on `Club`** (basic configuration — onboarding + Club Settings' "Club settings" tab), separate from the club's general phone. It is a distinct field because the two numbers can legitimately differ (whoever answers reservation/payment WhatsApp messages isn't always the same line as the club's general contact phone).
- **Bank transfer is only offered when both are true**: `ClubBankTransferAccount` exists AND `club.whatsappNumber` is set. This cross-field validation lives in `getAvailablePaymentMethods`, not in the database schema.
- **Hold window: 60 minutes total** (`BANK_TRANSFER_HOLD_MINUTES`), new constant alongside the existing `PAYMENT_HOLD_MINUTES = 15` (Mercado Pago's window, unchanged). Framed to the player as "30 minutes to send the receipt" + "30 minutes for the club to confirm" — this split is **informational copy only**; the system has no way to detect when the player actually sent the WhatsApp message, so the only value actually enforced in code is the single 60-minute `paymentExpiresAt`.
- **No cleanup cron for the hold itself** — matches the existing, explicitly-documented Mercado Pago convention (`docs/DATABASE.md`, "Notes on ReservationStatus"): an unpaid `SCHEDULED` reservation just lingers and is ignored everywhere conflict/availability is checked once `paymentExpiresAt` passes. Nothing cancels the row.
- **New cron, scoped only to player notification**: `bank-transfer-hold-sweep`, same shape as the existing `membership-grace-sweep` cron, finds lapsed unconfirmed transfer holds and emails the player to rebook — see "Expiry notification" below. This is the one deliberate exception to "no cron for reservations," and it exists only to guarantee the notification, not to clean up any state.
- **Race-condition guard on manual confirmation**: confirming a transfer payment re-validates `paymentExpiresAt > now` server-side at confirm time (never trusts what the owner's screen showed when it loaded), so a slow confirmation can't silently overwrite a slot another player has since booked. See "Owner confirmation" below for the concrete failure scenario this prevents.

## Data model

```prisma
model Club {
  // ...existing fields
  whatsappNumber String?  // basic configuration; required (app-level) once bank transfer is offered
}

model Reservation {
  // ...existing fields
  // Set once, at creation, only when pendingPayment is true. Null for free/
  // instant reservations. Lets owner-facing UI and the expiry sweep tell a
  // transfer-pending hold apart from a Mercado-Pago-pending one without
  // joining through Invoice — both currently share the same SCHEDULED +
  // paymentExpiresAt shape.
  paymentMethod    String?    // "MERCADOPAGO" | "TRANSFER"
  // Set by bank-transfer-hold-sweep once the "hold lapsed" email has been
  // sent, so the cron never double-sends on a later run.
  expiryNotifiedAt DateTime?
}
```

No changes to `ClubBankTransferAccount` (bankName/cbu/alias stay as-is) or to `core/billing`'s `Payment`/`Invoice` models — bank transfer settlement reuses `recordPayment` exactly as MP's webhook does today, just with `method: "TRANSFER"` instead of `"DIGITAL"`.

## Booking flow

1. `BrowseCourts`/`BookingConfirmDialog` fetches `getAvailablePaymentMethods(clubId)` alongside the existing availability data. If it returns 2 methods, the confirm dialog gains a method-selection step before the final confirm action; if 1, that method is used directly (today's behavior, unchanged).
2. Choosing **Mercado Pago**: 100% today's existing path (`createReservation({ pendingPayment: true })` with `PAYMENT_HOLD_MINUTES`, `createCheckoutPreference`, redirect). `paymentMethod` is stamped `"MERCADOPAGO"` on the reservation row purely for the owner-UI distinction above — no other change.
3. Choosing **Transfer**: the dialog expands in place (no second modal) showing the club's bank details, WhatsApp number, and the policy copy below. Confirming calls `POST /api/player/reservations` with `paymentMethod: "TRANSFER"`, which:
   - Creates the reservation via `createReservation({ pendingPayment: true, holdMinutes: BANK_TRANSFER_HOLD_MINUTES })` (existing function, gains an optional `holdMinutes` param defaulting to `PAYMENT_HOLD_MINUTES` so the Mercado Pago call site is unaffected).
   - Creates and issues the invoice exactly as today.
   - Skips `createCheckoutPreference` entirely — returns the reservation with no `checkoutUrl`. The client has already shown everything the player needs; there's nothing to redirect to.

### Info-modal / expanded-dialog copy (content, not final wording)

- The club's bank details + WhatsApp number.
- "You have 30 minutes to send your transfer receipt to this WhatsApp number."
- "If the club doesn't confirm your payment within the hour, your slot is released automatically — right now Mercado Pago is the only method that confirms instantly. If you'd rather not wait, you can pay with Mercado Pago instead" (with a one-click switch back to the MP path, staying on the same dialog).

## Owner confirmation

Extends the existing `ReservationActionButtons`/`ReservationsTable` action pattern (`onAction(reservationId, "complete" | "noShow" | "cancel")`) with a new `"confirmTransferPayment"` action, shown only when `status === "SCHEDULED" && paymentMethod === "TRANSFER" && paymentExpiresAt > now` at render time.

Confirming calls a new endpoint that, in one transaction:

1. Re-reads the reservation and re-checks `paymentExpiresAt > now` server-side. **This is the concrete failure this guards against**: player sends the receipt at minute 45, the owner is slow to check WhatsApp; the 60-minute hold lapses at minute 60 with nothing cancelling the row, so the slot shows as free again and a second player books (and pays via Mercado Pago) it at minute 75; the owner finally confirms at minute 90. Without this re-check, that confirmation would silently flip a reservation to `CONFIRMED` for a slot another player already holds `CONFIRMED` for the same time. With it, the confirm call is rejected with a clear error ("this hold expired and the slot may no longer be available — ask the player to rebook") instead.
2. On success: `recordPayment(clubId, ownerId, { invoiceId, method: "TRANSFER", amount: invoice.total, currency })` then `confirmReservationPayment(reservationId)` — the exact same two calls the Mercado Pago webhook handler already makes, just triggered by an owner click instead of a webhook delivery.

## Expiry notification

New cron `app/api/cron/bank-transfer-hold-sweep`, modeled directly on the existing `membership-grace-sweep` cron (same registration pattern in `vercel.json`/cron config, same auth guard). Runs every 5–10 minutes:

- Finds `Reservation` rows where `status = "SCHEDULED"`, `paymentMethod = "TRANSFER"`, `paymentExpiresAt < now`, `expiryNotifiedAt IS NULL`.
- Sends the player a "your slot was released — book again" email (new template, same `lib/email/templates/` + `dispatch()` pattern as `PaymentConfirmed`).
- Stamps `expiryNotifiedAt = now` so a later run never double-sends.
- Does **not** touch reservation status or the invoice — matches the existing "lapsed holds are just ignored, never explicitly cancelled" convention; this cron only adds the one notification side-effect that convention doesn't otherwise provide.

## New/changed surfaces

- **`GET` for available payment methods** — either a new small endpoint or folded into the existing club/court availability response consumed by `BrowseCourts` (implementation detail for the plan) backed by `getAvailablePaymentMethods`.
- **`POST /api/player/reservations`** (existing route, extended) — accepts `paymentMethod`, branches on it as described above.
- **New `POST` endpoint** for owner transfer-payment confirmation (e.g. `POST /api/clubs/reservations/[id]/confirm-transfer`), calling `recordPayment` + `confirmReservationPayment` with the expiry re-check guard.
- **New cron route** `app/api/cron/bank-transfer-hold-sweep`.
- **`Club` basic-info form** (onboarding step + `ClubSettingsView`'s "Club settings" tab) gains the `whatsappNumber` field, reusing the existing `PhoneField` component already used for the club's general phone.
- **`BookingConfirmDialog`** gains the method-selection step and the transfer info panel described above.
- **`ReservationActionButtons`/`ReservationsTable`** gain the `"confirmTransferPayment"` action.
- **New email template** for the expiry notification, following `PaymentConfirmed.tsx`'s existing shape.

## Design language / reuse

No new visual primitives. The method selector and transfer info panel extend `BookingConfirmDialog`'s existing progressive-disclosure pattern (same idea as `CourtFormSheet`'s step reveal); the confirm action reuses `GuardedActionButton` exactly as the existing Complete/No-show/Cancel trio does; the `whatsappNumber` field reuses `PhoneField` as-is.

## Testing approach (for the implementation plan)

- `getAvailablePaymentMethods`: unit tests for 0/1/2-method combinations, including the "transfer account exists but no WhatsApp number" case (must exclude `"TRANSFER"`).
- `createReservation`'s new `holdMinutes` param: existing Mercado Pago tests must keep passing unmodified (default unchanged); new tests cover the 60-minute transfer case.
- Owner confirm endpoint: the expiry-race scenario above as an explicit test (confirm attempted after `paymentExpiresAt`, and separately after the slot was re-booked by someone else) must reject, not silently succeed.
- `bank-transfer-hold-sweep`: sends exactly once per lapsed reservation (idempotent across repeated runs via `expiryNotifiedAt`), ignores non-lapsed and non-transfer rows.
