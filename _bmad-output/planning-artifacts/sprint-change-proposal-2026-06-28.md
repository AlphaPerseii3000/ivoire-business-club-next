# Proposition de Modification de Sprint — Synchronisation Onboarding → Profil

**Projet :** Ivoire Business Club (IBC)  
**Auteur :** Jonathan (PO) / Hermes (Correct Course)  
**Date :** 28 juin 2026  
**Statut :** En attente de validation  
**Workflow :** bmad-correct-course (CC)  

---

## 1. Résumé du Changement

### 1.1 Problème identifié

Le parcours d'onboarding IBC présente une **incohérence structurelle** entre 3 systèmes qui devraient être alignés mais ne le sont pas :

| Système | Ce qu'il suit | Champ(s) DB | État après onboarding |
|---------|--------------|-------------|----------------------|
| Widget onboarding (`OnboardingProgressWidget`) | Email vérifié + profil complété | `emailVerified`, `onboardingCompletedAt` | 100% ✅ |
| Formulaire d'onboarding (`/onboarding/complete-profile`) | 9 champs du contrat d'adhésion → JSON | `onboardingForm` (JSON), `onboardingCompletedAt` | Sauvegardé ✅ |
| Vérification admin (`/settings#verification`) | Email + bio + location + country + statut compte | `emailVerified`, `bio`, `location`, `country`, `status` | ❌ bio/location/country manquants |

**Le problème :** Le formulaire d'onboarding sauvegarde les données dans un JSON (`onboardingForm`) mais **ne synchronise PAS** les champs correspondants du modèle `User` (`name`, `phone`, `bio`, `location`, `country`). L'utilisateur voit "Onboarding 100% ✅" sur le dashboard, mais sur `/settings#verification` il a encore 3 critères manquants (bio, location, country). Il doit aller sur `/profile` pour les remplir — une page séparée qui n'est **nulle part mentionnée** dans le parcours onboarding.

### 1.2 Diagnostic technique détaillé

**API `/api/user/onboarding` (PUT)** — ce qu'elle sauve :
```typescript
data: {
  onboardingForm: parsed.data,        // JSON blob
  onboardingCompletedAt: now,          // DateTime
}
```
**Ce qu'elle NE sauve PAS** : `name`, `phone`, `bio`, `location`, `country`.

**API `/api/user/profile` (POST)** — ce qu'elle sauve :
```typescript
data: {
  name: data.name,
  bio: data.bio,
  phone: data.phone,
  location: data.location,
  country: data.country,
}
```
Cette API est appelée uniquement depuis `/profile` (le formulaire `ProfileEditForm`), pas depuis l'onboarding.

**Champs d'onboarding vs champs User — mapping :**

| Champ onboarding (`onboardingForm` JSON) | Champ User correspondant | Synchronisé ? |
|------------------------------------------|--------------------------|---------------|
| `fullName` | `name` | ❌ Non |
| `phone` | `phone` | ❌ Non |
| `address` | `location` | ❌ Non (noms différents !) |
| `email` | `email` | N/A (read-only) |
| `duration` | — | N/A (donnée d'adhésion) |
| `tier` | `tier` | ❌ Non |
| `activity` | `bio` | ❌ Non (sémantique proche mais pas identique) |
| `goals` | — | N/A (donnée d'adhésion) |
| `needs` | — | N/A (donnée d'adhésion) |

**Champs requis pour `verificationStatus` (`getMissingVerificationPrerequisites`) :**

| Prérequis | Champ User | Rempli par onboarding ? | Rempli par /profile ? |
|-----------|------------|------------------------|----------------------|
| Email vérifié | `emailVerified` | ✅ Oui (flux séparé) | N/A |
| Bio non vide | `bio` | ❌ Non | ✅ Oui |
| Location non vide | `location` | ❌ Non | ✅ Oui |
| Country non vide | `country` | ❌ Non | ✅ Oui |
| Compte non suspendu | `status` | N/A | N/A |

### 1.3 Parcours utilisateur actuel (incohérent)

```
Inscription → emailVerified=false, bio=null, location=null, country=null
    ↓
Vérifier email → emailVerified=true (widget: 50%)
    ↓
Remplir formulaire onboarding → onboardingCompletedAt=now (widget: 100% ✅)
    ↓ MAIS bio/location/country toujours null
Aller sur /settings#verification → ❌ 3 critères manquants !
    ↓
L'utilisateur doit deviner d'aller sur /profile → remplir bio, location, country
    ↓
autoTransitionVerificationStatus → PENDING → EN_COURS
```

### 1.4 Parcours utilisateur proposé (cohérent)

```
Inscription → emailVerified=false, bio=null, location=null, country=null
    ↓
Vérifier email → emailVerified=true (widget: 50%)
    ↓
Remplir formulaire onboarding → onboardingCompletedAt=now
    ↓ ET EN MÊME TEMPS
    name ← fullName, phone ← phone, location ← address, country ← (déduit ou champ),
    bio ← activity (ou champ dédié), tier ← tier
    (widget: 100% ✅)
    ↓
/settings#verification → ✅ tous prérequis remplis → auto-transition EN_COURS
```

### 1.5 Classification du changement

- **Type :** Incohérence structurelle identifiée post-implémentation (gap entre 3 systèmes)
- **Étendue :** Additive — modification de l'API onboarding existante + migration de données rétroactive. Aucun rollback.
- **Risk :** Faible — modifications ciblées sur une route API et un script de migration. Pas de changement de schéma (les champs User existent déjà).

---

## 2. Analyse d'Impact

### 2.1 Impact sur les Epics et Stories

**Epics existants impactés :**

| Epic | Story | Impact | Détail |
|------|-------|--------|--------|
| Epic 11 | 11-2 (formulaire completion profil) | Code modifié | L'API `PUT /api/user/onboarding` est étendue pour synchroniser les champs User. La page `/onboarding/complete-profile` peut nécessiter l'ajout d'un champ `country` si pas déjà présent. |
| Epic 15 | 15-1 (widget progression) | Code non modifié | Le widget reste à 2 étapes. Le changement est en amont : l'onboarding remplit désormais les champs User, donc la vérification admin est automatiquement satisfaite. |
| Epic 1 | 1-4 (gestion du profil) | Code non modifié | La page `/profile` et le `ProfileEditForm` restent inchangés. L'utilisateur peut toujours éditer son profil après onboarding. |

**Nouvel epic créé :**

| Epic | Titre | Stories |
|------|-------|---------|
| Epic 16 | Synchronisation Onboarding → Profil & Migration Rétroactive | 2 stories (16.1 → 16.2) |

### 2.2 Conflits d'Artéfacts

**PRD :**
- Ajout de FR-SYNC1 : La soumission du formulaire d'onboarding synchronise les champs User (`name`, `phone`, `location`, `bio`, `country`, `tier`) en plus du JSON `onboardingForm`.
- Ajout de FR-SYNC2 : Les membres existants ayant un `onboardingForm` rempli mais des champs User vides sont automatiquement synchronisés via un script de migration.
- Aucune modification des FR existants (FR3, FR59, FR60 restent inchangés).

**Architecture :**
- `src/app/api/user/onboarding/route.ts` : Étendre le `prisma.user.update` pour écrire aussi dans les colonnes User (`name`, `phone`, `location`, `bio`, `country`, `tier`).
- `src/components/features/onboarding/complete-profile-form.tsx` : Ajouter un champ `country` (Select, comme dans `ProfileEditForm`) si pas déjà présent. Ajouter un champ `bio` ou mapper `activity` → `bio`.
- Nouveau script : `scripts/sync-onboarding-to-profile.ts` — migration one-shot pour les membres existants.
- Pas de changement de schéma Prisma — tous les champs existent déjà.

**UX/UI :**
- Le formulaire d'onboarding gagne un champ "Pays" (Select avec `ALL_COUNTRIES`) et potentiellement un champ "Bio" (ou mapping `activity` → `bio`).
- Le `ProfileEditForm` sur `/profile` reste inchangé — l'utilisateur peut toujours affiner après onboarding.

**Impact sur la vérification admin :**
- `autoTransitionVerificationStatus()` est déjà appelée après la mutation du profil (`/api/user/profile`). Il faut l'appeler aussi après la mutation onboarding pour que le `verificationStatus` passe automatiquement à `EN_COURS` si tous les prérequis sont remplis.

---

## 3. Approche Recommandée

### 3.1 Option retenue : Direct Adjustment (Option A — Fusion)

**Justification :**
- Aucun rollback nécessaire — les champs User existent déjà
- La modification est ciblée sur l'API onboarding + le formulaire
- L'auto-transition du verificationStatus existe déjà et s'activera naturellement une fois les champs remplis
- Effort : Medium (2 stories, 1 modification d'API, 1 script de migration)
- Risk : Low — pas de changement de schéma, pas de nouveau modèle

### 3.2 Alternatives considérées

| Option | Description | Pourquoi rejetée |
|--------|-------------|------------------|
| B : Étendre le widget | Ajouter une 3ème étape "Compléter mon profil public" qui pointe vers `/profile` | Ne résout pas le problème de fond : l'utilisateur doit faire une action supplémentaire non liée à l'onboarding. Le widget afficherait 67% au lieu de 100%, mais l'incohérence remaine. |
| C : Réconcilier les champs | Renommer `address` → `location` dans l'onboarding | Insuffisant : ne synchronise toujours pas les valeurs dans les colonnes User. |
| A (retenue) : Fusion | L'API onboarding écrit aussi dans les colonnes User | Résout le problème à la source. Un seul formulaire remplit tout. |

---

## 4. Propositions de Changement Détaillées

### 4.1 Changement d'API : `PUT /api/user/onboarding`

**Fichier :** `src/app/api/user/onboarding/route.ts`

**AVANT :**
```typescript
const updatedUser = await prisma.user.update({
  where: { id: session.user.id },
  data: {
    onboardingForm: parsed.data,
    onboardingCompletedAt: now,
  },
  select: onboardingSelect,
});
```

**APRÈS :**
```typescript
const updatedUser = await prisma.$transaction(async (tx) => {
  const user = await tx.user.update({
    where: { id: session.user.id },
    data: {
      onboardingForm: parsed.data,
      onboardingCompletedAt: now,
      // Synchronisation des champs User depuis le formulaire d'onboarding
      name: parsed.data.fullName,
      phone: parsed.data.phone || null,
      location: parsed.data.address || null,
      country: parsed.data.country || null,  // nouveau champ à ajouter au formulaire
      bio: parsed.data.activity || null,    // activity → bio (sémantique proche)
      tier: parsed.data.tier,               // tier du formulaire → User.tier
    },
    select: onboardingSelect,
  });

  // Auto-transition du verificationStatus si tous les prérequis sont remplis
  const transition = await autoTransitionVerificationStatus(session.user.id, tx);
  if (transition.changed) {
    user.verificationStatus = transition.status;
  }

  return user;
});
```

**Rationale :** Un seul formulaire d'onboarding remplit à la fois le JSON `onboardingForm` (contrat d'adhésion) et les colonnes User standard (`name`, `phone`, `location`, `country`, `bio`, `tier`). L'auto-transition `verificationStatus` est appelée dans la même transaction pour que le statut passe automatiquement à `EN_COURS` si tous les prérequis sont remplis.

### 4.2 Changement de formulaire : ajout du champ "Pays"

**Fichier :** `src/components/features/onboarding/complete-profile-form.tsx`

Le formulaire d'onboarding actuel n'a pas de champ "Pays" — or `country` est un prérequis pour `verificationStatus`. Ajout d'un Select "Pays" identique à celui du `ProfileEditForm` (utilisant `ALL_COUNTRIES`).

**Champ à ajouter dans `onboardingFormSchema` (`src/lib/validations.ts`) :**
```typescript
country: z.string().min(2, "Sélectionne un pays"),
```

### 4.3 Mapping des champs onboarding → User

| Champ onboarding | Champ User | Transformation |
|------------------|-----------|---------------|
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

---

## 5. Stories du Nouvel Epic 16

### Epic 16 : Synchronisation Onboarding → Profil & Migration Rétroactive

**Objectif :** Éliminer l'incohérence entre le formulaire d'onboarding, le widget de progression, et les prérequis de vérification admin. Un seul formulaire remplit tout.

---

### Story 16.1 : Synchronisation des champs onboarding → User

**En tant que** nouveau membre IBC,  
**Je veux** que le formulaire d'onboarding remplisse automatiquement tous les champs de mon profil (nom, téléphone, localisation, pays, bio, tier),  
**Afin que** mon profil soit complet pour la vérification admin sans avoir à remplir une deuxième fois le même type d'informations sur `/profile`.

**Acceptance Criteria :**

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
   - **Then** la mise à jour des champs User, la sauvegarde du JSON `onboardingForm`, l'audit log, et l'auto-transition du verificationStatus sont dans une seule transaction Prisma
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

**Technical Notes :**
- Importer `autoTransitionVerificationStatus` depuis `src/lib/verification.server.ts` (déjà utilisé dans `profile/route.ts`).
- Importer `ALL_COUNTRIES` depuis `src/lib/validations.ts` (déjà exporté, utilisé par `ProfileEditForm`).
- Le `onboardingSelect` de l'API doit être étendu pour inclure `verificationStatus` dans la réponse (pour que le client sache si l'auto-transition a eu lieu).
- Garder le `safeCreateAuditLog` après la transaction (pattern existant — l'audit log n'est pas dans la transaction car il attrape ses propres erreurs).
- **Guardrail :** Ne pas exposer `passwordHash` dans le `select` de l'API.

---

### Story 16.2 : Migration rétroactive — synchroniser les membres existants

**En tant que** admin IBC,  
**Je veux** que les membres déjà inscrits qui ont rempli le formulaire d'onboarding mais dont les champs User sont vides soient automatiquement synchronisés,  
**Afin que** personne n'ait à re-remplir le formulaire pour que la vérification admin fonctionne.

**Acceptance Criteria :**

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

**Technical Notes :**
- Le script utilise `prisma` directement (Node script, pas API route).
- Ajouter `ONBOARDING_SYNC_MIGRATION` au `AUDIT_ACTIONS` dans `src/lib/audit-log.ts`.
- Exécuter avec `npx tsx scripts/sync-onboarding-to-profile.ts` (ou `npx ts-node`).
- Pour le test, utiliser une DB SQLite in-memory de test avec des fixtures.
- **Guardrail :** Ne JAMAIS écraser un champ User non-null par une valeur du JSON. On ne synchronise que les champs vides.

---

### Story 16.3 : Email d'accueil dynamique selon le mode de paiement

**En tant que** nouveau membre IBC,  
**Je veux** que l'email d'accueil contienne les instructions de paiement correspondant au mode que j'ai choisi (virement bancaire, Wave, ou Orange Money),  
**Afin que** je sache exactement comment finaliser mon adhésion sans devoir chercher l'information sur le site.

**Contexte :** La fonction `sendWelcomeEmail` supporte déjà 3 modes de paiement (`BANK_TRANSFER`, `WAVE`, `ORANGE_MONEY`) avec des instructions dédiées, mais les deux appelants (signup route + Google OAuth) ne passent jamais `paymentProvider` ni `tier` — tout est hardcodé `AFFRANCHI` + `BANK_TRANSFER`.

**Acceptance Criteria :**

1. **AC1 — L'email d'accueil post-sélection de paiement est dynamique**
   - **Given** un membre qui vient de choisir son tier et son mode de paiement sur `/pricing` (API `POST /api/subscriptions`)
   - **When** la souscription est créée
   - **Then** un email d'accueil est envoyé avec `paymentProvider` correspondant au choix du membre (`BANK_TRANSFER`, `WAVE`, ou `ORANGE_MONEY`)
   - **And** le `tier` dans l'email correspond au tier choisi (pas `AFFRANCHI` par défaut)
   - **And** les instructions de paiement correspondent au provider (IBAN pour virement, numéro marchand Wave/Orange Money + référence)
   - **And** le `providerPhone` est inclus si le membre a fourni un numéro mobile money

2. **AC2 — L'email d'accueil post-inscription reste générique (sans instructions de paiement)**
   - **Given** un membre qui vient de s'inscrire (signup ou Google OAuth)
   - **When** l'email de bienvenue est envoyé
   - **Then** il ne contient **pas** d'instructions de paiement spécifiques (le membre n'a pas encore choisi son tier ni son mode de paiement)
   - **And** le `tier` affiché est `AFFRANCHI` (par défaut, comme actuellement)
   - **And** l'email invite le membre à choisir son abonnement dans son espace membre
   - **And** l'email inclut le lien vers `/pricing`

3. **AC3 — Non-doublon**
   - **Given** un membre qui reçoit l'email de bienvenue post-inscription
   - **When** il choisit ensuite son mode de paiement sur `/pricing`
   - **Then** l'email d'accueil dynamique (post-sélection) est envoyé une seule fois
   - **And** le membre ne reçoit pas l'email de bienvenue post-inscription à nouveau

4. **AC4 — Extraction du corps d'email dans `sendWelcomeEmail`**
   - **Given** la fonction `sendWelcomeEmail`
   - **When** elle est appelée sans `paymentProvider` (ou avec `paymentProvider = null`)
   - **Then** le corps de l'email ne contient aucune section "Pour finaliser votre adhésion, merci d'effectuer..."
   - **And** le corps contient à la place un lien vers `/pricing` : "Choisissez votre formule d'abonnement dans votre espace membre : {appUrl}/pricing"

5. **AC5 — Tests**
   - **Given** les tests unitaires
   - **When** ils s'exécutent
   - **Then** les tests vérifient que `sendWelcomeEmail` avec `paymentProvider = "WAVE"` génère les instructions Wave
   - **And** les tests vérifient que `sendWelcomeEmail` avec `paymentProvider = "ORANGE_MONEY"` génère les instructions Orange Money
   - **And** les tests vérifient que `sendWelcomeEmail` sans `paymentProvider` ne génère pas de section paiement mais inclut le lien `/pricing`
   - **And** les tests vérifient que l'API `POST /api/subscriptions` appelle `sendWelcomeEmail` avec le bon `paymentProvider` et `tier`
   - **And** les tests existants de signup sont mis à jour : l'email post-inscription ne contient plus de section paiement

**Technical Notes :**
- **Fichiers à modifier :**
  - `src/lib/email.ts` : Rendre `paymentProvider` optionnel (nullable). Si absent, ne pas inclure de section paiement, mais ajouter un lien vers `/pricing`.
  - `src/app/api/auth/signup/route.ts` L74 : Retirer `paymentProvider` de l'appel (déjà absent, mais vérifier que le default ne force pas `BANK_TRANSFER`). Changer le default à `undefined`/`null`.
  - `src/lib/auth.ts` L116 : Idem — retirer le default `BANK_TRANSFER`.
  - `src/app/api/subscriptions/route.ts` : Après la création de la subscription (L80, après la transaction), appeler `sendWelcomeEmail` avec `paymentProvider`, `tier`, `providerPhone`, `userId`.
- **Signature `sendWelcomeEmail` :** Changer `paymentProvider?: "BANK_TRANSFER" | "WAVE" | "ORANGE_MONEY"` → `paymentProvider?: "BANK_TRANSFER" | "WAVE" | "ORANGE_MONEY" | null` et default à `null` au lieu de `"BANK_TRANSFER"`.
- La section paiement n'est générée que si `paymentProvider` est défini et non-null.
- Le lien `/pricing` est toujours inclus dans l'email post-inscription (sans choix de paiement).
- **Guardrail :** Ne pas envoyer l'email de bienvenue si la subscription est en échec (transaction Prisma échouée → pas d'email).

---

## 6. Impact sur le PRD

### Nouvelles exigences fonctionnelles

| ID | Description | Story |
|----|-------------|-------|
| FR-SYNC1 | La soumission du formulaire d'onboarding synchronise les colonnes User (`name`, `phone`, `location`, `country`, `bio`, `tier`) en plus du JSON `onboardingForm` | 16.1 |
| FR-SYNC2 | Un script de migration synchronise rétroactivement les membres existants ayant un `onboardingForm` rempli mais des champs User vides | 16.2 |
| FR-SYNC3 | L'email d'accueil post-sélection de paiement inclut les instructions dynamiques selon le mode choisi (virement, Wave, Orange Money) | 16.3 |
| FR-SYNC4 | L'email d'accueil post-inscription ne contient pas d'instructions de paiement (le membre n'a pas encore choisi) mais invite à choisir sur `/pricing` | 16.3 |

### Exigences existantes inchangées

- FR3 (consulter/modifier profil) — inchangé. Le `ProfileEditForm` sur `/profile` reste le seul moyen de modifier le profil après onboarding.
- FR59/FR60 (formulaire d'adhésion digitalisé) — le formulaire est étendu, pas remplacé.
- Les prérequis de `verificationStatus` (`getMissingVerificationPrerequisites`) — inchangés. Le comportement change parce que les champs sont désormais remplis par l'onboarding, mais la logique de vérification elle-même n'est pas modifiée.

---

## 7. Plan de Handoff

### 7.1 Classification du changement

- **Scope :** Moderate — 1 nouvel epic, 3 nouvelles stories, 1 modification d'API, 1 script de migration, 1 champ de formulaire ajouté, 1 refonte de l'email d'accueil
- **Handoff :** Developer agent (DS) pour chaque story, puis CR

### 7.2 Séquence d'implémentation

1. **Story 16.1** (synchronisation onboarding → User) — doit être implémentée en premier
2. **Story 16.2** (migration rétroactive) — peut être implémentée en parallèle ou après 16.1
3. **Story 16.3** (email d'accueil dynamique) — indépendante, peut être implémentée en parallèle

### 7.3 Success Criteria

- Un nouveau membre qui complète l'onboarding a automatiquement tous les prérequis de vérification remplis (sauf emailVerified qui dépend du flux de vérification séparé)
- Le `verificationStatus` passe automatiquement à `EN_COURS` après onboarding si l'email est déjà vérifié
- Les membres existants n'ont rien à refaire — le script de migration synchronise leurs données
- `npm run build` passe sans erreur
- Les tests unitaires couvrent : synchronisation des champs, auto-transition, cas edge du script de migration, idempotence
- Le formulaire d'onboarding inclut un champ "Pays"
- L'email d'accueil post-sélection de paiement contient les instructions dynamiques (virement, Wave, ou Orange Money)
- L'email d'accueil post-inscription ne contient pas d'instructions de paiement mais un lien vers `/pricing`

---

## 8. Mises à jour de sprint-status.yaml

Après validation, ajouter :

```yaml
  epic-16: in-progress
  16-1-sync-onboarding-to-user: backlog
  16-2-migration-retroactive-members: backlog
  16-3-email-accueil-dynamique-paiement: backlog
```