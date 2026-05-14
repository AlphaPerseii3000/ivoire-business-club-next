import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { PricingTierSelection } from "./pricing-tier-selection";

describe("PricingTierSelection", () => {
  it("lets a connected member select a tier and reveals one Continuer action", async () => {
    const user = userEvent.setup();
    render(<PricingTierSelection isAuthenticated />);

    expect(screen.queryByRole("link", { name: "Continuer" })).not.toBeInTheDocument();

    const cards = screen.getAllByTestId("tier-card");
    await user.click(within(cards[1]!).getByRole("button", { name: "Sélectionner" }));

    expect(within(cards[1]!).getByText("✓ Sélectionné")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Continuer" })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Continuer" })).toHaveAttribute(
      "href",
      "/pricing/virement?tier=GRAND_FRERE"
    );
  });

  it("keeps public visitors on signup/signin guidance without subscription creation actions", () => {
    render(<PricingTierSelection isAuthenticated={false} />);

    expect(screen.queryByRole("link", { name: "Continuer" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Choisir|Rejoins/i })[0]).toHaveAttribute("href", "/auth/signup");
    expect(screen.getByRole("link", { name: "Connecte-toi" })).toHaveAttribute("href", "/auth/signin");
  });
});
