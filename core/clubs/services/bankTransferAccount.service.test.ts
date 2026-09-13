import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    clubBankTransferAccount: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { prisma } from "@/infrastructure/db/client";
import {
  getClubBankTransferAccount,
  getClubBankTransferAccountsByClubIds,
  setClubBankTransferAccount,
} from "./bankTransferAccount.service";

const findUniqueMock = prisma.clubBankTransferAccount.findUnique as ReturnType<
  typeof vi.fn
>;
const findManyMock = prisma.clubBankTransferAccount.findMany as ReturnType<
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
  findManyMock.mockReset();
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

describe("getClubBankTransferAccountsByClubIds", () => {
  it("returns an empty map without querying when given no club ids", async () => {
    const result = await getClubBankTransferAccountsByClubIds([]);

    expect(findManyMock).not.toHaveBeenCalled();
    expect(result).toEqual(new Map());
  });

  it("fetches every requested club's account via ONE batched findMany query, regardless of how many club ids are given", async () => {
    findManyMock.mockResolvedValue([
      { ...ROW, clubId: "club_1" },
      { ...ROW, clubId: "club_3", bankName: "Banco Galicia" },
    ]);

    const result = await getClubBankTransferAccountsByClubIds([
      "club_1",
      "club_2",
      "club_3",
    ]);

    expect(findManyMock).toHaveBeenCalledTimes(1);
    expect(findManyMock).toHaveBeenCalledWith({
      where: { clubId: { in: ["club_1", "club_2", "club_3"] } },
    });
    expect(result.get("club_1")).toEqual({ ...ROW, clubId: "club_1" });
    expect(result.get("club_3")?.bankName).toBe("Banco Galicia");
    expect(result.has("club_2")).toBe(false);
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
