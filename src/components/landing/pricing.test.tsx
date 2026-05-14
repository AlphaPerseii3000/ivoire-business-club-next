import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Pricing } from "./pricing";

describe("landing Pricing", () => {
  it("renders exactly three shared tier cards with the corrected Grands Frères monthly price", () => {
    render(<Pricing />);

    const section = screen.getByRole("region", { name: "Nos offres" });
    const cards = within(section).getAllByTestId("tier-card");

    expect(cards).toHaveLength(3);
    expect(within(cards[0]!).getByText("€29/mois")).toBeInTheDocument();
    expect(within(cards[1]!).getByText("€49/mois")).toBeInTheDocument();
    expect(within(cards[2]!).getByText("€99/mois")).toBeInTheDocument();
  });
});
