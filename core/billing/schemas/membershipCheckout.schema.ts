import { z } from "zod";

// Request body for `POST /api/clubs/membership` — initiates a membership
// payment for the caller's own club (see spec's "Two Separate Membership
// Actions" and design.md's "Monthly pay"/"Annual pay" flows).
//
// MONTHLY requires `renewalMode`, `payerEmail`, and `cardTokenId`:
// `createMembershipPreapproval` (lib/mercadopago/membershipPreapprovals.ts,
// Phase 2) creates an ALREADY-authorized preapproval directly via the API
// (never a hosted-checkout redirect), which requires a tokenised card —
// the client must obtain `cardTokenId` via Mercado Pago's client-side
// Card Form/Bricks SDK before calling this endpoint (a Phase 7 UI
// responsibility). ANNUAL is a one-time Checkout Pro preference — no card
// token needed, the owner is redirected to a hosted checkout URL instead.
export const createMembershipCheckoutSchema = z
  .object({
    plan: z.enum(["BASIC", "PRO", "PLUS", "MAX"]),
    cycle: z.enum(["MONTHLY", "ANNUAL"]),
    renewalMode: z.enum(["AUTO", "MANUAL"]).optional(),
    payerEmail: z.string().email().optional(),
    cardTokenId: z.string().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.cycle === "MONTHLY") {
      if (!data.renewalMode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "renewalMode is required for MONTHLY billing",
          path: ["renewalMode"],
        });
      }
      if (!data.payerEmail) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "payerEmail is required for MONTHLY billing",
          path: ["payerEmail"],
        });
      }
      if (!data.cardTokenId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "cardTokenId is required for MONTHLY billing",
          path: ["cardTokenId"],
        });
      }
    }
  });

export type CreateMembershipCheckoutInput = z.infer<
  typeof createMembershipCheckoutSchema
>;

// Request body for `PATCH /api/clubs/membership` — changes plan tier
// IMMEDIATELY while the subscription is still TRIALING (see
// membership.service.ts's `changeTrialPlan`). Same plan tier enum as
// `createMembershipCheckoutSchema` above; scope is plan tier only, same
// billing cycle — cycle switching is not covered by this schema.
export const changeTrialPlanSchema = z.object({
  plan: z.enum(["BASIC", "PRO", "PLUS", "MAX"]),
});

export type ChangeTrialPlanInput = z.infer<typeof changeTrialPlanSchema>;
