import { describe, it, expect, vi, beforeEach } from "vitest";

const { disconnectMock, setClubStatusMock } = vi.hoisted(() => ({
  disconnectMock: vi.fn(),
  setClubStatusMock: vi.fn(),
}));

vi.mock("../../infrastructure/db/client", () => ({
  prisma: { $disconnect: disconnectMock },
}));

vi.mock("../../core/clubs/services/clubs.service", () => ({
  setClubStatus: setClubStatusMock,
}));

import { setClubStatusForClub } from "./set-club-status";

beforeEach(() => {
  disconnectMock.mockReset();
  setClubStatusMock.mockReset();
});

describe("setClubStatusForClub", () => {
  it("sets the status via setClubStatus with a system actor, and always disconnects", async () => {
    setClubStatusMock.mockResolvedValue({
      id: "club_1",
      status: "SUSPENDED",
    });

    await setClubStatusForClub("club_1", "Alpha Club", "SUSPENDED");

    expect(setClubStatusMock).toHaveBeenCalledWith(
      "club_1",
      "SUSPENDED",
      expect.stringContaining("system:"),
    );
    expect(disconnectMock).toHaveBeenCalled();
  });

  it("reports not-found without throwing when the club doesn't exist", async () => {
    setClubStatusMock.mockResolvedValue(null);

    await expect(
      setClubStatusForClub("club_missing", "Alpha Club", "SUSPENDED"),
    ).resolves.not.toThrow();
    expect(disconnectMock).toHaveBeenCalled();
  });

  it("disconnects even when setClubStatus throws", async () => {
    setClubStatusMock.mockRejectedValue(new Error("DB unreachable"));

    await expect(
      setClubStatusForClub("club_1", "Alpha Club", "SUSPENDED"),
    ).rejects.toThrow("DB unreachable");
    expect(disconnectMock).toHaveBeenCalled();
  });
});
