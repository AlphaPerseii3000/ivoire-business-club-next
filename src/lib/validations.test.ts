import { describe, it, expect } from "vitest";
import {
  profileUpdateSchema,
  reviewCreateSchema,
  subscriptionCreateSchema,
  UEMOA_COUNTRIES,
} from "./validations";

describe("profileUpdateSchema", () => {
  it("validates valid profile data with all fields", () => {
    const result = profileUpdateSchema.safeParse({
      name: "Jean Dupont",
      bio: "Entrepreneur à Abidjan",
      phone: "+225 07 08 09 10 11",
      location: "Abidjan, Côte d'Ivoire",
      country: "CI",
    });
    expect(result.success).toBe(true);
  });

  it("validates data with only name (required field)", () => {
    const result = profileUpdateSchema.safeParse({
      name: "Jean Dupont",
    });
    expect(result.success).toBe(true);
  });

  it("validates empty string for nullable bio field", () => {
    const result = profileUpdateSchema.safeParse({
      name: "Jean Dupont",
      bio: "",
    });
    expect(result.success).toBe(true);
  });

  it("validates empty string for nullable phone field", () => {
    const result = profileUpdateSchema.safeParse({
      name: "Jean Dupont",
      phone: "",
    });
    expect(result.success).toBe(true);
  });

  it("validates null for nullable fields", () => {
    const result = profileUpdateSchema.safeParse({
      name: "Jean Dupont",
      bio: null,
      phone: null,
      location: null,
      country: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects name shorter than 2 characters", () => {
    const result = profileUpdateSchema.safeParse({
      name: "J",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.name).toBeDefined();
    }
  });

  it("rejects bio longer than 500 characters", () => {
    const result = profileUpdateSchema.safeParse({
      name: "Jean Dupont",
      bio: "x".repeat(501),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.bio).toBeDefined();
    }
  });

  it("rejects invalid phone format", () => {
    const result = profileUpdateSchema.safeParse({
      name: "Jean Dupont",
      phone: "abc",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.phone).toBeDefined();
    }
  });

  it("accepts valid international phone format", () => {
    const result = profileUpdateSchema.safeParse({
      name: "Jean Dupont",
      phone: "+225 07 08 09 10 11",
    });
    expect(result.success).toBe(true);
  });

  it("accepts phone with just digits starting with plus", () => {
    const result = profileUpdateSchema.safeParse({
      name: "Jean Dupont",
      phone: "+33612345678",
    });
    expect(result.success).toBe(true);
  });

  it("rejects phone that is too short", () => {
    const result = profileUpdateSchema.safeParse({
      name: "Jean Dupont",
      phone: "+1",
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty string for location", () => {
    const result = profileUpdateSchema.safeParse({
      name: "Jean Dupont",
      location: "",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty string for country", () => {
    const result = profileUpdateSchema.safeParse({
      name: "Jean Dupont",
      country: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects location longer than 100 characters", () => {
    const result = profileUpdateSchema.safeParse({
      name: "Jean Dupont",
      location: "x".repeat(101),
    });
    expect(result.success).toBe(false);
  });
});

describe("reviewCreateSchema", () => {
  it("accepts integer ratings from 1 to 5 and comments up to 500 characters", () => {
    expect(reviewCreateSchema.safeParse({ rating: 1, comment: "Bon échange" }).success).toBe(true);
    expect(reviewCreateSchema.safeParse({ rating: 5, comment: "x".repeat(500) }).success).toBe(true);
  });

  it("rejects ratings outside 1 to 5", () => {
    expect(reviewCreateSchema.safeParse({ rating: 0, comment: "Bon échange" }).success).toBe(false);
    expect(reviewCreateSchema.safeParse({ rating: 6, comment: "Bon échange" }).success).toBe(false);
  });

  it("rejects non-integer ratings", () => {
    expect(reviewCreateSchema.safeParse({ rating: 3.5, comment: "Bon échange" }).success).toBe(false);
  });

  it("rejects empty comments after trimming", () => {
    expect(reviewCreateSchema.safeParse({ rating: 4, comment: "   " }).success).toBe(false);
  });

  it("rejects comments longer than 500 characters", () => {
    expect(reviewCreateSchema.safeParse({ rating: 4, comment: "x".repeat(501) }).success).toBe(false);
  });
});

describe("UEMOA_COUNTRIES", () => {
  it("contains all expected country codes", () => {
    const codes = UEMOA_COUNTRIES.map((c) => c.code);
    expect(codes).toContain("CI");
    expect(codes).toContain("SN");
    expect(codes).toContain("CM");
    expect(codes).toContain("GA");
    expect(codes).toContain("BF");
    expect(codes).toContain("BI");
    expect(codes).toContain("ML");
    expect(codes).toContain("NE");
    expect(codes).toContain("TG");
    expect(codes).toContain("GN");
    expect(codes).toContain("BJ");
  });

  it("has 194 countries", () => {
    expect(UEMOA_COUNTRIES).toHaveLength(194);
  });
});

describe("subscriptionCreateSchema", () => {
  it("accepts BANK_TRANSFER without providerPhone", () => {
    const result = subscriptionCreateSchema.safeParse({
      tier: "AFFRANCHI",
      period: "MONTHLY",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.provider).toBe("BANK_TRANSFER");
      expect(result.data.providerPhone).toBeNull();
    }
  });

  it("accepts SEMESTERIAL period", async () => {
    const result = subscriptionCreateSchema.safeParse({
      tier: "AFFRANCHI",
      period: "SEMESTERIAL",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.period).toBe("SEMESTERIAL");
      expect(result.data.provider).toBe("BANK_TRANSFER");
      expect(result.data.providerPhone).toBeNull();
    }
  });

  it("rejects providerPhone for BANK_TRANSFER", async () => {
    const result = subscriptionCreateSchema.safeParse({
      tier: "AFFRANCHI",
      period: "MONTHLY",
      provider: "BANK_TRANSFER",
      providerPhone: "+225 01 23 45 67",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.providerPhone).toBeDefined();
    }
  });

  it.each(["WAVE", "ORANGE_MONEY"] as const)(
    "requires providerPhone for %s",
    (provider) => {
      const result = subscriptionCreateSchema.safeParse({
        tier: "AFFRANCHI",
        period: "MONTHLY",
        provider,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.providerPhone).toBeDefined();
      }
    }
  );

  it.each(["WAVE", "ORANGE_MONEY"] as const)(
    "accepts valid +225 providerPhone for %s",
    (provider) => {
      const result = subscriptionCreateSchema.safeParse({
        tier: "GRAND_FRERE",
        period: "ANNUAL",
        provider,
        providerPhone: "+22501234567",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.provider).toBe(provider);
        expect(result.data.providerPhone).toBe("+22501234567");
      }
    }
  );

  it.each(["WAVE", "ORANGE_MONEY"] as const)(
    "rejects unsupported country +33 for %s",
    (provider) => {
      const result = subscriptionCreateSchema.safeParse({
        tier: "AFFRANCHI",
        period: "MONTHLY",
        provider,
        providerPhone: "+336****5678",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.providerPhone).toBeDefined();
      }
    }
  );

  it.each(["WAVE", "ORANGE_MONEY"] as const)(
    "rejects national number without plus for %s",
    (provider) => {
      const result = subscriptionCreateSchema.safeParse({
        tier: "AFFRANCHI",
        period: "MONTHLY",
        provider,
        providerPhone: "01234567",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.providerPhone).toBeDefined();
      }
    }
  );
});
