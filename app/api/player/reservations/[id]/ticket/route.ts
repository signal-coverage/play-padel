import { NextRequest, NextResponse } from "next/server";
import * as React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import {
  listReservationsByUser,
  getTicketData,
} from "@/core/reservations/services/reservations.service";
import { TicketDocument } from "@/lib/pdf/TicketDocument";
import { requireAuthUser } from "@/lib/auth/requireAuthUser";

// Player-scoped booking-ticket download/preview, mirroring the [id]/receipt
// route's ownership-check pattern exactly: there's no club-agnostic lookup by
// reservation id, so ownership is confirmed via listReservationsByUser
// (already scoped to the caller's own userId) rather than trusting the id
// from the URL alone. Unlike the receipt, this works for ANY CONFIRMED
// reservation — paid or free — since a ticket proves the booking, not the
// payment.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuthUser();
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const { id } = await params;

  const mine = await listReservationsByUser(userId, { includePast: true });
  const reservation = mine.find((r) => r.id === id);
  if (!reservation) {
    return NextResponse.json(
      { error: "Reservation not found" },
      { status: 404 },
    );
  }

  // getTicketData returns null for anything other than a CONFIRMED
  // reservation — a SCHEDULED (pending-payment) hold has no ticket to show.
  const ticketData = await getTicketData(id);
  if (!ticketData) {
    return NextResponse.json(
      { error: "This reservation isn't confirmed yet" },
      { status: 404 },
    );
  }

  // react-pdf's Document-typed elements don't structurally match a custom
  // wrapper component's own props type, so the element is cast for
  // renderToBuffer's signature — this is a known TS/react-pdf interop gap,
  // not a real type mismatch (TicketDocument always renders a <Document>).
  const buffer = await renderToBuffer(
    React.createElement(TicketDocument, {
      data: ticketData,
    }) as unknown as React.ReactElement<DocumentProps>,
  );

  // ?preview=1 renders the PDF inline (e.g. a new browser tab) instead of
  // triggering a download — same endpoint, one query-param toggle.
  const preview = request.nextUrl.searchParams.get("preview") === "1";

  // Buffer is a Uint8Array subclass, but its generic ArrayBufferLike doesn't
  // structurally satisfy the BodyInit typing NextResponse expects — copy
  // into a plain Uint8Array to hand off a type that matches.
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${preview ? "inline" : "attachment"}; filename="ticket-${ticketData.id}.pdf"`,
    },
  });
}
