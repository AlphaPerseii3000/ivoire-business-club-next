import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EventForm from "./event-form";

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

describe("EventForm Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "new-evt-1" }),
    }) as typeof fetch;
  });

  it("submits the form successfully with valid inputs (creation mode)", async () => {
    const user = userEvent.setup();
    render(<EventForm initialData={null} />);

    await user.type(screen.getByTestId("event-title-input"), "Titre de l'événement de test");
    await user.type(screen.getByTestId("event-description-input"), "Description de l'événement de test avec plus de dix caractères");
    await user.type(screen.getByTestId("event-location-input"), "Abidjan");

    const startInput = screen.getByTestId("event-start-date-input") as HTMLInputElement;
    await userEvent.clear(startInput);
    fireEvent.change(startInput, { target: { value: "2026-07-15T18:00" } });

    await user.click(screen.getByTestId("event-submit-button"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/events",
        expect.objectContaining({
          method: "POST",
        })
      );
    });
    const callBody = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(callBody.title).toBe("Titre de l'événement de test");

    expect(mockToastSuccess).toHaveBeenCalledWith("Événement créé avec succès en tant que brouillon.");
    expect(mockPush).toHaveBeenCalledWith("/admin/events");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("submits changes in edit mode with prefilled values", async () => {
    const user = userEvent.setup();
    const initialData = {
      id: "evt-existing",
      title: "Mon Événement Existant",
      description: "Description longue pré-remplie",
      startDate: "2026-07-15T18:00:00.000Z",
      endDate: "2026-07-15T22:00:00.000Z",
      location: "Abidjan",
      coverImagePath: null,
      status: "DRAFT",
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "evt-existing" }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<EventForm initialData={initialData} />);

    await waitFor(() => {
      expect(screen.getByTestId("event-title-input")).toHaveValue("Mon Événement Existant");
    });

    await user.type(screen.getByTestId("event-title-input"), "!");
    await user.click(screen.getByTestId("event-submit-button"));

    await waitFor(() => {
      const calls = fetchMock.mock.calls;
      const matchingCall = calls.find((call) => call[0] === "/api/events/evt-existing");
      expect(matchingCall).toBeDefined();
    }, { timeout: 3000 });

    const matchingCall = fetchMock.mock.calls.find((call) => call[0] === "/api/events/evt-existing");
    const body = JSON.parse(matchingCall![1].body);
    expect(body.title).toBe("Mon Événement Existant!");
    expect(body.status).toBe("DRAFT");
    expect(mockToastSuccess).toHaveBeenCalledWith("Événement modifié avec succès.");
  });

  it("shows validation errors for invalid inputs", async () => {
    const user = userEvent.setup();
    render(<EventForm initialData={null} />);

    await user.type(screen.getByTestId("event-title-input"), "ab");
    await user.type(screen.getByTestId("event-description-input"), "short");
    await user.clear(screen.getByTestId("event-location-input"));
    await user.type(screen.getByTestId("event-start-date-input"), "bad-date");

    await user.click(screen.getByTestId("event-submit-button"));

    expect(await screen.findByText("Le titre doit contenir au moins 3 caractères")).toBeInTheDocument();
    expect(await screen.findByText("La description doit contenir au moins 10 caractères")).toBeInTheDocument();
    expect(await screen.findByText("Le lieu est requis pour un événement en présentiel")).toBeInTheDocument();
    expect(await screen.findByText("Date de début invalide")).toBeInTheDocument();
  });

  it("renders status selector in edit mode", () => {
    const initialData = {
      id: "evt-existing",
      title: "Événement",
      description: "Description longue",
      startDate: "2026-07-15T18:00:00Z",
      endDate: null,
      location: "Abidjan",
      coverImagePath: null,
      status: "PUBLISHED",
    };

    render(<EventForm initialData={initialData} />);
    expect(screen.getByTestId("event-status-trigger")).toBeInTheDocument();
  });
});
