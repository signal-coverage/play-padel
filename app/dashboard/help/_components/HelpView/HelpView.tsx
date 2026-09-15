"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/use-auth";
import { PlayerHelpSection } from "./components/PlayerHelpSection";
import { OwnerHelpSection } from "./components/OwnerHelpSection";
import { AccountLanguageHelpSection } from "./components/AccountLanguageHelpSection";

// In-app user manual for /dashboard/help (see AppNavbar/components/UserMenu's
// existing "Help" link, previously dead). Branches on the signed-in user's
// own `role` — a player only ever sees the player section, an owner only the
// owner section — rather than a manual toggle, since nobody needs the other
// role's instructions for an app they don't use that way. `role` is reliably
// resolved by the time this renders: DashboardGuard (the whole /dashboard
// subtree's guard) blocks on profileLoading before any page content mounts.
export function HelpView() {
  const t = useTranslations("HelpView");
  const { user } = useAuth();
  const isOwner = user?.role === "owner";

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-6 overflow-y-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">
          {t("description", { brand: "Play Padel" })}
        </p>
      </div>

      {isOwner ? <OwnerHelpSection /> : <PlayerHelpSection />}
      <AccountLanguageHelpSection />
    </div>
  );
}
