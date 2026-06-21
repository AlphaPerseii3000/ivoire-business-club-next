import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ExpertForm from "./expert-form";

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

describe("ExpertForm Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "new-exp-1" }),
    }) as typeof fetch;
  });

  it("submits the form successfully with valid inputs (creation mode)", async () => {
    const user = userEvent.setup();
    render(<ExpertForm initialData={null} />);

    await user.type(screen.getByTestId("expert-name-input"), "Jean Koffi");
    await user.type(screen.getByTestId("expert-title-input"), "Consultant Fiscal");
    await user.type(screen.getByTestId("expert-bio-input"), "Ma biographie longue de plus de dix caractères.");

    await user.click(screen.getByTestId("expert-submit-button"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/experts",
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    const callBody = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(callBody.name).toBe("Jean Koffi");
    expect(callBody.title).toBe("Consultant Fiscal");

    expect(mockToastSuccess).toHaveBeenCalledWith("Expert créé avec succès.");
    expect(mockPush).toHaveBeenCalledWith("/admin/experts");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("submits changes in edit mode with prefilled values", async () => {
    const user = userEvent.setup();
    const initialData = {
      id: "exp-existing",
      name: "Mariam Diallo",
      title: "Avocate d'Affaires",
      bio: "Une biographie pré-remplie et longue de plus de 10 caractères.",
      photoUrl: "/uploads/mariam.jpg",
      phone: "+225 01 02 03 04 05",
      email: "mariam@example.com",
      whatsapp: null,
      specialties: "droit, contrats",
      requiredTier: "GRAND_FRERE",
      isPublished: true,
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "exp-existing" }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<ExpertForm initialData={initialData} />);

    await waitFor(() => {
      expect(screen.getByTestId("expert-name-input")).toHaveValue("Mariam Diallo");
    });

    await user.type(screen.getByTestId("expert-name-input"), "!");
    await user.click(screen.getByTestId("expert-submit-button"));

    await waitFor(() => {
      const calls = fetchMock.mock.calls;
      const matchingCall = calls.find((call) => call[0] === "/api/experts/exp-existing");
      expect(matchingCall).toBeDefined();
    }, { timeout: 3000 });

    const matchingCall = fetchMock.mock.calls.find((call) => call[0] === "/api/experts/exp-existing");
    const body = JSON.parse(matchingCall![1].body);
    expect(body.name).toBe("Mariam Diallo!");
    expect(body.requiredTier).toBe("GRAND_FRERE");
    expect(body.isPublished).toBe(true);
    expect(mockToastSuccess).toHaveBeenCalledWith("Expert mis à jour avec succès.");
  });

  it("shows validation errors for invalid inputs", async () => {
    const user = userEvent.setup();
    render(<ExpertForm initialData={null} />);

    await user.type(screen.getByTestId("expert-name-input"), "a");
    await user.type(screen.getByTestId("expert-title-input"), "x");
    await user.type(screen.getByTestId("expert-bio-input"), "short");

    await user.click(screen.getByTestId("expert-submit-button"));

    expect(await screen.findByText("Le nom doit contenir au moins 2 caractères")).toBeInTheDocument();
    expect(await screen.findByText("Le titre doit contenir au moins 2 caractères")).toBeInTheDocument();
    expect(await screen.findByText("La biographie doit contenir au moins 10 caractères")).toBeInTheDocument();
  });
});
