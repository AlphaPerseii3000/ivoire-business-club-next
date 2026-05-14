import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import SubscriptionStatusTracker from "./subscription-status-tracker";

describe("SubscriptionStatusTracker", () => {
  it("renders timestamps and pending current state for the bank-transfer lifecycle", () => {
    render(
      <SubscriptionStatusTracker
        status="PENDING"
        submittedAt={new Date(2026, 4, 14, 10, 30)}
      />
    );

    expect(screen.getByText("Essai")).toBeInTheDocument();
    expect(screen.getByText("En attente")).toBeInTheDocument();
    expect(screen.getByText("Actif")).toBeInTheDocument();
    expect(screen.getByText("Paiement par virement en cours")).toBeInTheDocument();
    expect(screen.getAllByText(/14 mai 2026/).length).toBeGreaterThan(0);
  });

  it("renders active completion timestamp", () => {
    render(
      <SubscriptionStatusTracker
        status="ACTIVE"
        submittedAt={new Date(2026, 4, 13, 9, 0)}
        validatedAt={new Date(2026, 4, 14, 11, 15)}
      />
    );

    expect(screen.getByText("Abonnement confirmé")).toBeInTheDocument();
    expect(screen.getByText(/14 mai 2026/)).toBeInTheDocument();
  });

  it("renders invalid subscription explanatory copy without hiding lifecycle", () => {
    render(
      <SubscriptionStatusTracker
        status="CANCELLED"
        cancelledAt={new Date(2026, 4, 15, 8, 0)}
      />
    );

    expect(screen.getByText("Abonnement annulé")).toBeInTheDocument();
    expect(screen.getByText(/Votre abonnement n'est plus actif/)).toBeInTheDocument();
    expect(screen.getByText("Essai")).toBeInTheDocument();
    expect(screen.getByText("Actif")).toBeInTheDocument();
  });
});
