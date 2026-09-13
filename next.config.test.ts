import { describe, it, expect } from "vitest";
import { SECURITY_HEADERS } from "./next.config";

function getHeader(key: string): string | undefined {
  return SECURITY_HEADERS.find((h) => h.key === key)?.value;
}

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
