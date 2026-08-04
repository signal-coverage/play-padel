import { NextResponse, type NextRequest } from "next/server";
import {
  createCourt,
  listCourtsByClub,
} from "@/core/courts/services/courts.service";
import { createCourtSchema } from "@/core/courts/schemas/court.schema";
import { requireOwnerClub } from "../_lib/require-owner";

export async function GET(request: NextRequest) {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;

  const includeInactive =
    request.nextUrl.searchParams.get("includeInactive") === "true";

  const courts = await listCourtsByClub(authResult.context.clubId, {
    includeInactive,
  });
  return NextResponse.json({ courts });
}

export async function POST(request: NextRequest) {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;

  const body = await request.json().catch(() => null);
  const parsed = createCourtSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  try {
    const court = await createCourt(
      authResult.context.clubId,
      parsed.data,
      authResult.context.userId,
    );
    return NextResponse.json({ court }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create court" },
      { status: 500 },
    );
  }
}
