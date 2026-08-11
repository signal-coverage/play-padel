import { format } from "date-fns";
import { StatusBox } from "@/components/StatusBox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getActionLabel } from "../../utils";
import type { AuditLogsTableProps } from "./types";

export function AuditLogsTable({ logs, isLoading }: AuditLogsTableProps) {
  if (isLoading) {
    return <StatusBox>Loading audit log…</StatusBox>;
  }

  if (logs.length === 0) {
    return <StatusBox>No audit log entries match these filters.</StatusBox>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Entity</TableHead>
            <TableHead>By</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {format(log.timestamp, "MMM d, HH:mm")}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{getActionLabel(log.action)}</Badge>
              </TableCell>
              <TableCell>{log.entity}</TableCell>
              <TableCell>{log.userDisplayName}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
