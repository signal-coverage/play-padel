import type { Professional, WorkingHours } from "@/core/professionals/types";

export interface ProfessionalSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professional?: Professional;
  existingWorkingHours?: WorkingHours[];
  onSuccess: () => void;
}

export interface WorkingHoursFormEntry {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface ProfessionalFormValues {
  displayName: string;
  specialties: string[];
  license: string;
  phone: string;
  email: string;
  calendarColor: string;
  workingHours: WorkingHoursFormEntry[];
}
