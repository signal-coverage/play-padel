import type { LucideIcon } from "lucide-react";

export type OptionCardProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  // Optional small pill next to the title (e.g. "Most Popular") — used to
  // nudge a choice among otherwise-equal options. Omit for plain options
  // like UserTypeStep's player/owner choice, where no option is "the pick".
  badge?: string;
  selected: boolean;
  onClick: () => void;
};
