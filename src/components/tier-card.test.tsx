import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TierCard } from "./tier-card";

describe("TierCard", () => {
  it("renders the exact tier label, price, benefits, and CTA", () => {
    render(<TierCard tier="GRAND_FRERE" actionLabel="Choisir Grands Frères" href="/auth/signup" />);

    expect(screen.getByRole("heading", { name: "Grands Frères" })).toBeInTheDocument();
    expect(screen.getByText("€59/mois")).toBeInTheDocument();
    expect(screen.getByText(/deals prioritaires \+ events/i)).toBeInTheDocument();
    expect(screen.getByText("Accès aux deals prioritaires")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Choisir Grands Frères" })).toHaveAttribute("href", "/auth/signup");
  });

  it("shows selected and current states with text and checkmarks, not color alone", () => {
    render(<TierCard tier="BOSS" isSelected isCurrent actionLabel="Offre actuelle" />);

    expect(screen.getByText("✓ Sélectionné")).toBeInTheDocument();
    expect(screen.getByText("✓ Offre actuelle")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Offre actuelle" })).toHaveAttribute("aria-pressed", "true");
  });

  it("supports non-mutating selection callbacks", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(<TierCard tier="AFFRANCHI" actionLabel="Choisir" onSelect={onSelect} />);
    await user.click(screen.getByRole("button", { name: "Choisir" }));

    expect(onSelect).toHaveBeenCalledWith("AFFRANCHI");
  });

  it("keeps the action touch target at least 44px high", () => {
    render(<TierCard tier="AFFRANCHI" actionLabel="Choisir" href="/auth/signup" />);

    expect(screen.getByRole("link", { name: "Choisir" })).toHaveClass("min-h-11");
  });
});
