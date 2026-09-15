import { CalendarClock } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export function UpcomingListEmpty() {
  const t = useTranslations("UpcomingListEmpty");
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
      <EmptyMedia variant="icon" className="size-9 rounded-full">
        <CalendarClock className="size-5" />
      </EmptyMedia>
      <EmptyTitle>{t("title")}</EmptyTitle>
      <EmptyDescription className="text-xs">
        {t("description")}
      </EmptyDescription>
    </div>
  );
}
