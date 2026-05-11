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
  - product-brief-ivoire-business-club.md
  - product-brief-ivoire-business-club-distillate.md
  - prd.md
  - review-ivoire-business-club.md
workflowType: architecture
project_name: ivoire-business-club
user_name: Jonathan
date: "2026-05-11"
---

# Architecture Decision Document — Ivoire Business Club

---

## AD-01 : Stack technique

**Décision :** Next.js 15 App Router + TypeScript strict + TailwindCSS 4

**Justification :**
- App Router permet les React Server Components (RSC) pour le SEO et la performance
- TypeScript strict réduit les erreurs à l'exécution et améliore le DX
- TailwindCSS 4 pour un styling rapide et consistant sans CSS custom
- Écosystème le plus large pour auth, paiements, et tooling

**Alternatives rejetées :**
- ~~Nuxt/Vue~~ : Écosystème plus petit pour ce type de plateforme B2C/SaaS
- ~~SvelteKit~~ : Trop niche, moins de librairies pour Stripe/Auth
- ~~Laravel~~ : Projet précédent dysfonctionnel, raison du rebuild

---

## AD-02 : Base de données et ORM

**Décision :** Prisma ORM avec SQLite (dev) → PostgreSQL (prod)

**Justification :**
- SQLite pour le dev local = zéro config, rapide
- Prisma facilite la migration vers PostgreSQL en production
- Schema Prisma = source de vérité, migrations auto-générées
- Type-safety complète avec les generated types

**Configuration :**
```
DATABASE_URL_DEV="file:./dev.db"
DATABASE_URL_PROD="postgresql://user:pass@host:5432/ibc"
```

---

## AD-03 : Authentification

**Décision :** Auth.js (NextAuth v5) avec email/password + Google OAuth

**Justification :**
- Intégration native avec Next.js App Router
- Support email/password via Credentials provider
- Google OAuth comme option rapide
- Sessions JWT dans cookies HttpOnly
- Compatible middleware Next.js pour la protection de routes

**Configuration :**
- Provider : Credentials (email+password) + Google
- Session : JWT, 30 jours d'expiration
- Pages custom : `/auth/signin`, `/auth/signup`
- Callbacks : enrichir le JWT avec le tier et le rôle

---

## AD-04 : Paiements

**Décision :** Stripe (€) + CinetPay (CFA/mobile money)

**Justification :**
- Stripe = standard pour les paiements en € et abonnements récurrents
- CinetPay = passerelle Côte d'Ivoire/Afrique de l'Ouest pour CFA, Orange Money, MTN, Wave
- Double passerelle nécessaire pour couvrir les deux marchés cibles

**Modèle :**
- 3 produits Stripe (affranchi, grand_frere, boss) × 2 périodes (monthly, yearly)
- 3 produits CinetPay correspondants en CFA
- Webhooks pour synchroniser le statut des abonnements
- Plan gratuit = période d'essai 14 jours

---

## AD-05 : Structure du projet

**Décision :** Monorepo Next.js avec structure feature-based

```
src/
├── app/                          # Next.js App Router
│   ├── (public)/                  # Routes publiques (landing, auth)
│   │   ├── page.tsx               # Landing page
│   │   ├── pricing/page.tsx       # Page tarifs
│   │   ├── auth/
│   │   │   ├── signin/page.tsx
│   │   │   └── signup/page.tsx
│   │   └── opportunity/page.tsx   # Liste opportunités (lecture)
│   ├── (dashboard)/              # Routes authentifiées
│   │   ├── layout.tsx             # Dashboard layout (sidebar, nav)
│   │   ├── dashboard/page.tsx     # Dashboard membre
│   │   ├── profile/page.tsx
│   │   ├── members/page.tsx       # Annuaire
│   │   ├── opportunities/
│   │   │   ├── page.tsx           # Liste
│   │   │   ├── [id]/page.tsx      # Détail
│   │   │   └── new/page.tsx       # Publication
│   │   └── settings/page.tsx
│   ├── (admin)/                  # Admin panel
│   │   ├── admin/
│   │   │   ├── page.tsx           # Dashboard admin
│   │   │   ├── members/page.tsx
│   │   │   └── opportunities/page.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── stripe/webhook/route.ts
│   │   └── cinetpay/webhook/route.ts
│   ├── layout.tsx                 # Root layout
│   └── globals.css
├── components/
│   ├── ui/                       # Composants UI réutilisables (shadcn)
│   ├── landing/                  # Sections landing page
│   ├── dashboard/                 # Composants dashboard
│   └── admin/                    # Composants admin
├── lib/
│   ├── auth.ts                   # Auth.js config
│   ├── prisma.ts                 # Prisma client singleton
│   ├── stripe.ts                 # Stripe helpers
│   ├── cinetpay.ts              # CinetPay helpers
│   └── validations.ts            # Zod schemas
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── public/
    ├── images/
    └── fonts/
```

---

## AD-06 : Schéma de données (Prisma)

**Décision :** Modèle Prisma avec enums pour les statuts et tiers

```prisma
enum Tier {
  AFFRANCHI
  GRAND_FRERE
  BOSS
}

enum UserRole {
  MEMBER
  ADMIN
}

enum SubscriptionStatus {
  TRIAL
  ACTIVE
  PAST_DUE
  CANCELLED
}

enum OpportunityCategory {
  INVESTISSEMENT
  BUSINESS
  PARTENARIAT
  IMMOBILIER
}

enum VerificationStatus {
  PENDING
  VERIFIED
  REJECTED
}

enum PaymentProvider {
  STRIPE
  CINETPAY
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String
  bio           String?
  avatarUrl     String?
  phone         String?
  location      String?
  tier          Tier      @default(AFFRANCHI)
  role          UserRole  @default(MEMBER)
  passwordHash  String?
  googleId      String?
  emailVerified Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  subscriptions  Subscription[]
  payments       Payment[]
  opportunities  Opportunity[]  @relation("Author")
  
  @@map("users")
}

model Subscription {
  id            String             @id @default(cuid())
  userId        String
  tier          Tier
  period        String             // MONTHLY | ANNUAL
  provider      PaymentProvider
  providerRef   String             // Stripe subscription ID or CinetPay ref
  status        SubscriptionStatus @default(TRIAL)
  startDate     DateTime
  endDate       DateTime?
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt

  user          User                @relation(fields: [userId], references: [id])

  @@map("subscriptions")
}

model Opportunity {
  id                 String              @id @default(cuid())
  authorId           String
  title              String
  description        String
  category           OpportunityCategory
  amount             Float?
  verificationStatus VerificationStatus   @default(PENDING)
  verifiedAt         DateTime?
  verifiedById       String?
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt

  author             User                @relation("Author", fields: [authorId], references: [id])
  verifiedBy         User?               @relation("Verifier", fields: [verifiedById], references: [id])

  @@map("opportunities")
}

model Payment {
  id          String          @id @default(cuid())
  userId      String
  amount      Float
  currency    String          // EUR | XOF
  provider    PaymentProvider
  providerRef String
  status      String          // succeeded | failed | pending
  createdAt   DateTime        @default(now())

  user        User            @relation(fields: [userId], references: [id])

  @@map("payments")
}
```

---

## AD-07 : Design System

**Décision :** shadcn/ui + TailwindCSS 4 avec thème custom IBC

**Palette de couleurs :**
- Primary : Or/Doré (#D4A847) — évoque le luxe, l'Afrique, le business
- Secondary : Bleu marine (#1E3A5F) — sérieux, confiance, Europe
- Accent : Vert émeraude (#2D8B4E) — croissance, opportunité, Afrique
- Background clair : #FAFAF7 (warm white)
- Background sombre : #111111
- Text : #1A1A1A (clair) / #F5F5F5 (sombre)

**Typographie :**
- Headings : Inter (ou plus premium : Playfair Display pour les titres de section)
- Body : Inter
- Mono : JetBrains Mono (code/admin)

**Composants shadcn/ui à installer :**
Button, Card, Dialog, DropdownMenu, Form, Input, Label, Select, Table, Tabs, Toast, Badge, Avatar, Sheet, Separator

---

## AD-08 : Hébergement et déploiement

**Décision :** Infomaniak (SSH + rsync) avec GitHub Actions CI

**Justification :**
- Cohérent avec les autres projets (site-luc, velo49)
- Infomaniak supporte Node.js 22+ sur les hébergements mutualisés
- Coût maitrisé, données en Suisse

**Pipeline CI/CD :**
1. Push sur `main` → GitHub Actions : lint + type-check + build + test
2. Build réussi → rsync vers Infomaniak
3. SSH : `pm2 restart ibc` ou `systemctl restart ibc`

**Configuration serveur :**
- Node.js 22+
- Process manager : PM2
- Reverse proxy : Nginx (config Infomaniak)
- SSL : Let's Encrypt (automatique Infomaniak)

---

## AD-09 : Sécurité

**Décisions :**
- Mots de passe : bcrypt via Auth.js (cost factor 12)
- Sessions : JWT HttpOnly cookies, 30j expiration
- CSRF : Next.js built-in protection
- Headers : Helmet-style via next.config.js (CSP, X-Frame-Options, HSTS)
- Rate limiting : Upstash Ratelimit sur les API routes (100 req/min)
- Validation : Zod sur toutes les entrées (forms + API)
- Variables sensibles : .env.local uniquement, never committed

---

## AD-10 : Tests

**Décision :** Vitest (unit) + Playwright (E2E)

**Stratégie :**
- Unit tests : fonctions utilitaires, validations Zod, helpers Paiement
- Integration tests : API routes avec Prisma+SQLite in-memory
- E2E tests : parcours critiques (inscription, paiement, publication opportunité)
- Coverage cible : 80% sur les chemins critiques (auth, payment, opportunity CRUD)

---

## AD-11 : Patterns architecturaux

**Server Components par défaut :**
- Toutes les pages sont des RSC sauf si interactivité client nécessaire
- Seuls les formulaires, modales, et composants interactifs sont Client Components

**Data Fetching :**
- Prisma directement dans les RSC (pas de API route intermédiaire)
- API routes uniquement pour les webhooks (Stripe/CinetPay) et les actions client

**Server Actions :**
- Utilisées pour les mutations de données depuis les formulaires (Next.js 15 pattern)
- Validation Zod côté serveur avant chaque mutation

**Middleware :**
- Protection des routes authentifiées (redirect vers signin)
- Injection du tier/role dans le JWT pour les Checks côté middleware

**Error Handling :**
- error.tsx pour chaque route group
- toast/sonner pour les erreurs client
- Logging structuré avec pino