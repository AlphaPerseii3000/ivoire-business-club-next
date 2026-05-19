export const OPPORTUNITY_CATEGORY_FILTERS = [
  { value: "INVESTISSEMENT", label: "Investissement" },
  { value: "BUSINESS", label: "Business" },
  { value: "PARTENARIAT", label: "Partenariat" },
  { value: "IMMOBILIER", label: "Immobilier" },
] as const;

export type OpportunityCategoryValue = (typeof OPPORTUNITY_CATEGORY_FILTERS)[number]["value"];
