---
Story: "15.3"
StoryKey: "15-3-indicateur-admin-onboarding"
Title: "Indicateur admin de complétion onboarding"
Status: "ready-for-dev"
Priority: "P1"
Epic: "Epic 15 — Onboarding Enforcement & Relances Automatiques"
FRs: ["FR-ONB6"]
NFRs: ["NFR-S5", "NFR-S7", "NFR-A1", "NFR-P2"]
UXDRs: ["UX-DR13", "UX-DR19", "UX-DR20", "UX-DR21", "UX-DR23"]
Created: "2026-06-26"
baseline_commit: "0a3160c"
last_updated: '2026-06-26T22:30:00+0200'
---

# Story 15.3 : Indicateur admin de complétion onboarding

Status: ready-for-dev

<!-- Note: Ultimate context engine analysis completed - comprehensive developer guide created. Brownfield/delta story: /admin/members page exists with member table, account status, verification status, and inline AdminMemberActions. Story 15-2 implemented cron reminders and sendReminderEmail in src/lib/email.ts. This story adds explicit onboarding badges (email + profile), an incomplete filter, and a manual reminder action. -->

## Story

**En tant que** admin IBC,  
**Je veux** voir rapidement quels membres n'ont pas complété leur onboarding,  
**Afin de** les relancer manuellement si nécessaire ou de comprendre les blocages.

## Acceptance Criteria

1. **AC1 — Badges visuels sur la liste des membres**
   - **Given** l'admin sur `/admin/members`
   - **When** il consulte la liste
   - **Then** chaque membre affiche 2 badges : "Email ✓/✗" et "Profil ✓/✗"
   - **And** les badges ✗ sont en rouge ambre
   - **And** un filtre rapide permet de n'afficher que les membres incomplets

2. **AC2 — Filtre "incomplets"**
   - **Given** l'admin sur `/admin/members`
   - **When** il active le filtre "Onboarding incomplet"
   - **Then** seuls les membres avec `emailVerified === false` OU `onboardingCompletedAt === null` s'affichent

3. **AC3 — Action de relance manuelle**
   - **Given** l'admin sur le détail d'un membre incomplet
   - **When** il clique sur "Relancer par email"
   - **Then** le système envoie manuellement l'email de relance approprié (vérification ou profil) indépendamment du cron

## Tasks / Subtasks

- [ ] **AC1 — Ajouter les badges onboarding sur la liste `/admin/members`**
  - [ ] Modifier `src/app/(admin)/admin/members/page.tsx`.
  - [ ] Sélectionner `onboardingCompletedAt` dans la requête Prisma (en plus des champs existants).
  - [ ] Calculer deux indicateurs simples : `emailVerified` et `onboardingCompletedAt !== null`.
  - [ ] Afficher 2 badges par membre : "Email ✓" / "Email ✗" et "Profil ✓" / "Profil ✗".
  - [ ] Les badges ✗ doivent utiliser un style rouge ambre (par exemple `bg-destructive/10 text-destructive` ou `bg-orange-100 text-orange-800`).
  - [ ] Les badges ✓ doivent utiliser un style vert (par exemple `bg-emerald-100 text-emerald-800`).
  - [ ] Utiliser des ternaires dans le JSX, jamais `&&`.
  - [ ] Mettre à jour le test `src/app/(admin)/admin/members/page.test.tsx` pour couvrir les 4 combinaisons de badges.

- [ ] **AC2 — Ajouter le filtre "Onboarding incomplet"**
  - [ ] Ajouter un toggle/bouton filtre en haut du tableau dans `src/app/(admin)/admin/members/page.tsx`.
  - [ ] Le composant étant un Server Component, implémenter le filtre via `searchParams` (query string `?incomplete=1`).
  - [ ] Quand `incomplete=1` est actif, la requête Prisma doit inclure `where: { OR: [{ emailVerified: false }, { onboardingCompletedAt: null }] }`.
  - [ ] Afficher un indicateur visuel quand le filtre est actif (badge "Incomplets" ou texte souligné).
  - [ ] Permettre de réinitialiser le filtre (lien/bouton "Voir tous").
  - [ ] Ajouter des tests pour le filtre : liste complète sans filtre, liste filtrée avec `incomplete=1`.

- [ ] **AC3 — Créer la page détail d'un membre admin**
  - [ ] Créer `src/app/(admin)/admin/members/[id]/page.tsx`.
  - [ ] Vérifier l'authentification admin (même pattern que `/admin/members/page.tsx` : `auth()` + `prisma.user.findUnique` + `role === "ADMIN"`).
  - [ ] Charger le membre avec : `id`, `name`, `email`, `emailVerified`, `onboardingCompletedAt`, `bio`, `location`, `country`, `status`, `verificationStatus`, `createdAt`.
  - [ ] Afficher les badges Email et Profil, les infos de contact, et la date d'inscription.
  - [ ] Ajouter un bouton "Relancer par email" visible uniquement si le membre est incomplet (`emailVerified === false` OU `onboardingCompletedAt === null`).
  - [ ] Le bouton doit être un Client Component ou utiliser un formulaire POST vers la nouvelle route API.

- [ ] **AC3 — Créer l'API de relance manuelle**
  - [ ] Créer `src/app/api/admin/users/[id]/reminder/route.ts`.
  - [ ] Authentifier l'admin (401 si non connecté, 403 si pas ADMIN ou compte suspendu).
  - [ ] Récupérer l'utilisateur cible et vérifier qu'il a un `email` utilisable (400 `EMAIL_MISSING` sinon).
  - [ ] Déterminer le type de relance :
    - Si `emailVerified === false` → envoyer l'email de vérification (`sendVerificationEmailToUser` ou logique équivalente avec token SHA-256, 24h).
    - Sinon si `onboardingCompletedAt === null` → envoyer `sendReminderEmail({ to, name, type: "PROFILE_COMPLETION" })`.
    - Si les deux sont complets → retourner 400 `ALREADY_COMPLETE`.
  - [ ] Créer un audit log `USER_REMINDER_SEND` avant l'envoi (pattern `safeCreateAuditLog`), avec metadata incluant `reminderType`.
  - [ ] Retourner `200 OK { data: { sent: true, type } }`.
  - [ ] En cas d'échec d'envoi, logger avec `sanitizeError` et retourner `500 EMAIL_FAILED`.

- [ ] **AC3 — Relier le bouton à l'API**
  - [ ] Depuis la page détail, appeler `POST /api/admin/users/{id}/reminder` au clic.
  - [ ] Afficher un message de succès/erreur.
  - [ ] Rafraîchir la page (`router.refresh()`) après succès.

- [ ] **Tests et validation de non-régression**
  - [ ] Tests `src/app/(admin)/admin/members/page.test.tsx` :
    - [ ] Badges ✓ / ✗ selon `emailVerified` et `onboardingCompletedAt`.
    - [ ] Filtre `incomplete=1` n'affiche que les membres incomplets.
  - [ ] Tests `src/app/(admin)/admin/members/[id]/page.test.tsx` :
    - [ ] Redirection si non admin.
    - [ ] Affichage des badges et du bouton relance pour un membre incomplet.
    - [ ] Bouton masqué pour un membre complet.
  - [ ] Tests `src/app/api/admin/users/[id]/reminder/route.test.ts` :
    - [ ] 401/403 pour non authentifié / non admin.
    - [ ] Envoi vérification si `emailVerified=false`.
    - [ ] Envoi profil si `emailVerified=true` et `onboardingCompletedAt=null`.
    - [ ] 400 si utilisateur complet.
    - [ ] 400 si email manquant.
    - [ ] Audit log créé.
  - [ ] `npm run build` passe sans erreur.
  - [ ] `npx vitest run` passe sans erreur.

## Dev Notes

### Contexte brownfield / delta

La page `/admin/members` existe déjà (Story 6.5) et affiche déjà des indicateurs liés à la vérification admin. Cependant, les badges actuels sont dérivés de `isEligibleForVerification`, qui vérifie `EMAIL_UNVERIFIED`, `BIO_MISSING`, `LOCATION_MISSING`, `COUNTRY_MISSING`. Ce n'est PAS la même sémantique que l'onboarding défini dans l'Epic 15 (`emailVerified` + `onboardingCompletedAt`). Cette story ajoute des badges onboarding explicites sans supprimer les existants.

| Élément | État | Fichier(s) |
|---------|------|-----------|
| Page `/admin/members` | ✅ | `src/app/(admin)/admin/members/page.tsx` |
| Composant actions membres | ✅ | `src/components/features/admin/admin-member-actions.tsx` |
| Envoi email de vérification | ✅ | `src/lib/email.ts` (`sendEmailVerificationEmail`), `src/lib/verification-email.server.ts` (`sendVerificationEmailToUser`) |
| Envoi email de relance profil | ✅ | `src/lib/email.ts` (`sendReminderEmail` type `PROFILE_COMPLETION`, ajouté par story 15-2) |
| Route cron de relances | ✅ | `src/app/api/cron/remind-incomplete-users/route.ts` (story 15-2) |
| Champs User onboarding | ✅ | `prisma/schema.prisma` : `emailVerified` (L88), `onboardingCompletedAt` (L92) |
| Audit log | ✅ | `src/lib/audit-log.ts` (`AUDIT_ACTIONS.USER_CONFIRMATION_EMAIL_SEND` existe ; ajouter `USER_REMINDER_SEND`) |

**Ce qui est manquant (delta à implémenter) :**
- Badges onboarding explicites (`emailVerified`, `onboardingCompletedAt`) sur la liste.
- Filtre rapide `incomplete=1` côté Server Component.
- Page détail `/admin/members/[id]`.
- Route API `POST /api/admin/users/[id]/reminder` pour relance manuelle.
- Tests correspondants.

### Contraintes techniques critiques

- **Server Component par défaut** : `src/app/(admin)/admin/members/page.tsx` est un Server Component. Le filtre doit donc passer par `searchParams` et non par un état client local.
- **Pas de Prisma dans le middleware** : cette story n'interagit PAS avec le middleware. Toutes les vérifications admin se font côté serveur Node.js via `auth()` + requête Prisma.
- **Sémantique des badges** : les badges onboarding doivent refléter strictement `emailVerified` et `onboardingCompletedAt !== null`. Ne pas confondre avec `isEligibleForVerification` qui inclut bio/location/country.
- **Relance manuelle vs cron** : la relance manuelle utilise les mêmes fonctions d'email que le cron mais n'est pas contrainte par le calendrier J+1/J+3/J+7. Elle peut toutefois respecter la limite anti-spam 24h pour les emails de vérification (via `sendVerificationEmailToUser`).
- **Idempotence côté profil** : il n'existe pas encore de rate-limit sur les relances profil. Pour éviter le spam admin accidentel, désactiver le bouton pendant la mutation et afficher un feedback.
- **Audit trail** : toute action de relance manuelle doit être loguée dans `AuditLog` (pattern existant : audit BEFORE side effect).
- **Guardrail JSX** : utiliser des ternaires (`condition ? <JSX> : null`) dans le JSX, jamais `&&`.

### Files to create / modify

**NEW files :**
- `src/app/(admin)/admin/members/[id]/page.tsx`
- `src/app/(admin)/admin/members/[id]/page.test.tsx`
- `src/app/api/admin/users/[id]/reminder/route.ts`
- `src/app/api/admin/users/[id]/reminder/route.test.ts`

**UPDATE files :**
- `src/app/(admin)/admin/members/page.tsx` — ajouter `onboardingCompletedAt` dans le select, calculer les badges onboarding, ajouter le filtre via searchParams.
- `src/app/(admin)/admin/members/page.test.tsx` — mettre à jour les mocks et ajouter les tests badges + filtre.
- `src/lib/audit-log.ts` — ajouter `USER_REMINDER_SEND` dans `AUDIT_ACTIONS`.

### Architecture compliance

- **Auth pattern** : vérifier `session.user.id`, puis charger l'admin depuis Prisma et vérifier `role === "ADMIN"` + `status !== "SUSPENDED"`. Pattern identique à `src/app/api/admin/users/[id]/confirmation-email/route.ts`.
- **API responses** : succès `Response.json({ data: T })` / `NextResponse.json({ data: T })`, erreur `NextResponse.json({ error: string, code?: string }, { status })`.
- **Emails** : réutiliser `sendVerificationEmailToUser` pour la vérification (génère token SHA-256, respecte 24h) et `sendReminderEmail` pour le profil.
- **Prisma** : importer `prisma` depuis `@/lib/prisma` ; ne pas instancier un nouveau `PrismaClient`.
- **Tests** : Vitest + React Testing Library ; tests co-localisés avec `*.test.ts(x)`.
- **Error logging** : utiliser `sanitizeError` de `@/lib/sanitize-log` pour tout log d'erreur.
- **Audit** : utiliser `safeCreateAuditLog` avant l'envoi d'email.

### Library / framework requirements

- Aucune nouvelle dépendance NPM attendue.
- `next-auth` v5 beta.31 pour `auth()` côté serveur.
- `nodemailer` déjà utilisé via `src/lib/email.ts`.
- shadcn/ui `Button`, `Badge`, `Card` (optionnel pour la page détail).

### Testing requirements

- Couvrir les 4 états de badges (email ✓/✗ × profil ✓/✗).
- Couvrir le filtre incomplet avec `searchParams`.
- Couvrir la page détail : affichage, bouton conditionnel, redirection non-admin.
- Couvrir la route API : auth, envoi vérification, envoi profil, cas complet, email manquant, audit log.
- Valider `npm run build`.

### UX / accessibility

- Textes en français, non-techniques.
- Badges avec contraste suffisant (rouge ambre pour ✗, vert pour ✓).
- Cibles tactiles ≥ 44 px pour le bouton de filtre et le bouton relance.
- Focus visible sur les boutons.
- Message de succès/erreur explicite après la relance.
- Indiquer clairement quand le filtre "Incomplets" est actif.

## Previous Story Intelligence

- Story 6.5 a établi le pattern admin `role === "ADMIN"` vérifié en DB côté serveur, et l'utilisation systématique de ternaires dans JSX.
- Story 15.1 a implémenté les JWT claims `emailVerified` / `onboardingCompleted`, le middleware soft-gate, et `src/lib/verification-email.server.ts` pour l'auto-resend. La relance manuelle de vérification peut réutiliser `sendVerificationEmailToUser`.
- Story 15.2 a créé `sendReminderEmail({ type: "PROFILE_COMPLETION" })` dans `src/lib/email.ts` et la logique cron. La relance manuelle de profil réutilise directement cette fonction.

## Project Context Reference

- Projet : Ivoire Business Club (IBC).
- Stack : Next.js 16.2.6, React 19.2.4, Prisma 7.8.0, Auth.js v5 beta.31, TailwindCSS 4.x, shadcn/ui.
- Build : `output: 'standalone'` ; déployé sur VPS Infomaniak (Ubuntu 24.04) via PM2 + Nginx.
- Langue des artefacts : Français (contrairement à `config.yaml` qui indique "English" — tous les BMAD artifacts IBC sont en français).
- Emails : SMTP Infomaniak via `src/lib/email.ts` (nodemailer).

## References

- SCP — Story 15.3 : `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-26.md`, section "### Story 15.3 : Indicateur admin de complétion onboarding" (lignes 261-289).
- Architecture : `_bmad-output/planning-artifacts/architecture.md`, sections "Authentication & Security", "API & Communication Patterns", "Implementation Patterns & Consistency Rules".
- Code existant :
  - `src/app/(admin)/admin/members/page.tsx`
  - `src/app/(admin)/admin/members/page.test.tsx`
  - `src/components/features/admin/admin-member-actions.tsx`
  - `src/lib/email.ts`
  - `src/lib/verification-email.server.ts`
  - `src/app/api/admin/users/[id]/confirmation-email/route.ts`
  - `src/app/api/admin/users/[id]/verify/route.ts`
  - `src/lib/audit-log.ts`
  - `prisma/schema.prisma`

## Dev Agent Record

### Agent Model Used

kimi-k2.7-code (via Hermes delegate_task)

### Debug Log References

### Completion Notes List

- Story créée à partir du SCP (source primaire), pas de `epics.md` (Epic 15 y est absent car ajouté par le SCP).
- AC1/AC2 : modification additive de la page admin members existante avec badges onboarding explicites et filtre via searchParams.
- AC3 : nouvelle page détail `/admin/members/[id]` + route API `POST /api/admin/users/[id]/reminder` pour relance manuelle.
- Les emails de relance réutilisent `sendVerificationEmailToUser` (vérification) et `sendReminderEmail` (profil) de `src/lib/email.ts`.
- L'audit log `USER_REMINDER_SEND` doit être ajouté dans `src/lib/audit-log.ts`.

### File List

- `_bmad-output/implementation-artifacts/story-15-3.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (status mis à jour)

### Implementation Plan

Story implémentée en delta sur le code existant : ajout de badges onboarding et d'un filtre sur `/admin/members`, création d'une page détail membre, et d'une route API de relance manuelle avec audit log. Aucune migration Prisma nécessaire (champs `emailVerified` et `onboardingCompletedAt` existants).
