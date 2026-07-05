import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardPastEventsPage from "./page";
import { auth } from "@/lib/auth";
import { getPastEventsWithGalleryPreview } from "@/lib/event-server-utils";
import { redirect } from "next/navigation";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/event-server-utils", () => ({
  getPastEventsWithGalleryPreview: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

describe("DashboardPastEventsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to /auth/signin if user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    await DashboardPastEventsPage();
    expect(redirect).toHaveBeenCalledWith("/auth/signin");
  });

  it("renders past events list for authenticated member", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", name: "Amadou Diallo", role: "MEMBER" },
    } as any);

    const mockPastEvents = [
      {
        id: "evt-1",
        title: "Forum Investissement Abidjan",
        slug: "forum-investissement-abidjan",
        startDate: new Date("2026-05-20T10:00:00Z"),
        eventType: "IN_PERSON",
        visibility: "PUBLIC",
        location: "Abidjan, Sofitel",
        coverImagePath: "/events/evt-1/cover.jpg",
        galleryPhotos: [
          { id: "p1", filePath: "/events/evt-1/gallery/p1.jpg", caption: "Photo 1" },
        ],
        _count: { galleryPhotos: 8, registrations: 50 },
      },
    ];

    vi.mocked(getPastEventsWithGalleryPreview).mockResolvedValue(mockPastEvents as any);

    const jsx = await DashboardPastEventsPage();
    render(jsx);

    expect(screen.getByText("Événements passés & Galeries")).toBeInTheDocument();
    expect(screen.getByText("Forum Investissement Abidjan")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /consulter la galerie/i })).toHaveAttribute(
      "href",
      "/dashboard/events/forum-investissement-abidjan/gallery"
    );
  });

  it("renders empty state when no past events exist", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", name: "Amadou Diallo", role: "MEMBER" },
    } as any);

    vi.mocked(getPastEventsWithGalleryPreview).mockResolvedValue([]);

    const jsx = await DashboardPastEventsPage();
    render(jsx);

    expect(screen.getByText("Aucun événement passé pour le moment")).toBeInTheDocument();
  });
});
