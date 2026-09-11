import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../_lib/require-owner", () => ({
  requireOwnerClub: vi.fn(),
}));

vi.mock("@/core/clubs/services/bankTransferAccount.service", () => ({
  getClubBankTransferAccount: vi.fn(),
  setClubBankTransferAccount: vi.fn(),
}));

vi.mock("@/core/clubs/services/clubs.service", () => ({
  notifyClubOperationalIfNeeded: vi.fn(),
}));

import { requireOwnerClub } from "../_lib/require-owner";
import {
  getClubBankTransferAccount,
  setClubBankTransferAccount,
} from "@/core/clubs/services/bankTransferAccount.service";
import { notifyClubOperationalIfNeeded } from "@/core/clubs/services/clubs.service";
import { GET, PUT } from "./route";

const requireOwnerClubMock = requireOwnerClub as ReturnType<typeof vi.fn>;
const getClubBankTransferAccountMock = getClubBankTransferAccount as ReturnType<
  typeof vi.fn
>;
const setClubBankTransferAccountMock = setClubBankTransferAccount as ReturnType<
  typeof vi.fn
>;
const notifyClubOperationalIfNeededMock =
  notifyClubOperationalIfNeeded as ReturnType<typeof vi.fn>;

function putRequest(body: unknown) {
  return new Request("http://localhost/api/clubs/bank-transfer-account", {
    method: "PUT",
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof PUT>[0];
}

beforeEach(() => {
  requireOwnerClubMock.mockReset();
  getClubBankTransferAccountMock.mockReset();
  setClubBankTransferAccountMock.mockReset();
  notifyClubOperationalIfNeededMock.mockReset();
  notifyClubOperationalIfNeededMock.mockResolvedValue(undefined);
});

describe("GET /api/clubs/bank-transfer-account", () => {
  it("returns the owner's response when not an owner", async () => {
    const unauthorized = {
      ok: false,
      response: new Response(null, { status: 401 }),
    };
    requireOwnerClubMock.mockResolvedValue(unauthorized);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(getClubBankTransferAccountMock).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-owner", async () => {
    const forbidden = {
      ok: false,
      response: new Response(null, { status: 403 }),
    };
    requireOwnerClubMock.mockResolvedValue(forbidden);

    const response = await GET();

    expect(response.status).toBe(403);
    expect(getClubBankTransferAccountMock).not.toHaveBeenCalled();
  });

  it("returns { account: null } when the club has no account on file", async () => {
    requireOwnerClubMock.mockResolvedValue({
      ok: true,
      context: { userId: "user_1", clubId: "club_1" },
    });
    getClubBankTransferAccountMock.mockResolvedValue(null);

    const response = await GET();
    const body = await response.json();

    expect(getClubBankTransferAccountMock).toHaveBeenCalledWith("club_1");
    expect(response.status).toBe(200);
    expect(body).toEqual({ account: null });
  });

  it("returns 200 with the caller's own club's account when one exists", async () => {
    requireOwnerClubMock.mockResolvedValue({
      ok: true,
      context: { userId: "user_1", clubId: "club_1" },
    });
    const account = {
      id: "cbta_1",
      clubId: "club_1",
      bankName: "Banco Nación",
      cbu: "0000000000000000000000",
      alias: "club.padel.mp",
      accountHolderName: "Club Padel Norte SA",
      updatedBy: "user_1",
    };
    getClubBankTransferAccountMock.mockResolvedValue(account);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ account });
  });
});

describe("PUT /api/clubs/bank-transfer-account", () => {
  it("returns the owner's response when not an owner", async () => {
    const unauthorized = {
      ok: false,
      response: new Response(null, { status: 401 }),
    };
    requireOwnerClubMock.mockResolvedValue(unauthorized);

    const response = await PUT(
      putRequest({ bankName: "Banco Nación", cbu: "0000000000000000000000" }),
    );

    expect(response.status).toBe(401);
    expect(setClubBankTransferAccountMock).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-owner", async () => {
    const forbidden = {
      ok: false,
      response: new Response(null, { status: 403 }),
    };
    requireOwnerClubMock.mockResolvedValue(forbidden);

    const response = await PUT(
      putRequest({ bankName: "Banco Nación", cbu: "0000000000000000000000" }),
    );

    expect(response.status).toBe(403);
    expect(setClubBankTransferAccountMock).not.toHaveBeenCalled();
  });

  it("returns 400 when the CBU is not exactly 22 digits", async () => {
    requireOwnerClubMock.mockResolvedValue({
      ok: true,
      context: { userId: "user_1", clubId: "club_1" },
    });

    const response = await PUT(
      putRequest({ bankName: "Banco Nación", cbu: "123" }),
    );

    expect(response.status).toBe(400);
    expect(setClubBankTransferAccountMock).not.toHaveBeenCalled();
  });

  it("returns 400 when bankName is missing", async () => {
    requireOwnerClubMock.mockResolvedValue({
      ok: true,
      context: { userId: "user_1", clubId: "club_1" },
    });

    const response = await PUT(putRequest({ cbu: "0000000000000000000000" }));

    expect(response.status).toBe(400);
    expect(setClubBankTransferAccountMock).not.toHaveBeenCalled();
  });

  it("upserts and returns the account on a valid body, using the authenticated owner's own user id as updatedBy", async () => {
    requireOwnerClubMock.mockResolvedValue({
      ok: true,
      context: { userId: "user_1", clubId: "club_1" },
    });
    const input = {
      bankName: "Banco Nación",
      cbu: "0000000000000000000000",
      alias: "club.padel.mp",
      accountHolderName: "Club Padel Norte SA",
    };
    const account = {
      id: "cbta_1",
      clubId: "club_1",
      ...input,
      updatedBy: "user_1",
    };
    setClubBankTransferAccountMock.mockResolvedValue(account);

    const response = await PUT(putRequest(input));
    const body = await response.json();

    expect(setClubBankTransferAccountMock).toHaveBeenCalledWith(
      "club_1",
      input,
      "user_1",
    );
    expect(response.status).toBe(200);
    expect(body).toEqual({ account });
    expect(notifyClubOperationalIfNeededMock).toHaveBeenCalledWith("club_1");
  });

  it("does not notify when the request is rejected before setting the account (400)", async () => {
    requireOwnerClubMock.mockResolvedValue({
      ok: true,
      context: { userId: "user_1", clubId: "club_1" },
    });

    await PUT(putRequest({ bankName: "Banco Nación", cbu: "123" }));

    expect(notifyClubOperationalIfNeededMock).not.toHaveBeenCalled();
  });
});
