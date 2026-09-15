// @vitest-environment jsdom
import type * as React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { NewClubClosureForm } from "./NewClubClosureForm";

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("NewClubClosureForm", () => {
  afterEach(() => {
    cleanup();
  });

  it("never renders an 'apply to all courts' control — this form always applies to every court", () => {
    renderWithIntl(
      <NewClubClosureForm onSubmit={vi.fn()} isSubmitting={false} />,
    );

    expect(screen.queryByText(/apply to all courts/i)).not.toBeInTheDocument();
  });

  it("submits the entered start, end and reason", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    renderWithIntl(
      <NewClubClosureForm onSubmit={onSubmit} isSubmitting={false} />,
    );

    fireEvent.change(screen.getByLabelText(/starts/i), {
      target: { value: "2026-10-01T10:00" },
    });
    fireEvent.change(screen.getByLabelText(/ends/i), {
      target: { value: "2099-10-01T18:00" },
    });
    fireEvent.change(screen.getByLabelText(/reason/i), {
      target: { value: "Club rented for a tournament" },
    });
    fireEvent.click(screen.getByRole("button", { name: /close the club/i }));

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        startsAt: "2026-10-01T10:00",
        endsAt: "2099-10-01T18:00",
        reason: "Club rented for a tournament",
      }),
    );
  });

  it("shows a validation error and never calls onSubmit when reason is blank", async () => {
    const onSubmit = vi.fn();
    renderWithIntl(
      <NewClubClosureForm onSubmit={onSubmit} isSubmitting={false} />,
    );

    fireEvent.change(screen.getByLabelText(/starts/i), {
      target: { value: "2026-10-01T10:00" },
    });
    fireEvent.change(screen.getByLabelText(/ends/i), {
      target: { value: "2099-10-01T18:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: /close the club/i }));

    await vi.waitFor(() =>
      expect(screen.getByText(/reason is required/i)).toBeInTheDocument(),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("disables the submit button while isSubmitting is true", () => {
    renderWithIntl(
      <NewClubClosureForm onSubmit={vi.fn()} isSubmitting={true} />,
    );

    expect(screen.getByRole("button", { name: /closing/i })).toBeDisabled();
  });
});
