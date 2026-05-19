---
Story: "3.4"
StoryKey: "3-4-visibilite-des-opportunites-tier-et-teaser-publics"
Title: "Visibilité des Opportunités — Tier et Teaser Publics"
Status: ready-for-dev
Priority: "P0"
Epic: "Epic 3 — Marketplace d'Opportunités et Vérification"
FRs: ["FR19", "FR20", "FR21", "FR23", "FR24", "FR25", "FR41", "FR44", "FR45"]
NFRs: ["NFR-P1", "NFR-P2", "NFR-S5", "NFR-S8", "NFR-A1", "NFR-A3", "NFR-I1"]
UXDRs: ["UX-DR4", "UX-DR18", "UX-DR19", "UX-DR20"]
Created: "2026-05-19"
---

# Story 3.4: Visibilité des Opportunités — Tier et Teaser Publics

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

En tant que membre ou visiteur,
je veux consulter les opportunités selon mes droits d'accès,
afin de découvrir les deals adaptés à mon tier ou les teasers publics.

## Acceptance Criteria

1. **Teasers publics pour visiteurs non connectés**
   - Given un visiteur non connecté sur `/` ou `/opportunities`,
   - When il consulte les deals,
   - Then seuls les teasers sont visibles : titre + localisation uniquement (FR20), avec un overlay « Devenez membre pour voir les détails ».

2. **Feed Affranchis avec filtrage catégorie**
   - Given un membre Affranchis connecté,
   - When il consulte le feed de deals,
   - Then il voit les deals `VERIFIED` accessibles au tier Affranchis, filtrés par catégorie avec des chips horizontaux scrollables (UX-DR18).

3. **Feed Boss incluant les tiers inférieurs**
   - Given un membre Boss connecté,
   - When il consulte le feed,
   - Then il voit les deals exclusifs Boss + ceux des tiers inférieurs.

4. **DealCard mobile complète**
   - Given un membre sur mobile,
   - When il consulte le feed,
   - Then les `DealCard` s'affichent en liste verticale avec : thumbnail 16:9, titre, localisation + montant, `TrustBadge`, compteur documents, `WhatsAppCTA` (FR19, UX-DR4).

5. **EmptyState sans résultats**
   - Given le feed de deals,
   - When aucun deal ne correspond aux critères,
   - Then le composant `EmptyState` s'affiche : « Aucun deal ne correspond à vos critères » + bouton « Réinitialiser les filtres ».

## Tasks / Subtasks

- [ ] Définir la règle de visibilité par tier sans casser les données existantes (AC: #2, #3)
  - [ ] Ajouter un champ Prisma `requiredTier Tier @default(AFFRANCHI)` sur `Opportunity` si absent, avec migration et `npx prisma generate`.
  - [ ] Backfiller les opportunités existantes en `AFFRANCHI` pour conserver leur visibilité actuelle.
  - [ ] Créer une fonction pure de domaine, par exemple `src/lib/opportunity-visibility.ts`, avec `TIER_RANK`, `canUserAccessOpportunity(requiredTier, userTier)`, `getAccessibleTierValues(userTier)`, et `buildOpportunityVisibilityWhere(userTier)`.
  - [ ] Ne jamais confondre `User.tier` et `Subscription.tier` : pour ce scope, la session/JWT et `User.tier` sont la source de tier, tandis que l'abonnement actif reste la source d'accès premium.
  - [ ] Prévoir que `BOSS` accède à `BOSS`, `GRAND_FRERE`, `AFFRANCHI`; `GRAND_FRERE` à `GRAND_FRERE`, `AFFRANCHI`; `AFFRANCHI` uniquement à `AFFRANCHI`.

- [ ] Mettre à jour les queries serveur et API pour appliquer `VERIFIED + tier` (AC: #2, #3)
  - [ ] Modifier `src/app/(dashboard)/opportunities/page.tsx` pour charger uniquement les opportunités `VERIFIED` dont `requiredTier` est dans les tiers accessibles au membre, plus les propres opportunités de l'auteur si le feed privé existant doit continuer à les montrer.
  - [ ] Modifier `src/app/api/opportunities/route.ts` avec le même filtre pour les membres non-admins ; garder les admins capables de tout voir si l'API est utilisée en back-office.
  - [ ] Modifier `src/app/(dashboard)/opportunities/[id]/page.tsx` pour bloquer (`notFound()` ou panneau français) un membre non auteur/non admin si le deal n'est pas `VERIFIED` ou si `requiredTier` dépasse son tier.
  - [ ] Ne jamais renvoyer `description`, `amount`, documents, `rejectionNote`, notes admin, ou URLs signées R2 à un visiteur public.
  - [ ] Garder FR18 de Story 3.3 : `REJECTED` reste visible uniquement par auteur et admins, jamais dans le feed public/membre.

- [ ] Créer le feed public `/opportunities` et intégrer les teasers à la landing (AC: #1)
  - [ ] Créer `src/app/(public)/opportunities/page.tsx` si la route n'existe pas, accessible sans session.
  - [ ] Modifier `src/app/(public)/page.tsx` pour inclure une section teaser deals entre Hero/trust/pricing selon l'UX, sans transformer toute la landing.
  - [ ] Query publique : `verificationStatus: "VERIFIED"`, champs minimum `id`, `title`, `location`, éventuellement `category`/`requiredTier` pour badges non sensibles ; pas de montant, description, auteur contact, documents, ni WhatsApp.
  - [ ] Teaser card : afficher titre + localisation uniquement, overlay « Devenez membre pour voir les détails », CTA vers `/auth/signup` ou `/pricing`.
  - [ ] Utiliser une limite raisonnable pour la landing (3–5 teasers) et une liste paginable ou limitée sur `/opportunities` pour éviter une landing lente (NFR-P1).

- [ ] Construire/réutiliser les composants DealCard, TrustBadge, WhatsAppCTA, EmptyState et CategoryFilterChips (AC: #2, #4, #5)
  - [ ] Chercher d'abord les composants existants. `DocumentRow` existe déjà ; aucun `TrustBadge`, `DealCard`, `WhatsAppCTA`, `EmptyState` dédié n'a été trouvé dans `src/components` lors du story creation.
  - [ ] Créer les composants dans `src/components/features/deals/` ou `src/components/shared/` selon leur réutilisabilité, en respectant les noms kebab-case existants (`deal-card.tsx`, `trust-badge.tsx`, `whatsapp-cta.tsx`, `empty-state.tsx`).
  - [ ] `DealCard` mobile : liste verticale, thumbnail 16:9 avec placeholder si aucun modèle image n'existe, titre, localisation + montant, TrustBadge, paperclip + document count, WhatsAppCTA.
  - [ ] `TrustBadge` MVP : pour cette story, afficher au minimum « Argent » pour `VERIFIED` par admin ; Story 3.5 affinera Bronze/Argent/Or. Ne pas implémenter la double-vérification complète hors scope.
  - [ ] `WhatsAppCTA` : réutiliser `src/lib/whatsapp.ts` (`normalizeWhatsAppNumber`, `buildWhatsAppSupportLink`) et créer un CTA désactivé avec explication si `author.phone` est absent.
  - [ ] `EmptyState` : props `title`, `description?`, `action?`; pour ce feed, titre exact « Aucun deal ne correspond à vos critères » et action « Réinitialiser les filtres ».

- [ ] Implémenter les filtres catégories avec chips horizontaux scrollables (AC: #2, #5)
  - [ ] Utiliser les catégories Prisma existantes : `INVESTISSEMENT`, `BUSINESS`, `PARTENARIAT`, `IMMOBILIER`.
  - [ ] Chips en client component minimal (`"use client"`) qui met à jour l'URL (`?category=...`) ou filtre une liste déjà sérialisée ; privilégier l'URL pour préserver SSR/RSC et partager les liens.
  - [ ] Row mobile : `overflow-x-auto`, touch targets ≥44px, état actif rempli `--primary`, focus visible.
  - [ ] Ajouter « Toutes » et un bouton/CTA de reset qui nettoie les paramètres de filtre.
  - [ ] Vérifier l'état vide après filtre et pas seulement quand la table est vide.

- [ ] Protéger les détails et documents selon auth + subscription + tier (AC: #1-#4)
  - [ ] Le détail premium `/dashboard/opportunities/[id]` exige une session et un abonnement actif existant (`getUserPremiumAccess`) pour les non-auteurs/non-admins.
  - [ ] En cas d'abonnement inactif, conserver `PremiumAccessBlockedPanel`; en cas de tier insuffisant, afficher une explication française avec CTA vers `/pricing` ou `notFound()` si l'équipe préfère ne pas révéler l'existence du deal.
  - [ ] Les documents ne doivent rester visibles/previewables que pour les utilisateurs autorisés par les endpoints Story 3.2 ; ne pas créer un second système de preview.
  - [ ] Le feed public et les teaser cards ne doivent jamais appeler les endpoints preview/download documents.

- [ ] Ajouter les tests et vérifications (AC: #1-#5)
  - [ ] Tests unitaires pour `opportunity-visibility`: rang des tiers, Boss voit tiers inférieurs, Affranchi ne voit pas Boss, valeur inconnue refusée proprement.
  - [ ] Tests page/API feed : visiteur public ne reçoit que title/location ; membre Affranchi ne voit que `VERIFIED + AFFRANCHI`; Boss voit `VERIFIED + BOSS/GRAND_FRERE/AFFRANCHI`; non-VERIFIED exclus sauf auteur/admin selon le flux privé préservé.
  - [ ] Tests UI pour chips catégories, reset EmptyState, teaser overlay, `DealCard` document count, WhatsApp disabled si téléphone manquant.
  - [ ] Exécuter `./node_modules/.bin/prisma validate`, `npx vitest run`, `npm run build`, et `npm run lint` si possible. Noter les lint préexistants séparément.
  - [ ] Respecter la guardrail Next.js 16 du projet : en JSX, utiliser `condition ? <Comp /> : null`, jamais `condition && <Comp />`.

## Dev Notes

### Contexte existant à préserver

- Stories 3.1 à 3.3 sont done. Le modèle `Opportunity`, l'upload de documents, et le workflow Kanban admin existent déjà.
- `Opportunity` actuel contient `authorId`, `title`, `description`, `category`, `amount`, `requiresDoubleVerification`, `verificationStatus`, `verifiedAt`, `verifiedById`, `rejectionNote`, `reviewNotes`, `adminNote`, `documents`. Il ne contient pas encore de champ de localisation propre à l'opportunité dans le schema lu ; le contexte utilisateur indique `location`, mais le code actuel s'appuie plutôt sur `author.location`. Si `Opportunity.location` est absent au moment d'implémenter, choisir une des deux stratégies et la documenter : ajouter `location String?` avec migration, ou utiliser `author.location` comme localisation teaser/feed. Ne pas afficher une valeur inventée.
- `User` contient `tier`, `role`, `phone`, `location`; la session JWT contient `id`, `role`, `tier` selon le contexte fourni. Le code existant fait souvent un lookup Prisma du user courant pour `role`; c'est acceptable, mais éviter les lookups redondants si les claims session suffisent.
- `getUserPremiumAccess(userId)` existe dans `src/lib/subscription-access.ts` et ne retourne que `{ hasAccess }` basé sur une subscription `ACTIVE`. Ne pas le remplacer par une logique tier ; composer abonnement actif + tier.
- `src/app/(dashboard)/opportunities/page.tsx` est actuellement une page serveur protégée qui liste les opportunités, avec filtre Story 3.3 : admin voit tout, membre voit `VERIFIED` ou ses propres deals. Elle a déjà un état vide basique, document count et status labels. Cette story doit l'étendre, pas réécrire le flux auteur/admin sans besoin.
- `src/app/(dashboard)/opportunities/[id]/page.tsx` protège déjà les non-auteurs contre les non-`VERIFIED`, affiche `PremiumAccessBlockedPanel`, et ne donne `DocumentUploadSection` qu'aux auteurs/admins. Ajouter la vérification tier avant de montrer les détails complets.
- `src/app/api/opportunities/route.ts` possède `GET`/`POST`; `GET` retourne actuellement `description`, `amount`, `verificationStatus`, `author`, `documentCount`, `rejectionNote` conditionnel. Pour toute route publique, créer une route séparée ou un mode explicitement public qui sérialise strictement title/location uniquement.
- `src/app/(public)/page.tsx` landing actuelle assemble `Hero`, `Mission`, `HowItWorks`, `TargetAudience`, `Benefits`, `Pricing`, `LeadMagnet`, `Footer`. Insérer les teasers comme section dédiée au lieu de tout mélanger dans Hero.
- `DocumentRow` et `DocumentUploadSection` existent sous `src/components/features/deals/`. Réutiliser leurs patterns et ne pas créer de nouveau système de documents.
- `src/lib/whatsapp.ts` existe pour normaliser les numéros et construire `wa.me` links. Réutiliser cette logique dans `WhatsAppCTA`.
- `src/lib/tier-config.ts` existe avec `MembershipTier`, `TIER_ORDER`, labels/prix/couleurs. Réutiliser ces labels plutôt que dupliquer les noms de tier.

### Contraintes architecture / sécurité

- Stack réelle lue dans `package.json`: Next.js 16.2.6, React 19.2.4, Prisma 7.8.0, Auth.js v5 beta.31, TailwindCSS 4, shadcn, Vitest, Resend, Sonner, Lucide.
- Prisma 7 : utiliser `src/lib/prisma.ts` comme singleton ; ce fichier importe le client depuis `@/generated/prisma/client`. Ne jamais instancier un second PrismaClient.
- Auth.js v5 : côté serveur/API utiliser `auth()` depuis `@/lib/auth`. Ne jamais importer Prisma/bcrypt dans `auth.config.ts` ou middleware Edge.
- API pattern : succès `NextResponse.json({ data })`; erreur `NextResponse.json({ error, code? }, { status })`, messages français, status 401/403/404/500 cohérents.
- NFR-S8 : ne pas logger titres de deals, descriptions, numéros de téléphone, notes de rejet/admin, noms de fichiers, ni URLs R2 signées. Logger seulement IDs/statuts/codes d'erreur.
- Public teaser security: title + location only. No amount, no description, no author phone/email, no document metadata/count if l'équipe interprète strictement FR20; l'AC dit explicitement titre + localisation uniquement, donc garder le public minimal.
- Premium member security: même si une opportunité est `VERIFIED`, elle doit être masquée si `requiredTier` dépasse le tier du membre.
- Subscription access: FR14 bloque les contenus premium si abonnement inactif. Les teasers restent publics ; les détails, documents, WhatsApp contact et montant complet requièrent abonnement actif + tier suffisant.

### UX / accessibilité

- Tous les textes UI doivent rester en français (FR44/NFR-A3).
- Mobile-first : feed membre en liste verticale, cartes full-width, touch targets ≥44px, chips horizontaux scrollables.
- DealCard ne doit pas dépasser 5 signaux principaux visibles à la fois : thumbnail, titre, localisation+montant, trust badge, docs/WhatsApp CTA.
- Teaser public : overlay visible « Devenez membre pour voir les détails » avec contraste AA, carte cliquable vers signup/pricing, aucune interaction qui suggère que les détails sont accessibles sans connexion.
- Empty state : composant centré avec icône possible `SearchX`, titre exact, bouton reset. Ne jamais afficher une liste blanche sans explication.
- WhatsApp CTA : vert `#25D366`, réservé aux liens WhatsApp, ouvre `wa.me`; si pas de téléphone auteur, bouton désactivé + explication « Le numéro WhatsApp n'est pas renseigné. »
- TrustBadge : inclure texte + icône/couleur; la couleur ne doit jamais être le seul indicateur.
- Respecter `prefers-reduced-motion` si animations d'overlay/card sont ajoutées.

### Recommandations d'implémentation

- Modèle tier minimal recommandé : `Opportunity.requiredTier Tier @default(AFFRANCHI)`. Ne pas créer une table complexe de permissions pour ce MVP.
- Query membre recommandée :
  - `verificationStatus: "VERIFIED"`
  - `requiredTier: { in: getAccessibleTierValues(userTier) }`
  - `category` optionnel si searchParam valide
  - inclure `author: { select: { id, name, phone, location } }`, `_count.documents`, et uniquement les champs nécessaires au `DealCard`.
- Query publique recommandée :
  - `where: { verificationStatus: "VERIFIED" }`
  - `select: { id: true, title: true, author: { select: { location: true } } }` ou `location` si le champ est ajouté.
- Si `Opportunity.location` est ajouté, mettre à jour `opportunityCreateSchema` et le formulaire de création seulement si nécessaire ; sinon garder la story focalisée sur l'affichage en utilisant `author.location`.
- Le filtre catégorie devrait valider les searchParams contre l'enum Prisma pour éviter les erreurs ou injections de valeurs invalides.
- Pour la route publique `/opportunities`, ne pas la placer sous `(dashboard)` car le layout dashboard/middleware impose une session. Utiliser `(public)`.
- Préférer Server Components pour les chargements Prisma et un petit Client Component pour les chips si nécessaire. Éviter une grosse SPA de feed.
- Utiliser `Link` plutôt que `<a>` pour les routes internes touchées, sauf si un pattern existant impose autrement.
- En JSX, transformer tout nouveau rendu conditionnel en ternaire : `condition ? (...) : null`.

### Project Structure Notes

- Routes à modifier/créer probables :
  - UPDATE `src/app/(public)/page.tsx`
  - NEW `src/app/(public)/opportunities/page.tsx`
  - UPDATE `src/app/(dashboard)/opportunities/page.tsx`
  - UPDATE `src/app/(dashboard)/opportunities/[id]/page.tsx`
  - UPDATE `src/app/api/opportunities/route.ts`
- Composants probables :
  - NEW `src/components/features/deals/deal-card.tsx`
  - NEW `src/components/features/deals/trust-badge.tsx`
  - NEW `src/components/shared/whatsapp-cta.tsx` ou `src/components/features/deals/whatsapp-cta.tsx`
  - NEW `src/components/shared/empty-state.tsx`
  - NEW `src/components/features/deals/category-filter-chips.tsx`
  - NEW `src/components/landing/opportunity-teasers.tsx`
- Domaine/utils probables :
  - NEW `src/lib/opportunity-visibility.ts`
  - UPDATE `src/lib/validations.ts` if category/searchParam or new location/requiredTier schema is added.
- Database probable :
  - UPDATE `prisma/schema.prisma`
  - NEW migration under `prisma/migrations/` if `requiredTier`/`location` fields are added.
- Tests should follow existing co-located pattern (`*.test.ts(x)`) used in Story 3.3.

### Previous Story Intelligence

- Story 3.3 implemented `EN_COURS`, `rejectionNote`, admin Kanban, admin verification API, and stricter member visibility. Do not regress FR18/FR19 filters while adding tier logic.
- Story 3.3 review found JSON invalid handling and POST action interpretation bugs in the admin verify endpoint. For this story, validate query params and API modes explicitly; do not treat unknown values as valid defaults except safe reset to all categories.
- Story 3.2 fixed document metadata leaks. Public teasers and insufficient-tier members must not receive document metadata or signed URLs.
- Story 3.2/3.3 pattern: run build, Vitest, Prisma validate; lint has known preexisting issues, so separate preexisting lint failures from new ones.
- Story 3.1 established `requiresDoubleVerification` for amount > 50,000. Do not alter submission semantics unless adding `requiredTier`/`location` requires form fields.

### Git Intelligence Summary

- Recent commits:
  - `3c10ac6 chore(story-3.3): CR PASS mark story done`
  - `82d3949 fix(story-3.3): CR patches for admin verification endpoint`
  - `2565475 feat(story-3.3): admin kanban verification workflow`
  - `cd5b9bc chore(story-3.2): CR PASS — mark story 3-2 done, patch review findings, update sprint-status`
  - `ecec258 fix(story-3.2): CR patches — restrict document metadata to authors/admins, validate R2 key pattern on upload ...`
- Pattern to follow: security/privacy leaks are treated as CR blockers. Test both positive and negative visibility paths before review.
- Current working tree at story creation had `dev.db` modified before this story file was created. Do not include `dev.db` in this story context commit unless the dev task intentionally changes DB state and the repo policy says to commit it.

### Latest Technical Information

- The codebase is already pinned to current project versions: Next.js 16.2.6, React 19.2.4, Prisma 7.8.0, Auth.js v5 beta.31, Vitest 4.1.6.
- No new data-fetching/state library is needed. Use App Router Server Components, Prisma, small client components for UI filters.
- No DnD/new animation dependency is needed for this story.
- WhatsApp deep links require no external API: use `https://wa.me/<normalizedNumber>?text=<encodedMessage>` via existing helper.

### References

- `_bmad-output/planning-artifacts/epics.md` lines 645-648: Epic 3 objective (submission, documents, admin verification, member consultation with tier visibility).
- `_bmad-output/planning-artifacts/epics.md` lines 743-769: Story 3.4 definition and ACs.
- `_bmad-output/planning-artifacts/prd.md` lines 279-289: FR15-FR23 marketplace, especially FR19 tier visibility and FR20 public teasers.
- `_bmad-output/planning-artifacts/prd.md` lines 317-323: FR41-FR45 landing/content, French UI, responsive.
- `_bmad-output/planning-artifacts/architecture.md` lines 71-84: brownfield stack constraints and Auth.js/Prisma guardrails.
- `_bmad-output/planning-artifacts/architecture.md` lines 171-183: JWT session, role/tier claims, tier-based access at API layer.
- `_bmad-output/planning-artifacts/architecture.md` lines 192-216: API Route Handler response/error patterns.
- `_bmad-output/planning-artifacts/architecture.md` lines 219-231: Server Components default and custom IBC components.
- `_bmad-output/planning-artifacts/architecture.md` lines 278-310 and 371-468: project structure and route/component boundaries.
- `_bmad-output/planning-artifacts/ux-spec.md` lines 87-89: teaser-to-conversion and WhatsApp-first opportunities.
- `_bmad-output/planning-artifacts/ux-spec.md` lines 613-632: member deal feed layout, chips, DealCard, EmptyState.
- `_bmad-output/planning-artifacts/ux-spec.md` lines 762-819: custom component contracts for TrustBadge, DealCard, WhatsAppCTA, EmptyState.
- `_bmad-output/implementation-artifacts/3-3-workflow-kanban-de-verification-admin.md`: previous story learnings and implemented visibility/document safeguards.

## Dev Agent Record

### Agent Model Used

gpt-5.5 (openai-codex)

### Debug Log References

### Completion Notes List

### File List
