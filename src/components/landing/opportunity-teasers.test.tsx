import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { OpportunityTeasers } from "./opportunity-teasers";

describe("OpportunityTeasers", () => {
  it("shows only public teaser fields with member overlay", () => {
    render(
      <OpportunityTeasers
        opportunities={[
          { id: "opp-1", title: "Terrain à Cocody", location: "Abidjan", category: "IMMOBILIER" },
        ]}
      />,
    );

    expect(screen.getByText("Terrain à Cocody")).toBeInTheDocument();
    expect(screen.getByText("Abidjan")).toBeInTheDocument();
    expect(screen.getByText("Devenez membre pour voir les détails")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /S'inscrire pour postuler/i })).toHaveAttribute("href", "/auth/signup");
    expect(screen.queryByText(/€/)).not.toBeInTheDocument();
    expect(screen.queryByText(/WhatsApp/i)).not.toBeInTheDocument();
  });

  it("opens signup/signin modal from public interest CTA without calling API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <OpportunityTeasers
        opportunities={[
          { id: "opp-1", title: "Terrain à Cocody", location: "Abidjan", category: "IMMOBILIER" },
        ]}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Intéressé(e)" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(await screen.findByText("Connectez-vous pour marquer votre intérêt")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "S'inscrire" })).toHaveAttribute("href", "/auth/signup");
    expect(screen.getByRole("link", { name: "Se connecter" })).toHaveAttribute("href", "/auth/signin");
  });
});
