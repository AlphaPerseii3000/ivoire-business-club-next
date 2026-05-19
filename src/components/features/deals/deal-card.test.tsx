import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DealCard } from "./deal-card";

describe("DealCard", () => {
  it("renders mobile deal signals including document count and WhatsApp CTA", () => {
    render(
      <DealCard
        deal={{
          id: "opp-1",
          title: "Terrain à Cocody",
          amount: 25000,
          location: "Abidjan",
          verificationStatus: "VERIFIED",
          documentCount: 3,
          author: { phone: "+225 01 02 03 04" },
        }}
      />,
    );

    expect(screen.getByText("Terrain à Cocody")).toBeInTheDocument();
    expect(screen.getByText("Abidjan")).toBeInTheDocument();
    expect(screen.getByText(/25\s*000 €/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Niveau de confiance Argent/)).toBeInTheDocument();
    expect(screen.getByLabelText("3 document(s)")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Contacter sur WhatsApp" })).toHaveAttribute("href", expect.stringContaining("https://wa.me/22501020304"));
  });

  it("shows disabled WhatsApp button with tooltip when author phone is missing", () => {
    render(
      <DealCard
        deal={{
          id: "opp-1",
          title: "Terrain à Cocody",
          amount: null,
          location: "Abidjan",
          verificationStatus: "VERIFIED",
          documentCount: 0,
          author: { phone: null },
        }}
      />,
    );

    const button = screen.getByRole("button", { name: "Contacter sur WhatsApp" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("data-slot", "tooltip-trigger");
    expect(button.className).toContain("cursor-not-allowed");
    expect(button.className).toContain("opacity-60");
  });
});