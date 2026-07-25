"use server";

import { prisma } from "@/infrastructure/db/client";
import { checkPermission } from "@/core/permissions/utils";
import { requireOrgProfile } from "@/lib/auth/require-org-profile";
import type { ActionResult } from "@/core/billing/types";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from "date-fns";

export type ReportPeriod = "today" | "week" | "month" | "year";

export interface RevenueByMethod {
  method: string;
  amount: number;
}

export interface DailyRevenue {
  date: string;
  amount: number;
}

export interface ReportData {
  totalRevenue: number;
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  voidedInvoices: number;
  revenueByMethod: RevenueByMethod[];
  dailyRevenue: DailyRevenue[];
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  currency: string;
}

function getPeriodBounds(period: ReportPeriod): { start: Date; end: Date } {
  const now = new Date();
  switch (period) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "week":
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
      };
    case "month":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "year":
      return { start: startOfYear(now), end: endOfYear(now) };
  }
}

export async function getRevenueReport(
  period: ReportPeriod,
): Promise<ActionResult<ReportData>> {
  try {
    const profile = await requireOrgProfile();
    if (!checkPermission(profile.roleId, "billing.read")) {
      return { success: false, error: "Forbidden" };
    }

    const org = await prisma.organization.findUnique({
      where: { id: profile.organizationId },
      select: { currency: true },
    });
    const currency = org?.currency ?? "USD";

    const { start, end } = getPeriodBounds(period);
    const orgId = profile.organizationId;

    const [payments, invoiceCounts, appointmentCounts] = await Promise.all([
      prisma.payment.findMany({
        where: {
          organizationId: orgId,
          status: "COMPLETED",
          paidAt: { gte: start, lte: end },
        },
        select: { method: true, amount: true, paidAt: true },
      }),
      prisma.invoice.groupBy({
        by: ["status"],
        where: {
          organizationId: orgId,
          createdAt: { gte: start, lte: end },
        },
        _count: { _all: true },
      }),
      prisma.appointment.groupBy({
        by: ["status"],
        where: {
          organizationId: orgId,
          scheduledStart: { gte: start, lte: end },
        },
        _count: { _all: true },
      }),
    ]);

    // Total revenue from completed payments
    const totalRevenue =
      Math.round(payments.reduce((sum, p) => sum + p.amount, 0) * 100) / 100;

    // Revenue by payment method
    const methodMap: Record<string, number> = {};
    for (const p of payments) {
      methodMap[p.method] =
        Math.round(((methodMap[p.method] ?? 0) + p.amount) * 100) / 100;
    }
    const revenueByMethod: RevenueByMethod[] = Object.entries(methodMap).map(
      ([method, amount]) => ({ method, amount }),
    );

    // Daily / hourly revenue breakdown
    let dailyRevenue: DailyRevenue[];

    if (period === "today") {
      const hours: DailyRevenue[] = Array.from({ length: 24 }, (_, i) => ({
        date: `${String(i).padStart(2, "0")}:00`,
        amount: 0,
      }));
      for (const p of payments) {
        const hour = new Date(p.paidAt!).getUTCHours();
        hours[hour].amount =
          Math.round((hours[hour].amount + p.amount) * 100) / 100;
      }
      dailyRevenue = hours;
    } else {
      const dayMap: Record<string, number> = {};
      for (const p of payments) {
        const key = new Date(p.paidAt!).toISOString().slice(0, 10);
        dayMap[key] = Math.round(((dayMap[key] ?? 0) + p.amount) * 100) / 100;
      }

      const todayStr = new Date().toISOString().slice(0, 10);
      const startStr = new Date(start).toISOString().slice(0, 10);
      const endStr = new Date(end).toISOString().slice(0, 10);
      const cappedEnd = endStr > todayStr ? todayStr : endStr;

      const days: string[] = [];
      let cursor = new Date(startStr + "T12:00:00Z");
      const last = new Date(cappedEnd + "T12:00:00Z");
      while (cursor <= last) {
        days.push(cursor.toISOString().slice(0, 10));
        cursor = new Date(cursor.getTime() + 86_400_000);
      }

      dailyRevenue = days
        .map((dateStr) => ({
          date: dateStr,
          amount: dayMap[dateStr] ?? 0,
        }))
        .reverse();
    }

    // Invoice counts by status
    const getInvoiceCount = (status: string) =>
      invoiceCounts.find((c) => c.status === status)?._count._all ?? 0;

    const paidInvoices = getInvoiceCount("PAID");
    const pendingInvoices = getInvoiceCount("ISSUED");
    const voidedInvoices = getInvoiceCount("VOID");
    const draftInvoices = getInvoiceCount("DRAFT");
    const totalInvoices =
      paidInvoices + pendingInvoices + voidedInvoices + draftInvoices;

    // Appointment counts by status
    const getApptCount = (status: string) =>
      appointmentCounts.find((c) => c.status === status)?._count._all ?? 0;

    const completedAppointments = getApptCount("COMPLETED");
    const cancelledAppointments = getApptCount("CANCELLED");
    const noShowAppointments = getApptCount("NO_SHOW");
    const scheduledAppointments =
      getApptCount("SCHEDULED") + getApptCount("CONFIRMED");
    const totalAppointments =
      completedAppointments +
      cancelledAppointments +
      noShowAppointments +
      scheduledAppointments;

    return {
      success: true,
      data: {
        totalRevenue,
        totalInvoices,
        paidInvoices,
        pendingInvoices,
        voidedInvoices,
        revenueByMethod,
        dailyRevenue,
        totalAppointments,
        completedAppointments,
        cancelledAppointments,
        noShowAppointments,
        currency,
      },
    };
  } catch (error) {
    console.error("getRevenueReport error:", error);
    return { success: false, error: "Failed to fetch report data" };
  }
}
