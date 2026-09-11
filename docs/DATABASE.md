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
 ├── Payment[]
 └── Tournament[]
       └── TournamentCategory[]
             ├── TournamentTeam[]        (player1Id/player2Id — flat FK pair, not a join table)
             │     └── TournamentGroup?  (nullable — a team sits ungrouped until groups are assigned)
             ├── TournamentGroup[]
             └── TournamentMatch[]       (stage: GROUP | KNOCKOUT)
                   ├── MatchSet[]
                   ├── TournamentGroup?  (set only for a GROUP-stage match)
                   ├── teamA / teamB     (TournamentTeam?, nullable — a knockout match may await a feeder result)
                   ├── winnerTeam        (TournamentTeam?, denormalized cache of the derived result)
                   └── nextMatch         (TournamentMatch?, self-relation — bracket-progression pointer; null for GROUP matches and the FINAL)

UserProfile (optionally belongs to a Club)
 ├── Reservation[]        (player's own bookings)
 └── TournamentTeam[]     (as player1 or player2 — two separate relations, since a team is a flat pair, not a join table)

Reservation
 └── Invoice[]            (optional — an invoice can reference the reservation it billed)
```

## Models

| Model                | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Club`               | A padel club/tenant — name, contact, timezone, currency, `Plan`, `ClubStatus`, `requiresPrepayment` (`Boolean`, default `false` — gates the Mercado Pago prepayment flow for that club's bookings).                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `UserProfile`        | A person (owner or player), optionally linked to a `Club` via `clubId`. Primary key is the Clerk `userId` directly (no separate internal ID).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `Court`              | A physical court belonging to a club — surface, indoor flag, slot duration, `price` (`Float?`, per-reservation price used when the club requires prepayment), soft-delete fields (`active`, `deletedAt`, `deletedBy`). `Court.closures` is a new relation to `CourtClosure`.                                                                                                                                                                                                                                                                                                                                                                      |
| `CourtAvailability`  | A recurring weekly open-hours row for a court (`dayOfWeek` + `startTime`/`endTime` strings). No club-wide "operating hours" concept exists — only per-court.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `CourtClosure`       | An ad-hoc block on a court for a date/time range (`startsAt`/`endsAt`), with a required `reason` shown to players. Soft-cancel via `cancelledAt`/`cancelledBy` — there's no separate `active` boolean; a closure is active iff `cancelledAt` is null and `endsAt` is in the future. Creating one is blocked (not auto-resolved) if it overlaps any active reservation.                                                                                                                                                                                                                                                                            |
| `Reservation`        | A booking of a court by a user for a time range. Defaults to `status: CONFIRMED` on creation, unless created as a pending-payment hold (see note below). `paymentExpiresAt` (`DateTime?`) is set on those holds — see the `ReservationStatus` note.                                                                                                                                                                                                                                                                                                                                                                                               |
| `Invoice`            | A billing document (JSON `items`, subtotal/tax/discount/total), optionally linked to the `Reservation` it billed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Payment`            | A recorded payment against an `Invoice` (`CASH`/`CARD`/`TRANSFER`/`DIGITAL`). `DIGITAL` payments are real Mercado Pago charges, recorded by `POST /api/webhooks/mercadopago` on an approved payment; the others remain manual entries.                                                                                                                                                                                                                                                                                                                                                                                                            |
| `Notification`       | A persisted record of an outbound notification attempt (type, recipient, status, failure reason).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `AuditLog`           | A generic audit trail row (clubId, userId, action, entity, entityId, metadata). `clubId` is nullable to allow club-less events (e.g. player-profile creation). Written from reservations, courts, club, and onboarding mutations — see [PROJECT_STATUS.md](PROJECT_STATUS.md).                                                                                                                                                                                                                                                                                                                                                                    |
| `Tournament`         | A club-owned doubles padel tournament — name, description, registration window (`registrationOpensAt`/`registrationClosesAt`), optional `startDate`/`endDate`, `status`. `publishedAt` is set once, the moment `publishTournament` transitions `DRAFT` → `REGISTRATION_OPEN` (drives the player-facing "open tournaments" nav badge).                                                                                                                                                                                                                                                                                                             |
| `TournamentCategory` | A skill-bracket division within a tournament (e.g. "Category 3", "Open") — its own independent group stage, bracket, and `status`, mirroring `Tournament`'s lifecycle. `minCategoryLevel`/`maxCategoryLevel` (both optional) bound eligible players' `UserProfile.padelCategory`; `groupCount`/`advancesPerGroup` configure the group stage; `maxTeams` caps registration.                                                                                                                                                                                                                                                                        |
| `TournamentTeam`     | A registered doubles pair — `player1Id`/`player2Id` are flat FKs to `UserProfile` (same flat-pair convention as `ReservationPartner`, not a join table). `combinedCategoryLevel` is a snapshot (average of both partners' `padelCategory` at registration time) so a later profile edit never reshuffles an already-registered team's seeding. `groupId` is nullable until groups are assigned. Withdrawal is soft (`withdrawnAt`/`withdrawnBy`, mirroring `CourtClosure`'s cancel pair) rather than a delete. `@@unique([tournamentCategoryId, player1Id])` and the player2 equivalent enforce one team per player per category at the DB level. |
| `TournamentGroup`    | A named group (e.g. "Group A") within a category's group stage, with a `position` for ordering. Holds its assigned `TournamentTeam[]` and the `TournamentMatch[]` played within it.                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `TournamentMatch`    | A single match, either `GROUP`-stage (`groupId` set) or `KNOCKOUT`-stage (`knockoutRound` set). `teamAId`/`teamBId` are nullable because a knockout match can exist before both feeder matches have resolved. `winnerTeamId` is a denormalized cache always re-derivable from the match's `MatchSet[]` (source of truth) — see the note on `nextMatchId` below. `scheduledAt`/`completedAt` are informational only; there's no integration with the Court/Reservation booking system.                                                                                                                                                             |
| `MatchSet`           | One set's score within a match — `setNumber`, `teamAGames`, `teamBGames`, plus optional `teamATiebreakPoints`/`teamBTiebreakPoints`. `@@unique([matchId, setNumber])`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

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
- `TournamentStatus`: `DRAFT` \| `REGISTRATION_OPEN` \| `REGISTRATION_CLOSED` \| `GROUPS_LOCKED` \| `KNOCKOUT` \| `COMPLETED` \| `CANCELLED`
- `TournamentCategoryStatus`: `DRAFT` \| `REGISTRATION_OPEN` \| `REGISTRATION_CLOSED` \| `GROUPS_LOCKED` \| `KNOCKOUT` \| `COMPLETED` \| `CANCELLED` (mirrors `TournamentStatus` at the per-category level — each category runs its own independent lifecycle)
- `TournamentTeamStatus`: `REGISTERED` \| `ADVANCED` \| `ELIMINATED` \| `CHAMPION` \| `WITHDRAWN`
- `TournamentMatchStage`: `GROUP` \| `KNOCKOUT`
- `TournamentMatchStatus`: `SCHEDULED` \| `COMPLETED` \| `WALKOVER` \| `CANCELLED`
- `KnockoutRound`: `ROUND_OF_32` \| `ROUND_OF_16` \| `QUARTERFINAL` \| `SEMIFINAL` \| `FINAL` (fixed ladder — caps a category's bracket at 32 teams)

## Notes on the Tournaments data model

**`TournamentTeam`'s player shape**: a team is a flat pair (`player1Id`/`player2Id`, each a direct FK to `UserProfile`) rather than a join table — the same convention `ReservationPartner` already uses elsewhere in this schema, kept for consistency rather than introducing a second team-membership pattern. Both directions are enforced unique per category (`@@unique([tournamentCategoryId, player1Id])` and the player2 equivalent), so a player can't register twice in the same category either as player1 or player2 of different teams.

**`TournamentMatch.nextMatchId`**: a self-relation (`@relation("MatchProgression", ...)`) — this match's winner is written into `nextMatch`'s `teamAId`/`teamBId` slot, chosen by `nextMatchSlot` (`"A"` \| `"B"`). The reverse side (`previousMatches`) is a knockout match's feeder matches. Both `nextMatchId` and `previousMatches` are null/empty for every `GROUP`-stage match and for the bracket's `FINAL`. Represented here as a single self-referencing arrow in the ERD (`nextMatch`) rather than expanding the full bracket-tree shape, consistent with the diagram's existing one-line-per-relation style.

## Notes on `ReservationStatus`

Reservations are created directly as `CONFIRMED` (`core/reservations/services/reservations.service.ts`) — except when the court's club has `requiresPrepayment: true`, in which case `createReservation` is called with `{ pendingPayment: true }` and creates a `SCHEDULED` hold instead, with `paymentExpiresAt` set 15 minutes out (`PAYMENT_HOLD_MINUTES`, `core/reservations/consts.ts`). `["SCHEDULED", "CONFIRMED"]` (`ACTIVE_RESERVATION_STATUSES`, same file) are both treated as "active" for conflict-checking purposes, but a lapsed unpaid `SCHEDULED` hold (past its `paymentExpiresAt`) is excluded from those checks so it stops blocking the slot — there's no cleanup cron; this is handled lazily at query time. `POST /api/webhooks/mercadopago` transitions a `SCHEDULED` hold to `CONFIRMED` on an approved payment via `confirmReservationPayment`. From `CONFIRMED`, an owner can transition a reservation to `COMPLETED` or `NO_SHOW`, and either the owner or the player (within a 2-hour cutoff) can transition it to `CANCELLED`. Known limitation (by design, not a bug): a reservation whose payment is abandoned or rejected keeps its `SCHEDULED` status indefinitely in the player's "My Reservations" list — only its slot-blocking effect lapses after 15 minutes.

## Terms acceptance is not persisted

The onboarding wizard enforces an "accept terms" checkbox client-side (Zod), but there is no `acceptedTermsAt` (or similar) field on `UserProfile` — acceptance is validated but never stored.
