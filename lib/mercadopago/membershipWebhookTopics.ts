// Mercado Pago webhook `type`/`topic` constant for the club-membership
// subscription flow (see sdd/club-membership-subscription).
//
// CONFIRMED (2026-08-24) via the Mercado Pago DevPanel's "Simular
// notificación" tool: sending a test subscription/preapproval notification
// produces a payload of the shape below, with `type: "subscription_preapproval"`.
//
//   {
//     "action": "updated",
//     "application_id": "567665326816887",
//     "data": { "id": "7d824b1990654caa96942cee4f49ded4" },
//     "date": "2021-11-01T02:02:02Z",
//     "entity": "preapproval",
//     "id": "123456",
//     "type": "subscription_preapproval",
//     "version": 8
//   }
//
// `data.id` is the **preapproval id**, not the plan id.
//
// There is only ONE webhook topic for subscriptions: the DevPanel's
// webhook-topic checklist exposes a single checkbox ("Planes y
// suscripciones") for this feature — there is no separate topic for
// per-installment/per-charge events. `subscription_authorized_payment` does
// NOT exist as a distinct topic; it was an unconfirmed candidate that this
// empirical check ruled out.
//
// Consequence for the webhook handler (originally Phase 4's
// `app/api/webhooks/mercadopago/membership/route.ts`, since consolidated
// into `lib/mercadopago/membershipWebhookHandlers.ts`'s
// `handleSubscriptionPreapprovalTopic`, called from the single real webhook
// URL at `app/api/webhooks/mercadopago/route.ts` — Mercado Pago's DevPanel
// registers exactly ONE notification URL per environment, not one per
// topic, so the original separate route was never actually reachable): this
// repo's established Mercado Pago webhook pattern is "never trust the
// webhook body, always re-fetch"
// (see `lib/mercadopago/payments.ts`, from the prior
// `mercadopago-club-split-payments` change). The handler must, on receiving
// `type: MEMBERSHIP_WEBHOOK_TOPIC`, call `getMembershipPreapproval(data.id)`
// (`lib/mercadopago/membershipPreapprovals.ts`) and branch on the freshly
// fetched preapproval's own `status` (and any embedded payment/dunning info)
// to decide which `core/billing/services/membership.service.ts` transition
// to call (`recordSuccessfulCharge` / `recordFailedCharge` /
// `recordAutoCancellation` / etc.). There is no second webhook topic to
// dispatch on for per-installment events — every subscription signal funnels
// through this one notification type, each time meaning "go re-check this
// preapproval's current state."
export const MEMBERSHIP_WEBHOOK_TOPIC = "subscription_preapproval" as const;

// ANNUAL membership billing is a one-time Checkout Pro payment (see
// design.md's "Annual one-time payment" decision), never a preapproval — MP
// notifies THAT confirmation via the standard `payment` topic, exactly like
// the reservation webhook (app/api/webhooks/mercadopago/route.ts) already
// handles for reservation payments. `lib/mercadopago/platformPreferences.ts`'s
// `createMembershipPreference` embeds `?clubId=` on its `notification_url`
// (pointing at the base, consolidated route — see that file) for exactly
// this purpose (club resolution BEFORE ever re-fetching the payment,
// matching the reservation webhook's own `reservationId`-query-param
// pattern) — this constant is what lets the consolidated base route
// (app/api/webhooks/mercadopago/route.ts) dispatch a `type: "payment"`
// notification with no `reservationId` to `handleMembershipPaymentTopic`
// instead of the reservation flow.
export const MEMBERSHIP_PAYMENT_WEBHOOK_TOPIC = "payment" as const;
