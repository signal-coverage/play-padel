import { getResendClient } from "@/lib/email/resend";
import {
  createNotification,
  updateNotificationStatus,
  listAdminRecipients,
} from "@/core/notifications/services/notifications.service";
import type { DispatchParams } from "@/core/notifications/types";

// Overridable via RESEND_FROM_ADDRESS (read live in dispatch() below, not
// cached here — same "check process.env at call time" convention this file
// already uses for RESEND_API_KEY) so a per-environment sender can be set
// without a code change or redeploy — e.g. Resend's onboarding@resend.dev
// for local/dev testing, until playpadel.app's domain is verified on Resend
// (see https://resend.com/domains). Falls back to this default when unset,
// so production keeps working unchanged until it sets its own override.
const DEFAULT_FROM_ADDRESS = "noreply@playpadel.app";

/**
 * Persist-then-send dispatcher.
 *
 * 1. Write a PENDING Notification row.
 * 2. Guard: no email → FAILED (no_contact), return.
 * 3. Guard: no RESEND_API_KEY → FAILED (missing_api_key), return.
 * 4. Call Resend.
 * 5. On success → SENT with sentAt.
 * 6. On error → FAILED with error message.
 *
 * NEVER throws — all errors are swallowed and recorded on the row.
 */
export async function dispatch(params: DispatchParams): Promise<void> {
  const sendEmail = params.sendEmail ?? true;
  let notificationId: string | null = null;

  try {
    // Step 1: persist PENDING row
    const notification = await createNotification({
      clubId: params.clubId,
      type: params.type,
      recipientId: params.recipientId,
      // Use a placeholder for missing email so the row is still created
      recipientEmail: params.recipientEmail ?? "",
      title: params.subject,
      message: params.html,
    });
    notificationId = notification.id;

    // In-app-only notification: skip Resend entirely, never touch the
    // recipientEmail/API-key guards below.
    if (!sendEmail) {
      await updateNotificationStatus(notificationId, "SKIPPED");
      return;
    }

    // Step 2: guard — no email
    if (!params.recipientEmail) {
      await updateNotificationStatus(notificationId, "FAILED", {
        failureReason: "no_contact",
      });
      return;
    }

    // Step 3: guard — no API key
    if (!process.env.RESEND_API_KEY) {
      await updateNotificationStatus(notificationId, "FAILED", {
        failureReason: "missing_api_key",
      });
      return;
    }

    // Step 4: send via Resend
    const result = await getResendClient().emails.send({
      from: process.env.RESEND_FROM_ADDRESS ?? DEFAULT_FROM_ADDRESS,
      to: params.recipientEmail,
      subject: params.subject,
      html: params.html,
    });

    if (result.error) {
      await updateNotificationStatus(notificationId, "FAILED", {
        failureReason: result.error.message ?? "resend_error",
      });
      return;
    }

    // Step 5: mark SENT
    await updateNotificationStatus(notificationId, "SENT", {
      sentAt: new Date(),
    });
  } catch (err) {
    // Step 6: swallow all errors — update row if we have an id, otherwise log only
    const reason = err instanceof Error ? err.message : "unknown_error";

    if (notificationId) {
      try {
        await updateNotificationStatus(notificationId, "FAILED", {
          failureReason: reason,
        });
      } catch {
        // Nothing more we can do — swallow this too
      }
    }

    console.error("[dispatcher] Error dispatching notification:", reason);
  }
}

/**
 * Notifies every admin UserProfile with the same DispatchParams (minus the
 * per-recipient fields, which are filled in from each admin row). Lives in
 * this module — not notifications.service.ts — so it can call the local
 * dispatch() directly without a circular import (notifications.service.ts
 * already exports createNotification/updateNotificationStatus/
 * listAdminRecipients, which this file imports from it).
 */
export async function notifyAllAdmins(
  params: Omit<
    DispatchParams,
    "recipientId" | "recipientEmail" | "recipientName"
  >,
): Promise<void> {
  const admins = await listAdminRecipients();

  await Promise.all(
    admins.map((admin) =>
      dispatch({
        ...params,
        recipientId: admin.id,
        recipientEmail: admin.email,
        recipientName: admin.displayName,
      }),
    ),
  );
}
