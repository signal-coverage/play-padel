import { describe, it, expect, vi, beforeEach } from "vitest";

const { disconnectMock, sweepMock } = vi.hoisted(() => ({
  disconnectMock: vi.fn(),
  sweepMock: vi.fn(),
}));

vi.mock("../../infrastructure/db/client", () => ({
  prisma: { $disconnect: disconnectMock },
}));

vi.mock(
  "../../core/reservations/services/mercadoPagoHoldSweep.service",
  () => ({
    sweepLapsedMercadoPagoHolds: sweepMock,
  }),
);

import { forceMercadoPagoHoldSweep } from "./force-mp-hold-sweep";

beforeEach(() => {
  disconnectMock.mockReset();
  sweepMock.mockReset();
});

describe("forceMercadoPagoHoldSweep", () => {
  it("runs the sweep and always disconnects afterward", async () => {
    sweepMock.mockResolvedValue({ notified: 0, failed: 0 });

    await forceMercadoPagoHoldSweep();

    expect(sweepMock).toHaveBeenCalled();
    expect(disconnectMock).toHaveBeenCalled();
  });

  it("disconnects even when the sweep itself throws", async () => {
    sweepMock.mockRejectedValue(new Error("DB unreachable"));

    await expect(forceMercadoPagoHoldSweep()).rejects.toThrow("DB unreachable");
    expect(disconnectMock).toHaveBeenCalled();
  });
});
