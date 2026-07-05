import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MomentsIbc from "./moments-ibc";

describe("MomentsIbc component", () => {
  it("renders null when photos array is empty or undefined", () => {
    const { container: container1 } = render(<MomentsIbc photos={[]} />);
    expect(container1.firstChild).toBeNull();

    const { container: container2 } = render(<MomentsIbc photos={undefined} />);
    expect(container2.firstChild).toBeNull();
  });

  it("renders section with title and photos grid", () => {
    const mockPhotos = [
      {
        id: "p1",
        eventId: "evt-1",
        filePath: "/events/evt-1/gallery/photo1.jpg",
        caption: "Super conférence",
        createdAt: new Date("2026-06-01T12:00:00Z"),
        event: {
          id: "evt-1",
          slug: "super-conference",
          title: "Super Conférence IBC",
          startDate: new Date("2026-06-01T10:00:00Z"),
        },
      },
      {
        id: "p2",
        eventId: "evt-2",
        filePath: "/events/evt-2/gallery/photo2.jpg",
        caption: null,
        createdAt: new Date("2026-06-05T12:00:00Z"),
        event: {
          id: "evt-2",
          slug: "diner-gala",
          title: "Dîner de Gala",
          startDate: new Date("2026-06-05T19:00:00Z"),
        },
      },
    ];

    render(<MomentsIbc photos={mockPhotos} />);

    expect(screen.getByText("Moments IBC")).toBeInTheDocument();
    expect(screen.getByText("Super Conférence IBC")).toBeInTheDocument();
    expect(screen.getByText("Dîner de Gala")).toBeInTheDocument();
    expect(screen.getByText("Super conférence")).toBeInTheDocument();

    const links = screen.getAllByRole("link");
    expect(links.some((l) => l.getAttribute("href") === "/events/super-conference")).toBe(true);
    expect(links.some((l) => l.getAttribute("href") === "/events/diner-gala")).toBe(true);
  });
});
