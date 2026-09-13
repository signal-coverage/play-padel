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
import {
  getPlatformMercadoPagoClient,
  PLATFORM_CLIENT_MAX_RETRIES,
  PLATFORM_CLIENT_TIMEOUT_MS,
} from "./platformClient";

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
      options: {
        timeout: PLATFORM_CLIENT_TIMEOUT_MS,
        maxRetries: PLATFORM_CLIENT_MAX_RETRIES,
      },
    });
  });

  it("builds a fresh client from whatever the env var currently holds, never a club-scoped token", () => {
    vi.stubEnv("MERCADOPAGO_ACCESS_TOKEN", "another-platform-token-xyz");

    getPlatformMercadoPagoClient();

    expect(configConstructorMock).toHaveBeenCalledWith({
      accessToken: "another-platform-token-xyz",
      options: {
        timeout: PLATFORM_CLIENT_TIMEOUT_MS,
        maxRetries: PLATFORM_CLIENT_MAX_RETRIES,
      },
    });
    expect(configConstructorMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: "platform-access-token-abc" }),
    );
  });

  it("bounds the request timeout and retry count well below the SDK's 60s/3-retry defaults, so an MP outage can't hang an interactive request", () => {
    vi.stubEnv("MERCADOPAGO_ACCESS_TOKEN", "platform-access-token-abc");

    getPlatformMercadoPagoClient();

    const [[config]] = configConstructorMock.mock.calls;
    expect(config.options.timeout).toBeLessThanOrEqual(10000);
    expect(config.options.maxRetries).toBeLessThanOrEqual(2);
  });
});
