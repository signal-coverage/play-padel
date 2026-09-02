"use client";
import { useTheme } from "next-themes";

interface LandingThemeShellProps {
  children: React.ReactNode;
}

// Landing defaults to the site-wide `theme-light` palette but lets a visitor
// opt into dark for their session via LandingHeader's toggle. Only the light
// palette (`.theme-light`) is applied conditionally — dark mode falls back
// to the `.dark` palette already inherited from `<html>` (see globals.css).
// No "mounted" hydration guard here, matching AppNavbar's existing
// `resolvedTheme === "dark"` precedent in this codebase.
export function LandingThemeShell({ children }: LandingThemeShellProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div
      className={`${isDark ? "" : "theme-light"} font-(family-name:--font-jakarta) bg-background`}
    >
      {children}
    </div>
  );
}
