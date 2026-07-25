"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { ClubPickerProps } from "./types";

export function ClubPicker({
  clubs,
  value,
  onChange,
  isLoading,
}: ClubPickerProps) {
  return (
    <div className="flex flex-col gap-1 max-w-xs">
      <Label htmlFor="club-picker">Club</Label>
      <Select
        value={value ?? undefined}
        onValueChange={onChange}
        disabled={isLoading || clubs.length === 0}
      >
        <SelectTrigger id="club-picker">
          <SelectValue
            placeholder={isLoading ? "Loading clubs…" : "Select a club"}
          />
        </SelectTrigger>
        <SelectContent>
          {clubs.map((club) => (
            <SelectItem key={club.id} value={club.id}>
              {club.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
