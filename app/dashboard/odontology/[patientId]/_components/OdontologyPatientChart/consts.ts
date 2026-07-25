import type { OdontogramThemeConfig } from "odonto-next";
import type { VisitFormState, TreatmentFormState } from "./types";
import type { TreatmentStatus } from "@/core/odontology/types";

export const ERPFLOW_THEME: OdontogramThemeConfig = {
  colors: {
    background: "var(--background)",
    surface: "var(--card)",
    panel: "var(--muted)",
    text: "var(--foreground)",
    muted: "var(--muted-foreground)",
    subtle: "var(--muted-foreground)",
    line: "var(--border)",
    lineSoft: "var(--accent)",
    accent: "var(--primary)",
    accentBg: "var(--primary)",
    accent2: "var(--secondary)",
    danger: "var(--destructive)",
    dangerBg: "var(--destructive)",
  },
  vars: {
    borderRadius: "var(--radius)",
    borderRadiusSm: "calc(var(--radius) - 2px)",
  },
};

export const EMPTY_VISIT_FORM: VisitFormState = {
  chiefComplaint: "",
  diagnosis: "",
  treatment: "",
  notes: "",
};

export const EMPTY_TREATMENT_FORM: TreatmentFormState = {
  description: "",
  toothNumber: "",
  surface: "",
  price: "",
  notes: "",
};

export const TREATMENT_STATUS_OPTIONS: {
  value: TreatmentStatus;
  label: string;
}[] = [
  { value: "PLANNED", label: "Planned" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];
