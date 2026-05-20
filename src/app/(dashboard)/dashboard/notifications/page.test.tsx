import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import NotificationsPage from "./page";

const mockAuth = vi.hoisted(() => vi.fn());
const mockGetUserPremiumAccess = vi.hoisted(() => vi.fn());
const mockNotificationFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/subscription-access", () => ({ getUserPremiumAccess: mockGetUserPremiumAccess }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    notification: { findMany: mockNotificationFindMany },
  },
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`); }) }));

describe("NotificationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "author-1" } });
    mockGetUserPremiumAccess.mockResolvedValue({ hasAccess: true });
    mockNotificationFindMany.mockResolvedValue([]);
  });

  it("uses the dashboard premium gate", async () => {
    mockGetUserPremiumAccess.mockResolvedValue({ hasAccess: false });

    render(await NotificationsPage());

    expect(screen.getByText("Votre abonnement est inactif. Renouvelez pour accéder aux deals.")).toBeInTheDocument();
    expect(mockNotificationFindMany).not.toHaveBeenCalled();
  });

  it("shows current user notifications with interest link", async () => {
    mockNotificationFindMany.mockResolvedValue([
      {
        id: "notif-1",
        title: "Awa est intéressé(e) par votre deal Terrain à Cocody",
        body: "Awa est intéressé(e) par votre deal Terrain à Cocody",
        href: "/dashboard/opportunities/opp-1?highlight=interests",
        readAt: null,
        createdAt: new Date("2026-05-20T00:00:00.000Z"),
      },
    ]);

    render(await NotificationsPage());

    expect(mockNotificationFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "author-1" } }));
    expect(screen.getAllByText("Awa est intéressé(e) par votre deal Terrain à Cocody")).toHaveLength(2);
    expect(screen.getByRole("link", { name: /Awa est intéressé\(e\)/ })).toHaveAttribute(
      "href",
      "/dashboard/opportunities/opp-1?highlight=interests",
    );
    expect(screen.getByText("Non lu")).toBeInTheDocument();
  });
});
