import { NextResponse, type NextRequest } from "next/server";
import {
  createClosure,
  listClosuresByCourt,
} from "@/core/courts/services/courts.service";
import { createClosureSchema } from "@/core/courts/schemas/court.schema";
import { requireOwnerClub } from "../../../_lib/require-owner";
import { findOwnedCourt } from "../../../_lib/find-owned-court";

type RouteParams = { params: Promise<{ courtId: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;

  const { courtId } = await params;
  const owned = await findOwnedCourt(authResult.context.clubId, courtId);
  if (!owned) {
    return NextResponse.json({ error: "Court not found" }, { status: 404 });
  }

  const closures = await listClosuresByCourt(courtId);
  return NextResponse.json({ closures });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;

  const { courtId } = await params;
  const owned = await findOwnedCourt(authResult.context.clubId, courtId);
  if (!owned) {
    return NextResponse.json({ error: "Court not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createClosureSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  try {
    const closure = await createClosure(
      authResult.context.clubId,
      courtId,
      parsed.data,
      authResult.context.userId,
    );
    return NextResponse.json({ closure }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create closure";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
