// @vitest-environment jsdom
import type * as React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/es.json";
import { ClubClosuresList } from "./ClubClosuresList";
import type { ClubClosure } from "../../types";

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const noopCancel = () => {};

function makeClosure(overrides: Partial<ClubClosure> = {}): ClubClosure {
  return {
    id: "closure_1",
    courtId: "court_1",
    courtName: "Court 1",
    startsAt: new Date(Date.now() + 60_000),
    endsAt: new Date(Date.now() + 120_000),
    reason: "Club rented for a tournament",
    createdAt: new Date(),
    createdBy: "user_1",
    ...overrides,
  };
}

describe("ClubClosuresList", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows an empty state when there are no closures", () => {
    renderWithIntl(
      <ClubClosuresList
        closures={[]}
        onCancel={noopCancel}
        cancellingClosureId={null}
      />,
    );

    expect(screen.getByText(/todavía no hay cierres/i)).toBeInTheDocument();
  });

  it("renders each closure's reason and owning court name", () => {
    renderWithIntl(
      <ClubClosuresList
        closures={[
          makeClosure({ courtName: "Court 1" }),
          makeClosure({
            id: "closure_2",
            courtName: "Court 2",
            reason: "Second court event",
          }),
        ]}
        onCancel={noopCancel}
        cancellingClosureId={null}
      />,
    );

    expect(
      screen.getByText("Club rented for a tournament"),
    ).toBeInTheDocument();
    expect(screen.getByText("Second court event")).toBeInTheDocument();
    expect(screen.getByText(/Court 1/)).toBeInTheDocument();
    expect(screen.getByText(/Court 2/)).toBeInTheDocument();
  });

  it("badges an upcoming/ongoing closure as Active", () => {
    renderWithIntl(
      <ClubClosuresList
        closures={[
          makeClosure({
            startsAt: new Date(Date.now() - 60_000),
            endsAt: new Date(Date.now() + 60_000),
          }),
        ]}
        onCancel={noopCancel}
        cancellingClosureId={null}
      />,
    );

    expect(screen.getByText("Activo")).toBeInTheDocument();
  });

  it("badges a closure whose endsAt has already passed as Past", () => {
    renderWithIntl(
      <ClubClosuresList
        closures={[
          makeClosure({
            startsAt: new Date(Date.now() - 120_000),
            endsAt: new Date(Date.now() - 60_000),
          }),
        ]}
        onCancel={noopCancel}
        cancellingClosureId={null}
      />,
    );

    expect(screen.getByText("Pasado")).toBeInTheDocument();
  });

  it("badges a cancelled closure as Cancelled even if it hasn't ended yet", () => {
    renderWithIntl(
      <ClubClosuresList
        closures={[
          makeClosure({
            startsAt: new Date(Date.now() - 60_000),
            endsAt: new Date(Date.now() + 60_000),
            cancelledAt: new Date(),
          }),
        ]}
        onCancel={noopCancel}
        cancellingClosureId={null}
      />,
    );

    expect(screen.getByText("Cancelado")).toBeInTheDocument();
  });

  it("shows a Cancel button only for an active closure", () => {
    renderWithIntl(
      <ClubClosuresList
        closures={[
          makeClosure({
            id: "closure_active",
            startsAt: new Date(Date.now() - 60_000),
            endsAt: new Date(Date.now() + 60_000),
          }),
          makeClosure({
            id: "closure_past",
            startsAt: new Date(Date.now() - 120_000),
            endsAt: new Date(Date.now() - 60_000),
          }),
        ]}
        onCancel={noopCancel}
        cancellingClosureId={null}
      />,
    );

    expect(screen.getAllByRole("button", { name: /cancelar/i })).toHaveLength(
      1,
    );
  });

  it("calls onCancel with the closure id when its Cancel button is clicked", () => {
    const onCancel = vi.fn();
    renderWithIntl(
      <ClubClosuresList
        closures={[
          makeClosure({
            id: "closure_active",
            startsAt: new Date(Date.now() - 60_000),
            endsAt: new Date(Date.now() + 60_000),
          }),
        ]}
        onCancel={onCancel}
        cancellingClosureId={null}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(onCancel).toHaveBeenCalledWith("closure_active");
  });

  it("disables and relabels the Cancel button for the closure currently being cancelled", () => {
    renderWithIntl(
      <ClubClosuresList
        closures={[
          makeClosure({
            id: "closure_active",
            startsAt: new Date(Date.now() - 60_000),
            endsAt: new Date(Date.now() + 60_000),
          }),
        ]}
        onCancel={noopCancel}
        cancellingClosureId="closure_active"
      />,
    );

    const button = screen.getByRole("button", { name: /cancelando/i });
    expect(button).toBeDisabled();
  });
});
