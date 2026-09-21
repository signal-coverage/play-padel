import { describe, it, expect } from "vitest";
import { resolveNotificationContent } from "./content";

describe("resolveNotificationContent", () => {
  it("renders Spanish content for a simple, param-free type", async () => {
    const result = await resolveNotificationContent("CLUB_APPROVED", "es", {});
    expect(result.subject).toBe("Tu club fue aprobado");
    expect(result.html).toContain(
      "Tu club ya está aprobado y puede aceptar reservas.",
    );
  });

  it("interpolates simple ICU params", async () => {
    const result = await resolveNotificationContent(
      "CLUB_PENDING_APPROVAL",
      "es",
      { clubName: "Padel Club Norte" },
    );
    expect(result.subject).toBe("Hay un nuevo club pendiente de aprobación");
    expect(result.html).toContain(
      "Un nuevo club, Padel Club Norte, está pendiente de aprobación.",
    );
  });

  it("resolves a variant-scoped template via params.variant", async () => {
    const updated = await resolveNotificationContent(
      "RESERVATION_UPDATED",
      "es",
      { variant: "completed" },
    );
    expect(updated.subject).toBe("Tu reserva está completa");

    const noShow = await resolveNotificationContent(
      "RESERVATION_UPDATED",
      "es",
      { variant: "noShow" },
    );
    expect(noShow.subject).toBe("Fuiste marcado como ausente");
  });

  it("derives locale-aware date/time from a scheduledStart ISO param", async () => {
    const iso = "2026-03-10T14:30:00.000Z";
    const es = await resolveNotificationContent("RESERVATION_CANCELLED", "es", {
      userName: "Jane",
      courtName: "Court 1",
      scheduledStart: iso,
    });

    expect(es.html).toContain("Hola Jane");
    // Proves the date was actually formatted, not just passed through
    // verbatim — Spanish month names are spelled out in full, lowercase.
    expect(es.html).toMatch(/marzo/);
  });

  it("derives a locale-formatted currency amount from total + currency params", async () => {
    const result = await resolveNotificationContent("PAYMENT_CONFIRMED", "es", {
      userName: "Jane",
      invoiceNumber: 42,
      total: 1500,
      currency: "USD",
    });
    expect(result.subject).toBe("Pago recibido para la factura #42");
    expect(result.html).toMatch(/1500,00\s*US\$/);
  });
});
