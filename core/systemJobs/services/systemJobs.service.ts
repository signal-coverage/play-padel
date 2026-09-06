import { prisma } from "@/infrastructure/db/client";
import { KNOWN_SYSTEM_JOBS } from "../consts";
import { notifyAllAdmins } from "@/lib/notifications/dispatcher";
import type {
  LogSystemJobParams,
  SystemJobKind,
  SystemJobLogRecord,
} from "../types";

/**
 * Unlike logAudit (core/audit/services/audit.service.ts), which is
 * deliberately fire-and-forget, a lost job-status record here defeats the
 * entire point of this feature — an audit trail has other redundancy, a
 * cron/webhook health record does not. Callers `await` this directly; any
 * write failure is swallowed and logged to console rather than thrown, so a
 * broken observability write can never itself break the caller's own
 * success/failure response.
 */
export async function logSystemJob(params: LogSystemJobParams): Promise<void> {
  try {
    await prisma.systemJobLog.create({
      data: {
        kind: params.kind,
        name: params.name,
        status: params.status,
        startedAt: params.startedAt,
        finishedAt: params.finishedAt,
        errorMessage: params.errorMessage ?? null,
      },
    });
  } catch (err) {
    console.error("[systemJobs] Failed to record job log:", err);
  }

  if (params.status === "FAILURE") {
    try {
      await notifyAllAdmins({
        type: "SYSTEM_JOB_FAILED",
        clubId: null,
        subject: "A background job failed",
        html: `Job ${params.kind}/${params.name} failed: ${params.errorMessage ?? "unknown error"}.`,
        sendEmail: false,
      });
    } catch (err) {
      console.error(
        "[systemJobs] Failed to notify admins of job failure:",
        err,
      );
    }
  }
}

export async function listRecentSystemJobs(
  kind?: SystemJobKind,
  name?: string,
  limit = 50,
): Promise<SystemJobLogRecord[]> {
  return prisma.systemJobLog.findMany({
    where: {
      ...(kind && { kind }),
      ...(name && { name }),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * For each of the small, hardcoded set of known job names (see
 * ../consts's KNOWN_SYSTEM_JOBS), returns its single most recent
 * SystemJobLog row, or `null` if that job has never logged a run yet.
 * Backs the admin System Status page's "at a glance" summary.
 */
export async function getLatestStatusPerJob(): Promise<
  Record<string, SystemJobLogRecord | null>
> {
  const entries = await Promise.all(
    KNOWN_SYSTEM_JOBS.map(async ({ kind, name }) => {
      const latest = await prisma.systemJobLog.findFirst({
        where: { kind, name },
        orderBy: { createdAt: "desc" },
      });
      return [name, latest ?? null] as const;
    }),
  );

  return Object.fromEntries(entries);
}
