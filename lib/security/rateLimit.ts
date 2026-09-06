import { NextResponse } from "next/server";
import { checkRateLimit } from "@vercel/firewall";

// Vercel Hobby allows exactly one WAF rate-limit rule per project (see
// docs/SECURITY.md) — "api-guard" is that rule's configured Rate Limit ID in
// the Vercel dashboard. Every protected route shares this single rule and
// gets its own effective budget by namespacing its rateLimitKey with a
// route-specific prefix, rather than needing a separate rule per route.
const RATE_LIMIT_ID = "api-guard";

export async function enforceRateLimit(
  request: Request,
  routeKey: string,
  identity: string,
): Promise<NextResponse | null> {
  const { rateLimited } = await checkRateLimit(RATE_LIMIT_ID, {
    request,
    rateLimitKey: `${routeKey}:${identity}`,
  });
  if (rateLimited) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  return null;
}
