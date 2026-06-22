import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CompanyForm from "./company-form";

const mockPush = vi.hoisted(() => vi.fn());
const mockRefresh = vi.hoisted(() => vi.fn());
const mockToastSuccess = vi.hoisted(() => vi.fn());
const mockToastError = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

describe("CompanyForm Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "new-comp-1" }),
    }) as typeof fetch;
  });

  it("submits the form successfully with valid inputs (creation mode)", async () => {
    const user = userEvent.setup();
    render(<CompanyForm initialData={null} />);

    await user.type(screen.getByTestId("company-name-input"), "KS Construction");
    await user.type(screen.getByTestId("company-description-input"), "Une description longue de plus de dix caractères.");

    await user.click(screen.getByTestId("company-submit-button"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/companies",
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    const callBody = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(callBody.name).toBe("KS Construction");
    expect(callBody.description).toBe("Une description longue de plus de dix caractères.");

    expect(mockToastSuccess).toHaveBeenCalledWith("Entreprise créée avec succès.");
    expect(mockPush).toHaveBeenCalledWith("/admin/companies");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("submits changes in edit mode with prefilled values", async () => {
    const user = userEvent.setup();
    const initialData = {
      id: "comp-existing",
      name: "UEMOA Conseil",
      slug: "uemoa-conseil",
      description: "Une description longue pré-remplie de plus de 10 caractères.",
      logoUrl: "/uploads/uemoa.jpg",
      contactName: "Moussa Traoré",
      contactPhone: "+225 01 02 03 04 05",
      contactEmail: "contact@uemoa.ci",
      website: "https://www.uemoa.ci",
      location: "Abidjan, Marcory",
      certifications: "Agrément COSUMAF",
      sectors: "conseil, finance",
      isPublished: true,
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "comp-existing" }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<CompanyForm initialData={initialData} />);

    await waitFor(() => {
      expect(screen.getByTestId("company-name-input")).toHaveValue("UEMOA Conseil");
    });

    await user.type(screen.getByTestId("company-name-input"), "!");
    await user.click(screen.getByTestId("company-submit-button"));

    await waitFor(() => {
      const calls = fetchMock.mock.calls;
      const matchingCall = calls.find((call) => call[0] === "/api/companies/comp-existing");
      expect(matchingCall).toBeDefined();
    }, { timeout: 3000 });

    const matchingCall = fetchMock.mock.calls.find((call) => call[0] === "/api/companies/comp-existing");
    const body = JSON.parse(matchingCall![1].body);
    expect(body.name).toBe("UEMOA Conseil!");
    expect(body.isPublished).toBe(true);
    expect(mockToastSuccess).toHaveBeenCalledWith("Entreprise mise à jour avec succès.");
  });

  it("shows validation errors for invalid inputs", async () => {
    const user = userEvent.setup();
    render(<CompanyForm initialData={null} />);

    await user.type(screen.getByTestId("company-name-input"), "a");
    await user.type(screen.getByTestId("company-description-input"), "short");

    await user.click(screen.getByTestId("company-submit-button"));

    expect(await screen.findByText("Le nom doit contenir au moins 2 caractères")).toBeInTheDocument();
    expect(await screen.findByText("La description doit contenir au moins 10 caractères")).toBeInTheDocument();
  });
});
