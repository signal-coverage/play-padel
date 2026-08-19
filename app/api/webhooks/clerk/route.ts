import { NextRequest, NextResponse } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import {
  anonymizeUserProfile,
  syncUserProfileFromClerk,
} from "@/core/users/services/users.service";
import { logAudit } from "@/core/audit/services/audit.service";

const SYSTEM_ACTOR = "system:clerk-webhook";

// Clerk's user lifecycle webhook.
//
// Signature verification happens before anything else, via `verifyWebhook`
// (mirrors app/api/webhooks/mercadopago/route.ts's "verify before trusting
// the body" convention). This codebase is on @clerk/nextjs 7.x, which ships
// a `/webhooks` subpath exporting `verifyWebhook` directly — it reads the
// raw request body itself, checks it against the `svix-*` headers using the
// CLERK_WEBHOOK_SIGNING_SECRET env var (Clerk's current standard name — see
// @clerk/backend/dist/webhooks.js), and throws on a missing/invalid
// signature. This is Clerk's own current recommended helper for this
// package version, so verification is delegated to it rather than hand-rolled
// with the `svix` package directly.
//
// Always ack with 2xx once the signature is verified, even on a
// business-logic no-op (e.g. an event type we don't act on, or a
// user.updated for a Clerk user who hasn't completed onboarding yet) —
// same reasoning as the Mercado Pago webhook: Clerk retries on any
// non-2xx response, and there's nothing to retry once verification passed
// and the payload was a legitimate no-op.
export async function POST(request: NextRequest) {
  let evt: Awaited<ReturnType<typeof verifyWebhook>>;
  try {
    evt = await verifyWebhook(request);
  } catch (err) {
    // verifyWebhook throws loudly (and logs, via errorThrower) when
    // CLERK_WEBHOOK_SIGNING_SECRET is missing entirely, not just when the
    // signature is invalid — so a missing env var surfaces here too, in
    // server logs, rather than silently no-oping.
    console.error("[clerk webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (evt.type === "user.deleted") {
    const userId = evt.data.id;
    if (!userId) {
      // UserDeletedJSON.id is typed optional by Clerk; without it there's no
      // row to anonymize.
      return NextResponse.json({ ok: true });
    }

    await anonymizeUserProfile(userId, SYSTEM_ACTOR);

    logAudit({
      clubId: null,
      userId,
      userDisplayName: "Deleted User",
      action: "user.anonymized",
      entity: "UserProfile",
      entityId: userId,
    });

    return NextResponse.json({ ok: true });
  }

  if (evt.type === "user.updated") {
    const { id, first_name, last_name, email_addresses, image_url } = evt.data;

    const displayName =
      first_name || last_name
        ? `${first_name ?? ""} ${last_name ?? ""}`.trim()
        : undefined;
    const email = email_addresses[0]?.email_address;

    await syncUserProfileFromClerk(id, {
      ...(displayName ? { displayName } : {}),
      ...(email ? { email } : {}),
      ...(image_url ? { photoURL: image_url } : {}),
    });

    return NextResponse.json({ ok: true });
  }

  // Any other event type: ack, no-op.
  return NextResponse.json({ ok: true });
}
