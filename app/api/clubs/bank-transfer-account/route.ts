import { NextResponse, type NextRequest } from "next/server";
import { requireOwnerClub } from "../_lib/require-owner";
import {
  getClubBankTransferAccount,
  setClubBankTransferAccount,
} from "@/core/clubs/services/bankTransferAccount.service";
import { setClubBankTransferAccountSchema } from "@/core/clubs/schemas/bankTransferAccount.schema";

// Reads the caller's own club's manual bank-transfer payout details. Consumed
// by the Club Settings "Bank Transfer" tab. `account` is `null` when the club
// hasn't configured one yet — a normal, expected 200, not a 404.
export async function GET() {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;

  const account = await getClubBankTransferAccount(authResult.context.clubId);
  return NextResponse.json({ account });
}

// Lets an owner set or update their club's manual bank-transfer payout
// details. Mirrors the analogous PUT in ../operating-hours/route.ts.
export async function PUT(request: NextRequest) {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;

  const body = await request.json().catch(() => null);
  const parsed = setClubBankTransferAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const account = await setClubBankTransferAccount(
    authResult.context.clubId,
    parsed.data,
    authResult.context.userId,
  );
  return NextResponse.json({ account });
}
