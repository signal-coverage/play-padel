import { useTranslations } from "next-intl";
import { BouncingBall } from "@/components/BouncingBall";

export function DashboardLoader() {
  const t = useTranslations("DashboardLoader");

  return (
    <div className="h-svh w-full flex flex-col items-center justify-center gap-3">
      <BouncingBall size={32} amplitude={16} />
      <p className="text-sm text-muted-foreground">{t("loading")}</p>
    </div>
  );
}
