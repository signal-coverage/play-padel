"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAuditLogs } from "@/app/actions/audit";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ACTION_FILTER_OPTIONS, AUDIT_ACTION_LABELS, ENTITY_FILTER_OPTIONS } from "./consts";

const PAGE_SIZE = 20;

function formatTimestamp(date: Date | string) {
  return new Date(date).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncateId(id: string) {
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}…`;
}

export function AuditPage() {
  const [entityFilter, setEntityFilter] = useState<string>("__all__");
  const [actionFilter, setActionFilter] = useState<string>("__all__");
  const [page, setPage] = useState(1);

  const filters = {
    entity: entityFilter === "__all__" ? undefined : entityFilter,
    action: actionFilter === "__all__" ? undefined : actionFilter,
    page,
    pageSize: PAGE_SIZE,
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["audit", filters],
    queryFn: () => getAuditLogs(filters),
  });

  const logs = data?.success ? data.data.logs : [];
  const total = data?.success ? data.data.total : 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function handleEntityChange(value: string) {
    setEntityFilter(value);
    setPage(1);
  }

  function handleActionChange(value: string) {
    setActionFilter(value);
    setPage(1);
  }

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">Audit Log</h1>

      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">
            Entity
          </Label>
          <Select value={entityFilter} onValueChange={handleEntityChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All entities" />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">
            Action
          </Label>
          <Select value={actionFilter} onValueChange={handleActionChange}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              {ACTION_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isError && (
        <p className="text-muted-foreground text-sm">
          Failed to load audit logs.
        </p>
      )}

      {!isError && (
        <>
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-40">Timestamp</TableHead>
                  <TableHead className="min-w-36">User</TableHead>
                  <TableHead className="min-w-44">Action</TableHead>
                  <TableHead className="min-w-28">Entity</TableHead>
                  <TableHead className="min-w-28">Entity ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-36" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20 font-mono" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-8 text-center text-muted-foreground text-sm"
                    >
                      No audit log entries found.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatTimestamp(log.timestamp)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.userDisplayName || log.userId}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {AUDIT_ACTION_LABELS[log.action] ?? log.action}
                      </TableCell>
                      <TableCell className="text-sm capitalize">
                        {log.entity}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">
                        {truncateId(log.entityId)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {!isLoading && totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {page} of {totalPages} ({total} total)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
