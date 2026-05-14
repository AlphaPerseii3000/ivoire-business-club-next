import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUserPremiumAccess, hasActiveSubscription } from "./subscription-access";

const mockSubscriptionFindFirst = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    subscription: {
      findFirst: mockSubscriptionFindFirst,
    },
  },
}));

describe("subscription access helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when the user has at least one ACTIVE subscription", async () => {
    mockSubscriptionFindFirst.mockResolvedValueOnce({ id: "sub-active", status: "ACTIVE" }).mockResolvedValueOnce({ id: "sub-active", status: "ACTIVE" });

    await expect(hasActiveSubscription("user-1")).resolves.toBe(true);
    await expect(getUserPremiumAccess("user-1")).resolves.toEqual({ hasAccess: true });
    expect(mockSubscriptionFindFirst).toHaveBeenCalledWith({
      where: { userId: "user-1", status: "ACTIVE" },
      select: { id: true },
    });
  });

  it.each(["TRIAL", "PENDING", "CANCELLED", "PAST_DUE"])(
    "returns false for %s-only users",
    async () => {
      mockSubscriptionFindFirst.mockResolvedValueOnce(null);

      await expect(hasActiveSubscription("user-2")).resolves.toBe(false);
    }
  );
});
