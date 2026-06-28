|---
baseline_commit: bc740db0d4f00a0f5a8cd55a19d63da70b6a5443
---

# Story 16.1 : Synchronisation des champs onboarding → User

Status: done

<!-- Note : la validation est optionnelle. Lancer validate-create-story avant dev-story si souhaité. -->

## Story

En tant que nouveau membre IBC,
Je veux que le formulaire d'onboarding remplisse automatiquement tous les champs de mon profil (nom, téléphone, localisation, pays, bio, tier),
Afin que mon profil soit complet pour la vérification admin sans avoir à remplir une deuxième fois le même type d'informations sur `/profile`.

## Acceptance Criteria

1. **AC1 — Synchronisation des champs à la soumission onboarding**
   - **Given** un membre authentifié sur `/onboarding/complete-profile`
   - **When** il soumet le formulaire avec des données valides
   - **Then** l'API `PUT /api/user/onboarding` sauvegarde dans `onboardingForm` (JSON) ET dans les colonnes User : `name ← fullName`, `phone ← phone`, `location ← address`, `country ← country`, `bio ← activity`, `tier ← tier`
   - **And** `onboardingCompletedAt` est setté
   - **And** la réponse API ne contient pas `passwordHash`

2. **AC2 — Ajout du champ "Pays" dans le formulaire onboarding**
   - **Given** le formulaire `CompleteProfileForm`
   - **When** il est rendu
   - **Then** un champ "Pays" (Select avec `ALL_COUNTRIES`) est présent entre le champ Téléphone et le champ Durée d'adhésion
   - **And** le champ est requis (validation Zod `z.string().min(2)`)
   - **And** la valeur est pré-remplie si l'utilisateur a déjà un `country` en DB

3. **AC3 — Auto-transition du verificationStatus après onboarding**
   - **Given** un membre qui vient de compléter l'onboarding
   - **When** tous les prérequis de vérification sont remplis (`emailVerified=true`, `bio` non vide, `location` non vide, `country` non vide, `status !== SUSPENDED`)
   - **Then** `autoTransitionVerificationStatus` est appelée dans la même transaction
   - **And** si le statut était `PENDING`, il passe à `EN_COURS`
   - **And** si le statut était déjà `VERIFIED`, il reste `VERIFIED` (idempotent)

4. **AC4 — Transaction atomique**
   - **Given** la soumission du formulaire onboarding
   - **When** l'API s'exécute
   - **Then** la mise à jour des champs User, la sauvegarde du JSON `onboardingForm`, et l'auto-transition du verificationStatus sont dans une seule transaction Prisma
   - **And** l'audit log `ONBOARDING_COMPLETED` est conservé juste après la transaction (pattern existant — `safeCreateAuditLog` attrape ses propres erreurs)
   - **And** si l'auto-transition échoue, le reste de la mise à jour est rollback

5. **AC5 — Pré-remplissage cohérent**
   - **Given** un membre qui retourne sur `/onboarding/complete-profile` après l'avoir déjà complété
   - **When** la page charge
   - **Then** les champs sont pré-remplis avec les données de `onboardingForm` (JSON) en priorité, puis avec les champs User si le JSON est vide
   - **And** le champ "Pays" affiche la valeur actuelle de `User.country`

6. **AC6 — Le widget onboarding reste cohérent**
   - **Given** un membre qui a complété l'onboarding (email vérifié + formulaire soumis)
   - **When** il va sur `/dashboard`
   - **Then** le `OnboardingProgressWidget` affiche 100% (comportement inchangé)
   - **And** sur `/settings#verification`, le statut est `EN_COURS` (ou `VERIFIED` si admin a déjà validé), sans prérequis manquants

7. **AC7 — Tests**
   - **Given** les tests unitaires
   - **When** ils s'exécutent
   - **Then** les tests existants de `route.test.ts` (onboarding API) sont mis à jour pour vérifier la synchronisation des champs User
   - **And** de nouveaux tests vérifient que `name`, `phone`, `location`, `country`, `bio`, `tier` sont bien écrits dans User
   - **And** un test vérifie que `autoTransitionVerificationStatus` est appelée
   - **And** un test vérifie que le champ "Pays" est présent dans le formulaire

## Tasks / Subtasks

- [x] Task 1 : Étendre le schéma Zod `onboardingFormSchema` (AC: #2)
  - [x] 1.1 Ajouter le champ `country: z.string().min(2, "Sélectionne un pays")` dans `src/lib/validations.ts`
  - [x] 1.2 S'assurer que `OnboardingFormInput` reflète le nouveau champ

- [x] Task 2 : Étendre l'API `PUT /api/user/onboarding` (AC: #1, #3, #4)
  - [x] 2.1 Transformer `prisma.user.update(...)` en `prisma.$transaction(async (tx) => { ... })`
  - [x] 2.2 Dans la transaction, mettre à jour `User` avec :
    - `onboardingForm: parsed.data`
    - `onboardingCompletedAt: now`
    - `name: parsed.data.fullName`
    - `phone: parsed.data.phone || null`
    - `location: parsed.data.address || null`
    - `country: parsed.data.country || null`
    - `bio: parsed.data.activity || null`
    - `tier: parsed.data.tier`
  - [x] 2.3 Appeler `autoTransitionVerificationStatus(session.user.id, tx)` dans la transaction et appliquer le `verificationStatus` retourné à l'objet user
  - [x] 2.4 Étendre `onboardingSelect` pour inclure `verificationStatus` dans la réponse
  - [x] 2.5 Conserver l'appel `safeCreateAuditLog(AUDIT_ACTIONS.ONBOARDING_COMPLETED)` juste après la transaction (hors transaction, pattern existant)
  - [x] 2.6 S'assurer que `passwordHash` n'est JAMAIS dans le `select`

- [x] Task 3 : Ajouter le champ "Pays" au formulaire onboarding (AC: #2, #5)
  - [x] 3.1 Importer `ALL_COUNTRIES` depuis `src/lib/validations.ts` dans `src/components/features/onboarding/complete-profile-form.tsx`
  - [x] 3.2 Ajouter un `Select` "Pays" entre le champ Téléphone et le champ Durée d'adhésion
  - [x] 3.3 Utiliser les mêmes composants shadcn/ui `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` que dans `ProfileEditForm`
  - [x] 3.4 Afficher l'erreur Zod inline sous le champ

- [x] Task 4 : Pré-remplissage cohérent du champ Pays (AC: #5)
  - [x] 4.1 Mettre à jour `src/app/onboarding/complete-profile/page.tsx` pour passer `country` au `defaultValues`
  - [x] 4.2 Logique de pré-remplissage : `onboardingForm.country` en priorité, sinon `user.country`, sinon `""`
  - [x] 4.3 Typographie : le type `CompleteProfileFormProps` doit accepter `country: string`

- [x] Task 5 : Mettre à jour les tests de l'API onboarding (AC: #7)
  - [x] 5.1 Adapter le mock Prisma dans `src/app/api/user/onboarding/route.test.ts` pour supporter `prisma.$transaction`
  - [x] 5.2 Ajouter un test vérifiant que `user.update` écrit bien `name`, `phone`, `location`, `country`, `bio`, `tier`
  - [x] 5.3 Ajouter un test vérifiant l'appel à `autoTransitionVerificationStatus`
  - [x] 5.4 Vérifier que le `select` de l'API ne contient pas `passwordHash`

- [x] Task 6 : Mettre à jour les tests du formulaire (AC: #7)
  - [x] 6.1 Ajouter `country` dans les `defaultValues` des tests de `src/components/features/onboarding/complete-profile-form.test.tsx`
  - [x] 6.2 Ajouter un test vérifiant que le Select "Pays" est présent
  - [x] 6.3 Ajouter un test vérifiant que `country` est envoyé au body de la requête `PUT /api/user/onboarding`

- [x] Task 7 : Vérifications finales
  - [x] 7.1 Lancer `npm run lint` et corriger les erreurs dans les fichiers modifiés
  - [x] 7.2 Lancer `npm run test -- src/app/api/user/onboarding/route.test.ts src/components/features/onboarding/complete-profile-form.test.tsx`
  - [x] 7.3 Lancer `npm run build` pour vérifier la compilation

## Change Log

- 2026-06-28 : Synchronisation des champs onboarding vers User, ajout du champ Pays, transaction atomique avec auto-transition du verificationStatus, mise à jour des tests API et du formulaire, build et tests OK.

### Contexte métier critique

Le formulaire d'onboarding actuel (Story 11.2) sauvegarde les données dans le champ JSON `onboardingForm` et positionne `onboardingCompletedAt`, mais **ne synchronise pas** les champs correspondants du modèle `User`. Résultat : l'utilisateur voit le widget onboarding à 100%, mais sur `/settings#verification` il lui manque `bio`, `location` et `country`. Cette story corrige l'incohérence à la source : un seul formulaire remplit à la fois le JSON d'adhésion et les colonnes User standard utilisées par la vérification.

### Mapping onboarding → User

| Champ onboarding (`onboardingForm` JSON) | Champ User | Transformation |
|---|---|---|
| `fullName` | `name` | Direct |
| `phone` | `phone` | `|| null` (empty → null) |
| `address` | `location` | `|| null` (empty → null) |
| `country` (nouveau) | `country` | Direct |
| `activity` | `bio` | `|| null` (empty → null) |
| `tier` | `tier` | Direct (enum compatible) |
| `email` | `email` | Non modifié (read-only) |
| `duration` | — | Reste dans JSON uniquement |
| `goals` | — | Reste dans JSON uniquement |
| `needs` | — | Reste dans JSON uniquement |

### Architecture & patterns à suivre

- **Next.js 16 App Router** : `page.tsx` reste un Server Component ; le formulaire reste un Client Component avec `"use client"`.
- **JSX guardrail** : ne JAMAIS utiliser `&&` dans les expressions JSX. Toujours utiliser `condition ? <Component /> : null`. Cette règle s'applique strictement aux nouveaux fichiers modifiés.
- **Auth.js v5** : utiliser `auth()` depuis `src/lib/auth.ts` (Node runtime).
- **Prisma 7** : importer `prisma` depuis `@/lib/prisma` ; dans la transaction, utiliser le client transactionnel `tx` pour toutes les requêtes liées au même unité de travail.
- **Formulaires** : React Hook Form + Zod, avec `@hookform/resolvers/zod`. Réutiliser les composants shadcn/ui existants (`Input`, `Label`, `Button`, `Select`).
- **Auto-transition** : `autoTransitionVerificationStatus(userId, txClient)` est déjà utilisée dans `src/app/api/user/profile/route.ts` ; reproduire le même pattern exact.
- **Audit logs** : `safeCreateAuditLog(AUDIT_ACTIONS.ONBOARDING_COMPLETED)` est déjà appelée dans `src/app/api/user/onboarding/route.ts`. La conserver **hors de la transaction** car elle attrape ses propres erreurs.
- **Guardrail sécurité** : le `select` de l'API ne doit jamais inclure `passwordHash`. C'est déjà le cas aujourd'hui (`onboardingSelect`) ; vérifier qu'il le reste après les modifications.

### Anti-patterns à éviter

1. **NE PAS** sortir l'auto-transition de la transaction Prisma — elle doit être rollback en cas d'échec.
2. **NE PAS** appeler `autoTransitionVerificationStatus` avec le Prisma global au lieu de `tx`.
3. **NE PAS** écraser `user.tier` avec une valeur invalide : le schéma Zod restreint à `AFFRANCHI`, `GRAND_FRERE`, `BOSS`.
4. **NE PAS** stocker `country` comme un objet — c'est un code pays string (ex. `"CI"`).
5. **NE PAS** exposer `passwordHash` dans le `select`, même partiellement.
6. **NE PAS** utiliser `&&` dans JSX.
7. **NE PAS** placer `safeCreateAuditLog` dans la transaction (elle n'est pas rollback-safe et gère ses erreurs).

### Choix techniques

- **Transaction atomique** : toutes les écritures User + l'auto-transition sont dans un `prisma.$transaction`. Cela garantit que l'utilisateur ne se retrouvera pas avec les champs User remplis mais le `verificationStatus` non mis à jour.
- **Audit log hors transaction** : l'audit log est une trace observabilité, pas une donnée fonctionnelle. Il reste hors transaction pour ne pas faire échouer la soumission si l'audit log a un problème.
- **Réponse enrichie** : `verificationStatus` est ajouté au `select` pour que le client puisse refléter immédiatement le nouveau statut (utile pour `/settings#verification`).

### File Structure

Fichiers à MODIFIER :
- `src/lib/validations.ts` — ajouter `country` dans `onboardingFormSchema`
- `src/app/api/user/onboarding/route.ts` — synchronisation des champs User + transaction + auto-transition
- `src/app/api/user/onboarding/route.test.ts` — tests de la synchronisation et de l'auto-transition
- `src/components/features/onboarding/complete-profile-form.tsx` — ajout du Select Pays
- `src/components/features/onboarding/complete-profile-form.test.tsx` — tests du Select Pays
- `src/app/onboarding/complete-profile/page.tsx` — passer `country` dans les `defaultValues`

Fichiers à LIRE pour le contexte :
- `src/app/api/user/profile/route.ts` — pattern de mutation User + transaction + autoTransitionVerificationStatus
- `src/components/features/auth/profile-edit-form.tsx` — pattern Select Pays avec `ALL_COUNTRIES`
- `src/lib/verification.server.ts` — signature et comportement de `autoTransitionVerificationStatus`
- `src/lib/audit-log.ts` — `AUDIT_ACTIONS.ONBOARDING_COMPLETED`
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-28.md#Story 16.1` — AC détaillées et technical notes du SCP

### References

- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-06-28.md#4.1] — code avant/après de `PUT /api/user/onboarding`
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-06-28.md#4.2] — ajout du champ "Pays" au formulaire
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-06-28.md#Story 16.1] — AC complets et technical notes
- [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions] — stack et patterns
- [Source: _bmad-output/planning-artifacts/prd.md#FR3] — modification du profil (nom, bio, téléphone, localisation, pays)
- [Source: src/app/api/user/onboarding/route.ts] — implémentation actuelle de l'API onboarding
- [Source: src/components/features/onboarding/complete-profile-form.tsx] — formulaire onboarding actuel
- [Source: src/app/api/user/profile/route.ts] — pattern transaction + autoTransitionVerificationStatus
- [Source: src/components/features/auth/profile-edit-form.tsx] — pattern Select Pays
- [Source: src/lib/validations.ts] — `ALL_COUNTRIES` et schémas Zod
- [Source: src/lib/verification.server.ts] — `autoTransitionVerificationStatus`
- [Source: _bmad-output/implementation-artifacts/11-2-formulaire-completion-profil.md] — story précédente ayant créé l'onboarding

## Dev Agent Record

### Agent Model Used

Kimi K2.7 Code (via Hermes delegate_task)

### Debug Log References

### Completion Notes List

- 2026-06-28 : Tous les critères d'acceptation sont satisfaits. L'API PUT /api/user/onboarding synchronise onboardingForm et les colonnes User (name, phone, location, country, bio, tier) dans une transaction Prisma atomique, appelle autoTransitionVerificationStatus avec le client transactionnel, conserve safeCreateAuditLog hors transaction, et enrichit la réponse avec verificationStatus sans jamais exposer passwordHash. Le formulaire CompleteProfileForm intègre un Select Pays basé sur ALL_COUNTRIES, positionné entre Téléphone et Durée d'adhésion, avec validation Zod requise et pré-remplissage depuis onboardingForm ou User.country. Les tests API et UI couvrent la synchronisation, l'auto-transition, le select sans passwordHash, la présence du champ Pays et son envoi au body. Build Next.js et suite de tests Vitest (975 tests) passent.

### File List

- Modifié : `src/lib/validations.ts`
- Modifié : `src/app/api/user/onboarding/route.ts`
- Modifié : `src/app/api/user/onboarding/route.test.ts`
- Modifié : `src/components/features/onboarding/complete-profile-form.tsx`
- Modifié : `src/components/features/onboarding/complete-profile-form.test.tsx`
- Modifié : `src/app/onboarding/complete-profile/page.tsx`
