"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useClerk } from "@clerk/nextjs";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronUp, HelpCircle, Settings, User } from "lucide-react";
import { navItems } from "./consts";

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { openUserProfile } = useClerk();

  const role = user?.role ?? "player";
  const visibleNavItems = navItems.filter((item) => item.roles.includes(role));

  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const email = user?.email ?? "";
  const initials = email.split("@")[0]?.[0]?.toUpperCase() ?? "U";
  const imageUrl = user?.imageUrl ?? null;

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  return (
    <Sidebar
      collapsible="icon"
      className={`lg:border-r-0! pt-2 ${collapsed && "pl-2"}`}
    >
      <SidebarHeader className="py-2.5 pt-2.75">
        <div
          className={`flex items-center py-0 ${collapsed ? "justify-center" : "gap-2 px-2"}`}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center">
            <Image src="/logo.svg" alt="Play Padel" width={24} height={24} />
          </div>
          {!collapsed && (
            <span className="font-semibold text-sm truncate">Play Padel</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {visibleNavItems.length > 0 && (
          <>
            <SidebarGroup className={collapsed ? "pl-1" : ""}>
              {!collapsed && <SidebarGroupLabel>Menu</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleNavItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.href}
                      >
                        <Link
                          href={item.href}
                          className={collapsed ? "justify-center" : ""}
                        >
                          {collapsed ? (
                            <span className="flex items-center justify-center pointer-events-none">
                              <item.icon className="h-5 w-5" />
                            </span>
                          ) : (
                            <>
                              <item.icon className="h-4 w-4" />
                              <span>{item.title}</span>
                            </>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        <SidebarSeparator className={`${collapsed && "ml-0"}`} />

        {!collapsed && (
          <SidebarGroup>
            <SidebarGroupLabel>Favorites</SidebarGroupLabel>
            <SidebarGroupContent>
              <p className="px-2 py-1 text-xs text-muted-foreground">
                No favorites yet
              </p>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className={`py-2.5 ${collapsed && "px-0"}`}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={`flex w-full rounded-md py-1.5 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${collapsed ? "justify-center px-0" : "items-center gap-2 px-2"}`}
            >
              <div
                className={`flex items-center justify-center rounded-full bg-primary text-primary-foreground font-medium overflow-hidden shrink-0 ${collapsed ? "h-8 w-8 text-sm" : "h-7 w-7 text-xs"}`}
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={initials}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  initials
                )}
              </div>
              {!collapsed && (
                <>
                  <span className="flex-1 truncate text-left">{email}</span>
                  <ChevronUp className="h-4 w-4 shrink-0" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuItem
              onClick={() => openUserProfile()}
              className="cursor-pointer"
            >
              <User className="h-4 w-4" />
              Account Settings
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/dashboard/settings/club">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/dashboard/help">
                <HelpCircle className="h-4 w-4" />
                Help
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="cursor-pointer"
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
