import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import CompanyDetailPage from "./page";

const mockAuth = vi.hoisted(() => vi.fn());
const mockFindUnique = vi.hoisted(() => vi.fn());
const mockNotFound = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    company: {
      findUnique: mockFindUnique,
    },
  },
}));

vi.mock("next/navigation", () => ({
  notFound: mockNotFound,
}));

const mockCompany = {
  id: "comp-1",
  name: "Alpha BTP",
  slug: "alpha-btp",
  description: "Description de l'entreprise Alpha BTP.",
  logoUrl: "/logo1.png",
  contactName: "Jean Dupont",
  contactPhone: "+22501020304",
  contactEmail: "contact@alphabtp.com",
  website: "https://alphabtp.com",
  location: "Abidjan, Zone 4",
  certifications: "ISO 9001, IBC Agréé",
  sectors: "BTP, Infrastructure",
  isPublished: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("CompanyDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls notFound when company is not found", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockAuth.mockResolvedValue(null);

    await CompanyDetailPage({ params: Promise.resolve({ slug: "unknown" }) });

    expect(mockNotFound).toHaveBeenCalled();
  });

  it("calls notFound when company is not published and user is not admin", async () => {
    mockFindUnique.mockResolvedValue({
      ...mockCompany,
      isPublished: false,
    });
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "MEMBER" } });

    await CompanyDetailPage({ params: Promise.resolve({ slug: "alpha-btp" }) });

    expect(mockNotFound).toHaveBeenCalled();
  });

  it("does not call notFound for draft companies if user is admin", async () => {
    mockFindUnique.mockResolvedValue({
      ...mockCompany,
      isPublished: false,
    });
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });

    render(await CompanyDetailPage({ params: Promise.resolve({ slug: "alpha-btp" }) }));

    expect(mockNotFound).not.toHaveBeenCalled();
    expect(screen.getByText("Alpha BTP")).toBeInTheDocument();
  });

  it("renders full company details (description, certifications, contacts)", async () => {
    mockFindUnique.mockResolvedValue(mockCompany);
    mockAuth.mockResolvedValue(null);

    render(await CompanyDetailPage({ params: Promise.resolve({ slug: "alpha-btp" }) }));

    expect(screen.getByText("Alpha BTP")).toBeInTheDocument();
    expect(screen.getByText("Description de l'entreprise Alpha BTP.")).toBeInTheDocument();
    expect(screen.getByText("ISO 9001")).toBeInTheDocument();
    expect(screen.getByText("IBC Agréé")).toBeInTheDocument();
    expect(screen.getByText("Contact : Jean Dupont")).toBeInTheDocument();
    expect(screen.getByText("Visiter le Site Web")).toBeInTheDocument();
    expect(screen.getByText("Envoyer un Email")).toBeInTheDocument();
    expect(screen.getByText("Appeler au Téléphone")).toBeInTheDocument();
  });
});
