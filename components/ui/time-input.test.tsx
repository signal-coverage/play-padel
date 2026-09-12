// @vitest-environment jsdom
import * as React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { TimeInput } from "./time-input";

// jsdom doesn't implement ResizeObserver, but Radix's floating-ui positioning
// (used internally by Popover) relies on it — same stub other Radix-backed
// component tests in this repo use (see CourtFormSheet.test.tsx).
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function getTimeTextbox() {
  return screen.getByPlaceholderText("HH:mm") as HTMLInputElement;
}

function ControlledTimeInput({
  initialValue,
  onChangeSpy,
}: {
  initialValue: string;
  onChangeSpy: (value: string) => void;
}) {
  const [value, setValue] = React.useState(initialValue);
  return (
    <TimeInput
      value={value}
      onChange={(next) => {
        setValue(next);
        onChangeSpy(next);
      }}
    />
  );
}

describe("TimeInput", () => {
  it("commits and formats live once 4 valid digits are typed", () => {
    const onChange = vi.fn();
    render(<TimeInput value="" onChange={onChange} />);

    fireEvent.change(getTimeTextbox(), { target: { value: "1030" } });

    expect(getTimeTextbox()).toHaveValue("10:30");
    expect(onChange).toHaveBeenCalledWith("10:30");
  });

  it("commits '05:00' on blur after typing a single digit", () => {
    const onChange = vi.fn();
    render(<TimeInput value="" onChange={onChange} />);

    fireEvent.change(getTimeTextbox(), { target: { value: "5" } });
    fireEvent.blur(getTimeTextbox());

    expect(onChange).toHaveBeenCalledWith("05:00");
    expect(getTimeTextbox()).toHaveValue("05:00");
  });

  it("commits '10:00' on blur after typing two digits", () => {
    const onChange = vi.fn();
    render(<TimeInput value="" onChange={onChange} />);

    fireEvent.change(getTimeTextbox(), { target: { value: "10" } });
    fireEvent.blur(getTimeTextbox());

    expect(onChange).toHaveBeenCalledWith("10:00");
  });

  it("commits '09:30' on blur after typing three digits (hour, then minute pair)", () => {
    const onChange = vi.fn();
    render(<TimeInput value="" onChange={onChange} />);

    fireEvent.change(getTimeTextbox(), { target: { value: "930" } });
    fireEvent.blur(getTimeTextbox());

    expect(onChange).toHaveBeenCalledWith("09:30");
  });

  it("reverts to the original value and does not call onChange when blurring an invalid time", () => {
    const onChange = vi.fn();
    render(<TimeInput value="08:00" onChange={onChange} />);

    fireEvent.change(getTimeTextbox(), { target: { value: "99" } });
    fireEvent.blur(getTimeTextbox());

    expect(onChange).not.toHaveBeenCalled();
    expect(getTimeTextbox()).toHaveValue("08:00");
  });

  it("commits on Enter the same way as blur, without submitting a surrounding form", () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <TimeInput value="" onChange={onChange} />
      </form>,
    );

    fireEvent.change(getTimeTextbox(), { target: { value: "10" } });
    fireEvent.keyDown(getTimeTextbox(), { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith("10:00");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  describe("picker", () => {
    it("opens on clock icon click and lets picking hour then minute drive onChange", async () => {
      const onChange = vi.fn();
      render(
        <ControlledTimeInput initialValue="09:00" onChangeSpy={onChange} />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Open time picker" }));

      const hourButton = await screen.findByRole("button", { name: "14" });
      fireEvent.click(hourButton);

      expect(onChange).toHaveBeenNthCalledWith(1, "14:00");

      const minuteButton = await screen.findByRole("button", { name: "30" });
      fireEvent.click(minuteButton);

      expect(onChange).toHaveBeenNthCalledWith(2, "14:30");
      expect(onChange).toHaveBeenCalledTimes(2);
    });
  });
});
