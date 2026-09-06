import { NextResponse } from "next/server";
import { requireAdminProfile } from "@/lib/auth/adminProfile";
import {
  listRecentSystemJobs,
  getLatestStatusPerJob,
} from "@/core/systemJobs/services/systemJobs.service";

// Backs the admin-only System Status page (see
// app/dashboard/admin-status/page.tsx) — the "at a glance" summary (latest
// row per known cron/webhook job, or null if it's never run) plus the
// recent-activity feed across every job, newest first.
export async function GET() {
  const authResult = await requireAdminProfile();
  if (!authResult.ok) return authResult.response;

  const [summary, recent] = await Promise.all([
    getLatestStatusPerJob(),
    listRecentSystemJobs(),
  ]);

  return NextResponse.json({ summary, recent });
}
