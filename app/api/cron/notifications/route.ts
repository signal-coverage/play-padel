import { NextResponse } from "next/server";
import { render } from "@react-email/render";
import * as React from "react";
import { getPendingReservationReminders } from "@/core/notifications/services/notifications.service";
import { dispatch } from "@/lib/notifications/dispatcher";
import { ReservationReminder } from "@/lib/email/templates/ReservationReminder";

// Triggered by Vercel Cron (see vercel.json, daily at 08:00). Not a Clerk
// session — proxy.ts allowlists this route and this bearer check is the only
// auth, matching Vercel's documented CRON_SECRET pattern. Dedup (don't remind
// the same user twice in one calendar day) is handled inside
// getPendingReservationReminders, not here.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pending = await getPendingReservationReminders();

  for (const reminder of pending) {
    const html = await render(
      React.createElement(ReservationReminder, {
        userName: reminder.userName,
        scheduledStart: reminder.scheduledStart,
        courtName: reminder.courtName,
      }),
    );

    await dispatch({
      type: "RESERVATION_REMINDER",
      clubId: reminder.clubId,
      recipientId: reminder.userId,
      recipientEmail: reminder.userEmail,
      recipientName: reminder.userName,
      subject: "Upcoming Reservation Reminder",
      html,
    });
  }

  return NextResponse.json({ checked: pending.length });
}
