# Story 1.5: Suppression de Compte RGPD

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a logged-in member,
I want to permanently delete my account and have my personal data anonymized or removed per GDPR requirements,
so that I can exercise my right to erasure as guaranteed by applicable data protection regulations.

## Acceptance Criteria

1. **Delete account button triggers confirmation modal**
   - **Given** a logged-in member on `/profile/settings` (the "Zone de danger" section)
   - **When** they click "Supprimer mon compte"
   - **Then** a confirmation modal (Dialog) opens with the warning: « Cette action est irréversible. Toutes vos données seront supprimées définitivement. » and requires the user to type "SUPPRIMER" to confirm

2. **Account deletion anonymizes/removes personal data and redirects**
   - **Given** a member in the deletion confirmation modal who has typed "SUPPRIMER"
   - **When** they confirm the deletion
   - **Then** the system anonymizes/removes the user's personal data: email → `deleted_{id}@deleted.ibc`, name → "Compte supprimé", clears bio, phone, location, country, image, passwordHash, googleId; sets `verificationStatus` to REJECTED; deletes all Sessions and Accounts linked to the user
   - **And** the user is signed out and redirected to `/` (landing page)

3. **User's opportunities are deleted or anonymized**
   - **Given** a member who had published opportunities
   - **When** their account is deleted
   - **Then** their opportunities are **deleted** (cascade: `onDelete: Cascade` on Opportunity.authorId already defined in Prisma schema) — this is the simplest approach for MVP; the product decision is full cascade deletion, not reattribution to a system account

4. **User's subscriptions and payments are deleted**
   - **Given** a member who had subscriptions or payments
   - **When** their account is deleted
   - **Then** their subscriptions and payments are deleted via cascade (`onDelete: Cascade` on Subscription.userId and Payment.userId)

5. **Deleted user cannot re-authenticate**
   - **Given** a user whose account has been "deleted" (anonymized)
   - **When** they try to sign in with their original email or Google OAuth
   - **Then** the login fails because the email has been changed to `deleted_{id}@deleted.ibc` and `passwordHash` is set to a random bcrypt hash; Google OAuth creates a new Account linked to the anonymized User but cannot authenticate because `verificationStatus` is REJECTED and `role` is still MEMBER with no meaningful data

6. **Admin can suspend or reactivate a user account (FR7 — partial, admin user listing)**
   - **Given** an admin on `/admin/members`
   - **When** they view the member list
   - **Then** they see deleted/anonymized accounts clearly marked (name "Compte supprimé") and can filter them out of the active member list
   - **Note:** Full admin suspend/reactivate functionality belongs to Story 6.5. This story only ensures that anonymized accounts are identifiable and don't break admin views.

7. **Deletion is protected against accidental triggers**
   - **Given** a member viewing the "Zone de danger" section
   - **When** they see the deletion UI
   - **Then** the delete button is styled with destructive variant (red/danger), and requires typing "SUPPRIMER" to enable the confirm button, and the confirm button shows a loading spinner during the API call

8. **API returns proper error responses**
   - **Given** an unauthenticated user calling `DELETE /api/user/account`
   - **When** the request is made
   - **Then** the API returns 401 « Non autorisé »

   - **Given** an authenticated user calling `DELETE /api/user/account` with an incorrect confirmation
   - **When** the confirmation text is not "SUPPRIMER"
   - **Then** the API returns 400 « Veuillez taper SUPPRIMER pour confirmer. »

## Tasks / Subtasks

- [ ] **Task 1: Create account deletion API route** (AC: 2, 3, 4, 5, 8)
  - [ ] 1.1 Create `src/app/api/user/account/route.ts` with a `DELETE` handler:
    - Authenticate user with `auth()` — return 401 if not authenticated
    - Parse request body `{ confirmation: string }` — validate with Zod
    - Verify `confirmation === "SUPPRIMER"` — return 400 if not matching
    - Execute account anonymization in a Prisma `$transaction`:
      ```typescript
      await prisma.$transaction([
        // Delete opportunities (cascade should handle this, but explicit for safety)
        prisma.opportunity.deleteMany({ where: { authorId: userId } }),
        // Delete payments (cascade should handle, but explicit)
        prisma.payment.deleteMany({ where: { userId } }),
        // Delete subscriptions
        prisma.subscription.deleteMany({ where: { userId } }),
        // Delete accounts (OAuth)
        prisma.account.deleteMany({ where: { userId } }),
        // Delete sessions
        prisma.session.deleteMany({ where: { userId } }),
        // Delete verification tokens
        prisma.verificationToken.deleteMany({ where: { userId } }),
        // Anonymize user record
        prisma.user.update({
          where: { id: userId },
          data: {
            email: `deleted_${userId}@deleted.ibc`,
            name: "Compte supprimé",
            bio: null,
            image: null,
            phone: null,
            location: null,
            country: null,
            passwordHash: await bcrypt.hash(randomUUID(), 12),
            googleId: null,
            emailVerified: false,
            verificationStatus: "REJECTED",
          },
        }),
      ]);
      ```
    - Return `{ data: { message: "Compte supprimé avec succès." } }` on success
    - Return 500 `{ error: "Erreur interne" }` on unexpected errors
  - [ ] 1.2 Add `accountDeletionSchema` to `src/lib/validations.ts`:
    ```typescript
    export const accountDeletionSchema = z.object({
      confirmation: z.literal("SUPPRIMER", {
        message: "Veuillez taper SUPPRIMER pour confirmer.",
      }),
    });
    export type AccountDeletionInput = z.infer<typeof accountDeletionSchema>;
    ```

- [ ] **Task 2: Update Settings page "Zone de danger" with deletion modal** (AC: 1, 7)
  - [ ] 2.1 Create `src/components/features/auth/delete-account-dialog.tsx` — `"use client"` component:
    - Uses shadcn/ui `Dialog` (or `AlertDialog`) component
    - Trigger: destructive-styled button « Supprimer mon compte »
    - Modal content:
      - Warning icon + title: « Supprimer mon compte »
      - Description: « Cette action est irréversible. Toutes vos données (profil, abonnements, opportunités) seront supprimées définitivement. Vous ne pourrez pas récupérer votre compte. »
      - Text input with label: « Tapez SUPPRIMER pour confirmer »
      - Confirm button: disabled until user types "SUPPRIMER" exactly, destructive variant, shows spinner on submit
      - Cancel button: closes modal
    - On confirm: calls `DELETE /api/user/account` with `{ confirmation: "SUPPRIMER" }`
    - On success: calls `signOut({ redirectTo: "/" })` from `next-auth/react`
    - On error (400): displays inline error « Confirmation incorrecte. »
    - On error (500): displays Sonner toast error « Une erreur est survenue. Veuillez réessayer. »
  - [ ] 2.2 Update `src/app/(dashboard)/settings/page.tsx`:
    - Replace the current basic destructive `<button>` in the "Zone de danger" section with the `DeleteAccountDialog` component
    - Keep the existing sections (Abonnement, Vérification d'identité) as-is

- [ ] **Task 3: Add signOut capability after deletion** (AC: 2)
  - [ ] 3.1 In `delete-account-dialog.tsx`, import `signOut` from `next-auth/react`
  - [ ] 3.2 After successful deletion API response, call `signOut({ redirectTo: "/" })` to invalidate the client-side session and redirect to landing page

- [ ] **Task 4: Add tests for account deletion API** (AC: 2, 3, 4, 5, 8)
  - [ ] 4.1 Create `src/app/api/user/account/route.test.ts`:
    - Test: DELETE without authentication returns 401
    - Test: DELETE with wrong confirmation text returns 400
    - Test: DELETE with "SUPPRIMER" confirmation anonymizes user record (email changed, name changed, fields nulled)
    - Test: DELETE cascades — subscriptions, payments, opportunities, accounts, sessions are all deleted
    - Test: After deletion, the original email no longer exists in DB
    - Test: After deletion, user's opportunities are deleted
    - Test: passwordHash is replaced (cannot re-authenticate with old password)

- [ ] **Task 5: Add component test for deletion dialog** (AC: 1, 7)
  - [ ] 5.1 Create `src/components/features/auth/delete-account-dialog.test.tsx`:
    - Test: renders delete button that opens dialog
    - Test: confirm button is disabled until "SUPPRIMER" is typed
    - Test: typing "SUPPRIMER" enables confirm button
    - Test: successful deletion calls signOut and redirects
    - Test: server error shows error toast

- [ ] **Task 6: Update settings page to use Server Component + Client Component split** (AC: 1, 7)
  - [ ] 6.1 Ensure settings page remains a Server Component that fetches user data and passes it down
  - [ ] 6.2 Ensure `DeleteAccountDialog` is a Client Component (already planned as `"use client"`)
  - [ ] 6.3 Verify the "Zone de danger" section has proper mobile styling (destructive border, clear warning text)

- [ ] **Task 7: Run regression tests** (AC: all)
  - [ ] 7.1 Run full test suite and verify Stories 1.1–1.4 auth flows still work
  - [ ] 7.2 Verify signout, profile view, profile edit, and avatar upload still function correctly
  - [ ] 7.3 Verify middleware still protects `/dashboard` and `/admin` routes

## Dev Notes

### Architecture Compliance

- **Auth.js split config (NON-NEGOTIABLE):**
  - `src/lib/auth.config.ts` — Edge Runtime, used by middleware. **MUST NOT** import Prisma, bcrypt, or any Node.js-only module.
  - `src/lib/auth.ts` — Node.js runtime, has PrismaAdapter + providers. Use `auth()` from this file in Server Components and API routes.
  - `src/middleware.ts` — **DO NOT MODIFY** unless a bug is discovered.

- **JWT session invalidation on deletion:** Auth.js v5 uses JWT sessions (not database sessions by default after the switch from `PrismaAdapter`). When we delete sessions via `prisma.session.deleteMany()`, this handles the case if the adapter is in use. **Critically:** After deletion, the user's JWT still contains their old `id`, but the email is now `deleted_{id}@deleted.ibc` and `passwordHash` is replaced — they cannot re-authenticate. The client-side `signOut()` call clears the JWT cookie. Any subsequent request with the old JWT would find a user with `verificationStatus: REJECTED` and `name: "Compte supprimé"`, which should be handled by middleware in the future. For MVP, the combination of anonymized data + client-side signOut is sufficient.

- **Cascade deletion approach for MVP:** The Prisma schema already defines `onDelete: Cascade` on User relations (Account, Session, Subscription, Payment, VerificationToken). For Opportunity, the `author` relation also has `onDelete: Cascade`. This means deleting all related records + anonymizing the User (rather than deleting the User row itself) preserves referential integrity while "erasing" all PII.

  **Why anonymize instead of hard-delete:**
  1. The User row is referenced by `Opportunity.verifiedById` (from the `Verifier` relation). Even though cascade would delete Opportunities where the user is `authorId`, if the user was a verifier of another user's opportunity, that `verifiedById` would be nullified — destroying audit trails.
  2. Anonymization preserves row existence for future admin analytics (total user count, churn tracking) while fully complying with GDPR data erasure by removing all PII.
  3. It prevents foreign key constraint surprises if more relations are added later.

- **API response format:** Follow architecture pattern:
  - Success: `NextResponse.json({ data: { message: "..." } })`
  - Error: `NextResponse.json({ error: string, code?: string }, { status })`

- **Prisma client:** Always import from `@/generated/prisma/client` — project convention. Use singleton from `@/lib/prisma.ts`.

- **bcryptjs:** Already in `package.json` (v3.0.3). Use for replacing `passwordHash` with a random hash during anonymization.

- **Component architecture:**
  - Settings page: Server Component (fetches user data via Prisma, passes to client components)
  - DeleteAccountDialog: Client Component (`"use client"`) with Dialog/AlertDialog from shadcn/ui

- **Route groups:** Settings page lives in `(dashboard)` route group, which already has auth protection via `layout.tsx`.

- **Zod validation:** Use `z.literal("SUPPRIMER")` for exact match validation — this prevents accidental deletions from typos or API calls without user intent.

### Current State of Files Being Modified

**`src/app/(dashboard)/settings/page.tsx` (today):**
- Contains a basic "Zone de danger" section with a plain `<button>` that says "Supprimer mon compte" but has NO click handler, NO confirmation modal, NO API call
- Also has "Abonnement" section and "Vérification d'identité" section
- **What changes:** Replace the plain `<button>` with the `DeleteAccountDialog` component while keeping other sections intact

**`src/lib/validations.ts` (today):**
- Contains `signupSchema`, `signinSchema`, `profileUpdateSchema`
- **What changes:** Add `accountDeletionSchema` and `AccountDeletionInput` type

**`src/app/api/user/account/route.ts` (NEW):**
- Does not exist yet — this is a new file

**`src/components/features/auth/delete-account-dialog.tsx` (NEW):**
- Does not exist yet — this is a new file

**Prisma schema relations involving User (READ-ONLY, for reference):**
- `User → Account[]` (onDelete: Cascade)
- `User → Session[]` (onDelete: Cascade)
- `User → Subscription[]` (onDelete: Cascade)
- `User → Payment[]` (onDelete: Cascade)
- `User → Opportunity[]` as "Author" (onDelete: Cascade)
- `User → Opportunity[]` as "Verifier" (onDelete: **SET NULL** — no explicit onDelete, but verifiedById is nullable)
- `User → VerificationToken[]` (onDelete: Cascade)

### File Structure & What to Touch

| File | Action | Why |
|------|--------|-----|
| `src/app/api/user/account/route.ts` | **CREATE** | New DELETE endpoint for account deletion |
| `src/components/features/auth/delete-account-dialog.tsx` | **CREATE** | Client component: confirmation dialog for account deletion |
| `src/app/(dashboard)/settings/page.tsx` | **UPDATE** | Replace plain delete button with DeleteAccountDialog |
| `src/lib/validations.ts` | **UPDATE** | Add accountDeletionSchema |
| `src/app/api/user/account/route.test.ts` | **CREATE** | API route tests |
| `src/components/features/auth/delete-account-dialog.test.tsx` | **CREATE** | Component tests |
| `src/lib/auth.config.ts` | **READ-ONLY** | Do not modify |
| `src/lib/auth.ts` | **READ-ONLY** | Do not modify |
| `src/middleware.ts` | **READ-ONLY** | Do not modify |
| `prisma/schema.prisma` | **READ-ONLY** | Schema reference for cascade behavior |

### Technical Requirements

- **Library versions (already installed):**
  - `next-auth` v5 beta (Auth.js)
  - `bcryptjs` v3.0.3
  - `zod` v4.4.3
  - `react-hook-form` v7.75.0 (not needed for this story but present)
  - `sonner` — Toast notifications
  - shadcn/ui components: `Dialog`, `AlertDialog`, `Button`, `Input` (all available)

- **Anonymization strategy (GDPR-compliant):**
  The approach is **anonymization-in-place** rather than hard deletion:
  - `email` → `deleted_{cuid}@deleted.ibc` (preserves uniqueness constraint)
  - `name` → `"Compte supprimé"`
  - `bio`, `phone`, `location`, `country`, `image`, `googleId` → `null`
  - `passwordHash` → bcrypt hash of a random UUID (prevents re-authentication)
  - `emailVerified` → `false`
  - `verificationStatus` → `REJECTED`
  - All related records (Sessions, Accounts, Subscriptions, Payments, VerificationTokens, Opportunities as author) are hard-deleted via explicit `deleteMany` within the transaction

- **Session invalidation:** After anonymization:
  1. Server-side: `prisma.session.deleteMany({ where: { userId } })` invalidates any database-tracked sessions
  2. Client-side: `signOut({ redirectTo: "/" })` from `next-auth/react` clears the JWT cookie and redirects
  - Even if someone intercepts the old JWT, the user data is anonymized and cannot be meaningfully used

- **Opportunity handling:** Per AC3, opportunities authored by the deleted user are **deleted** (cascade). The `verifiedById` field on remaining opportunities where this user was a verifier will be **nullified** (since `verifiedById` is nullable `String?` and there is no explicit cascade). This is correct — the verification status remains on the opportunity, but the verifier reference is cleaned up.

- **Confirmation pattern:** The user must type "SUPPRIMER" exactly. This is validated both client-side (confirm button stays disabled) and server-side (Zod `z.literal`).

- **Testing framework:** Vitest + jsdom + @testing-library/react + jest-dom (already configured from Stories 1.1–1.4). Follow same testing patterns.

### Testing Requirements

- **API route tests (`src/app/api/user/account/route.test.ts`):**
  - Test: DELETE without authentication returns 401
  - Test: DELETE with confirmation "SUPPRIMER" returns 200 with success message
  - Test: DELETE with wrong confirmation (e.g., "delete", "DELETE", "") returns 400
  - Test: After deletion, user's email is `deleted_{id}@deleted.ibc`
  - Test: After deletion, user's name is "Compte supprimé"
  - Test: After deletion, user's PII fields (bio, phone, location, country, image) are null
  - Test: After deletion, user's passwordHash has been changed (bcrypt hash differs)
  - Test: After deletion, related Sessions and Accounts are deleted
  - Test: After deletion, user's Opportunities are deleted
  - Test: After deletion, user's Subscriptions and Payments are deleted

- **Component tests (`src/components/features/auth/delete-account-dialog.test.tsx`):**
  - Test: renders the delete button
  - Test: clicking delete button opens the dialog
  - Test: confirm button is disabled when confirmation text is not "SUPPRIMER"
  - Test: typing "SUPPRIMER" enables the confirm button
  - Test: successful deletion calls API and then signOut
  - Test: API error shows error toast

- **Integration verification:**
  - Settings page renders all three sections (Abonnement, Vérification d'identité, Zone de danger)
  - SignOutButton in sidebar still works
  - Profile page still accessible after story completion (no regressions)

- **Regression tests:**
  - Stories 1.1–1.4 auth flows still work (signup, signin, Google OAuth, signout)
  - Profile edit and avatar upload still work
  - Rate limiting on auth routes still works

### Potential Pitfalls & Regression Prevention

- **DO NOT** hard-delete the User row — anonymize it instead. Hard deletion would break `Opportunity.verifiedById` references where this user was a verifier, and any future relations.
- **DO NOT** modify `auth.config.ts` or `middleware.ts` for this story.
- **DO NOT** add admin suspend/reactivate functionality — that belongs to Story 6.5.
- **DO NOT** modify the `Subscription` or `Payment` Prisma models — they are already correct with cascade deletes.
- **DO NOT** change the email anonymization pattern (`deleted_{id}@deleted.ibc`) — it must be unique and not match any real email format.
- **DO NOT** forget to delete Sessions and Accounts — without this, an OAuth session could potentially still authenticate against the anonymized user.
- **DO NOT** use `prisma.user.delete()` — use `prisma.user.update()` with anonymized data instead.
- **DO NOT** forget the `$transaction` wrapper — all deletes + anonymization must be atomic. If any part fails, the whole operation rolls back.
- **DO NOT** add rate limiting to the deletion endpoint in this story — that belongs to Story 1.6.
- **DO NOT** modify `next.config.ts` or deployment configuration — belongs to Story 1.7.
- **Email uniqueness constraint:** The `email` field on User is `@unique`. The anonymized email `deleted_{id}@deleted.ibc` preserves uniqueness because each deleted user has a different `id`.
- **Opportunity.verifiedById nullable:** If the deleted user verified some opportunities, their `verifiedById` will be `null` after the user is anonymized (not cascade-set-nulled since the User row is kept). This is acceptable — the verification status on the Opportunity remains, but the verifier reference becomes anonymous.
- **Next.js 16 cache corruption:** If dev server throws cryptic errors after changes, run `rm -rf .next` and restart.

### Scope Boundaries (What NOT to do)

- **Do NOT** implement admin account management (suspend/reactivate) — belongs to Story 6.5
- **Do NOT** add rate limiting — belongs to Story 1.6
- **Do NOT** add security headers (CSP, X-Frame-Options) — belongs to Story 1.6
- **Do NOT** modify `next.config.ts` for standalone output — belongs to Story 1.7
- **Do NOT** modify the `Subscription` or `Payment` models — they already have cascade deletes
- **Do NOT** add email notification on account deletion — out of scope for MVP
- **Do NOT** implement scheduled/grace-period deletion (e.g., "restore within 30 days") — GDPR immediate erasure is the requirement
- **Do NOT** add a `/api/admin/users/[id]` endpoint for admin actions — belongs to Story 6.5
- **Do NOT** implement password confirmation before deletion — typing "SUPPRIMER" is the confirmation mechanism per AC

### Environment Variables

No new environment variables required. Existing variables used:
```
DATABASE_URL=               # Already configured (SQLite in dev, PostgreSQL in prod)
NEXTAUTH_URL=               # Already configured
NEXTAUTH_SECRET=            # Already configured
```

### Previous Story Intelligence

**From Story 1.1 (Inscription via Google OAuth):**
- NextAuth v5 config merge: use single-object spread `{ ...authConfig, adapter: ... }` — NOT two-argument `NextAuth(authConfig, { ... })`.
- `src/lib/oauth-errors.ts` was created for French OAuth error mapping.
- `image` field was renamed from `avatarUrl` in Prisma schema — all references use `image`.

**From Story 1.2 (Inscription avec Email et Mot de Passe):**
- React Hook Form + Zod pattern: `useForm<SignupInput>({ resolver: zodResolver(signupSchema), mode: "onBlur" })`.
- Rate limiting pattern established in `src/lib/rate-limit.ts`.
- Vitest + jsdom + `@testing-library/react/jest-dom` testing stack is working.
- `vi.hoisted()` pattern for mock factories.

**From Story 1.3 (Connexion, Session et Rôles):**
- SignOutButton client component pattern: `signOut({ redirectTo: "/" })` from `next-auth/react`.
- All API routes follow `{ data: ... }` success and `{ error: ... }` error pattern.
- French error messages pattern: exact messages like « Email ou mot de passe incorrect. ».

**From Story 1.4 (Gestion du Profil Utilisateur):**
- Settings page at `src/app/(dashboard)/settings/page.tsx` already has a "Zone de danger" section with a plain `<button>` that needs to be replaced.
- The "Zone de danger" section already shows warning text: « Supprimer ton compte est irréversible. Toutes tes données seront perdues. »
- Profile page at `src/app/(dashboard)/profile/page.tsx` has full RHF+Zod form, avatar upload, tier badge — do not modify.
- `src/lib/validations.ts` pattern for adding schemas alongside existing ones.
- shadcn/ui `Dialog` and `AlertDialog` components need to be checked for availability. If not installed, install via `npx shadcn@latest add alert-dialog`.

### Git Intelligence

Recent commits show established patterns:
- `feat(auth): Story 1.X — [description]` — commit message pattern
- Story file creation commit: `bmad-create-story: Story 1.X — [description]`
- Status update commit: `chore: mark Story 1.X as done in sprint-status`
- Code review fix: `fix(review): [description] — Story 1.X CR fix`

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 1 / Story 1.5 — Suppression de Compte RGPD]
- [Source: `_bmad-output/planning-artifacts/prd.md` — FR4 (Suppression de compte RGPD), NFR-S8 (Pas de données sensibles dans les logs)]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — Auth Architecture (JWT sessions, split config), Prisma Data Models (User, Account, Session, Opportunity cascade), API Patterns, Security Measures]
- [Source: `prisma/schema.prisma` — User model with all fields, cascade delete relations, VerificationStatus enum]
- [Source: `src/lib/auth.ts` — Full NextAuth instance with PrismaAdapter (READ-ONLY)]
- [Source: `src/lib/auth.config.ts` — Edge-compatible auth config (READ-ONLY)]
- [Source: `src/middleware.ts` — Auth.js route protection (READ-ONLY)]
- [Source: `src/lib/validations.ts` — Existing Zod schemas pattern]
- [Source: `src/app/(dashboard)/settings/page.tsx` — Current settings page with "Zone de danger" placeholder]
- [Source: `src/components/auth/sign-out-button.tsx` — Existing signOut pattern]

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List