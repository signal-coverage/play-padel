"use client";

import { Building2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ClubCard } from "./components/ClubCard";
import type { ClubPickerProps } from "./types";

export function ClubPicker({
  clubs,
  value,
  onChange,
  isLoading,
}: ClubPickerProps) {
  if (isLoading) {
    return (
      <div className="flex max-w-2xl flex-col gap-2">
        <Label id="club-picker-label">Club</Label>
        <div
          role="group"
          aria-labelledby="club-picker-label"
          className="grid gap-2 sm:grid-cols-2"
        >
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      </div>
    );
  }

  if (clubs.length === 0) {
    return (
      <div className="flex max-w-2xl flex-col gap-2">
        <Label id="club-picker-label">Club</Label>
        <div role="group" aria-labelledby="club-picker-label">
          <Empty className="flex-none">
            <EmptyMedia variant="icon">
              <Building2 />
            </EmptyMedia>
            <EmptyTitle>No clubs available</EmptyTitle>
            <EmptyDescription>
              There are no active clubs to book a court with yet.
            </EmptyDescription>
          </Empty>
        </div>
      </div>
    );
  }

  return (
    <div className="flex max-w-2xl flex-col gap-2">
      <Label id="club-picker-label">Club</Label>
      <div
        role="group"
        aria-labelledby="club-picker-label"
        className="grid gap-2 sm:grid-cols-2"
      >
        {clubs.map((club) => (
          <ClubCard
            key={club.id}
            club={club}
            selected={club.id === value}
            onClick={() => onChange(club.id)}
          />
        ))}
      </div>
    </div>
  );
}
