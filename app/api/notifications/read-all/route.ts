import { NextResponse } from "next/server";
import { markAllAsRead } from "@/core/notifications/services/notifications.service";
import { requireAuthUser } from "@/lib/auth/requireAuthUser";

export async function PATCH() {
  const authResult = await requireAuthUser();
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  await markAllAsRead(userId);

  return NextResponse.json({ ok: true });
}
