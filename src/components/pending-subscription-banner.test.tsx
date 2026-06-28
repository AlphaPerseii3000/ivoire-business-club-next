import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PendingSubscriptionBanner } from "./pending-subscription-banner";

describe("PendingSubscriptionBanner", () => {
  it("renders with BOSS tier label and correct payment link", () => {
    render(<PendingSubscriptionBanner tier="BOSS" />);
    expect(screen.getByText("Votre offre Les Boss est en attente d'activation")).toBeInTheDocument();
    expect(screen.getByText("Finalisez votre paiement pour débloquer les opportunités business, le matching et les profils membres.")).toBeInTheDocument();
    const cta = screen.getByTestId("pending-subscription-cta");
    expect(cta).toHaveAttribute("href", "/pricing/virement?tier=BOSS");
  });

  it("renders with AFFRANCHI tier label and correct payment link", () => {
    render(<PendingSubscriptionBanner tier="AFFRANCHI" />);
    expect(screen.getByText("Votre offre Les Affranchis est en attente d'activation")).toBeInTheDocument();
    expect(screen.getByTestId("pending-subscription-cta")).toHaveAttribute("href", "/pricing/virement?tier=AFFRANCHI");
  });

  it("renders with GRAND_FRERE tier label and correct payment link", () => {
    render(<PendingSubscriptionBanner tier="GRAND_FRERE" />);
    expect(screen.getByText("Votre offre Les Grands Frères est en attente d'activation")).toBeInTheDocument();
    expect(screen.getByTestId("pending-subscription-cta")).toHaveAttribute("href", "/pricing/virement?tier=GRAND_FRERE");
  });

  it("has the correct data-testid on the banner section", () => {
    render(<PendingSubscriptionBanner tier="BOSS" />);
    expect(screen.getByTestId("pending-subscription-banner")).toBeInTheDocument();
  });

  it("has the correct data-testid on the CTA link", () => {
    render(<PendingSubscriptionBanner tier="BOSS" />);
    expect(screen.getByTestId("pending-subscription-cta")).toBeInTheDocument();
  });
});
