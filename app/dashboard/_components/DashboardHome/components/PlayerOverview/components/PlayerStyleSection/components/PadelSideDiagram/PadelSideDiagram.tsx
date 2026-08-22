import Image from "next/image";
import { cn } from "@/lib/utils/utils";
import {
  court,
  courtSideLeftSelected,
  courtSideRightSelected,
} from "@/assets/icons";
import { getPreferredSideLabel } from "@/core/users/consts";
import type { PadelSideDiagramProps } from "./types";

export function PadelSideDiagram({ side, className }: PadelSideDiagramProps) {
  const image =
    side === null
      ? court
      : side === "forehand"
        ? courtSideRightSelected
        : courtSideLeftSelected;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-sm border border-border bg-muted/40 p-3",
        className,
      )}
    >
      <Image
        src={image.default}
        alt={
          side === null
            ? "Padel court diagram with no preferred side selected"
            : `Padel court diagram highlighting the ${getPreferredSideLabel(side).toLowerCase()} side`
        }
        className="h-auto w-full"
      />
      <span className="absolute inset-x-3 bottom-3 truncate rounded bg-primary px-2 py-1 text-center font-mono text-xs font-bold tracking-widest text-primary-foreground uppercase">
        Preferred: {getPreferredSideLabel(side)}
      </span>
    </div>
  );
}
