"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SHARE_DATA } from "./consts";

export function ShareButton() {
  async function handleShare() {
    const shareData = {
      ...SHARE_DATA,
      url: typeof window !== "undefined" ? window.location.href : SHARE_DATA.url,
    };

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        if ((error as Error)?.name !== "AbortError") {
          toast.error("Couldn't share this page. Try again.");
        }
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(shareData.url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Couldn't copy the link. Try again.");
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleShare}
      className="gap-1.5 text-white/45 hover:bg-white/10 hover:text-white/80"
    >
      <Share2 size={14} strokeWidth={2.25} />
      Share
    </Button>
  );
}
