import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import PartnersPage from "./page";

// Configuration des simulations (mocks)
const mockAuth = vi.hoisted(() => vi.fn());
const mockFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    company: {
      findMany: mockFindMany,
    },
  },
}));

const mockCompaniesList = [
  {
    id: "comp-1",
    name: "Alpha BTP",
    slug: "alpha-btp",
    description: "Une entreprise leader du BTP en Côte d'Ivoire.",
    logoUrl: "/logo1.png",
    contactName: "Jean Dupont",
    contactPhone: "+22501020304",
    contactEmail: "contact@alphabtp.com",
    website: "https://alphabtp.com",
    location: "Abidjan, Zone 4",
    certifications: "ISO 9001, IBC Agréé",
    sectors: "BTP, Infrastructure",
    isPublished: true,
    createdAt: new Date("2026-06-01"),
  },
  {
    id: "comp-2",
    name: "Beta Services",
    slug: "beta-services",
    description: "Solutions informatiques et services cloud.",
    logoUrl: null,
    contactName: "Marie Curie",
    contactPhone: "+22505060708",
    contactEmail: "info@betaservices.com",
    website: null,
    location: "Abidjan, Cocody",
    certifications: "Microsoft Partner",
    sectors: "Services, Tech",
    isPublished: true,
    createdAt: new Date("2026-06-02"),
  },
];

describe("PartnersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a list of published companies", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindMany.mockResolvedValue(mockCompaniesList);

    render(await PartnersPage({ searchParams: Promise.resolve({}) }));

    // Vérifier le titre de la page
    expect(screen.getByRole("heading", { name: "Partenaires Agréés & Entreprises" })).toBeInTheDocument();

    // Vérifier que les deux entreprises sont affichées
    expect(screen.getByText("Alpha BTP")).toBeInTheDocument();
    expect(screen.getByText("Beta Services")).toBeInTheDocument();
    expect(screen.getByText("Une entreprise leader du BTP en Côte d'Ivoire.")).toBeInTheDocument();
    expect(screen.getByText("Solutions informatiques et services cloud.")).toBeInTheDocument();
  });

  it("filters the list based on sector searchParam", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindMany.mockResolvedValue(mockCompaniesList);

    render(await PartnersPage({ searchParams: Promise.resolve({ sector: "BTP" }) }));

    expect(screen.getByText("Alpha BTP")).toBeInTheDocument();
    expect(screen.queryByText("Beta Services")).not.toBeInTheDocument();
  });

  it("renders EmptyState when no companies match the filter", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindMany.mockResolvedValue(mockCompaniesList);

    render(await PartnersPage({ searchParams: Promise.resolve({ sector: "Finance" }) }));

    expect(screen.getByText("Aucune entreprise trouvée")).toBeInTheDocument();
    expect(screen.queryByText("Alpha BTP")).not.toBeInTheDocument();
    expect(screen.queryByText("Beta Services")).not.toBeInTheDocument();
  });
});
