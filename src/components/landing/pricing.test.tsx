import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Pricing } from "./pricing";

describe("landing Pricing", () => {
  it("renders exactly three shared tier cards with the corrected Grands Frères monthly price and uppercase tier CTA links", () => {
    render(<Pricing />);

    const section = screen.getByRole("region", { name: "Nos offres" });
    const cards = within(section).getAllByTestId("tier-card");

    expect(cards).toHaveLength(3);
    expect(within(cards[0]!).getByText("€29/mois")).toBeInTheDocument();
    expect(within(cards[1]!).getByText("€59/mois")).toBeInTheDocument();
    expect(within(cards[2]!).getByText("€129/mois")).toBeInTheDocument();

    // Verify correct uppercase tier redirect URLs
    expect(within(cards[0]!).getByRole("link", { name: "Choisir Affranchis" })).toHaveAttribute(
      "href",
      "/auth/signup?tier=AFFRANCHI"
    );
    expect(within(cards[1]!).getByRole("link", { name: "Choisir Grands Frères" })).toHaveAttribute(
      "href",
      "/auth/signup?tier=GRAND_FRERE"
    );
    expect(within(cards[2]!).getByRole("link", { name: "Choisir Boss" })).toHaveAttribute(
      "href",
      "/auth/signup?tier=BOSS"
    );
  });

  it("renders the horizontal comparison table with sticky headers and accurate tier details", () => {
    render(<Pricing />);

    // Check for table existence
    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();

    // Check for header values and CTA links in the table
    const tableHeader = within(table).getAllByRole("columnheader");
    expect(tableHeader).toHaveLength(4);

    expect(within(tableHeader[1]!).getByText("Affranchis")).toBeInTheDocument();
    expect(within(tableHeader[1]!).getByRole("link", { name: "Choisir Affranchis" })).toHaveAttribute(
      "href",
      "/auth/signup?tier=AFFRANCHI"
    );

    expect(within(tableHeader[2]!).getByText("Grands Frères")).toBeInTheDocument();
    expect(within(tableHeader[2]!).getByRole("link", { name: "Choisir Grands Frères" })).toHaveAttribute(
      "href",
      "/auth/signup?tier=GRAND_FRERE"
    );

    expect(within(tableHeader[3]!).getByText("Boss")).toBeInTheDocument();
    expect(within(tableHeader[3]!).getByRole("link", { name: "Choisir Boss" })).toHaveAttribute(
      "href",
      "/auth/signup?tier=BOSS"
    );

    // Verify row comparison values
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(6);

    const whatsappRow = rows[1]!;
    expect(within(whatsappRow).getByText("Accès WhatsApp")).toBeInTheDocument();
    expect(within(whatsappRow).getAllByText("✓ Oui")).toHaveLength(3);

    const visibilityRow = rows[2]!;
    expect(within(visibilityRow).getByText("Visibilité des opportunités")).toBeInTheDocument();
    expect(within(visibilityRow).getByText("Standard (deals vérifiés)")).toBeInTheDocument();
    expect(within(visibilityRow).getByText("Prioritaire")).toBeInTheDocument();
    expect(within(visibilityRow).getByText("Exclusive (deals stratégiques)")).toBeInTheDocument();
  });
});
