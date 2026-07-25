import { render } from "@react-email/render";
import { prisma } from "@/infrastructure/db/client";
import { eventBus } from "@/core/events/event-bus";
import { dispatch } from "@/lib/notifications/dispatcher";
import { ReservationReminder } from "@/lib/email/templates/ReservationReminder";
import { ReservationCancelled } from "@/lib/email/templates/ReservationCancelled";
import { PaymentConfirmed } from "@/lib/email/templates/PaymentConfirmed";

// reservation.created → RESERVATION_REMINDER (booking confirmation to the user)
eventBus.on("reservation.created", async (payload) => {
  try {
    const [reservation, user] = await Promise.all([
      prisma.reservation.findUnique({
        where: { id: payload.reservationId },
        select: { scheduledStart: true, courtName: true },
      }),
      prisma.userProfile.findUnique({
        where: { id: payload.userId },
        select: { email: true, displayName: true },
      }),
    ]);

    if (!reservation || !user) return;

    const html = await render(
      <ReservationReminder
        userName={user.displayName}
        scheduledStart={reservation.scheduledStart}
        courtName={reservation.courtName}
      />,
    );

    await dispatch({
      type: "RESERVATION_REMINDER",
      clubId: payload.clubId,
      recipientId: payload.userId,
      recipientEmail: user.email,
      recipientName: user.displayName,
      subject: "Reservation Confirmed",
      html,
    });
  } catch (err) {
    console.error("[notification.handlers] reservation.created error:", err);
  }
});

// reservation.status_changed (CANCELLED) → RESERVATION_CANCELLED
eventBus.on("reservation.status_changed", async (payload) => {
  if (payload.status !== "CANCELLED") return;

  try {
    const [reservation, user] = await Promise.all([
      prisma.reservation.findUnique({
        where: { id: payload.reservationId },
        select: { scheduledStart: true, courtName: true },
      }),
      prisma.userProfile.findUnique({
        where: { id: payload.userId },
        select: { email: true, displayName: true },
      }),
    ]);

    if (!reservation || !user) return;

    const html = await render(
      <ReservationCancelled
        userName={user.displayName}
        scheduledStart={reservation.scheduledStart}
        courtName={reservation.courtName}
      />,
    );

    await dispatch({
      type: "RESERVATION_CANCELLED",
      clubId: payload.clubId,
      recipientId: payload.userId,
      recipientEmail: user.email,
      recipientName: user.displayName,
      subject: "Your Reservation Has Been Cancelled",
      html,
    });
  } catch (err) {
    console.error(
      "[notification.handlers] reservation.status_changed error:",
      err,
    );
  }
});

// invoice.paid → PAYMENT_CONFIRMED
eventBus.on("invoice.paid", async (payload) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: payload.invoiceId },
      select: {
        number: true,
        total: true,
        currency: true,
        userId: true,
        userName: true,
      },
    });

    if (!invoice) return;

    const user = await prisma.userProfile.findUnique({
      where: { id: invoice.userId },
      select: { email: true, displayName: true },
    });

    const userName = user?.displayName ?? invoice.userName;

    const html = await render(
      <PaymentConfirmed
        userName={userName}
        invoiceNumber={invoice.number}
        total={invoice.total}
        currency={invoice.currency}
      />,
    );

    await dispatch({
      type: "PAYMENT_CONFIRMED",
      clubId: payload.clubId,
      recipientId: invoice.userId,
      recipientEmail: user?.email ?? null,
      recipientName: userName,
      subject: "Payment Received",
      html,
    });
  } catch (err) {
    console.error("[notification.handlers] invoice.paid error:", err);
  }
});
