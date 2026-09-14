import {
  CalendarOff,
  Clock,
  CreditCard,
  Landmark,
  Settings2,
} from "lucide-react";
import type { ClubSettingsTab } from "./types";

export const CLUB_SETTINGS_TABS: ClubSettingsTab[] = [
  { value: "basic", labelKey: "basicTab", icon: Settings2 },
  { value: "hours", labelKey: "hoursTab", icon: Clock },
  { value: "closures", labelKey: "closuresTab", icon: CalendarOff },
  { value: "mercadopago", labelKey: "mercadopagoTab", icon: CreditCard },
  { value: "bank-transfer", labelKey: "bankTransferTab", icon: Landmark },
];

export const DEFAULT_CLUB_SETTINGS_TAB: ClubSettingsTab["value"] = "basic";
