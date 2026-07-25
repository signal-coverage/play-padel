"use client";

import { EyeIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { PatientStatusBadge } from "@/app/dashboard/patients/_components/PatientStatusBadge";
import { usePermission } from "@/core/permissions/hooks/use-permission";
import { PATIENT_TABLE_COLUMNS } from "./consts";
import type { PatientTableProps } from "./types";

export function PatientTable({
  patients,
  onEdit,
  onDelete,
  isLoading,
}: PatientTableProps) {
  const { hasPermission } = usePermission();
  const canUpdate = hasPermission("patients.update");
  const canDelete = hasPermission("patients.delete");
  const router = useRouter();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {PATIENT_TABLE_COLUMNS.map((col) => (
            <TableHead key={col.key}>{col.label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              {PATIENT_TABLE_COLUMNS.map((col) => (
                <TableCell key={col.key}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : patients.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={PATIENT_TABLE_COLUMNS.length}
              className="h-24 text-center text-muted-foreground"
            >
              No patients found.
            </TableCell>
          </TableRow>
        ) : (
          patients.map((patient) => (
            <TableRow key={patient.id}>
              <TableCell className="font-medium">
                {patient.firstName} {patient.lastName}
              </TableCell>
              <TableCell>
                <span className="text-muted-foreground text-xs">
                  {patient.documentType}
                </span>{" "}
                {patient.documentNumber}
              </TableCell>
              <TableCell>
                <PatientStatusBadge status={patient.status} />
              </TableCell>
              <TableCell>{patient.phone ?? "—"}</TableCell>
              <TableCell>{patient.email ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {patient.createdAt.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      router.push(`/dashboard/patients/${patient.id}`)
                    }
                    aria-label="View patient history"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </Button>
                  {canUpdate && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onEdit(patient.id)}
                      aria-label="Edit patient"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onDelete(patient.id)}
                      aria-label="Delete patient"
                    >
                      <Trash2Icon className="h-4 w-4 text-destructive" />
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
