import Image from "next/image";
import { cn } from "@/lib/utils/utils";
import { courtSideLeftSelected, courtSideRightSelected } from "@/assets/icons";
import type { PadelSideDiagramProps } from "./types";

export function PadelSideDiagram({ side, className }: PadelSideDiagramProps) {
  const isForehand = side === "forehand";

  return (
    <Image
      src={
        isForehand
          ? courtSideRightSelected.default
          : courtSideLeftSelected.default
      }
      alt={
        isForehand
          ? "Preferred side: forehand (right side of the court)"
          : "Preferred side: backhand (left side of the court)"
      }
      className={cn("shrink-0", className)}
    />
  );
}
