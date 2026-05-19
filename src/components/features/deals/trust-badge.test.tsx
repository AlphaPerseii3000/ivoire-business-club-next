import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TrustBadge } from "./trust-badge";

describe("TrustBadge", () => {
  it("renders the bronze accessible label and required colors", () => {
    render(<TrustBadge level="bronze" />);

    const badge = screen.getByLabelText(/Niveau de confiance Bronze/);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("text-[#B45309]", "bg-[#FFFBEB]", "border-[#FCD34D]");
    expect(screen.getByText("Documents juridiques uploadés par le porteur.")).toHaveClass("sr-only");
  });

  it("keeps argent as legacy default", () => {
    render(<TrustBadge />);

    expect(screen.getByLabelText(/Niveau de confiance Argent/)).toBeInTheDocument();
    expect(screen.getByText("Argent")).toBeInTheDocument();
  });

  it("renders or with motion-safe pulse only when animated", () => {
    render(<TrustBadge level="or" animated />);

    const badge = screen.getByLabelText(/Niveau de confiance Or/);
    expect(badge).toHaveClass("text-[#D97706]", "bg-[#FEF3C7]", "border-[#F59E0B]", "motion-safe:animate-pulse");
  });
});
