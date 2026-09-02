"use client";

import { useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/utils";
import { THUMBNAIL_SIZE_CLASSES } from "./consts";
import type { CourtPhotoPreviewProps } from "./types";

export function CourtPhotoPreview({
  photoUrl,
  courtName,
  size = "lg",
}: CourtPhotoPreviewProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={(e) => {
              // Radix portals this content to document.body, but React
              // still re-dispatches the click through the component tree —
              // without this it'd also bubble to a parent row's onClick and
              // trigger a side effect (e.g. selecting the court).
              e.stopPropagation();
              setOpen(true);
            }}
            aria-label={`See a bigger preview of ${courtName}`}
            className={cn(
              "flex items-center justify-center rounded-xs bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              THUMBNAIL_SIZE_CLASSES[size],
            )}
          >
            {photoUrl ? (
              // Arbitrary owner-uploaded Vercel Blob URLs aren't known ahead
              // of time, so next/image's remotePatterns allowlist doesn't
              // fit here.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                className="h-full w-full rounded-xs object-cover"
                alt=""
              />
            ) : (
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>See preview</TooltipContent>
      </Tooltip>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{courtName}</DialogTitle>
          </DialogHeader>
          <div className="flex min-h-128 w-full items-center justify-center rounded-sm bg-muted">
            {photoUrl ? (
              // Arbitrary owner-uploaded Vercel Blob URLs aren't known ahead
              // of time, so next/image's remotePatterns allowlist doesn't
              // fit here.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                className="h-full w-full rounded-xs object-cover"
                alt=""
              />
            ) : (
              <ImageIcon className="h-10 w-10 text-muted-foreground" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
