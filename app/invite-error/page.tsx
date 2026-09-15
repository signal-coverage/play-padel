import { getTranslations } from "next-intl/server";

export default async function InviteErrorPage() {
  const t = await getTranslations("InviteError");

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-2xl font-semibold text-destructive">
          {t("heading")}
        </h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
    </div>
  );
}
