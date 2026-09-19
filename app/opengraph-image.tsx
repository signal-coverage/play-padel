import { ImageResponse } from "next/og";

// Applies to every route that doesn't define its own opengraph-image (i.e.
// the whole app today) — this is what shows up as the link-preview card
// when someone shares play-padel.com.ar on WhatsApp, X, LinkedIn, iMessage,
// etc. A real branded 1200x630 card here (instead of falling back to the
// small square /light/logo.png the metadata object used to reference)
// measurably improves click-through from social shares, which is itself an
// indirect ranking/traffic signal — not just cosmetic.
//
// Colors match app/globals.css's `.theme-light` tokens (the landing page's
// pinned light theme, see the "Light-locked surfaces" convention): navy
// background/foreground (#073d6b) with the lime accent (#dffd36).

// Spanish-only while English is hidden site-wide — see
// i18n/getRequestLocale.ts. Revert to "Play Padel — Book padel courts
// online" alongside that change once both languages are live again.
export const alt = "Play Padel — Reservá canchas de pádel online";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#073d6b",
        padding: "72px",
        position: "relative",
      }}
    >
      {/* Court-line motif — a simple bordered rectangle with a center
            line/circle, evoking a padel court without needing an image
            asset. */}
      <div
        style={{
          position: "absolute",
          top: 64,
          right: 64,
          width: 340,
          height: 220,
          border: "6px solid rgba(223, 253, 54, 0.35)",
          borderRadius: 12,
          display: "flex",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 0,
            bottom: 0,
            width: 6,
            background: "rgba(223, 253, 54, 0.35)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 90,
            height: 90,
            marginLeft: -45,
            marginTop: -45,
            borderRadius: "50%",
            border: "6px solid rgba(223, 253, 54, 0.35)",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 96,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: "-0.03em",
          }}
        >
          Play Padel
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 34,
            color: "#dffd36",
            fontWeight: 600,
            maxWidth: 760,
          }}
        >
          Reservá canchas de pádel online, en tiempo real.
        </div>
      </div>

      <div
        style={{
          display: "flex",
          fontSize: 24,
          color: "rgba(255, 255, 255, 0.65)",
        }}
      >
        play-padel.com.ar
      </div>
    </div>,
    { ...size },
  );
}
