import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    subscription: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
    session: { findMany: vi.fn() },
  },
}));

import {
  buildAdminAnalyticsMetrics,
  formatCurrency,
  formatPercent,
  formatVariationLabel,
  getTrendDirection,
  safePercent,
  safeVariationPercent,
} from "./admin-analytics";

const now = new Date("2026-05-21T12:00:00.000Z");
const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

function subscription(overrides: Partial<Parameters<typeof buildAdminAnalyticsMetrics>[0]["subscriptions"][number]>) {
  return {
    id: "sub-1",
    userId: "user-1",
    tier: "AFFRANCHI",
    status: "ACTIVE",
    createdAt: daysAgo(10),
    updatedAt: daysAgo(1),
    ...overrides,
  };
}

function user(id: string, createdAt = daysAgo(10)) {
  return { id, createdAt };
}

function session(userId: string, updatedAt: Date, expires: Date) {
  return { userId, updatedAt, expires };
}

describe("admin analytics helpers", () => {
  it("protects percentage helpers from zero denominators", () => {
    expect(safePercent(5, 0)).toBe(0);
    expect(safeVariationPercent(0, 0)).toBe(0);
    expect(safeVariationPercent(50, 0)).toBe(100);
    expect(formatPercent(safePercent(1, 4))).toBe("25 %");
  });

  it("formats French euros and variation labels", () => {
    expect(formatCurrency(177)).toContain("177");
    expect(formatCurrency(177)).toContain("€");
    expect(formatVariationLabel(12.34)).toBe("+12,3 % vs période précédente");
    expect(formatVariationLabel(-8.21)).toBe("-8,2 % vs période précédente");
    expect(formatVariationLabel(0)).toBe("Stable vs période précédente");
    expect(getTrendDirection(0)).toBe("stable");
  });

  it("calculates MRR from ACTIVE subscriptions by tier", () => {
    const metrics = buildAdminAnalyticsMetrics({
      now,
      users: [user("user-1"), user("user-2"), user("user-3")],
      sessions: [],
      subscriptions: [
        subscription({ id: "sub-1", userId: "user-1", tier: "AFFRANCHI" }),
        subscription({ id: "sub-2", userId: "user-2", tier: "GRAND_FRERE" }),
        subscription({ id: "sub-3", userId: "user-3", tier: "BOSS" }),
        subscription({ id: "sub-4", userId: "user-4", tier: "BOSS", status: "PENDING" }),
      ],
    });

    expect(metrics.find((metric) => metric.id === "mrr")?.value).toContain("177");
  });

  it("counts distinct server sessions active over the last 7 days", () => {
    const metrics = buildAdminAnalyticsMetrics({
      now,
      users: [user("user-1"), user("user-2"), user("user-3")],
      subscriptions: [],
      sessions: [
        session("user-1", daysAgo(1), daysAgo(-2)),
        session("user-1", daysAgo(2), daysAgo(-2)),
        session("user-2", daysAgo(8), daysAgo(-2)),
        session("user-3", daysAgo(1), daysAgo(1)),
      ],
    });

    expect(metrics.find((metric) => metric.id === "activeMembers")?.value).toBe("1");
    expect(metrics.find((metric) => metric.id === "activeMembers")?.help).toBe("Sessions actives suivies côté serveur uniquement");
  });

  it("calculates conversion as users with subscriptions divided by registered users", () => {
    const metrics = buildAdminAnalyticsMetrics({
      now,
      users: [user("user-1"), user("user-2"), user("user-3"), user("user-4")],
      sessions: [],
      subscriptions: [
        subscription({ id: "sub-1", userId: "user-1" }),
        subscription({ id: "sub-2", userId: "user-1" }),
        subscription({ id: "sub-3", userId: "user-2" }),
      ],
    });

    const conversion = metrics.find((metric) => metric.id === "conversion");
    expect(conversion?.value).toBe("50 %");
    expect(conversion?.help).toBe("Proxy MVP basé sur les abonnements créés");
  });

  it("calculates monthly churn and never returns NaN or Infinity", () => {
    const metrics = buildAdminAnalyticsMetrics({
      now,
      users: [user("user-1"), user("user-2")],
      sessions: [],
      subscriptions: [
        subscription({ id: "sub-1", userId: "user-1", status: "CANCELLED", createdAt: daysAgo(60), updatedAt: daysAgo(3) }),
        subscription({ id: "sub-2", userId: "user-2", status: "ACTIVE", createdAt: daysAgo(60), updatedAt: daysAgo(2) }),
      ],
    });

    const churn = metrics.find((metric) => metric.id === "churn");
    expect(churn?.value).toBe("50 %");
    expect(churn?.value).not.toContain("NaN");
    expect(churn?.value).not.toContain("Infinity");

    const zeroChurn = buildAdminAnalyticsMetrics({ now, users: [], sessions: [], subscriptions: [] }).find((metric) => metric.id === "churn");
    expect(zeroChurn?.value).toBe("0 %");
  });

  it("reports positive, negative and stable trends", () => {
    const stable = buildAdminAnalyticsMetrics({ now, users: [], sessions: [], subscriptions: [] });
    expect(stable.find((metric) => metric.id === "mrr")?.variationLabel).toBe("Stable vs période précédente");

    const positive = buildAdminAnalyticsMetrics({
      now,
      users: [user("user-1")],
      sessions: [],
      subscriptions: [subscription({ id: "sub-1", userId: "user-1", createdAt: daysAgo(10) })],
    });
    expect(positive.find((metric) => metric.id === "mrr")?.trend).toBe("up");

    const negative = buildAdminAnalyticsMetrics({
      now,
      users: [user("user-1")],
      sessions: [],
      subscriptions: [subscription({ id: "sub-1", userId: "user-1", status: "CANCELLED", createdAt: daysAgo(60), updatedAt: daysAgo(10) })],
    });
    expect(negative.find((metric) => metric.id === "mrr")?.trend).toBe("down");
  });
});
