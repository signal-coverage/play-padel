import { Resend } from "resend";

let _instance: Resend | null = null;

export function getResendClient(): Resend {
  if (!_instance) {
    _instance = new Resend(process.env.RESEND_API_KEY);
  }
  return _instance;
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — email not sent");
    return { success: false, error: "Email not configured" };
  }

  try {
    const result = await getResendClient().emails.send({
      from: process.env.EMAIL_FROM ?? "noreply@playpadel.app",
      to,
      subject,
      html,
    });
    if (result.error) {
      return { success: false, error: result.error.message };
    }
    return { success: true };
  } catch (err) {
    console.error("[email] Failed to send:", err);
    return { success: false, error: String(err) };
  }
}
