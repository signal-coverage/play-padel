import { Clock, CreditCard, Landmark, Settings2 } from "lucide-react";
import type { ClubSettingsTab } from "./types";

export const CLUB_SETTINGS_TABS: ClubSettingsTab[] = [
  { value: "basic", label: "Club settings", icon: Settings2 },
  { value: "hours", label: "Schedule", icon: Clock },
  { value: "mercadopago", label: "Mercado Pago", icon: CreditCard },
  { value: "bank-transfer", label: "Bank Transfer", icon: Landmark },
];

export const DEFAULT_CLUB_SETTINGS_TAB: ClubSettingsTab["value"] = "basic";
