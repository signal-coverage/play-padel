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
import { HelpCircle, Settings, User } from "lucide-react";
import { getInitials } from "../../utils";

export function UserMenu() {
  const { user, signOut } = useAuth();
  const { openUserProfile } = useClerk();
  const router = useRouter();

  const initials = getInitials(user?.email ?? null);
  const imageUrl = user?.imageUrl ?? null;
  const isOwner = user?.role === "owner";

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-xs font-medium text-primary-foreground outline-none transition-[opacity,scale] duration-150 ease-out hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.96]">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={initials}
              width={36}
              height={36}
              unoptimized
              className="h-full w-full object-cover outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
              referrerPolicy="no-referrer"
            />
          ) : (
            initials
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="end" className="w-56">
        <DropdownMenuItem
          onClick={() => openUserProfile()}
          className="cursor-pointer"
        >
          <User className="h-4 w-4" />
          Account Settings
        </DropdownMenuItem>
        {isOwner && (
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/dashboard/settings/club">
              <Settings className="h-4 w-4" />
              Club Settings
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/dashboard/help">
            <HelpCircle className="h-4 w-4" />
            Help
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
