import type { DocumentType, Gender } from "@/core/patients/types";

export const DOCUMENT_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: "DNI", label: "DNI" },
  { value: "PASSPORT", label: "Passport" },
  { value: "OTHER", label: "Other" },
];

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
];
