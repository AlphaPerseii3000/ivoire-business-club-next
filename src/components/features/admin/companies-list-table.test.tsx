import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CompaniesListTable from "./companies-list-table";

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

const mockCompanies = [
  {
    id: "comp-1",
    name: "KS Construction",
    slug: "ks-construction",
    description: "Entreprise de construction.",
    logoUrl: null,
    contactName: null,
    contactPhone: null,
    contactEmail: null,
    website: null,
    location: "Abidjan",
    certifications: null,
    sectors: "btp, construction",
    isPublished: false,
  },
  {
    id: "comp-2",
    name: "Ivoire Digital Agency",
    slug: "ivoire-digital-agency",
    description: "Agence digitale.",
    logoUrl: "/uploads/ida.jpg",
    contactName: null,
    contactPhone: null,
    contactEmail: null,
    website: null,
    location: "Plateau",
    certifications: null,
    sectors: "tech, digital",
    isPublished: true,
  },
];

describe("CompaniesListTable Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { ok: true } }),
    }) as typeof fetch;
  });

  it("renders companies list with appropriate columns", () => {
    render(<CompaniesListTable companies={mockCompanies} />);

    expect(screen.getByText("KS Construction")).toBeInTheDocument();
    expect(screen.getByText("Ivoire Digital Agency")).toBeInTheDocument();
    expect(screen.getByText("Entreprise de construction.")).toBeInTheDocument();
    expect(screen.getByText("Agence digitale.")).toBeInTheDocument();
    expect(screen.getByText("btp")).toBeInTheDocument();
    expect(screen.getByText("tech")).toBeInTheDocument();
    expect(screen.getByText("Brouillon")).toBeInTheDocument();
    expect(screen.getByText("Publié")).toBeInTheDocument();
  });

  it("triggers publish toggling fetch request when clicking status button", async () => {
    const user = userEvent.setup();
    render(<CompaniesListTable companies={mockCompanies} />);

    const publishBtn = screen.getByTestId("publish-btn-comp-1");
    expect(publishBtn).toHaveTextContent("Publier");
    await user.click(publishBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/companies/comp-1",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ isPublished: true }),
        })
      );
    });
    expect(mockToastSuccess).toHaveBeenCalledWith("Entreprise publiée avec succès.");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("triggers unpublish toggling fetch request when clicking status button", async () => {
    const user = userEvent.setup();
    render(<CompaniesListTable companies={mockCompanies} />);

    const publishBtn = screen.getByTestId("publish-btn-comp-2");
    expect(publishBtn).toHaveTextContent("Retirer");
    await user.click(publishBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/companies/comp-2",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ isPublished: false }),
        })
      );
    });
    expect(mockToastSuccess).toHaveBeenCalledWith("Entreprise retirée avec succès.");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("opens delete confirmation modal and makes DELETE request upon confirmation", async () => {
    const user = userEvent.setup();
    render(<CompaniesListTable companies={mockCompanies} />);

    const deleteBtn = screen.getByTestId("delete-btn-comp-1");
    await user.click(deleteBtn);

    expect(screen.getByRole("heading", { name: "Confirmer la suppression" })).toBeInTheDocument();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/KS Construction/)).toBeInTheDocument();

    const confirmBtn = screen.getByTestId("confirm-delete-btn");
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/companies/comp-1",
        expect.objectContaining({
          method: "DELETE",
        })
      );
    });
    expect(mockToastSuccess).toHaveBeenCalledWith("Entreprise supprimée avec succès.");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("renders empty state when no companies", () => {
    render(<CompaniesListTable companies={[]} />);
    expect(screen.getByText("Aucune entreprise trouvée.")).toBeInTheDocument();
  });
});
