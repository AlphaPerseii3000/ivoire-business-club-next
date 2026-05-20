import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MemberProfilePage from "./page";

const mockAuth = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockNotFound = vi.hoisted(() => vi.fn(() => { throw new Error("notFound"); }));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: mockUserFindUnique } },
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`); }),
  notFound: mockNotFound,
}));

const params = { params: Promise.resolve({ id: "member-1" }) };

function verifiedMember(overrides = {}) {
  return {
    id: "member-1",
    name: "Awa",
    bio: "Investisseuse",
    image: null,
    phone: "+22500000000",
    location: "Abidjan",
    country: "CI",
    tier: "AFFRANCHI",
    verificationStatus: "VERIFIED",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    tags: [],
    reviewsReceived: [],
    ...overrides,
  };
}

describe("MemberProfilePage reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "viewer-1" } });
    mockUserFindUnique.mockResolvedValue(verifiedMember());
  });

  it("does not render Avis reçus when there are no reviews", async () => {
    render(await MemberProfilePage(params));

    expect(screen.queryByText("Avis reçus")).not.toBeInTheDocument();
  });

  it("renders received reviews with stars, comment, reviewer name, and date", async () => {
    mockUserFindUnique.mockResolvedValue(verifiedMember({
      reviewsReceived: [
        {
          id: "review-1",
          rating: 5,
          comment: "Partenaire très sérieux.",
          createdAt: new Date("2026-05-20T00:00:00.000Z"),
          reviewer: { name: "Koffi" },
        },
      ],
    }));

    render(await MemberProfilePage(params));

    expect(screen.getByText("Avis reçus")).toBeInTheDocument();
    expect(screen.getByLabelText("5 sur 5 étoiles")).toBeInTheDocument();
    expect(screen.getByText("Partenaire très sérieux.")).toBeInTheDocument();
    expect(screen.getByText("Par Koffi")).toBeInTheDocument();
    expect(screen.getByText("20/05/2026")).toBeInTheDocument();
  });

  it("preserves the verified profile guard", async () => {
    mockUserFindUnique.mockResolvedValue(verifiedMember({ verificationStatus: "PENDING" }));

    await expect(MemberProfilePage(params)).rejects.toThrow("notFound");
    expect(mockNotFound).toHaveBeenCalled();
  });
});
