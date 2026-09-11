import { NextResponse } from "next/server";
import { markAsRead } from "@/core/notifications/services/notifications.service";
import { requireAuthUser } from "@/lib/auth/requireAuthUser";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(_request: Request, { params }: RouteParams) {
  const authResult = await requireAuthUser();
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const { id } = await params;
  await markAsRead(userId, id);

  return NextResponse.json({ ok: true });
}
