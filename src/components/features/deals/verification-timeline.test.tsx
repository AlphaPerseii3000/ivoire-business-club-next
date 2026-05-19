import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { VerificationTimeline } from "./verification-timeline";

describe("VerificationTimeline", () => {
  it("renders the three fixed French steps", () => {
    render(<VerificationTimeline documentCount={1} verificationStatus="EN_COURS" trustLevel="bronze" />);

    expect(screen.getByText("Documents uploadés")).toBeInTheDocument();
    expect(screen.getByText("Vérifié par IBC")).toBeInTheDocument();
    expect(screen.getByText("Reviews communautaires")).toBeInTheDocument();
    expect(screen.getByText("Étape 1 — complétée")).toBeInTheDocument();
    expect(screen.getByText("Étape 2 — en cours")).toBeInTheDocument();
  });

  it("marks double verification complete when two approvals exist", () => {
    render(
      <VerificationTimeline
        documentCount={2}
        verificationStatus="VERIFIED"
        trustLevel="argent"
        requiresDoubleVerification
        approvalCount={2}
      />,
    );

    expect(screen.getByText("Double vérification complétée (2/2)")).toBeInTheDocument();
    expect(screen.getAllByText(/complétée/).length).toBeGreaterThanOrEqual(2);
  });

  it("marks community reviews complete for gold criteria", () => {
    render(
      <VerificationTimeline
        documentCount={2}
        verificationStatus="VERIFIED"
        trustLevel="or"
        averageRating={4.7}
        validatedDealsCount={3}
      />,
    );

    expect(screen.getByText("Confiance communautaire élevée")).toBeInTheDocument();
  });
});
