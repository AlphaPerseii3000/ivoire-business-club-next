import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PricingPage from "./page";

const mockAuth = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

describe("PricingPage", () => {
  it("renders exactly three shared tier cards in the required order with monthly EUR prices", async () => {
    mockAuth.mockResolvedValueOnce(null);
    render(await PricingPage());

    const cards = screen.getAllByTestId("tier-card");
    expect(cards).toHaveLength(3);

    expect(within(cards[0]!).getByRole("heading", { name: "Affranchis" })).toBeInTheDocument();
    expect(within(cards[0]!).getByText("€29/mois")).toBeInTheDocument();
    expect(within(cards[1]!).getByRole("heading", { name: "Grands Frères" })).toBeInTheDocument();
    expect(within(cards[1]!).getByText("€49/mois")).toBeInTheDocument();
    expect(within(cards[2]!).getByRole("heading", { name: "Boss" })).toBeInTheDocument();
    expect(within(cards[2]!).getByText("€99/mois")).toBeInTheDocument();
  });

  it("uses a mobile-first one-column then desktop three-column grid", async () => {
    mockAuth.mockResolvedValueOnce(null);
    render(await PricingPage());

    expect(screen.getByTestId("pricing-tier-grid")).toHaveClass("grid-cols-1", "md:grid-cols-3");
  });
});
