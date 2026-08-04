import type { SystemRole } from "@/providers/auth-provider";
import { OwnerHero } from "./components/OwnerHero";
import { PlayerHero } from "./components/PlayerHero";

export function HeroCard({
  role,
  className,
}: {
  role: SystemRole;
  className?: string;
}) {
  return role === "owner" ? (
    <OwnerHero className={className} />
  ) : (
    <PlayerHero className={className} />
  );
}
