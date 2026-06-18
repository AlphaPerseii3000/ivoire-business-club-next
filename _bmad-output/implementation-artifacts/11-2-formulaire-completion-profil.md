# Story 11.2: Formulaire de complétion de profil post-inscription

Status: done

## Review Findings

Résultat de la revue BMAD : **PASS**.

### Vérifications critiques (toutes OK)

1. **JSX guardrail** : aucun `&&` dans les expressions JSX des fichiers `.tsx` créés/modifiés.
2. **Auth gate** : la page utilise `auth()` et redirige vers `/auth/signin` si non authentifié ; aucun appel à `getUserPremiumAccess`.
3. **Audit log** : `safeCreateAuditLog` est appelée après `prisma.user.update` et avant le retour réseau ; action `ONBOARDING_COMPLETED`, `entityType="User"`, `entityId=user.id`.
4. **Input validation** : le body est validé par `onboardingFormSchema.safeParse` avant toute mutation ; JSON invalide → 400 ; champs inconnus rejetés par Zod.
5. **No passwordHash exposure** : le `select` de l'API exclut `passwordHash` ; test dédié présent.
6. **Prisma migration** : migration additive (`ADD COLUMN`) sans `DROP` ni recréation de table ; schema.prisma et schema.dev.prisma alignés.
7. **'use client'** : présent en tête de `complete-profile-form.tsx` ; la page est un Server Component.
8. **Pre-fill logic** : `name → fullName`, `email`, `phone`, `country`, et les données JSON existantes de `onboardingForm` sont pré-remplies.
9. **Test coverage** : 15 nouveaux tests passent (API, page, formulaire) ; tous les ACs couverts.
10. **No binary DB files committed** : aucun `dev.db` ou `.sqlite3` dans le diff.
11. **suppressHydrationWarning** : déjà présent sur `<body>` dans `layout.tsx` (non modifié par cette story).
12. **Zod schema** : 8 champs conformes au contrat PO (`fullName`, `address`, `phone`, `email`, `duration`, `tier`, `activity`, `goals`, `needs`).

### Notes mineures

- Le champ email du formulaire client était déjà `disabled` ; ajout de `readOnly` pour plus de robustesse (éviter la saisie et l'inclusion dans la soumission RHF).
- L'audit log est appelé en dehors d'une transaction Prisma. C'est acceptable car `safeCreateAuditLog` attrape ses propres erreurs ; il n'y a pas de rollback possible si l'audit échoue.
- L'API retourne `onboardingCompletedAt` sous forme de chaîne ISO (Prisma DateTime → JSON). Cohérent avec l'AC.

### Issues: 0 decision-needed, 0 patch, 0 defer, 0 dismissed.

---

## Story

As a nouveau membre,
I want compléter un formulaire d'adhésion avec mes informations détaillées,
so that faciliter mon matching et mon accompagnement par le club.

## Acceptance Criteria

1. **Given** un membre authentifié sur `/onboarding/complete-profile`
   **When** il accède au formulaire
   **Then** les champs existants de son profil sont pré-remplis (nom, email, téléphone, pays)

2. **Given** le formulaire de complétion (contrat d'adhésion digitalisé — 8 champs)
   **When** le membre le soumet
   **Then** les données sont sauvegardées dans le champ `onboardingForm` (JSON) du `User`, `onboardingCompletedAt` est setté, et le membre est redirigé vers `/dashboard` avec un toast de confirmation

3. **Given** un visiteur non authentifié
   **When** il tente d'accéder à `/onboarding/complete-profile`
   **Then** il est redirigé vers `/auth/signin`

4. **Given** un membre qui a déjà complété le formulaire
   **When** il retourne sur `/onboarding/complete-profile`
   **Then** il voit ses réponses pré-remplies et peut les modifier

## Tasks / Subtasks

- [x] Task 1: Migration Prisma — ajouter `onboardingForm Json?` et `onboardingCompletedAt DateTime?` au modèle `User` (AC: #2)
  - [x] 1.1 Modifier `prisma/schema.prisma` : ajouter les deux champs dans le modèle `User`
  - [x] 1.2 Générer et appliquer la migration avec `npx prisma migrate dev --name add_onboarding_form` (dev SQLite) ; fournir le nom de migration explicite
  - [x] 1.3 S'assurer que `prisma.user.update` et le retour d'API n'exposent pas `passwordHash`

- [x] Task 2: Créer le schéma Zod de validation du formulaire d'adhésion (AC: #2, #4)
  - [x] 2.1 Ajouter `onboardingFormSchema` dans `src/lib/validations.ts` avec les 8 champs :
    - `fullName`: `z.string().min(2).max(150)`
    - `address`: `z.string().min(5).max(300)`
    - `phone`: `z.string().regex(/^\+?\d[\d\s.-]{6,}$/, ...)` — réutiliser la regex existante
    - `email`: `z.string().email()`
    - `duration`: `z.enum(["MONTHLY", "SEMESTERIAL", "ANNUAL"])`
    - `tier`: `z.enum(["AFFRANCHI", "GRAND_FRERE", "BOSS"])`
    - `activity`: `z.string().min(2).max(300)`
    - `goals`: `z.string().min(10).max(2000)`
    - `needs`: `z.string().min(10).max(2000)`
  - [x] 2.2 Exporter `OnboardingFormInput = z.infer<typeof onboardingFormSchema>`

- [x] Task 3: Créer l'API route `PUT /api/user/onboarding` (AC: #2, #4)
  - [x] 3.1 Vérifier `auth()` → 401 si non authentifié
  - [x] 3.2 Valider le body avec `onboardingFormSchema`
  - [x] 3.3 Mettre à jour l'utilisateur : `onboardingForm: parsed.data`, `onboardingCompletedAt: new Date()`
  - [x] 3.4 Logger un audit `ONBOARDING_COMPLETED` via `AuditLog` (action, entityType `User`, entityId user.id, metadata avec date)
  - [x] 3.5 Retourner `200 { data: { onboardingForm, onboardingCompletedAt } }` sans champs sensibles
  - [x] 3.6 Gérer les erreurs serveur avec `sanitizeError` et retourner 500

- [x] Task 4: Créer la page `/onboarding/complete-profile` (AC: #1, #3, #4)
  - [x] 4.1 Utiliser une Server Component par défaut pour lire `auth()` et utiliser `prisma` directement (pas d'appel HTTP supplémentaire)
  - [x] 4.2 Si non authentifié → `redirect("/auth/signin")`
  - [x] 4.3 Pré-remplir les champs depuis le profil existant : `name → fullName`, `email`, `phone`, `country`
  - [x] 4.4 Si `onboardingCompletedAt` existe, pré-remplir aussi avec les données JSON existantes
  - [x] 4.5 Rendre le formulaire client via un composant dédié `CompleteProfileForm` (cf. Task 5)

- [x] Task 5: Créer le composant client `CompleteProfileForm` (AC: #1, #2, #4)
  - [x] 5.1 Fichier `src/components/features/onboarding/complete-profile-form.tsx` avec `"use client"` en haut
  - [x] 5.2 Utiliser `react-hook-form` + `zodResolver` avec `onboardingFormSchema`
  - [x] 5.3 Utiliser les composants shadcn/ui `Input`, `Textarea`, `Select`, `Label`, `Button`
  - [x] 5.4 Afficher les 8 champs en single-column, labels au-dessus, placeholders muted (UX-DR14)
  - [x] 5.5 Champ email en read-only (pré-rempli, non modifiable)
  - [x] 5.6 Bouton submit pleine largeur mobile, avec état loading
  - [x] 5.7 À la soumission, appeler `PUT /api/user/onboarding`
  - [x] 5.8 En cas de succès, afficher `toast.success("Profil complété. Bienvenue sur IBC !")` puis rediriger vers `/dashboard`
  - [x] 5.9 En cas d'erreur, afficher `toast.error("Erreur lors de la sauvegarde")`

- [x] Task 6: Gérer le routage post-inscription et la redirection (AC: #3)
  - [x] 6.1 Vérifier que `/onboarding/complete-profile` est traitée comme une route publique accessible aux utilisateurs authentifiés (le middleware `src/middleware.ts` ne doit pas la bloquer)
  - [x] 6.2 Optionnel : après signin/signup, rediriger vers `/onboarding/complete-profile` si le membre n'a pas encore `onboardingCompletedAt` — non implémenté dans cette story ; à discuter avec le PO

- [x] Task 7: Tests unitaires et d'intégration (AC: #1, #2, #3, #4)
  - [x] 7.1 Créer `src/app/api/user/onboarding/route.test.ts` :
    - 401 si non authentifié
    - 400 si body invalide
    - 200 + mise à jour `onboardingForm` + `onboardingCompletedAt` + log audit
    - 200 permet de modifier les données si déjà complétées
    - 500 si erreur DB
  - [x] 7.2 Créer `src/components/features/onboarding/complete-profile-form.test.tsx` :
    - pré-remplissage des champs
    - soumission appelle l'API
    - affichage du toast et redirection
  - [x] 7.3 Créer `src/app/onboarding/complete-profile/page.test.tsx` :
    - redirection si non authentifié
    - rendu du formulaire si authentifié

## Dev Notes

### Contexte métier critique

Le PO a confirmé (commit `b9707cd`) que le **formulaire de complétion de profil est le contrat d'adhésion lui-même**, digitalisé sous forme de formulaire web. Les 8 champs du formulaire sont :

| Champ | Type | Source contrat |
|-------|------|----------------|
| Nom / Prénom ou Société | Texte | En-tête du contrat |
| Adresse | Texte | En-tête du contrat |
| Téléphone | Texte | En-tête du contrat |
| Email | Texte (pré-rempli) | En-tête du contrat |
| Durée d'adhésion | Select : Mensuelle / Semestrielle / Annuelle | Art. 2 |
| Formule choisie | Select : Affranchis / Grands Frères / Boss | Art. 3 |
| Activité | Texte / Textarea | Art. 5bis |
| Objectifs | Textarea | Art. 5bis |
| Besoins | Textarea | Art. 5bis |

La soumission du formulaire représente la signature numérique de l'adhésion. Le champ `onboardingForm` doit stocker l'ensemble du JSON ; `onboardingCompletedAt` date la soumission.

### Schéma Prisma — ATTENTION

Le modèle `User` actuel (`prisma/schema.prisma`) **n'a pas** les champs `onboardingForm` ni `onboardingCompletedAt`. Ils doivent être ajoutés :

```prisma
model User {
  // ... champs existants
  onboardingForm      Json?
  onboardingCompletedAt DateTime?
  // ...
}
```

C'est une **modification de schéma requise** pour cette story. Le dev agent doit créer la migration Prisma.

### Architecture & patterns à suivre

- **Next.js 16 App Router** : les pages sont des Server Components par défaut. Le formulaire lui-même doit être un Client Component avec `"use client"`.
- **JSX guardrail** : ne JAMAIS utiliser `&&` dans les expressions JSX. Toujours utiliser `condition ? <Component /> : null`.
- **Auth.js v5** : utiliser `auth()` depuis `src/lib/auth.ts` (Node runtime). Le middleware `src/middleware.ts` gère déjà la protection générique via `authConfig`.
- **Prisma 7** : importer `prisma` depuis `@/lib/prisma` (client généré dans `src/generated/prisma`).
- **Formulaires** : React Hook Form + Zod, avec `@hookform/resolvers/zod`. Réutiliser les composants shadcn/ui existants.
- **UX-DR14** : labels au-dessus, placeholders muted, validation inline, état loading.
- **Toast** : utiliser `sonner` (`toast.success` / `toast.error`). `Toaster` est déjà monté dans le layout racine via `src/components/ui/sonner.tsx`.
- **Audit logs** : créer une entrée `AuditLog` après la mutation (pattern existant dans `src/lib/verification.server.ts`, `src/app/api/admin/*`).

### Anti-patterns à éviter

1. **NE PAS** exposer `passwordHash` dans les réponses API.
2. **NE PAS** stocker `onboardingForm` comme champ texte simple — type `Json` obligatoire.
3. **NE PAS** utiliser `&&` dans JSX (règle Next.js 16).
4. **NE PAS** créer un layout `(public)` ou route group supplémentaire — la page `/onboarding/complete-profile` est une route App Router simple.
5. **NE PAS** rediriger automatiquement depuis `/dashboard` si le formulaire n'est pas complété dans cette story (à discuter avec le PO pour une story ultérieure).
6. **NE PAS** utiliser `getUserPremiumAccess` : ce n'est pas une page dashboard, c'est une page d'onboarding pour nouveaux membres qui n'ont pas encore payé.
7. **NE PAS** appeler `prisma.user.update` directement depuis un Server Component — passer par une Server Action ou une API route.

### Choix technique

- **Server Component** pour `page.tsx` : fetch user via Prisma directement (c'est une RSC), puis passe les données au composant client.
- **API Route `PUT /api/user/onboarding`** : endpoint dédié pour la mutation ; meilleure séparation que Server Action et plus facile à tester.
- **Composant client séparé** : pour utiliser `react-hook-form`, `useRouter`, `toast` et les event handlers (onSubmit).

### File Structure

Fichiers à CRÉER :
- `prisma/migrations/20260618102845_add_onboarding_form/migration.sql` — via `npx prisma migrate dev`
- `prisma/schema.prisma` — ajouter `onboardingForm` et `onboardingCompletedAt`
- `prisma/schema.dev.prisma` — ajouter `onboardingForm` et `onboardingCompletedAt`
- `src/lib/validations.ts` — ajouter `onboardingFormSchema`
- `src/lib/audit-log.ts` — ajouter `ONBOARDING_COMPLETED`
- `src/app/api/user/onboarding/route.ts` — API route PUT
- `src/app/api/user/onboarding/route.test.ts` — tests API
- `src/app/onboarding/complete-profile/page.tsx` — page server
- `src/app/onboarding/complete-profile/page.test.tsx` — tests page
- `src/components/features/onboarding/complete-profile-form.tsx` — formulaire client
- `src/components/features/onboarding/complete-profile-form.test.tsx` — tests composant

Fichiers à LIRE pour le contexte :
- `src/lib/validations.ts` — pattern des schémas Zod existants
- `src/lib/auth.ts` — pattern d'authentification
- `src/app/api/user/profile/route.ts` — pattern de mutation user + transaction
- `src/app/api/user/profile/route.test.ts` — pattern de tests API user
- `src/components/features/auth/profile-edit-form.tsx` — pattern React Hook Form + shadcn/ui
- `src/app/(dashboard)/dashboard/opportunities/new/page.tsx` — exemple de formulaire client dans une page
- `src/components/ui/sonner.tsx` — configuration toast
- `prisma/schema.prisma` — modèle User existant

### References

- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-06-18.md#Story 11.2] — AC et contexte métier
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-06-18.md#5.5] — clarification PO : formulaire = contrat d'adhésion digitalisé
- [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions] — stack et patterns
- [Source: _bmad-output/planning-artifacts/epics.md#Additional Requirements] — formulaires RHF+Zod, Auth.js split config, Prisma 7
- [Source: _bmad-output/planning-artifacts/ux-spec.md#10.5] — pattern page profil et formulaires
- [Source: _bmad-output/planning-artifacts/ux-spec.md#11.1] — composants shadcn/ui Input/Select/Textarea
- [Source: _bmad-output/planning-artifacts/prd.md#FR59, FR60] — onboarding et formulaire
- [Source: src/lib/validations.ts] — schémas Zod existants
- [Source: src/lib/auth.ts] — auth() pattern
- [Source: src/app/api/user/profile/route.ts] — mutation User + transaction
- [Source: src/components/features/auth/profile-edit-form.tsx] — pattern formulaire client
- [Source: src/app/onboarding/complete-profile] — page créée
- [Source: _bmad-output/implementation-artifacts/sprint-status.yaml] — status tracking

## Dev Agent Record

### Agent Model Used

Kimi K2.7 Code (via Hermes delegate_task)

### Debug Log References

- Migration Prisma appliquée avec succès après reset local (drift résiduel dû aux migrations précédentes modifiées).
- Build Next.js 16 passé sans erreur.
- Suite de tests Vitest : 704 tests passent (15 nouveaux pour cette story).

### Completion Notes List

- Migration Prisma créée et appliquée (`add_onboarding_form`) avec les champs `onboardingForm` (Json?) et `onboardingCompletedAt` (DateTime?).
- Schéma Zod `onboardingFormSchema` ajouté dans `src/lib/validations.ts` avec les 9 champs requis (8 + email).
- API route `PUT /api/user/onboarding` créée : auth, validation Zod, mutation User, audit log `ONBOARDING_COMPLETED`, réponse sans `passwordHash`.
- Page Server Component `/onboarding/complete-profile` créée : redirection si non authentifié, pré-remplissage via Prisma, rendu du formulaire client.
- Composant client `CompleteProfileForm` créé avec react-hook-form + zodResolver, shadcn/ui, toast et redirection `/dashboard`.
- Tests créés pour l'API (6 tests), le formulaire (6 tests) et la page (3 tests).
- Guardrail Next.js 16 respecté : aucun `&&` dans les expressions JSX des nouveaux fichiers.

### File List

- Modifié : `prisma/schema.prisma`
- Modifié : `prisma/schema.dev.prisma`
- Créé : `prisma/migrations/20260618102845_add_onboarding_form/migration.sql`
- Modifié : `src/lib/validations.ts`
- Modifié : `src/lib/audit-log.ts`
- Créé : `src/app/api/user/onboarding/route.ts`
- Créé : `src/app/api/user/onboarding/route.test.ts`
- Créé : `src/app/onboarding/complete-profile/page.tsx`
- Créé : `src/app/onboarding/complete-profile/page.test.tsx`
- Créé : `src/components/features/onboarding/complete-profile-form.tsx`
- Créé : `src/components/features/onboarding/complete-profile-form.test.tsx`
