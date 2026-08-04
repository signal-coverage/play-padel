"use client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon-lg"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun className="h-4 w-4 scale-100 opacity-100 blur-none transition-[opacity,scale,filter] dark:scale-25 dark:opacity-0 dark:blur-xs" />
      <Moon className="absolute h-4 w-4 scale-25 opacity-0 blur-xs transition-[opacity,scale,filter] dark:scale-100 dark:opacity-100 dark:blur-none" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
