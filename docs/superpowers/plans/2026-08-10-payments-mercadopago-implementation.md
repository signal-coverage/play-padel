# Payments Integration (Mercado Pago) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a club owner opt their club into requiring online prepayment (Mercado Pago Checkout Pro) at booking time; players pay through a hosted MP checkout, the booking is held for 15 minutes pending payment, and self/owner cancellation of a paid reservation triggers a real refund.

**Architecture:** No new domain — this extends the existing `core/billing`, `core/reservations`, `core/clubs`, `core/courts` services and adds one new cross-cutting `lib/mercadopago/` module (SDK client, preference creation, payment lookup, webhook signature verification, refunds). One new public webhook route (`/api/webhooks/mercadopago`) is the source of truth for payment confirmation; the existing `POST /api/player/reservations` route branches on `Club.requiresPrepayment` to create a pending-payment hold instead of an instant confirmation.

**Tech Stack:** Next.js App Router route handlers, Prisma (Neon Postgres), the `mercadopago` npm package (Node SDK v2, class-based: `MercadoPagoConfig`, `Preference`, `Payment`, `WebhookSignatureValidator`), Zod, React Query, react-hook-form.

## Global Constraints

- **No test framework exists in this repo** (confirmed: no `test` script, no Jest/Vitest dependency anywhere). Every task's "Verify" step uses `npx tsc --noEmit` (must report zero errors) plus a manual verification procedure (curl or browser steps) — do not introduce a test framework as part of this plan; that would be unrelated scope.
- **No git commands in any step.** Per this project's standing rule, the person running this plan (human or subagent) must NOT run `git add`/`git commit`/`git push` at any point. Each task ends with "Verify," not "Commit." Staging and committing is done entirely by the project owner, outside this plan.
- **Prisma workflow:** after any `prisma/schema.prisma` edit, run `npx prisma generate` then `npx prisma db push` — never `npx prisma migrate dev` (this project has no migration history; `migrate dev` will attempt to reset the database).
- **`PaymentMethod.DIGITAL`, `PaymentStatus.REFUNDED`, `ReservationStatus.SCHEDULED` already exist** in the Prisma schema and are reused as-is — no new enum values needed anywhere in this plan.
- **Reuse `Payment.reference`** (existing `String?` field) to store the Mercado Pago payment id — no new column for it.
- **Env vars needed** (add to `.env.example`, values left blank for each developer to fill in): `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL` (e.g. `http://localhost:3000` locally; the deployed origin in production — used to build Mercado Pago's `notification_url` and `back_urls`, which must be absolute).
- **Barrel export rule still applies:** any `index.ts` this plan touches must stay alphabetically sorted by exported name (enforced by the custom ESLint rule — run `npm run lint` if a task touches a barrel file).
- **One field per line in Sheets/Dialogs**, per `AGENTS.md` — the new `price` field (CourtFormSheet) and `requiresPrepayment` toggle (Club Settings) each get their own full-width row, no grid columns.

---

### Task 1: Schema — `requiresPrepayment`, `price`, `paymentExpiresAt`

**Files:**

- Modify: `prisma/schema.prisma`

**Interfaces:**

- Produces: `Club.requiresPrepayment: boolean`, `Court.price: number | null`, `Reservation.paymentExpiresAt: Date | null` — consumed by every later task.

- [ ] **Step 1: Add the three fields**

In `prisma/schema.prisma`, add `requiresPrepayment` to `Club`:

```prisma
model Club {
  id        String     @id @default(cuid())
  name      String
  legalName String?
  taxId     String?
  email     String
  phone     String?
  logoUrl   String?
  timezone  String
  currency  String
  plan      Plan       @default(FREE)
  status    ClubStatus @default(ACTIVE)
  requiresPrepayment Boolean @default(false)
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  createdBy String
  updatedBy String

  users        UserProfile[]
  courts       Court[]
  reservations Reservation[]
  invoices     Invoice[]
  payments     Payment[]

  @@map("clubs")
}
```

Add `price` to `Court`:

```prisma
model Court {
  id                  String    @id @default(cuid())
  clubId              String
  club                Club      @relation(fields: [clubId], references: [id])
  name                String
  surface             String?
  indoor              Boolean   @default(false)
  color               String?
  slotDurationMinutes Int       @default(90)
  price               Float?
  active              Boolean   @default(true)
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  createdBy           String?
  updatedBy           String?
  deletedAt           DateTime?
  deletedBy           String?

  availability CourtAvailability[]
  reservations Reservation[]

  @@index([clubId, active])
  @@map("courts")
}
```

Add `paymentExpiresAt` to `Reservation`:

```prisma
model Reservation {
  id             String            @id @default(cuid())
  clubId         String
  club           Club              @relation(fields: [clubId], references: [id])
  userId         String
  user           UserProfile       @relation(fields: [userId], references: [id])
  userName       String
  courtId        String
  court          Court             @relation(fields: [courtId], references: [id])
  courtName      String
  status         ReservationStatus @default(CONFIRMED)
  scheduledStart DateTime
  scheduledEnd   DateTime
  notes          String?
  paymentExpiresAt DateTime?
  cancelledAt    DateTime?
  cancelledBy    String?
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt
  createdBy      String?
  updatedBy      String?

  invoices Invoice[]

  @@index([clubId, scheduledStart])
  @@index([clubId, userId])
  @@index([clubId, courtId])
  @@index([clubId, status])
  @@map("reservations")
}
```

- [ ] **Step 2: Regenerate the Prisma client and push the schema**

Run:

```bash
npx prisma generate
npx prisma db push
```

Expected: both commands complete with no errors; `db push` reports the three new columns added.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no new errors (existing code doesn't reference the new fields yet, so this should be a no-op check that the schema itself is valid).

---

### Task 2: `lib/mercadopago/` — SDK client, preferences, payment lookup, signature verification, refunds

**Files:**

- Create: `lib/mercadopago/client.ts`
- Create: `lib/mercadopago/preferences.ts`
- Create: `lib/mercadopago/payments.ts`
- Create: `lib/mercadopago/webhookSignature.ts`
- Create: `lib/mercadopago/refunds.ts`
- Modify: `.env.example` (add the three env vars)
- Modify: `package.json` (add `mercadopago` dependency)

**Interfaces:**

- Produces:
  - `getMercadoPagoClient(): MercadoPagoConfig`
  - `createCheckoutPreference(params: { reservationId: string; courtName: string; price: number; currency: string }): Promise<{ checkoutUrl: string }>`
  - `getMercadoPagoPayment(paymentId: string): Promise<{ id: number; status: string; externalReference: string | null; transactionAmount: number | null }>`
  - `verifyMercadoPagoSignature(params: { xSignature: string | null; xRequestId: string | null; dataId: string | null }): boolean`
  - `refundMercadoPagoPayment(paymentId: string): Promise<void>`

- [ ] **Step 1: Install the SDK**

Run: `npm install mercadopago`
Expected: `mercadopago` appears in `package.json` dependencies and `package-lock.json`.

- [ ] **Step 2: Add env var placeholders**

Append to `.env.example`:

```
# Mercado Pago (Payments)
MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 3: SDK client singleton**

Create `lib/mercadopago/client.ts`:

```ts
import { MercadoPagoConfig } from "mercadopago";

let client: MercadoPagoConfig | null = null;

export function getMercadoPagoClient(): MercadoPagoConfig {
  if (!client) {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error("MERCADOPAGO_ACCESS_TOKEN is not set");
    }
    client = new MercadoPagoConfig({ accessToken });
  }
  return client;
}
```

- [ ] **Step 4: Checkout Pro preference creation**

Create `lib/mercadopago/preferences.ts`:

```ts
import { Preference } from "mercadopago";
import { getMercadoPagoClient } from "./client";

function requireAppUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL is not set");
  return appUrl;
}

// Creates a Checkout Pro preference for one reservation and returns the
// hosted redirect URL. external_reference carries the reservationId so the
// webhook (which only receives a Mercado Pago payment id) can look up which
// reservation/invoice a confirmed payment belongs to.
export async function createCheckoutPreference(params: {
  reservationId: string;
  courtName: string;
  price: number;
  currency: string;
}): Promise<{ checkoutUrl: string }> {
  const appUrl = requireAppUrl();
  const returnUrl = `${appUrl}/dashboard/browse/payment-return?reservationId=${params.reservationId}`;

  const preference = new Preference(getMercadoPagoClient());
  const result = await preference.create({
    body: {
      items: [
        {
          id: params.reservationId,
          title: `Court reservation — ${params.courtName}`,
          quantity: 1,
          unit_price: params.price,
          currency_id: params.currency,
        },
      ],
      external_reference: params.reservationId,
      notification_url: `${appUrl}/api/webhooks/mercadopago`,
      back_urls: {
        success: returnUrl,
        pending: returnUrl,
        failure: returnUrl,
      },
      auto_return: "approved",
    },
  });

  if (!result.init_point) {
    throw new Error("Mercado Pago did not return a checkout URL");
  }

  return { checkoutUrl: result.init_point };
}
```

- [ ] **Step 5: Payment lookup**

Create `lib/mercadopago/payments.ts`:

```ts
import { Payment as MercadoPagoPayment } from "mercadopago";
import { getMercadoPagoClient } from "./client";

export interface MercadoPagoPaymentStatus {
  id: number;
  status: string; // "approved" | "pending" | "rejected" | "cancelled" | ...
  externalReference: string | null;
  transactionAmount: number | null;
}

// The webhook body only carries a payment id — never trust its other fields.
// This re-fetches the payment directly from Mercado Pago's API (authenticated
// with our own access token) as the actual source of truth for its status.
export async function getMercadoPagoPayment(
  paymentId: string,
): Promise<MercadoPagoPaymentStatus> {
  const payment = new MercadoPagoPayment(getMercadoPagoClient());
  const result = await payment.get({ id: paymentId });
  return {
    id: result.id!,
    status: result.status ?? "unknown",
    externalReference: result.external_reference ?? null,
    transactionAmount: result.transaction_amount ?? null,
  };
}
```

- [ ] **Step 6: Webhook signature verification**

Create `lib/mercadopago/webhookSignature.ts`:

```ts
import {
  WebhookSignatureValidator,
  InvalidWebhookSignatureError,
} from "mercadopago";

export function verifyMercadoPagoSignature(params: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
}): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret || !params.xSignature || !params.xRequestId || !params.dataId) {
    return false;
  }
  try {
    WebhookSignatureValidator.validate({
      xSignature: params.xSignature,
      xRequestId: params.xRequestId,
      dataId: params.dataId,
      secret,
    });
    return true;
  } catch (err) {
    if (err instanceof InvalidWebhookSignatureError) return false;
    throw err;
  }
}
```

- [ ] **Step 7: Refunds**

Create `lib/mercadopago/refunds.ts`. The class-based v2 SDK doesn't expose a stable, documented refund class name across versions, so this calls Mercado Pago's documented REST endpoint directly:

```ts
// Calls Mercado Pago's refund endpoint directly (POST
// /v1/payments/{id}/refunds) rather than going through an SDK class, since
// the installed SDK version's refund class name isn't guaranteed stable —
// this REST endpoint is the documented, version-independent contract.
export async function refundMercadoPagoPayment(
  paymentId: string,
): Promise<void> {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) throw new Error("MERCADOPAGO_ACCESS_TOKEN is not set");

  const response = await fetch(
    `https://api.mercadopago.com/v1/payments/${paymentId}/refunds`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Mercado Pago refund failed (${response.status}): ${body}`);
  }
}
```

- [ ] **Step 8: Verify**

Run: `npx tsc --noEmit`
Expected: no errors. (Live calls to these functions can't be verified until `MERCADOPAGO_ACCESS_TOKEN` is set to a real sandbox token in `.env.local` — that happens naturally once Task 7/8's routes are exercised end-to-end.)

---

### Task 3: `core/billing` — refund + reservation-linked invoice lookup

**Files:**

- Modify: `core/billing/services/billing.service.ts`
- Modify: `core/audit/types/index.ts`

**Interfaces:**

- Consumes: `refundMercadoPagoPayment` (Task 2), `logAudit` (existing, `core/audit/services/audit.service.ts`)
- Produces:
  - `getInvoiceByReservationId(reservationId: string): Promise<Invoice | null>`
  - `refundPayment(clubId: string, invoiceId: string, refundedBy: string): Promise<Payment>`
  - `recordPayment` (existing) now also calls `logAudit` with a new `"payment.confirmed"` action.

- [ ] **Step 1: Extend `AuditAction`**

In `core/audit/types/index.ts`, add two new literals:

```ts
export type AuditAction =
  | "reservation.created"
  | "reservation.cancelled"
  | "reservation.completed"
  | "reservation.no_show"
  | "court.created"
  | "court.updated"
  | "court.deactivated"
  | "club.created"
  | "club.updated"
  | "user.created"
  | "payment.confirmed"
  | "payment.refunded";
```

- [ ] **Step 2: Add audit logging to `recordPayment`**

In `core/billing/services/billing.service.ts`, add `logAudit` (import it) right after the `$transaction` call inside `recordPayment`, before the existing notification-dispatch `try` block:

```ts
import { logAudit } from "@/core/audit/services/audit.service";
```

```ts
  const [payment] = await prisma.$transaction([
    prisma.payment.create({
      data: {
        clubId,
        invoiceId: input.invoiceId,
        method: input.method,
        amount: roundedAmount,
        currency: input.currency,
        status: "COMPLETED",
        reference: input.reference ?? null,
        paidAt,
        createdBy,
      },
    }),
    prisma.invoice.update({
      where: { id: input.invoiceId, clubId },
      data: {
        status: "PAID",
        paidAt,
        updatedBy: createdBy,
      },
    }),
  ]);

  logAudit({
    clubId,
    userId: createdBy,
    userDisplayName: createdBy,
    action: "payment.confirmed",
    entity: "Payment",
    entityId: payment.id,
    metadata: { invoiceId: input.invoiceId, amount: roundedAmount },
  });

  // Dispatch payment-confirmed notification — non-throwing, does not affect return value
  try {
    ...
```

(Leave the rest of `recordPayment` — the notification-dispatch block and return statement — unchanged.)

- [ ] **Step 3: Add `getInvoiceByReservationId` and `refundPayment`**

At the end of `core/billing/services/billing.service.ts`, add:

```ts
import { refundMercadoPagoPayment } from "@/lib/mercadopago/refunds";
```

```ts
export async function getInvoiceByReservationId(
  reservationId: string,
): Promise<Invoice | null> {
  const row = await prisma.invoice.findFirst({
    where: { reservationId },
    include: { payments: true },
    orderBy: { createdAt: "desc" },
  });
  return row ? toInvoice(row as InvoiceRow) : null;
}

// Refunds the invoice's COMPLETED payment via Mercado Pago, then marks it
// REFUNDED. Invoice.status is intentionally left as PAID — Payment.status is
// the source of truth for "this specific payment was later refunded"; there
// is no separate InvoiceStatus for "paid then refunded".
export async function refundPayment(
  clubId: string,
  invoiceId: string,
  refundedBy: string,
): Promise<Payment> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, clubId },
    include: { payments: true },
  });
  if (!invoice) throw new Error("Invoice not found");

  const completedPayment = invoice.payments.find(
    (p) => p.status === "COMPLETED",
  );
  if (!completedPayment) {
    throw new Error("No completed payment to refund for this invoice");
  }
  if (!completedPayment.reference) {
    throw new Error("Payment has no Mercado Pago reference to refund");
  }

  await refundMercadoPagoPayment(completedPayment.reference);

  const row = await prisma.payment.update({
    where: { id: completedPayment.id },
    data: { status: "REFUNDED" },
  });

  logAudit({
    clubId,
    userId: refundedBy,
    userDisplayName: refundedBy,
    action: "payment.refunded",
    entity: "Payment",
    entityId: row.id,
    metadata: { invoiceId, amount: row.amount },
  });

  return toPayment(row);
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

---

### Task 4: `core/reservations` — pending-payment hold, lapsed-hold exclusion, payment confirmation

**Files:**

- Modify: `core/reservations/consts.ts`
- Modify: `core/reservations/types/index.ts`
- Modify: `core/reservations/services/reservations.service.ts`
- Modify: `core/courts/services/courts.service.ts`

**Interfaces:**

- Produces:
  - `ACTIVE_RESERVATION_STATUSES` (exported const, moved from being duplicated inline in two files)
  - `PAYMENT_HOLD_MINUTES` (exported const, value `15`)
  - `createReservation(createdBy: string, input: CreateReservationInput, opts?: { pendingPayment?: boolean }): Promise<Reservation>` (signature extended, backward compatible — `opts` is optional)
  - `confirmReservationPayment(id: string): Promise<Reservation>`
  - `findReservationById(id: string): Promise<Reservation | null>` (club-agnostic — for the webhook route only, not exposed via any public API route)
  - `Reservation.paymentExpiresAt?: Date`

- [ ] **Step 1: Consolidate the active-status list and add the hold duration**

In `core/reservations/consts.ts`, add (near the top, after the import):

```ts
// Single source of truth for "does this status still block a slot / count as
// an active reservation" — shared by reservations.service.ts and
// courts.service.ts (previously two independently-maintained copies).
export const ACTIVE_RESERVATION_STATUSES: readonly ReservationStatus[] = [
  "SCHEDULED",
  "CONFIRMED",
];

// How long an unpaid SCHEDULED (pending-payment) reservation holds its slot
// before it's treated as lapsed. See docs: Payments spec, "Slot-hold-with-expiry".
export const PAYMENT_HOLD_MINUTES = 15;
```

- [ ] **Step 2: Add `paymentExpiresAt` to the `Reservation` type**

In `core/reservations/types/index.ts`:

```ts
export interface Reservation {
  id: string;
  clubId: string;
  userId: string;
  userName: string;
  courtId: string;
  courtName: string;
  status: ReservationStatus;
  scheduledStart: Date;
  scheduledEnd: Date;
  notes?: string;
  paymentExpiresAt?: Date;
  cancelledAt?: Date;
  cancelledBy?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}
```

- [ ] **Step 3: Update `reservations.service.ts`**

Replace the module-private const and import the shared one:

```ts
import {
  SELF_CANCEL_CUTOFF_HOURS,
  ACTIVE_RESERVATION_STATUSES,
  PAYMENT_HOLD_MINUTES,
} from "@/core/reservations/consts";
```

Delete this line (no longer needed — replaced by the import above):

```ts
const ACTIVE_STATUSES = ["SCHEDULED", "CONFIRMED"] as const;
```

Everywhere `ACTIVE_STATUSES` was used (`listReservationsByClub`, `listReservationsByUser`, `checkCourtConflict`, `checkUserOverlapConflict`, `canSelfCancel`), replace it with `ACTIVE_RESERVATION_STATUSES` — e.g. `status: { in: [...ACTIVE_STATUSES] }` becomes `status: { in: [...ACTIVE_RESERVATION_STATUSES] }`. Keep the `[...]` spread exactly as it was: `ACTIVE_RESERVATION_STATUSES` is typed `readonly ReservationStatus[]`, and Prisma's `in` filter wants a mutable array type at the type level, so the spread is still required even though nothing is actually mutated.

Add the lapsed-hold exclusion to both conflict checks. In `checkCourtConflict`:

```ts
export async function checkCourtConflict({
  clubId,
  courtId,
  scheduledStart,
  scheduledEnd,
  excludeId,
}: {
  clubId: string;
  courtId: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  excludeId?: string;
}): Promise<boolean> {
  const conflict = await prisma.reservation.findFirst({
    where: {
      clubId,
      courtId,
      status: { in: [...ACTIVE_RESERVATION_STATUSES] },
      ...(excludeId ? { id: { not: excludeId } } : {}),
      // Overlap condition: existing.start < new.end AND existing.end > new.start
      scheduledStart: { lt: scheduledEnd },
      scheduledEnd: { gt: scheduledStart },
      // A SCHEDULED (pending-payment) hold that's past its expiry no longer
      // blocks the slot — treated as lapsed rather than actively cancelled
      // (see docs: Payments spec, "Handled lazily").
      NOT: {
        status: "SCHEDULED",
        paymentExpiresAt: { lt: new Date() },
      },
    },
    select: { id: true },
  });
  return conflict !== null;
}
```

Apply the identical `NOT` block to `checkUserOverlapConflict`'s `where` (same shape, just without `clubId`/`courtId`).

Extend `createReservation`'s signature and body:

```ts
export async function createReservation(
  createdBy: string,
  input: CreateReservationInput,
  opts?: { pendingPayment?: boolean },
): Promise<Reservation> {
  const court = await prisma.court.findUnique({
    where: { id: input.courtId },
    select: { id: true, clubId: true, name: true },
  });
  if (!court) {
    throw new Error("Court not found");
  }

  const user = await prisma.userProfile.findUnique({
    where: { id: input.userId },
    select: { displayName: true },
  });
  if (!user) {
    throw new Error("User not found");
  }

  const scheduledStart = new Date(input.scheduledStart);
  const scheduledEnd = new Date(input.scheduledEnd);

  const [courtConflict, userConflict] = await Promise.all([
    checkCourtConflict({
      clubId: court.clubId,
      courtId: court.id,
      scheduledStart,
      scheduledEnd,
    }),
    checkUserOverlapConflict({
      userId: input.userId,
      scheduledStart,
      scheduledEnd,
    }),
  ]);

  if (courtConflict) {
    throw new Error("This slot is no longer available. Pick another time.");
  }
  if (userConflict) {
    throw new Error(
      "You already have a reservation at this time. Cancel it or pick a different slot.",
    );
  }

  const pendingPayment = opts?.pendingPayment ?? false;

  // MVP rule: instant confirmation, no owner-approval step (docs/reservation-flow.md).
  // Exception: a club that requires prepayment gets a SCHEDULED hold instead,
  // confirmed later by the Mercado Pago webhook (see Payments spec).
  const row = await prisma.reservation.create({
    data: {
      clubId: court.clubId,
      userId: input.userId,
      userName: user.displayName,
      courtId: court.id,
      courtName: court.name,
      status: pendingPayment ? "SCHEDULED" : "CONFIRMED",
      scheduledStart,
      scheduledEnd,
      notes: input.notes ?? null,
      paymentExpiresAt: pendingPayment
        ? new Date(Date.now() + PAYMENT_HOLD_MINUTES * 60_000)
        : null,
      createdBy,
      updatedBy: createdBy,
    },
  });

  logAudit({
    clubId: row.clubId,
    userId: createdBy,
    userDisplayName: user.displayName,
    action: "reservation.created",
    entity: "Reservation",
    entityId: row.id,
    metadata: { courtId: row.courtId, courtName: row.courtName },
  });

  return toReservation(row);
}
```

Update `toReservation` to map the new field:

```ts
function toReservation(row: ReservationRow): Reservation {
  return {
    id: row.id,
    clubId: row.clubId,
    userId: row.userId,
    userName: row.userName,
    courtId: row.courtId,
    courtName: row.courtName,
    status: row.status as Reservation["status"],
    scheduledStart: row.scheduledStart,
    scheduledEnd: row.scheduledEnd,
    notes: row.notes ?? undefined,
    paymentExpiresAt: row.paymentExpiresAt ?? undefined,
    cancelledAt: row.cancelledAt ?? undefined,
    cancelledBy: row.cancelledBy ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy ?? undefined,
    updatedBy: row.updatedBy ?? undefined,
  };
}
```

Add two new exported functions (near `cancelReservation`):

```ts
// Transitions a pending-payment hold to CONFIRMED once Mercado Pago confirms
// the payment (called only from the webhook route). No audit-log call here —
// core/billing's recordPayment (called right before this in the webhook
// handler) already logs the "payment.confirmed" audit event for the same
// transaction; logging reservation.created already covers the reservation's
// own audit trail from when the hold was created.
export async function confirmReservationPayment(
  id: string,
): Promise<Reservation> {
  const row = await prisma.reservation.update({
    where: { id },
    data: {
      status: "CONFIRMED",
      updatedBy: "system:mercadopago-webhook",
    },
  });
  return toReservation(row);
}

// Club-agnostic lookup — the only caller is the Mercado Pago webhook route,
// which doesn't know which club a payment belongs to until after this
// lookup. Not used by (and must not be exposed through) any public API route.
export async function findReservationById(
  id: string,
): Promise<Reservation | null> {
  const row = await prisma.reservation.findUnique({ where: { id } });
  return row ? toReservation(row) : null;
}
```

- [ ] **Step 4: Update `courts.service.ts`'s duplicate list and its own lapsed-hold exclusion**

In `core/courts/services/courts.service.ts`, find `const ACTIVE_RESERVATION_STATUSES = ["SCHEDULED", "CONFIRMED"] as const;` (used inside `getCourtSlots`) and replace it with an import of the now-shared const:

```ts
import { ACTIVE_RESERVATION_STATUSES } from "@/core/reservations/consts";
```

Delete the local `const ACTIVE_RESERVATION_STATUSES = ...` line. In the `prisma.reservation.findMany` (or equivalent) call inside `getCourtSlots` that filters by `status: { in: [...ACTIVE_RESERVATION_STATUSES] }`, add the same lapsed-hold exclusion used in Step 3:

```ts
NOT: {
  status: "SCHEDULED",
  paymentExpiresAt: { lt: new Date() },
},
```

This is required so a lapsed, unpaid hold stops showing as a "locked" slot on the booking grid — without it, an abandoned checkout would make that slot permanently unbookable.

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Manually verify the lapsed-hold logic in isolation: in `npx prisma studio` (or a scratch script), create a `Reservation` row with `status: "SCHEDULED"` and `paymentExpiresAt` set 1 minute in the past, then confirm `GET /api/player/clubs/[clubId]/availability?date=<that date>` (existing route) shows that slot as `"free"`, not `"locked"`.

---

### Task 5: `core/clubs` — `requiresPrepayment`

**Files:**

- Modify: `core/clubs/types/index.ts`
- Modify: `core/clubs/schemas/club.schema.ts`
- Modify: `core/clubs/services/clubs.service.ts`

**Interfaces:**

- Produces: `Club.requiresPrepayment: boolean`, `UpdateClubInput.requiresPrepayment?: boolean`

- [ ] **Step 1: Types**

In `core/clubs/types/index.ts`:

```ts
export interface Club {
  id: string;
  name: string;
  legalName?: string;
  taxId?: string;
  email: string;
  phone?: string;
  logoUrl?: string;
  timezone: string;
  currency: string;
  plan: Plan;
  status: ClubStatus;
  requiresPrepayment: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}
```

Add to `UpdateClubInput`:

```ts
export interface UpdateClubInput {
  name?: string;
  legalName?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  logoUrl?: string;
  timezone?: string;
  currency?: string;
  plan?: Plan;
  status?: ClubStatus;
  requiresPrepayment?: boolean;
}
```

- [ ] **Step 2: Schema**

In `core/clubs/schemas/club.schema.ts`, add to `updateClubSchema`:

```ts
export const updateClubSchema = z.object({
  name: z.string().min(1).optional(),
  legalName: z.string().optional(),
  taxId: z.string().optional(),
  email: z.string().email("Invalid email address").optional(),
  phone: z.string().optional(),
  logoUrl: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  plan: z.enum(["FREE", "BASIC", "PRO", "CUSTOM"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "DISABLED"]).optional(),
  requiresPrepayment: z.boolean().optional(),
});
```

- [ ] **Step 3: Service mapping**

In `core/clubs/services/clubs.service.ts`, find the `toClub()` mapping function and add:

```ts
requiresPrepayment: row.requiresPrepayment,
```

(`updateClub` itself needs no change — it already spreads validated `input` straight into `prisma.club.update`.)

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Manually verify: `PATCH /api/clubs` with body `{"requiresPrepayment": true}` as a signed-in owner, then `GET /api/clubs` and confirm the field is `true` in the response.

---

### Task 6: `core/courts` — `price`

**Files:**

- Modify: `core/courts/types/index.ts`
- Modify: `core/courts/schemas/court.schema.ts`
- Modify: `core/courts/services/courts.service.ts`

**Interfaces:**

- Produces: `Court.price?: number`, `CreateCourtInput.price?: number`, `UpdateCourtInput.price?: number`, `getCourtById(id: string): Promise<Court | null>`

- [ ] **Step 1: Types**

In `core/courts/types/index.ts`, add `price?: number` to `Court`, `CreateCourtInput`, and `UpdateCourtInput` (each type gets the same optional field added alongside their existing fields — e.g. `Court` gets `price?: number;` next to `slotDurationMinutes: number;`).

- [ ] **Step 2: Schema**

In `core/courts/schemas/court.schema.ts`, add `price: z.number().nonnegative().optional(),` to both `createCourtSchema` and `updateCourtSchema`.

- [ ] **Step 3: Service — create, update, mapping, new lookup**

In `core/courts/services/courts.service.ts`:

`createCourt`'s `data` object gains:

```ts
price: input.price ?? null,
```

`updateCourt`'s `data` object gains:

```ts
...(input.price !== undefined && { price: input.price }),
```

`toCourt()` mapping gains:

```ts
price: row.price ?? undefined,
```

Add a new exported function (needed by Task 7's route, which must read a single court's price/clubId before deciding whether to branch into the prepayment flow):

```ts
export async function getCourtById(id: string): Promise<Court | null> {
  const row = await prisma.court.findUnique({ where: { id } });
  return row ? toCourt(row) : null;
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Manually verify: `POST /api/clubs/courts` with `{"name": "Test Court", "price": 5000}` as owner, then `PATCH /api/clubs/courts/{id}` with `{"price": 6000}`, confirming both responses include the updated `price`.

---

### Task 7: `POST /api/player/reservations` — prepayment branch

**Files:**

- Modify: `app/api/player/reservations/route.ts`

**Interfaces:**

- Consumes: `getCourtById` (Task 6), `getClubById` (existing, `core/clubs/services/clubs.service.ts`), `createReservation` with `opts.pendingPayment` (Task 4), `createInvoice`/`issueInvoice` (existing, `core/billing/services/billing.service.ts`), `createCheckoutPreference` (Task 2)
- Produces: `POST /api/player/reservations` response shape extended to `{ reservation, checkoutUrl? }` — `checkoutUrl` present only when the club requires prepayment.

- [ ] **Step 1: Rewrite the POST handler**

Replace `app/api/player/reservations/route.ts`'s `POST` function with:

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  listReservationsByUser,
  createReservation,
  canSelfCancel,
} from "@/core/reservations/services/reservations.service";
import { getCourtById } from "@/core/courts/services/courts.service";
import { getClubById } from "@/core/clubs/services/clubs.service";
import {
  createInvoice,
  issueInvoice,
} from "@/core/billing/services/billing.service";
import { createCheckoutPreference } from "@/lib/mercadopago/preferences";

// Player's "my reservations" list, across all clubs. Each row also carries a
// server-computed canSelfCancel flag (docs/reservation-flow.md: self-cancel
// allowed until 2h before scheduledStart) so the client never has to
// reimplement that cutoff rule — it just reads the flag.
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const includePast =
    request.nextUrl.searchParams.get("includePast") === "true";
  const reservations = await listReservationsByUser(userId, { includePast });
  const withFlag = reservations.map((reservation) => ({
    ...reservation,
    canSelfCancel: canSelfCancel(reservation),
  }));

  return NextResponse.json({ reservations: withFlag });
}

// Instant CONFIRMED booking (docs/reservation-flow.md), unless the court's
// club requires prepayment — in that case this creates a 15-minute SCHEDULED
// hold plus an ISSUED invoice, and returns a Mercado Pago checkoutUrl instead
// of an immediately-confirmed reservation. createReservation already runs
// both the court-level and user-level (all-clubs) overlap conflict checks
// internally, so this route does not duplicate that logic — it only forwards
// the caller's own Clerk userId rather than trusting one from the request body.
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const courtId = body?.courtId;
  const scheduledStart = body?.scheduledStart;
  const scheduledEnd = body?.scheduledEnd;
  const notes = typeof body?.notes === "string" ? body.notes : undefined;

  if (
    typeof courtId !== "string" ||
    typeof scheduledStart !== "string" ||
    typeof scheduledEnd !== "string"
  ) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const court = await getCourtById(courtId);
  if (!court) {
    return NextResponse.json({ error: "Court not found" }, { status: 404 });
  }

  const club = await getClubById(court.clubId);
  if (!club) {
    return NextResponse.json({ error: "Club not found" }, { status: 404 });
  }

  if (!club.requiresPrepayment) {
    try {
      const reservation = await createReservation(userId, {
        userId,
        courtId,
        scheduledStart,
        scheduledEnd,
        notes,
      });
      return NextResponse.json({ reservation }, { status: 201 });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not create reservation";
      return NextResponse.json({ error: message }, { status: 409 });
    }
  }

  if (!court.price) {
    return NextResponse.json(
      {
        error: "This court doesn't have a price set yet — contact the club",
      },
      { status: 422 },
    );
  }

  try {
    const reservation = await createReservation(
      userId,
      { userId, courtId, scheduledStart, scheduledEnd, notes },
      { pendingPayment: true },
    );

    const invoice = await createInvoice(court.clubId, userId, {
      userId,
      reservationId: reservation.id,
      currency: club.currency,
      items: [
        {
          description: `${court.name} reservation`,
          quantity: 1,
          unitPrice: court.price,
          total: court.price,
        },
      ],
      tax: 0,
      discount: 0,
    });
    await issueInvoice(court.clubId, invoice.id, userId);

    const { checkoutUrl } = await createCheckoutPreference({
      reservationId: reservation.id,
      courtName: court.name,
      price: court.price,
      currency: club.currency,
    });

    return NextResponse.json({ reservation, checkoutUrl }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not create reservation";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Manually verify (needs a real `MERCADOPAGO_ACCESS_TOKEN` sandbox credential in `.env.local`): with a club that has `requiresPrepayment: true` and a court with `price` set, call `POST /api/player/reservations`. Expected: `201` with a `checkoutUrl` pointing at `mercadopago.com`, and the reservation visible via `GET /api/player/reservations` with `status: "SCHEDULED"`.

---

### Task 8: `POST /api/webhooks/mercadopago` (new route)

**Files:**

- Create: `app/api/webhooks/mercadopago/route.ts`

**Interfaces:**

- Consumes: `verifyMercadoPagoSignature`, `getMercadoPagoPayment` (Task 2), `findReservationById`, `confirmReservationPayment` (Task 4), `getInvoiceByReservationId`, `recordPayment`, `voidInvoice` (existing/Task 3)

- [ ] **Step 1: Create the route**

`proxy.ts` already publicly allowlists `/api/webhooks(.*)` — no middleware change needed.

```ts
import { NextRequest, NextResponse } from "next/server";
import { verifyMercadoPagoSignature } from "@/lib/mercadopago/webhookSignature";
import { getMercadoPagoPayment } from "@/lib/mercadopago/payments";
import {
  findReservationById,
  confirmReservationPayment,
} from "@/core/reservations/services/reservations.service";
import {
  getInvoiceByReservationId,
  recordPayment,
  voidInvoice,
} from "@/core/billing/services/billing.service";

const SYSTEM_ACTOR = "system:mercadopago-webhook";

// Mercado Pago's source-of-truth payment notification. The webhook body
// itself is never trusted for payment status — only used to know which
// payment id to re-fetch via an authenticated GET (see
// lib/mercadopago/payments.ts). Always acks with 2xx once the signature is
// valid, even on a business-logic no-op (e.g. an already-processed payment
// from a duplicate delivery) — Mercado Pago retries on any non-2xx response.
export async function POST(request: NextRequest) {
  const xSignature = request.headers.get("x-signature");
  const xRequestId = request.headers.get("x-request-id");
  const dataId = request.nextUrl.searchParams.get("data.id");

  const validSignature = verifyMercadoPagoSignature({
    xSignature,
    xRequestId,
    dataId,
  });
  if (!validSignature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (!dataId) {
    return NextResponse.json({ error: "Missing data.id" }, { status: 400 });
  }

  const mpPayment = await getMercadoPagoPayment(dataId);
  if (!mpPayment.externalReference) {
    // Not a payment we created a preference for — ack and ignore.
    return NextResponse.json({ ok: true });
  }

  const reservation = await findReservationById(mpPayment.externalReference);
  if (!reservation) {
    return NextResponse.json({ ok: true });
  }

  const invoice = await getInvoiceByReservationId(reservation.id);
  if (!invoice) {
    return NextResponse.json({ ok: true });
  }

  if (mpPayment.status === "approved") {
    try {
      await recordPayment(reservation.clubId, SYSTEM_ACTOR, {
        invoiceId: invoice.id,
        method: "DIGITAL",
        amount: invoice.total,
        currency: invoice.currency,
        reference: String(mpPayment.id),
      });
      await confirmReservationPayment(reservation.id);
    } catch {
      // Already processed (invoice no longer ISSUED) — a duplicate webhook
      // delivery for the same approved payment. Not an error; ack as usual.
    }
  } else if (invoice.status === "ISSUED") {
    await voidInvoice(reservation.clubId, invoice.id, SYSTEM_ACTOR);
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Manually verify with the Mercado Pago sandbox: complete a test checkout (Task 7's flow) using MP's test-card credentials, confirm the webhook fires (visible in Mercado Pago's dashboard delivery log or a temporary `console.log`), and that the reservation transitions from `SCHEDULED` to `CONFIRMED` in `GET /api/player/reservations`.

---

### Task 9: Refund wiring on cancellation (player + owner)

**Files:**

- Modify: `app/api/player/reservations/[id]/cancel/route.ts`
- Modify: `app/api/clubs/reservations/[reservationId]/route.ts`

**Interfaces:**

- Consumes: `getInvoiceByReservationId`, `refundPayment` (Task 3)

- [ ] **Step 1: Player self-cancel route**

Rewrite `app/api/player/reservations/[id]/cancel/route.ts`:

```ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  listReservationsByUser,
  canSelfCancel,
  cancelReservation,
} from "@/core/reservations/services/reservations.service";
import {
  getInvoiceByReservationId,
  refundPayment,
} from "@/core/billing/services/billing.service";

// Self-cancel, scoped to the caller's own reservations. core/reservations
// only exposes getReservation(clubId, id) (club-scoped, for the owner
// dashboard) — there's no club-agnostic lookup by id, and this route can't
// know the clubId up front. Rather than add one to core (read-only
// dependency for this agent), ownership + the reservation's own fields are
// read back via listReservationsByUser, which is already scoped to userId.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const mine = await listReservationsByUser(userId, { includePast: true });
  const reservation = mine.find((r) => r.id === id);

  if (!reservation) {
    return NextResponse.json(
      { error: "Reservation not found" },
      { status: 404 },
    );
  }
  if (!canSelfCancel(reservation)) {
    return NextResponse.json(
      {
        error:
          "This reservation can no longer be self-cancelled (inside the 2-hour cutoff). Contact the club directly.",
      },
      { status: 403 },
    );
  }

  // If this reservation was actually paid for, refund before cancelling —
  // a refund failure must block cancellation (unlike the best-effort
  // notification-email pattern elsewhere) since money is at stake: the
  // player should be able to retry rather than have their reservation
  // silently cancelled while unrefunded.
  const invoice = await getInvoiceByReservationId(id);
  const completedPayment = invoice?.payments.find(
    (p) => p.status === "COMPLETED",
  );
  if (invoice && completedPayment) {
    try {
      await refundPayment(reservation.clubId, invoice.id, userId);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not process refund";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  const cancelled = await cancelReservation(id, userId);
  return NextResponse.json({ reservation: cancelled });
}
```

- [ ] **Step 2: Owner PATCH route**

In `app/api/clubs/reservations/[reservationId]/route.ts`, update the imports and the `"cancel"` case:

```ts
import {
  cancelReservation,
  completeReservation,
  getReservation,
  noShowReservation,
} from "@/core/reservations/services/reservations.service";
import {
  getInvoiceByReservationId,
  refundPayment,
} from "@/core/billing/services/billing.service";
import { requireOwnerClub } from "../../_lib/require-owner";
```

```ts
      case "cancel": {
        // Same refund-before-cancel rule as the player self-cancel route —
        // "this reservation was paid for and is being cancelled" applies
        // regardless of who initiates the cancellation.
        const invoice = await getInvoiceByReservationId(reservationId);
        const completedPayment = invoice?.payments.find(
          (p) => p.status === "COMPLETED",
        );
        if (invoice && completedPayment) {
          try {
            await refundPayment(clubId, invoice.id, userId);
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "Could not process refund";
            return NextResponse.json({ error: message }, { status: 502 });
          }
        }

        const reservation = await cancelReservation(reservationId, userId);
        return NextResponse.json({ reservation });
      }
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Manually verify: complete a sandbox checkout to CONFIRMED (Tasks 7+8), then self-cancel it (outside the 2-hour cutoff) and confirm the associated `Payment.status` becomes `REFUNDED` (check via `npx prisma studio`) and Mercado Pago's sandbox dashboard shows the refund.

---

### Task 10: `BookingConfirmDialog` — branch on `requiresPrepayment`, redirect to checkout

**Files:**

- Modify: `app/dashboard/browse/_components/BrowseCourts/components/BookingConfirmDialog/BookingConfirmDialog.tsx`
- Modify: `app/dashboard/browse/_components/BrowseCourts/components/BookingConfirmDialog/types.ts`
- Modify: `app/dashboard/browse/_components/BrowseCourts/BrowseCourts.tsx`

**Interfaces:**

- Consumes: `Club.requiresPrepayment` (already returned by the existing `GET /api/player/clubs` → `useActiveClubs()`, once Task 5's type change lands)
- Produces: `BookingConfirmDialogProps.requiresPrepayment: boolean` (new prop)

The exact price isn't threaded through the availability grid for this dialog — it isn't needed here, since the server already enforces and computes it (Task 7), and Mercado Pago's own hosted checkout page shows the itemized amount before charging. Only the club-level `requiresPrepayment` boolean is needed to change the dialog's copy and button label.

- [ ] **Step 1: Add the new prop and branch the copy**

In `types.ts`:

```ts
import type { Slot } from "@/components/CourtAvailabilityGrid";

export type BookingConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courtName: string;
  slot: Slot | null;
  isSubmitting: boolean;
  requiresPrepayment: boolean;
  onConfirm: () => void;
};
```

In `BookingConfirmDialog.tsx`:

```tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GuardedActionButton } from "@/components/GuardedActionButton";
import type { BookingConfirmDialogProps } from "./types";
import { formatSlotRange } from "./utils";

export function BookingConfirmDialog({
  open,
  onOpenChange,
  courtName,
  slot,
  isSubmitting,
  requiresPrepayment,
  onConfirm,
}: BookingConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Confirm reservation</DialogTitle>
          <DialogDescription className="text-base font-semibold text-foreground">
            {slot
              ? `${courtName} · ${formatSlotRange(slot.start, slot.end)}`
              : null}
          </DialogDescription>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          {requiresPrepayment
            ? "This club requires payment to confirm your booking. You'll be redirected to Mercado Pago to complete it — your slot is held for 15 minutes."
            : "No payment is required now — you pay at the club. You can cancel for free up to 2 hours before your reservation."}
        </p>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <GuardedActionButton isPending={isSubmitting} onClick={onConfirm}>
            {isSubmitting
              ? "Booking…"
              : requiresPrepayment
                ? "Continue to payment"
                : "Book court"}
          </GuardedActionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Wire it up in `BrowseCourts.tsx` and redirect on `checkoutUrl`**

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CourtAvailabilityGrid } from "@/components/CourtAvailabilityGrid";
import type { Slot } from "@/components/CourtAvailabilityGrid";
import { useGuardedDialogClose } from "@/hooks/use-guarded-dialog-close";
import { ClubPicker } from "./components/ClubPicker";
import { BookingConfirmDialog } from "./components/BookingConfirmDialog";
import { useActiveClubs, useClubAvailability, useBookSlot } from "./hooks";
import type { SelectedSlot } from "./types";

export function BrowseCourts() {
  const [clubId, setClubId] = useState<string | null>(null);
  const [date, setDate] = useState(() => new Date());
  const [selected, setSelected] = useState<SelectedSlot | null>(null);

  const { data: clubs, isLoading: clubsLoading } = useActiveClubs();
  const {
    data: courts,
    isLoading: availabilityLoading,
    isUpdating: availabilityUpdating,
    isError: availabilityError,
    columnCount,
    rowCount,
  } = useClubAvailability(clubId, date);
  const bookSlot = useBookSlot();
  const handleDialogClose = useGuardedDialogClose(bookSlot.isPending, () =>
    setSelected(null),
  );

  const currentClub = clubs?.find((c) => c.id === clubId);

  function handleSlotClick(courtId: string, slot: Slot) {
    if (slot.status !== "free") return;
    const court = courts?.find((c) => c.id === courtId);
    if (!court) return;
    setSelected({ courtId, courtName: court.name, slot });
  }

  async function handleConfirm() {
    if (!selected) return;
    try {
      const result = (await bookSlot.mutateAsync({
        courtId: selected.courtId,
        scheduledStart: selected.slot.start.toISOString(),
        scheduledEnd: selected.slot.end.toISOString(),
      })) as { checkoutUrl?: string };

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }

      toast.success("Reservation confirmed.");
      setSelected(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not book this slot.",
      );
    }
  }

  return (
    <div className="flex flex-col gap-6 lg:h-full">
      <div className="shrink-0">
        <h1 className="text-2xl font-semibold tracking-tight">Browse Courts</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pick a club and reserve a free slot.
        </p>
      </div>

      <ClubPicker
        clubs={clubs ?? []}
        value={clubId}
        onChange={setClubId}
        isLoading={clubsLoading}
      />

      <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {clubId ? (
          <CourtAvailabilityGrid
            date={date}
            courts={courts ?? []}
            variant="player"
            onSlotClick={handleSlotClick}
            onDateChange={setDate}
            isLoading={availabilityLoading}
            isUpdating={availabilityUpdating}
            isError={availabilityError}
            columnCount={columnCount}
            rowCount={rowCount}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Select a club to see court availability.
          </p>
        )}
      </div>

      <BookingConfirmDialog
        open={!!selected}
        onOpenChange={handleDialogClose}
        courtName={selected?.courtName ?? ""}
        slot={selected?.slot ?? null}
        isSubmitting={bookSlot.isPending}
        requiresPrepayment={currentClub?.requiresPrepayment ?? false}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Manually verify in the browser: book a slot at a non-prepay club (unchanged flow, instant success toast) and at a prepay club (button reads "Continue to payment", confirming redirects to a `mercadopago.com` URL).

---

### Task 11: `/dashboard/browse/payment-return` page

**Files:**

- Create: `app/dashboard/browse/payment-return/page.tsx`
- Create: `app/dashboard/browse/payment-return/_components/PaymentReturnView/PaymentReturnView.tsx`
- Create: `app/dashboard/browse/payment-return/_components/PaymentReturnView/hooks.ts`
- Create: `app/dashboard/browse/payment-return/_components/PaymentReturnView/types.ts`
- Create: `app/dashboard/browse/payment-return/_components/PaymentReturnView/index.ts`

**Interfaces:**

- Consumes: `GET /api/player/reservations` (existing route, unmodified — just filtered client-side by id)

- [ ] **Step 1: Types**

Create `types.ts`:

```ts
export type ReturnReservation = {
  id: string;
  status: "SCHEDULED" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  paymentExpiresAt?: string;
  courtName: string;
  scheduledStart: string;
};

export type PaymentReturnState = "processing" | "success" | "failed";
```

- [ ] **Step 2: Hook — poll until settled**

Create `hooks.ts`:

```ts
"use client";

import { useQuery } from "@tanstack/react-query";
import type { PaymentReturnState, ReturnReservation } from "./types";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error ?? "Something went wrong. Please try again.");
  }
  return body as T;
}

const POLL_INTERVAL_MS = 3_000;

// Polls the player's own reservation list (no new endpoint needed) until the
// webhook (the actual source of truth) has settled this reservation one way
// or the other, or its 15-minute hold has visibly lapsed.
export function usePaymentReturnStatus(reservationId: string | null) {
  const query = useQuery({
    queryKey: ["payment-return", reservationId],
    queryFn: () =>
      fetchJson<{ reservations: ReturnReservation[] }>(
        "/api/player/reservations?includePast=true",
      ).then((d) => d.reservations.find((r) => r.id === reservationId) ?? null),
    enabled: !!reservationId,
    refetchInterval: (query) => {
      const reservation = query.state.data;
      if (!reservation) return POLL_INTERVAL_MS;
      const stillPending =
        reservation.status === "SCHEDULED" &&
        (!reservation.paymentExpiresAt ||
          new Date(reservation.paymentExpiresAt).getTime() > Date.now());
      return stillPending ? POLL_INTERVAL_MS : false;
    },
  });

  const reservation = query.data ?? null;

  let state: PaymentReturnState = "processing";
  if (reservation?.status === "CONFIRMED") {
    state = "success";
  } else if (
    reservation &&
    reservation.status === "SCHEDULED" &&
    reservation.paymentExpiresAt &&
    new Date(reservation.paymentExpiresAt).getTime() <= Date.now()
  ) {
    state = "failed";
  } else if (!query.isLoading && !reservation) {
    state = "failed";
  }

  return { state, reservation, isLoading: query.isLoading };
}
```

- [ ] **Step 3: View**

Create `PaymentReturnView.tsx`:

```tsx
"use client";

import Link from "next/link";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePaymentReturnStatus } from "./hooks";

export function PaymentReturnView({
  reservationId,
}: {
  reservationId: string | null;
}) {
  const { state, isLoading } = usePaymentReturnStatus(reservationId);

  if (!reservationId) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <XCircle className="h-10 w-10 text-destructive" />
        <p className="text-sm text-muted-foreground">
          Missing reservation reference.
        </p>
        <Button asChild>
          <Link href="/dashboard/browse">Back to Browse Courts</Link>
        </Button>
      </div>
    );
  }

  if (isLoading || state === "processing") {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <div>
          <p className="font-medium">Confirming your payment…</p>
          <p className="text-sm text-muted-foreground">
            This usually takes a few seconds.
          </p>
        </div>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <CheckCircle2 className="h-10 w-10 text-success" />
        <div>
          <p className="font-medium">Payment confirmed!</p>
          <p className="text-sm text-muted-foreground">
            Your reservation is booked.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/my-reservations">View my reservations</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <XCircle className="h-10 w-10 text-destructive" />
      <div>
        <p className="font-medium">Payment didn&apos;t complete</p>
        <p className="text-sm text-muted-foreground">
          Your slot hold has expired. You can try booking again.
        </p>
      </div>
      <Button asChild>
        <Link href="/dashboard/browse">Back to Browse Courts</Link>
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Barrel and page**

Create `index.ts`:

```ts
export { PaymentReturnView } from "./PaymentReturnView";
```

Create `app/dashboard/browse/payment-return/page.tsx`:

```tsx
import { PaymentReturnView } from "./_components/PaymentReturnView";

export default async function PaymentReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ reservationId?: string }>;
}) {
  const { reservationId } = await searchParams;
  return <PaymentReturnView reservationId={reservationId ?? null} />;
}
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Manually verify: navigate to `/dashboard/browse/payment-return?reservationId=<a real SCHEDULED reservation id>` while signed in as its owner and confirm the processing state renders, then confirm it flips to the success state once the corresponding webhook fires (Task 8).

---

### Task 12: Club Settings — `requiresPrepayment` toggle

**Files:**

- Modify: `app/dashboard/settings/club/_components/ClubSettingsView/types.ts`
- Modify: `app/dashboard/settings/club/_components/ClubSettingsView/consts.ts`
- Modify: `app/dashboard/settings/club/_components/ClubSettingsView/utils.ts`
- Modify: `app/dashboard/settings/club/_components/ClubSettingsView/ClubSettingsView.tsx`

- [ ] **Step 1: Types**

In `types.ts`, add `requiresPrepayment: boolean;` to both `ClubRecord` and `ClubSettingsFormValues`.

- [ ] **Step 2: Form schema**

In `consts.ts`, add `requiresPrepayment: z.boolean(),` to `clubSettingsFormSchema`.

- [ ] **Step 3: Default-values mapping**

In `utils.ts`, add `requiresPrepayment: club?.requiresPrepayment ?? false,` to `clubToFormValues`.

- [ ] **Step 4: Form field**

In `ClubSettingsView.tsx`, add the `Switch` import and a new field (own full-width row, per this project's Sheet/Dialog field-layout convention) right before the submit button:

```tsx
import { Switch } from "@/components/ui/switch";
```

```tsx
import { useForm, useWatch } from "react-hook-form";
```

```tsx
const {
  register,
  handleSubmit,
  reset,
  control,
  setValue,
  formState: { errors },
} = useForm<ClubSettingsFormValues>({
  resolver: zodResolver(clubSettingsFormSchema),
  defaultValues: clubToFormValues(club),
});

const requiresPrepayment = useWatch({ control, name: "requiresPrepayment" });
```

```tsx
        <Field orientation="horizontal">
          <FieldLabel htmlFor="club-requires-prepayment">
            Require online payment at booking
          </FieldLabel>
          <Switch
            id="club-requires-prepayment"
            checked={requiresPrepayment}
            onCheckedChange={(checked) =>
              setValue("requiresPrepayment", checked)
            }
          />
        </Field>

        <div>
          <Button type="submit" disabled={updateClub.isPending}>
            {updateClub.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Manually verify in the browser: toggle the switch on Club Settings, save, reload the page, confirm it stays on.

---

### Task 13: Court form — `price` field

**Files:**

- Modify: `app/dashboard/courts/_components/CourtsView/types.ts`
- Modify: `app/dashboard/courts/_components/CourtsView/utils.ts`
- Modify: `app/dashboard/courts/_components/CourtsView/components/CourtFormSheet/consts.ts`
- Modify: `app/dashboard/courts/_components/CourtsView/components/CourtFormSheet/CourtFormSheet.tsx`

- [ ] **Step 1: Types**

In `types.ts`, add `price?: number;` to `CourtRecord` and `price: number | undefined;` to `CourtFormValues` (kept optional/undefined-able since a court can exist with no price set yet).

- [ ] **Step 2: Form schema**

In `CourtFormSheet/consts.ts`, add to `courtFormSchema`:

```ts
price: z
  .number({ message: "Price must be a number" })
  .nonnegative("Price cannot be negative")
  .optional(),
```

- [ ] **Step 3: Default-values mapping**

In `utils.ts`, add `price: court?.price,` to `courtToFormValues`.

- [ ] **Step 4: Form field**

In `CourtFormSheet.tsx`, add a new field (own full-width row) after the "Slot duration" field:

```tsx
<Field>
  <FieldLabel htmlFor="court-price">Price (per reservation)</FieldLabel>
  <Input
    id="court-price"
    type="number"
    min={0}
    step={0.01}
    placeholder="5000"
    {...register("price", { valueAsNumber: true })}
    aria-invalid={!!errors.price}
  />
  <FieldError errors={[errors.price]} />
</Field>
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Manually verify: set a price when creating a court, edit it afterward, confirm both persist via `GET /api/clubs/courts`.

---

### Task 14: Env, docs

**Files:**

- Modify: `docs/CONTRIBUTING.md`
- Modify: `docs/API.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/DATABASE.md`
- Modify: `docs/PROJECT_STATUS.md`
- Modify: `docs/ROADMAP.md`

- [ ] **Step 1: `CONTRIBUTING.md`**

Add a line documenting the three new env vars (in the same style as the existing `CRON_SECRET` line): `MERCADOPAGO_ACCESS_TOKEN`/`MERCADOPAGO_WEBHOOK_SECRET` (from the Mercado Pago developer dashboard, sandbox credentials for local dev) and `NEXT_PUBLIC_APP_URL` (must be a publicly reachable HTTPS URL in any environment Mercado Pago needs to call back to — a tunnel like ngrok when testing webhooks locally).

- [ ] **Step 2: `API.md`**

Add a new "Payments" section documenting `POST /api/webhooks/mercadopago` (unauthenticated, Mercado Pago signature-verified) and the extended `POST /api/player/reservations` response shape (`checkoutUrl` present when the club requires prepayment). Move `core/billing` out of the "Not yet exposed over HTTP" section.

- [ ] **Step 3: `ARCHITECTURE.md`**

Update the `billing` line in the request-flow diagram (remove "service exists, no API route calls it yet"; note it's now reachable via the player reservations route and the Mercado Pago webhook). Add `/dashboard/browse/payment-return` to the Player routes list. Note the new public webhook route pattern alongside the existing `/api/webhooks/*`/`/api/cron/*` allowlist bullet (no proxy.ts change was needed since `/api/webhooks(.*)` was already public).

- [ ] **Step 4: `DATABASE.md`**

Add the three new fields (`Club.requiresPrepayment`, `Court.price`, `Reservation.paymentExpiresAt`) to their respective model sections, and update the ERD if one is hand-maintained there.

- [ ] **Step 5: `PROJECT_STATUS.md`**

Update the `billing` bullet under "Backend domains" to describe the real Mercado Pago integration (remove the "(mocked: no external payment gateway is wired anywhere...)" note), and add a line under "Browse Courts" describing the prepayment flow.

- [ ] **Step 6: `ROADMAP.md`**

Strike through the "Payments" bullet under Phase 1 the same way the Audit logging/Notifications cleanup bullets were struck through when completed, with a one-line summary of what shipped.

- [ ] **Step 7: Verify**

Run: `npm run lint` (docs changes don't affect this, but it's a cheap final check that nothing else in the working tree broke) and `npx tsc --noEmit` once more as the final whole-plan check.

---

## Known limitation (in-scope decision, not a bug)

Per the approved spec's explicit non-goal ("no cleanup cron — handled lazily"), a reservation whose payment is abandoned or rejected keeps its `SCHEDULED` status forever in the player's "My Reservations" list (it just stops blocking the slot for other bookers once `paymentExpiresAt` lapses, per Task 4). There's no "resume payment" or "this expired" affordance in the UI for that stale row — the player would need to self-cancel it manually if it bothers them. This was flagged during brainstorming and accepted; revisit only if it becomes a real user complaint.
