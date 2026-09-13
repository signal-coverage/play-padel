import { NextResponse } from "next/server";
import {
  listRecipientNotifications,
  countUnreadNotifications,
} from "@/core/notifications/services/notifications.service";
import { requireAuthUser } from "@/lib/auth/requireAuthUser";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

export const GET = withErrorHandling(async function GET() {
  const authResult = await requireAuthUser();
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const [notifications, unreadCount] = await Promise.all([
    listRecipientNotifications(userId),
    countUnreadNotifications(userId),
  ]);

  return NextResponse.json({ notifications, unreadCount });
});
