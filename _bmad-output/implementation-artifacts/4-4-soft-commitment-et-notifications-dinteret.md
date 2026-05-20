---
Story: "4.4"
StoryKey: "4-4-soft-commitment-et-notifications-dinteret"
Title: "Soft Commitment et Notifications d'Intérêt"
Status: "review"
Priority: "P1"
Epic: "Epic 4 — Networking, Matching et WhatsApp"
FRs: ["FR29", "FR30"]
UXDRs: ["UX-DR5", "UX-DR15", "UX-DR30", "UX-DR31"]
NFRs: ["NFR-P2", "NFR-S5", "NFR-S9", "NFR-A1", "NFR-A2", "NFR-A3"]
Created: "2026-05-20"
---

# Story 4.4: Soft Commitment et Notifications d'Intérêt

Status: review

## Story

En tant que membre intéressé par un deal,
je veux marquer mon intérêt sans engagement financier,
afin de signaler au porteur de projet que je suis potentiellement intéressé.

## Acceptance Criteria

1. **Enregistrement du soft commitment — FR29**
   - Given un membre connecté sur la page détail d'un deal
   - When il clique sur « Intéressé(e) » (bouton ghost secondaire)
   - Then un soft commitment est enregistré en base avec `userId`, `opportunityId`, `createdAt`
   - And le bouton passe à « Intérêt enregistré » avec checkmark, en état disabled.

2. **Notification d'intérêt au porteur — FR30**
   - Given un membre ayant marqué son intérêt
   - When l'auteur du deal consulte ses notifications
   - Then il voit une notification : « [Nom du membre] est intéressé(e) par votre deal [Titre] ».

3. **Navigation depuis la notification vers le deal**
   - Given l'auteur du deal reçoit une notification d'intérêt
   - When il clique sur la notification
   - Then il est redirigé vers le détail du deal avec un indicateur du nombre d'intérêts enregistrés.

4. **Membre non connecté**
   - Given un membre non connecté
   - When il tente de cliquer sur « Intéressé(e) »
   - Then une modale l'invite à s'inscrire ou se connecter.

## Tasks / Subtasks

- [x] **Ajouter le modèle Prisma de soft commitment sans dupliquer les notifications existantes** (AC: #1, #2, #3)
  - [x] Ajouter un modèle recommandé `OpportunityInterest` dans `prisma/schema.prisma` avec `id`, `userId`, `opportunityId`, `createdAt`, relations `user` et `opportunity`, `@@unique([userId, opportunityId])`, `@@index([opportunityId, createdAt])`, `@@index([userId, createdAt])`, `@@map("opportunity_interests")`.
  - [x] Ajouter les relations `User.opportunityInterests` et `Opportunity.interests`.
  - [x] Créer une migration additive dédiée, par exemple `prisma/migrations/20260520xxxxxx_add_opportunity_interests/migration.sql`.
  - [x] Préserver le modèle `Notification` déjà ajouté par Story 4.3; ne pas créer une seconde table de notifications.
  - [x] Utiliser une contrainte unique pour rendre le clic idempotent et empêcher plusieurs intérêts du même membre sur le même deal.

- [x] **Créer le flux serveur d'enregistrement d'intérêt** (AC: #1, #2)
  - [x] Créer une route handler ciblée, recommandée : `src/app/api/opportunities/[id]/interest/route.ts`, puisque `src/app/api/opportunities/[id]/route.ts` n'existe pas actuellement malgré les anciens hints.
  - [x] `POST` : exiger `auth()` depuis `@/lib/auth`; retourner `401` pour non authentifié, `404` si deal introuvable/non visible, `403` si accès premium/tier insuffisant, `409` ou succès idempotent si intérêt déjà enregistré.
  - [x] Vérifier que le deal est `VERIFIED` pour les membres non auteurs/non admins; auteurs/admins peuvent voir leurs propres deals mais ne doivent pas marquer leur propre intérêt.
  - [x] Appliquer le même gate que la page détail : `getUserPremiumAccess(session.user.id)` + `canUserAccessOpportunity(opportunity.requiredTier, currentUser.tier)` sauf auteur/admin si une exception existante est préservée.
  - [x] Dans une transaction Prisma, créer l'`OpportunityInterest` puis créer une `Notification` pour l'auteur avec : `type: "OPPORTUNITY_INTEREST"`, `title`/`body` contenant exactement « [Nom du membre] est intéressé(e) par votre deal [Titre] », `href: "/dashboard/opportunities/[id]?highlight=interests"`.
  - [x] Ne pas notifier l'auteur quand l'auteur clique sur son propre deal; retourner un message français clair.
  - [x] Gérer la course concurrente : si l'unique constraint est violée, ne pas créer de notification dupliquée.

- [x] **Ajouter le bouton « Intéressé(e) » sur la page détail existante** (AC: #1, #3)
  - [x] Modifier `src/app/(dashboard)/dashboard/opportunities/[id]/page.tsx` en conservant strictement : `auth()` redirect, `getUserPremiumAccess` + `PremiumAccessBlockedPanel`, visibilité tier, documents, TrustBadge, `VerificationTimeline`, `WhatsAppCTA`, suppression auteur.
  - [x] Charger `_count.interests` et l'intérêt du membre courant (`interests: { where: { userId: session.user.id }, select: { id: true } }`) dans la requête du deal.
  - [x] Afficher un indicateur lisible près des CTA ou du titre : `X intérêt(s) enregistré(s)`; si `searchParams.highlight === "interests"`, mettre l'indicateur en évidence visuellement et de façon accessible.
  - [x] Ajouter un client component dédié, recommandé `src/components/features/deals/interest-button.tsx`, pour gérer l'état local du bouton, l'appel `POST`, les erreurs et l'état disabled après succès.
  - [x] Bouton : variant secondaire ghost/outline selon les composants disponibles, label initial « Intéressé(e) », label succès « Intérêt enregistré » avec checkmark Lucide, disabled après enregistrement.
  - [x] Ne jamais utiliser `condition && <Component />` dans JSX; pré-calculer les booléens et rendre via ternaires.

- [x] **Créer/compléter l'affichage des notifications membre** (AC: #2, #3)
  - [x] Créer une destination dashboard simple si absente : `src/app/(dashboard)/notifications/page.tsx` ou `src/app/(dashboard)/dashboard/notifications/page.tsx` en cohérence avec la navigation existante. Recommandation : `/dashboard/notifications` pour rester sous le dashboard actuel.
  - [x] La page notifications doit utiliser `auth()`, `getUserPremiumAccess(session.user.id)` et `PremiumAccessBlockedPanel` comme toutes les pages dashboard.
  - [x] Charger les notifications du membre courant, tri `createdAt desc`, avec état lu/non lu et lien `href`.
  - [x] Afficher le message d'intérêt exact dans la liste; cliquer sur la notification doit naviguer vers le détail du deal et préserver le query param `?highlight=interests`.
  - [x] Ajouter un lien « Notifications » dans `src/app/(dashboard)/layout.tsx` sans casser la bottom nav mobile; si la bottom nav n'a que 4 slots, garder Accueil/Opportunités/Matching/Profil et ajouter Notifications dans la sidebar ou le header.
  - [x] Optionnel mais recommandé : créer `src/app/api/notifications/[id]/read/route.ts` ou un server action pour marquer `readAt` au clic si le pattern reste simple et testé.

- [x] **Gérer le cas non connecté sans casser les routes protégées** (AC: #4)
  - [x] Ne pas supprimer le redirect/gate du dashboard detail page; les dashboard pages doivent rester protégées.
  - [x] Réutiliser le même `InterestButton` en mode `isAuthenticated={false}` dans un contexte public-safe si créé/présent (ex. teaser/detail public), ou transformer les cartes teaser publiques pour afficher une action « Intéressé(e) » qui ouvre une modale d'inscription sans exposer les détails premium.
  - [x] Si une page détail publique est ajoutée, elle doit exposer uniquement les champs teaser autorisés (`title`, `author.location`) et le CTA/modal; aucun montant, documents, téléphone, description complète ou tags premium.
  - [x] La modale doit inviter clairement à « S'inscrire » et « Se connecter », avec liens vers `/auth/signup` et `/auth/signin`, focus trap accessible et fermeture clavier `Escape` via composant Dialog/Sheet existant.

- [x] **Email / side effects : garder le MVP non bloquant** (AC: #2)
  - [x] L'AC exige une notification consultable; persister dans `Notification` est obligatoire.
  - [x] Si un email est ajouté via `src/lib/email.ts`, créer `sendOpportunityInterestEmail` séparé, mais l'échec email ne doit jamais annuler l'intérêt ou la notification in-app.
  - [x] Journaliser seulement des erreurs sanitizées (`sanitizeError`) et jamais de données sensibles.

- [x] **Tests et vérification** (AC: all)
  - [x] Tests Prisma/schema ou route : premier clic crée `OpportunityInterest` + `Notification`, second clic ne crée rien en double.
  - [x] Tests route intérêt : 401 non connecté, 404 deal invisible/non vérifié, 403 abonnement/tier insuffisant, refus de l'auteur, succès membre éligible.
  - [x] Tests bouton : label initial, loading state, succès « Intérêt enregistré » + checkmark + disabled, état déjà intéressé au chargement, erreur française affichée.
  - [x] Tests page détail : count d'intérêts affiché, highlight via `?highlight=interests`, `WhatsAppCTA` et documents existants préservés.
  - [x] Tests notifications : auteur voit le message exact, lien vers `/dashboard/opportunities/[id]?highlight=interests`, non-auteurs ne voient pas la notification.
  - [x] Tests public/non-auth : clic « Intéressé(e) » ouvre la modale inscription/connexion sans appeler l'API.
  - [x] Exécuter au minimum les tests ciblés avec `npx vitest run ...`, puis `npm run build`. Noter tout lint global pré-existant séparément si hors scope.

## Dev Notes

### Scope critique

Cette story est le dernier incrément d'Epic 4. Elle doit ajouter le soft commitment et rendre les notifications d'intérêt réellement consultables. Ne pas refondre le matching, les tags, WhatsApp, la vérification des deals ou les abonnements. Les notifications in-app existent déjà en base depuis Story 4.3; cette story doit les réutiliser et compléter leur affichage si nécessaire.

### État actuel du code à préserver

- `prisma/schema.prisma` contient déjà `User`, `Opportunity`, `UserTag`, `OpportunityTag` et `Notification`. Aucun modèle `Interest`, `SoftCommitment` ou `OpportunityInterest` n'existe. [Source: prisma/schema.prisma]
- `Notification` contient `id`, `userId`, `type`, `title`, `body`, `href`, `readAt`, `createdAt`, relation `User.notifications`, index `[userId, readAt, createdAt]`. Réutiliser ce modèle pour FR30. [Source: prisma/schema.prisma]
- `Opportunity` a déjà `authorId`, `requiredTier`, `verificationStatus`, `documents`, `tags`, `verificationApprovals`; ajouter seulement une relation `interests`. [Source: prisma/schema.prisma]
- La page détail `src/app/(dashboard)/dashboard/opportunities/[id]/page.tsx` est un Server Component protégé : `auth()` puis redirect `/auth/signin`, `getUserPremiumAccess`, `PremiumAccessBlockedPanel`, contrôle auteur/admin, `canUserAccessOpportunity`, affichage TrustBadge/TagChips/WhatsAppCTA/VerificationTimeline/DocumentUploadSection. Les modifications doivent être incrémentales. [Source: src/app/(dashboard)/dashboard/opportunities/[id]/page.tsx]
- Il n'existe pas actuellement de `src/app/api/opportunities/[id]/route.ts`. Le route handler à créer doit donc être un sous-endpoint ciblé (`[id]/interest/route.ts`) plutôt que de supposer un fichier absent. [Source: repository scan]
- Il n'existe pas de page notifications dédiée dans `src/app`; Story 4.3 persiste des notifications de matching mais n'a pas créé d'UI de consultation. Cette story doit combler ce gap pour que l'auteur puisse « consulter ses notifications ». [Source: repository scan]
- Le layout dashboard a une sidebar desktop et une bottom nav mobile avec 4 items. Ajouter Notifications sans dégrader le mobile. [Source: src/app/(dashboard)/layout.tsx]

### Previous Story Intelligence — Story 4.3

- Story 4.3 a ajouté `Notification` et l'utilise pour `OPPORTUNITY_MATCHED` lors du passage d'un deal à `VERIFIED`. Réutiliser la même table et le même style de lien `href: /dashboard/opportunities/[id]`. [Source: src/app/api/admin/opportunities/[id]/verify/route.ts]
- Les correctifs CR de Story 4.3 sont déjà appliqués dans le dernier commit : `/dashboard/matching` utilise `getUserPremiumAccess` + `PremiumAccessBlockedPanel`, et les notifications de matching sont protégées contre la re-notification quand `currentStatus === "VERIFIED"`. Ne pas régresser ces garde-fous. [Source: git log b2ede5c] [Source: src/app/(dashboard)/dashboard/matching/page.tsx] [Source: src/app/api/admin/opportunities/[id]/verify/route.ts]
- `DealCard` garde les tags hors du lien principal pour éviter les liens imbriqués. Si l'intérêt est ajouté à une carte à l'avenir, il doit rester hors du `<Link>` de carte. [Source: src/components/features/deals/deal-card.tsx]
- Pattern de notification non bloquante : les emails de matching sont en `Promise.allSettled`, les erreurs sont loguées et ne bloquent pas le statut du deal. Appliquer la même philosophie si un email d'intérêt est ajouté. [Source: src/app/api/admin/opportunities/[id]/verify/route.ts]

### Architecture & contraintes obligatoires

- Stack constatée : Next.js 16.2.6, React 19.2.4, Prisma 7.8.0, Auth.js v5 beta.31, TailwindCSS 4, Base UI/shadcn-style components, Vitest 4. [Source: package.json]
- Prisma 7 : datasource sans `url` dans `schema.prisma`; le client généré est sous `src/generated/prisma`; les requêtes applicatives passent par `src/lib/prisma.ts`. [Source: _bmad-output/planning-artifacts/architecture.md#Technical-Constraints]
- Auth.js v5 split config : utiliser `auth()` depuis `@/lib/auth` dans Server Components/Route Handlers; ne jamais importer Prisma/bcrypt dans `auth.config.ts` ou middleware Edge. [Source: _bmad-output/planning-artifacts/architecture.md#Authentication-Security]
- API Next.js Route Handlers : succès `{ data: T }`, erreurs françaises `{ error, code?, details? }`, statuts HTTP adaptés. [Source: _bmad-output/planning-artifacts/architecture.md#API-Communication-Patterns]
- Dashboard premium gate obligatoire : chaque page dashboard créée/modifiée qui affiche des contenus premium doit appeler `getUserPremiumAccess` et rendre `PremiumAccessBlockedPanel` si `!hasAccess`. [Source: existing opportunities/matching pages]
- Next.js 16 strict JSX : ne pas utiliser `condition && <Component />`; utiliser ternaires et booléens pré-calculés. [Source: _bmad-output/planning-artifacts/architecture.md#JSX-Boolean-Guardrail]
- UI en français, mobile-first, WCAG AA; utiliser tokens existants (`bg-card`, `border`, `text-muted-foreground`, `primary`, `muted`) pour dark mode. [Source: _bmad-output/planning-artifacts/ux-spec.md#Responsive-Design--Accessibility]

### Data contract recommandé

```prisma
model OpportunityInterest {
  id            String   @id @default(cuid())
  userId        String
  opportunityId String
  createdAt     DateTime @default(now())

  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  opportunity Opportunity @relation(fields: [opportunityId], references: [id], onDelete: Cascade)

  @@unique([userId, opportunityId])
  @@index([opportunityId, createdAt])
  @@index([userId, createdAt])
  @@map("opportunity_interests")
}
```

Notification payload recommandé :

```ts
const message = `${member.name} est intéressé(e) par votre deal ${opportunity.title}`;
await prisma.notification.create({
  data: {
    userId: opportunity.authorId,
    type: "OPPORTUNITY_INTEREST",
    title: message,
    body: message,
    href: `/dashboard/opportunities/${opportunity.id}?highlight=interests`,
  },
});
```

### UX attendue

- Le bouton « Intéressé(e) » est secondaire par rapport au WhatsApp CTA. WhatsApp reste l'action primaire de contact; l'intérêt est un signal faible et non financier. [Source: _bmad-output/planning-artifacts/ux-spec.md#Deal-Detail-Page]
- Après clic réussi, le retour doit être immédiat : checkmark, label « Intérêt enregistré », disabled, et idéalement incrément local du compteur. [Source: _bmad-output/planning-artifacts/ux-spec.md#Success-States]
- Le compteur d'intérêts est surtout utile à l'auteur du deal mais peut être visible aux membres comme signal social discret si le produit l'accepte. L'AC exige au moins qu'il apparaisse lors de la redirection depuis une notification.
- Pour non connecté : une modale d'inscription/connexion doit être claire, sans jargon, avec liens `/auth/signup` et `/auth/signin`; ne pas exposer de détails premium en public. [Source: _bmad-output/planning-artifacts/ux-spec.md#Auth-Pages]

### Points de régression à éviter

- Ne pas permettre aux membres sans abonnement actif d'enregistrer un intérêt sur un deal premium.
- Ne pas permettre à un membre d'exprimer son intérêt pour un deal qu'il ne peut pas consulter selon `requiredTier`.
- Ne pas permettre à l'auteur d'un deal de s'auto-notifier.
- Ne pas créer de notifications dupliquées sur double clic, retry réseau ou requêtes concurrentes.
- Ne pas envoyer de notification si la création de l'intérêt échoue.
- Ne pas rendre les notifications d'un autre utilisateur consultables en changeant l'URL.
- Ne pas créer un système de messagerie interne, WebSockets, SSE ou push : la story demande des notifications consultables, pas du temps réel.
- Ne pas casser les flows existants : documents visibles seulement selon autorisation, WhatsAppCTA préservé, suppression auteur préservée, matching/tags préservés.

### Références

- [Source: _bmad-output/planning-artifacts/epics.md#Story-4.4]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-4]
- [Source: _bmad-output/planning-artifacts/prd.md#FR29-FR30]
- [Source: _bmad-output/planning-artifacts/ux-spec.md#Journey-D--Matching--Contact]
- [Source: _bmad-output/planning-artifacts/ux-spec.md#Deal-Detail-Page]
- [Source: _bmad-output/planning-artifacts/ux-spec.md#Interaction-States]
- [Source: _bmad-output/planning-artifacts/architecture.md#Technical-Constraints]
- [Source: _bmad-output/planning-artifacts/architecture.md#API-Communication-Patterns]
- [Source: _bmad-output/implementation-artifacts/4-3-matching-basique-par-tags.md]
- [Source: _bmad-output/implementation-artifacts/deferred-work.md]
- [Source: prisma/schema.prisma]
- [Source: src/app/(dashboard)/dashboard/opportunities/[id]/page.tsx]
- [Source: src/app/(dashboard)/dashboard/matching/page.tsx]
- [Source: src/app/api/admin/opportunities/[id]/verify/route.ts]
- [Source: src/components/features/deals/deal-card.tsx]
- [Source: src/lib/subscription-access.ts]

## Project Structure Notes

- New model and migration belong in `prisma/schema.prisma` and `prisma/migrations/**/migration.sql`.
- New mutation endpoint belongs under `src/app/api/opportunities/[id]/interest/route.ts` unless the implementer first creates a general `[id]/route.ts` for a broader purpose.
- New client component belongs in `src/components/features/deals/interest-button.tsx` with colocated test if practical.
- New notifications UI belongs under the dashboard route group and must be premium-gated.
- Existing likely modified files: `prisma/schema.prisma`, a migration, `src/app/(dashboard)/dashboard/opportunities/[id]/page.tsx`, `src/app/(dashboard)/layout.tsx`, `src/lib/email.ts` only if email is added.
- No architectural conflict detected, but AC4 requires careful public-safe UX because dashboard routes currently redirect unauthenticated users.

## Dev Agent Record

### Agent Model Used

GPT-5.5 (OpenAI Codex)

### Debug Log References

- 2026-05-20 — Loaded BMAD dev-story workflow, story context, sprint status, architecture notes, and existing opportunity/notification code.
- 2026-05-20 — Ran `npx prisma migrate dev --name add-opportunity-interest` and `npx prisma generate`.
- 2026-05-20 — Ran targeted Vitest suite for interest route, button, opportunity detail, notifications page, and public teasers: PASS (20) FAIL (0).
- 2026-05-20 — Ran `npm run build`: PASS. Warning only: deprecated Next.js middleware convention and missing Upstash env disables rate limiting during build.
- 2026-05-20 — Ran full `npx vitest run`: PASS (301) FAIL (0).
- 2026-05-20 — Ran `npm run lint`: FAIL due to pre-existing issues in files outside this story scope (`new/page.tsx`, auth/profile components/tests, `not-found.tsx`, `middleware.ts`); no new story files reported.

### Completion Notes List

- Added additive Prisma `OpportunityInterest` model with user/opportunity relations, uniqueness, indexes, and migration while preserving the existing `Notification` model.
- Implemented authenticated `POST /api/opportunities/[id]/interest` with premium/tier visibility checks, self-interest refusal, idempotent duplicate handling, and transactional interest + in-app author notification creation.
- Updated opportunity detail page to load current-user interest state and `_count.interests`, render an accessible highlighted interest count for notification deep links, and add the soft-commitment CTA next to the existing WhatsApp CTA without regressing document/trust/timeline/delete flows.
- Added reusable `InterestButton` client component with loading, disabled success state, French errors, checkmark success label, and signup/signin modal for anonymous users.
- Added `/dashboard/notifications` premium-gated page, read-on-click notification item, idempotent read API, and desktop sidebar navigation entry, preserving the 4-slot mobile bottom navigation.
- Updated public opportunity teasers to expose only teaser fields while offering an anonymous interest CTA that opens the signup/signin modal without calling the API.
- Added route, component, page, notification, and public teaser tests covering the main acceptance criteria and edge cases.

### File List

- `_bmad-output/implementation-artifacts/4-4-soft-commitment-et-notifications-dinteret.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `dev.db`
- `prisma/migrations/20260520143031_add_opportunity_interest/migration.sql`
- `prisma/schema.prisma`
- `src/app/(dashboard)/dashboard/notifications/page.test.tsx`
- `src/app/(dashboard)/dashboard/notifications/page.tsx`
- `src/app/(dashboard)/dashboard/opportunities/[id]/page.test.tsx`
- `src/app/(dashboard)/dashboard/opportunities/[id]/page.tsx`
- `src/app/(dashboard)/layout.tsx`
- `src/app/api/notifications/[id]/read/route.test.ts`
- `src/app/api/notifications/[id]/read/route.ts`
- `src/app/api/opportunities/[id]/interest/route.test.ts`
- `src/app/api/opportunities/[id]/interest/route.ts`
- `src/components/features/deals/interest-button.test.tsx`
- `src/components/features/deals/interest-button.tsx`
- `src/components/features/notifications/notification-item.test.tsx`
- `src/components/features/notifications/notification-item.tsx`
- `src/components/landing/opportunity-teasers.test.tsx`
- `src/components/landing/opportunity-teasers.tsx`

### Change Log

- 2026-05-20 — CS created ready-for-dev story context for soft commitments and interest notifications.
- 2026-05-20 — Implemented soft commitments, in-app interest notifications, dashboard notification UI, public anonymous signup/signin modal, tests, and validation updates; story ready for review.
