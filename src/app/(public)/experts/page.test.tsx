import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ExpertsPage from "./page";

// Setup mocks
const mockAuth = vi.hoisted(() => vi.fn());
const mockFindMany = vi.hoisted(() => vi.fn());
const mockHasActiveSubscription = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    expert: {
      findMany: mockFindMany,
    },
  },
}));

vi.mock("@/lib/subscription-access", () => ({
  hasActiveSubscription: mockHasActiveSubscription,
}));

const mockExpertsList = [
  {
    id: "exp-1",
    name: "Alice Consultant",
    slug: "alice-consultant",
    title: "Finance Expert",
    photoUrl: "/photo1.jpg",
    specialties: "Finance, Audit",
    requiredTier: "AFFRANCHI",
    isPublished: true,
    createdAt: new Date("2026-06-01"),
  },
  {
    id: "exp-2",
    name: "Bob Avocat",
    slug: "bob-avocat",
    title: "Juriste",
    photoUrl: null,
    specialties: "Droit, Immobilier",
    requiredTier: "BOSS",
    isPublished: true,
    createdAt: new Date("2026-06-02"),
  },
];

describe("ExpertsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a list of published experts", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindMany.mockResolvedValue(mockExpertsList);
    mockHasActiveSubscription.mockResolvedValue(false);

    render(await ExpertsPage({ searchParams: Promise.resolve({}) }));

    // Check heading
    expect(screen.getByRole("heading", { name: "Nos Experts" })).toBeInTheDocument();
    
    // Check both experts are rendered
    expect(screen.getByText("Alice Consultant")).toBeInTheDocument();
    expect(screen.getByText("Bob Avocat")).toBeInTheDocument();
    expect(screen.getByText("Finance Expert")).toBeInTheDocument();
    expect(screen.getByText("Juriste")).toBeInTheDocument();
  });

  it("filters the list based on specialty searchParam", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindMany.mockResolvedValue(mockExpertsList);
    mockHasActiveSubscription.mockResolvedValue(false);

    render(await ExpertsPage({ searchParams: Promise.resolve({ specialty: "Finance" }) }));

    expect(screen.getByText("Alice Consultant")).toBeInTheDocument();
    expect(screen.queryByText("Bob Avocat")).not.toBeInTheDocument();
  });

  it("renders EmptyState when no experts match the filter", async () => {
    mockAuth.mockResolvedValue(null);
    mockFindMany.mockResolvedValue(mockExpertsList);
    mockHasActiveSubscription.mockResolvedValue(false);

    render(await ExpertsPage({ searchParams: Promise.resolve({ specialty: "Fiscalite" }) }));

    expect(screen.getByText("Aucun expert trouvé")).toBeInTheDocument();
    expect(screen.queryByText("Alice Consultant")).not.toBeInTheDocument();
    expect(screen.queryByText("Bob Avocat")).not.toBeInTheDocument();
  });

  it("renders a lock icon next to the tier badge when user does not have access", async () => {
    mockAuth.mockResolvedValue(null); // Anonymous user
    mockFindMany.mockResolvedValue(mockExpertsList);
    mockHasActiveSubscription.mockResolvedValue(false);

    render(await ExpertsPage({ searchParams: Promise.resolve({}) }));

    const lockIcons = screen.getAllByTestId("lock-icon");
    expect(lockIcons.length).toBe(2);
  });

  it("does not render lock icons for users with sufficient subscription tier access", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", tier: "BOSS", role: "MEMBER" } });
    mockFindMany.mockResolvedValue(mockExpertsList);
    mockHasActiveSubscription.mockResolvedValue(true);

    render(await ExpertsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.queryAllByTestId("lock-icon")).toHaveLength(0);
  });
});
