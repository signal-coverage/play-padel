import type { LucideIcon } from "lucide-react";

export type ClubSettingsTabValue =
  "basic" | "hours" | "closures" | "mercadopago" | "bank-transfer";

export type ClubSettingsTab = {
  value: ClubSettingsTabValue;
  // Key into the "ClubSettingsTabs" messages namespace — consts.ts is a
  // plain data file and can't call useTranslations() itself, so the label
  // text is resolved in the component via t(tab.labelKey).
  labelKey: string;
  icon: LucideIcon;
};
