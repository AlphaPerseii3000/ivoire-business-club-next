import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isEligibleForVerification,
  getMissingVerificationPrerequisites,
  VERIFICATION_CODES,
} from "./verification";
import { autoTransitionVerificationStatus } from "./verification.server";

const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: any[]) => mockFindUnique(...args),
      update: (...args: any[]) => mockUpdate(...args),
    },
  },
}));

describe("verification helper tests", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("isEligibleForVerification & getMissingVerificationPrerequisites", () => {
    it("should return eligible: true when all criteria are met", () => {
      const user = {
        emailVerified: true,
        bio: "Une superbe biographie professionnelle.",
        location: "Abidjan",
        country: "Côte d'Ivoire",
        status: "ACTIVE",
        verificationStatus: "PENDING",
      };

      const result = isEligibleForVerification(user);
      expect(result.eligible).toBe(true);
      expect(result.missingPrerequisites).toEqual([]);
    });

    it("should report EMAIL_UNVERIFIED when email is not verified", () => {
      const user = {
        emailVerified: false,
        bio: "Bio ok",
        location: "Abidjan",
        country: "Côte d'Ivoire",
        status: "ACTIVE",
        verificationStatus: "PENDING",
      };

      const result = isEligibleForVerification(user);
      expect(result.eligible).toBe(false);
      expect(result.missingPrerequisites).toContain(VERIFICATION_CODES.EMAIL_UNVERIFIED);
    });

    it("should report BIO_MISSING when bio is empty or whitespace only", () => {
      const userEmpty = {
        emailVerified: true,
        bio: "",
        location: "Abidjan",
        country: "Côte d'Ivoire",
        status: "ACTIVE",
        verificationStatus: "PENDING",
      };

      const userWhitespace = {
        ...userEmpty,
        bio: "   ",
      };

      const userNull = {
        ...userEmpty,
        bio: null,
      };

      expect(isEligibleForVerification(userEmpty).eligible).toBe(false);
      expect(isEligibleForVerification(userEmpty).missingPrerequisites).toContain(VERIFICATION_CODES.BIO_MISSING);

      expect(isEligibleForVerification(userWhitespace).eligible).toBe(false);
      expect(isEligibleForVerification(userWhitespace).missingPrerequisites).toContain(VERIFICATION_CODES.BIO_MISSING);

      expect(isEligibleForVerification(userNull).eligible).toBe(false);
      expect(isEligibleForVerification(userNull).missingPrerequisites).toContain(VERIFICATION_CODES.BIO_MISSING);
    });

    it("should report LOCATION_MISSING when location is empty or whitespace only", () => {
      const userEmpty = {
        emailVerified: true,
        bio: "Bio ok",
        location: "",
        country: "Côte d'Ivoire",
        status: "ACTIVE",
        verificationStatus: "PENDING",
      };

      const userWhitespace = {
        ...userEmpty,
        location: "   ",
      };

      expect(isEligibleForVerification(userEmpty).eligible).toBe(false);
      expect(isEligibleForVerification(userEmpty).missingPrerequisites).toContain(VERIFICATION_CODES.LOCATION_MISSING);

      expect(isEligibleForVerification(userWhitespace).eligible).toBe(false);
      expect(isEligibleForVerification(userWhitespace).missingPrerequisites).toContain(VERIFICATION_CODES.LOCATION_MISSING);
    });

    it("should report COUNTRY_MISSING when country is empty or whitespace only", () => {
      const userEmpty = {
        emailVerified: true,
        bio: "Bio ok",
        location: "Abidjan",
        country: "",
        status: "ACTIVE",
        verificationStatus: "PENDING",
      };

      const userWhitespace = {
        ...userEmpty,
        country: "   ",
      };

      expect(isEligibleForVerification(userEmpty).eligible).toBe(false);
      expect(isEligibleForVerification(userEmpty).missingPrerequisites).toContain(VERIFICATION_CODES.COUNTRY_MISSING);

      expect(isEligibleForVerification(userWhitespace).eligible).toBe(false);
      expect(isEligibleForVerification(userWhitespace).missingPrerequisites).toContain(VERIFICATION_CODES.COUNTRY_MISSING);
    });

    it("should report ACCOUNT_SUSPENDED when account status is SUSPENDED", () => {
      const user = {
        emailVerified: true,
        bio: "Bio ok",
        location: "Abidjan",
        country: "Côte d'Ivoire",
        status: "SUSPENDED",
        verificationStatus: "PENDING",
      };

      const result = isEligibleForVerification(user);
      expect(result.eligible).toBe(false);
      expect(result.missingPrerequisites).toContain(VERIFICATION_CODES.ACCOUNT_SUSPENDED);
    });
  });

  describe("autoTransitionVerificationStatus", () => {
    it("should return changed: false if user does not exist", async () => {
      mockFindUnique.mockResolvedValue(null);

      const result = await autoTransitionVerificationStatus("user-unknown");
      expect(result).toEqual({ changed: false, status: "PENDING" });
      expect(mockFindUnique).toHaveBeenCalledTimes(1);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("should not transition if user status is VERIFIED", async () => {
      const user = {
        id: "user-1",
        emailVerified: true,
        bio: "Bio ok",
        location: "Abidjan",
        country: "Côte d'Ivoire",
        status: "ACTIVE",
        verificationStatus: "VERIFIED",
      };
      mockFindUnique.mockResolvedValue(user);

      const result = await autoTransitionVerificationStatus("user-1");
      expect(result).toEqual({ changed: false, status: "VERIFIED" });
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("should transition to EN_COURS if PENDING and eligible", async () => {
      const user = {
        id: "user-1",
        emailVerified: true,
        bio: "Bio ok",
        location: "Abidjan",
        country: "Côte d'Ivoire",
        status: "ACTIVE",
        verificationStatus: "PENDING",
      };
      mockFindUnique.mockResolvedValue(user);
      mockUpdate.mockResolvedValue({ ...user, verificationStatus: "EN_COURS" });

      const result = await autoTransitionVerificationStatus("user-1");
      expect(result).toEqual({ changed: true, status: "EN_COURS" });
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { verificationStatus: "EN_COURS" },
      });
    });

    it("should not transition if PENDING but not eligible", async () => {
      const user = {
        id: "user-1",
        emailVerified: false,
        bio: "Bio ok",
        location: "Abidjan",
        country: "Côte d'Ivoire",
        status: "ACTIVE",
        verificationStatus: "PENDING",
      };
      mockFindUnique.mockResolvedValue(user);

      const result = await autoTransitionVerificationStatus("user-1");
      expect(result).toEqual({ changed: false, status: "PENDING" });
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("should transition to EN_COURS if REJECTED and eligible", async () => {
      const user = {
        id: "user-1",
        emailVerified: true,
        bio: "Bio ok",
        location: "Abidjan",
        country: "Côte d'Ivoire",
        status: "ACTIVE",
        verificationStatus: "REJECTED",
      };
      mockFindUnique.mockResolvedValue(user);
      mockUpdate.mockResolvedValue({ ...user, verificationStatus: "EN_COURS" });

      const result = await autoTransitionVerificationStatus("user-1");
      expect(result).toEqual({ changed: true, status: "EN_COURS" });
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { verificationStatus: "EN_COURS" },
      });
    });

    it("should transition to PENDING if EN_COURS and not eligible", async () => {
      const user = {
        id: "user-1",
        emailVerified: false, // not eligible
        bio: "Bio ok",
        location: "Abidjan",
        country: "Côte d'Ivoire",
        status: "ACTIVE",
        verificationStatus: "EN_COURS",
      };
      mockFindUnique.mockResolvedValue(user);
      mockUpdate.mockResolvedValue({ ...user, verificationStatus: "PENDING" });

      const result = await autoTransitionVerificationStatus("user-1");
      expect(result).toEqual({ changed: true, status: "PENDING" });
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { verificationStatus: "PENDING" },
      });
    });
  });
});
