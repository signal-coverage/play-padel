"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { SHARE_URL } from "./consts";

export function ShareButton() {
  const t = useTranslations("ShareButton");

  async function handleShare() {
    const shareData = {
      title: "Play Padel",
      text: t("shareText"),
      url: typeof window !== "undefined" ? window.location.href : SHARE_URL,
    };

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        if ((error as Error)?.name !== "AbortError") {
          toast.error(t("shareErrorGeneric"));
        }
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(shareData.url);
      toast.success(t("linkCopied"));
    } catch {
      toast.error(t("copyError"));
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
      {t("share")}
    </Button>
  );
}
