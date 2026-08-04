import Image from "next/image";
import { cn } from "@/lib/utils/utils";
import { LOGO_BADGE_VARIANTS } from "./consts";
import type { LogoBadgeProps } from "./types";

export function LogoBadge({ size = "md", className }: LogoBadgeProps) {
  const variant = LOGO_BADGE_VARIANTS[size];

  return (
    <div className={cn(variant.wrapper, className)}>
      <Image
        src="/logo.svg"
        alt="Play Padel"
        width={24}
        height={24}
        className={variant.image}
      />
    </div>
  );
}
