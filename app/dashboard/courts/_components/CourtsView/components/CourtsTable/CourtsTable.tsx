"use client";

import { CalendarClock, CalendarOff, Pencil, Trash2 } from "lucide-react";
import { StatusBox } from "@/components/StatusBox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { indoorLabel, surfaceLabel } from "../../utils";
import { LOADING_SKELETON_ROW_COUNT } from "./consts";
import type { CourtsTableProps } from "./types";

export function CourtsTable({
  courts,
  isLoading,
  onEdit,
  onEditAvailability,
  onEditClosures,
  onDelete,
  deletingCourtId,
}: CourtsTableProps) {
  if (isLoading) {
    return (
      <div className="overflow-x-auto rounded-lg border">
        <span className="sr-only" role="status">
          Loading courts…
        </span>
        <Table aria-hidden="true">
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
            {Array.from({ length: LOADING_SKELETON_ROW_COUNT }).map(
              (_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1.5">
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                  </TableCell>
                </TableRow>
              ),
            )}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (courts.length === 0) {
    return (
      <StatusBox>
        No courts yet. Create your first court to get started.
      </StatusBox>
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
                <div className="flex justify-end gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit availability for ${court.name}`}
                    onClick={() => onEditAvailability(court)}
                  >
                    <CalendarClock />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Manage closures for ${court.name}`}
                    onClick={() => onEditClosures(court)}
                  >
                    <CalendarOff />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit ${court.name}`}
                    onClick={() => onEdit(court)}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
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
