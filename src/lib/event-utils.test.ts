import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatEventDate,
  formatEventPricing,
  formatPrice,
  getEventTypeLabel,
  getPriceForTier,
  getRemainingSpots,
  isPrivateEventForVisitor,
  normalizePricing,
} from "./event-utils";
import { generateUniqueSlug, getNextPublishedEvent } from "./event-server-utils";

// Mock prisma singleton used by generateUniqueSlug and getNextPublishedEvent
const mockFindFirst = vi.hoisted(() => vi.fn());
const mockFindMany = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: {
      findFirst: mockFindFirst,
      findMany: mockFindMany,
    },
  },
}));

vi.mock("@/lib/utils", () => ({
  slugify: (title: string) =>
    title
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "")
      .replace(/\-\-+/g, "-")
      .replace(/^-+/, "")
      .replace(/-+$/, ""),
}));

describe("event-utils", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("generateUniqueSlug", () => {
    it("returns slugified title when available", async () => {
      mockFindFirst.mockResolvedValue(null);
      const slug = await generateUniqueSlug("Conférence IBC");
      expect(slug).toBe("conference-ibc");
    });

    it("appends counter when slug exists and skips current id", async () => {
      mockFindFirst.mockImplementation(({ where }: { where: { slug: string; id?: { not: string } } }) => {
        if (where.slug === "conference-ibc" || where.slug === "conference-ibc-1") {
          return { id: "other-id", slug: where.slug };
        }
        return null;
      });
      const slug = await generateUniqueSlug("Conférence IBC", "evt-current");
      expect(slug).toBe("conference-ibc-2");
    });

    it("throws for empty slug", async () => {
      await expect(generateUniqueSlug("   ")).rejects.toThrow(
        "Le titre ne permet pas de générer un slug valide."
      );
    });
  });

  describe("getNextPublishedEvent", () => {
    it("returns the next public published event", async () => {
      const expectedEvent = {
        id: "evt-1",
        title: "Prochain événement",
        slug: "prochain-evenement",
        startDate: new Date("2026-08-01T10:00:00Z"),
      };
      mockFindFirst.mockResolvedValue(expectedEvent);

      const event = await getNextPublishedEvent();
      expect(event).toEqual(expectedEvent);
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          status: "PUBLISHED",
          visibility: "PUBLIC",
          startDate: { gte: expect.any(Date) },
        },
        orderBy: { startDate: "asc" },
      });
    });
  });

  describe("getRemainingSpots", () => {
    it("returns null when maxCapacity is null or undefined", () => {
      expect(getRemainingSpots(null, [{ status: "REGISTERED" }])).toBeNull();
      expect(getRemainingSpots(undefined, [{ status: "REGISTERED" }])).toBeNull();
    });

    it("counts REGISTERED status only", () => {
      const registrations = [
        { status: "REGISTERED" },
        { status: "REGISTERED" },
        { status: "CANCELLED" },
        { status: "NO_SHOW" },
      ];
      expect(getRemainingSpots(10, registrations)).toBe(8);
    });

    it("never returns negative value", () => {
      expect(getRemainingSpots(2, [{ status: "REGISTERED" }, { status: "REGISTERED" }, { status: "REGISTERED" }])).toBe(0);
    });
  });

  describe("getPriceForTier", () => {
    it("returns the correct price for a tier", () => {
      const pricing = { visitor: 10000, affranchi: 5000, grand_frere: 3000, boss: 0 };
      expect(getPriceForTier(pricing, "AFFRANCHI")).toBe(5000);
      expect(getPriceForTier(pricing, "GRAND_FRERE")).toBe(3000);
      expect(getPriceForTier(pricing, "BOSS")).toBeNull();
    });

    it("returns null for free or missing pricing", () => {
      expect(getPriceForTier(null, "AFFRANCHI")).toBeNull();
      expect(getPriceForTier({ affranchi: null }, "AFFRANCHI")).toBeNull();
      expect(getPriceForTier({ affranchi: 0 }, "AFFRANCHI")).toBeNull();
    });
  });

  describe("formatEventPricing", () => {
    it("detects free when pricing is null", () => {
      expect(formatEventPricing(null)).toEqual({ visitor: null, memberMin: null, isFree: true });
    });

    it("detects free when all prices are zero or null", () => {
      const result = formatEventPricing({ visitor: 0, affranchi: null, grand_frere: 0, boss: undefined });
      expect(result.isFree).toBe(true);
      expect(result.memberMin).toBeNull();
    });

    it("formats positive prices", () => {
      expect(formatPrice(10000)).toMatch(/10[\s\u202f]000\sFCFA/);
    });

    it("returns visitor and minimum member price", () => {
      const pricing = { visitor: 10000, affranchi: 5000, grand_frere: 3000, boss: 0 };
      expect(formatEventPricing(pricing)).toEqual({
        visitor: 10000,
        memberMin: 3000,
        isFree: false,
      });
    });
  });

  describe("formatPrice", () => {
    it("formats positive prices", () => {
      expect(formatPrice(10000)).toMatch(/10[\s\u202f]000\sFCFA/);
    });

    it("returns fallback for null or zero", () => {
      expect(formatPrice(null)).toBe("Gratuit");
      expect(formatPrice(0)).toBe("Gratuit");
      expect(formatPrice(null, "Offert")).toBe("Offert");
    });
  });

  describe("getEventTypeLabel", () => {
    it("returns labels", () => {
      expect(getEventTypeLabel("ONLINE")).toBe("En ligne");
      expect(getEventTypeLabel("IN_PERSON")).toBe("En présentiel");
      expect(getEventTypeLabel(null)).toBe("En présentiel");
    });
  });

  describe("formatEventDate", () => {
    it("formats date in French", () => {
      const date = new Date("2026-07-15T10:00:00Z");
      expect(formatEventDate(date)).toBe(date.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }));
    });
  });

  describe("isPrivateEventForVisitor", () => {
    it("is true for private event and visitor", () => {
      expect(isPrivateEventForVisitor("PRIVATE", false)).toBe(true);
    });

    it("is false for public event or authenticated user", () => {
      expect(isPrivateEventForVisitor("PRIVATE", true)).toBe(false);
      expect(isPrivateEventForVisitor("PUBLIC", false)).toBe(false);
    });
  });

  describe("normalizePricing", () => {
    it("returns null for null/undefined/JsonNull", () => {
      expect(normalizePricing(null)).toBeNull();
      expect(normalizePricing(undefined)).toBeNull();
    });

    it("normalizes valid prices and drops zeros", () => {
      expect(normalizePricing({ visitor: 10000, affranchi: 0, grand_frere: null, boss: 5000 })).toEqual({
        visitor: 10000,
        affranchi: null,
        grand_frere: null,
        boss: 5000,
      });
    });

    it("returns null for non-object values", () => {
      expect(normalizePricing("not pricing")).toBeNull();
      expect(normalizePricing([100, 200])).toBeNull();
    });
  });
});
