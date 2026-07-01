---
baseline_commit: bc740db0d4f00a0f5a8cd55a19d63da70b6a5443
---

# Story 16.2 : Migration rétroactive — synchroniser les membres existants

Status: done

<!-- Note : la validation est optionnelle. Lancer validate-create-story avant dev-story si souhaité. -->

## Story

En tant qu'admin IBC,
Je veux que les membres déjà inscrits qui ont rempli le formulaire d'onboarding mais dont les champs User sont vides soient automatiquement synchronisés,
Afin que personne n'ait à re-remplir le formulaire pour que la vérification admin fonctionne.

## Acceptance Criteria

1. **AC1 — Script de migration one-shot**
   - **Given** un script `scripts/sync-onboarding-to-profile.ts`
   - **When** il est exécuté
   - **Then** il parcourt tous les utilisateurs avec `onboardingCompletedAt !== null` (onboarding déjà fait)
   - **And** pour chaque utilisateur, il lit `onboardingForm` (JSON) et synchronise les champs User : `name ← fullName`, `phone ← phone`, `location ← address`, `country ← country`, `bio ← activity`, `tier ← tier`
   - **And** il n'écrase **que** les champs User qui sont vides/null (ne pas écraser les champs déjà remplis via `/profile`)
   - **And** il appelle `autoTransitionVerificationStatus` pour chaque utilisateur synchronisé

2. **AC2 — Idempotence**
   - **Given** le script de migration
   - **When** il est exécuté deux fois
   - **Then** la deuxième exécution ne modifie rien (les champs sont déjà remplis)

3. **AC3 — Logging et dry-run**
   - **Given** le script de migration
   - **When** il est exécuté avec `--dry-run`
   - **Then** il affiche les utilisateurs qui seraient affectés et les changements qui seraient appliqués, sans modifier la DB
   - **When** il est exécuté sans `--dry-run`
   - **Then** il applique les changements et affiche un résumé : `N utilisateurs synchronisés, M utilisateurs déjà à jour, K utilisateurs sans onboardingForm`

4. **AC4 — Gestion des cas edge**
   - **Given** un utilisateur avec `onboardingForm` null ou vide
   - **When** le script s'exécute
   - **Then** il est ignoré (pas d'erreur)
   - **Given** un utilisateur avec `onboardingForm` valide mais `fullName` vide dans le JSON
   - **When** le script s'exécute
   - **Then** `name` n'est pas écrasé (la valeur existante est conservée)
   - **Given** un utilisateur Google OAuth sans `onboardingForm` mais avec `emailVerified=true` et des champs User déjà remplis
   - **When** le script s'exécute
   - **Then** il est ignoré (pas d'onboarding à synchroniser)

5. **AC5 — Test du script**
   - **Given** les tests unitaires
   - **When** ils s'exécutent
   - **Then** un test `scripts/sync-onboarding-to-profile.test.ts` vérifie :
     - Un utilisateur avec onboardingForm valide et champs User vides → champs User remplis
     - Un utilisateur avec onboardingForm valide et champs User déjà remplis → champs User inchangés
     - Un utilisateur sans onboardingForm → ignoré
     - L'idempotence (double exécution = pas de changement)

6. **AC6 — Audit trail**
   - **Given** le script de migration
   - **When** il synchronise un utilisateur
   - **Then** un `AuditLog` est créé avec `action: "ONBOARDING_SYNC_MIGRATION"`, `entityType: "User"`, `entityId: user.id`, `metadata: { syncedFields: [...] }`

7. **AC7 — Documentation**
   - **Given** le script
   - **When** il est déployé
   - **Then** un fichier `docs/sync-migration.md` documente : comment exécuter le script, le dry-run, les cas edge, et l'ajout de `ONBOARDING_SYNC_MIGRATION` dans `src/lib/audit-log.ts`

## Tasks / Subtasks

- [x] Task 1 : Ajouter `ONBOARDING_SYNC_MIGRATION` dans `src/lib/audit-log.ts` (AC: #6)
  - [x] 1.1 Ajouter `ONBOARDING_SYNC_MIGRATION: "ONBOARDING_SYNC_MIGRATION"` dans `AUDIT_ACTIONS`
  - [x] 1.2 Vérifier que le type `AuditAction` le prend automatiquement en compte

- [x] Task 2 : Créer le script de migration `scripts/sync-onboarding-to-profile.ts` (AC: #1, #2, #3, #4, #6)
  - [x] 2.1 Initialiser un client Prisma local (`import { prisma } from "@/lib/prisma"`) en mode Node script
  - [x] 2.2 Parser `process.argv` pour détecter `--dry-run`
  - [x] 2.3 Récupérer tous les utilisateurs avec `onboardingCompletedAt: { not: null }` ; `select` les champs User + `onboardingForm`
  - [x] 2.4 Pour chaque utilisateur, détecter `onboardingForm` null/vide et ignorer (incrémenter `withoutForm`)
  - [x] 2.5 Construire l'objet `data` de mise à jour avec la règle **ne remplir que si le champ User actuel est null** :
    - `name: user.name ?? parsed.fullName`
    - `phone: user.phone ?? (parsed.phone || null)`
    - `location: user.location ?? (parsed.address || null)`
    - `country: user.country ?? (parsed.country || null)`
    - `bio: user.bio ?? (parsed.activity || null)`
    - `tier: user.tier ?? parsed.tier` (attention : `tier` a une valeur par défaut `AFFRANCHI` dans Prisma, donc ne jamais écraser si déjà défini)
  - [x] 2.6 Si `Object.keys(data).length === 0` → incrémenter `upToDate`, passer à l'utilisateur suivant
  - [x] 2.7 En mode `--dry-run`, logger l'utilisateur concerné et les champs qui seraient synchronisés, sans appeler `user.update`
  - [x] 2.8 En mode normal, exécuter `prisma.$transaction(async (tx) => { ... })` :
    - Mettre à jour l'utilisateur avec les champs vides
    - Appeler `autoTransitionVerificationStatus(user.id, tx)`
  - [x] 2.9 Après la transaction, créer un audit log `safeCreateAuditLog({ actorId: null, action: AUDIT_ACTIONS.ONBOARDING_SYNC_MIGRATION, entityType: "User", entityId: user.id, metadata: { syncedFields: [...] } })`
  - [x] 2.10 Incrémenter `synced` et logger par utilisateur synchronisé
  - [x] 2.11 À la fin, afficher le résumé : `N utilisateurs synchronisés, M utilisateurs déjà à jour, K utilisateurs sans onboardingForm`
  - [x] 2.12 Gérer les erreurs de parsing JSON : si `onboardingForm` n'est pas un objet valide, logger et ignorer

- [x] Task 3 : Créer les tests du script `scripts/sync-onboarding-to-profile.test.ts` (AC: #5)
  - [x] 3.1 Mocker `prisma` (Vitest) pour isoler le script ; utiliser un helper transactionnel si besoin
  - [x] 3.2 Test "champs vides → remplis" : fixture `onboardingForm` valide, `user.name=null`, etc. → vérifier que `tx.user.update` reçoit les bons champs et que `autoTransitionVerificationStatus` est appelée
  - [x] 3.3 Test "champs déjà remplis → inchangés" : fixture avec `user.name="Jean"`, etc. → vérifier que `user.update` n'est pas appelé (pas de synchronisation) et que `upToDate` est incrémenté
  - [x] 3.4 Test "sans onboardingForm → ignoré" : `onboardingForm=null` → `withoutForm` incrémenté, aucun update
  - [x] 3.5 Test "dry-run ne modifie pas la DB" : flag `--dry-run` → aucun `user.update` n'est appelé ; log/stdout contient les changements prévus
  - [x] 3.6 Test "idempotence" : exécuter la logique de synchronisation deux fois sur le même fixture → la deuxième fois `upToDate` est incrémenté
  - [x] 3.7 Test "audit log" : vérifier que `safeCreateAuditLog` est appelé avec `ONBOARDING_SYNC_MIGRATION` et `syncedFields` lors d'une synchronisation

- [x] Task 4 : Créer la documentation `docs/sync-migration.md` (AC: #7)
  - [x] 4.1 Expliquer comment exécuter le script : `npx tsx scripts/sync-onboarding-to-profile.ts`
  - [x] 4.2 Expliquer le dry-run : `npx tsx scripts/sync-onboarding-to-profile.ts --dry-run`
  - [x] 4.3 Documenter les cas edge : `onboardingForm` null, champs User déjà remplis, Google OAuth sans onboarding
  - [x] 4.4 Documenter l'ajout de `ONBOARDING_SYNC_MIGRATION` dans `src/lib/audit-log.ts`
  - [x] 4.5 Mentionner la guardrail "ne jamais écraser un champ User non-null"

- [x] Task 5 : Vérifications finales
  - [x] 5.1 Lancer `npm run lint` et corriger les erreurs dans `scripts/sync-onboarding-to-profile.ts`
  - [x] 5.2 Lancer `npm run test -- scripts/sync-onboarding-to-profile.test.ts`
  - [x] 5.3 Lancer `npm run build` pour vérifier que le script compile avec le reste du projet

## Dev Notes

### Contexte métier critique

La Story 16.1 a résolu l'incohérence pour les **nouveaux** membres : l'API `PUT /api/user/onboarding` synchronise maintenant le JSON `onboardingForm` et les colonnes User (`name`, `phone`, `location`, `country`, `bio`, `tier`) dans une transaction atomique. Cependant, les **membres existants** qui ont complété l'onboarding avant cette correction ont toujours des champs User vides. Cette story fournit un **script one-shot** pour synchroniser rétroactivement ces membres, sans jamais écraser des données déjà renseignées manuellement via `/profile`.

### Delta par rapport à la Story 16.1

- **Réutiliser le mapping** de la Story 16.1. Ne pas redéfinir un autre mapping : 
  | Champ onboarding (`onboardingForm` JSON) | Champ User | Transformation |
  |---|---|---|
  | `fullName` | `name` | Direct |
  | `phone` | `phone` | `|| null` (empty → null) |
  | `address` | `location` | `|| null` (empty → null) |
  | `country` | `country` | Direct |
  | `activity` | `bio` | `|| null` (empty → null) |
  | `tier` | `tier` | Direct (enum compatible) |
- **Différence majeure** : dans le script de migration, on ne remplit un champ User que s'il est actuellement `null`. L'API onboarding de 16.1 écrase systématiquement parce que c'est la source de vérité à la soumission ; le script est une migration additive.
- **Réutiliser `autoTransitionVerificationStatus(userId, txClient)`** exactement comme dans 16.1 (`src/lib/verification.server.ts`).
- **Réutiliser `safeCreateAuditLog`** comme pattern d'audit log après la transaction, mais avec la nouvelle action `AUDIT_ACTIONS.ONBOARDING_SYNC_MIGRATION`.

### Architecture & patterns à suivre

- **TypeScript Node script** : pas de route API. Exécuter avec `npx tsx scripts/sync-onboarding-to-profile.ts` (si `tsx` est installé) ou `npx ts-node` (sinon, vérifier `package.json`).
- **Prisma** : importer `prisma` depuis `@/lib/prisma`. À l'intérieur du script, utiliser `prisma.$transaction` pour grouper l'`user.update` et l'`autoTransitionVerificationStatus`. Toutes les lectures et écritures liées au même utilisateur doivent passer par le client transactionnel `tx`.
- **Audit log pattern** : créer l'audit log **après** la transaction via `safeCreateAuditLog`. L'audit log est une trace d'observabilité, pas une donnée fonctionnelle. Si l'audit log échoue, la migration de l'utilisateur concerné ne doit pas être rollback.
- **Guardrail #53** (audit log avant effets secondaires) : dans ce script, l'effet secondaire est la mise à jour DB. L'audit log est une trace post-effet. La règle s'applique ici à la granularité transaction : s'il y avait un effet secondaire externe (email, webhook), il devrait être après l'audit log. Ici, l'ordre retenu est transaction DB → audit log.
- **Logging** : logger sur `stdout` avec un format simple et lisible. En `--dry-run`, logger les changements prévus sans écrire en DB.
- **Exit code** : le script doit retourner `0` en cas de succès (même si aucun utilisateur n'est synchronisé) et `1` en cas d'erreur fatale inattendue.

### Anti-patterns à éviter

1. **NE PAS** écraser un champ User non-null avec une valeur provenant du JSON `onboardingForm`. La guardrail principale de cette story est additive.
2. **NE PAS** appeler `autoTransitionVerificationStatus` avec le Prisma global si une transaction est ouverte — toujours passer `tx`.
3. **NE PAS** mettre l'audit log à l'intérieur de la transaction Prisma : il n'est pas rollback-safe et gère ses propres erreurs.
4. **NE PAS** écraser `tier` si l'utilisateur a déjà un `tier` non défini. Dans Prisma, `tier` a une valeur par défaut `AFFRANCHI` ; considérer qu'un tier explicite dans le JSON ne doit pas remplacer un tier déjà défini en DB, sauf si la décision produit est de permettre la mise à jour. **Pour cette migration**, le comportement attendu est additif : ne mettre à jour `tier` que si la valeur actuelle en DB est la valeur par défaut et qu'aucune autre source de vérité ne l'a modifié. À clarifier dans le code : si `user.tier === "AFFRANCHI"` (valeur par défaut) et `parsed.tier !== "AFFRANCHI"`, il est acceptable de synchroniser. Sinon, conserver.
5. **NE PAS** modifier le schéma Prisma — tous les champs existent déjà.
6. **NE PAS** utiliser `&&` dans JSX (guardrail #31). Cette story est un script, mais si un UI est touché, toujours préférer des ternaires et des booléens pré-calculés.
7. **NE PAS** laisser le script dépendre d'un état de session ou d'Auth.js — c'est un script admin exécuté en CLI.

### Choix techniques

- **Lecture en un seul `findMany`** plutôt que N `findUnique` pour minimiser les allers-retours DB.
- **Transaction par utilisateur** plutôt qu'une transaction globale : si un utilisateur fait échouer l'auto-transition, seul cet utilisateur est rollback, pas toute la migration.
- **Continue on error** : logger l'erreur pour un utilisateur donné, continuer avec les suivants, et retourner un exit code non-zero à la fin si au moins une erreur s'est produite.
- **Dry-run simple** : un flag booléen court-circuite l'écriture DB mais exécute la même logique de détection pour produire un rapport.

### File Structure

Fichiers à MODIFIER :
- `src/lib/audit-log.ts` — ajouter `ONBOARDING_SYNC_MIGRATION` dans `AUDIT_ACTIONS`

Fichiers à CRÉER :
- `scripts/sync-onboarding-to-profile.ts` — script de migration one-shot
- `scripts/sync-onboarding-to-profile.test.ts` — tests Vitest du script
- `docs/sync-migration.md` — documentation d'exécution

Fichiers à LIRE pour le contexte :
- `src/app/api/user/onboarding/route.ts` — implémentation 16.1 du mapping et de la transaction
- `src/lib/verification.server.ts` — `autoTransitionVerificationStatus`
- `src/lib/audit-log.ts` — patterns `AUDIT_ACTIONS` et `safeCreateAuditLog`
- `src/lib/validations.ts` — schéma `onboardingFormSchema` et `ALL_COUNTRIES`
- `prisma/schema.prisma` — modèle `User`, champs et enums
- `_bmad-output/implementation-artifacts/16-1-sync-onboarding-to-user.md` — contexte et mapping de la story précédente
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-28.md#Story 16.2` — AC et technical notes du SCP

### References

- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-06-28.md#Story 16.2] — AC complets et technical notes
- [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions] — stack Next.js 16, Prisma 7, patterns API/DB
- [Source: _bmad-output/implementation-artifacts/16-1-sync-onboarding-to-user.md] — mapping onboarding → User, transaction, autoTransitionVerificationStatus
- [Source: src/app/api/user/onboarding/route.ts] — implémentation 16.1 du mapping et de la transaction
- [Source: src/lib/verification.server.ts] — `autoTransitionVerificationStatus(userId, txClient?)`
- [Source: src/lib/audit-log.ts] — `AUDIT_ACTIONS`, `safeCreateAuditLog`, patterns audit
- [Source: src/lib/validations.ts] — `onboardingFormSchema`, champs du JSON
- [Source: prisma/schema.prisma] — modèle `User`, champs synchronisés, enum `Tier`

## Dev Agent Record

### Agent Model Used

Kimi K2.7 Code (via Hermes delegate_task)

### Debug Log References

### Completion Notes List

- Story 16.2 implémentée avec succès.
- `ONBOARDING_SYNC_MIGRATION` ajouté à `src/lib/audit-log.ts`.
- Script one-shot `scripts/sync-onboarding-to-profile.ts` créé avec dry-run, idempotence, gestion des erreurs, et audit log.
- Tests unitaires créés dans `scripts/sync-onboarding-to-profile.test.ts` (8 tests, tous passés).
- Documentation créée dans `docs/sync-migration.md`.
- `vitest.config.ts` mis à jour pour inclure `scripts/**/*.test.ts`.
- Vérifications : `npm run lint` OK, `npx vitest run` OK (983 tests), `npm run build` OK, dry-run OK.

### File List

- Modifié : `src/lib/audit-log.ts`
- Modifié : `vitest.config.ts`
- Créé : `scripts/sync-onboarding-to-profile.ts`
- Créé : `scripts/sync-onboarding-to-profile.test.ts`
- Créé : `docs/sync-migration.md`
