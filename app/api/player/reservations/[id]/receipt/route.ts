import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import * as React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import { listReservationsByUser } from "@/core/reservations/services/reservations.service";
import { getReceiptData } from "@/core/billing/services/billing.service";
import { ReceiptDocument } from "@/lib/pdf/ReceiptDocument";

// Player-scoped receipt download, following the same ownership pattern as
// the [id]/cancel route: there's no club-agnostic lookup by reservation id,
// so ownership is confirmed via listReservationsByUser (already scoped to
// the caller's own userId) rather than trusting the id from the URL alone.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const mine = await listReservationsByUser(userId, { includePast: true });
  const reservation = mine.find((r) => r.id === id);
  if (!reservation) {
    return NextResponse.json(
      { error: "Reservation not found" },
      { status: 404 },
    );
  }

  // getReceiptData returns null when there's no invoice at all, or the
  // invoice has no COMPLETED payment — a reservation with no prepayment has
  // nothing to receipt.
  const receiptData = await getReceiptData(id);
  if (!receiptData) {
    return NextResponse.json(
      { error: "No paid receipt is available for this reservation" },
      { status: 404 },
    );
  }

  // react-pdf's Document-typed elements don't structurally match a custom
  // wrapper component's own props type, so the element is cast for
  // renderToBuffer's signature — this is a known TS/react-pdf interop gap,
  // not a real type mismatch (ReceiptDocument always renders a <Document>).
  const buffer = await renderToBuffer(
    React.createElement(ReceiptDocument, {
      data: receiptData,
    }) as unknown as React.ReactElement<DocumentProps>,
  );

  // Buffer is a Uint8Array subclass, but its generic ArrayBufferLike doesn't
  // structurally satisfy the BodyInit typing NextResponse expects — copy
  // into a plain Uint8Array to hand off a type that matches.
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="receipt-${receiptData.invoiceNumber}.pdf"`,
    },
  });
}
