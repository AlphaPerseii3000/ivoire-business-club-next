---
Story: "3.1"
StoryKey: "3-1-creation-et-soumission-dopportunite"
Title: "Création et Soumission d'Opportunité"
Status: ready-for-dev
Priority: "P0"
Epic: "Epic 3 — Marketplace d'Opportunités et Vérification"
FRs: ["FR15", "FR16", "FR22"]
NFRs: ["NFR-A1", "NFR-A3", "NFR-S5", "NFR-S8"]
UXDRs: ["UX-DR14", "UX-DR17"]
Created: "2026-05-15"
---

# Story 3.1: Création et Soumission d'Opportunité

Status: ready-for-dev

## Story

As a porteur de projet (member),
I want to create and submit an opportunity with basic info,
so that I can propose it to the IBC community.

## Acceptance Criteria

1. **Member can create an opportunity via form**
   - Given a member connected on `/dashboard/opportunities/new`,
   - When they fill the form (title, description, category: Immobilier/Business/Investissement/Partenariat, amount) and submit,
   - Then an opportunity is created in the DB with `verificationStatus = PENDING` (FR16) and `authorId` linked to the member.

2. **High-value deals flagged for double verification**
   - Given a member submitting an opportunity,
   - When the amount exceeds 50,000 €,
   - Then `requiresDoubleVerification = true` is set automatically (FR22).

3. **Mobile-first form UX**
   - Given a member on mobile,
   - When they fill the form,
   - Then the form is single-column, fields have clear French labels, Zod validation displays errors inline (UX-DR14, NFR-A3).

4. **Success feedback and redirect**
   - Given an opportunity created successfully,
   - When it is submitted,
   - Then a toast displays: "Deal soumis avec succès. Notre équipe le vérifie sous 48h."
   - And the member is redirected to `/dashboard/opportunities`.

## Tasks / Subtasks

- [ ] Add `requiresDoubleVerification` field to Prisma schema and run migration
  - [ ] Add `requiresDoubleVerification Boolean @default(false)` to `Opportunity` model in `prisma/schema.prisma`
  - [ ] Run `npx prisma migrate dev --name add-requires-double-verification`
  - [ ] Run `npx prisma generate`

- [ ] Create opportunity Zod validation schema
  - [ ] Add opportunity validation schema to `src/lib/validations.ts`:
    - `title`: string min 3 max 200
    - `description`: string min 10 max 5000
    - `category`: enum_IMMOblier|Business|Investissement|Partenariat
    - `amount`: number positive, optional (nullable), if provided > 50000 sets `requiresDoubleVerification`

- [ ] Create API route POST `/api/opportunities`
  - [ ] Create `src/app/api/opportunities/route.ts`
  - [ ] Validate session (auth), verify role is MEMBER or ADMIN
  - [ ] Parse body with Zod schema
  - [ ] Create Opportunity via Prisma with `verificationStatus: "PENDING"`, `authorId: session.user.id`
  - [ ] Set `requiresDoubleVerification: true` when `amount > 50000`
  - [ ] Return 201 with created opportunity

- [ ] Create dashboard layout and opportunities page
  - [ ] Create `src/app/(dashboard)/dashboard/opportunities/page.tsx` — list page (redirect target, can be placeholder with empty state for now)
  - [ ] Create `src/app/(dashboard)/dashboard/opportunities/new/page.tsx` — creation form page
  - [ ] Ensure `(dashboard)` route group uses auth guard from existing middleware

- [ ] Build the opportunity creation form
  - [ ] Create `src/components/opportunity-create-form.tsx` as a client component
  - [ ] Use React Hook Form + Zod resolver with the opportunity schema
  - [ ] Single-column layout, French labels, proper spacing
  - [ ] Fields: title (input), description (textarea), category (select with 4 options), amount (number input, optional)
  - [ ] Inline validation errors in French
  - [ ] Submit button with loading state
  - [ ] On success: show toast "Deal soumis avec succès. Notre équipe le vérifie sous 48h." and redirect to `/dashboard/opportunities`
  - [ ] On error: show error toast with message

- [ ] Verify existing OpportunityCategory enum includes all 4 categories
  - [ ] Check `prisma/schema.prisma` for `OpportunityCategory` enum
  - [ ] Ensure it has: `Immobilier`, `Business`, `Investissement`, `Partenariat`

## Dev Agent Record

**Agent Model:** {{agent_model_name_version}}
**Date:** {{date}}
**Decision Log:** {{decision_log}}

### File List

{{file_list}}

### Change Summary

{{change_summary}}

### Review Findings

{{review_findings}}

## Notes

- The Prisma `Opportunity` model already exists (line 150 in schema.prisma) but is missing `requiresDoubleVerification`.
- The `src/app/(dashboard)/` directory structure exists for profile/dashboard routes from Epic 1-2; new pages go under the existing `(dashboard)` route group.
- This story does NOT include document upload (that's Story 3.2) or admin kanban (Story 3.3).
- Category select should use lowercase option values matching the Prisma enum exactly.