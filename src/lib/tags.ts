export const TAG_CATEGORIES = ["SECTEUR", "MONTANT", "LOCALISATION"] as const;

export type TagCategory = (typeof TAG_CATEGORIES)[number];

export type TagOption = {
  category: TagCategory;
  value: string;
  label: string;
};

export type SelectedTag = {
  category: TagCategory;
  value: string;
};

export const TAG_CATEGORY_LABELS: Record<TagCategory, string> = {
  SECTEUR: "Secteur",
  MONTANT: "Montant recherché",
  LOCALISATION: "Localisation",
};

export const TAG_OPTIONS = [
  { category: "SECTEUR", value: "immobilier", label: "Immobilier" },
  { category: "SECTEUR", value: "business", label: "Business" },
  { category: "SECTEUR", value: "investissement", label: "Investissement" },
  { category: "SECTEUR", value: "partenariat", label: "Partenariat" },
  { category: "SECTEUR", value: "agriculture", label: "Agriculture" },
  { category: "SECTEUR", value: "tech", label: "Tech" },
  { category: "MONTANT", value: "10k-50k", label: "10k-50k€" },
  { category: "MONTANT", value: "50k-100k", label: "50k-100k€" },
  { category: "MONTANT", value: "100k-plus", label: "100k€+" },
  { category: "LOCALISATION", value: "abidjan", label: "Abidjan" },
  { category: "LOCALISATION", value: "cocody", label: "Cocody" },
  { category: "LOCALISATION", value: "marcory", label: "Marcory" },
  { category: "LOCALISATION", value: "plateau", label: "Plateau" },
  { category: "LOCALISATION", value: "yopougon", label: "Yopougon" },
  { category: "LOCALISATION", value: "treichville", label: "Treichville" },
  { category: "LOCALISATION", value: "bingerville", label: "Bingerville" },
  { category: "LOCALISATION", value: "koumassi", label: "Koumassi" },
  { category: "LOCALISATION", value: "riviera", label: "Riviera" },
] as const satisfies readonly TagOption[];

export const TAG_OPTIONS_BY_CATEGORY = TAG_CATEGORIES.map((category) => ({
  category,
  label: TAG_CATEGORY_LABELS[category],
  options: TAG_OPTIONS.filter((option) => option.category === category),
}));

export function getTagKey(tag: SelectedTag) {
  return `${tag.category}:${tag.value}`;
}

export function isTagCategory(value: string): value is TagCategory {
  return TAG_CATEGORIES.includes(value as TagCategory);
}

export function isValidTagOption(tag: SelectedTag): boolean {
  return TAG_OPTIONS.some((option) => option.category === tag.category && option.value === tag.value);
}

export function getTagLabel(tag: SelectedTag): string {
  return TAG_OPTIONS.find((option) => option.category === tag.category && option.value === tag.value)?.label ?? tag.value;
}

export function dedupeTags(tags: readonly SelectedTag[] = []): SelectedTag[] {
  const seen = new Set<string>();
  const result: SelectedTag[] = [];

  for (const tag of tags) {
    if (!isValidTagOption(tag)) {
      continue;
    }

    const key = getTagKey(tag);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push({ category: tag.category, value: tag.value });
  }

  return result;
}

export function getTagFilterHref(tag: SelectedTag) {
  return `/dashboard/opportunities?tagCategory=${encodeURIComponent(tag.category)}&tagValue=${encodeURIComponent(tag.value)}`;
}
