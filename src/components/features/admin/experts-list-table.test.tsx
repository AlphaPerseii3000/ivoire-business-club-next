import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ExpertsListTable from "./experts-list-table";

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

const mockExperts = [
  {
    id: "exp-1",
    name: "Jean Koffi",
    slug: "jean-koffi",
    title: "Expert Fiscal",
    bio: "Biographie longue...",
    photoUrl: null,
    phone: null,
    email: null,
    whatsapp: null,
    specialties: "fiscalité, douane",
    requiredTier: "AFFRANCHI",
    isPublished: false,
  },
  {
    id: "exp-2",
    name: "Mariam Diallo",
    slug: "mariam-diallo",
    title: "Avocate d'Affaires",
    bio: "Biographie longue...",
    photoUrl: "/uploads/mariam.jpg",
    phone: null,
    email: null,
    whatsapp: null,
    specialties: "droit, contrats",
    requiredTier: "GRAND_FRERE",
    isPublished: true,
  },
];

describe("ExpertsListTable Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { ok: true } }),
    }) as typeof fetch;
  });

  it("renders experts list with appropriate columns", () => {
    render(<ExpertsListTable experts={mockExperts} />);

    expect(screen.getByText("Jean Koffi")).toBeInTheDocument();
    expect(screen.getByText("Mariam Diallo")).toBeInTheDocument();
    expect(screen.getByText("Expert Fiscal")).toBeInTheDocument();
    expect(screen.getByText("Avocate d'Affaires")).toBeInTheDocument();
    expect(screen.getByText("fiscalité")).toBeInTheDocument();
    expect(screen.getByText("droit")).toBeInTheDocument();
    expect(screen.getByText("Affranchi")).toBeInTheDocument();
    expect(screen.getByText("Grand Frère")).toBeInTheDocument();
    expect(screen.getByText("Brouillon")).toBeInTheDocument();
    expect(screen.getByText("Publié")).toBeInTheDocument();
  });

  it("triggers publish toggling fetch request when clicking status button", async () => {
    const user = userEvent.setup();
    render(<ExpertsListTable experts={mockExperts} />);

    const publishBtn = screen.getByTestId("publish-btn-exp-1");
    expect(publishBtn).toHaveTextContent("Publier");
    await user.click(publishBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/experts/exp-1",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ isPublished: true }),
        })
      );
    });
    expect(mockToastSuccess).toHaveBeenCalledWith("Expert publié avec succès.");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("triggers unpublish toggling fetch request when clicking status button", async () => {
    const user = userEvent.setup();
    render(<ExpertsListTable experts={mockExperts} />);

    const publishBtn = screen.getByTestId("publish-btn-exp-2");
    expect(publishBtn).toHaveTextContent("Retirer");
    await user.click(publishBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/experts/exp-2",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ isPublished: false }),
        })
      );
    });
    expect(mockToastSuccess).toHaveBeenCalledWith("Expert retiré avec succès.");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("opens delete confirmation modal and makes DELETE request upon confirmation", async () => {
    const user = userEvent.setup();
    render(<ExpertsListTable experts={mockExperts} />);

    const deleteBtn = screen.getByTestId("delete-btn-exp-1");
    await user.click(deleteBtn);

    expect(screen.getByRole("heading", { name: "Confirmer la suppression" })).toBeInTheDocument();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/Jean Koffi/)).toBeInTheDocument();

    const confirmBtn = screen.getByTestId("confirm-delete-btn");
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/experts/exp-1",
        expect.objectContaining({
          method: "DELETE",
        })
      );
    });
    expect(mockToastSuccess).toHaveBeenCalledWith("Expert supprimé avec succès.");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("renders empty state when no experts", () => {
    render(<ExpertsListTable experts={[]} />);
    expect(screen.getByText("Aucun expert trouvé.")).toBeInTheDocument();
  });
});
