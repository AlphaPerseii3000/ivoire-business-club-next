import { getAmountForTier } from "@/lib/bank-transfer-config";
import { prisma } from "@/lib/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;
const euroFormatter = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const percentFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

export type TrendDirection = "up" | "down" | "stable";
export type AnalyticsMetric = {
  id: "mrr" | "activeMembers" | "conversion" | "churn";
  title: string;
  value: string;
  help: string;
  variation: number;
  variationLabel: string;
  trend: TrendDirection;
  trendLabel: string;
  trendSeries: number[];
};

type SubscriptionAnalyticsInput = {
  id: string;
  userId: string;
  tier: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

type UserAnalyticsInput = {
  id: string;
  createdAt: Date;
};

type SessionAnalyticsInput = {
  userId: string;
  updatedAt: Date;
  expires: Date;
};

export type AdminAnalyticsInput = {
  subscriptions: SubscriptionAnalyticsInput[];
  users: UserAnalyticsInput[];
  sessions: SessionAnalyticsInput[];
  now: Date;
};

export function safePercent(numerator: number, denominator: number) {
  if (denominator === 0) return 0;
  return (numerator / denominator) * 100;
}

export function safeVariationPercent(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

export function getTrendDirection(variation: number): TrendDirection {
  const rounded = roundMetric(variation);
  if (rounded > 0) return "up";
  if (rounded < 0) return "down";
  return "stable";
}

export function formatCurrency(value: number) {
  return euroFormatter.format(value);
}

export function formatPercent(value: number) {
  return `${percentFormatter.format(roundMetric(value))} %`;
}

export function formatVariationLabel(variation: number) {
  const rounded = roundMetric(variation);
  if (rounded > 0) return `+${percentFormatter.format(rounded)} % vs période précédente`;
  if (rounded < 0) return `${percentFormatter.format(rounded)} % vs période précédente`;
  return "Stable vs période précédente";
}

export function buildAdminAnalyticsMetrics(input: AdminAnalyticsInput): AnalyticsMetric[] {
  const { now, subscriptions, users, sessions } = input;
  const current30Start = subtractDays(now, 30);
  const previous30Start = subtractDays(now, 60);
  const current7Start = subtractDays(now, 7);
  const previous7Start = subtractDays(now, 14);

  const currentMrr = calculateMrrAt(subscriptions, now);
  const previousMrr = calculateMrrAt(subscriptions, current30Start);
  const currentActiveMembers = countDistinctActiveSessions(sessions, current7Start, now);
  const previousActiveMembers = countDistinctActiveSessions(sessions, previous7Start, current7Start);
  const currentConversion = calculateConversion(users, subscriptions, now);
  const previousConversion = calculateConversion(users, subscriptions, current30Start);
  const currentChurn = calculateChurn(subscriptions, current30Start, now);
  const previousChurn = calculateChurn(subscriptions, previous30Start, current30Start);

  return [
    makeMetric({
      id: "mrr",
      title: "MRR",
      current: currentMrr,
      previous: previousMrr,
      value: formatCurrency(currentMrr),
      help: "Revenu mensuel des abonnements actifs",
      trendSeries: [previousMrr, currentMrr],
    }),
    makeMetric({
      id: "activeMembers",
      title: "Membres actifs (7j)",
      current: currentActiveMembers,
      previous: previousActiveMembers,
      value: String(currentActiveMembers),
      help: "Sessions actives suivies côté serveur uniquement",
      trendSeries: [previousActiveMembers, currentActiveMembers],
    }),
    makeMetric({
      id: "conversion",
      title: "Conversion onboarding → signup",
      current: currentConversion,
      previous: previousConversion,
      value: formatPercent(currentConversion),
      help: "Proxy MVP basé sur les abonnements créés",
      trendSeries: [previousConversion, currentConversion],
    }),
    makeMetric({
      id: "churn",
      title: "Churn mensuel",
      current: currentChurn,
      previous: previousChurn,
      value: formatPercent(currentChurn),
      help: "Résiliations des 30 derniers jours rapportées aux abonnements actifs",
      trendSeries: [previousChurn, currentChurn],
    }),
  ];
}

export async function getAdminAnalyticsMetrics(now = new Date()) {
  const [subscriptions, users, sessions] = await Promise.all([
    prisma.subscription.findMany({
      select: { id: true, userId: true, tier: true, status: true, createdAt: true, updatedAt: true },
    }),
    prisma.user.findMany({ select: { id: true, createdAt: true } }),
    prisma.session.findMany({ select: { userId: true, updatedAt: true, expires: true } }),
  ]);

  return buildAdminAnalyticsMetrics({ subscriptions, users, sessions, now });
}

function makeMetric({
  id,
  title,
  current,
  previous,
  value,
  help,
  trendSeries,
}: {
  id: AnalyticsMetric["id"];
  title: string;
  current: number;
  previous: number;
  value: string;
  help: string;
  trendSeries: number[];
}): AnalyticsMetric {
  const variation = safeVariationPercent(current, previous);
  const trend = getTrendDirection(variation);
  return {
    id,
    title,
    value,
    help,
    variation,
    variationLabel: formatVariationLabel(variation),
    trend,
    trendLabel: getTrendLabel(trend),
    trendSeries,
  };
}

function calculateMrrAt(subscriptions: SubscriptionAnalyticsInput[], at: Date) {
  return subscriptions.reduce((total, subscription) => {
    const wasCreated = subscription.createdAt <= at;
    const isActive = subscription.status === "ACTIVE";
    const cancelledAfterDate = subscription.status === "CANCELLED" && subscription.updatedAt > at;
    const shouldCount = wasCreated && (isActive || cancelledAfterDate);
    return shouldCount ? total + getAmountForTier(subscription.tier) : total;
  }, 0);
}

function countDistinctActiveSessions(sessions: SessionAnalyticsInput[], start: Date, end: Date) {
  const activeUserIds = new Set<string>();
  for (const session of sessions) {
    const isUpdatedInPeriod = session.updatedAt >= start && session.updatedAt < end;
    const isUnexpiredAtEnd = session.expires >= end;
    if (isUpdatedInPeriod && isUnexpiredAtEnd) activeUserIds.add(session.userId);
  }
  return activeUserIds.size;
}

function calculateConversion(users: UserAnalyticsInput[], subscriptions: SubscriptionAnalyticsInput[], at: Date) {
  const usersAtDate = users.filter((user) => user.createdAt <= at).length;
  const subscribedUserIds = new Set(
    subscriptions.filter((subscription) => subscription.createdAt <= at).map((subscription) => subscription.userId),
  );
  return safePercent(subscribedUserIds.size, usersAtDate);
}

function calculateChurn(subscriptions: SubscriptionAnalyticsInput[], start: Date, end: Date) {
  const cancelledInPeriod = subscriptions.filter((subscription) => {
    return subscription.status === "CANCELLED" && subscription.updatedAt >= start && subscription.updatedAt < end;
  }).length;
  const activeAtStart = subscriptions.filter((subscription) => {
    const wasCreated = subscription.createdAt <= start;
    const isActiveNow = subscription.status === "ACTIVE";
    const wasCancelledAfterStart = subscription.status === "CANCELLED" && subscription.updatedAt > start;
    return wasCreated && (isActiveNow || wasCancelledAfterStart);
  }).length;
  return safePercent(cancelledInPeriod, activeAtStart);
}

function subtractDays(date: Date, days: number) {
  return new Date(date.getTime() - days * DAY_MS);
}

function roundMetric(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 10) / 10;
}

function getTrendLabel(trend: TrendDirection) {
  if (trend === "up") return "Tendance en hausse";
  if (trend === "down") return "Tendance en baisse";
  return "Tendance stable";
}
