"use client";

import { PencilIcon, UserXIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfessionalStatusBadge } from "@/app/dashboard/professionals/_components/ProfessionalStatusBadge";
import { usePermission } from "@/core/permissions/hooks/use-permission";
import { PROFESSIONAL_TABLE_COLUMNS } from "./consts";
import type { ProfessionalTableProps } from "./types";

export function ProfessionalTable({
  professionals,
  onEdit,
  onDeactivate,
  isLoading,
}: ProfessionalTableProps) {
  const { hasPermission } = usePermission();
  const canUpdate = hasPermission("professionals.update");
  const canDelete = hasPermission("professionals.delete");

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {PROFESSIONAL_TABLE_COLUMNS.map((col) => (
            <TableHead key={col.key}>{col.label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              {PROFESSIONAL_TABLE_COLUMNS.map((col) => (
                <TableCell key={col.key}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : professionals.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={PROFESSIONAL_TABLE_COLUMNS.length}
              className="h-24 text-center text-muted-foreground"
            >
              No professionals found.
            </TableCell>
          </TableRow>
        ) : (
          professionals.map((professional) => (
            <TableRow key={professional.id}>
              <TableCell className="font-medium">
                {professional.displayName}
              </TableCell>
              <TableCell>
                {professional.specialties.length > 0
                  ? professional.specialties.join(", ")
                  : "—"}
              </TableCell>
              <TableCell>{professional.license ?? "—"}</TableCell>
              <TableCell>{professional.phone ?? "—"}</TableCell>
              <TableCell>
                <ProfessionalStatusBadge active={professional.active} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {canUpdate && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onEdit(professional.id)}
                      aria-label="Edit professional"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                  )}
                  {canDelete && professional.active && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onDeactivate(professional.id)}
                      aria-label="Deactivate professional"
                    >
                      <UserXIcon className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
