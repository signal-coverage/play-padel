"use client";

import { CalendarClock, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { indoorLabel, surfaceLabel } from "../../utils";
import type { CourtsTableProps } from "./types";

export function CourtsTable({
  courts,
  isLoading,
  onEdit,
  onEditAvailability,
  onDelete,
  deletingCourtId,
}: CourtsTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
        Loading courts…
      </div>
    );
  }

  if (courts.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
        No courts yet. Create your first court to get started.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Surface</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {courts.map((court) => (
            <TableRow key={court.id}>
              <TableCell className="font-medium">
                <span className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: court.color ?? "#94a3b8" }}
                    aria-hidden="true"
                  />
                  {court.name}
                </span>
              </TableCell>
              <TableCell>{surfaceLabel(court.surface)}</TableCell>
              <TableCell>{indoorLabel(court.indoor)}</TableCell>
              <TableCell>
                <Badge variant={court.active ? "default" : "secondary"}>
                  {court.active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit availability for ${court.name}`}
                    onClick={() => onEditAvailability(court)}
                  >
                    <CalendarClock />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${court.name}`}
                    onClick={() => onEdit(court)}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Deactivate ${court.name}`}
                    disabled={!court.active || deletingCourtId === court.id}
                    onClick={() => onDelete(court)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
