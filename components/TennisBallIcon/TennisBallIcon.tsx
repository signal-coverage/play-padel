export type TennisBallIconProps = {
  size?: number;
  // Both default to the classic tennis-ball yellow-green — a real ball's
  // color, hardcoded on purpose rather than tied to a theme token (same
  // reasoning MembershipCheckoutDrawer already uses for Mercado Pago's own
  // brand blue). Overridable so the SAME ball shape can double as a colored
  // status dot elsewhere (see components/ui/sonner.tsx's toast icons: a
  // red/"tomato" ball for error, etc.) without duplicating this SVG.
  // Plain string props (not a `color` shorthand) so a caller can pass a CSS
  // function like `var(--destructive)` or `color-mix(...)` — these are set
  // via `style`, not the `fill`/`stroke` attributes, specifically so those
  // CSS functions are guaranteed to be parsed as CSS rather than a literal
  // attribute string.
  fill?: string;
  stroke?: string;
};

// A tennis ball — a plain circle plus two curved white "seam" arcs, the
// same visual language as the 🎾 emoji's two crescents. Shared by
// SuccessCelebrationPortal's bounce animation, GlobalLoadingOverlay's
// loading spin, and the Toaster's per-type status icons — each just wraps
// or recolors this same SVG rather than redrawing it.
export function TennisBallIcon({
  size = 26,
  fill = "#d4f000",
  stroke = "#a9c400",
}: TennisBallIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx="12"
        cy="12"
        r="11"
        style={{ fill, stroke }}
        strokeWidth="0.75"
      />
      <path
        d="M2.5 6 C 9 12, 9 12, 2.5 18"
        fill="none"
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M21.5 6 C 15 12, 15 12, 21.5 18"
        fill="none"
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
