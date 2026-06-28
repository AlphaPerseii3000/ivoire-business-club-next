#!/usr/bin/env node
'use strict';

/**
 * Migration rétroactive — Synchronisation des membres existants (standalone VPS)
 *
 * Version JS standalone du script sync-onboarding-to-profile.ts.
 * Utilisable directement sur le VPS avec : node scripts/sync-onboarding-to-profile.js
 *
 * Ce script ne dépend d'aucun module @/ du projet. Il utilise directement
 * le driver PostgreSQL `pg` pour les requêtes SQL. Toutes les fonctions
 * métier (autoTransitionVerificationStatus, isEligibleForVerification,
 * safeCreateAuditLog, sanitizeError) sont inlinées.
 *
 * Usage :
 *   node scripts/sync-onboarding-to-profile.js --dry-run   # simulation
 *   node scripts/sync-onboarding-to-profile.js              # exécution réelle
 *
 * Le script charge automatiquement .env si DATABASE_URL n'est pas déjà
 * dans l'environnement. Le module `pg` est résolu depuis node_modules/
 * ou .next/standalone/node_modules/.
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// .env loading (fallback if not already in process.env)
// ---------------------------------------------------------------------------

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    // Remove surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const projectRoot = path.resolve(__dirname, '..');
loadEnvFile(path.join(projectRoot, '.env'));

// ---------------------------------------------------------------------------
// pg module resolution
// ---------------------------------------------------------------------------

let pg = null;
const pgPaths = [
  path.join(projectRoot, 'node_modules', 'pg'),
  path.join(projectRoot, '.next', 'standalone', 'node_modules', 'pg'),
];
for (const p of pgPaths) {
  try {
    pg = require(p);
    break;
  } catch {
    // try next path
  }
}
if (!pg) {
  try {
    pg = require('pg');
  } catch {
    // last resort failed
  }
}
if (!pg) {
  console.error('❌ Impossible de charger le module `pg`. Solutions :');
  console.error('   1. cd /var/www/ibc/current && npm install pg');
  console.error('   2. NODE_PATH=./.next/standalone/node_modules node scripts/sync-onboarding-to-profile.js');
  process.exit(1);
}

const { Client } = pg;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AUDIT_ACTION = 'ONBOARDING_SYNC_MIGRATION';
const TIER_VALUES = ['AFFRANCHI', 'GRAND_FRERE', 'BOSS'];

// ---------------------------------------------------------------------------
// Utility functions (inlined from src/lib/)
// ---------------------------------------------------------------------------

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Inlined from src/lib/sanitize-log.ts */
function sanitizeError(error) {
  if (error instanceof Error) {
    const message = error.message ? `: ${error.message.slice(0, 200)}` : '';
    return `Error: ${error.name}${message}`;
  }
  return 'Unknown error';
}

/**
 * Parse the onboardingForm JSON blob into a structured object.
 * Inlined from the TS script's parseOnboardingForm.
 * @param {unknown} onboardingForm
 * @returns {Object|null}
 */
function parseOnboardingForm(onboardingForm) {
  if (onboardingForm === null || onboardingForm === undefined) return null;

  // pg returns jsonb as parsed JS object, but handle string just in case
  if (typeof onboardingForm === 'string') {
    try {
      onboardingForm = JSON.parse(onboardingForm);
    } catch {
      return null;
    }
  }

  if (typeof onboardingForm !== 'object' || onboardingForm === null || Array.isArray(onboardingForm)) {
    return null;
  }

  const form = /** @type {Record<string, unknown>} */ (onboardingForm);
  const parsed = {};

  if (isNonEmptyString(form.fullName)) parsed.fullName = form.fullName.trim();
  if (isNonEmptyString(form.phone)) parsed.phone = form.phone.trim();
  if (isNonEmptyString(form.address)) parsed.address = form.address.trim();
  if (isNonEmptyString(form.country)) parsed.country = form.country.trim();
  if (isNonEmptyString(form.activity)) parsed.activity = form.activity.trim();
  if (isNonEmptyString(form.tier) && TIER_VALUES.includes(form.tier)) {
    parsed.tier = form.tier;
  }

  return parsed;
}

/**
 * Build the SET clause and parameter values for the UPDATE query.
 * Only fills null/empty fields — never overwrites existing values.
 * @param {Object} user - Current user row from DB
 * @param {Object} parsed - Parsed onboardingForm data
 * @returns {{ setClauses: string[], values: any[], syncedFields: string[] }}
 */
function buildSyncData(user, parsed) {
  const setClauses = [];
  const values = [];
  const syncedFields = [];
  let paramIdx = 1;

  if (user.name === null && parsed.fullName !== undefined) {
    setClauses.push(`name = $${paramIdx++}`);
    values.push(parsed.fullName);
    syncedFields.push('name');
  }
  if (user.phone === null && parsed.phone !== undefined) {
    setClauses.push(`phone = $${paramIdx++}`);
    values.push(parsed.phone || null);
    syncedFields.push('phone');
  }
  if (user.location === null && parsed.address !== undefined) {
    setClauses.push(`location = $${paramIdx++}`);
    values.push(parsed.address || null);
    syncedFields.push('location');
  }
  if (user.country === null && parsed.country !== undefined) {
    setClauses.push(`country = $${paramIdx++}`);
    values.push(parsed.country);
    syncedFields.push('country');
  }
  if (user.bio === null && parsed.activity !== undefined) {
    setClauses.push(`bio = $${paramIdx++}`);
    values.push(parsed.activity || null);
    syncedFields.push('bio');
  }
  if (user.tier === 'AFFRANCHI' && parsed.tier !== undefined && parsed.tier !== 'AFFRANCHI') {
    setClauses.push(`tier = $${paramIdx++}`);
    values.push(parsed.tier);
    syncedFields.push('tier');
  }

  return { setClauses, values, syncedFields };
}

/**
 * Check if a user is eligible for verification.
 * Inlined from src/lib/verification.ts → isEligibleForVerification.
 * Prerequisites: emailVerified, bio non-empty, location non-empty, country non-empty, status !== SUSPENDED.
 * @param {Object} user
 * @returns {boolean}
 */
function isEligibleForVerification(user) {
  return (
    user.emailVerified === true &&
    isNonEmptyString(user.bio) &&
    isNonEmptyString(user.location) &&
    isNonEmptyString(user.country) &&
    user.status !== 'SUSPENDED'
  );
}

/**
 * Compute the new verification status based on eligibility.
 * Inlined from src/lib/verification.server.ts → autoTransitionVerificationStatus.
 * Rules:
 *   - VERIFIED is admin-only, never auto-transitioned.
 *   - If eligible and status is PENDING or REJECTED → EN_COURS.
 *   - If not eligible and status is EN_COURS → PENDING.
 *   - Otherwise, no change.
 * @param {string} currentStatus
 * @param {Object} user
 * @returns {{ changed: boolean, newStatus: string }}
 */
function computeVerificationTransition(currentStatus, user) {
  if (currentStatus === 'VERIFIED') return { changed: false, newStatus: 'VERIFIED' };

  const eligible = isEligibleForVerification(user);

  let newStatus = currentStatus;
  if (eligible && (currentStatus === 'PENDING' || currentStatus === 'REJECTED')) {
    newStatus = 'EN_COURS';
  } else if (!eligible && currentStatus === 'EN_COURS') {
    newStatus = 'PENDING';
  }

  return { changed: newStatus !== currentStatus, newStatus };
}

/**
 * Insert an audit log row. Fire-and-forget — errors are logged but not thrown.
 * Inlined from src/lib/audit-log.ts → safeCreateAuditLog.
 * @param {import('pg').Client} client
 * @param {string} userId
 * @param {string[]} syncedFields
 */
async function safeCreateAuditLog(client, userId, syncedFields) {
  try {
    const auditId = crypto.randomUUID();
    const metadata = JSON.stringify({ syncedFields });
    await client.query(
      `INSERT INTO audit_logs (id, "actorId", action, "entityType", "entityId", metadata, "createdAt")
       VALUES ($1, NULL, $2, $3, $4, $5::jsonb, NOW())`,
      [auditId, AUDIT_ACTION, 'User', userId, metadata],
    );
  } catch (error) {
    console.error('[audit-log-create]', {
      action: AUDIT_ACTION,
      entityType: 'User',
      entityId: userId,
      error: sanitizeError(error),
    });
  }
}

// ---------------------------------------------------------------------------
// Main sync logic
// ---------------------------------------------------------------------------

/**
 * @param {boolean} dryRun
 * @returns {Promise<{ synced: number, upToDate: number, withoutForm: number, errors: number }>}
 */
async function runSync(dryRun) {
  const result = { synced: 0, upToDate: 0, withoutForm: 0, errors: 0 };

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is not configured. Source .env or set it in the environment.',
    );
  }

  // Strip query params (?schema=public) that pg doesn't need
  const connectionString = databaseUrl.split('?')[0];

  const client = new Client({ connectionString });
  await client.connect();

  try {
    // Fetch all users with completed onboarding
    const { rows: users } = await client.query(`
      SELECT id, name, phone, location, country, bio, tier,
             "onboardingForm", "onboardingCompletedAt",
             "emailVerified", status, "verificationStatus"
      FROM users
      WHERE "onboardingCompletedAt" IS NOT NULL
    `);

    for (const user of users) {
      try {
        const parsed = parseOnboardingForm(user.onboardingForm);

        if (parsed === null) {
          result.withoutForm += 1;
          continue;
        }

        const { setClauses, values, syncedFields } = buildSyncData(user, parsed);

        if (setClauses.length === 0) {
          result.upToDate += 1;
          continue;
        }

        if (dryRun) {
          console.log(
            `[dry-run] ${user.id} — synchroniserait : ${syncedFields.join(', ')}`,
          );
          result.synced += 1;
          continue;
        }

        // --- Real sync: transaction (UPDATE + verification transition) ---

        await client.query('BEGIN');

        try {
          // Update user fields
          const userIdx = values.length + 1;
          const updateQuery = `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${userIdx}`;
          values.push(user.id);
          await client.query(updateQuery, values);

          // Re-fetch user to check verification eligibility after update
          const {
            rows: [updatedUser],
          } = await client.query(
            `SELECT "emailVerified", bio, location, country, status, "verificationStatus"
             FROM users WHERE id = $1`,
            [user.id],
          );

          // Auto-transition verification status
          const currentStatus = updatedUser.verificationStatus;
          const { changed: statusChanged, newStatus } =
            computeVerificationTransition(currentStatus, updatedUser);

          if (statusChanged) {
            await client.query(
              `UPDATE users SET "verificationStatus" = $1 WHERE id = $2`,
              [newStatus, user.id],
            );
          }

          await client.query('COMMIT');

          const statusInfo = statusChanged
            ? ` + verificationStatus: ${currentStatus} → ${newStatus}`
            : '';
          console.log(
            `[sync] ${user.id} — champs synchronisés : ${syncedFields.join(', ')}${statusInfo}`,
          );
          result.synced += 1;

          // Audit log (outside transaction, fire-and-forget — matches TS script behavior)
          await safeCreateAuditLog(client, user.id, syncedFields);
        } catch (txError) {
          await client.query('ROLLBACK');
          throw txError;
        }
      } catch (error) {
        result.errors += 1;
        console.error(`[erreur] ${user.id} :`, sanitizeError(error));
      }
    }
  } finally {
    await client.end();
  }

  return result;
}

function printSummary(result, dryRun) {
  const prefix = dryRun ? '[dry-run] ' : '';
  console.log(
    `${prefix}${result.synced} utilisateurs synchronisés, ${result.upToDate} utilisateurs déjà à jour, ${result.withoutForm} utilisateurs sans onboardingForm`,
  );
  if (result.errors > 0) {
    console.log(`${prefix}${result.errors} erreur(s) rencontrée(s) durant la migration.`);
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  if (dryRun) {
    console.log('[dry-run] Mode simulation activé — aucune modification ne sera appliquée.');
  }

  try {
    const result = await runSync(dryRun);
    printSummary(result, dryRun);
    if (result.errors > 0) process.exit(1);
  } catch (error) {
    console.error('[fatal]', sanitizeError(error));
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}