import type { LucideIcon } from "lucide-react";

export type ClubSettingsTabValue = "basic" | "hours" | "mercadopago";

export type ClubSettingsTab = {
  value: ClubSettingsTabValue;
  label: string;
  icon: LucideIcon;
};
