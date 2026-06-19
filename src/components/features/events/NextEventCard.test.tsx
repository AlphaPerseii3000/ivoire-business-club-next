import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NextEventCard } from "./NextEventCard";

const baseEvent = {
  id: "evt-1",
  slug: "lancement-reseau-ibc",
  title: "Lancement Réseau IBC",
  startDate: new Date("2026-07-15T10:00:00Z"),
  endDate: null,
  location: "Abidjan, Cocody",
  imageUrl: null,
};

describe("NextEventCard", () => {
  it("renders event title, date, location and learn more button", () => {
    render(<NextEventCard event={baseEvent} />);

    expect(screen.getByText("Prochain événement")).toBeInTheDocument();
    expect(screen.getByText("Lancement Réseau IBC")).toBeInTheDocument();
    expect(screen.getByText("15 juillet 2026")).toBeInTheDocument();
    expect(screen.getByText("Abidjan, Cocody")).toBeInTheDocument();
    expect(screen.getByText("En savoir plus")).toBeInTheDocument();
  });

  it("renders a single root link with no nested anchors", () => {
    render(<NextEventCard event={baseEvent} />);

    const links = screen.getAllByRole("link");
    expect(links.length).toBe(1);
    expect(links[0]).toHaveAttribute("href", "/events/lancement-reseau-ibc");
  });

  it("renders fallback gradient when imageUrl is absent", () => {
    render(<NextEventCard event={baseEvent} />);

    expect(screen.getByText("IBC")).toBeInTheDocument();
    const images = screen.queryAllByRole("img");
    expect(images.length).toBe(0);
  });

  it("renders image when imageUrl is provided", () => {
    const eventWithImage = {
      ...baseEvent,
      imageUrl: "https://example.com/event.jpg",
    };

    render(<NextEventCard event={eventWithImage} />);

    const image = screen.getByRole("img", { name: "Lancement Réseau IBC" });
    expect(image).toBeInTheDocument();
  });

  it("renders fallback gradient when imageUrl is empty string", () => {
    const eventWithEmptyImage = {
      ...baseEvent,
      imageUrl: "",
    };

    render(<NextEventCard event={eventWithEmptyImage} />);

    expect(screen.getByText("IBC")).toBeInTheDocument();
    const images = screen.queryAllByRole("img");
    expect(images.length).toBe(0);
  });
});
