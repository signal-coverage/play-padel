// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/es.json";
import { CourtLimitReachedDialog } from "./CourtLimitReachedDialog";

afterEach(() => {
  cleanup();
});

function renderDialog(
  props: React.ComponentProps<typeof CourtLimitReachedDialog>,
) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <CourtLimitReachedDialog {...props} />
    </NextIntlClientProvider>,
  );
}

describe("CourtLimitReachedDialog", () => {
  it("renders nothing when closed", () => {
    renderDialog({
      open: false,
      onOpenChange: () => {},
      plan: "BASIC",
      limit: 2,
    });

    expect(
      screen.queryByText(/límite de canchas alcanzado/i),
    ).not.toBeInTheDocument();
  });

  it("explains the plan's court limit when open", () => {
    renderDialog({
      open: true,
      onOpenChange: () => {},
      plan: "BASIC",
      limit: 2,
    });

    expect(
      screen.getByText(/límite de canchas alcanzado/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/tu plan basic permite hasta 2 canchas/i),
    ).toBeInTheDocument();
  });

  it("singularizes the copy for a limit of exactly 1", () => {
    renderDialog({
      open: true,
      onOpenChange: () => {},
      plan: "MAX",
      limit: 1,
    });

    expect(
      screen.getByText(/tu plan max permite hasta 1 cancha\b/i),
    ).toBeInTheDocument();
  });

  it("links the primary action to the dashboard, where the real Upgrade button lives", () => {
    renderDialog({
      open: true,
      onOpenChange: () => {},
      plan: "BASIC",
      limit: 2,
    });

    const link = screen.getByRole("link", { name: /ir al panel/i });
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  it("calls onOpenChange(false) when the Close button is clicked", () => {
    const onOpenChange = vi.fn();
    renderDialog({
      open: true,
      onOpenChange,
      plan: "BASIC",
      limit: 2,
    });

    screen.getByRole("button", { name: /cerrar/i }).click();

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
