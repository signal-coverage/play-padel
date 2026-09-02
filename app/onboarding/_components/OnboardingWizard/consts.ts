import {
  Building2,
  Clock,
  FileText,
  LayoutGrid,
  Landmark,
  Trophy,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { OnboardingStepKey } from "@/app/onboarding/types";

export const STEP_META: Record<
  OnboardingStepKey,
  { label: string; icon: LucideIcon }
> = {
  userType: { label: "You", icon: Users },
  clubBasics: { label: "Club", icon: Building2 },
  legalBilling: { label: "Legal", icon: Landmark },
  plan: { label: "Plan", icon: LayoutGrid },
  operatingHours: { label: "Hours", icon: Clock },
  profile: { label: "Profile", icon: User },
  playerProfile: { label: "Profile", icon: User },
  padelProfile: { label: "Padel", icon: Trophy },
  terms: { label: "Terms", icon: FileText },
};
