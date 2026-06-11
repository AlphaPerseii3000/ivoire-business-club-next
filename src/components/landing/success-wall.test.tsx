import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SuccessWall } from "./success-wall";
import { TESTIMONIALS } from "@/lib/testimonials-config";

describe("landing SuccessWall", () => {
  it("renders success wall title, subtitle, statistics, and navigation controls", () => {
    render(<SuccessWall />);

    // Query for title using heading check
    const title = screen.getByRole("heading", { level: 2 });
    expect(title.textContent).toBe("Le Mur des Succès");

    // Check subtitle
    expect(
      screen.getByText("Découvrez les retours d'expérience des membres qui bâtissent l'économie de demain.")
    ).toBeInTheDocument();

    // Check stats
    expect(screen.getByText("15+ deals vérifiés")).toBeInTheDocument();
    expect(screen.getByText("500+ membres actifs")).toBeInTheDocument();
    expect(screen.getByText("Transactions validées")).toBeInTheDocument();
    expect(screen.getByText("Réseau d'élite")).toBeInTheDocument();

    // Check navigation buttons
    expect(screen.getByRole("button", { name: "Témoignage précédent" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Témoignage suivant" })).toBeInTheDocument();
  });

  it("loads and displays all testimonials with correct photos, metadata, and deals", () => {
    render(<SuccessWall />);

    TESTIMONIALS.forEach((testimonial) => {
      // Find testimonial name
      expect(screen.getByText(testimonial.name)).toBeInTheDocument();

      // Find role and location (both are rendered text)
      expect(screen.getByText(testimonial.role)).toBeInTheDocument();
      expect(screen.getAllByText(testimonial.location).length).toBeGreaterThanOrEqual(1);

      // Find deal tag
      expect(screen.getByText(testimonial.deals)).toBeInTheDocument();

      // Find quote
      expect(screen.getByText(`"${testimonial.quote}"`)).toBeInTheDocument();

      // Find image and check src & alt
      const img = screen.getByAltText(testimonial.name);
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", testimonial.photo);
    });
  });
});
