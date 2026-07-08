---
baseline_commit: a8e30a3303aa46f4fe1d4e3046017a1024827e30
---

# Story 26.4: Route de Tracking & Redirection WhatsApp (CENTIF-CI)

Status: ready-for-dev

## Story

**En tant que** membre voulant entrer en contact avec un porteur de projet,  
**je veux** que mon clic sur le bouton WhatsApp soit tracé en interne avant d'être redirigé vers l'application WhatsApp,  
**afin de** respecter les obligations d'audit réglementaire de la CENTIF-CI.

## Acceptance Criteria

1. **Bouton CTA WhatsApp redirige vers la route interne** (AC1) : Sur la page de détail d'une opportunité, le bouton "Contacter le porteur sur WhatsApp" n'appelle pas directement `wa.me` ; il pointe vers `/api/opportunities/[id]/contact`.
2. **Authentification et autorisation requises** (AC2) : L'API `/api/opportunities/[id]/contact` refuse les visiteurs anonymes (401 ou redirection `/auth/signin`) et les membres sans abonnement valide ou tier insuffisant pour l'opportunité (403).
3. **Log d'audit ContactLog et redirection WhatsApp** (AC3) : Pour un membre autorisé, la route insère une ligne `ContactLog` en base (`userId`, `opportunityId`, `createdAt`) puis redirige immédiatement vers le lien `wa.me` du porteur avec un message prérempli, via HTTP 302.
4. **Modèle Prisma et migration** (AC4) : Le modèle `ContactLog` est créé dans `prisma/schema.prisma` et `prisma/schema.dev.prisma` avec les champs requis, et une migration est générée.
5. **Tests de la route** (AC5) : Des tests co-localisés couvrent l'authentification, l'autorisation, la création du log et la redirection WhatsApp.
6. **Conformité UX Next.js 16** : Aucun `&&` dans JSX ; les booléens composés sont précalculés avant le return.

## Tasks / Subtasks

- [ ] **Créer le modèle Prisma `ContactLog`** (AC #4)
  - [ ] Ajouter dans `prisma/schema.prisma` et `prisma/schema.dev.prisma` :
    ```prisma
    model ContactLog {
      id            String      @id @default(cuid())
      userId        String
      opportunityId String
      createdAt     DateTime    @default(now())

      user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)
      opportunity Opportunity @relation(fields: [opportunityId], references: [id], onDelete: Cascade)

      @@index([opportunityId, createdAt])
      @@index([userId, createdAt])
      @@map("contact_logs")
    }
    ```
  - [ ] Ajouter la relation `contactLogs ContactLog[]` dans le modèle `User`.
  - [ ] Ajouter la relation `contactLogs ContactLog[]` dans le modèle `Opportunity`.
  - [ ] Générer la migration : `npx prisma migrate dev --name add_contact_log_for_whatsapp_tracking`.
- [ ] **Créer la route API de tracking/redirection WhatsApp** (AC #2, #3) : `src/app/api/opportunities/[id]/contact/route.ts` [NEW]
  - [ ] Méthode `GET` uniquement, runtime `nodejs`.
  - [ ] Authentifier la session via `auth()` ; si non connecté, retourner une redirection `302` vers `/auth/signin` (ou `401` JSON si préféré — privilégier la redirection 302 pour l'UX bouton CTA).
  - [ ] Récupérer l'utilisateur DB (`role`, `tier`) et l'opportunité (`authorId`, `requiredTier`, `verificationStatus`, `author.phone`).
  - [ ] Vérifier l'accès : l'utilisateur doit être auteur, admin, ou membre avec accès premium actif et tier suffisant pour le `requiredTier` de l'opportunité vérifiée. Utiliser `hasActiveSubscription(userId)`, `canUserAccessOpportunity(...)` et les mêmes règles que `/api/opportunities/[id]/interest`.
  - [ ] Si le numéro WhatsApp du porteur est absent (`author.phone` null/vide), retourner `400 { error: "Numéro WhatsApp du porteur non disponible." }`.
  - [ ] Insérer un `ContactLog` : `prisma.contactLog.create({ data: { userId, opportunityId } })`. Ne pas bloquer la redirection si l'insertion échoue (log + continuer), mais en tests l'insertion doit être vérifiée.
  - [ ] Construire le lien WhatsApp : réutiliser `buildWhatsAppSupportLink({ phoneNumber: opportunity.author.phone, message: "Bonjour, je suis intéressé(e) par votre deal <titre> sur IBC." })`.
  - [ ] Retourner `NextResponse.redirect(whatsappHref, 302)`.
  - [ ] Gérer les erreurs inattendues avec `sanitizeError` et retourner `500 { error: "Erreur interne" }`.
- [ ] **Modifier le CTA WhatsApp pour le contexte opportunité** (AC #1)
  - [ ] Modifier `src/components/features/deals/whatsapp-cta.tsx` pour accepter une prop optionnelle `trackingHref?: string`.
  - [ ] Quand `trackingHref` est fourni et non vide, le bouton pointe vers cette URL interne au lieu de `href` de `buildWhatsAppSupportLink`. Conserver `target="_blank" rel="noopener noreferrer"` et le tracking PostHog `whatsapp_contact_clicked`.
  - [ ] Préserver le comportement actuel pour les autres contextes (profil membre, expert) qui ne passent pas `trackingHref`.
- [ ] **Mettre à jour la page de détail opportunité** (AC #1)
  - [ ] Dans `src/app/(dashboard)/dashboard/opportunities/[id]/page.tsx`, calculer `const trackingHref = \`/api/opportunities/\${opportunity.id}/contact\`;`.
  - [ ] Passer `trackingHref` au `<WhatsAppCTA />` utilisé pour le porteur de projet.
  - [ ] Conserver l'affichage conditionnel `shouldShowWhatsApp` (auteur/admin ne voient pas le CTA).
- [ ] **Ajouter/adapter les tests unitaires** (AC #5)
  - [ ] Créer `src/app/api/opportunities/[id]/contact/route.test.ts` en s'inspirant de `src/app/api/opportunities/[id]/interest/route.test.ts`.
  - [ ] Couvrir : 401/redirect pour anonyme, 404 deal non vérifié, 403 sans abonnement actif, 403 tier insuffisant, 400 si téléphone absent, 302 avec log créé pour membre éligible, redirection vers `wa.me` correct.
  - [ ] Mocker `auth`, `prisma`, `hasActiveSubscription`/`getUserPremiumAccess`, `canUserAccessOpportunity`, `buildWhatsAppSupportLink`.
  - [ ] S'assurer que `npx vitest run src/app/api/opportunities/[id]/contact/route.test.ts` passe.

## Dev Notes

### Delta sur code existant — NE PAS réinventer

- **WhatsAppCTA existant** : `src/components/features/deals/whatsapp-cta.tsx` génère un lien direct `wa.me` via `buildWhatsAppSupportLink` et envoie un événement PostHog. Le modifier de façon minimale avec une prop `trackingHref` permet de réutiliser le style, l'icône et l'accessibilité.
- **Helpers WhatsApp existants** : `src/lib/whatsapp.ts` expose `normalizeWhatsAppNumber()` et `buildWhatsAppSupportLink({ phoneNumber, message })`. Réutiliser impérativement pour construire l'URL finale de redirection.
- **Route patron pour l'autorisation** : `src/app/api/opportunities/[id]/interest/route.ts` implémente déjà les vérifications (auteur ne peut pas, admin OK, deal vérifié, abonnement actif, tier suffisant). Copier/adapter cette logique de guard.
- **Route patron pour la structure** : `src/app/api/opportunities/[id]/route.ts` montre l'utilisation de `auth()`, `prisma`, `canUserAccessOpportunity`, retour `{ data: T }` / `{ error: string }`.
- **Prisma migrations** : le projet a deux schémas (`schema.prisma` pour PostgreSQL et `schema.dev.prisma` pour SQLite). Modifier les deux et lancer `npx prisma migrate dev`.
- **AuditLog vs ContactLog** : `AuditLog` trace les actions admin/système ; `ContactLog` est dédié au suivi des contacts WhatsApp pour la CENTIF-CI. Ne pas confondre.

### Architecture et patterns à suivre

- **JSX Boolean Guardrail** : ne jamais utiliser `&&` dans JSX. Précalculer : `const isTrackingEnabled = Boolean(trackingHref);` puis `{isTrackingEnabled ? <Link href={trackingHref}> : <Link href={href}>}`.
- **Prisma multi-schémas** : modifier impérativement **les deux** `schema.prisma` et `schema.dev.prisma` ; sinon les tests unitaires et le dev local échoueront.
- **API Response Format** : succès `NextResponse.redirect(url, 302)` ; erreur `NextResponse.json({ error: string, code?: string }, { status })`.
- **Server-only imports** : la route d'upload doit importer `"server-only"` et ne jamais importer `@/lib/prisma` côté client.
- **Tailwind / shadcn** : réutiliser le style existant du `WhatsAppCTA` (couleur `#25D366`, classes Tailwind, focus visible).
- **Accessibilité** : conserver `aria-label`, icône `MessageCircle` avec `aria-hidden`, état désactivé quand pas de numéro.
- **PostHog** : conserver la capture `whatsapp_contact_clicked` sur le CTA ; l'événement est un leading indicator business.

### Décisions de scope à respecter

- **Tracking uniquement sur les opportunités** : les boutons WhatsApp des profils membres (`/members/[id]`) et des experts (`/experts/[slug]`) continuent de pointer directement vers `wa.me`. Seul le CTA sur la fiche opportunité passe par `/api/opportunities/[id]/contact`, conformément à FR85/FR86 et à la story 26.5 (dashboard attractivité).
- **Pas de duplication de `ContactLog`** : chaque clic crée une nouvelle ligne. Le dashboard 26.5 comptera les clics **uniques** avec `count(DISTINCT userId)`.
- **Pas de rate-limiting dans cette story** : le rate limiting sur les opportunités est traité en story 26.7. Éviter d'ajouter de la complexité non demandée.

### Références

- **Epic 26 — Story 26.4** : [epics.md (L2588-L2608)](file:///D:/Code/ivoire-business-club-next/_bmad-output/planning-artifacts/epics.md#L2588-L2608)
- **FR85 / FR86** : [prd.md (L331-L333)](file:///D:/Code/ivoire-business-club-next/_bmad-output/planning-artifacts/prd.md#L331-L333)
- **Architecture endpoint** : [architecture.md (L211-L213)](file:///D:/Code/ivoire-business-club-next/_bmad-output/planning-artifacts/architecture.md#L211-L213)
- **WhatsAppCTA actuel** : `src/components/features/deals/whatsapp-cta.tsx`
- **Helpers WhatsApp** : `src/lib/whatsapp.ts`
- **Route patron autorisation** : `src/app/api/opportunities/[id]/interest/route.ts`
- **Tests patrons** : `src/app/api/opportunities/[id]/interest/route.test.ts`
- **Schéma Prisma** : `prisma/schema.prisma` et `prisma/schema.dev.prisma`
- **Règles générales du projet** : `project-context.md`

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
