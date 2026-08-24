import { CreditCard, Settings2 } from "lucide-react";
import type { ClubSettingsTab } from "./types";

export const CLUB_SETTINGS_TABS: ClubSettingsTab[] = [
  { value: "basic", label: "Basic information", icon: Settings2 },
  { value: "mercadopago", label: "Mercado Pago", icon: CreditCard },
];

export const DEFAULT_CLUB_SETTINGS_TAB: ClubSettingsTab["value"] = "basic";
