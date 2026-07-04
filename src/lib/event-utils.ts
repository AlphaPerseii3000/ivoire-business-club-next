export type Pricing = {
  visitor?: number | null;
  affranchi?: number | null;
  grand_frere?: number | null;
  boss?: number | null;
};

export type EventRegistrationStub = {
  status: string;
};

export function getRemainingSpots(
  maxCapacity: number | null | undefined,
  registrations: EventRegistrationStub[]
): number | null {
  if (maxCapacity === null || maxCapacity === undefined) return null;
  const registered = registrations.filter((r) => r.status === "REGISTERED").length;
  return Math.max(0, maxCapacity - registered);
}

export function getPriceForTier(pricing: Pricing | null, tier: string): number | null {
  if (!pricing) return null;
  const key = tier.toLowerCase() as keyof Pricing;
  const value = pricing[key];
  return typeof value === "number" && value > 0 ? value : null;
}

export function formatEventPricing(pricing: Pricing | null) {
  const visitor = pricing?.visitor ?? null;
  const memberValues = [pricing?.affranchi, pricing?.grand_frere, pricing?.boss].filter(
    (v): v is number => typeof v === "number" && v > 0
  );
  const memberMin = memberValues.length > 0 ? Math.min(...memberValues) : null;

  const isFree =
    !pricing ||
    [pricing.visitor, pricing.affranchi, pricing.grand_frere, pricing.boss].every(
      (v) => v === null || v === undefined || v === 0
    );

  return { visitor, memberMin, isFree };
}

export function formatPrice(price: number | null, fallback?: string): string {
  if (price === null || price === undefined || price <= 0) {
    return fallback ?? "Gratuit";
  }
  return `${price.toLocaleString("fr-FR")} FCFA`;
}

export function getEventTypeLabel(eventType?: string | null): string {
  return eventType === "ONLINE" ? "En ligne" : "En présentiel";
}

export function formatEventDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function isPrivateEventForVisitor(
  visibility?: string | null,
  isAuthenticated?: boolean
): boolean {
  return visibility === "PRIVATE" && !isAuthenticated;
}

export function normalizePricing(pricing: unknown): Pricing | null {
  if (!pricing || typeof pricing !== "object" || Array.isArray(pricing)) {
    return null;
  }
  const candidate = pricing as Record<string, unknown>;
  const normalized: Pricing = {};
  const keys: Array<keyof Pricing> = ["visitor", "affranchi", "grand_frere", "boss"];
  for (const key of keys) {
    const value = candidate[key];
    normalized[key] = typeof value === "number" && value > 0 ? value : null;
  }
  return normalized;
}
