import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/auth/requireCronSecret";
import { logSystemJob } from "@/core/systemJobs/services/systemJobs.service";

// Vercel Cron only ever triggers against the Production deployment (see
// vercel.json) — this job runs there, but its whole purpose is to refresh
// the SEPARATE Neon "preview" branch (used by Preview deployments only)
// with a fresh copy of production data every night, so Preview never runs
// on stale or hand-tested data. Production's own database (the "main"
// branch below) is never written to by this job — only read as the
// restore source.
const NEON_PROJECT_ID = "muddy-frost-80748034";
const NEON_MAIN_BRANCH_ID = "br-proud-dream-af3s8vw7";
const NEON_PREVIEW_BRANCH_ID = "br-weathered-dawn-afw089c0";

export async function GET(request: Request) {
  const unauthorized = await requireCronSecret(request, "reset-preview-db");
  if (unauthorized) return unauthorized;

  const startedAt = new Date();
  try {
    const res = await fetch(
      `https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/branches/${NEON_PREVIEW_BRANCH_ID}/restore`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NEON_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ source_branch_id: NEON_MAIN_BRANCH_ID }),
      },
    );

    if (!res.ok) {
      throw new Error(
        `Neon restore-branch request failed: ${res.status} ${await res.text()}`,
      );
    }

    await logSystemJob({
      kind: "CRON",
      name: "reset-preview-db",
      status: "SUCCESS",
      startedAt,
      finishedAt: new Date(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    await logSystemJob({
      kind: "CRON",
      name: "reset-preview-db",
      status: "FAILURE",
      startedAt,
      finishedAt: new Date(),
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
