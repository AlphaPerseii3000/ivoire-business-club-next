import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ExpertDetailPage from "./page";

const mockAuth = vi.hoisted(() => vi.fn());
const mockFindUnique = vi.hoisted(() => vi.fn());
const mockHasActiveSubscription = vi.hoisted(() => vi.fn());
const mockNotFound = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    expert: {
      findUnique: mockFindUnique,
    },
  },
}));

vi.mock("@/lib/subscription-access", () => ({
  hasActiveSubscription: mockHasActiveSubscription,
}));

vi.mock("next/navigation", () => ({
  notFound: mockNotFound,
}));

const mockExpert = {
  id: "exp-1",
  name: "Alice Consultant",
  slug: "alice-consultant",
  title: "Finance Expert",
  bio: "Une biographie complete avec de nombreux details interessants.",
  photoUrl: "/photo1.jpg",
  phone: "+22501020304",
  email: "alice@expert.com",
  whatsapp: "+22501020304",
  specialties: "Finance, Audit",
  requiredTier: "AFFRANCHI",
  isPublished: true,
  createdAt: new Date(),
};

describe("ExpertDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls notFound when expert is not found", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockAuth.mockResolvedValue(null);

    await ExpertDetailPage({ params: Promise.resolve({ slug: "unknown" }) });

    expect(mockNotFound).toHaveBeenCalled();
  });

  it("calls notFound when expert is not published and user is not admin", async () => {
    mockFindUnique.mockResolvedValue({
      ...mockExpert,
      isPublished: false,
    });
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "MEMBER" } });

    await ExpertDetailPage({ params: Promise.resolve({ slug: "alice-consultant" }) });

    expect(mockNotFound).toHaveBeenCalled();
  });

  it("does not call notFound for draft experts if user is admin", async () => {
    mockFindUnique.mockResolvedValue({
      ...mockExpert,
      isPublished: false,
    });
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockHasActiveSubscription.mockResolvedValue(true);

    render(await ExpertDetailPage({ params: Promise.resolve({ slug: "alice-consultant" }) }));

    expect(mockNotFound).not.toHaveBeenCalled();
    expect(screen.getByText("Alice Consultant")).toBeInTheDocument();
  });

  it("renders full profile (bio and contacts) for authorized user", async () => {
    mockFindUnique.mockResolvedValue(mockExpert);
    mockAuth.mockResolvedValue({ user: { id: "user-1", tier: "AFFRANCHI", role: "MEMBER" } });
    mockHasActiveSubscription.mockResolvedValue(true);

    render(await ExpertDetailPage({ params: Promise.resolve({ slug: "alice-consultant" }) }));

    expect(screen.getByText("Alice Consultant")).toBeInTheDocument();
    expect(screen.getByText("Une biographie complete avec de nombreux details interessants.")).toBeInTheDocument();
    expect(screen.getByText("Contacter sur WhatsApp")).toBeInTheDocument();
    expect(screen.getByText("Envoyer un Email")).toBeInTheDocument();
    expect(screen.getByText("Appeler par Téléphone")).toBeInTheDocument();
    expect(screen.queryByTestId("gate-panel")).not.toBeInTheDocument();
  });

  it("masks bio/contacts and renders Gate Panel for unauthorized user", async () => {
    mockFindUnique.mockResolvedValue({
      ...mockExpert,
      requiredTier: "BOSS",
    });
    mockAuth.mockResolvedValue({ user: { id: "user-1", tier: "AFFRANCHI", role: "MEMBER" } });
    mockHasActiveSubscription.mockResolvedValue(true);

    render(await ExpertDetailPage({ params: Promise.resolve({ slug: "alice-consultant" }) }));

    expect(screen.getByText("Alice Consultant")).toBeInTheDocument();
    expect(screen.queryByText("Une biographie complete avec de nombreux details interessants.")).not.toBeInTheDocument();
    expect(screen.queryByText("Contacter sur WhatsApp")).not.toBeInTheDocument();
    expect(screen.getByTestId("gate-panel")).toBeInTheDocument();
    expect(screen.getByText("Profil réservé aux membres Premium")).toBeInTheDocument();
  });
});
