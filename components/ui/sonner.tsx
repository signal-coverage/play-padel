"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { BouncingBall } from "@/components/BouncingBall";

// Darkens whatever color a toast type is themed with (same tokens the
// left-accent border in globals.css uses), so each ball's seam ring reads
// as a shaded, three-dimensional sphere instead of a flat-colored circle —
// works in both themes automatically since it's relative to the token, not
// a fixed hex.
function darken(colorVar: string): string {
  return `color-mix(in oklch, ${colorVar} 70%, black)`;
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      closeButton
      duration={5000}
      icons={{
        // The classic yellow-green ball (TennisBallIcon's own default) for
        // "ok" — every other type recolors the same shape instead of using
        // a distinct icon per type, matching the toast's own colored-accent
        // theming (globals.css's `.cn-toast[data-type=...]`). Bouncing via
        // the same BouncingBall GlobalLoadingOverlay uses — a much smaller
        // `amplitude` than that overlay's big centered ball: this one lives
        // inside a toast's fixed icon slot, so traveling as far would clip
        // rather than read as "bouncing in place".
        success: <BouncingBall size={18} amplitude={5} />,
        info: (
          <BouncingBall
            size={18}
            amplitude={5}
            fill="var(--primary)"
            stroke={darken("var(--primary)")}
          />
        ),
        warning: (
          <BouncingBall
            size={18}
            amplitude={5}
            fill="var(--warning)"
            stroke={darken("var(--warning)")}
          />
        ),
        error: (
          <BouncingBall
            size={18}
            amplitude={5}
            fill="var(--destructive)"
            stroke={darken("var(--destructive)")}
          />
        ),
        loading: <BouncingBall size={18} amplitude={5} />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
          "--width": "420px",
          // Sonner's own gap between the icon and the title/description —
          // its 4px default reads as cramped now that the icon is a
          // visually busier bouncing ball rather than a thin line icon.
          "--toast-icon-margin-end": "12px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
