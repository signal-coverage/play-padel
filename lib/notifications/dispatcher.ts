import { getResendClient } from "@/lib/email/resend";
import {
  createNotification,
  updateNotificationStatus,
} from "@/core/notifications/services/notifications.service";
import type { DispatchParams } from "@/core/notifications/types";

const FROM_ADDRESS = "noreply@erpflow.app";

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
  let notificationId: string | null = null;

  try {
    // Step 1: persist PENDING row
    const notification = await createNotification({
      organizationId: params.organizationId,
      type: params.type,
      recipientId: params.recipientId,
      // Use a placeholder for missing email so the row is still created
      recipientEmail: params.recipientEmail ?? "",
      title: params.subject,
      message: params.html,
    });
    notificationId = notification.id;

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
      from: FROM_ADDRESS,
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
