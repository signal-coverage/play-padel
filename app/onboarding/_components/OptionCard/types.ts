import type { LucideIcon } from "lucide-react";

export type OptionCardProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
};
