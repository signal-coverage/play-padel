import { getTranslations } from "next-intl/server";
import { PlayersDirectory } from "./_components/PlayersDirectory";

export default async function PlayersPage() {
  const t = await getTranslations("PlayersPage");
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-4 p-4 md:p-6">
      <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
      <PlayersDirectory />
    </div>
  );
}
