---
baseline_commit: fa4b0085a000d32a7e3928da4487e4082bd18614
---
# Story 28.4: Code Quality & Tech Debt Cleanup

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want the code to be centralized, testable, and robust,
so that maintenance is reduced and future bugs are prevented.

## Acceptance Criteria

1. **Centralisation header/footer dans le layout public**
   - Given les pages publiques (landing, articles, events, partners, experts, mentions-legales, etc.)
     When on inspecte le code source
     Then le header et le footer sont définis une seule fois dans le layout Next.js et hérités par toutes les pages
     And aucune page ne redéfinit manuellement le header/footer.

2. **Centralisation siteUrl dans constante unique**
   - Given le fichier sitemap.ts et les pages qui construisent des URLs absolues
     When on cherche l'URL de base
     Then elle provient d'une constante unique (ex: `src/lib/site-config.ts` ou `process.env.NEXT_PUBLIC_SITE_URL`).

3. **Correction lien "Tarifs" dans la navigation**
   - Given le lien "Tarifs" dans la navigation mobile sur /partners ou /partners/[slug]
     When l'utilisateur clique dessus
     Then il est redirigé vers la landing page avec l'ancre #pricing (et non une ancre sur la page courante).

4. **Try-catch sur l'import de patch-readlink.js**
   - Given le fichier next.config.ts
     When le module patch-readlink.js est absent ou corrompu
     Then le build ne crash pas (try-catch autour de l'import).

5. **Utilisation userEvent au lieu de fireEvent dans les tests**
   - Given les tests interactifs (boutons, formulaires, selects)
     When on cherche/inspecte le code de test
     Then ils utilisent userEvent.click / userEvent.type (pas fireEvent).

6. **Remplacement parsing globals.css dans le test d'accessibilité**
   - Given le test d'accessibilité accessibility.test.tsx
     When il vérifie les animations CSS
     Then il utilise getComputedStyle ou un mock runtime au lieu de fs.readFileSync(globals.css).

## Tasks / Subtasks

- [x] Centralisation du header/footer (AC: 1, 3)
  - [x] Créer le composant unique `src/components/landing/header.tsx` avec gestion de l'état de connexion (`auth()`)
  - [x] Mettre à jour `src/app/(public)/layout.tsx` pour inclure globalement `LandingMobileNav`, `Header`, et `Footer`
  - [x] Supprimer les en-têtes et pieds de page locaux de toutes les pages sous `src/app/(public)`
- [x] Centralisation de `siteUrl` (AC: 2)
  - [x] Créer le fichier `src/lib/site-config.ts` exportant la constante `SITE_URL`
  - [x] Mettre à jour `src/app/sitemap.ts`, `src/app/layout.tsx`, `src/app/robots.ts`, et les pages dynamiques `articles/[slug]`, `events/[slug]`, `experts/[slug]`, `partners/[slug]` pour utiliser `SITE_URL`
- [x] Try-catch sur l'import de patch-readlink.js (AC: 4)
  - [x] Mettre à jour `next.config.ts` pour encapsuler le `require("./patch-readlink.js")` dans un bloc try-catch
- [x] Mettre à jour le test d'accessibilité (AC: 6)
  - [x] Modifier `src/app/accessibility.test.tsx` pour remplacer la lecture de `globals.css` via `fs` par des assertions `getComputedStyle` et `matchMedia` au runtime
- [x] Migration de `fireEvent` vers `userEvent` (AC: 5)
  - [x] Migrer les tests interactifs identifiés qui utilisent encore `fireEvent` pour utiliser `userEvent` :
    - [x] `src/app/(admin)/admin/members/_components/admin-member-filter-select.test.tsx`
    - [x] `src/app/(admin)/admin/members/_components/admin-member-search-input.test.tsx`
    - [x] `src/app/auth/forgot-password/page.test.tsx`
    - [x] `src/app/auth/reset-password/page.test.tsx`
    - [x] `src/app/auth/signin/page.test.tsx`
    - [x] `src/app/auth/signup/page.test.tsx`
    - [x] `src/components/bank-transfer-instructions.test.tsx`
    - [x] `src/components/features/admin/event-form.test.tsx`
    - [x] `src/components/features/articles/ArticleCommentsSection.test.tsx`
    - [x] `src/components/features/auth/resend-verification-button.test.tsx`
    - [x] `src/components/features/chat/beta-chat-widget.test.tsx`
    - [x] `src/components/features/deals/review-form.test.tsx`
    - [x] `src/components/features/events/EventGallery.test.tsx`
    - [x] `src/components/features/onboarding/complete-profile-form.test.tsx`
    - [x] `src/components/orange-money-instructions.test.tsx`
    - [x] `src/components/wave-instructions.test.tsx`

## Dev Notes

- **Conventions d'importation :** Utiliser l'alias `@/*` pour tout import depuis le dossier `src/` (ex: `@/lib/site-config`).
- **userEvent.setup() :** Toujours appeler `const user = userEvent.setup()` au début du test avant d'appeler `await user.click()` ou `await user.type()`.

### Project Structure Notes

- **Header / Footer :** Placé sous `src/components/landing/header.tsx` et importé dans `src/app/(public)/layout.tsx`.
- **Site URL :** Défini sous `src/lib/site-config.ts` sous la forme :
  ```typescript
  export const SITE_URL = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://www.ivoire-business-club.com'
  ).replace(/\/$/, '');
  ```

### References

- [Source: project-context.md](file:///D:/Code/ivoire-business-club-next/project-context.md) — Règles générales et structure du projet.
- [Source: epics.md](file:///D:/Code/ivoire-business-club-next/_bmad-output/planning-artifacts/epics.md#L3014) — Spécifications de la Story 28-4.

## Dev Agent Record

### Agent Model Used

Gemini 3.5 Flash (High)

### Debug Log References

- [TypeScript Check Log](file:///C:/Users/para1/.gemini/antigravity-cli/brain/e5cf5344-a6f9-42fd-bf24-3054519c98e4/.system_generated/tasks/task-171.log)
- [Accessibility Test Run Log](file:///C:/Users/para1/.gemini/antigravity-cli/brain/e5cf5344-a6f9-42fd-bf24-3054519c98e4/.system_generated/tasks/task-275.log)

### Completion Notes List

- Centralisation du header et du footer dans `layout.tsx` effectuée.
- Centralisation de `SITE_URL` effectuée.
- Try-catch sur l'import de `patch-readlink.js` effectué.
- Test d'accessibilité converti aux vérifications JSDOM au runtime.
- Migration de 16 fichiers de tests interactifs de `fireEvent` vers `userEvent` effectuée.

### File List

- [src/components/landing/header.tsx](file:///D:/Code/ivoire-business-club-next/src/components/landing/header.tsx)
- [src/app/(public)/layout.tsx](file:///D:/Code/ivoire-business-club-next/src/app/(public)/layout.tsx)
- [src/lib/site-config.ts](file:///D:/Code/ivoire-business-club-next/src/lib/site-config.ts)
- [src/app/sitemap.ts](file:///D:/Code/ivoire-business-club-next/src/app/sitemap.ts)
- [src/app/layout.tsx](file:///D:/Code/ivoire-business-club-next/src/app/layout.tsx)
- [src/app/robots.ts](file:///D:/Code/ivoire-business-club-next/src/app/robots.ts)
- [next.config.ts](file:///D:/Code/ivoire-business-club-next/next.config.ts)
- [src/app/accessibility.test.tsx](file:///D:/Code/ivoire-business-club-next/src/app/accessibility.test.tsx)
- [src/app/(admin)/admin/members/_components/admin-member-filter-select.test.tsx](file:///D:/Code/ivoire-business-club-next/src/app/(admin)/admin/members/_components/admin-member-filter-select.test.tsx)
- [src/app/(admin)/admin/members/_components/admin-member-search-input.test.tsx](file:///D:/Code/ivoire-business-club-next/src/app/(admin)/admin/members/_components/admin-member-search-input.test.tsx)
- [src/app/auth/forgot-password/page.test.tsx](file:///D:/Code/ivoire-business-club-next/src/app/auth/forgot-password/page.test.tsx)
- [src/app/auth/reset-password/page.test.tsx](file:///D:/Code/ivoire-business-club-next/src/app/auth/reset-password/page.test.tsx)
- [src/app/auth/signin/page.test.tsx](file:///D:/Code/ivoire-business-club-next/src/app/auth/signin/page.test.tsx)
- [src/app/auth/signup/page.test.tsx](file:///D:/Code/ivoire-business-club-next/src/app/auth/signup/page.test.tsx)
- [src/components/bank-transfer-instructions.test.tsx](file:///D:/Code/ivoire-business-club-next/src/components/bank-transfer-instructions.test.tsx)
- [src/components/features/admin/event-form.test.tsx](file:///D:/Code/ivoire-business-club-next/src/components/features/admin/event-form.test.tsx)
- [src/components/features/articles/ArticleCommentsSection.test.tsx](file:///D:/Code/ivoire-business-club-next/src/components/features/articles/ArticleCommentsSection.test.tsx)
- [src/components/features/auth/resend-verification-button.test.tsx](file:///D:/Code/ivoire-business-club-next/src/components/features/auth/resend-verification-button.test.tsx)
- [src/components/features/chat/beta-chat-widget.test.tsx](file:///D:/Code/ivoire-business-club-next/src/components/features/chat/beta-chat-widget.test.tsx)
- [src/components/features/deals/review-form.test.tsx](file:///D:/Code/ivoire-business-club-next/src/components/features/deals/review-form.test.tsx)
- [src/components/features/events/EventGallery.test.tsx](file:///D:/Code/ivoire-business-club-next/src/components/features/events/EventGallery.test.tsx)
- [src/components/features/onboarding/complete-profile-form.test.tsx](file:///D:/Code/ivoire-business-club-next/src/components/features/onboarding/complete-profile-form.test.tsx)
- [src/components/orange-money-instructions.test.tsx](file:///D:/Code/ivoire-business-club-next/src/components/orange-money-instructions.test.tsx)
- [src/components/wave-instructions.test.tsx](file:///D:/Code/ivoire-business-club-next/src/components/wave-instructions.test.tsx)
