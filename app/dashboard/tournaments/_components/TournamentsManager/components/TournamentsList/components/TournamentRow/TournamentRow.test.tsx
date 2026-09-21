// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/es.json";
import { TournamentRow } from "./TournamentRow";

afterEach(cleanup);

function renderRow(
  props: Partial<React.ComponentProps<typeof TournamentRow>> = {},
) {
  const defaultProps: React.ComponentProps<typeof TournamentRow> = {
    tournament: { id: "t1", name: "Summer Open", status: "DRAFT" },
    isSelected: false,
    onSelect: vi.fn(),
    onPublish: vi.fn(),
    isPublishing: false,
  };
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <TournamentRow {...defaultProps} {...props} />
    </NextIntlClientProvider>,
  );
}

describe("TournamentRow", () => {
  it("calls onSelect with the tournament's id when clicked", () => {
    const onSelect = vi.fn();
    renderRow({ onSelect });

    fireEvent.click(screen.getByRole("button", { name: /summer open/i }));

    expect(onSelect).toHaveBeenCalledWith("t1");
  });

  it("shows a Publicar button for a DRAFT tournament", () => {
    renderRow({
      tournament: { id: "t1", name: "Summer Open", status: "DRAFT" },
    });

    expect(
      screen.getByRole("button", { name: /publicar/i }),
    ).toBeInTheDocument();
  });

  it("hides the Publicar button for a non-DRAFT tournament", () => {
    renderRow({
      tournament: {
        id: "t1",
        name: "Summer Open",
        status: "REGISTRATION_OPEN",
      },
    });

    expect(
      screen.queryByRole("button", { name: /publicar/i }),
    ).not.toBeInTheDocument();
  });

  it("calls onPublish with the tournament's id, without triggering onSelect", () => {
    const onPublish = vi.fn();
    const onSelect = vi.fn();
    renderRow({ onPublish, onSelect });

    fireEvent.click(screen.getByRole("button", { name: /publicar/i }));

    expect(onPublish).toHaveBeenCalledWith("t1");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("disables the Publicar button while isPublishing", () => {
    renderRow({ isPublishing: true });

    expect(screen.getByRole("button", { name: /publicando/i })).toBeDisabled();
  });
});
