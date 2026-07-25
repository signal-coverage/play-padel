import { NextResponse, type NextRequest } from "next/server";
import { getClubById, updateClub } from "@/core/clubs/services/clubs.service";
import { updateClubSchema } from "@/core/clubs/schemas/club.schema";
import { requireOwnerClub } from "./_lib/require-owner";

export async function GET() {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;

  const club = await getClubById(authResult.context.clubId);
  if (!club) {
    return NextResponse.json({ error: "Club not found" }, { status: 404 });
  }

  return NextResponse.json({ club });
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;

  const body = await request.json().catch(() => null);
  const parsed = updateClubSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  try {
    const club = await updateClub(
      authResult.context.clubId,
      parsed.data,
      authResult.context.userId,
    );
    return NextResponse.json({ club });
  } catch {
    return NextResponse.json(
      { error: "Failed to update club" },
      { status: 500 },
    );
  }
}
