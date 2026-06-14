import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUserPremiumAccess, hasActiveSubscription } from "./subscription-access";

const mockSubscriptionFindFirst = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    subscription: {
      findFirst: mockSubscriptionFindFirst,
    },
    user: {
      findUnique: mockUserFindUnique,
    },
  },
}));

describe("subscription access helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when the user has at least one ACTIVE subscription", async () => {
    mockUserFindUnique.mockResolvedValueOnce({ role: "MEMBER" });
    mockSubscriptionFindFirst.mockResolvedValueOnce({ id: "sub-active", status: "ACTIVE" }).mockResolvedValueOnce({ id: "sub-active", status: "ACTIVE" });

    await expect(hasActiveSubscription("user-1")).resolves.toBe(true);
    await expect(getUserPremiumAccess("user-1")).resolves.toEqual({ hasAccess: true });
    expect(mockSubscriptionFindFirst).toHaveBeenCalledWith({
      where: { userId: "user-1", status: "ACTIVE" },
      select: { id: true },
    });
  });

  it("returns true for ADMIN users regardless of subscription status", async () => {
    mockUserFindUnique.mockResolvedValueOnce({ role: "ADMIN" });

    await expect(hasActiveSubscription("admin-1")).resolves.toBe(true);
    // Should NOT query subscriptions for admins
    expect(mockSubscriptionFindFirst).not.toHaveBeenCalled();
  });

  it("returns true for ADMIN users via getUserPremiumAccess", async () => {
    mockUserFindUnique.mockResolvedValueOnce({ role: "ADMIN" });

    await expect(getUserPremiumAccess("admin-1")).resolves.toEqual({ hasAccess: true });
    expect(mockSubscriptionFindFirst).not.toHaveBeenCalled();
  });

  it("returns false for non-admin users without an active subscription", async () => {
    mockUserFindUnique.mockResolvedValueOnce({ role: "MEMBER" });
    mockSubscriptionFindFirst.mockResolvedValueOnce(null);

    await expect(hasActiveSubscription("user-2")).resolves.toBe(false);
  });

  it("returns false for null/undefined userId", async () => {
    await expect(hasActiveSubscription(null)).resolves.toBe(false);
    await expect(hasActiveSubscription(undefined)).resolves.toBe(false);
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  it("returns false when user is not found", async () => {
    mockUserFindUnique.mockResolvedValueOnce(null);
    mockSubscriptionFindFirst.mockResolvedValueOnce(null);

    await expect(hasActiveSubscription("unknown-id")).resolves.toBe(false);
  });

  it.each(["TRIAL", "PENDING", "CANCELLED", "PAST_DUE"])(
    "returns false for %s-only members",
    async () => {
      mockUserFindUnique.mockResolvedValueOnce({ role: "MEMBER" });
      mockSubscriptionFindFirst.mockResolvedValueOnce(null);

      await expect(hasActiveSubscription("user-2")).resolves.toBe(false);
    }
  );
});