# Story 1.4: Gestion du Profil Utilisateur

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a logged-in member,
I want to view and edit my profile (name, bio, phone, location, country) and upload an avatar,
so that I can personalize my presence on IBC and improve my matching with opportunities.

## Acceptance Criteria

1. **Profile view displays all user information**
   - **Given** a logged-in member on `/profile`
   - **When** they view their profile page
   - **Then** they see their current information: name, email, avatar, bio, phone, location, country, tier, and registration date

2. **Profile edit saves changes with confirmation**
   - **Given** a logged-in member on `/profile/edit` (or `/profile` with inline edit mode)
   - **When** they modify their name, bio, phone, location, or country and save
   - **Then** the changes are persisted in the database and a success toast appears: « Profil mis à jour avec succès. »

3. **Phone validation rejects invalid numbers**
   - **Given** a member editing their profile
   - **When** they enter an invalid phone number format
   - **Then** inline Zod validation shows the error: « Veuillez saisir un numéro de téléphone valide. »

4. **Country field supports UEMOA expansion**
   - **Given** a member updating their profile
   - **When** they select or type a country
   - **Then** the country field accepts UEMOA country codes (CI, SN, CM, GA, etc.) and is ready for future expansion

5. **Avatar upload updates profile image**
   - **Given** a logged-in member on `/profile`
   - **When** they upload a new avatar image
   - **Then** the image is stored and their profile displays the new avatar immediately
   - **And** old avatar is cleaned up (or overwritten in storage)

6. **Email field is read-only**
   - **Given** a member viewing their profile
   - **When** they see the email field
   - **Then** the field is disabled/disabled and clearly marked as non-editable

7. **Profile view shows tier badge and verification status**
   - **Given** a logged-in member on `/profile`
   - **When** they view their profile
   - **Then** their current tier (Affranchis / Grands Frères / Boss) and verification status are displayed

8. **Profile page is mobile-responsive with proper UX patterns**
   - **Given** a member viewing their profile on mobile
   - **When** the page renders
   - **Then** the layout adapts to mobile viewport (320px+), form inputs are touch-friendly (≥44px targets), and validation appears inline (UX-DR14, UX-DR24, UX-DR25)

## Tasks / Subtasks

- [ ] **Task 1: Create profile update Zod schema and validation** (AC: 2, 3, 4)
  - [ ] 1.1 Add `profileUpdateSchema` to `src/lib/validations.ts` with Zod validation for:
    - `name`: `z.string().min(2, "Le nom doit contenir au moins 2 caractères")`
    - `bio`: `z.string().max(500, "La bio ne doit pas dépasser 500 caractères").optional().nullable()` with `or(z.literal(""))` to allow empty string clearing
    - `phone`: `z.string().regex(/^\+?\d[\d\s.-]{6,}$/, "Veuillez saisir un numéro de téléphone valide.").optional().nullable().or(z.literal(""))` — accepts international format with spaces/dots
    - `location`: `z.string().max(100).optional().nullable().or(z.literal(""))`
    - `country`: `z.string().optional().nullable().or(z.literal(""))` — UEMOA expansion-ready, no strict enum yet
  - [ ] 1.2 Export `ProfileUpdateInput` type from the schema
  - [ ] 1.3 Add a `UEMOA_COUNTRIES` constant array (CI, SN, CM, GA, BF, BI, ML, NE, TG, GN, BJ) for future Select dropdown population

- [ ] **Task 2: Rewrite `/api/user/profile` route with proper validation** (AC: 2, 3, 4, 6)
  - [ ] 2.1 Update `src/app/api/user/profile/route.ts`:
    - Add `GET` handler that returns user profile data (name, email, bio, phone, location, country, tier, role, image, verificationStatus, createdAt) — exclude `passwordHash`
    - Rewrite `POST` handler to use `profileUpdateSchema` validation with Zod
    - Validate input with `profileUpdateSchema.safeParse()` — return 400 with field-level errors if invalid
    - Use `prisma.user.update()` with validated data (not spread operator with `undefined` conditionals)
    - Return `{ data: { ...userFields } }` on success (architecture pattern)
    - Return `{ error: "Non autorisé" }` with 401 if unauthenticated
    - Return `{ error: "Erreur interne" }` with 500 on unexpected errors
  - [ ] 2.2 Ensure empty strings correctly clear nullable fields (bio, phone, location, country) — convert `""` to `null` before Prisma update

- [ ] **Task 3: Create `ProfileEditForm` client component** (AC: 2, 3, 4, 6, 8)
  - [ ] 3.1 Create `src/components/features/auth/profile-edit-form.tsx` — `"use client"` component using React Hook Form + `zodResolver(profileUpdateSchema)`
  - [ ] 3.2 Form fields:
    - Name (`Input`) — required, min 2 chars
    - Email — disabled/readonly with muted styling and helper text « L'email ne peut pas être modifié »
    - Bio (`<textarea>` styled with Tailwind, or shadcn Textarea if added) — max 500 chars, optional, character counter below
    - Phone (`Input type="tel"`) — optional, with placeholder « +225 XX XX XX XX »
    - Location (`Input`) — optional, with placeholder « Abidjan, Côte d'Ivoire »
    - Country (`Select` from shadcn/ui) — optional, populated from `UEMOA_COUNTRIES` constant with an « Autre » option; UEMOA expansion-ready
  - [ ] 3.3 Submit handler: `mutate` via `fetch("/api/user/profile", { method: "POST", ... })`
    - On success: show Sonner toast « Profil mis à jour avec succès. »
    - On validation error (400): display field-level errors inline via RHF
    - On auth error (401): redirect to `/auth/signin`
    - On server error (500): show Sonner toast error « Une erreur est survenue »
  - [ ] 3.4 Loading state: disable submit button and show spinner during submission
  - [ ] 3.5 Mobile-responsive: full-width inputs, ≥44px touch targets, proper `inputMode` attributes (tel for phone)

- [ ] **Task 4: Create avatar upload component and API endpoint** (AC: 5)
  - [ ] 4.1 Create `src/app/api/user/avatar/route.ts`:
    - `POST` handler accepts `FormData` with avatar image file
    - Validate file: max 2MB, accept only `image/jpeg`, `image/png`, `image/webp`
    - Validate auth: return 401 if not authenticated
    - Upload to local storage `public/avatars/{userId}-{timestamp}.{ext}` (Cloudflare R2 integration is for Epic 3; use local `public/` for now as a pragmatic MVP approach)
    - Update `User.image` field via Prisma with the new avatar URL path (`/avatars/{userId}-{timestamp}.{ext}`)
    - Delete previous avatar file if it exists and is not a Google OAuth URL
    - Return `{ data: { image: newAvatarPath } }` on success
  - [ ] 4.2 Create `src/components/features/auth/avatar-upload.tsx` — `"use client"` component:
    - Circular `<Avatar>` displaying current `user.image` or initials fallback
    - Click or camera icon overlay triggers hidden `<input type="file" accept="image/*">`
    - Upload on file selection with loading spinner on avatar during upload
    - Preview new image immediately after successful upload
    - Error handling: file too large, wrong type, network error — show Sonner toast
  - [ ] 4.3 Avatar size: display 96px (desktop) / 72px (mobile), crop/resize to 256x256px minimum — use `object-cover` CSS for display; actual image resize can be deferred to Epic 3 (document upload story) when sharp/image processing is added

- [ ] **Task 5: Rewrite `/profile` page with profile view + edit** (AC: 1, 2, 7, 8)
  - [ ] 5.1 Rewrite `src/app/(dashboard)/profile/page.tsx` as a Server Component that:
    - Calls `auth()` and `prisma.user.findUnique()` to get current user data
    - Renders a profile header card with: `Avatar` (or `AvatarUpload` for edit mode), name, tier badge, verification status, "Membre depuis {createdAt}" date
    - Uses IBC teal/amber Badge component for tier display:
      - AFFRANCHI → teal badge « Les Affranchis »
      - GRAND_FRERE → amber badge « Les Grands Frères »
      - BOSS → gradient/gold badge « Les Boss »
    - Passes user data to `ProfileEditForm` client component
  - [ ] 5.2 Use shadcn/ui `Card`, `CardHeader`, `CardContent` for the profile card layout
  - [ ] 5.3 Layout follows UX-DR33: header card (avatar + tier), form fields below, consistent with dashboard layout
  - [ ] 5.4 Form section uses `Separator` between sections if needed for visual grouping

- [ ] **Task 6: Add tests for profile API and form** (AC: 1–8)
  - [ ] 6.1 Create `src/app/api/user/profile/route.test.ts`:
    - Test: GET returns user profile data (excluding passwordHash)
    - Test: POST with valid data updates user and returns 200
    - Test: POST with invalid phone returns 400 with French error message
    - Test: POST with empty string for nullable field clears it (converts to null)
    - Test: POST without auth returns 401
    - Test: POST with name too short returns 400
  - [ ] 6.2 Create `src/app/api/user/avatar/route.test.ts`:
    - Test: POST without auth returns 401
    - Test: POST with valid image file returns 200 with image path
    - Test: POST with file too large returns 400
    - Test: POST with invalid file type returns 400
  - [ ] 6.3 Create `src/components/features/auth/profile-edit-form.test.tsx`:
    - Test: form renders with user data pre-filled
    - Test: Zod validation shows inline error for invalid phone
    - Test: successful submit calls API and shows toast
    - Test: server error shows error toast
  - [ ] 6.4 Run all tests and verify no regressions in Stories 1.1–1.3

## Dev Notes

### Architecture Compliance

- **Auth.js split config (NON-NEGOTIABLE):**
  - `src/lib/auth.config.ts` — Edge Runtime, used by middleware. **MUST NOT** import Prisma, bcrypt, or any Node.js-only module.
  - `src/lib/auth.ts` — Node.js runtime, has PrismaAdapter + providers. Use `auth()` from this file in Server Components and API routes.
  - `src/middleware.ts` — **DO NOT MODIFY** unless a bug is discovered.

- **JWT session with custom claims:** `id`, `tier`, `role` are embedded in the JWT token. The `session` callback in `auth.config.ts` adds these to `session.user`. After profile update, the session **will not automatically reflect** name/bio/phone changes because these fields are NOT in the JWT. Only `id`, `tier`, `role` are in the JWT. This is correct — the profile page fetches fresh data from the DB via Server Component, not from the session.

- **API response format:** Follow architecture pattern:
  - Success: `NextResponse.json({ data: T })`
  - Error: `NextResponse.json({ error: string, code?: string }, { status })`

- **Prisma import:** Always import from `@/generated/prisma/client` — project convention.

- **Prisma client:** Use singleton from `@/lib/prisma.ts` — `import { prisma } from "@/lib/prisma"`.

- **Form handling:** React Hook Form + Zod (`src/lib/validations.ts`) — consistent with Stories 1.2 and 1.3.

- **Component architecture:**
  - Profile page: Server Component (fetches data via Prisma)
  - ProfileEditForm: Client Component (`"use client"`) with RHF+Zod
  - AvatarUpload: Client Component (`"use client"`) with file input

- **Route groups:** Profile page lives in `(dashboard)` route group, which already has auth protection via `layout.tsx`.

### Current State of Files Being Modified

**`src/app/(dashboard)/profile/page.tsx` (today):** A basic Server Component that fetches the user and renders a raw HTML form with `formAction="/api/user/profile"`. It does NOT use RHF+Zod, has no avatar upload, no loading state, no validation feedback, no toast confirmation, and no tier badge/verification display. **Full rewrite required.**

**`src/app/api/user/profile/route.ts` (today):** A basic POST handler that:
- Uses spread operator with `...(name && { name })` — this means empty string name gets silently dropped
- No Zod validation at all
- Returns `{ success: true }` instead of architecture-standard `{ data: ... }`
- No GET handler (profile data is fetched in the Server Component directly via Prisma)
- No proper error field mapping for Zod → client

**What changes:** Both files need significant improvements. The page needs a complete UI overhaul. The API needs Zod validation, proper response format, and a GET handler. Avatar upload is entirely new.

**`src/app/(dashboard)/settings/page.tsx` (today):** Contains subscription, verification, and danger zone sections. Profile editing was previously in `/profile`. Keep `/profile` as the profile edit page and `/settings` as the settings page (they are separate pages — do NOT merge them).

**`src/lib/validations.ts` (today):** Contains `signupSchema` and `signinSchema`. Add `profileUpdateSchema` here alongside them.

**`src/components/ui/avatar.tsx` (today):** Already has `Avatar`, `AvatarImage`, `AvatarFallback`, `AvatarBadge` — built on `@base-ui/react/avatar`. Use these components directly for avatar display.

**`src/components/ui/badge.tsx`, `card.tsx`, `input.tsx`, `label.tsx`, `select.tsx`, `separator.tsx`, `sonner.tsx`** — all available for building the profile UI.

### File Structure & What to Touch

| File | Action | Why |
|------|--------|-----|
| `src/app/(dashboard)/profile/page.tsx` | **UPDATE/REWRITE** | Full rewrite: profile header card + ProfileEditForm component with avatar upload |
| `src/app/api/user/profile/route.ts` | **UPDATE/REWRITE** | Add GET handler, rewrite POST with Zod validation, proper response format |
| `src/app/api/user/avatar/route.ts` | **CREATE** | New avatar upload endpoint |
| `src/components/features/auth/profile-edit-form.tsx` | **CREATE** | Client component: RHF+Zod profile edit form |
| `src/components/features/auth/avatar-upload.tsx` | **CREATE** | Client component: avatar upload with preview |
| `src/lib/validations.ts` | **UPDATE** | Add `profileUpdateSchema` and `ProfileUpdateInput` type |
| `src/lib/validations.test.ts` | **CREATE** or **UPDATE** | Schema validation tests for profile update |
| `src/app/api/user/profile/route.test.ts` | **CREATE** | API route tests |
| `src/app/api/user/avatar/route.test.ts` | **CREATE** | Avatar upload tests |
| `src/components/features/auth/profile-edit-form.test.tsx` | **CREATE** | Component tests |
| `src/app/(dashboard)/layout.tsx` | **READ-ONLY** | Verify profile nav link exists (`/profile`, label "Mon profil") |
| `src/lib/auth.config.ts` | **READ-ONLY** | Do not modify |
| `src/lib/auth.ts` | **READ-ONLY** | Do not modify |
| `src/middleware.ts` | **READ-ONLY** | Do not modify |
| `prisma/schema.prisma` | **READ-ONLY** | User model already has all required fields (name, bio, phone, location, country, image, tier, role, verificationStatus, createdAt) |
| `public/avatars/` | **CREATE** | Directory for local avatar storage (create `.gitkeep`) |

### Technical Requirements

- **Library versions (already installed):**
  - `react-hook-form` v7.75.0
  - `@hookform/resolvers` v5.2.2
  - `zod` v4.4.3
  - `next-auth` v5 beta (Auth.js)
  - `@base-ui/react` — Avatar primitives (already in `src/components/ui/avatar.tsx`)
  - `sonner` — Toast notifications (already configured via `src/components/ui/sonner.tsx`)

- **Phone validation regex:** `/^\+?\d[\d\s.-]{6,}$/` — accepts international format, allows spaces, dots, dashes. Valid examples: `+225 07 08 09 10 11`, `+33612345678`, `0022577889900`. Invalid: `abc`, `+`, `123`.

- **Country field:** For MVP, use a `Select` with predefined UEMOA country options but allow an « Autre » option that shows a free-text input. This provides structure without blocking future expansion. The `country` field in Prisma is `String?` (nullable), so any value is accepted — we add UX guidance, not database constraints.

- **Avatar storage approach (MVP):**
  - Store avatar files in `public/avatars/` directory with naming pattern `{userId}-{timestamp}.{ext}`
  - Store the URL path in `User.image` field (already exists in schema as `String?`)
  - For Google OAuth users, `User.image` already contains the Google profile picture URL — the avatar upload will overwrite it
  - `next.config.ts` will need `images.remotePatterns` for Google profile pictures (already configured or needs configuration)
  - Cloudflare R2 integration for production file storage belongs to Epic 3 (Story 3.2: documents upload). For now, local `public/` storage is sufficient.
  - Maximum file size: 2MB. Accepted types: `image/jpeg`, `image/png`, `image/webp`

- **Form submission pattern (consistent with Stories 1.2/1.3):**
  - Client component with `useForm<ProfileUpdateInput>({ resolver: zodResolver(profileUpdateSchema), mode: "onBlur" })`
  - `fetch("/api/user/profile", { method: "POST", body: JSON.stringify(data) })`
  - On success: Sonner toast « Profil mis à jour avec succès. »
  - On validation error (400): RHF field-level errors from Zod `details`
  - On auth error (401): redirect to `/auth/signin`
  - On server error (500): Sonner toast error « Une erreur est survenue »

- **Empty string to null conversion for nullable fields:**
  In the API route, before `prisma.user.update()`, convert empty strings to `null` for nullable fields:
  ```typescript
  const sanitizedData = {
    name: data.name,
    bio: data.bio === "" ? null : data.bio,
    phone: data.phone === "" ? null : data.phone,
    location: data.location === "" ? null : data.location,
    country: data.country === "" ? null : data.country,
  };
  ```
  This ensures that clearing a field actually sets it to `null` in the database rather than leaving an empty string.

- **Testing framework:** Vitest + jsdom + @testing-library/react + jest-dom (already configured from Stories 1.2/1.3). Follow same testing patterns.

### Testing Requirements

- **API route tests (`src/app/api/user/profile/route.test.ts`):**
  - Test: authenticated GET returns user profile data (200)
  - Test: GET response excludes `passwordHash`
  - Test: authenticated POST with valid data updates user (200)
  - Test: POST with invalid phone format returns 400 with French error message
  - Test: POST with empty string for nullable field correctly clears it to null
  - Test: POST without authentication returns 401
  - Test: POST with name shorter than 2 chars returns 400

- **Avatar route tests (`src/app/api/user/avatar/route.test.ts`):**
  - Test: POST without authentication returns 401
  - Test: POST with valid image returns 200 with image path
  - Test: POST with file exceeding 2MB returns 400
  - Test: POST with invalid file type (e.g., .pdf) returns 400

- **Component tests (`src/components/features/auth/profile-edit-form.test.tsx`):**
  - Test: form renders with user data pre-filled
  - Test: invalid phone shows inline Zod error message on blur
  - Test: successful submission calls API and shows success toast
  - Test: server error (500) shows error toast
  - Test: name field enforces minimum 2 characters

- **Integration test:**
  - Test: full profile page renders (Server Component + client form) with avatar, name, tier badge

- **Regression tests:**
  - Stories 1.1–1.3 auth flows still work (signin, signup, Google OAuth, signout, rate limiting)

### Potential Pitfalls & Regression Prevention

- **DO NOT** add Subscription-tier upgrade/change to the profile page — that belongs to `/settings` and Epic 2.
- **DO NOT** implement account deletion (Story 1.5) or email change — out of scope.
- **DO NOT** import `PrismaAdapter`, `prisma`, or `bcrypt` into `auth.config.ts` — Edge Runtime restriction.
- **DO NOT** modify `src/lib/auth.ts` Credentials provider or JWT/session callbacks — they already work correctly.
- **DO NOT** modify `src/middleware.ts` unless a bug is discovered during testing.
- **DO NOT** put avatar upload logic in the same `POST /api/user/profile` route — keep it separate in `/api/user/avatar` for clean separation of concerns and to handle `multipart/form-data` properly.
- **DO NOT** add `image` to the JWT session token — only `id`, `tier`, `role` belong there. Profile data (name, image, bio, etc.) is fetched from the database, not from the session.
- **DO NOT** use `FormData` for profile text edits — use JSON body (consistent with Stories 1.2/1.3 API patterns). Only avatar upload uses `FormData`.
- **The `User.image` field** already exists in Prisma and is populated by Google OAuth for Google users. When a user uploads a custom avatar, it replaces the Google URL. When displaying the avatar, always use `User.image` from the database as the primary source.
- **Empty string vs null for nullable fields:** Prisma schema has `bio`, `phone`, `location`, `country` as `String?` (nullable). The profile edit form must distinguish between "not changed" (don't update), "cleared" (set to null), and "set to a value" (update). The simplest approach: always send all fields, convert empty strings to null in the API.
- **Profile page should work without avatar:** If `user.image` is null, show initials fallback via `AvatarFallback` component (first letter of name).
- **Next.js 16 cache corruption:** If the dev server throws cryptic errors after changes, run `rm -rf .next` and restart.

### Scope Boundaries (What NOT to do)

- **Do NOT** implement account deletion — belongs to Story 1.5 (RGPD)
- **Do NOT** add security headers (CSP, X-Frame-Options) — belongs to Story 1.6
- **Do NOT** modify `next.config.ts` for standalone output — belongs to Story 1.7
- **Do NOT** remove Stripe/CinetPay files or dependencies — belongs to Story 2.1
- **Do NOT** build Subscription tier selection/upgrade — belongs to Epic 2
- **Do NOT** implement tags/profile matching — belongs to Story 4.2
- **Do NOT** add WhatsApp CTA to profile — belongs to Story 4.1
- **Do NOT** add reviews display to profile — belongs to Story 5.3
- **Do NOT** implement email verification/change — out of scope for this story
- **Do NOT** implement admin user management — belongs to Story 6.5
- **Do NOT** set up Cloudflare R2 storage for production — use local `public/avatars/` for now; R2 belongs to Story 3.2

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
- `src/lib/oauth-errors.ts` was created for French OAuth error mapping — reuse pattern for any profile-related error messages.
- `image` field was renamed from `avatarUrl` in Prisma schema — all references use `image`.

**From Story 1.2 (Inscription avec Email et Mot de Passe):**
- React Hook Form + Zod pattern: `useForm<SignupInput>({ resolver: zodResolver(signupSchema), mode: "onBlur" })`.
- Rate limiting pattern established in `src/lib/rate-limit.ts` with `createRateLimiter()` factory.
- Vitest + jsdom + `@testing-library/react/jest-dom` testing stack is set up and working.
- `vi.hoisted()` pattern for mock factories to avoid Vitest hoisting issues.
- The signup route removed Subscription creation (P0 blocker). Do not reintroduce it.

**From Story 1.3 (Connexion, Session et Rôles):**
- Signout pattern: `SignOutButton` client component using `signOut({ redirectTo: "/" })` from `next-auth/react`.
- Rate limiter reuse: `signinRateLimiter` was added to `src/lib/rate-limit.ts`.
- Fixed `isPublic` route detection bug in `auth.config.ts` — `startsWith("/")` matching everything.
- All API routes follow `{ data: ... }` success and `{ error: ... }` error pattern.
- French error messages pattern: exact messages like « Email ou mot de passe incorrect. », « Trop de tentatives. Réessayez dans une minute. »

### Git Intelligence

Recent commits show established patterns:
- `feat(auth): Story 1.X — [description]` — commit message pattern
- Story file creation commit: `bmad-create-story: Story 1.X — [description]`
- Status update commit: `chore: mark Story 1.X as done in sprint-status`
- Code review fix: `fix(review): [description] — Story 1.X CR fix`

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 1 / Story 1.4 — Gestion du Profil Utilisateur]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — API Response Format, Form Handling (RHF + Zod), Prisma Patterns, Component Architecture (Server/Client split), Route Groups]
- [Source: `_bmad-output/planning-artifacts/prd.md` — FR3 (Consultation et modification du profil), NFR-A1 (WCAG 2.1 AA), NFR-A2 (Dark mode), NFR-A3 (French UI), NFR-P2 (API < 500ms)]
- [Source: `prisma/schema.prisma` — User model with id, email, name, bio, image, phone, location, country, tier, role, verificationStatus, createdAt, updatedAt]
- [Source: `src/lib/validations.ts` — Existing signupSchema and signinSchema patterns]
- [Source: `src/components/ui/avatar.tsx` — Base UI Avatar with AvatarImage, AvatarFallback, AvatarBadge]
- [Source: `src/components/ui/card.tsx` — Card, CardHeader, CardContent components]
- [Source: `src/app/(dashboard)/profile/page.tsx` — Current basic profile page to rewrite]
- [Source: `src/app/api/user/profile/route.ts` — Current basic POST handler to rewrite]
- [Source: `src/app/(dashboard)/settings/page.tsx` — Settings page (separate, not to merge with profile)]
- [Source: `src/lib/auth.ts` — Auth instance with session callbacks (READ-ONLY)]
- [Source: `src/lib/auth.config.ts` — Edge auth config with authorized callback (READ-ONLY)]

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List