"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PatientFilters } from "@/core/patients/types";
import { STATUS_FILTER_OPTIONS } from "./consts";

interface PatientFiltersProps {
  filters: PatientFilters;
  onFiltersChange: (filters: PatientFilters) => void;
}

export function PatientFilters({
  filters,
  onFiltersChange,
}: PatientFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onFiltersChange({
        ...filters,
        search: searchInput || undefined,
        page: 1,
      });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  function handleStatusChange(value: string) {
    onFiltersChange({
      ...filters,
      status: value === "ALL" ? undefined : (value as PatientFilters["status"]),
      page: 1,
    });
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Input
        placeholder="Search by name or document..."
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        className="sm:max-w-xs"
      />
      <Select
        value={filters.status ?? "ALL"}
        onValueChange={handleStatusChange}
      >
        <SelectTrigger className="sm:w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_FILTER_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
