import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PlatinumBadge } from "./platinum-badge";
import { PlatinumConfetti } from "./platinum-confetti";
import { ReliabilityScore } from "./reliability-score";

describe("reputation components", () => {
  it("renders a reliability score with French formatting and review count", () => {
    render(<ReliabilityScore averageRating={4.7} reviewCount={12} />);

    expect(screen.getByText("Score de fiabilité IBC")).toBeInTheDocument();
    expect(screen.getByLabelText("4,7 sur 5 étoiles")).toBeInTheDocument();
    expect(screen.getByText("4,7/5")).toBeInTheDocument();
    expect(screen.getByText("12 avis reçus")).toBeInTheDocument();
  });

  it("renders the no-score state without fake stars or a fake numeric score", () => {
    render(<ReliabilityScore averageRating={null} reviewCount={0} />);

    expect(screen.getByText("Pas encore d'avis reçus")).toBeInTheDocument();
    expect(screen.queryByText(/\/5/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/étoiles/)).not.toBeInTheDocument();
  });

  it("renders active Platinum with accessible tooltip copy", () => {
    render(<PlatinumBadge state="active" />);

    expect(screen.getByLabelText("Membre distingué : 3+ deals validés et excellentes reviews")).toBeInTheDocument();
    expect(screen.getByText("Membre Platinum")).toBeInTheDocument();
    expect(screen.queryByText("À maintenir")).not.toBeInTheDocument();
  });

  it("renders maintain Platinum with visible indicator", () => {
    render(<PlatinumBadge state="maintain" />);

    expect(screen.getByText("Membre Platinum")).toBeInTheDocument();
    expect(screen.getByText("À maintenir")).toBeInTheDocument();
    expect(screen.getByLabelText(/continuez à préserver la qualité/)).toBeInTheDocument();
  });

  it("hides the badge for none state", () => {
    render(<PlatinumBadge state="none" />);

    expect(screen.queryByText("Membre Platinum")).not.toBeInTheDocument();
  });

  it("renders reduced-motion-safe confetti only when requested", () => {
    const { rerender } = render(<PlatinumConfetti show={false} />);

    expect(screen.queryByTestId("platinum-confetti")).not.toBeInTheDocument();

    rerender(<PlatinumConfetti show />);

    expect(screen.getByTestId("platinum-confetti")).toHaveClass("motion-reduce:hidden");
    expect(screen.getByText("Membre Platinum débloqué")).toHaveClass("sr-only");
  });
});
