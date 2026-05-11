import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2026-04-22.dahlia",
});

export const PLANS = {
  AFFRANCHI: {
    name: "Les Affranchis",
    monthly: { eur: 29, priceId: process.env.STRIPE_AFFRANCHI_MONTHLY_PRICE_ID ?? "" },
    annual: { eur: 290, priceId: process.env.STRIPE_AFFRANCHI_ANNUAL_PRICE_ID ?? "" },
  },
  GRAND_FRERE: {
    name: "Les Grands Frères",
    monthly: { eur: 59, priceId: process.env.STRIPE_GRAND_FRERE_MONTHLY_PRICE_ID ?? "" },
    annual: { eur: 590, priceId: process.env.STRIPE_GRAND_FRERE_ANNUAL_PRICE_ID ?? "" },
  },
  BOSS: {
    name: "Les Boss",
    monthly: { eur: 99, priceId: process.env.STRIPE_BOSS_MONTHLY_PRICE_ID ?? "" },
    annual: { eur: 990, priceId: process.env.STRIPE_BOSS_ANNUAL_PRICE_ID ?? "" },
  },
} as const;

export type PlanKey = keyof typeof PLANS;
export type PlanPeriod = "monthly" | "annual";
