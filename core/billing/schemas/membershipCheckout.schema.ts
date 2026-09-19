import { z } from "zod";

// Request body for `POST /api/clubs/membership` — initiates a membership
// payment for the caller's own club (see spec's "Two Separate Membership
// Actions" and design.md's "Monthly pay"/"Annual pay" flows).
//
// Both cycles require `renewalMode`, `payerEmail`, and `cardTokenId`:
// `createMembershipPreapproval` (lib/mercadopago/membershipPreapprovals.ts)
// creates an ALREADY-authorized preapproval directly via the API (never a
// hosted-checkout redirect) for either cycle, which requires a tokenised
// card — the client must obtain `cardTokenId` via Mercado Pago's
// client-side Card Form/Bricks SDK before calling this endpoint. ANNUAL is
// just a 12-month-frequency preapproval instead of MONTHLY's 1-month one —
// same authorization flow, same card requirement.
export const createMembershipCheckoutSchema = z
  .object({
    plan: z.enum(["BASIC", "PRO", "PLUS", "MAX"]),
    cycle: z.enum(["MONTHLY", "ANNUAL"]),
    renewalMode: z.enum(["AUTO", "MANUAL"]).optional(),
    payerEmail: z.string().email().optional(),
    cardTokenId: z.string().min(1).optional(),
    // Cardholder identification (DNI/CUIT type + number) the owner confirmed
    // while entering their card via the Brick, and whether to persist it for
    // next time (see membership.service.ts's
    // `saveMembershipPayerIdentification`). Both stay fully optional in
    // every case — including a request that doesn't want to save
    // anything — never required via `.superRefine` below.
    identification: z
      .object({ type: z.string().min(1), number: z.string().min(1) })
      .optional(),
    saveIdentification: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.renewalMode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "renewalMode is required",
        path: ["renewalMode"],
      });
    }
    if (!data.payerEmail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "payerEmail is required",
        path: ["payerEmail"],
      });
    }
    if (!data.cardTokenId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "cardTokenId is required",
        path: ["cardTokenId"],
      });
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
