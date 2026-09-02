import { describe, it, expect, vi, afterEach } from "vitest";

const configConstructorMock = vi.fn();

vi.mock("mercadopago", () => ({
  MercadoPagoConfig: vi.fn().mockImplementation(function (
    this: unknown,
    config: unknown,
  ) {
    configConstructorMock(config);
    Object.assign(this as object, config as object);
  }),
}));

import { MercadoPagoConfig } from "mercadopago";
import { getPlatformMercadoPagoClient } from "./platformClient";

afterEach(() => {
  vi.unstubAllEnvs();
  configConstructorMock.mockReset();
});

describe("getPlatformMercadoPagoClient", () => {
  it("throws a clear error when MERCADOPAGO_ACCESS_TOKEN is not set", () => {
    vi.stubEnv("MERCADOPAGO_ACCESS_TOKEN", "");

    expect(() => getPlatformMercadoPagoClient()).toThrow(
      "MERCADOPAGO_ACCESS_TOKEN is not set",
    );
  });

  it("builds a MercadoPagoConfig directly from MERCADOPAGO_ACCESS_TOKEN", () => {
    vi.stubEnv("MERCADOPAGO_ACCESS_TOKEN", "platform-access-token-abc");

    const client = getPlatformMercadoPagoClient();

    expect(client).toBeInstanceOf(MercadoPagoConfig);
    expect(configConstructorMock).toHaveBeenCalledWith({
      accessToken: "platform-access-token-abc",
    });
  });

  it("builds a fresh client from whatever the env var currently holds, never a club-scoped token", () => {
    vi.stubEnv("MERCADOPAGO_ACCESS_TOKEN", "another-platform-token-xyz");

    getPlatformMercadoPagoClient();

    expect(configConstructorMock).toHaveBeenCalledWith({
      accessToken: "another-platform-token-xyz",
    });
    expect(configConstructorMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: "platform-access-token-abc" }),
    );
  });
});
