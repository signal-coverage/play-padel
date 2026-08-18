import { Sun, Warehouse } from "lucide-react";

export const COURT_TYPE_OPTIONS = [
  { value: false, label: "Outdoor", Icon: Sun },
  { value: true, label: "Indoor", Icon: Warehouse },
] as const;
