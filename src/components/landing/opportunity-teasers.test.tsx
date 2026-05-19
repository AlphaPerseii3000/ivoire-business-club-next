import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OpportunityTeasers } from "./opportunity-teasers";

describe("OpportunityTeasers", () => {
  it("shows only public teaser fields with member overlay", () => {
    render(
      <OpportunityTeasers
        opportunities={[
          { id: "opp-1", title: "Terrain à Cocody", location: "Abidjan" },
        ]}
      />,
    );

    expect(screen.getByText("Terrain à Cocody")).toBeInTheDocument();
    expect(screen.getByText("Abidjan")).toBeInTheDocument();
    expect(screen.getByText("Devenez membre pour voir les détails")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Terrain à Cocody/i })).toHaveAttribute("href", "/auth/signup");
    expect(screen.queryByText(/€/)).not.toBeInTheDocument();
    expect(screen.queryByText(/WhatsApp/i)).not.toBeInTheDocument();
  });
});
