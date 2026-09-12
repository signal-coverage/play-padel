// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { CategoryTabs } from "./CategoryTabs";

afterEach(cleanup);

const CATEGORIES = [
  { id: "cat_1", name: "Category A" },
  { id: "cat_2", name: "Category B" },
];

describe("CategoryTabs", () => {
  it("renders a button per category", () => {
    render(
      <CategoryTabs
        categories={CATEGORIES}
        selectedCategoryId="cat_1"
        onSelect={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Category A" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Category B" }),
    ).toBeInTheDocument();
  });

  it("marks the selected category's button as pressed", () => {
    render(
      <CategoryTabs
        categories={CATEGORIES}
        selectedCategoryId="cat_2"
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Category B" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Category A" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("calls onSelect with the clicked category's id", () => {
    const onSelect = vi.fn();
    render(
      <CategoryTabs
        categories={CATEGORIES}
        selectedCategoryId="cat_1"
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Category B" }));

    expect(onSelect).toHaveBeenCalledWith("cat_2");
  });
});
