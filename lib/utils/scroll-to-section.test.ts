import { afterEach, describe, expect, it, vi } from "vitest";
import { scrollToSection } from "./scroll-to-section";

function createEvent() {
  return { preventDefault: vi.fn() };
}

function setBrowserState({
  pathname = "/",
  target = null,
}: {
  pathname?: string;
  target?: { scrollIntoView: ReturnType<typeof vi.fn> } | null;
} = {}) {
  const getElementById = vi.fn().mockReturnValue(target);
  const location = { pathname, href: "" };
  vi.stubGlobal("document", { getElementById });
  vi.stubGlobal("window", { location });
  return { getElementById, location };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("scrollToSection", () => {
  it.each(["/terms", "", "#"])(
    "leaves non-section href %j to normal link behavior",
    (href) => {
      const event = createEvent();
      const { getElementById } = setBrowserState();

      scrollToSection(event as never, href);

      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(getElementById).not.toHaveBeenCalled();
    },
  );

  it("smooth-scrolls to an existing section and prevents native navigation", () => {
    const event = createEvent();
    const target = { scrollIntoView: vi.fn() };
    const { getElementById } = setBrowserState({ target });

    scrollToSection(event as never, "#pricing");

    expect(getElementById).toHaveBeenCalledWith("pricing");
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(target.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
  });

  it("leaves a missing section on the home page to native hash behavior", () => {
    const event = createEvent();
    const { location } = setBrowserState({ pathname: "/" });

    scrollToSection(event as never, "#faq");

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(location.href).toBe("");
  });

  it("redirects a missing section on another page back to the home page hash", () => {
    const event = createEvent();
    const { location } = setBrowserState({ pathname: "/privacy" });

    scrollToSection(event as never, "#faq");

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(location.href).toBe("/#faq");
  });
});
