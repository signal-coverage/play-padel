"use client";
import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { getPageTitle } from "./utils";

export function AppHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background px-4 py-2.5">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-4" />
      <span className="font-medium text-sm">{getPageTitle(pathname)}</span>
      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </header>
  );
}
