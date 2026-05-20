import { describe, expect, it } from "vitest";

import { attachMatchMetadata, calculateMatchPercent, countCommonTags } from "./matching";

const userTags = [
  { category: "SECTEUR" as const, value: "tech" },
  { category: "LOCALISATION" as const, value: "abidjan" },
  { category: "MONTANT" as const, value: "50k-100k" },
];

describe("matching helpers", () => {
  it("counts common tags by category and value", () => {
    expect(countCommonTags(userTags, [
      { category: "SECTEUR", value: "tech" },
      { category: "LOCALISATION", value: "cocody" },
    ])).toBe(1);
  });

  it("returns zero percent when the member has no profile tags", () => {
    expect(calculateMatchPercent(2, 0)).toBe(0);
  });

  it("calculates a bounded deterministic match percent", () => {
    expect(calculateMatchPercent(2, 3)).toBe(67);
    expect(calculateMatchPercent(10, 3)).toBe(100);
    expect(calculateMatchPercent(-1, 3)).toBe(0);
  });

  it("attaches metadata without mutating opportunities and keeps matched tags", () => {
    const opportunity = {
      id: "opp-1",
      createdAt: new Date("2026-05-19T00:00:00.000Z"),
      tags: [
        { category: "SECTEUR" as const, value: "tech" },
        { category: "LOCALISATION" as const, value: "abidjan" },
      ],
    };

    const [matched] = attachMatchMetadata([opportunity], userTags);

    expect(matched).not.toBe(opportunity);
    expect(matched.commonTagCount).toBe(2);
    expect(matched.matchPercent).toBe(67);
    expect(matched.matchedTags).toEqual(opportunity.tags);
    expect(opportunity).not.toHaveProperty("commonTagCount");
  });

  it("sorts by common tags descending then createdAt descending", () => {
    const sorted = attachMatchMetadata([
      { id: "older-two", createdAt: new Date("2026-05-18T00:00:00.000Z"), tags: [{ category: "SECTEUR" as const, value: "tech" }, { category: "LOCALISATION" as const, value: "abidjan" }] },
      { id: "newer-one", createdAt: new Date("2026-05-20T00:00:00.000Z"), tags: [{ category: "SECTEUR" as const, value: "tech" }] },
      { id: "newer-two", createdAt: new Date("2026-05-19T00:00:00.000Z"), tags: [{ category: "SECTEUR" as const, value: "tech" }, { category: "MONTANT" as const, value: "50k-100k" }] },
    ], userTags);

    expect(sorted.map((item) => item.id)).toEqual(["newer-two", "older-two", "newer-one"]);
  });

  it("ignores duplicate and invalid tag values", () => {
    const common = countCommonTags(
      [{ category: "SECTEUR", value: "tech" }, { category: "SECTEUR", value: "tech" }, { category: "SECTEUR", value: "invalid" }],
      [{ category: "SECTEUR", value: "tech" }, { category: "SECTEUR", value: "tech" }],
    );

    expect(common).toBe(1);
  });
});
