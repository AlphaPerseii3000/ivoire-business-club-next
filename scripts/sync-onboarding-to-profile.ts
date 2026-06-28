import { autoTransitionVerificationStatus } from "@/lib/verification.server";
import { prisma } from "@/lib/prisma";
import { AUDIT_ACTIONS, safeCreateAuditLog } from "@/lib/audit-log";
import { sanitizeError } from "@/lib/sanitize-log";

const userSelect = {
  id: true,
  name: true,
  phone: true,
  location: true,
  country: true,
  bio: true,
  tier: true,
  onboardingForm: true,
  onboardingCompletedAt: true,
} as const;

/**
 * Représente un utilisateur tel que retourné par la requête Prisma de migration.
 */
type MigrationUser = {
  id: string;
  name: string | null;
  phone: string | null;
  location: string | null;
  country: string | null;
  bio: string | null;
  tier: "AFFRANCHI" | "GRAND_FRERE" | "BOSS";
  onboardingForm: unknown;
  onboardingCompletedAt: Date | null;
};

/**
 * Structure attendue du JSON onboardingForm (même mapping que Story 16.1).
 */
type OnboardingFormData = {
  fullName?: string;
  phone?: string;
  address?: string;
  country?: string;
  activity?: string;
  tier?: "AFFRANCHI" | "GRAND_FRERE" | "BOSS";
};

/**
 * Résultat global de l'exécution du script.
 */
type SyncResult = {
  synced: number;
  upToDate: number;
  withoutForm: number;
  errors: number;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseOnboardingForm(onboardingForm: unknown): OnboardingFormData | null {
  if (onboardingForm === null || onboardingForm === undefined) {
    return null;
  }

  if (typeof onboardingForm === "string") {
    try {
      onboardingForm = JSON.parse(onboardingForm);
    } catch {
      return null;
    }
  }

  if (typeof onboardingForm !== "object" || onboardingForm === null || Array.isArray(onboardingForm)) {
    return null;
  }

  const form = onboardingForm as Record<string, unknown>;
  const parsed: OnboardingFormData = {};

  if (isNonEmptyString(form.fullName)) {
    parsed.fullName = form.fullName.trim();
  }
  if (isNonEmptyString(form.phone)) {
    parsed.phone = form.phone.trim();
  }
  if (isNonEmptyString(form.address)) {
    parsed.address = form.address.trim();
  }
  if (isNonEmptyString(form.country)) {
    parsed.country = form.country.trim();
  }
  if (isNonEmptyString(form.activity)) {
    parsed.activity = form.activity.trim();
  }
  if (isNonEmptyString(form.tier) && ["AFFRANCHI", "GRAND_FRERE", "BOSS"].includes(form.tier)) {
    parsed.tier = form.tier as OnboardingFormData["tier"];
  }

  return parsed;
}

function buildSyncData(user: MigrationUser, parsed: OnboardingFormData) {
  const data: Partial<Pick<MigrationUser, "name" | "phone" | "location" | "country" | "bio" | "tier">> = {};
  const syncedFields: string[] = [];

  if (user.name === null && parsed.fullName !== undefined) {
    data.name = parsed.fullName;
    syncedFields.push("name");
  }
  if (user.phone === null && parsed.phone !== undefined) {
    data.phone = parsed.phone || null;
    syncedFields.push("phone");
  }
  if (user.location === null && parsed.address !== undefined) {
    data.location = parsed.address || null;
    syncedFields.push("location");
  }
  if (user.country === null && parsed.country !== undefined) {
    data.country = parsed.country;
    syncedFields.push("country");
  }
  if (user.bio === null && parsed.activity !== undefined) {
    data.bio = parsed.activity || null;
    syncedFields.push("bio");
  }
  if (user.tier === "AFFRANCHI" && parsed.tier !== undefined && parsed.tier !== "AFFRANCHI") {
    data.tier = parsed.tier;
    syncedFields.push("tier");
  }

  return { data, syncedFields };
}

async function syncUser(
  user: MigrationUser,
  dryRun: boolean,
): Promise<{ synced: boolean; upToDate: boolean; syncedFields: string[] }> {
  const parsed = parseOnboardingForm(user.onboardingForm);

  if (parsed === null) {
    return { synced: false, upToDate: false, syncedFields: [] };
  }

  const { data, syncedFields } = buildSyncData(user, parsed);

  if (syncedFields.length === 0) {
    return { synced: false, upToDate: true, syncedFields: [] };
  }

  if (dryRun) {
    console.log(`[dry-run] ${user.id} — synchroniserait : ${syncedFields.join(", ")}`);
    return { synced: true, upToDate: false, syncedFields };
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data,
    });
    await autoTransitionVerificationStatus(user.id, tx);
  });

  await safeCreateAuditLog({
    actorId: null,
    action: AUDIT_ACTIONS.ONBOARDING_SYNC_MIGRATION,
    entityType: "User",
    entityId: user.id,
    metadata: { syncedFields },
  });

  console.log(`[sync] ${user.id} — champs synchronisés : ${syncedFields.join(", ")}`);
  return { synced: true, upToDate: false, syncedFields };
}

export async function runSync(dryRun: boolean): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, upToDate: 0, withoutForm: 0, errors: 0 };

  const users = await prisma.user.findMany({
    where: { onboardingCompletedAt: { not: null } },
    select: userSelect,
  });

  for (const user of users) {
    try {
      const migrationUser = user as unknown as MigrationUser;
      const parsed = parseOnboardingForm(migrationUser.onboardingForm);

      if (parsed === null) {
        result.withoutForm += 1;
        continue;
      }

      const { synced, upToDate } = await syncUser(migrationUser, dryRun);

      if (synced) {
        result.synced += 1;
      } else if (upToDate) {
        result.upToDate += 1;
      }
    } catch (error) {
      result.errors += 1;
      console.error(`[erreur] ${user.id} :`, sanitizeError(error));
    }
  }

  return result;
}

function printSummary(result: SyncResult, dryRun: boolean) {
  const prefix = dryRun ? "[dry-run] " : "";
  console.log(
    `${prefix}${result.synced} utilisateurs synchronisés, ${result.upToDate} utilisateurs déjà à jour, ${result.withoutForm} utilisateurs sans onboardingForm`,
  );
  if (result.errors > 0) {
    console.log(`${prefix}${result.errors} erreur(s) rencontrée(s) durant la migration.`);
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  if (dryRun) {
    console.log("[dry-run] Mode simulation activé — aucune modification ne sera appliquée.");
  }

  try {
    const result = await runSync(dryRun);
    printSummary(result, dryRun);

    if (result.errors > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("[fatal]", sanitizeError(error));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}
