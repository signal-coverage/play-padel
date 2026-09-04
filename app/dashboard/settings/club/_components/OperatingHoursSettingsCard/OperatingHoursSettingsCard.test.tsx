// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  cleanup,
  fireEvent,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OperatingHoursSettingsCard } from "./OperatingHoursSettingsCard";
import type { AvailabilityEntry } from "@/core/courts/types";

function renderCard(getEntries: AvailabilityEntry[]) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (url === "/api/clubs/operating-hours" && (!init || !init.method)) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ operatingHours: getEntries }),
      });
    }
    if (url === "/api/clubs/operating-hours" && init?.method === "PUT") {
      const entries = JSON.parse(init.body as string);
      return Promise.resolve({
        ok: true,
        json: async () => ({ operatingHours: entries }),
      });
    }
    throw new Error(`unexpected fetch: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <OperatingHoursSettingsCard />
    </QueryClientProvider>,
  );

  return { ...utils, fetchMock, queryClient };
}

describe("OperatingHoursSettingsCard", () => {
  afterEach(() => {
    // This repo's vitest.config.mts does not enable `test.globals`, so
    // @testing-library/react's automatic afterEach(cleanup) registration
    // never fires — clean up the DOM explicitly between tests instead.
    cleanup();
    vi.unstubAllGlobals();
  });

  it("loads and displays the fetched operating hours", async () => {
    renderCard([{ dayOfWeek: 1, startTime: "08:00", endTime: "18:00" }]);

    await waitFor(() =>
      expect(screen.getByDisplayValue("08:00")).toBeInTheDocument(),
    );
    expect(screen.getByDisplayValue("18:00")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Monday" })).toBeChecked();
    expect(screen.getByRole("switch", { name: "Sunday" })).not.toBeChecked();
  });

  it("toggling a day and clicking Save calls PUT with the right body", async () => {
    const { fetchMock } = renderCard([]);

    await waitFor(() =>
      expect(
        screen.getByRole("switch", { name: "Sunday" }),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("switch", { name: "Sunday" }));
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) =>
            url === "/api/clubs/operating-hours" && init?.method === "PUT",
        ),
      ).toBe(true),
    );

    const putCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        url === "/api/clubs/operating-hours" && init?.method === "PUT",
    );
    const body = JSON.parse((putCall?.[1]?.body as string) ?? "[]");
    expect(body).toEqual([
      { dayOfWeek: 0, startTime: "09:00", endTime: "21:00" },
    ]);
  });

  it("keeps Save enabled for an overnight-shaped entry whose end time is before its start time", async () => {
    const { container } = renderCard([
      { dayOfWeek: 1, startTime: "09:00", endTime: "21:00" },
    ]);

    await waitFor(() =>
      expect(container.querySelector("#day-1-end")).toHaveValue("21:00"),
    );
    expect(
      screen.getByRole("button", { name: /save changes/i }),
    ).not.toBeDisabled();

    const mondayEndInput = container.querySelector("#day-1-end");
    expect(mondayEndInput).not.toBeNull();
    fireEvent.change(mondayEndInput as Element, {
      target: { value: "08:00" },
    });

    expect(
      screen.getByRole("button", { name: /save changes/i }),
    ).not.toBeDisabled();
  });

  it("disables Save when an active day's end time equals its start time", async () => {
    const { container } = renderCard([
      { dayOfWeek: 1, startTime: "09:00", endTime: "21:00" },
    ]);

    await waitFor(() =>
      expect(container.querySelector("#day-1-end")).toHaveValue("21:00"),
    );

    const mondayEndInput = container.querySelector("#day-1-end");
    expect(mondayEndInput).not.toBeNull();
    fireEvent.change(mondayEndInput as Element, {
      target: { value: "09:00" },
    });

    expect(
      screen.getByRole("button", { name: /save changes/i }),
    ).toBeDisabled();
  });
});
