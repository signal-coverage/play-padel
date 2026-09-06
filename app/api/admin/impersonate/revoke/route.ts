import { NextResponse, type NextRequest } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { requireAdminProfile } from "@/lib/auth/adminProfile";
import { revokeImpersonationSchema } from "@/core/users/schemas/adminImpersonate.schema";

// Revokes a pending actor token created by POST /api/admin/impersonate — the
// safe/cleanup direction, so unlike that route this one has no mandatory
// audit-log requirement.
export async function POST(request: NextRequest) {
  const adminResult = await requireAdminProfile();
  if (!adminResult.ok) return adminResult.response;

  const body = await request.json().catch(() => null);
  const parsed = revokeImpersonationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const client = await clerkClient();
  try {
    await client.actorTokens.revoke(parsed.data.actorTokenId);
  } catch {
    return NextResponse.json(
      { error: "Failed to revoke actor token" },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
