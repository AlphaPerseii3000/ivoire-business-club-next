import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EventDetailPage, { generateMetadata } from "./page";

// Mock Auth
const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({ auth: mockAuth }));

// Mock Prisma
const mockFindFirst = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: {
      findFirst: mockFindFirst,
    },
    eventRegistration: {
      findFirst: vi.fn(),
    },
  },
}));

// Mock next/navigation notFound & useRouter
const mockNotFound = vi.hoisted(() => vi.fn(() => {
  throw new Error("NOT_FOUND");
}));
vi.mock("next/navigation", () => ({
  notFound: mockNotFound,
  useRouter: vi.fn(() => ({ push: vi.fn(), refresh: vi.fn() })),
}));

const baseEvent = {
  id: "evt-1",
  title: "Lancement Réseau IBC",
  slug: "lancement-reseau-ibc",
  description: "Une soirée de networking pour les membres et investisseurs du réseau IBC.",
  startDate: new Date("2026-07-15T10:00:00Z"),
  endDate: new Date("2026-07-15T14:00:00Z"),
  location: "Abidjan, Cocody",
  onlineUrl: null,
  coverImagePath: "https://example.com/event.jpg",
  eventType: "IN_PERSON",
  visibility: "PUBLIC",
  maxCapacity: 100,
  pricing: { visitor: 10000, affranchi: 5000, grand_frere: 3000, boss: 0 },
  status: "PUBLISHED",
  registrations: [],
};

const parseJsonLd = () => {
  const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
  return scripts.flatMap((script) => {
    const text = script.textContent ?? "";
    try {
      return JSON.parse(text);
    } catch {
      return [];
    }
  });
};

describe("Event Detail Page", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("calls notFound when event is not found", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue(null);

    await expect(
      EventDetailPage({ params: Promise.resolve({ slug: "non-existent" }) })
    ).rejects.toThrow("NOT_FOUND");

    expect(mockNotFound).toHaveBeenCalled();
  });

  it("does not publicly render a draft event", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue(null);

    await expect(
      EventDetailPage({ params: Promise.resolve({ slug: "lancement-reseau-ibc" }) })
    ).rejects.toThrow("NOT_FOUND");

    expect(mockNotFound).toHaveBeenCalled();
  });

  it("renders full event details for public event", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue(baseEvent);

    const page = await EventDetailPage({
      params: Promise.resolve({ slug: "lancement-reseau-ibc" }),
    });
    render(page);

    expect(screen.getByText("Lancement Réseau IBC")).toBeInTheDocument();
    expect(screen.getByText("Une soirée de networking pour les membres et investisseurs du réseau IBC.")).toBeInTheDocument();
    expect(screen.getByText("15 juillet 2026")).toBeInTheDocument();
    expect(screen.getByText("Jusqu\u2019au 15 juillet 2026")).toBeInTheDocument();
    expect(screen.getByText("Abidjan, Cocody")).toBeInTheDocument();
    expect(screen.getByText("100 places restantes")).toBeInTheDocument();
    expect(screen.getByText(/S'inscrire/i)).toBeInTheDocument();

    const image = screen.getByRole("img", { name: "Lancement Réseau IBC" });
    expect(image).toBeInTheDocument();
  });

  it("injects complete JSON-LD Event for public in-person event", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue(baseEvent);

    const page = await EventDetailPage({
      params: Promise.resolve({ slug: "lancement-reseau-ibc" }),
    });
    render(page);

    const schemas = parseJsonLd();
    const eventLd = schemas.find((schema) => schema["@type"] === "Event");

    expect(eventLd).toBeDefined();
    expect(eventLd?.name).toBe(baseEvent.title);
    expect(eventLd?.description).toBe(baseEvent.description);
    expect(eventLd?.startDate).toBe(baseEvent.startDate.toISOString());
    expect(eventLd?.endDate).toBe(baseEvent.endDate.toISOString());
    expect(eventLd?.eventStatus).toBe("https://schema.org/EventScheduled");
    expect(eventLd?.organizer).toEqual({
      "@type": "Organization",
      "name": "Ivoire Business Club",
    });
    expect(eventLd?.image).toBe(`${process.env.NEXT_PUBLIC_APP_URL || "https://www.ivoire-business-club.com"}/api/media/events/${baseEvent.id}/cover`);
    expect(eventLd?.location).toEqual({
      "@type": "Place",
      "name": baseEvent.location,
      "address": baseEvent.location,
    });
    expect(eventLd?.offers).toEqual({
      "@type": "Offer",
      "price": 10000,
      "priceCurrency": "XOF",
      "availability": "https://schema.org/InStock",
      "url": `${process.env.NEXT_PUBLIC_APP_URL || "https://www.ivoire-business-club.com"}/events/${baseEvent.slug}`,
    });
  });

  it("injects BreadcrumbList for event detail", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue(baseEvent);

    const page = await EventDetailPage({
      params: Promise.resolve({ slug: "lancement-reseau-ibc" }),
    });
    render(page);

    const schemas = parseJsonLd();
    const breadcrumbLd = schemas.find((schema) => schema["@type"] === "BreadcrumbList");

    expect(breadcrumbLd).toBeDefined();
    expect(breadcrumbLd?.itemListElement).toHaveLength(3);
    expect(breadcrumbLd?.itemListElement[0]).toEqual({
      "@type": "ListItem",
      "position": 1,
      "name": "Accueil",
      "item": process.env.NEXT_PUBLIC_APP_URL || "https://www.ivoire-business-club.com",
    });
    expect(breadcrumbLd?.itemListElement[1]).toEqual({
      "@type": "ListItem",
      "position": 2,
      "name": "Événements",
      "item": `${process.env.NEXT_PUBLIC_APP_URL || "https://www.ivoire-business-club.com"}/events`,
    });
    expect(breadcrumbLd?.itemListElement[2]).toEqual({
      "@type": "ListItem",
      "position": 3,
      "name": baseEvent.title,
      "item": `${process.env.NEXT_PUBLIC_APP_URL || "https://www.ivoire-business-club.com"}/events/${baseEvent.slug}`,
    });
  });

  it("uses VirtualLocation for online events", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue({
      ...baseEvent,
      eventType: "ONLINE",
      onlineUrl: "https://meet.example.com/ibc",
      location: null,
    });

    const page = await EventDetailPage({
      params: Promise.resolve({ slug: "lancement-reseau-ibc" }),
    });
    render(page);

    const schemas = parseJsonLd();
    const eventLd = schemas.find((schema) => schema["@type"] === "Event");

    expect(eventLd?.location).toEqual({
      "@type": "VirtualLocation",
      "url": "https://meet.example.com/ibc",
    });
    expect(eventLd?.offers).toBeDefined();
  });

  it("marks offers as SoldOut when no spots remain", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue({
      ...baseEvent,
      maxCapacity: 2,
      registrations: [{ status: "REGISTERED" }, { status: "REGISTERED" }],
    });

    const page = await EventDetailPage({
      params: Promise.resolve({ slug: "lancement-reseau-ibc" }),
    });
    render(page);

    const schemas = parseJsonLd();
    const eventLd = schemas.find((schema) => schema["@type"] === "Event");

    expect(eventLd?.offers?.availability).toBe("https://schema.org/SoldOut");
  });

  it("omits offers for free public events", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue({
      ...baseEvent,
      pricing: { visitor: 0, affranchi: 0, grand_frere: 0, boss: 0 },
    });

    const page = await EventDetailPage({
      params: Promise.resolve({ slug: "lancement-reseau-ibc" }),
    });
    render(page);

    const schemas = parseJsonLd();
    const eventLd = schemas.find((schema) => schema["@type"] === "Event");

    expect(eventLd?.offers).toBeUndefined();
  });

  it("hides private event details in JSON-LD for visitors", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue({
      ...baseEvent,
      visibility: "PRIVATE",
    });

    const page = await EventDetailPage({
      params: Promise.resolve({ slug: "lancement-reseau-ibc" }),
    });
    render(page);

    const schemas = parseJsonLd();
    const eventLd = schemas.find((schema) => schema["@type"] === "Event");

    expect(eventLd?.description).toBe("Événement réservé aux membres");
    expect(eventLd?.location).toBeUndefined();
    expect(eventLd?.offers).toBeUndefined();
    expect(eventLd?.eventStatus).toBe("https://schema.org/EventScheduled");
    expect(eventLd?.name).toBe(baseEvent.title);
  });

  it("uses logo fallback image when coverImagePath is absent", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue({
      ...baseEvent,
      coverImagePath: null,
    });

    const page = await EventDetailPage({
      params: Promise.resolve({ slug: "lancement-reseau-ibc" }),
    });
    render(page);

    const schemas = parseJsonLd();
    const eventLd = schemas.find((schema) => schema["@type"] === "Event");

    expect(eventLd?.image).toBe(`${process.env.NEXT_PUBLIC_APP_URL || "https://www.ivoire-business-club.com"}/logo-ibc.webp`);
  });

  it("marks cancelled event status in JSON-LD", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue({
      ...baseEvent,
      status: "CANCELLED",
    });

    const page = await EventDetailPage({
      params: Promise.resolve({ slug: "lancement-reseau-ibc" }),
    });
    render(page);

    const schemas = parseJsonLd();
    const eventLd = schemas.find((schema) => schema["@type"] === "Event");

    expect(eventLd?.eventStatus).toBe("https://schema.org/EventCancelled");
  });

  it("renders cancelled badge for cancelled events", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue({
      ...baseEvent,
      status: "CANCELLED",
    });

    const page = await EventDetailPage({
      params: Promise.resolve({ slug: "lancement-reseau-ibc" }),
    });
    render(page);

    expect(screen.getByText("Annulé")).toBeInTheDocument();
  });

  it("renders back link to events list", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue(baseEvent);

    const page = await EventDetailPage({
      params: Promise.resolve({ slug: "lancement-reseau-ibc" }),
    });
    render(page);

    const backLink = screen.getByRole("link", { name: /Retour aux événements/i });
    expect(backLink).toHaveAttribute("href", "/events");
  });

  it("generates correct dynamic SEO metadata", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue(baseEvent);

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "lancement-reseau-ibc" }),
    });

    expect(metadata.title).toEqual({
      absolute: "Lancement Réseau IBC — Ivoire Business Club",
    });
    expect(metadata.description).toBe(baseEvent.description.slice(0, 160));
  });

  it("returns empty metadata when event is not found", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue(null);

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "non-existent" }),
    });

    expect(metadata).toEqual({});
  });

  it("renders teaser for private event and visitor", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue({
      ...baseEvent,
      visibility: "PRIVATE",
    });

    const page = await EventDetailPage({
      params: Promise.resolve({ slug: "lancement-reseau-ibc" }),
    });
    render(page);

    expect(screen.getByText("Lancement Réseau IBC")).toBeInTheDocument();
    expect(screen.getByText(/Privé/i)).toBeInTheDocument();
    expect(screen.getByText("Devenir membre pour débloquer")).toBeInTheDocument();

    const blurredDescription = screen.getByText(baseEvent.description);
    expect(blurredDescription).toHaveClass("blur-md");
    expect(screen.queryByText("Abidjan, Cocody")).not.toBeInTheDocument();
    expect(screen.queryByText("100 places restantes")).not.toBeInTheDocument();
    expect(screen.queryByText(/S'inscrire/i)).not.toBeInTheDocument();
  });

  it("renders full content for private event and authenticated member", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", tier: "AFFRANCHI" },
    });
    mockFindFirst.mockResolvedValue({
      ...baseEvent,
      visibility: "PRIVATE",
    });

    const page = await EventDetailPage({
      params: Promise.resolve({ slug: "lancement-reseau-ibc" }),
    });
    render(page);

    expect(screen.getByText("Une soirée de networking pour les membres et investisseurs du réseau IBC.")).toBeInTheDocument();
    expect(screen.getByText("Abidjan, Cocody")).toBeInTheDocument();
    expect(screen.getByText(/S'inscrire/i)).toBeInTheDocument();
  });

  it("displays remaining spots counter", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue({
      ...baseEvent,
      registrations: [
        { status: "REGISTERED" },
        { status: "REGISTERED" },
        { status: "CANCELLED" },
      ],
    });

    const page = await EventDetailPage({
      params: Promise.resolve({ slug: "lancement-reseau-ibc" }),
    });
    render(page);

    expect(screen.getByText("98 places restantes")).toBeInTheDocument();
  });

  it("displays 'Places illimitées' when maxCapacity is null", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue({
      ...baseEvent,
      maxCapacity: null,
    });

    const page = await EventDetailPage({
      params: Promise.resolve({ slug: "lancement-reseau-ibc" }),
    });
    render(page);

    expect(screen.getByText("Places illimitées")).toBeInTheDocument();
  });

  it("renders pricing grid", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue(baseEvent);

    const page = await EventDetailPage({
      params: Promise.resolve({ slug: "lancement-reseau-ibc" }),
    });
    render(page);

    expect(screen.getByText("10 000 FCFA")).toBeInTheDocument();
    expect(screen.getByText("À partir de 3 000 FCFA")).toBeInTheDocument();
  });

  it("renders 'Gratuit' when pricing is null", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue({
      ...baseEvent,
      pricing: null,
    });

    const page = await EventDetailPage({
      params: Promise.resolve({ slug: "lancement-reseau-ibc" }),
    });
    render(page);

    const gratuitLabels = screen.getAllByText("Gratuit");
    expect(gratuitLabels.length).toBeGreaterThanOrEqual(2);
  });

  it("highlights authenticated member tier price", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", tier: "GRAND_FRERE" },
    });
    mockFindFirst.mockResolvedValue(baseEvent);

    const page = await EventDetailPage({
      params: Promise.resolve({ slug: "lancement-reseau-ibc" }),
    });
    render(page);

    expect(screen.getByText(/Votre tarif/i)).toBeInTheDocument();
    expect(screen.getByText("3 000 FCFA")).toBeInTheDocument();
  });

  it("uses generic metadata description for private event when visitor", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue({
      ...baseEvent,
      visibility: "PRIVATE",
    });

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "lancement-reseau-ibc" }),
    });

    expect(metadata.description).toBe(
      "Événement réservé aux membres IBC. Devenez membre pour découvrir tous les détails."
    );
  });
});
