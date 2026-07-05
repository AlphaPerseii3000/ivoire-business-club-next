import { afterEach, describe, expect, it, vi } from "vitest";
import {
  generateUniqueSlug,
  getNextPublishedEvent,
  getMomentsIbcPhotos,
  getPastEventsWithGalleryPreview,
} from "./event-server-utils";

const mockEventFindFirst = vi.hoisted(() => vi.fn());
const mockEventFindMany = vi.hoisted(() => vi.fn());
const mockGalleryPhotoFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: {
      findFirst: mockEventFindFirst,
      findMany: mockEventFindMany,
    },
    eventGalleryPhoto: {
      findMany: mockGalleryPhotoFindMany,
    },
  },
}));

describe("event-server-utils", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getMomentsIbcPhotos", () => {
    it("fetches gallery photos from past public published events with limit", async () => {
      const mockPhotos = [
        {
          id: "photo-1",
          eventId: "evt-1",
          filePath: "/events/evt-1/gallery/photo1.jpg",
          caption: "Soirée Networking",
          createdAt: new Date("2026-06-01T20:00:00Z"),
          event: {
            id: "evt-1",
            slug: "soiree-networking",
            title: "Soirée Networking",
            startDate: new Date("2026-06-01T18:00:00Z"),
          },
        },
      ];
      mockGalleryPhotoFindMany.mockResolvedValue(mockPhotos);

      const result = await getMomentsIbcPhotos(6);

      expect(result).toEqual(mockPhotos);
      expect(mockGalleryPhotoFindMany).toHaveBeenCalledWith({
        where: {
          event: {
            status: "PUBLISHED",
            visibility: "PUBLIC",
            startDate: { lt: expect.any(Date) },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: {
          event: {
            select: {
              id: true,
              slug: true,
              title: true,
              startDate: true,
            },
          },
        },
      });
    });

    it("returns empty array on DB error gracefully", async () => {
      mockGalleryPhotoFindMany.mockRejectedValue(new Error("DB Connection error"));

      const result = await getMomentsIbcPhotos();
      expect(result).toEqual([]);
    });
  });

  describe("getPastEventsWithGalleryPreview", () => {
    it("fetches past published events with gallery preview and count", async () => {
      const mockPastEvents = [
        {
          id: "evt-1",
          title: "Conférence Tech 2026",
          slug: "conference-tech-2026",
          startDate: new Date("2026-05-10T09:00:00Z"),
          eventType: "IN_PERSON",
          visibility: "PUBLIC",
          location: "Abidjan, Sofitel Hotel",
          coverImagePath: "/events/evt-1/cover.jpg",
          galleryPhotos: [
            { id: "p1", filePath: "/events/evt-1/gallery/p1.jpg", caption: null },
          ],
          _count: { galleryPhotos: 12, registrations: 45 },
        },
      ];
      mockEventFindMany.mockResolvedValue(mockPastEvents);

      const result = await getPastEventsWithGalleryPreview(10);

      expect(result).toEqual(mockPastEvents);
      expect(mockEventFindMany).toHaveBeenCalledWith({
        where: {
          startDate: { lt: expect.any(Date) },
          status: "PUBLISHED",
        },
        orderBy: { startDate: "desc" },
        take: 10,
        include: {
          galleryPhotos: {
            take: 4,
            orderBy: { createdAt: "desc" },
          },
          _count: {
            select: {
              galleryPhotos: true,
              registrations: true,
            },
          },
        },
      });
    });
  });
});
