import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    clubBankTransferAccount: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { prisma } from "@/infrastructure/db/client";
import {
  getClubBankTransferAccount,
  setClubBankTransferAccount,
} from "./bankTransferAccount.service";

const findUniqueMock = prisma.clubBankTransferAccount.findUnique as ReturnType<
  typeof vi.fn
>;
const upsertMock = prisma.clubBankTransferAccount.upsert as ReturnType<
  typeof vi.fn
>;

const ROW = {
  id: "cbta_1",
  clubId: "club_1",
  bankName: "Banco Nación",
  cbu: "0000000000000000000000",
  alias: "club.padel.mp",
  accountHolderName: "Club Padel Norte SA",
  createdAt: new Date(),
  updatedAt: new Date(),
  updatedBy: "user_1",
};

beforeEach(() => {
  findUniqueMock.mockReset();
  upsertMock.mockReset();
});

describe("getClubBankTransferAccount", () => {
  it("returns null when the club has no bank transfer account on file", async () => {
    findUniqueMock.mockResolvedValue(null);

    const result = await getClubBankTransferAccount("club_1");

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { clubId: "club_1" },
    });
    expect(result).toBeNull();
  });

  it("returns the club's bank transfer account row when one exists", async () => {
    findUniqueMock.mockResolvedValue(ROW);

    const result = await getClubBankTransferAccount("club_1");

    expect(result).toEqual(ROW);
  });
});

describe("setClubBankTransferAccount", () => {
  const input = {
    bankName: "Banco Nación",
    cbu: "0000000000000000000000",
    alias: "club.padel.mp",
    accountHolderName: "Club Padel Norte SA",
  };

  it("upserts a fresh row for a club with no existing account", async () => {
    upsertMock.mockResolvedValue({ ...ROW, ...input });

    const result = await setClubBankTransferAccount("club_1", input, "user_1");

    expect(upsertMock).toHaveBeenCalledWith({
      where: { clubId: "club_1" },
      create: { clubId: "club_1", ...input, updatedBy: "user_1" },
      update: { ...input, updatedBy: "user_1" },
    });
    expect(result).toEqual({ ...ROW, ...input });
  });

  it("upserts to update an existing club's account", async () => {
    const updatedInput = { ...input, bankName: "Banco Galicia" };
    upsertMock.mockResolvedValue({ ...ROW, ...updatedInput });

    const result = await setClubBankTransferAccount(
      "club_1",
      updatedInput,
      "user_2",
    );

    expect(upsertMock).toHaveBeenCalledWith({
      where: { clubId: "club_1" },
      create: { clubId: "club_1", ...updatedInput, updatedBy: "user_2" },
      update: { ...updatedInput, updatedBy: "user_2" },
    });
    expect(result).toEqual({ ...ROW, ...updatedInput });
  });
});
