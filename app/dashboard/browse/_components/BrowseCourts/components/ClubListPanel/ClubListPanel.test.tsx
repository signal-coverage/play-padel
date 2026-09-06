// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { ClubListPanel } from "./ClubListPanel";
import type { ClubBrowseSummary } from "../../types";

// jsdom doesn't implement ResizeObserver, but DataTable (rendered inside
// ClubListPanel) relies on it internally.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// jsdom never actually loads image resources, so Radix's Avatar.Image (only
// renders its <img> once a real `window.Image()` fires `onload`) would
// otherwise stay stuck "loading" forever — same stub
// ClubSettingsView.test.tsx uses for the same Radix internal.
class ImageStub {
  complete = false;
  naturalWidth = 0;
  private _src = "";
  private listeners: Record<string, Array<() => void>> = {};
  addEventListener(type: string, listener: () => void) {
    (this.listeners[type] ??= []).push(listener);
  }
  removeEventListener(type: string, listener: () => void) {
    this.listeners[type] = (this.listeners[type] ?? []).filter(
      (l) => l !== listener,
    );
  }
  set src(value: string) {
    this._src = value;
    if (value) {
      const event = { currentTarget: this } as unknown as Event;
      setTimeout(() => {
        this.complete = true;
        this.naturalWidth = 1;
        this.listeners.load?.forEach((l) => (l as (e: Event) => void)(event));
      }, 0);
    }
  }
  get src() {
    return this._src;
  }
}

function makeClub(
  overrides: Partial<ClubBrowseSummary> = {},
): ClubBrowseSummary {
  return {
    id: "club_1",
    name: "Club Padel Norte",
    email: "club@example.com",
    timezone: "America/Argentina/Buenos_Aires",
    currency: "ARS",
    plan: "BASIC",
    status: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: "owner-1",
    updatedBy: "owner-1",
    courtCount: 3,
    hasAvailabilityToday: true,
    ...overrides,
  };
}

function renderPanel(clubs: ClubBrowseSummary[]) {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  return render(
    <ClubListPanel
      clubs={clubs}
      selectedClubId={null}
      onSelectClub={() => {}}
      isLoading={false}
      isError={false}
    />,
    {
      wrapper: ({ children }) => (
        <NuqsTestingAdapter>{children}</NuqsTestingAdapter>
      ),
    },
  );
}

describe("ClubListPanel club photo", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders the club's ownerPhotoUrl in the avatar", async () => {
    vi.stubGlobal("Image", ImageStub);
    const { container } = renderPanel([
      makeClub({ ownerPhotoUrl: "https://img.example/owner.png" }),
    ]);

    await waitFor(() =>
      expect(container.querySelector("img")).toBeInTheDocument(),
    );
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "https://img.example/owner.png",
    );
  });

  it("falls back to initials when the club has no ownerPhotoUrl", () => {
    const { container } = renderPanel([
      makeClub({ ownerPhotoUrl: null, name: "Club Padel Norte" }),
    ]);

    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(screen.getByText("CP")).toBeInTheDocument();
  });
});
