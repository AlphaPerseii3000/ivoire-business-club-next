import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const mockGetNextPublishedEvent = vi.hoisted(() => vi.fn());

vi.mock("@/lib/event-utils", () => ({
  getNextPublishedEvent: mockGetNextPublishedEvent,
}));

vi.mock("@/lib/sanitize-log", () => ({
  sanitizeError: (error: unknown) =>
    error instanceof Error ? error.message : "Unknown error",
}));

describe("GET /api/events/next", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the next published future event", async () => {
    const nextEvent = {
      id: "evt-1",
      title: "Lancement Réseau IBC",
      slug: "lancement-reseau-ibc",
      description: "Description",
      startDate: new Date("2026-07-15T18:00:00Z"),
      endDate: null,
      location: "Abidjan",
      imageUrl: null,
      status: "PUBLISHED",
      authorId: "admin-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockGetNextPublishedEvent.mockResolvedValue(nextEvent);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.id).toBe("evt-1");
    expect(payload.data.title).toBe("Lancement Réseau IBC");
    expect(payload.data.slug).toBe("lancement-reseau-ibc");
    expect(payload.data.status).toBe("PUBLISHED");
    expect(payload.data.startDate).toBe(nextEvent.startDate.toISOString());
    expect(mockGetNextPublishedEvent).toHaveBeenCalledTimes(1);
  });

  it("returns null when no future published event exists", async () => {
    mockGetNextPublishedEvent.mockResolvedValue(null);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toBeNull();
  });

  it("excludes cancelled and past events via getNextPublishedEvent", async () => {
    mockGetNextPublishedEvent.mockResolvedValue(null);

    await GET();

    expect(mockGetNextPublishedEvent).toHaveBeenCalledTimes(1);
  });

  it("returns 500 with sanitized error message on unexpected failure", async () => {
    mockGetNextPublishedEvent.mockRejectedValue(new Error("Base de données indisponible"));

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toBe("Erreur interne");
  });
});
