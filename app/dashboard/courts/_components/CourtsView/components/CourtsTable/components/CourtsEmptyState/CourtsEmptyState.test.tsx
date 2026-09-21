// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/es.json";
import { CourtsEmptyState } from "./CourtsEmptyState";

afterEach(() => {
  // This repo's vitest.config.mts does not enable `test.globals`, so
  // @testing-library/react's automatic afterEach(cleanup) registration
  // never fires — clean up the DOM explicitly between tests instead.
  cleanup();
});

describe("CourtsEmptyState", () => {
  it("renders an image above the exact empty-state message", () => {
    render(
      <NextIntlClientProvider locale="es" messages={messages}>
        <CourtsEmptyState />
      </NextIntlClientProvider>,
    );

    const message = screen.getByText(
      "Todavía no hay canchas. Creá tu primera cancha para empezar.",
    );
    expect(message).toBeInTheDocument();

    const image = document.querySelector("img");
    expect(image).not.toBeNull();
  });
});
