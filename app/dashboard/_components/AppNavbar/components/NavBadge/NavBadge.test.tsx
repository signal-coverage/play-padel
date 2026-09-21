// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/es.json";
import { NavBadge } from "./NavBadge";

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("NavBadge", () => {
  afterEach(() => {
    cleanup();
  });

  it('renders visible "Nuevo" text for label "new" in the default (pill) variant', () => {
    renderWithIntl(<NavBadge label="new" />);
    expect(screen.getByText("Nuevo")).toBeInTheDocument();
  });

  it('renders visible "Abierto" text for label "open" in the default (pill) variant', () => {
    renderWithIntl(<NavBadge label="open" />);
    expect(screen.getByText("Abierto")).toBeInTheDocument();
  });

  it("renders no visible pill text in the dot variant", () => {
    renderWithIntl(<NavBadge label="open" variant="dot" />);
    expect(
      screen.queryByText("Abierto", { selector: ":not(.sr-only)" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the label accessible via sr-only text in the dot variant", () => {
    renderWithIntl(<NavBadge label="new" variant="dot" />);
    expect(
      screen.getByText("Nuevo", { selector: ".sr-only" }),
    ).toBeInTheDocument();
  });
});
