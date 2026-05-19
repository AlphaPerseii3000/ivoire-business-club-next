---
Story: "3.5"
StoryKey: "3-5-niveaux-de-confiance-ibc-et-doubleverification"
Title: "Niveaux de Confiance IBC et Double-Vérification"
Status: "ready-for-dev"
Priority: "P0"
Epic: "Epic 3 — Marketplace d'Opportunités et Vérification"
FRs: ["FR21", "FR22", "FR23"]
NFRs: ["NFR-P2", "NFR-S5", "NFR-S8", "NFR-S9", "NFR-A1", "NFR-A3", "NFR-I3"]
UXDRs: ["UX-DR3", "UX-DR7", "UX-DR8", "UX-DR23", "UX-DR26", "UX-DR27", "UX-DR31"]
Created: "2026-05-19"
---

# Story 3.5: Niveaux de Confiance IBC et Double-Vérification

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

En tant que membre consultant un deal,
je veux voir le niveau de confiance IBC et consulter le dossier juridique attaché,
afin d'évaluer la fiabilité de l'opportunité avant de contacter le porteur.

## Acceptance Criteria

1. **Badge Bronze — documents uploadés**
   - Given un deal avec documents uploadés par le promoteur,
   - When il est consulté par un membre,
   - Then le `TrustBadge` affiche « Bronze » (couleur amber-700, fond `#FFFBEB`) signifiant : documents uploadés (FR21).

2. **Badge Argent — authentifié par admin IBC**
   - Given un deal vérifié par un admin,
   - When il est consulté par un membre,
   - Then le `TrustBadge` affiche « Argent » (couleur slate-500) signifiant : admin IBC a validé l'authenticité.

3. **Badge Or — confiance communautaire élevée**
   - Given un deal avec 3+ deals validés et reviews moyennes ≥ 4,5,
   - When il est consulté,
   - Then le `TrustBadge` affiche « Or » (couleur amber-600, fond `#FEF3C7`) avec animation pulse au premier affichage.

4. **Double-vérification obligatoire > 50 000 €**
   - Given un deal avec montant > 50 000 €,
   - When il est soumis puis vérifié,
   - Then le système exige une double-vérification : deux admins distincts doivent valider avant passage à `VERIFIED` (FR22).

5. **Dossier juridique consultable par membre autorisé**
   - Given un membre sur la page détail d'un deal,
   - When il consulte la section documents,
   - Then il voit les `DocumentRow` avec preview inline, et peut télécharger chaque document (FR23).

6. **Timeline de vérification mobile**
   - Given un membre sur mobile,
   - When il consulte la timeline de vérification,
   - Then le `VerificationTimeline` affiche les étapes : Documents uploadés → Vérifié par IBC → Reviews communautaires, avec les étapes complétées en vert.

## Tasks / Subtasks

- [ ] Étendre `TrustBadge` sans casser Story 3.4 (AC: #1, #2, #3)
  - [ ] UPDATE `src/components/features/deals/trust-badge.tsx` pour accepter `level: "bronze" | "argent" | "or"`, `size: "sm" | "md"`, `animated?: boolean`, `showTooltip?: boolean`, `className?: string`.
  - [ ] Conserver le comportement Story 3.4 : si aucun niveau n'est fourni dans les appels existants, le badge ne doit pas disparaître des `DealCard`; choisir une valeur sûre via helper plutôt qu'un fallback codé en dur partout.
  - [ ] Styles requis : Bronze `text-[#B45309] bg-[#FFFBEB] border-[#FCD34D]`; Argent `text-slate-500 bg-slate-50 border-slate-300`; Or `text-[#D97706] bg-[#FEF3C7] border-[#F59E0B]`.
  - [ ] Inclure icône + texte; ne jamais utiliser la couleur seule comme indicateur. Ajouter un `aria-label` explicite et un tooltip/description accessible expliquant le critère de niveau.
  - [ ] L'animation pulse du niveau Or doit respecter `prefers-reduced-motion` (`motion-safe:animate-pulse` ou équivalent), et seulement au premier affichage si l'état client est implémenté.

- [ ] Créer une logique de domaine pour calculer le niveau de confiance (AC: #1, #2, #3)
  - [ ] NEW recommandé `src/lib/trust-level.ts` avec type `TrustLevel = "bronze" | "argent" | "or"` et fonction pure `getOpportunityTrustLevel(input)`.
  - [ ] Règle Bronze : `documentCount > 0` et opportunité non encore authentifiée (`verificationStatus` différent de `VERIFIED`) OU documents présents sans signal de vérification admin.
  - [ ] Règle Argent : `verificationStatus === "VERIFIED"` et critères Or non satisfaits.
  - [ ] Règle Or : promoteur/auteur avec au moins 3 opportunités `VERIFIED` et moyenne reviews ≥ 4,5, ET pour les deals `requiresDoubleVerification`, la double-vérification doit être complète.
  - [ ] Ne pas implémenter tout le système de reviews de l'Epic 5 dans cette story. Préparer le helper pour consommer `authorStats.averageRating` / `authorStats.validatedDealsCount` quand les modèles de reviews existent; en attendant, utiliser des valeurs calculées disponibles (`validatedDealsCount`) et `averageRating: null` pour éviter d'afficher Or sans preuve.
  - [ ] Ajouter tests unitaires : pas de documents → niveau minimal/aucun selon le rendu choisi; documents seuls → Bronze; VERIFIED → Argent; stats 3+ et 4,5+ → Or; double-vérification requise mais incomplète → pas Or/VERIFIED.

- [ ] Implémenter la double-vérification admin distincte pour les deals > 50 000 € (AC: #4)
  - [ ] Confirmer que la création existe déjà : `src/app/api/opportunities/route.ts` positionne `requiresDoubleVerification = numericAmount !== null && numericAmount > 50000` et Prisma contient `Opportunity.requiresDoubleVerification Boolean @default(false)`. Préserver cette règle.
  - [ ] Ajouter un modèle Prisma robuste pour les approbations admin distinctes, recommandé :
        `OpportunityVerificationApproval { id, opportunityId, adminId, note?, createdAt }` avec relations vers `Opportunity` et `User`, index `opportunityId`, et contrainte unique `[opportunityId, adminId]`.
  - [ ] Alternative acceptable seulement si l'équipe refuse un nouveau modèle : ajouter deux champs explicites (`verifiedById`, `secondVerifiedById`, timestamps) avec relations nommées. Ne pas stocker l'identité des deux admins uniquement dans `reviewNotes`, car ce serait fragile et difficile à tester.
  - [ ] UPDATE `src/app/api/admin/opportunities/[id]/verify/route.ts` : pour `action: "verify"` sur une opportunité `requiresDoubleVerification`, enregistrer l'approbation de l'admin courant, refuser une deuxième approbation par le même admin (`409`, message français), et ne passer à `VERIFIED` qu'après deux admins distincts.
  - [ ] Pour une première approbation d'un deal double-vérification, garder ou mettre le statut `EN_COURS`, renseigner une note interne sécurisée, retourner `{ data, pendingSecondVerification: true }`, et ne pas envoyer l'email « deal vérifié » tant que la seconde approbation n'a pas eu lieu.
  - [ ] Pour les deals sans double-vérification, conserver le comportement existant : `PENDING|EN_COURS → VERIFIED`, `verifiedAt`, `verifiedById`, email auteur, logs safe.
  - [ ] Empêcher tout passage direct à `VERIFIED` via `action: "move", status: "VERIFIED"` si `requiresDoubleVerification` est true et qu'il n'y a pas deux approbations distinctes.
  - [ ] Ajouter migration Prisma + `npx prisma generate`; ne pas committer de base SQLite binaire.

- [ ] Mettre à jour l'UI admin pour exposer la double-vérification sans réécrire le Kanban (AC: #4)
  - [ ] UPDATE `src/app/(admin)/admin/opportunities/page.tsx`, `src/components/features/admin/opportunity-kanban-board.tsx` et `src/components/features/admin/opportunity-detail-sheet.tsx` uniquement là où nécessaire.
  - [ ] Afficher un signal français pour les deals `requiresDoubleVerification`: « Double vérification requise » et compteur `0/2`, `1/2`, `2/2`.
  - [ ] Dans le panneau détail admin, après la première validation, afficher clairement « En attente d'un second admin » et désactiver/empêcher la seconde validation par le même admin avec explication.
  - [ ] Préserver les transitions Story 3.3 : `PENDING`, `EN_COURS`, `VERIFIED`, `REJECTED`; ne pas ajouter un nouveau `VerificationStatus` enum sans nécessité.
  - [ ] Garder les notes de rejet obligatoires pour `REJECTED` et ne pas régresser les tests de transitions invalides.

- [ ] Créer `VerificationTimeline` pour la page détail deal (AC: #6)
  - [ ] NEW `src/components/features/deals/verification-timeline.tsx`.
  - [ ] Props recommandées : `documentCount: number`, `verificationStatus: VerificationStatus|string`, `trustLevel: TrustLevel`, `requiresDoubleVerification?: boolean`, `approvalCount?: number`, `averageRating?: number | null`, `validatedDealsCount?: number`.
  - [ ] Étapes fixes : « Documents uploadés » → « Vérifié par IBC » → « Reviews communautaires ».
  - [ ] États : `complete`, `current`, `pending`. Documents complete si `documentCount > 0`; IBC complete si `VERIFIED` (ou `approvalCount >= 2` pour double vérification); Reviews complete si critères Or satisfaits.
  - [ ] Mobile : stepper horizontal scrollable si nécessaire, labels lisibles, connecteurs visibles; desktop peut rester horizontal. Étapes complétées en vert, current en amber/teal, pending en muted.
  - [ ] Accessibilité : utiliser une liste ordonnée ou `role="list"`, labels textuels, pas de signification par couleur seule.

- [ ] Mettre à jour la page détail membre pour afficher badge, timeline et documents consultables (AC: #1, #2, #3, #5, #6)
  - [ ] UPDATE `src/app/(dashboard)/dashboard/opportunities/[id]/page.tsx`.
  - [ ] Calculer `documentCount`, `validatedDealsCount` de l'auteur, `averageRating` si disponible, `approvalCount` si le nouveau modèle est ajouté, puis `trustLevel` via `getOpportunityTrustLevel`.
  - [ ] Afficher `TrustBadge` près du titre/statut et `VerificationTimeline` avant ou près de la section documents selon UX deal detail.
  - [ ] Corriger le comportement actuel Story 3.4 qui passe `canPreview={canManageDocuments}` à `DocumentUploadSection`: pour les membres autorisés non-auteurs/non-admins, les documents juridiques doivent être visibles, prévisualisables et téléchargeables (AC #5), mais ils ne doivent pas pouvoir uploader/supprimer.
  - [ ] Réutiliser `DocumentRow` et les endpoints/document security existants de Story 3.2; ne pas créer de second système de preview/download et ne jamais exposer documents à public/visiteur/non-abonné/tier insuffisant.
  - [ ] Conserver les guardrails de Story 3.4 : public teaser ne voit jamais documents/montant/contact; membre non abonné garde `PremiumAccessBlockedPanel`; tier insuffisant garde le panneau upgrade; `REJECTED` visible uniquement auteur/admin.

- [ ] Mettre à jour `DealCard` pour utiliser le vrai niveau de confiance (AC: #1, #2, #3)
  - [ ] UPDATE `src/components/features/deals/deal-card.tsx` pour accepter soit `trustLevel`, soit les champs nécessaires au calcul; éviter de coder `level="argent"` en dur.
  - [ ] UPDATE les queries feed membre dans `src/app/(dashboard)/dashboard/opportunities/page.tsx` et `src/app/api/opportunities/route.ts` pour sérialiser uniquement les signaux non sensibles nécessaires au badge (`documentCount`, `verificationStatus`, stats auteur agrégées si disponibles).
  - [ ] Ne pas augmenter la densité de la carte au-delà des 5 signaux de Story 3.4; le détail de la confiance appartient à la page détail/timeline.

- [ ] Ajouter tests et vérifications (AC: #1-#6)
  - [ ] Tests unitaires `trust-level.test.ts` pour toutes les règles Bronze/Argent/Or et cas double-vérification.
  - [ ] Tests UI `trust-badge.test.tsx` pour labels, classes/variantes, aria-label, tooltip/description, reduced motion/pulse si testable.
  - [ ] Tests UI `verification-timeline.test.tsx` pour étapes complétées/pending et texte français.
  - [ ] Tests API admin verify : deal normal vérifié en 1 admin; deal >50k première validation reste `EN_COURS`; même admin ne peut pas valider deux fois; second admin passe `VERIFIED`; `move VERIFIED` direct est bloqué; email envoyé seulement après validation complète.
  - [ ] Tests page détail : membre autorisé voit `DocumentRow`/preview/download, badge et timeline; public/non-abonné/tier insuffisant ne reçoit pas les documents; `REJECTED` reste caché aux autres membres.
  - [ ] Exécuter au minimum `./node_modules/.bin/prisma validate`, `npx vitest run`, `npm run build`. Exécuter `npm run lint` si possible et documenter les lint préexistants séparément.
  - [ ] Respect strict Next.js 16/TS du projet : en JSX, utiliser `condition ? <Component /> : null`, jamais `condition && <Component />`.

## Dev Notes

### Contexte existant à préserver

- Stories 3.1 à 3.4 sont done. Story 3.5 doit étendre, pas remplacer, les flux de création, documents, vérification Kanban, visibilité tier et teasers publics.
- `Opportunity.requiresDoubleVerification Boolean @default(false)` existe déjà dans `prisma/schema.prisma` et `src/app/api/opportunities/route.ts` le positionne automatiquement pour `amount > 50000`. Ne pas dupliquer cette logique côté client uniquement.
- Enums existants : `VerificationStatus = PENDING | EN_COURS | VERIFIED | REJECTED`, `Tier = AFFRANCHI | GRAND_FRERE | BOSS`. Éviter d'ajouter des statuts de vérification si les quatre statuts actuels suffisent.
- `TrustBadge` existe à `src/components/features/deals/trust-badge.tsx` mais il est minimal : `level?: "argent"` seulement, rendu Argent hardcodé. Story 3.4 indiquait explicitement : « Story 3.5 affinera Bronze/Argent/Or ».
- `DealCard` existe à `src/components/features/deals/deal-card.tsx` et hardcode actuellement `<TrustBadge level="argent" />`. Il doit consommer le vrai niveau de confiance.
- `DocumentRow` et `DocumentUploadSection` existent. `DocumentRow` supporte déjà preview/download/delete callbacks. Ne pas réinventer un composant document séparé.
- `VerificationTimeline` n'existe pas encore.
- La page détail actuelle `src/app/(dashboard)/dashboard/opportunities/[id]/page.tsx` charge les documents mais ne donne `initialDocuments` et `canPreview` qu'à `canManageDocuments` (auteur/admin). Cette story doit permettre la consultation documents par membre autorisé, conformément à FR23, sans permettre upload/suppression.
- L'endpoint admin actuel `src/app/api/admin/opportunities/[id]/verify/route.ts` passe directement à `VERIFIED` sur `action: "verify"`. Pour les deals double-vérification, c'est le point central à modifier.
- Les fichiers public teaser de Story 3.4 (`src/app/(public)/page.tsx`, `src/app/(public)/opportunities/page.tsx`, public mode de `/api/opportunities`) doivent rester strictement teaser : titre + localisation seulement.

### Fichiers UPDATE lus et état actuel

- `prisma/schema.prisma` : `Opportunity` a `requiresDoubleVerification`, `verificationStatus`, `verifiedAt`, `verifiedById`, `reviewNotes`, `adminNote`, `documents`; pas de modèle d'approbations multiples. `User` a une relation `verifiedBy` pour un seul vérificateur.
- `src/app/api/opportunities/route.ts` : `POST` calcule déjà `requiresDoubleVerification`; `GET public=true` sérialise seulement `id/title/location`; `GET` membre applique visibilité par tier.
- `src/app/api/admin/opportunities/[id]/verify/route.ts` : validation admin, transitions, notes, emails Resend, logs safe par ID. À étendre pour approbations distinctes et blocage du passage direct à `VERIFIED`.
- `src/app/(dashboard)/dashboard/opportunities/[id]/page.tsx` : protège session, abonnement actif, tier, non-VERIFIED; affiche détail, auteur, WhatsApp, `DocumentUploadSection`. À étendre avec trust badge, timeline et document consultation membre.
- `src/components/features/deals/trust-badge.tsx` : minimal Argent, icône `ShieldCheck`, aria-label. À généraliser.
- `src/components/features/deals/deal-card.tsx` : carte mobile Story 3.4 avec montant/localisation/docs/WhatsApp; TrustBadge hardcodé Argent. À brancher sur le helper.
- `src/components/features/deals/document-row.tsx` : client component, preview/download/delete callbacks, tailles et labels français. À réutiliser.
- `src/lib/validations.ts` : `opportunityAdminActionSchema` accepte `move`, `verify`, `reject`, `start_review`; si l'API ajoute un payload lié aux approvals, valider strictement ici.

### Contraintes architecture / sécurité

- Stack réelle : Next.js 16.2.6, React 19.2.4, Prisma 7.8.0, Auth.js v5 beta.31, TailwindCSS 4, shadcn/ui, Vitest 4.1.6, Zod 4.4.3, React Hook Form 7.75.0, Lucide React 1.14.0.
- Prisma 7 : utiliser `src/lib/prisma.ts` singleton; celui-ci importe le client depuis `@/generated/prisma/client`. Ne pas instancier `PrismaClient` directement ailleurs.
- Auth.js v5 : serveur/API utilisent `auth()` depuis `@/lib/auth`; ne jamais importer Prisma/bcrypt dans `auth.config.ts` ou middleware Edge.
- API pattern : succès `NextResponse.json({ data })`; erreur `NextResponse.json({ error, code? }, { status })`, messages français, codes 401/403/404/409/500 cohérents.
- NFR-S8 : logs sans données sensibles. Ne pas logger titres, descriptions, numéros de téléphone, notes complètes, noms de fichiers, URLs R2/signées. Logger IDs/statuts/codes.
- NFR-S9 : la double-vérification est une décision admin critique. Si le modèle d'audit global n'existe pas encore, au minimum stocker les approbations admin distinctes en base avec `adminId`, `opportunityId`, `createdAt`, `note?`.
- Sécurité documents : seuls auteur, admin, ou membre connecté avec abonnement actif + tier suffisant + opportunité `VERIFIED` peuvent voir/preview/download les documents. Jamais public, jamais non-abonné, jamais tier insuffisant.
- Ne pas corriger les travaux différés hors scope : mismatch `avatarUrl` vs `image` et `Subscription.providerRef` ne font pas partie de cette story.

### UX / accessibilité

- Tous les textes UI visibles doivent être en français avec diacritiques corrects.
- TrustBadge : texte + icône + tooltip/description; contraste AA; focus visible si interactif.
- VerificationTimeline : étapes textuelles, mobile-first, pas de couleur seule, `prefers-reduced-motion` respecté.
- Deal detail mobile selon UX-DR31 : badge/timeline visibles avant la décision de contact; CTA WhatsApp existant reste primaire, la confiance réduit l'anxiété avant le contact.
- Pour les deals >50k, l'UI doit rassurer : « Double vérification requise/complétée » plutôt qu'un message anxiogène.
- Éviter les animations excessives; l'Or peut pulser au premier affichage uniquement, et doit être désactivé en reduced motion.

### Previous Story Intelligence

- Story 3.4 a créé `DealCard`, `TrustBadge` MVP, `WhatsAppCTA`, `EmptyState`, `CategoryFilterChips`, la visibilité par tier, les teasers publics et la route `/dashboard/opportunities`. Ne pas revenir aux anciens chemins `/opportunities` pour les pages authentifiées.
- Review Story 3.4 a corrigé une erreur Next.js 16 stricte : ne pas utiliser `&&` en JSX; utiliser des booléens pré-calculés et des ternaires.
- Story 3.4 a durci la confidentialité : public teaser = titre + localisation uniquement. Toute régression de sérialisation publique sera un blocker de review.
- Story 3.3 a implémenté le Kanban admin et l'endpoint de vérification; ses bugs de review concernaient JSON invalide et interprétation d'action POST. Valider explicitement les nouveaux chemins d'action et les transitions.
- Story 3.2 a corrigé des fuites de métadonnées documents; ne pas exposer les documents via de nouveaux props/endpoints non protégés.
- Validation récente Story 3.4 : `prisma validate`, `npx vitest run`, `npm run build` passaient; `npm run lint` avait des problèmes préexistants hors scope. Séparer les préexistants des nouveaux.

### Git Intelligence Summary

- Commits récents pertinents :
  - `3b5509f chore(story-3.4): CR PASS — review finding patched, mark story done`
  - `dc4d3d2 fix(story-3.4): CR patch — replace JSX && condition with precomputed boolean`
  - `427b7fb feat(story-3.4): tier-gated opportunities and public teasers`
  - `eeb9444 chore(story-3.4): create opportunity visibility story context`
  - `3c10ac6 chore(story-3.3): CR PASS mark story done`
- Pattern du repo : les stories modifient le story file et `sprint-status.yaml`, puis les reviews marquent done après tests. Les fichiers DB binaires ne sont pas inclus dans les commits de story context.

### Latest Technical Information

- Aucune nouvelle librairie n'est nécessaire pour cette story. Utiliser Prisma, Server Components, petits Client Components, TailwindCSS et Lucide existants.
- Les versions du projet sont déjà modernes et pinées dans `package.json`; ne pas upgrader Next/React/Prisma/Auth.js pour implémenter cette story.
- Pour les animations, Tailwind `motion-safe:` suffit. Ne pas ajouter Framer Motion uniquement pour le pulse Or.
- Pour le tooltip, préférer un composant shadcn/ui existant s'il est déjà présent; sinon implémenter une description accessible simple sans nouvelle dépendance.

### Project Structure Notes

- Routes/API probables :
  - UPDATE `src/app/api/admin/opportunities/[id]/verify/route.ts`
  - UPDATE `src/app/api/admin/opportunities/[id]/verify/route.test.ts`
  - UPDATE `src/app/api/opportunities/route.ts` si la liste doit inclure `trustLevel` ou stats calculées
  - UPDATE `src/app/(dashboard)/dashboard/opportunities/page.tsx`
  - UPDATE `src/app/(dashboard)/dashboard/opportunities/page.test.tsx`
  - UPDATE `src/app/(dashboard)/dashboard/opportunities/[id]/page.tsx`
  - UPDATE `src/app/(dashboard)/dashboard/opportunities/[id]/page.test.tsx`
  - UPDATE `src/app/(admin)/admin/opportunities/page.tsx`
- Composants probables :
  - UPDATE `src/components/features/deals/trust-badge.tsx`
  - UPDATE `src/components/features/deals/deal-card.tsx`
  - NEW `src/components/features/deals/verification-timeline.tsx`
  - UPDATE `src/components/features/admin/opportunity-kanban-board.tsx`
  - UPDATE `src/components/features/admin/opportunity-detail-sheet.tsx`
- Domaine/utils probables :
  - NEW `src/lib/trust-level.ts`
  - UPDATE `src/lib/validations.ts` si nouveaux payloads API admin
- Database probable :
  - UPDATE `prisma/schema.prisma`
  - NEW migration under `prisma/migrations/` for `OpportunityVerificationApproval` or equivalent
  - Run `npx prisma generate` after schema change

### References

- `_bmad-output/planning-artifacts/epics.md` lines 281-286: Epic 3 objective and FR/UX coverage.
- `_bmad-output/planning-artifacts/epics.md` lines 773-803: Story 3.5 user story and six acceptance criteria.
- `_bmad-output/planning-artifacts/epics.md` lines 57-66 and 236-238: FR21-FR23 marketplace trust requirements.
- `_bmad-output/planning-artifacts/prd.md` lines 104-110: trust experience includes verification badges, legal dossier, reliability score.
- `_bmad-output/planning-artifacts/prd.md` lines 180-188: KYC and graduated verification Bronze/Argent/Or.
- `_bmad-output/planning-artifacts/prd.md` lines 415-423: double-verification >50k as mitigation for critical fraud risk.
- `_bmad-output/planning-artifacts/architecture.md` lines 149-164: data models and validation patterns.
- `_bmad-output/planning-artifacts/architecture.md` lines 180-190: role/tier authorization and security measures.
- `_bmad-output/planning-artifacts/architecture.md` lines 192-216: API route handler response/error patterns.
- `_bmad-output/planning-artifacts/architecture.md` lines 219-231: component architecture and custom IBC components.
- `_bmad-output/planning-artifacts/architecture.md` lines 278-310 and 371-468: project structure and boundaries.
- `_bmad-output/planning-artifacts/ux-spec.md` lines 161-166: micro-emotions and double-verification reassurance for >50k deals.
- `_bmad-output/planning-artifacts/ux-spec.md` lines 344-349: Trust Level Colors.
- `_bmad-output/planning-artifacts/ux-spec.md` lines 639-660: Deal Detail page layout with verification timeline/documents.
- `_bmad-output/planning-artifacts/ux-spec.md` lines 762-806: TrustBadge, VerificationTimeline and DocumentRow component contracts.
- `_bmad-output/implementation-artifacts/story-3-4-visibilite-des-opportunites-tier-et-teaser-publics.md`: previous story implementation notes, file list and review guardrails.

## Dev Agent Record

### Agent Model Used

gpt-5.5 (openai-codex)

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List
