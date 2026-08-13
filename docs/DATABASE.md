# Database

Postgres (Neon), managed via Prisma. Schema source of truth: `prisma/schema.prisma`.

## Entity relationship diagram

```text
Club
 ├── UserProfile[]        (owners of this club; role: "owner")
 ├── Court[]
 │     ├── CourtAvailability[]   (weekly recurring open-hours template)
 │     ├── CourtClosure[]        (ad-hoc block for a date/time range, e.g. maintenance)
 │     └── Reservation[]
 ├── Reservation[]
 ├── Invoice[]
 │     └── Payment[]
 └── Payment[]

UserProfile (optionally belongs to a Club)
 └── Reservation[]        (player's own bookings)

Reservation
 └── Invoice[]            (optional — an invoice can reference the reservation it billed)
```

## Models

| Model               | Purpose                                                                                                                                                                                                                                                                                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Club`              | A padel club/tenant — name, contact, timezone, currency, `Plan`, `ClubStatus`, `requiresPrepayment` (`Boolean`, default `false` — gates the Mercado Pago prepayment flow for that club's bookings).                                                                                                                                                                    |
| `UserProfile`       | A person (owner or player), optionally linked to a `Club` via `clubId`. Primary key is the Clerk `userId` directly (no separate internal ID).                                                                                                                                                                                                                          |
| `Court`             | A physical court belonging to a club — surface, indoor flag, slot duration, `price` (`Float?`, per-reservation price used when the club requires prepayment), soft-delete fields (`active`, `deletedAt`, `deletedBy`). `Court.closures` is a new relation to `CourtClosure`.                                                                                           |
| `CourtAvailability` | A recurring weekly open-hours row for a court (`dayOfWeek` + `startTime`/`endTime` strings). No club-wide "operating hours" concept exists — only per-court.                                                                                                                                                                                                           |
| `CourtClosure`      | An ad-hoc block on a court for a date/time range (`startsAt`/`endsAt`), with a required `reason` shown to players. Soft-cancel via `cancelledAt`/`cancelledBy` — there's no separate `active` boolean; a closure is active iff `cancelledAt` is null and `endsAt` is in the future. Creating one is blocked (not auto-resolved) if it overlaps any active reservation. |
| `Reservation`       | A booking of a court by a user for a time range. Defaults to `status: CONFIRMED` on creation, unless created as a pending-payment hold (see note below). `paymentExpiresAt` (`DateTime?`) is set on those holds — see the `ReservationStatus` note.                                                                                                                    |
| `Invoice`           | A billing document (JSON `items`, subtotal/tax/discount/total), optionally linked to the `Reservation` it billed.                                                                                                                                                                                                                                                      |
| `Payment`           | A recorded payment against an `Invoice` (`CASH`/`CARD`/`TRANSFER`/`DIGITAL`). `DIGITAL` payments are real Mercado Pago charges, recorded by `POST /api/webhooks/mercadopago` on an approved payment; the others remain manual entries.                                                                                                                                 |
| `Notification`      | A persisted record of an outbound notification attempt (type, recipient, status, failure reason).                                                                                                                                                                                                                                                                      |
| `AuditLog`          | A generic audit trail row (clubId, userId, action, entity, entityId, metadata). `clubId` is nullable to allow club-less events (e.g. player-profile creation). Written from reservations, courts, club, and onboarding mutations — see [PROJECT_STATUS.md](PROJECT_STATUS.md).                                                                                         |

## Enums

- `Plan`: `FREE` \| `BASIC` \| `PRO` \| `CUSTOM`
- `ClubStatus`: `ACTIVE` \| `INACTIVE` \| `SUSPENDED` \| `DISABLED`
- `SystemRole`: `owner` \| `player`
- `UserStatus`: `ACTIVE` \| `INACTIVE` \| `PENDING`
- `Gender`: `MALE` \| `FEMALE` \| `OTHER` \| `PREFER_NOT_TO_SAY`
- `ReservationStatus`: `SCHEDULED` \| `CONFIRMED` \| `CANCELLED` \| `COMPLETED` \| `NO_SHOW`
- `InvoiceStatus`: `DRAFT` \| `ISSUED` \| `PAID` \| `VOID`
- `PaymentMethod`: `CASH` \| `CARD` \| `TRANSFER` \| `DIGITAL`
- `PaymentStatus`: `PENDING` \| `COMPLETED` \| `FAILED` \| `REFUNDED`
- `NotificationType`: `RESERVATION_REMINDER` \| `RESERVATION_CANCELLED` \| `PAYMENT_CONFIRMED`
- `NotificationStatus`: `PENDING` \| `SENT` \| `FAILED`

## Notes on `ReservationStatus`

Reservations are created directly as `CONFIRMED` (`core/reservations/services/reservations.service.ts`) — except when the court's club has `requiresPrepayment: true`, in which case `createReservation` is called with `{ pendingPayment: true }` and creates a `SCHEDULED` hold instead, with `paymentExpiresAt` set 15 minutes out (`PAYMENT_HOLD_MINUTES`, `core/reservations/consts.ts`). `["SCHEDULED", "CONFIRMED"]` (`ACTIVE_RESERVATION_STATUSES`, same file) are both treated as "active" for conflict-checking purposes, but a lapsed unpaid `SCHEDULED` hold (past its `paymentExpiresAt`) is excluded from those checks so it stops blocking the slot — there's no cleanup cron; this is handled lazily at query time. `POST /api/webhooks/mercadopago` transitions a `SCHEDULED` hold to `CONFIRMED` on an approved payment via `confirmReservationPayment`. From `CONFIRMED`, an owner can transition a reservation to `COMPLETED` or `NO_SHOW`, and either the owner or the player (within a 2-hour cutoff) can transition it to `CANCELLED`. Known limitation (by design, not a bug): a reservation whose payment is abandoned or rejected keeps its `SCHEDULED` status indefinitely in the player's "My Reservations" list — only its slot-blocking effect lapses after 15 minutes.

## Terms acceptance is not persisted

The onboarding wizard enforces an "accept terms" checkbox client-side (Zod), but there is no `acceptedTermsAt` (or similar) field on `UserProfile` — acceptance is validated but never stored.
