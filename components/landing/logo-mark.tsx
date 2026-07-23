/**
 * Inline monogram mark for the invented brand "Rebote" (Spanish for
 * "rebound" - the sound a padel ball makes off the glass). A single
 * geometric shape (rounded square + a stylized "R" stroke) rather than a
 * plain text wordmark, per design-taste-frontend Section 4.8.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="10" fill="#073D6B" />
      <path
        d="M11 23V9h6.2c2.9 0 4.8 1.7 4.8 4.3 0 1.9-1 3.3-2.7 3.9L22.5 23h-3.4l-3.6-5.3H14V23h-3Zm3-7.8h3c1.3 0 2-.7 2-1.9 0-1.2-.7-1.8-2-1.8h-3v3.7Z"
        fill="#DFFD36"
      />
    </svg>
  );
}
