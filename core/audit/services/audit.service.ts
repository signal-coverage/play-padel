import { prisma } from "@/infrastructure/db/client";
import { Prisma } from "@/lib/generated/prisma/client";
import type { AuditAction, AuditFilters } from "../types";

export async function logAudit(params: {
  clubId: string;
  userId: string;
  userDisplayName: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}) {
  // Fire-and-forget: audit failures must never break the main operation
  prisma.auditLog
    .create({
      data: {
        ...params,
        metadata: params.metadata
          ? (params.metadata as unknown as Prisma.InputJsonValue)
          : undefined,
      },
    })
    .catch(() => null);
}

export async function listAuditLogs(clubId: string, filters: AuditFilters) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const skip = (page - 1) * pageSize;

  const where = {
    clubId,
    ...(filters.entity && { entity: filters.entity }),
    ...(filters.action && { action: filters.action }),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
}
