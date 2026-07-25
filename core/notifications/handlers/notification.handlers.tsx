import { render } from "@react-email/render";
import { prisma } from "@/infrastructure/db/client";
import { eventBus } from "@/core/events/event-bus";
import { dispatch } from "@/lib/notifications/dispatcher";
import { AppointmentReminder } from "@/lib/email/templates/AppointmentReminder";
import { AppointmentCancelled } from "@/lib/email/templates/AppointmentCancelled";
import { InvoicePaid } from "@/lib/email/templates/InvoicePaid";

// appointment.created → APPOINTMENT_REMINDER (booking confirmation to patient)
eventBus.on("appointment.created", async (payload) => {
  try {
    const [appointment, patient] = await Promise.all([
      prisma.appointment.findUnique({
        where: { id: payload.appointmentId },
        select: {
          scheduledStart: true,
          professionalName: true,
          location: true,
        },
      }),
      prisma.patient.findUnique({
        where: { id: payload.patientId },
        select: { email: true, firstName: true, lastName: true },
      }),
    ]);

    if (!appointment || !patient) return;

    const patientName = `${patient.firstName} ${patient.lastName}`.trim();
    const html = await render(
      <AppointmentReminder
        patientName={patientName}
        scheduledStart={appointment.scheduledStart}
        professionalName={appointment.professionalName ?? undefined}
        location={appointment.location ?? undefined}
      />,
    );

    await dispatch({
      type: "APPOINTMENT_REMINDER",
      organizationId: payload.organizationId,
      recipientId: payload.patientId,
      recipientEmail: patient.email,
      recipientName: patientName,
      subject: "Appointment Confirmed",
      html,
    });
  } catch (err) {
    console.error("[notification.handlers] appointment.created error:", err);
  }
});

// appointment.status_changed (CANCELLED) → APPOINTMENT_CANCELLED
eventBus.on("appointment.status_changed", async (payload) => {
  if (payload.status !== "CANCELLED") return;

  try {
    const [appointment, patient] = await Promise.all([
      prisma.appointment.findUnique({
        where: { id: payload.appointmentId },
        select: { scheduledStart: true, professionalName: true },
      }),
      prisma.patient.findUnique({
        where: { id: payload.patientId },
        select: { email: true, firstName: true, lastName: true },
      }),
    ]);

    if (!appointment || !patient) return;

    const patientName = `${patient.firstName} ${patient.lastName}`.trim();
    const html = await render(
      <AppointmentCancelled
        patientName={patientName}
        scheduledStart={appointment.scheduledStart}
        professionalName={appointment.professionalName ?? undefined}
      />,
    );

    await dispatch({
      type: "APPOINTMENT_CANCELLED",
      organizationId: payload.organizationId,
      recipientId: payload.patientId,
      recipientEmail: patient.email,
      recipientName: patientName,
      subject: "Your Appointment Has Been Cancelled",
      html,
    });
  } catch (err) {
    console.error(
      "[notification.handlers] appointment.status_changed error:",
      err,
    );
  }
});

// invoice.paid → INVOICE_PAID
eventBus.on("invoice.paid", async (payload) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: payload.invoiceId },
      select: {
        number: true,
        total: true,
        currency: true,
        patient: {
          select: { email: true, firstName: true, lastName: true },
        },
      },
    });

    if (!invoice) return;

    const patientName =
      `${invoice.patient.firstName} ${invoice.patient.lastName}`.trim();
    const html = await render(
      <InvoicePaid
        patientName={patientName}
        invoiceNumber={invoice.number}
        total={invoice.total}
        currency={invoice.currency}
      />,
    );

    await dispatch({
      type: "INVOICE_PAID",
      organizationId: payload.organizationId,
      recipientId: payload.patientId,
      recipientEmail: invoice.patient.email,
      recipientName: patientName,
      subject: "Payment Received",
      html,
    });
  } catch (err) {
    console.error("[notification.handlers] invoice.paid error:", err);
  }
});
