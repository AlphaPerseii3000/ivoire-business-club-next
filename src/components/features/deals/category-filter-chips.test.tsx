import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CategoryFilterChips } from "./category-filter-chips";

const mockUseSearchParams = vi.hoisted(() => vi.fn(() => new URLSearchParams()));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/opportunities",
  useSearchParams: mockUseSearchParams,
}));

describe("CategoryFilterChips", () => {
  it("renders horizontal category chips with active state and reset link", async () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("category=BUSINESS"));

    render(<CategoryFilterChips activeCategory="BUSINESS" />);

    expect(screen.getByRole("link", { name: "Toutes" })).toHaveAttribute("href", "/dashboard/opportunities");
    expect(screen.getByRole("link", { name: "Business" })).toHaveAttribute("href", "/dashboard/opportunities?category=BUSINESS");
    expect(screen.getByRole("link", { name: "Business" })).toHaveClass("bg-primary");
    await userEvent.tab();
    expect(screen.getByRole("link", { name: "Toutes" })).toHaveFocus();
  });
});
