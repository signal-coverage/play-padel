import { describe, it, expect, vi, afterEach } from "vitest";
import { SECURITY_HEADERS } from "./next.config";

function getHeader(key: string): string | undefined {
  return SECURITY_HEADERS.find((h) => h.key === key)?.value;
}

// CONTENT_SECURITY_POLICY reads process.env.NODE_ENV at module-load time
// (see next.config.ts's IS_DEV), so exercising both branches needs a fresh
// module instance per NODE_ENV value rather than reading the
// already-imported SECURITY_HEADERS above.
async function loadCspForEnv(nodeEnv: string): Promise<string> {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", nodeEnv);
  const { SECURITY_HEADERS: headers } = await import("./next.config");
  return headers.find((h) => h.key === "Content-Security-Policy")!.value;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("SECURITY_HEADERS", () => {
  it("sets a Content-Security-Policy with no wildcard default-src", () => {
    const csp = getHeader("Content-Security-Policy");
    expect(csp).toBeDefined();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'self'");
  });

  it("allow-lists Clerk and the Mercado Pago card Brick in the CSP", () => {
    const csp = getHeader("Content-Security-Policy")!;
    expect(csp).toMatch(/clerk\.accounts\.dev/);
    expect(csp).toContain("sdk.mercadopago.com");
  });

  it("allow-lists Amplitude's Session Replay remote-config and event-upload hosts — separate from the plain api2.amplitude.com ingestion host", () => {
    const csp = getHeader("Content-Security-Policy")!;
    expect(csp).toContain("api2.amplitude.com");
    expect(csp).toContain("sr-client-cfg.amplitude.com");
    expect(csp).toContain("api-sr.amplitude.com");
  });

  it("allows Session Replay's blob: Web Worker via worker-src", () => {
    const csp = getHeader("Content-Security-Policy")!;
    expect(csp).toContain("worker-src 'self' blob:");
  });

  it("never allows 'unsafe-eval' in a production CSP — React's production build never calls eval(), so this stays a real restriction, not just a dev convenience", async () => {
    const csp = await loadCspForEnv("production");
    expect(csp).not.toContain("unsafe-eval");
  });

  it("allows 'unsafe-eval' only in non-production, since React's dev build needs it for debugging features (component stack reconstruction, etc.)", async () => {
    const csp = await loadCspForEnv("development");
    expect(csp).toContain("'unsafe-eval'");
  });

  it("denies framing via X-Frame-Options", () => {
    expect(getHeader("X-Frame-Options")).toBe("SAMEORIGIN");
  });

  it("enables HSTS with a long max-age and includeSubDomains", () => {
    const hsts = getHeader("Strict-Transport-Security");
    expect(hsts).toMatch(/max-age=\d{7,}/);
    expect(hsts).toContain("includeSubDomains");
  });

  it("disables sniffing via X-Content-Type-Options", () => {
    expect(getHeader("X-Content-Type-Options")).toBe("nosniff");
  });

  it("restricts unused browser permissions", () => {
    const permissions = getHeader("Permissions-Policy")!;
    expect(permissions).toContain("camera=()");
    expect(permissions).toContain("microphone=()");
    expect(permissions).toContain("geolocation=()");
  });
});
