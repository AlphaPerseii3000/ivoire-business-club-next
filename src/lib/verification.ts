export type VerificationUser = {
  emailVerified: boolean;
  bio: string | null;
  location: string | null;
  country: string | null;
  status: "ACTIVE" | "SUSPENDED" | string;
  verificationStatus: "PENDING" | "EN_COURS" | "VERIFIED" | "REJECTED" | string;
};

export const VERIFICATION_CODES = {
  EMAIL_UNVERIFIED: "EMAIL_UNVERIFIED",
  BIO_MISSING: "BIO_MISSING",
  LOCATION_MISSING: "LOCATION_MISSING",
  COUNTRY_MISSING: "COUNTRY_MISSING",
  ACCOUNT_SUSPENDED: "ACCOUNT_SUSPENDED",
} as const;

export const VERIFICATION_LABELS: Record<string, string> = {
  EMAIL_UNVERIFIED: "Email non vérifié",
  BIO_MISSING: "Bio manquante",
  LOCATION_MISSING: "Localisation manquante",
  COUNTRY_MISSING: "Pays manquant",
  ACCOUNT_SUSPENDED: "Compte suspendu",
};

export function getMissingVerificationPrerequisites(user: Partial<VerificationUser>): string[] {
  const missing: string[] = [];

  if (!user.emailVerified) {
    missing.push(VERIFICATION_CODES.EMAIL_UNVERIFIED);
  }
  if (!user.bio || user.bio.trim() === "") {
    missing.push(VERIFICATION_CODES.BIO_MISSING);
  }
  if (!user.location || user.location.trim() === "") {
    missing.push(VERIFICATION_CODES.LOCATION_MISSING);
  }
  if (!user.country || user.country.trim() === "") {
    missing.push(VERIFICATION_CODES.COUNTRY_MISSING);
  }
  if (user.status === "SUSPENDED") {
    missing.push(VERIFICATION_CODES.ACCOUNT_SUSPENDED);
  }

  return missing;
}

export function isEligibleForVerification(user: Partial<VerificationUser>) {
  const missing = getMissingVerificationPrerequisites(user);
  return {
    eligible: missing.length === 0,
    missingPrerequisites: missing,
  };
}
