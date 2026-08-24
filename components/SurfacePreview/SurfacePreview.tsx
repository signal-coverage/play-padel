import Image from "next/image";
import { CircleHelp, Image as ImageIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { surfaceLabel } from "@/app/dashboard/courts/_components/CourtsView/utils";
import {
  CARPET_SURFACE_FALLBACK_IMAGE,
  CARPET_SURFACE_IMAGE_BY_COLOR,
  CONCRETE_SURFACE_IMAGE,
} from "./consts";
import type { SurfacePreviewProps } from "./types";

export function SurfacePreview({ surface, color }: SurfacePreviewProps) {
  // Real per-color renders exist for the ColorField presets; any other
  // (custom-picked) color falls back to the neutral render, tinted at
  // render time instead of pixel-perfect.
  const presetImage = color
    ? CARPET_SURFACE_IMAGE_BY_COLOR[color.toLowerCase()]
    : undefined;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          aria-label={`See a texture preview of ${surfaceLabel(surface)}`}
          className="flex size-4 items-center justify-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <CircleHelp className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="border bg-popover text-popover-foreground p-2">
        {surface === "carpet" ? (
          <div className="relative h-24 w-24 overflow-hidden rounded-xs">
            <Image
              src={presetImage ?? CARPET_SURFACE_FALLBACK_IMAGE}
              alt=""
              fill
              className="object-cover"
            />
            {/* Only the fallback render needs a CSS tint — the presets above
                are already pixel-perfect for their exact color, so tinting
                on top would double up the color. `mix-blend-mode: color`
                takes this overlay's hue/saturation while keeping the
                photo's own luminosity; the color itself is muted via
                `color-mix` in OKLCH (reduces chroma, keeps hue stable) for
                a matte look instead of the raw, fully-saturated picker
                color. */}
            {!presetImage && (
              <div
                className="absolute inset-0"
                style={{
                  backgroundColor: `color-mix(in oklch, ${color ?? "#94a3b8"} 60%, gray)`,
                  mixBlendMode: "color",
                }}
                aria-hidden="true"
              />
            )}
          </div>
        ) : surface === "concrete" ? (
          <div className="relative h-24 w-24 overflow-hidden rounded-xs">
            <Image
              src={CONCRETE_SURFACE_IMAGE}
              alt=""
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-xs bg-muted">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
