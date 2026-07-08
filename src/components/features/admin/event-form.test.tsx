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

function createValidFile(name = "cover.jpg", type = "image/jpeg", size = 1024): File {
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type });
}

function createOversizedFile(name = "cover.jpg", type = "image/jpeg"): File {
  const size = 6 * 1024 * 1024;
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type });
}

describe("EventForm Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "new-evt-1" }),
    }) as typeof fetch;
  });

  it("renders 5 sections in creation mode", () => {
    render(<EventForm initialData={null} />);
    expect(screen.getByText("1. Infos générales")).toBeInTheDocument();
    expect(screen.getByText("2. Logistique")).toBeInTheDocument();
    expect(screen.getByText("3. Couverture")).toBeInTheDocument();
    expect(screen.getByText("4. Tarification (FCFA)")).toBeInTheDocument();
  });

  it("renders 5 sections in edit mode including publication", () => {
    const initialData = {
      id: "evt-existing",
      title: "Événement",
      description: "Description longue",
      startDate: "2026-07-15T18:00:00Z",
      endDate: null,
      location: "Abidjan",
      coverImagePath: null,
      status: "DRAFT",
    };

    render(<EventForm initialData={initialData} />);
    expect(screen.getByText("1. Infos générales")).toBeInTheDocument();
    expect(screen.getByText("2. Logistique")).toBeInTheDocument();
    expect(screen.getByText("3. Couverture")).toBeInTheDocument();
    expect(screen.getByText("4. Tarification (FCFA)")).toBeInTheDocument();
    expect(screen.getByText("5. Publication")).toBeInTheDocument();
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
    expect(callBody.pricing).toBeNull();

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

  it("requires onlineUrl when event type is ONLINE", async () => {
    const user = userEvent.setup();
    render(<EventForm initialData={null} />);

    await user.type(screen.getByTestId("event-title-input"), "Webinaire IBC");
    await user.type(screen.getByTestId("event-description-input"), "Description complète du webinaire");

    const startInput = screen.getByTestId("event-start-date-input") as HTMLInputElement;
    await userEvent.clear(startInput);
    fireEvent.change(startInput, { target: { value: "2026-07-15T18:00" } });

    // Basculer en ONLINE
    await user.click(screen.getByTestId("event-type-trigger"));
    const onlineOption = await screen.findByText("En ligne");
    await user.click(onlineOption);

    await waitFor(() => {
      expect(screen.getByTestId("event-online-url-input")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("event-submit-button"));

    expect(await screen.findByText("Le lien visio est requis pour un événement en ligne")).toBeInTheDocument();
  });

  it("requires location when event type is IN_PERSON", async () => {
    const user = userEvent.setup();
    render(<EventForm initialData={null} />);

    await user.type(screen.getByTestId("event-title-input"), "Rencontre Abidjan");
    await user.type(screen.getByTestId("event-description-input"), "Description complète de la rencontre");
    await user.clear(screen.getByTestId("event-location-input"));

    const startInput = screen.getByTestId("event-start-date-input") as HTMLInputElement;
    await userEvent.clear(startInput);
    fireEvent.change(startInput, { target: { value: "2026-07-15T18:00" } });

    await user.click(screen.getByTestId("event-submit-button"));

    expect(await screen.findByText("Le lieu est requis pour un événement en présentiel")).toBeInTheDocument();
  });

  it("rejects oversized cover file before upload", async () => {
    const user = userEvent.setup();
    render(<EventForm initialData={null} />);

    const input = screen.getByTestId("event-cover-file-input") as HTMLInputElement;
    const file = createOversizedFile();
    await user.upload(input, file);

    expect(await screen.findByText("Le fichier dépasse 5 Mo.")).toBeInTheDocument();
  });

  it("rejects invalid cover file type before upload", async () => {
    render(<EventForm initialData={null} />);

    const input = screen.getByTestId("event-cover-file-input") as HTMLInputElement;
    const file = createValidFile("cover.gif", "image/gif", 1024);
    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText("Format non supporté. Utilisez jpeg, png ou webp.")).toBeInTheDocument();
  });

  it("uploads cover after creating a new event", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: "new-evt-1" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { coverImagePath: "/events/new-evt-1/cover.jpg" } }),
      });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<EventForm initialData={null} />);

    await user.type(screen.getByTestId("event-title-input"), "Événement avec couverture");
    await user.type(screen.getByTestId("event-description-input"), "Description complète de l'événement");
    await user.type(screen.getByTestId("event-location-input"), "Abidjan");

    const startInput = screen.getByTestId("event-start-date-input") as HTMLInputElement;
    await userEvent.clear(startInput);
    fireEvent.change(startInput, { target: { value: "2026-07-15T18:00" } });

    const coverInput = screen.getByTestId("event-cover-file-input") as HTMLInputElement;
    const file = createValidFile();
    await user.upload(coverInput, file);

    await user.click(screen.getByTestId("event-submit-button"));

    await waitFor(() => {
      const calls = fetchMock.mock.calls;
      const uploadCall = calls.find((call) => call[0] === "/api/admin/events/new-evt-1/cover");
      expect(uploadCall).toBeDefined();
    }, { timeout: 3000 });

    expect(mockToastSuccess).toHaveBeenCalledWith("Couverture uploadée avec succès.");
    expect(mockPush).toHaveBeenCalledWith("/admin/events");
  });

  it("redirects new events to edit page if cover upload fails", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: "new-evt-1" }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "Une erreur est survenue lors de l'upload." }),
      });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<EventForm initialData={null} />);

    await user.type(screen.getByTestId("event-title-input"), "Événement avec couverture");
    await user.type(screen.getByTestId("event-description-input"), "Description complète de l'événement");
    await user.type(screen.getByTestId("event-location-input"), "Abidjan");

    const startInput = screen.getByTestId("event-start-date-input") as HTMLInputElement;
    await userEvent.clear(startInput);
    fireEvent.change(startInput, { target: { value: "2026-07-15T18:00" } });

    const coverInput = screen.getByTestId("event-cover-file-input") as HTMLInputElement;
    const file = createValidFile();
    await user.upload(coverInput, file);

    await user.click(screen.getByTestId("event-submit-button"));

    await waitFor(() => {
      const calls = fetchMock.mock.calls;
      const uploadCall = calls.find((call) => call[0] === "/api/admin/events/new-evt-1/cover");
      expect(uploadCall).toBeDefined();
    }, { timeout: 3000 });

    expect(mockToastError).toHaveBeenCalledWith("Une erreur est survenue lors de l'upload.");
    expect(mockPush).toHaveBeenCalledWith("/admin/events/new-evt-1/edit");
  });

  it("does not redirect existing events if cover upload fails", async () => {
    const user = userEvent.setup();
    const initialData = {
      id: "evt-existing",
      title: "Événement",
      description: "Description longue",
      startDate: "2026-07-15T18:00:00Z",
      endDate: null,
      location: "Abidjan",
      coverImagePath: null,
      status: "DRAFT",
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: "evt-existing" }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "Une erreur est survenue lors de l'upload." }),
      });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<EventForm initialData={initialData} />);

    const coverInput = screen.getByTestId("event-cover-file-input") as HTMLInputElement;
    const file = createValidFile();
    await user.upload(coverInput, file);

    await user.click(screen.getByTestId("event-submit-button"));

    await waitFor(() => {
      const calls = fetchMock.mock.calls;
      const uploadCall = calls.find((call) => call[0] === "/api/admin/events/evt-existing/cover");
      expect(uploadCall).toBeDefined();
    }, { timeout: 3000 });

    expect(mockToastError).toHaveBeenCalledWith("Une erreur est survenue lors de l'upload.");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("submits normalized pricing values", async () => {
    const user = userEvent.setup();
    render(<EventForm initialData={null} />);

    await user.type(screen.getByTestId("event-title-input"), "Événement payant");
    await user.type(screen.getByTestId("event-description-input"), "Description complète de l'événement payant");
    await user.type(screen.getByTestId("event-location-input"), "Abidjan");

    const startInput = screen.getByTestId("event-start-date-input") as HTMLInputElement;
    await userEvent.clear(startInput);
    fireEvent.change(startInput, { target: { value: "2026-07-15T18:00" } });

    await user.type(screen.getByTestId("event-pricing-visitor-input"), "10000");
    await user.type(screen.getByTestId("event-pricing-affranchi-input"), "5000");

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
    expect(callBody.pricing).toEqual({
      visitor: 10000,
      affranchi: 5000,
      grand_frere: null,
      boss: null,
    });
  });

  it("submits null pricing when all prices are empty", async () => {
    const user = userEvent.setup();
    render(<EventForm initialData={null} />);

    await user.type(screen.getByTestId("event-title-input"), "Événement gratuit");
    await user.type(screen.getByTestId("event-description-input"), "Description complète de l'événement gratuit");
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
    expect(callBody.pricing).toBeNull();
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
