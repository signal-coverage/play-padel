import { NextResponse, type NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { updateCourt } from "@/core/courts/services/courts.service";
import { validateCourtPhotoFile } from "@/core/courts/validation";
import { requireOwnerClub } from "../../../_lib/require-owner";
import { findOwnedCourt } from "../../../_lib/find-owned-court";
import { requireClubOperational } from "../../../_lib/require-club-operational";

type RouteParams = { params: Promise<{ courtId: string }> };

// Accepts a single `photo` file field as multipart/form-data (not JSON, and
// not a pre-uploaded URL like the sibling PATCH route) — the raw file is
// uploaded to Vercel Blob here, and only the resulting public URL is
// persisted on the court via updateCourt.
export async function POST(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;

  const operationalResult = await requireClubOperational(
    authResult.context.clubId,
  );
  if (!operationalResult.ok) return operationalResult.response;

  const { courtId } = await params;
  const owned = await findOwnedCourt(authResult.context.clubId, courtId);
  if (!owned) {
    return NextResponse.json({ error: "Court not found" }, { status: 404 });
  }

  const formData = await request.formData().catch(() => null);
  const photo = formData?.get("photo");
  if (!photo || !(photo instanceof File)) {
    return NextResponse.json({ error: "Missing photo file" }, { status: 400 });
  }

  const validationError = validateCourtPhotoFile(photo);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const extension = photo.name.includes(".")
      ? photo.name.slice(photo.name.lastIndexOf("."))
      : "";
    const blob = await put(`court-photos/${courtId}${extension}`, photo, {
      access: "public",
      addRandomSuffix: true,
      contentType: photo.type,
    });

    await updateCourt(
      courtId,
      { photoUrl: blob.url },
      authResult.context.userId,
    );

    return NextResponse.json({ photoUrl: blob.url });
  } catch {
    return NextResponse.json(
      { error: "Failed to upload photo" },
      { status: 500 },
    );
  }
}
