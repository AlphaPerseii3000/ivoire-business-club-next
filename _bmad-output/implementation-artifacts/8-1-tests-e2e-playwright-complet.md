# Story 8.1: Tests E2E Playwright — Couverture complète du site en conditions réelles

Status: ready-for-dev

## Story

As a **développeur et responsable qualité IBC**,
I want **une suite de tests E2E Playwright complète couvrant toutes les fonctionnalités du site en conditions réelles**,
so that **chaque parcours critique (auth, tiers, opportunités, admin, documents, matching, reviews, landing) est validé automatiquement contre la production VPS et les régressions sont détectées immédiatement**.

## Acceptance Criteria

### AC1 — Configuration Playwright pour tests de production
- **Given** le projet IBC déployé sur `https://ivoire-business-club.com`
- **When** les tests E2E s'exécutent
- **Then** `playwright.config.ts` cible la production VPS avec `baseURL: 'https://ivoire-business-club.com'`, supporte Chromium/Firefox/WebKit, et un environnement de test local configurable via `BASE_URL` env var
- **And** un script `test:e2e` est ajouté à `package.json` et un script `test:e2e:local` pour les tests locaux contre `http://localhost:3000`

### AC2 — Authentification : Inscription et Connexion
- **Given** un visiteur sur le site
- **When** il s'inscrit avec email/mot de passe via `/auth/signup`
- **Then** le formulaire valide les champs requis (email, mot de passe ≥8 chars, nom), affiche les erreurs de validation, crée le compte avec tier AFFRANCHI par défaut, et redirige vers `/dashboard`
- **Given** un utilisateur enregistré
- **When** il se connecte via `/auth/signin` avec ses identifiants
- **Then** il accède au dashboard, son nom et son tier sont visibles dans la navigation
- **Given** un utilisateur non enregistré
- **When** il tente de se connecter avec un email inexistant ou un mauvais mot de passe
- **Then** un message d'erreur s'affiche sans révéler si l'email existe

### AC3 — Tiers & Abonnements : Pricing, Virement, Validation Admin
- **Given** un visiteur sur `/pricing`
- **Then** les 3 tiers (AFFRANCHI €29, GRAND_FRÈRE €49, BOSS €99) sont affichés avec leurs avantages respectifs
- **Given** un membre AFFRANCHI qui sélectionne un tier
- **When** il accède à `/pricing/virement`
- **Then** les instructions de virement bancaire sont affichées (bénéficiaire KS Investment, montant, référence unique)
- **Given** un membre qui a soumis un virement
- **Then** son abonnement est en statut TRIAL ou PENDING sur le dashboard
- **Given** un admin sur `/admin/subscriptions`
- **When** il valide un abonnement TRIAL → ACTIVE
- **Then** le membre reçoit l'accès premium et son statut est mis à jour

### AC4 — Opportunités : Création, Vérification, Visibilité
- **Given** un membre connecté sur `/dashboard/opportunities/new`
- **When** il soumet une nouvelle opportunité (titre, description, catégorie, montant)
- **Then** l'opportunité est créée en statut PENDING et visible dans le dashboard de l'auteur
- **Given** un admin sur `/admin/opportunities`
- **When** il vérifie une opportunité PENDING → VERIFIED
- **Then** l'opportunité devient visible pour les membres éligibles selon leur tier
- **Given** un admin qui rejette une opportunité
- **Then** l'opportunité n'est visible que par l'auteur et les admins
- **Given** un visiteur non connecté sur la landing page
- **Then** les deals teaser publics (titre + localisation) sont visibles sans authentification

### AC5 — Documents : Upload, Permissions, Accès
- **Given** un auteur d'opportunité sur le dashboard
- **When** il uploade un document juridique (PDF, image)
- **Then** le document est attaché à l'opportunité et visible dans la liste des documents
- **Given** un membre non-auteur tentant d'accéder aux documents privés
- **Then** l'accès est refusé (403 ou redirect) et le contenu n'est pas exposé
- **Given** un admin sur le dashboard admin
- **Then** il peut voir et gérer tous les documents uploadés

### AC6 — Premium Gates : Contrôle d'accès par tier
- **Given** un membre AFFRANCHI tentant d'accéder à un deal BOSS
- **Then** l'accès est bloqué avec un CTA de upgrade vers GRAND_FRÈRE ou BOSS
- **And** aucun détail sensible du deal BOSS n'est présent dans le DOM
- **Given** un membre BOSS accédant au même deal
- **Then** les détails complets et les actions sont visibles
- **Given** un membre sans abonnement actif (CANCELLED/PAST_DUE)
- **Then** l'accès premium est bloqué partout sur le dashboard

### AC7 — Matching & Tags
- **Given** un membre avec des tags sur son profil
- **When** il visite `/dashboard/matching`
- **Then** les opportunités correspondant à ses tags sont affichées en priorité
- **Given** un membre qui manifeste son intérêt pour une opportunité (soft commitment)
- **Then** l'intérêt est enregistré et l'auteur de l'opportunité est notifié

### AC8 — Reviews & Réputation
- **Given** deux membres ayant conclu un deal
- **When** l'un laisse une review (note + commentaire) à l'autre via `/members/[id]/reviews`
- **Then** la review est enregistrée et visible sur le profil du destinataire
- **And** le score de fiabilité IBC est recalculé

### AC9 — Admin : Dashboard, Membres, Audit
- **Given** un admin connecté sur `/admin`
- **Then** le dashboard kanban des opportunités est visible avec colonnes (PENDING, EN_COURS, VERIFIED, REJECTED)
- **Given** un admin sur `/admin/members`
- **Then** la liste des membres est accessible avec options de suspension/réactivation
- **Given** un admin sur `/admin/audit`
- **Then** les logs d'audit sont consultables avec filtres (action, entité, date)
- **Given** un compte utilisateur ADMIN
- **Then** l'accès à `/admin` est autorisé ; un compte MEMBEr est redirigé

### AC10 — Landing Page & Contenu Public
- **Given** un visiteur non connecté sur la page d'accueil
- **Then** les deals teaser publics, la présentation des tiers, et le mur des succès sont visibles
- **And** les CTA d'inscription/redirection vers `/auth/signup` et `/pricing` fonctionnent
- **And** la page est responsive (mobile-first) et conforme WCAG 2.1 AA pour les parcours critiques

### AC11 — Navigation & Routes Protégées
- **Given** un visiteur non authentifié
- **When** il accède à `/dashboard`, `/profile`, `/settings` ou toute route protégée
- **Then** il est redirigé vers `/auth/signin`
- **Given** un utilisateur authentifié
- **When** il accède à `/auth/signin` ou `/auth/signup`
- **Then** il est redirigé vers `/dashboard`

### AC12 — Profil Utilisateur
- **Given** un membre connecté sur `/profile`
- **Then** ses informations (nom, bio, téléphone, localisation, pays, tags) sont visibles et modifiables
- **Given** un membre sur `/profile/edit`
- **When** il modifie son profil et sauvegarde
- **Then** les changements sont persistés et visibles après rechargement

### AC13 — Suppression de compte (RGPD)
- **Given** un membre sur `/settings`
- **When** il demande la suppression de son compte
- **Then** le compte est marqué pour suppression et les données personnelles sont anonymisées

### AC14 — Notifications
- **Given** un membre avec des notifications non lues sur `/dashboard/notifications`
- **When** il clique sur une notification
- **Then** elle est marquée comme lue et le contenu est accessible

## Tasks / Subtasks

- [ ] AC1 — Configuration Playwright (AC: #1)
  - [ ] Mettre à jour `playwright.config.ts` : baseURL depuis env `BASE_URL` (défaut `https://ivoire-business-club.com`), projects Chromium/Firefox/WebKit, reporter HTML + list
  - [ ] Ajouter scripts `test:e2e` et `test:e2e:local` dans `package.json`
  - [ ] Créer `e2e/fixtures/auth.ts` — helpers de connexion (credentials signin, admin signin) pour réutilisation dans tous les spec files
  - [ ] Créer `e2e/fixtures/seed.ts` — helpers de seeding/cleanup API si applicable (ou documentation des comptes de test pré-créés)
  - [ ] Créer `e2e/helpers/selectors.ts` — sélecteurs de données réutilisables (`data-testid`) pour les éléments clés

- [ ] AC2 — Authentification E2E (AC: #2)
  - [ ] Remplacer les `test.fixme()` dans `e2e/auth-signup.spec.ts` par des tests fonctionnels
  - [ ] Test : inscription avec champs valides → redirection dashboard, tier AFFRANCHI affiché
  - [ ] Test : inscription avec email dupliqué → message d'erreur approprié
  - [ ] Test : inscription avec champs vides/invalide → messages de validation
  - [ ] Test : connexion avec identifiants valides → accès dashboard
  - [ ] Test : connexion avec mauvais mot de passe → message d'erreur sans révéler l'existence de l'email
  - [ ] Test : bouton Google OAuth visible et pointe vers le bon endpoint
  - [ ] Test : redirection routes protégées → `/auth/signin` pour utilisateur non authentifié
  - [ ] Test : utilisateur authentifié accédant à `/auth/signin` → redirection vers `/dashboard`

- [ ] AC3 — Tiers & Virement E2E (AC: #3)
  - [ ] Remplacer les `test.fixme()` dans `e2e/bank-transfer.spec.ts`
  - [ ] Test : affichage des 3 tiers sur `/pricing` avec noms, prix et avantages
  - [ ] Test : navigation vers `/pricing/virement` affiche les instructions de virement
  - [ ] Test : soumission d'un virement → statut PENDING/TRIAL visible
  - [ ] Test : admin valide un abonnement → statut passe à ACTIVE
  - [ ] Test : admin rejette un virement → statut approprié et notification

- [ ] AC4 — Opportunités E2E (AC: #4)
  - [ ] Créer `e2e/opportunities.spec.ts`
  - [ ] Test : membre crée une opportunité → statut PENDING
  - [ ] Test : admin vérifie une opportunité → visible par les membres éligibles
  - [ ] Test : admin rejette une opportunité → visible uniquement par auteur et admin
  - [ ] Test : visiteur non connecté voit les deals teaser sur la landing page

- [ ] AC5 — Documents E2E (AC: #5)
  - [ ] Remplacer les `test.fixme()` dans `e2e/documents.spec.ts`
  - [ ] Test : upload d'un document par l'auteur → visible dans la liste
  - [ ] Test : accès non autorisé à un document privé → 403 ou redirect
  - [ ] Test : admin consulte et gère les documents
  - [ ] Test : upload de fichier non supporté ou trop gros → erreur de validation

- [ ] AC6 — Premium Gates E2E (AC: #6)
  - [ ] Remplacer les `test.fixme()` dans `e2e/premium-gates.spec.ts`
  - [ ] Test : membre AFFRANCHI bloqué sur un deal BOSS → CTA upgrade visible
  - [ ] Test : membre BOSS accède au même deal → détails complets visibles
  - [ ] Test : membre avec abonnement CANCELLED/PAST_DUE → accès premium bloqué partout

- [ ] AC7 — Matching & Tags E2E (AC: #7)
  - [ ] Créer `e2e/matching-tags.spec.ts`
  - [ ] Test : `/dashboard/matching` affiche les opportunités correspondant aux tags du membre
  - [ ] Test : manifestation d'intérêt (soft commitment) → enregistrement et notification

- [ ] AC8 — Reviews & Réputation E2E (AC: #8)
  - [ ] Créer `e2e/reviews-reputation.spec.ts`
  - [ ] Test : création d'une review → visible sur le profil du destinataire
  - [ ] Test : score de fiabilité IBC mis à jour après review

- [ ] AC9 — Admin E2E (AC: #9)
  - [ ] Remplacer les `test.fixme()` dans `e2e/admin-flows.spec.ts`
  - [ ] Test : admin accède au dashboard kanban → colonnes visibles
  - [ ] Test : admin gère les membres (suspendre/réactiver)
  - [ ] Test : admin consulte les logs d'audit avec filtres
  - [ ] Test : membre non-admin → redirection/refus d'accès à `/admin`

- [ ] AC10 — Landing Page E2E (AC: #10)
  - [ ] Créer `e2e/landing-page.spec.ts`
  - [ ] Test : deals teaser publics visibles sans connexion
  - [ ] Test : présentation des 3 tiers fonctionnelle
  - [ ] Test : CTA inscription et pricing fonctionnels
  - [ ] Test : responsive mobile-first (viewport mobile)

- [ ] AC11 — Navigation & Routes Protégées E2E (AC: #11)
  - [ ] Créer `e2e/navigation.spec.ts`
  - [ ] Test : visiteur non authentifié sur `/dashboard` → redirect `/auth/signin`
  - [ ] Test : visiteur non authentifié sur `/profile` → redirect `/auth/signin`
  - [ ] Test : visiteur non authentifié sur `/settings` → redirect `/auth/signin`
  - [ ] Test : utilisateur authentifié sur `/auth/signin` → redirect `/dashboard`

- [ ] AC12 — Profil Utilisateur E2E (AC: #12)
  - [ ] Créer `e2e/profile.spec.ts`
  - [ ] Test : affichage des informations du profil (nom, bio, tags)
  - [ ] Test : modification du profil et persistance après rechargement

- [ ] AC13 — Suppression de compte RGPD E2E (AC: #13)
  - [ ] Créer `e2e/account-deletion.spec.ts`
  - [ ] Test : demande de suppression → confirmation → compte anonymisé

- [ ] AC14 — Notifications E2E (AC: #14)
  - [ ] Créer `e2e/notifications.spec.ts`
  - [ ] Test : affichage des notifications non lues
  - [ ] Test : marquage comme lu après clic

- [ ] Nettoyage & CI (AC: #1)
  - [ ] Supprimer les `test.fixme()` restants ou les convertir en tests actifs
  - [ ] Vérifier que `npx playwright test` passe sans erreur sur l'environnement configuré
  - [ ] Documenter les comptes de test requis (admin, membre AFFRANCHI, GRAND_FRÈRE, BOSS) dans `e2e/README.md`

## Dev Notes

### Architecture & Technical Stack

- **Next.js 16** App Router + React 19 + TypeScript strict
- **Auth.js v5** avec config split : `auth.config.ts` (Edge) + `auth.ts` (Node.js runtime avec Prisma/bcrypt)
- **Prisma 7** avec PostgreSQL en production (SQLite en dev)
- **TailwindCSS 4** + shadcn/ui
- **Playwright** déjà installé et configuré dans `playwright.config.ts` (cible : production VPS `https://ivoire-business-club.com`)

### Existing Playwright State

Le projet contient déjà 5 fichiers spec avec des `test.fixme()` :
- `e2e/auth-signup.spec.ts` — 5 tests (3 tiers signup + Google OAuth + validation)
- `e2e/bank-transfer.spec.ts` — 4 tests (virement display, submission, admin validate/reject)
- `e2e/documents.spec.ts` — 4 tests (upload, permissions, admin review, validation)
- `e2e/admin-flows.spec.ts` — 4 tests (admin login, verify, reject, manage subscriptions)
- `e2e/premium-gates.spec.ts` — 3 tests (AFFRANCHI blocked, BOSS access, upgrade path)

**Total : 20 tests `fixme()` à implémenter + ~20 nouveaux tests à créer.**

### Test Strategy — Production VPS Testing

Les tests E2E ciblent le site **déployé en production** sur le VPS Infomaniak. Ceci implique :
1. **Pas de seed/cleanup de DB** en production — utiliser des comptes de test pré-créés sur le VPS
2. **Tests idempotents** — chaque test doit nettoyer son état (supprimer ce qu'il crée) ou utiliser des données de test pré-existantes
3. **Credentials de test** : stocker dans `e2e/.env.test` (gitignored) ou variables d'environnement CI
4. **Comptes de test requis** sur le VPS :
   - `admin@ivoire-business-club.com` — rôle ADMIN, tier BOSS, abonnement ACTIVE
   - `member-affranchi@test.com` — rôle MEMBER, tier AFFRANCHI, abonnement TRIAL
   - `member-grandfrere@test.com` — rôle MEMBER, tier GRAND_FRÈRE, abonnement ACTIVE
   - `member-boss@test.com` — rôle MEMBER, tier BOSS, abonnement ACTIVE
   - Compte supprimable pour test RGPD

### Auth Helper Pattern

```typescript
// e2e/fixtures/auth.ts
import { test as base, expect } from '@playwright/test';

type AuthFixtures = {
  adminPage: typeof base;
  memberPage: typeof base;
  bossPage: typeof base;
};

export const test = base.extend<AuthFixtures>({
  adminPage: async ({ page }, use) => {
    await page.goto('/auth/signin');
    await page.fill('[data-testid="email-input"]', process.env.E2E_ADMIN_EMAIL!);
    await page.fill('[data-testid="password-input"]', process.env.E2E_ADMIN_PASSWORD!);
    await page.click('[data-testid="signin-button"]');
    await page.waitForURL('/dashboard');
    await use(page);
  },
  // ... similar for member and boss
});
```

### `data-testid` Strategy

Ajouter des attributs `data-testid` sur les éléments clés du site pour des sélecteurs stables :
- Formulaires : `email-input`, `password-input`, `signin-button`, `signup-button`
- Navigation : `nav-dashboard`, `nav-profile`, `nav-admin`
- Tiers : `tier-affranchi-card`, `tier-grandfrere-card`, `tier-boss-card`
- Opportunités : `opportunity-card`, `opportunity-title`, `opportunity-verify-btn`
- Premium gates : `premium-blocked-panel`, `upgrade-cta`

**ATTENTION** : L'ajout de `data-testid` est un changement minimal dans les composants React — utiliser le pattern `data-testid="..."` comme prop additionnelle sans modifier la logique existante.

### Guardrails Critiques (from architecture & previous stories)

1. **Auth.js v5 split config** : Le middleware importe UNIQUEMENT de `auth.config.ts` (Edge Runtime). Ne pas importer de `auth.ts` dans les tests côté navigateur.
2. **Next.js 16 strict JSX** : Pas de `&&` dans les expressions JSX — utiliser des ternaires `condition ? <Component /> : null`.
3. **Prisma 7** : Import depuis `@/generated/prisma/client`, pas de `@prisma/client` direct.
4. **Premium access gate** : Toutes les pages dashboard DOIVENT appeler `getUserPremiumAccess(session.user.id)` et rendre `<PremiumAccessBlockedPanel>` pour les non-abonnés. Les tests E2E doivent vérifier ce comportement.
5. **Middleware ne bloque PAS les routes API** : Les API routes sont protégées par `auth()` côté handler, pas par le middleware. Les tests API directs ne passent PAS par le middleware.
6. **Comptes ADMIN** : L'admin est identifié par `isConfiguredAdminEmail()` — l'email admin doit correspondre à la config pour que les routes admin fonctionnent.

### File Structure

```
e2e/
├── fixtures/
│   ├── auth.ts          # Login helpers (admin, member, boss)
│   └── seed.ts          # Test data helpers (opportunities, documents)
├── helpers/
│   └── selectors.ts     # Reusable data-testid selectors
├── admin-flows.spec.ts  # → AC9 (remplacer fixme)
├── auth-signup.spec.ts  # → AC2 (remplacer fixme)
├── bank-transfer.spec.ts # → AC3 (remplacer fixme)
├── documents.spec.ts     # → AC5 (remplacer fixme)
├── premium-gates.spec.ts # → AC6 (remplacer fixme)
├── opportunities.spec.ts # → AC4 (nouveau)
├── matching-tags.spec.ts # → AC7 (nouveau)
├── reviews-reputation.spec.ts # → AC8 (nouveau)
├── landing-page.spec.ts  # → AC10 (nouveau)
├── navigation.spec.ts    # → AC11 (nouveau)
├── profile.spec.ts       # → AC12 (nouveau)
├── account-deletion.spec.ts # → AC13 (nouveau)
├── notifications.spec.ts  # → AC14 (nouveau)
├── .env.test.example     # Template des variables d'environnement requises
└── README.md             # Documentation des comptes de test et exécution
```

### Project Structure Notes

- Les tests E2E vivent dans `e2e/` à la racine du projet, comme configuré dans `playwright.config.ts`
- Les tests unitaires Vitest restent dans `src/` co-localisés avec les fichiers source (81 fichiers `.test.ts/.test.tsx`)
- Les composants React peuvent nécessiter l'ajout de `data-testid` pour des sélecteurs stables — modifications minimes, pas de refactoring

### References

- [Source: playwright.config.ts] — Configuration existante, cible production VPS
- [Source: e2e/*.spec.ts] — 5 fichiers spec avec tests `fixme()` à implémenter
- [Source: _bmad-output/planning-artifacts/architecture.md] — Stack technique, patterns Auth.js, middleware
- [Source: _bmad-output/planning-artifacts/epics.md] — Exigences fonctionnelles FR1-FR45
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — Dépendances reportées
- [Source: src/lib/auth.ts] — Configuration Auth.js complète avec providers
- [Source: src/middleware.ts] — Middleware Edge-compatible
- [Source: prisma/schema.prisma] — Modèles de données (User, Subscription, Opportunity, etc.)
- [Source: src/lib/opportunity-visibility.ts] — Logique de visibilité des deals par tier
- [Source: src/app/(admin)/admin/*/page.tsx] — Pages admin existantes

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List