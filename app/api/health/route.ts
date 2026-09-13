import { NextResponse } from "next/server";
import { prisma } from "@/infrastructure/db/client";

// Unauthenticated liveness/readiness endpoint for external uptime monitoring
// (see proxy.ts's public-route allowlist — Sentry's automaticVercelMonitors
// doesn't cover App Router route handlers, and this codebase otherwise has
// no third-party-reachable health signal at all). Deliberately minimal: a
// single lightweight DB round-trip, not a deep dependency check.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
