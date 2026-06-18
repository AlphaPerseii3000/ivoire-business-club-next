import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EventsListTable from "./events-list-table";

const mockRefresh = vi.hoisted(() => vi.fn());
const mockToastSuccess = vi.hoisted(() => vi.fn());
const mockToastError = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

const mockEvents = [
  {
    id: "evt-1",
    title: "Événement 1",
    slug: "evenement-1",
    description: "Description 1",
    startDate: "2026-07-15T18:00:00.000Z",
    endDate: null,
    location: "Abidjan",
    imageUrl: null,
    status: "DRAFT",
  },
  {
    id: "evt-2",
    title: "Événement 2",
    slug: "evenement-2",
    description: "Description 2",
    startDate: "2026-06-12T18:00:00.000Z",
    endDate: null,
    location: "Bouaké",
    imageUrl: null,
    status: "PUBLISHED",
  },
  {
    id: "evt-3",
    title: "Événement 3",
    slug: "evenement-3",
    description: "Description 3",
    startDate: "2026-08-01T18:00:00.000Z",
    endDate: null,
    location: "San Pedro",
    imageUrl: null,
    status: "CANCELLED",
  },
];

describe("EventsListTable Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { ok: true } }),
    }) as typeof fetch;
  });

  it("renders events list with appropriate columns", () => {
    render(<EventsListTable events={mockEvents} />);

    expect(screen.getByText("Événement 1")).toBeInTheDocument();
    expect(screen.getByText("Événement 2")).toBeInTheDocument();
    expect(screen.getByText("Événement 3")).toBeInTheDocument();
    expect(screen.getByText("Brouillon")).toBeInTheDocument();
    expect(screen.getByText("Publié")).toBeInTheDocument();
    expect(screen.getByText("Annulé")).toBeInTheDocument();
  });

  it("triggers status change fetch request when clicking status button", async () => {
    const user = userEvent.setup();
    render(<EventsListTable events={mockEvents} />);

    const statusBtn = screen.getByTestId("status-btn-evt-1");
    expect(statusBtn).toHaveTextContent("Publier");
    await user.click(statusBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/events/evt-1",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ status: "PUBLISHED" }),
        })
      );
    });
    expect(mockToastSuccess).toHaveBeenCalledWith("Statut mis à jour : Publié.");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("triggers cancel status change for published event", async () => {
    const user = userEvent.setup();
    render(<EventsListTable events={mockEvents.map((e) => (e.status === "CANCELLED" ? { ...e, status: "PUBLISHED" as const } : e))} />
    );

    const statusBtn = screen.getByTestId("status-btn-evt-3");
    expect(statusBtn).toHaveTextContent("Annuler");
    await user.click(statusBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/events/evt-3",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ status: "CANCELLED" }),
        })
      );
    });
    expect(mockToastSuccess).toHaveBeenCalledWith("Statut mis à jour : Annulé.");
  });

  it("opens delete confirmation modal and makes DELETE request upon confirmation", async () => {
    const user = userEvent.setup();
    render(<EventsListTable events={mockEvents} />);

    const deleteBtn = screen.getByTestId("delete-btn-evt-1");
    await user.click(deleteBtn);

    expect(screen.getByRole("heading", { name: "Confirmer la suppression" })).toBeInTheDocument();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/Événement 1/)).toBeInTheDocument();

    const confirmBtn = screen.getByTestId("confirm-delete-btn");
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/events/evt-1",
        expect.objectContaining({
          method: "DELETE",
        })
      );
    });
    expect(mockToastSuccess).toHaveBeenCalledWith("Événement supprimé avec succès.");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("does not show status change button for cancelled events", () => {
    render(<EventsListTable events={mockEvents.filter((e) => e.status === "CANCELLED")} />);
    expect(screen.queryByTestId("status-btn-evt-3")).not.toBeInTheDocument();
  });

  it("renders empty state when no events", () => {
    render(<EventsListTable events={[]} />);
    expect(screen.getByText("Aucun événement trouvé.")).toBeInTheDocument();
  });
});
