// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/es.json";
import { SystemJobErrorDialog } from "./SystemJobErrorDialog";
import type { ComponentProps } from "react";

const LONG_ERROR = "boom: ".repeat(200);

function renderDialog(props: ComponentProps<typeof SystemJobErrorDialog>) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <SystemJobErrorDialog {...props} />
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("SystemJobErrorDialog", () => {
  it("renders nothing when closed", () => {
    renderDialog({
      open: false,
      onOpenChange: vi.fn(),
      jobLabel: "Clerk webhook",
      when: "Sep 10, 12:00:00",
      errorMessage: "Something failed",
    });

    expect(screen.queryByText("Detalles del error")).not.toBeInTheDocument();
  });

  it("shows the job label, timestamp, and the complete error message when open", () => {
    renderDialog({
      open: true,
      onOpenChange: vi.fn(),
      jobLabel: "Clerk webhook",
      when: "Sep 10, 12:00:00",
      errorMessage: LONG_ERROR,
    });

    expect(screen.getByText("Detalles del error")).toBeInTheDocument();
    expect(
      screen.getByText("Clerk webhook · Sep 10, 12:00:00"),
    ).toBeInTheDocument();
    // The full, untruncated text — this is the whole point of the modal.
    // Checked via textContent (not getByText) since RTL's default text
    // matcher/normalizer isn't a good fit for a huge repeated string.
    expect(screen.getByTestId("system-job-error-text").textContent).toBe(
      LONG_ERROR,
    );
  });

  it("copies the full error message to the clipboard when Copy is clicked", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    renderDialog({
      open: true,
      onOpenChange: vi.fn(),
      jobLabel: "Clerk webhook",
      when: "Sep 10, 12:00:00",
      errorMessage: "Signature verification failed",
    });

    fireEvent.click(screen.getByRole("button", { name: /copiar/i }));

    expect(writeText).toHaveBeenCalledWith("Signature verification failed");
    expect(
      await screen.findByRole("button", { name: /copiado/i }),
    ).toBeInTheDocument();
  });

  it("calls onOpenChange(false) when Close is clicked", () => {
    const onOpenChange = vi.fn();
    renderDialog({
      open: true,
      onOpenChange,
      jobLabel: "Clerk webhook",
      when: "Sep 10, 12:00:00",
      errorMessage: "Signature verification failed",
    });

    fireEvent.click(screen.getByRole("button", { name: /^cerrar$/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("never throws when the clipboard is unavailable/blocked", async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("nope")) },
    });

    renderDialog({
      open: true,
      onOpenChange: vi.fn(),
      jobLabel: "Clerk webhook",
      when: "Sep 10, 12:00:00",
      errorMessage: "Signature verification failed",
    });

    expect(() => {
      fireEvent.click(screen.getByRole("button", { name: /copiar/i }));
    }).not.toThrow();
  });
});
