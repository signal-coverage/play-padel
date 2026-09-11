"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useClerk } from "@clerk/nextjs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HelpCircle, LogOut, Settings, User } from "lucide-react";
import { useMembershipSubscription } from "@/components/PlanSelectionModal/hooks";
import { isMembershipConfirmed } from "@/components/PlanSelectionModal/utils";
import { getInitials } from "../../utils";
import { useClubOperationalCause } from "../../hooks";

export function UserMenu() {
  const { user, signOut } = useAuth();
  const { openUserProfile } = useClerk();
  const router = useRouter();

  const initials = getInitials(user?.email ?? null);
  const imageUrl = user?.imageUrl ?? null;
  const isOwner = user?.role === "owner";

  // Club Settings is only reachable once the club has actually cleared BOTH
  // gates the rest of the dashboard is gated behind (see
  // ClubOperationalGate.tsx) — an owner whose club is still pending admin
  // approval, or whose Play Padel membership never got confirmed, would
  // otherwise see this link in the dropdown even though the page itself
  // (and everything else in the dashboard) is unreachable for them.
  // `undefined` (still loading) fails CLOSED here — same "don't flash an
  // item that immediately disappears" reasoning as useIsClubOperational's
  // own doc comment — rather than briefly showing it before the real
  // answer lands.
  const clubOperationalCause = useClubOperationalCause(
    isOwner ? "owner" : "player",
  );
  const { data: membershipSubscription } = useMembershipSubscription({
    enabled: isOwner,
  });
  const canManageClubSettings =
    isOwner &&
    clubOperationalCause !== undefined &&
    clubOperationalCause !== "PENDING_APPROVAL" &&
    !!membershipSubscription &&
    isMembershipConfirmed(membershipSubscription.status);

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-primary text-xs leading-none font-medium text-primary-foreground outline-none transition-[opacity,scale] duration-150 ease-out hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.96]">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={initials}
              width={36}
              height={36}
              unoptimized
              className="h-full w-full object-cover outline -outline-offset-1 outline-black/10 dark:outline-white/10"
              referrerPolicy="no-referrer"
            />
          ) : (
            initials
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="bottom"
        align="end"
        className="w-56 rounded-sm"
      >
        <DropdownMenuItem
          onClick={() => openUserProfile()}
          className="cursor-pointer py-2 rounded-sm"
        >
          <User className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          Account Settings
        </DropdownMenuItem>
        {canManageClubSettings && (
          <DropdownMenuItem asChild className="cursor-pointer py-2 rounded-sm">
            <Link href="/dashboard/settings/club">
              <Settings
                className="h-4 w-4 text-muted-foreground"
                strokeWidth={1.5}
              />
              Club Settings
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild className="cursor-pointer py-2 rounded-sm">
          <Link href="/dashboard/help">
            <HelpCircle
              className="h-4 w-4 text-muted-foreground"
              strokeWidth={1.5}
            />
            Help
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="cursor-pointer py-2 rounded-sm"
        >
          <LogOut className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
