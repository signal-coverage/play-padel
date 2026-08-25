import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("../../_lib/require-owner", () => ({
  requireOwnerClub: vi.fn(),
}));

vi.mock("@/lib/mercadopago/oauth", () => ({
  signOAuthState: vi.fn(),
  buildMercadoPagoAuthorizationUrl: vi.fn(),
}));

vi.mock("@/lib/mercadopago/membershipStatus", () => ({
  requireMembershipPaid: vi.fn(),
}));

import { requireOwnerClub } from "../../_lib/require-owner";
import {
  signOAuthState,
  buildMercadoPagoAuthorizationUrl,
} from "@/lib/mercadopago/oauth";
import { requireMembershipPaid } from "@/lib/mercadopago/membershipStatus";
import { GET } from "./route";

const requireOwnerClubMock = requireOwnerClub as ReturnType<typeof vi.fn>;
const signOAuthStateMock = signOAuthState as ReturnType<typeof vi.fn>;
const buildMercadoPagoAuthorizationUrlMock =
  buildMercadoPagoAuthorizationUrl as ReturnType<typeof vi.fn>;
const requireMembershipPaidMock = requireMembershipPaid as ReturnType<
  typeof vi.fn
>;

describe("GET /api/clubs/mercadopago/connect", () => {
  beforeEach(() => {
    requireOwnerClubMock.mockReset();
    signOAuthStateMock.mockReset();
    buildMercadoPagoAuthorizationUrlMock.mockReset();
    requireMembershipPaidMock.mockReset();
  });

  it("redirects to the Mercado Pago authorization URL built from a signed state for the caller's club when membership is paid", async () => {
    requireOwnerClubMock.mockResolvedValue({
      ok: true,
      context: { userId: "user_1", clubId: "club_1" },
    });
    requireMembershipPaidMock.mockResolvedValue({
      ok: true,
      status: "ACTIVE",
    });
    signOAuthStateMock.mockReturnValue("signed-state-for-club_1");
    buildMercadoPagoAuthorizationUrlMock.mockReturnValue(
      "https://auth.mercadopago.com/authorization?client_id=abc&state=signed-state-for-club_1",
    );

    const response = await GET();

    expect(requireMembershipPaidMock).toHaveBeenCalledWith("club_1");
    expect(signOAuthStateMock).toHaveBeenCalledWith("club_1");
    expect(buildMercadoPagoAuthorizationUrlMock).toHaveBeenCalledWith(
      "signed-state-for-club_1",
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://auth.mercadopago.com/authorization?client_id=abc&state=signed-state-for-club_1",
    );
  });

  it("returns the auth failure response as-is when the caller is not an owner, without checking membership", async () => {
    const forbidden = NextResponse.json(
      { error: "Forbidden" },
      { status: 403 },
    );
    requireOwnerClubMock.mockResolvedValue({ ok: false, response: forbidden });

    const response = await GET();

    expect(response).toBe(forbidden);
    expect(requireMembershipPaidMock).not.toHaveBeenCalled();
    expect(signOAuthStateMock).not.toHaveBeenCalled();
    expect(buildMercadoPagoAuthorizationUrlMock).not.toHaveBeenCalled();
  });

  it("blocks with membership_not_paid and does not redirect when membership isn't paid", async () => {
    requireOwnerClubMock.mockResolvedValue({
      ok: true,
      context: { userId: "user_1", clubId: "club_1" },
    });
    requireMembershipPaidMock.mockResolvedValue({
      ok: false,
      status: "PENDING",
    });

    const response = await GET();

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "membership_not_paid" });
    expect(signOAuthStateMock).not.toHaveBeenCalled();
    expect(buildMercadoPagoAuthorizationUrlMock).not.toHaveBeenCalled();
  });
});
