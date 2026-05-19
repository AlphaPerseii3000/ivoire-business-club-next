---
stepsCompleted:
  - step-01-init
  - step-02-context
  - step-03-starter
  - step-04-decisions
  - step-05-patterns
  - step-06-structure
  - step-07-validation
  - step-08-complete
inputDocuments:
  - product-brief.md
  - prd.md
  - ux-spec.md
  - technical-feasibility-ibc-2026-05-12.md
  - domain-research-2026-05-12-ibc-deep-dive.md
  - prisma/schema.prisma
  - src/lib/auth.config.ts
  - src/lib/auth.ts
  - src/middleware.ts
  - next.config.ts
  - package.json
workflowType: architecture
project_name: ibc
user_name: Alphaperseii
status: complete
completedAt: '2026-05-12'
---

# Architecture Decision Document — IBC (Ivoire Business Club)

_This document was built collaboratively through the BMAD architecture workflow. It serves as the single source of truth for all technical decisions, ensuring consistent implementation across AI agents._

---

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

The PRD defines 45 Functional Requirements (FR1–FR45) organized into 7 categories:

| Category | Count | Key Architectural Impact |
|----------|-------|--------------------------|
| Auth & Users (FR1–FR7) | 7 | Dual auth (OAuth + credentials), role-based access, JWT sessions |
| Tiers & Subscriptions (FR8–FR14) | 7 | Bank-transfer payment flow, manual admin validation, status lifecycle |
| Marketplace (FR15–FR23) | 9 | Document upload, verification workflow, tier-based visibility |
| Networking & Matching (FR24–FR30) | 7 | Tag-based matching, WhatsApp deep links, soft-commitment |
| Reviews & Reputation (FR31–FR34) | 4 | Bidirectional review system, score calculation, badge automation |
| Admin & Back-office (FR35–FR40) | 6 | Kanban UI, audit logs, metrics dashboard |
| Landing & Content (FR41–FR45) | 5 | Teaser deals, tier comparison, static success wall |

**Non-Functional Requirements:**

| Category | Key Requirements |
|----------|-----------------|
| Performance | Landing < 2s on 3G, API p95 < 500ms, Auth < 300ms, standalone build < 100MB |
| Security | HTTPS/HSTS, bcrypt cost ≥10, rate limiting, CSRF, CSP headers, audit trails |
| Scalability | 500 concurrent users Phase 1, 2,000 users without rework, PostgreSQL in prod |
| Accessibility | WCAG 2.1 AA, dark mode, French non-technical language |
| Deployment | Standalone output, PM2 cluster, Nginx reverse proxy, SSL Let's Encrypt |
| Integration | WhatsApp deep links, email via Resend/SendGrid, Cloudflare R2 for documents |

**Scale & Complexity:**

- **Primary domain:** Full-stack web application (Next.js 16 App Router)
- **Complexity level:** High — multi-tier marketplace, trust infrastructure, bank-transfer payment flow, admin verification kanban, CI/UEMOA compliance context
- **Estimated architectural components:** 12 major modules (Auth, Subscriptions, Opportunities, Matching, Reviews, Admin, Landing, Uploads, Notifications, Analytics, Payments-virement, Compliance)

### Technical Constraints & Dependencies

**Already-Implemented (Brownfield):**
- Next.js 16.2.6 + React 19.2.4 + App Router
- Prisma 7.8.0 with SQLite (dev), schema defined, generated client at `src/generated/prisma`
- Auth.js v5 beta.31 with split config (`auth.config.ts` Edge + `auth.ts` Node.js)
- `src/middleware.ts` already exists and correctly uses `NextAuth(authConfig)`
- TailwindCSS 4.x
- shadcn/ui base components

**Critical Constraints from Technical Feasibility:**
- Auth.js v5: middleware MUST import ONLY from `auth.config.ts` (Edge Runtime, no Prisma/bcrypt). `auth.ts` has providers (Node runtime).
- Prisma v7: datasource block has no direct `url` — uses `prisma.config.ts`. PrismaClient needs adapter. Import client from `@/generated/prisma/client`.
- Next.js 16: `.next` cache can corrupt (`rm -rf .next` to fix). Kill stale processes before restart.
- Stripe types are volatile across versions — remove entirely (bank-transfer model replaces payment providers).
- Project is **brownfield** — starter template evaluation is N/A; we extend existing structure.

### Cross-Cutting Concerns Identified

1. **Authentication & Authorization** — JWT session strategy, role-based route guards, tier-based data access
2. **Trust Infrastructure** — Verification levels, document integrity, audit trails, reputation scoring
3. **Payment-virement Flow** — Offline payment (bank transfer), manual admin validation, status lifecycle
4. **File Upload & Storage** — Legal documents (R2), profile images, secure presigned URLs
5. **Rate Limiting & Security** — Upstash Redis for API protection, especially `/api/auth/signup`
6. **Mobile-First Responsiveness** — 80%+ traffic on smartphones, touch targets ≥44px
7. **WhatsApp Integration** — Deep links on every profile/deal, pre-filled messages
8. **Compliance & Audit** — CENTIF-CI AML trails, APDP data protection, non-financial intermediary status

---

## Starter Template Evaluation

### Primary Technology Domain

**Brownfield Next.js 16 Full-Stack Web Application** — The project already has a functioning codebase with Auth.js, Prisma, and TailwindCSS. Starter template evaluation is **not applicable**; instead, we document the existing base and architectural decisions made on top of it.

### Existing Base Architecture

The codebase uses:
- `create-next-app` with TypeScript, TailwindCSS v4, App Router
- Prisma ORM with `better-sqlite3` adapter (dev only)
- Auth.js v5 with split config pattern
- shadcn/ui for unstyled accessible primitives

**Note:** Project initialization is already complete. The first implementation priority is resolving P0 blockers and building the bank-transfer workflow.

---

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Payment model | Bank transfer KS Investment + manual admin validation | Eliminates Stripe/CinetPay dependency, zero webhooks, PCI-DSS irrelevant; universally accessible for diaspora |
| Auth middleware | `src/middleware.ts` with `NextAuth(authConfig)` | Already implemented; Edge-compatible route protection |
| Rate limiting | Upstash Redis `@upstash/ratelimit` | Serverless-compatible, zero infra, sliding window precision |
| Database (prod) | PostgreSQL managed (Supabase/Railway) | Migration from SQLite before production; required for concurrency |
| Build output | `output: 'standalone'` in `next.config.ts` | Required for PM2 + Nginx self-hosting on Infomaniak VPS |

**Important Decisions (Shape Architecture):**
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Session strategy | JWT (not database) | Required for Edge-compatible middleware; role/tier embedded in token |
| File storage | Cloudflare R2 | Zero egress fees, S3-compatible, good for document storage |
| API pattern | RESTful Route Handlers (`app/api/**/route.ts`) | Native Next.js pattern, no external API framework needed |
| Form handling | React Hook Form + Zod | Already in dependencies; server-side validation with Zod schemas |
| Emails | Resend (recommendation) | Simple API, good deliverability, free tier sufficient for MVP |

**Deferred Decisions (Post-MVP):**
| Decision | Deferred Reason |
|----------|-----------------|
| PWA + service worker | Phase 2; current responsive web is sufficient |
| Matching algorithm (ML) | Tag-based rules sufficient for < 500 members |
| Crowd-due diligence | Admin-only verification for trust-building phase |
| Identity verification API (uqudo/Smile ID) | Manual upload + admin check sufficient for MVP |

### Data Architecture

**Database:** PostgreSQL in production (migrate from SQLite). Prisma 7 with `prisma-client` generator outputting to `src/generated/prisma`.

**Key Data Models (from schema):**
- `User` — auth identity, profile, tier, role, verification status, country field (UEMOA expansion ready)
- `Account` / `Session` / `VerificationToken` — Auth.js required adapters
- `Subscription` — tier, period, provider (will become `BANK_TRANSFER`), status lifecycle
- `Opportunity` — deal postings with verification status, author, verifier
- `Payment` — legacy Stripe/CinetPay records; to be repurposed or replaced for bank-transfer tracking

**Data Validation:**
- Server-side: Zod schemas in `src/lib/validations.ts`
- Client-side: React Hook Form resolvers with same Zod schemas
- Database: Prisma schema constraints + native type safety

**Caching Strategy (MVP):**
- No server-side caching layer initially
- Static page generation for landing, pricing, success wall
- Dynamic routes use `revalidate` where appropriate
- Future: Redis for session caching if JWT becomes too large

### Authentication & Security

**Auth Architecture:**
- Google OAuth provider + Credentials provider (bcryptjs)
- JWT session strategy with custom claims (`tier`, `role`, `id`)
- `auth.config.ts` — Edge-compatible, NO Prisma/bcrypt, used by middleware
- `auth.ts` — Full Node.js config with PrismaAdapter + providers
- `src/middleware.ts` — Route protection via `authorized` callback

**Authorization Patterns:**
- Role-based: `MEMBER` vs `ADMIN` — middleware blocks `/admin` for non-admins
- Tier-based: Data access filtered by `Tier` enum at API layer
- Public routes: Landing, pricing, auth pages, API auth endpoints

**Security Measures:**
- Rate limiting: `@upstash/ratelimit` on `/api/auth/signup` (5/min/IP) and `/api/auth/signin` (10/min/IP)
- HTTPS forced with HSTS header (Nginx)
- CSP, X-Frame-Options, X-Content-Type-Options headers
- No sensitive data in logs
- Audit trail for all admin actions and subscription transactions

### API & Communication Patterns

**API Design:** Next.js App Router Route Handlers (`route.ts`) under `src/app/api/`

**Endpoint Organization:**
```
src/app/api/
├── auth/signup/route.ts          # Credential registration (rate limited)
├── admin/
│   ├── opportunities/[id]/verify/route.ts  # Status transitions
│   └── users/[id]/tier/route.ts            # Tier management
├── opportunities/route.ts        # CRUD + listing
├── user/profile/route.ts         # Profile updates
└── (future) subscriptions/       # Bank-transfer submission
```

**API Response Format:**
- Success: `Response.json({ data: T })` or `NextResponse.json({ data: T })`
- Error: `Response.json({ error: string, code?: string }, { status })`
- HTTP status codes: 200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 429 (Rate Limited), 500 (Server Error)

**Error Handling:**
- Use `try/catch` in all route handlers
- Zod validation errors returned as `400` with field-level details
- Unexpected errors logged server-side, generic message returned to client
- Auth errors (NextAuth) handled by configured error page `/auth/error`

### Frontend Architecture

**State Management:**
- Server state: Server Components + Server Actions (Next.js 16 RSC)
- Client state: React `useState` / `useReducer` for local UI state
- No global client state library needed for MVP complexity
- Form state: React Hook Form

**Component Architecture:**
- Server Components by default (data fetching, auth checks)
- Client Components only when needed (`"use client"`) — interactivity, forms, hooks
- shadcn/ui primitives themed with IBC teal/amber palette
- Custom IBC components: `TrustBadge`, `DealCard`, `WhatsAppCTA`, `TierCard`, `StatusPill`

**Routing Strategy:**
- App Router with route groups for layout segmentation:
  - `(public)` — landing, pricing, auth pages (no auth required)
  - `(dashboard)` — member area (auth required)
  - `(admin)` — admin area (ADMIN role required)

### Infrastructure & Deployment

**Hosting:** VPS Cloud Infomaniak (Ubuntu 24.04)
**Process Manager:** PM2 with cluster mode (`ecosystem.config.js`)
**Reverse Proxy:** Nginx (SSL termination, static asset caching)
**SSL:** Let's Encrypt via Certbot (auto-renewal)
**Database:** PostgreSQL managed (Supabase or Railway for MVP)
**Build Output:** `output: 'standalone'` in `next.config.ts`

**Deployment Steps:**
1. `npm run build` → generates `.next/standalone/`
2. `prepare-deploy.sh` → assembles deploy package
3. `rsync` to VPS
4. `pm2 restart ibc-app`

---

## Implementation Patterns & Consistency Rules

### Naming Patterns

**Database (Prisma):**
- Table names: PascalCase in schema, mapped to `snake_case` with `@@map("users")`
- Column names: camelCase in schema (Prisma convention)
- Foreign keys: `{relationName}Id` (e.g., `authorId`, `verifiedById`)
- Enums: UPPER_SNAKE_CASE values (e.g., `AFFRANCHI`, `PENDING`)

**API Endpoints:**
- RESTful plural nouns: `/api/opportunities`, `/api/admin/users`
- Route parameters: `[id]` for dynamic segments
- Actions as sub-routes: `/api/opportunities/[id]/verify`

**Code (TypeScript):**
- Components: PascalCase files (e.g., `DealCard.tsx`)
- Hooks: camelCase prefixed with `use` (e.g., `useAuth`)
- Utilities/helpers: camelCase (e.g., `formatCurrency`)
- Constants: UPPER_SNAKE_CASE for true constants
- File naming: kebab-case for page files (e.g., `page.tsx`, `layout.tsx`)

### Structure Patterns

**Project Organization:**
```
src/
├── app/                  # Next.js App Router (routes + API)
│   ├── (public)/         # Public route group
│   ├── (dashboard)/      # Authenticated member routes
│   ├── (admin)/          # Admin-only routes
│   ├── api/              # API route handlers
│   ├── auth/             # Auth pages (signin, signup, error)
│   ├── globals.css       # Tailwind + CSS variables
│   ├── layout.tsx        # Root layout with providers
│   └── page.tsx          # Root redirect or landing
├── components/
│   ├── ui/               # shadcn/ui primitives
│   ├── features/         # Domain-specific components
│   │   ├── deals/
│   │   ├── auth/
│   │   ├── admin/
│   │   └── landing/
│   └── shared/           # Reusable cross-cutting components
├── lib/
│   ├── prisma.ts         # PrismaClient singleton
│   ├── auth.config.ts    # Edge auth config
│   ├── auth.ts           # Full auth instance
│   ├── validations.ts    # Zod schemas
│   ├── rate-limit.ts     # Upstash rate limiters
│   └── utils.ts          # cn() + general utilities
├── hooks/                # Custom React hooks
├── types/                # Supplementary TypeScript types
└── generated/prisma/     # Prisma Client output
```

**Test Organization (to be established):**
- Co-located: `*.test.ts(x)` next to source files
- E2E: `tests/e2e/` with Playwright (future)

### Format Patterns

**API Responses:**
```typescript
// Success
type ApiResponse<T> = { data: T };

// Error
type ApiError = { error: string; code?: string; details?: Record<string, string[]> };
```

**Date/Time:**
- Stored: ISO 8601 strings in PostgreSQL (`DateTime` in Prisma)
- Displayed: `toLocaleDateString('fr-FR')` for French formatting
- Never use `Date` objects in JSON — always serialize to ISO strings

**Currency:**
- Stored as smallest unit (cents) OR as `Float` with EUR/XOF labels
- Display: `Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })`

### Communication Patterns

**Server Actions (preferred over API routes for mutations):**
- Use for form submissions where possible (Next.js 16 progressive enhancement)
- Revalidate paths after mutations: `revalidatePath('/dashboard/opportunities')`

**API Routes (for external/Webhook needs):**
- Use for file uploads, external integrations, or when Server Actions aren't suitable

**Event/Notification Pattern (MVP):**
- No event bus initially
- Direct function calls for immediate side effects
- Admin notifications via email (Resend) for subscription validation

### Process Patterns

**Loading States:**
- Server Components: Use `loading.tsx` in route segments
- Client Components: Use `Skeleton` components from shadcn/ui
- Form submissions: Button disabled + spinner

**Error Handling:**
- Global: `error.tsx` in App Router for boundary catches
- Form: Display Zod validation errors inline
- API: Return structured error responses; toast notification on client
- Unexpected: Log to server, show generic "Une erreur est survenue" to user

**Authentication Flow:**
1. Unauthenticated user visits protected route → middleware redirects to `/auth/signin`
2. Sign in via Google OAuth or credentials → JWT created with role/tier
3. Middleware checks `authorized` callback on every request
4. `/admin` routes check `role === "ADMIN"`

### JSX Boolean Guardrail (Next.js 16 Strict)

- Do not use `&&` in JSX, including inside ternary conditions.
- Incorrect pattern: `{!isAuthor && !isAdmin ? <WhatsAppCTA /> : null}`.
- Correct pattern: pre-compute compound booleans before the JSX return, for example `const shouldShowWhatsApp = !isAuthor && !isAdmin;` then render `{shouldShowWhatsApp ? <WhatsAppCTA /> : null}`.
- Rule: pre-compute every compound boolean expression as a `const` before the JSX return.

### Upload Security Patterns

- Presigned URL completion endpoints MUST validate the R2 key server-side before persisting document metadata:
  - Regex: `^opportunities/[a-zA-Z0-9-]+/documents/[a-zA-Z0-9-]+\.[a-zA-Z0-9]+$`
  - Scope check: `key.startsWith('opportunities/{opportunityId}/documents/')`
- Conditional metadata: never serialize full `initialDocuments` metadata to non-authors/non-admins.
  - `documentCount` may be visible broadly.
  - `initialDocuments` must be returned only to authorized authors/admins.
- Source: Story 3.2 code-review findings P1 (document metadata exposure) and P2 (client-trusted R2 key).

### Dev Agent Git Safety

- DS agents must not use `git add -A`; use `git add -A -- . ':!dev.db' ':!*.sqlite3'` or add files explicitly.

---

## Project Structure & Boundaries

### Complete Project Directory Structure

```
ibc/
├── README.md
├── package.json
├── next.config.ts              # + output: 'standalone'
├── tsconfig.json
├── tailwind.config.ts / globals.css   # Tailwind v4 + CSS vars
├── prisma.config.ts            # Prisma 7 config (datasource url)
├── prisma/
│   └── schema.prisma           # Data models (to migrate to PostgreSQL)
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx        # Landing page
│   │   │   └── pricing/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx      # Member layout with auth check
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── opportunities/page.tsx
│   │   │   ├── opportunities/[id]/page.tsx
│   │   │   ├── opportunities/new/page.tsx
│   │   │   ├── members/page.tsx
│   │   │   ├── profile/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── (admin)/
│   │   │   ├── layout.tsx      # Admin layout with role guard
│   │   │   ├── admin/page.tsx
│   │   │   ├── admin/members/page.tsx
│   │   │   └── admin/opportunities/page.tsx
│   │   ├── api/
│   │   │   ├── auth/signup/route.ts
│   │   │   ├── opportunities/route.ts
│   │   │   ├── opportunities/[id]/route.ts
│   │   │   ├── user/profile/route.ts
│   │   │   ├── admin/
│   │   │   │   ├── users/[id]/tier/route.ts
│   │   │   │   ├── users/[id]/verify/route.ts
│   │   │   │   └── opportunities/[id]/verify/route.ts
│   │   │   └── (future) subscriptions/
│   │   ├── auth/
│   │   │   ├── signin/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   └── error/page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx          # Root with ThemeProvider + AuthProvider
│   │   └── page.tsx            # Redirect to landing or dashboard
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components (Button, Card, Input, etc.)
│   │   ├── features/
│   │   │   ├── deals/
│   │   │   │   ├── deal-card.tsx
│   │   │   │   ├── deal-detail.tsx
│   │   │   │   ├── trust-badge.tsx
│   │   │   │   └── document-row.tsx
│   │   │   ├── auth/
│   │   │   │   ├── signin-form.tsx
│   │   │   │   └── signup-form.tsx
│   │   │   ├── admin/
│   │   │   │   ├── kanban-board.tsx
│   │   │   │   ├── user-management.tsx
│   │   │   │   └── metrics-cards.tsx
│   │   │   └── landing/
│   │   │       ├── hero.tsx
│   │   │       ├── pricing.tsx
│   │   │       └── footer.tsx
│   │   └── shared/
│   │       ├── whatsapp-cta.tsx
│   │       ├── tier-card.tsx
│   │       ├── status-pill.tsx
│   │       └── page-header.tsx
│   ├── lib/
│   │   ├── prisma.ts           # PrismaClient singleton with adapter
│   │   ├── auth.config.ts      # Edge-compatible auth config
│   │   ├── auth.ts             # Full NextAuth instance
│   │   ├── validations.ts      # Zod schemas
│   │   ├── rate-limit.ts       # Upstash ratelimiters
│   │   └── utils.ts            # cn() + helpers
│   ├── hooks/
│   │   └── (future custom hooks)
│   ├── types/
│   │   └── (future type extensions)
│   ├── generated/
│   │   └── prisma/             # Generated Prisma Client
│   └── middleware.ts           # Auth.js route protection
├── public/
│   └── (static assets)
├── tests/
│   └── e2e/                    # Playwright tests (future)
├── scripts/
│   └── prepare-deploy.sh       # Build + package standalone for rsync
├── ecosystem.config.js         # PM2 cluster config
└── .env.example                # Required environment variables
```

### Architectural Boundaries

**API Boundaries:**
- Public API: No auth required (landing data, auth endpoints)
- Member API: Requires valid JWT with `MEMBER` or `ADMIN` role
- Admin API: Requires `ADMIN` role; returns 403 otherwise
- Tier-gated data: Opportunity responses filtered by `req.user.tier`

**Route Boundaries:**
- `(public)` — No session check; landing, pricing, auth pages
- `(dashboard)` — Session required; redirect to `/auth/signin` if unauthenticated
- `(admin)` — Session + `ADMIN` role required; redirect to `/` if unauthorized

**Data Boundaries:**
- Prisma ORM is the ONLY data access layer
- No raw SQL except in migrations
- All DB calls go through `src/lib/prisma.ts` singleton
- External file storage: Cloudflare R2 via S3-compatible SDK

### Integration Points

**Internal Communication:**
- Server Components fetch data directly via Prisma
- Client Components call Server Actions or API routes
- Auth state propagated via Auth.js session provider

**External Integrations:**
- Google OAuth (Auth.js built-in)
- WhatsApp `wa.me` deep links (no API, just URLs)
- Cloudflare R2 (S3 SDK) for document storage
- Resend for transactional emails
- Upstash Redis for rate limiting

**Data Flow:**
```
User → Nginx → Next.js (standalone)
         ↓
    [Middleware] → Auth check (Edge)
         ↓
    [Page / API Route] → Server Component / Route Handler
         ↓
    [Prisma] → PostgreSQL
         ↓
    [R2 SDK] → Cloudflare R2 (documents)
```

---

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:** All technology choices are compatible. Next.js 16 + React 19 + Prisma 7 + Auth.js v5 beta + TailwindCSS 4 form a cohesive modern stack. The bank-transfer payment model eliminates Stripe/CinetPay complexity entirely.

**Pattern Consistency:** Naming conventions align with Prisma/Next.js ecosystem standards. JWT session strategy is consistent with Edge middleware requirements. API response formats are uniform.

**Structure Alignment:** The App Router route group pattern `(public)` / `(dashboard)` / `(admin)` cleanly separates concerns and maps to the authorization boundaries defined in the middleware.

### Requirements Coverage Validation ✅

**Epic/Feature Coverage:**
- ✅ FR1–FR7 (Auth): Covered by Auth.js split config + middleware
- ✅ FR8–FR14 (Tiers/Subscriptions): Covered by bank-transfer flow + admin validation
- ✅ FR15–FR23 (Marketplace): Covered by Prisma models + API routes + R2 uploads
- ✅ FR24–FR30 (Networking): Covered by tag matching + WhatsApp deep links
- ✅ FR31–FR34 (Reviews): Covered by additional schema fields + API
- ✅ FR35–FR40 (Admin): Covered by admin route group + kanban UI
- ✅ FR41–FR45 (Landing): Covered by public route group + SSG

**Non-Functional Requirements Coverage:**
- ✅ NFR-P1–P4 (Performance): Standalone build, static generation, JWT sessions
- ✅ NFR-S1–S9 (Security): Rate limiting, bcrypt, HTTPS, CSP, audit trails
- ✅ NFR-SC1–SC3 (Scalability): PostgreSQL, stateless API, PM2 cluster
- ✅ NFR-A1–A3 (Accessibility): shadcn/ui primitives, Tailwind dark mode, French UI
- ✅ NFR-D1–D6 (Deployment): Standalone, PM2, Nginx, SSL scripts
- ✅ NFR-I1–I3 (Integration): WhatsApp links, Resend, R2

### Implementation Readiness Validation ✅

**Decision Completeness:** All critical and important decisions documented above with rationale. No blocking gaps.

**Structure Completeness:** Complete directory tree defined. All integration points mapped.

**Pattern Completeness:** Naming, structure, format, communication, and process patterns all specified with examples.

### Gap Analysis Results

**No Critical Gaps.** The brownfield codebase already has:
- Working middleware
- Defined schema
- Auth config
- Basic page structure

**Minor Gaps (non-blocking):**
1. `next.config.ts` needs `output: 'standalone'` (one-line change)
2. Rate limiting library not yet installed (`@upstash/ratelimit`)
3. `prepare-deploy.sh` and `ecosystem.config.js` not yet created
4. `prisma.config.ts` needed for Prisma v7 datasource configuration
5. PostgreSQL migration pending (dev-only for now)

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**
- Clear brownfield foundation reduces risk
- Simple bank-transfer model eliminates payment complexity
- Strong trust infrastructure aligned with domain needs
- WhatsApp-native design fits target culture
- Auth.js v5 split config correctly implemented

**Areas for Future Enhancement:**
- Add Playwright E2E tests
- Implement Redis caching layer for > 500 users
- Add PWA support with service worker
- Implement real-time notifications (WebSockets or SSE)
- Integrate identity verification API at scale

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented above
- Use implementation patterns consistently across all components
- Respect project structure and boundaries
- Refer to this document for all architectural questions
- Never add Stripe or CinetPay payment code — bank-transfer is the only model
- Always import Prisma from `@/generated/prisma/client`
- Never import Prisma or bcrypt into `auth.config.ts` (Edge Runtime)

**First Implementation Priority:**
1. Add `output: 'standalone'` to `next.config.ts`
2. Install `@upstash/ratelimit` + `@upstash/redis` and protect `/api/auth/signup`
3. Remove Stripe/CinetPay files and dependencies
4. Create bank-transfer subscription flow (RIB display + admin validation)
5. Build admin kanban for opportunity verification
6. Add Cloudflare R2 document uploads

---

## Appendices

### Environment Variables Required

```
# Auth
NEXTAUTH_URL=
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Database
DATABASE_URL=                  # PostgreSQL connection string (production)

# Upstash Redis (rate limiting)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Cloudflare R2 (document storage)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

# Resend (emails)
RESEND_API_KEY=

# App
APP_URL=                       # e.g., https://ivoirebusinessclub.com
```

### Technology Versions

| Technology | Version | Notes |
|-----------|---------|-------|
| Next.js | 16.2.6 | App Router, RSC, standalone output |
| React | 19.2.4 | Concurrent features |
| Prisma | 7.8.0 | Client + adapter pattern |
| Auth.js (next-auth) | 5.0.0-beta.31 | Split config (Edge + Node.js) |
| TailwindCSS | 4.x | CSS variables, dark mode |
| TypeScript | 5.x | Strict mode recommended |
| bcryptjs | 3.0.3 | Credential auth hashing |
| Zod | 4.4.3 | Schema validation |
| React Hook Form | 7.75.0 | Form state management |

### P0 Blockers to Resolve

1. **Add `output: 'standalone'`** to `next.config.ts`
2. **Install `@upstash/ratelimit`** and protect signup/signin routes
3. **Remove Stripe + CinetPay** from `package.json` and delete `src/lib/stripe.ts`, `src/lib/cinetpay.ts`, `src/app/api/stripe/**`, `src/app/api/cinetpay/**`
4. **Create bank-transfer flow** — RIB display page, admin validation UI
5. **Migrate schema** — Remove `PaymentProvider` enum values `STRIPE`/`CINETPAY`; adapt `Subscription` model for bank-transfer
6. **Create `prisma.config.ts`** for Prisma v7 datasource configuration

---

*Architecture document for IBC — completed via BMAD `bmad-create-architecture` workflow. All decisions validated and ready for AI agent implementation.*
