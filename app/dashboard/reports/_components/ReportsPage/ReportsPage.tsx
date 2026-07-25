"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  TrendingUp,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Calendar,
  CalendarCheck,
  CalendarX,
  UserX,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getRevenueReport } from "@/app/actions/reports";
import { formatCurrency } from "@/lib/utils/currency";
import { PERIOD_TABS } from "./types";
import type { ReportPeriod, ReportData } from "./types";

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-32 mb-1" />
        <Skeleton className="h-3 w-16" />
      </CardContent>
    </Card>
  );
}

function ReportContent({
  data,
  period,
}: {
  data: ReportData;
  period: ReportPeriod;
}) {
  const currency = data.currency;

  return (
    <div className="space-y-6">
      {/* Revenue summary */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Revenue</h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            icon={TrendingUp}
            label="Total Revenue"
            value={formatCurrency(data.totalRevenue, currency)}
            sub="from completed payments"
          />
          <StatCard
            icon={FileText}
            label="Total Invoices"
            value={String(data.totalInvoices)}
            sub="created in period"
          />
          <StatCard
            icon={CheckCircle2}
            label="Paid"
            value={String(data.paidInvoices)}
            sub="invoices"
          />
          <StatCard
            icon={Clock}
            label="Pending"
            value={String(data.pendingInvoices)}
            sub="invoices"
          />
          <StatCard
            icon={XCircle}
            label="Voided"
            value={String(data.voidedInvoices)}
            sub="invoices"
          />
        </div>
      </section>

      {/* Revenue by payment method */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Revenue by Payment Method</h2>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.revenueByMethod.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="text-center text-muted-foreground py-6"
                  >
                    No payment data for this period
                  </TableCell>
                </TableRow>
              ) : (
                data.revenueByMethod
                  .sort((a, b) => b.amount - a.amount)
                  .map((row) => (
                    <TableRow key={row.method}>
                      <TableCell className="font-medium">
                        {row.method}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(row.amount, currency)}
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </Card>
      </section>

      {/* Daily / hourly revenue */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">
          {period === "today" ? "Hourly Revenue" : "Daily Revenue"}
        </h2>
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{period === "today" ? "Hour" : "Date"}</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.dailyRevenue.filter((r) => r.amount > 0).length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      className="text-center text-muted-foreground py-6"
                    >
                      No revenue data for this period
                    </TableCell>
                  </TableRow>
                ) : (
                  data.dailyRevenue
                    .filter((r) => r.amount > 0)
                    .map((row) => (
                      <TableRow key={row.date}>
                        <TableCell>{row.date}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(row.amount, currency)}
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </section>

      {/* Appointment summary */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Appointments</h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Calendar}
            label="Total Appointments"
            value={String(data.totalAppointments)}
            sub="in period"
          />
          <StatCard
            icon={CalendarCheck}
            label="Completed"
            value={String(data.completedAppointments)}
            sub="appointments"
          />
          <StatCard
            icon={CalendarX}
            label="Cancelled"
            value={String(data.cancelledAppointments)}
            sub="appointments"
          />
          <StatCard
            icon={UserX}
            label="No-Show"
            value={String(data.noShowAppointments)}
            sub="appointments"
          />
        </div>
      </section>
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <Skeleton className="h-5 w-20" />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <Skeleton className="h-5 w-48" />
        <Card>
          <div className="p-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </Card>
      </section>

      <section className="space-y-3">
        <Skeleton className="h-5 w-36" />
        <Card>
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </Card>
      </section>

      <section className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      </section>
    </div>
  );
}

export function ReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>("month");

  const { data, isFetching } = useQuery({
    queryKey: ["reports", period],
    queryFn: () => getRevenueReport(period),
    placeholderData: (prev) => prev,
  });

  const report = data?.success ? data.data : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Revenue and appointment analytics
          </p>
        </div>

        <Tabs
          value={period}
          onValueChange={(v) => setPeriod(v as ReportPeriod)}
        >
          <TabsList>
            {PERIOD_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {isFetching && !report ? (
        <ReportSkeleton />
      ) : report ? (
        <ReportContent data={report} period={period} />
      ) : (
        <p className="text-muted-foreground">
          {data?.success === false ? data.error : "No data available"}
        </p>
      )}

      {isFetching && report && (
        <div className="fixed bottom-4 right-4 text-xs text-muted-foreground bg-background border rounded-md px-3 py-1.5 shadow-sm">
          Refreshing…
        </div>
      )}
    </div>
  );
}
