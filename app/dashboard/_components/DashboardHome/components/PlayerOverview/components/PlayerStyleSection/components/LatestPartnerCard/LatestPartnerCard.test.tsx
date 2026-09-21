// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/es.json";
import { LatestPartnerCard } from "./LatestPartnerCard";
import type { PartnerSummary } from "../../../../types";

afterEach(cleanup);

const PARTNER: PartnerSummary = {
  id: "partner_1",
  name: "Sofía Martínez",
  avatarUrl: null,
  timesPlayedTogether: 5,
  lastPlayedLabel: "3 days ago",
  padelCategory: 3,
  preferredSide: "backhand",
  dominantHand: "right",
  email: "sofia@example.com",
  phone: null,
};

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("LatestPartnerCard", () => {
  it("renders an empty state and no clickable card when partner is null", () => {
    renderWithIntl(<LatestPartnerCard partner={null} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(
      screen.getByText(/todavía no tenés compañeros/i),
    ).toBeInTheDocument();
  });

  it("renders the partner's name and times played together", () => {
    renderWithIntl(<LatestPartnerCard partner={PARTNER} />);

    expect(screen.getByText("Sofía Martínez")).toBeInTheDocument();
    expect(screen.getByText(/jugaron 5 veces/i)).toBeInTheDocument();
  });

  it("omits the win-rate prefix when coupleWinRate is not set (no match data yet)", () => {
    renderWithIntl(<LatestPartnerCard partner={PARTNER} />);

    expect(screen.queryByText(/% de victorias/)).not.toBeInTheDocument();
  });

  it("shows the win-rate prefix when coupleWinRate is set", () => {
    renderWithIntl(
      <LatestPartnerCard partner={{ ...PARTNER, coupleWinRate: 80 }} />,
    );

    expect(screen.getByText(/80% de victorias/)).toBeInTheDocument();
  });

  it("opens the profile dialog with the real partner data on click", () => {
    renderWithIntl(<LatestPartnerCard partner={PARTNER} />);

    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByText("sofia@example.com")).toBeInTheDocument();
  });
});
