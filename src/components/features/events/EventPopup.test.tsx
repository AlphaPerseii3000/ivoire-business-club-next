import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, beforeEach } from "vitest";
import { EventPopup } from "./EventPopup";

const baseEvent = {
  id: "evt-1",
  slug: "lancement-reseau-ibc",
  title: "Lancement Réseau IBC",
  startDate: new Date("2026-07-15T10:00:00Z"),
  endDate: null,
  location: "Abidjan, Cocody",
  imageUrl: null,
};

const POPUP_CLOSED_KEY = "ibc-event-popup-closed";

describe("EventPopup", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("opens when enabled, event exists and localStorage marker is absent", async () => {
    render(<EventPopup event={baseEvent} enabled={true} />);

    await waitFor(() => {
      expect(screen.getByText("Prochain événement IBC")).toBeInTheDocument();
    });

    expect(screen.getByText("Lancement Réseau IBC")).toBeInTheDocument();
    expect(screen.getByText("15 juillet 2026")).toBeInTheDocument();
    expect(screen.getByText("Abidjan, Cocody")).toBeInTheDocument();
  });

  it("does not open when popup is disabled", async () => {
    render(<EventPopup event={baseEvent} enabled={false} />);

    await waitFor(() => {
      expect(screen.queryByText("Prochain événement IBC")).not.toBeInTheDocument();
    });
  });

  it("does not open when localStorage marker is present", async () => {
    localStorage.setItem(POPUP_CLOSED_KEY, "closed");

    render(<EventPopup event={baseEvent} enabled={true} />);

    await waitFor(() => {
      expect(screen.queryByText("Prochain événement IBC")).not.toBeInTheDocument();
    });
  });

  it("does not render anything when event is null", async () => {
    const { container } = render(<EventPopup event={null} enabled={true} />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it("closes dialog and persists localStorage marker on close button click", async () => {
    const user = userEvent.setup();
    render(<EventPopup event={baseEvent} enabled={true} />);

    await waitFor(() => {
      expect(screen.getByText("Prochain événement IBC")).toBeInTheDocument();
    });

    const closeButton = screen.getByRole("button", { name: "Fermer" });
    await user.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText("Prochain événement IBC")).not.toBeInTheDocument();
    });

    expect(localStorage.getItem(POPUP_CLOSED_KEY)).toBe("lancement-reseau-ibc");
  });

  it("links to the event detail page", async () => {
    render(<EventPopup event={baseEvent} enabled={true} />);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /En savoir plus/i })).toBeInTheDocument();
    });

    const link = screen.getByRole("link", { name: /En savoir plus/i });
    expect(link).toHaveAttribute("href", "/events/lancement-reseau-ibc");
  });
});
