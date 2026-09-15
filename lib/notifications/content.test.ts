import { describe, it, expect } from "vitest";
import { resolveNotificationContent } from "./content";

describe("resolveNotificationContent", () => {
  it("renders English content for a simple, param-free type", async () => {
    const result = await resolveNotificationContent("CLUB_APPROVED", "en", {});
    expect(result.subject).toBe("Your club has been approved");
    expect(result.html).toContain(
      "Your club is now approved and can accept reservations.",
    );
  });

  it("renders Spanish content for the same type", async () => {
    const result = await resolveNotificationContent("CLUB_APPROVED", "es", {});
    expect(result.subject).toBe("Tu club fue aprobado");
    expect(result.html).toContain(
      "Tu club ya está aprobado y puede aceptar reservas.",
    );
  });

  it("interpolates simple ICU params", async () => {
    const result = await resolveNotificationContent(
      "CLUB_PENDING_APPROVAL",
      "en",
      { clubName: "Padel Club Norte" },
    );
    expect(result.subject).toBe("A new club is pending approval");
    expect(result.html).toContain(
      "A new club, Padel Club Norte, is pending approval.",
    );
  });

  it("resolves a variant-scoped template via params.variant", async () => {
    const updated = await resolveNotificationContent(
      "RESERVATION_UPDATED",
      "en",
      { variant: "completed" },
    );
    expect(updated.subject).toBe("Your reservation is complete");

    const noShow = await resolveNotificationContent(
      "RESERVATION_UPDATED",
      "en",
      { variant: "noShow" },
    );
    expect(noShow.subject).toBe("You were marked as a no-show");
  });

  it("derives locale-aware date/time from a scheduledStart ISO param", async () => {
    const iso = "2026-03-10T14:30:00.000Z";
    const en = await resolveNotificationContent("RESERVATION_CANCELLED", "en", {
      userName: "Jane",
      courtName: "Court 1",
      scheduledStart: iso,
    });
    const es = await resolveNotificationContent("RESERVATION_CANCELLED", "es", {
      userName: "Jane",
      courtName: "Court 1",
      scheduledStart: iso,
    });

    expect(en.html).toContain("Hello Jane");
    expect(es.html).toContain("Hola Jane");
    // Locale-specific month names diverge — proves the date was formatted
    // per-locale, not just passed through verbatim.
    expect(en.html).toMatch(/March/);
    expect(es.html).toMatch(/marzo/);
  });

  it("derives a locale-formatted currency amount from total + currency params", async () => {
    const result = await resolveNotificationContent("PAYMENT_CONFIRMED", "en", {
      userName: "Jane",
      invoiceNumber: 42,
      total: 1500,
      currency: "USD",
    });
    expect(result.subject).toBe("Payment received for invoice #42");
    expect(result.html).toMatch(/\$1,500\.00/);
  });

  it("falls back to DEFAULT_LOCALE for an invalid locale", async () => {
    const result = await resolveNotificationContent(
      "CLUB_APPROVED",
      // @ts-expect-error deliberately invalid locale to exercise the fallback
      "fr",
      {},
    );
    expect(result.subject).toBe("Tu club fue aprobado");
  });
});
