---
baseline_commit: 79cd68ac9d0b2c6497ebcfb161d6cf375ec53e75
---
# Story 13.2: Page publique liste des experts

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**En tant que** visiteur,  
**Je veux** consulter la liste des experts IBC,  
**Afin d'**identifier les consultants qui peuvent m'aider sur mes projets.

## Acceptance Criteria

1. **Visiteur anonyme sur la liste des experts**
   - **Given** un visiteur non connecté sur `/experts`
     - **When** la page se charge
     - **Then** les experts publiés (`isPublished: true`) sont affichés sous forme de cartes (composant `ExpertCard` avec photo, nom, titre, spécialités) triés par date de création récente.
     - **And** des filtres par spécialité (chips horizontaux scrollables) sont disponibles.

2. **Affichage du badge de tier requis**
   - **Given** les experts listés sur `/experts`
     - **When** ils ont un niveau d'abonnement requis (`requiredTier` : `AFFRANCHI`, `GRAND_FRERE` ou `BOSS`)
     - **Then** un badge de tier coloré s'affiche sur leur carte en utilisant `getTierBadgeConfig`.
     - **And** si l'utilisateur est connecté et possède un abonnement actif suffisant (ou est ADMIN), le badge s'affiche normalement. Sinon, un cadenas `Lock` apparaît à côté du nom du tier.

3. **Filtrage par spécialité**
   - **Given** la liste des experts sur `/experts`
     - **When** l'utilisateur clique sur un filtre de spécialité (ex: "Fiscalité" ou "Tous")
     - **Then** seuls les experts publiés dont les spécialités contiennent ce tag sont affichés.
     - **And** le filtre est persistant via le paramètre de requête URL `?specialty=...`.

4. **Accès au détail d'un expert avec accès complet**
   - **Given** un utilisateur connecté ayant un abonnement actif et un tier supérieur ou égal au tier requis de l'expert (ou un utilisateur ADMIN)
     - **When** il accède à `/experts/[slug]`
     - **Then** la page affiche toutes ses informations : photo, nom, titre professionnel, spécialités, biographie complète, et les boutons de contact actifs (WhatsApp deep link `https://wa.me/{number}`, email `mailto:{email}`, téléphone `tel:{phone}` si renseignés).

5. **Accès au détail d'un expert avec accès restreint (Gate Panel)**
   - **Given** un visiteur non connecté, un membre sans abonnement actif, ou un membre connecté avec un tier inférieur au tier requis de l'expert sur `/experts/[slug]`
     - **When** il consulte le profil de l'expert
     - **Then** la photo, le nom, le titre professionnel et les spécialités sont visibles.
     - **And** sa biographie complète ainsi que ses coordonnées de contact (WhatsApp, email, téléphone) sont masquées et remplacées par un Encart Premium (Gate Panel) indiquant que l'expert est réservé aux membres de ce tier.
     - **And** le Gate Panel affiche un message d'incitation avec un bouton CTA "Abonnez-vous" redirigeant vers `/pricing` (ou "Se connecter" redirigeant vers `/auth/signin` si anonyme).

6. **Expert inexistant ou brouillon**
   - **Given** un utilisateur accédant à `/experts/expert-inconnu`
     - **When** l'expert n'existe pas en base de données ou n'est pas publié (`isPublished: false`)
     - **Then** une page 404 standard (via `notFound()`) est affichée (les administrateurs contournent la restriction de publication).

7. **État vide (Empty State)**
   - **Given** aucun expert publié (ou aucun ne correspondant à la spécialité sélectionnée)
     - **When** la page se charge
     - **Then** le composant `EmptyState` s'affiche avec un message adéquat : "Aucun expert trouvé."

8. **Navigation & SEO**
   - **Given** la landing page ou le catalogue
     - **When** l'utilisateur navigue dans le header ou le mobile nav
     - **Then** des liens "Experts" pointent vers `/experts`.
     - **And** la page de détail `/experts/[slug]` configure des meta tags SEO dynamiques (titre, description) ainsi qu'un Structured Data JSON-LD de type `ProfilePage` ou `Person`.

## Tasks / Subtasks

- [x] **Développement de la page liste `/experts`**
  - [x] Créer la page serveur `src/app/(public)/experts/page.tsx`.
  - [x] Récupérer les experts publiés (`isPublished: true`) triés par `createdAt desc` via Prisma.
  - [x] Récupérer la session utilisateur via `auth()`.
  - [x] Déterminer l'état d'abonnement actif (`hasActiveSubscription(userId)`) et le tier de l'utilisateur.
  - [x] Extraire toutes les spécialités uniques des experts publiés pour alimenter les filtres. Étant donné que les spécialités sont stockées sous forme de chaîne de caractères séparées par des virgules (ex: `"immobilier, finance"`), split les chaînes, trim les valeurs, et filtrer pour obtenir une liste plate unique (ex: `["Immobilier", "Finance"]`).
  - [x] Implémenter le filtrage par spécialité en vérifiant si la spécialité sélectionnée (depuis `searchParams`) est incluse dans le champ `specialties` de l'expert (sans distinction de casse).
  - [x] Créer le composant `ExpertCard` dans `src/components/features/experts/ExpertCard.tsx`.
    - [x] Afficher la photo (ou un fallback élégant aux couleurs de l'IBC en utilisant des initiales ou une icône d'avatar s'il n'y a pas de photo).
    - [x] Afficher le nom, le titre professionnel et les spécialités sous forme de petits tags.
    - [x] Afficher le badge de tier requis (`requiredTier`) en utilisant `getTierBadgeConfig`. Si l'utilisateur n'a pas accès, ajouter une icône `Lock` à côté du libellé du tier.
    - [x] Ajouter un lien vers `/experts/[slug]`.

- [x] **Développement de la page de détail `/experts/[slug]`**
  - [x] Créer la page serveur `src/app/(public)/experts/[slug]/page.tsx` (gérer les paramètres de chemin dynamiques de manière asynchrone : `const { slug } = await params;`).
  - [x] Implémenter une fonction cache d'accès DB `getExpertBySlug(slug: string)` pour charger l'expert.
  - [x] Gérer les cas non trouvés ou non publiés : rediriger vers `notFound()` sauf si l'utilisateur est administrateur (`role === "ADMIN"`).
  - [x] Vérifier les droits d'accès : `isAdmin || (isLoggedIn && hasActiveSub && canUserAccessOpportunity(expert.requiredTier, userTier))`.
  - [x] Rendre les informations de l'expert :
    - [x] **Si accès autorisé** : Afficher la biographie complète, les spécialités, et la section de contact.
      - [x] Implémenter le bouton WhatsApp CTA (vert `#25D366`, ouvrant `https://wa.me/{number}` ou `https://api.whatsapp.com/send` avec un message pré-rempli en français : "Bonjour, je souhaite vous contacter concernant mes projets d'investissement sur IBC.").
      - [x] Implémenter les liens Email (`mailto:`) et Téléphone (`tel:`).
    - [x] **Si accès restreint** : Masquer la biographie complète et les boutons de contact. Afficher à la place un panneau de restriction (Gate Panel / Encart Premium) stylisé avec un bouton de CTA vers `/pricing` ou `/auth/signin`.
  - [x] Ajouter du code JSON-LD de type `ProfilePage` ou `Person` pour l'indexation et l'optimisation SEO.
  - [x] Gérer les métadonnées SEO dynamiques dans `generateMetadata` de la page.

- [x] **Intégration de la navigation**
  - [x] Mettre à jour les en-têtes et menus de navigation pour inclure l'annuaire des experts :
    - [x] Ajouter un lien "Experts" pointant vers `/experts` dans le header desktop de `src/app/(public)/page.tsx`, `src/app/(public)/articles/page.tsx`, `src/app/(public)/events/page.tsx` et sur les nouvelles pages `/experts` et `/experts/[slug]`.
    - [x] Ajouter l'entrée "Experts" dans le menu staggered de la navigation mobile de `src/components/landing/mobile-nav.tsx` (entre "Articles" et "Événements").

- [x] **Écriture des Tests Unitaires et d'Intégration**
  - [x] Créer le fichier `src/app/(public)/experts/page.test.tsx` pour tester :
    - [x] L'affichage de la liste des experts publiés.
    - [x] L'application correcte du filtre de spécialité.
    - [x] L'état vide (`EmptyState`) lorsqu'aucun expert n'est trouvé.
    - [x] L'affichage du badge de tier requis avec ou sans cadenas selon la session.
  - [x] Créer le fichier `src/app/(public)/experts/[slug]/page.test.tsx` pour tester :
    - [x] Le chargement correct d'un expert par son slug.
    - [x] Le retour d'une page 404 si l'expert est un brouillon (et l'utilisateur n'est pas Admin).
    - [x] L'accès complet (affichage de la bio et des boutons de contact) pour un utilisateur éligible.
    - [x] Le masquage de la bio et du contact et l'affichage du Gate Panel pour un utilisateur non éligible ou non connecté.
  - [x] Exécuter la suite de tests unitaires via `npx vitest run` et valider que tout est vert.

### Review Findings

- [x] [Review][Patch] TypeScript TypeError / Crash Vulnerability on Multi-Value Search Params [src/app/(public)/experts/page.tsx:28]
- [x] [Review][Patch] SEO Metadata Leak for Unpublished Draft Experts [src/app/(public)/experts/[slug]/page.tsx:38]
- [x] [Review][Patch] Duplicate/Conflicting CTA Buttons for Anonymous Users in Gate Panel [src/app/(public)/experts/[slug]/page.tsx:333]
- [x] [Review][Patch] Relative photoUrl leading to broken absolute paths in OpenGraph [src/app/(public)/experts/[slug]/page.tsx:48]
- [x] [Review][Patch] Relative photoUrl leading to broken absolute paths in JSON-LD [src/app/(public)/experts/[slug]/page.tsx:143]
- [x] [Review][Patch] Null/Empty Expert Title resulting in null meta description [src/app/(public)/experts/[slug]/page.tsx:45]
- [x] [Review][Patch] Fragile and Error-Prone Initials Parsing [src/components/features/experts/ExpertCard.tsx:36]
- [x] [Review][Patch] Inconsistent App URL Sanitization [src/app/(public)/experts/[slug]/page.tsx:135]
- [x] [Review][Defer] Boilerplate Navigation Header Duplication [src/app/(public)/...:1] — deferred, pre-existing
- [x] [Review][Defer] Hardcoded Navigation Active States [src/app/(public)/...:1] — deferred, pre-existing
- [x] [Review][Defer] Denormalized Database Design Smell [prisma/schema.prisma:1] — deferred, pre-existing

## Dev Notes

- **Langue du projet** : Tous les messages de validation, labels, boutons, états vides, encarts premium, et commentaires doivent être rédigés en **français**.
- **Next.js 16 / React 19 App Router** : Les paramètres dynamiques de chemins (ex: `params` dans les Route Handlers et les pages serveur) doivent être attendus de manière asynchrone : `const { slug } = await params;`.
- **Garde-fous JSX** : Ne pas utiliser de double esperluette `&&` pour les rendus conditionnels dans JSX, préférer le format `{condition ? <Component /> : null}` et pré-calculer les conditions complexes.
- **Accès Premium** : Utiliser `hasActiveSubscription(userId)` pour valider l'abonnement actif et `canUserAccessOpportunity(requiredTier, userTier)` pour la comparaison de niveau de tier.
- **Sécurisation des logs** : Passer toutes les erreurs capturées dans les blocs `try/catch` à `sanitizeError` de `@/lib/sanitize-log` avant de faire un `console.error`.
- **Zéro Nesting d'Ancres (Crucial)** : Veiller à ne pas imbriquer de balise `<Link>` Next.js ou de balises `<a>` HTML les unes dans les autres (par exemple, un bouton de lien à l'intérieur d'une carte déjà enveloppée d'un `<Link>`).

### Project Structure Notes

- Respecter la structure modulaire de l'application en plaçant les composants et pages aux bons endroits dans `src/app/(public)` et `src/components/features/experts`.
- Utiliser les composants et styles existants (badges, boutons, cartes de design de l'Ivoire Business Club).

### References

- Définition d'Epic 13 & Story 13.2 : [sprint-change-proposal-2026-06-18.md#L535-L555](file:///D:/Code/ivoire-business-club-next/_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-18.md#L535-L555)
- Code de référence pour le Catalogue & Gating : [src/app/(public)/articles/page.tsx](file:///D:/Code/ivoire-business-club-next/src/app/(public)/articles/page.tsx) et [src/app/(public)/articles/[slug]/page.tsx](file:///D:/Code/ivoire-business-club-next/src/app/(public)/articles/[slug]/page.tsx)
- Logique de visibilité et helper de tier : [src/lib/opportunity-visibility.ts](file:///D:/Code/ivoire-business-club-next/src/lib/opportunity-visibility.ts)

## Dev Agent Record

### Agent Model Used

Gemini 3.5 Flash (Medium)

### Debug Log References

- Mocking non-throwing `notFound()` in unit tests triggers continued execution of server components. Fixed by adding `return null;` immediately following `notFound()` calls.

### Completion Notes List

- Implemented `ExpertCard` component with photo, name, title, specialties, and tier requirements.
- Developed public listing page `/experts` with dynamic specialty filters and `searchParams` state synchronization.
- Created profile page `/experts/[slug]` with access gating logic and premium Encart Premium (Gate Panel) fallback.
- Added ProfilePage JSON-LD structured data and dynamic SEO metadata.
- Integrated "Experts" route in mobile nav (staggered menu) and desktop navigation headers across all public pages.
- Verified functionality and edge cases with 10 robust unit and integration tests under vitest.

### File List

- [ExpertCard.tsx](file:///d:/Code/ivoire-business-club-next/src/components/features/experts/ExpertCard.tsx)
- [page.tsx](file:///d:/Code/ivoire-business-club-next/src/app/(public)/experts/page.tsx)
- [page.tsx](file:///d:/Code/ivoire-business-club-next/src/app/(public)/experts/[slug]/page.tsx)
- [mobile-nav.tsx](file:///d:/Code/ivoire-business-club-next/src/components/landing/mobile-nav.tsx)
- [page.tsx](file:///d:/Code/ivoire-business-club-next/src/app/(public)/page.tsx)
- [page.tsx](file:///d:/Code/ivoire-business-club-next/src/app/(public)/events/page.tsx)
- [page.tsx](file:///d:/Code/ivoire-business-club-next/src/app/(public)/events/[slug]/page.tsx)
- [page.tsx](file:///d:/Code/ivoire-business-club-next/src/app/(public)/articles/page.tsx)
- [page.tsx](file:///d:/Code/ivoire-business-club-next/src/app/(public)/articles/[slug]/page.tsx)
- [page.tsx](file:///d:/Code/ivoire-business-club-next/src/app/(public)/pricing/page.tsx)
- [page.test.tsx](file:///d:/Code/ivoire-business-club-next/src/app/(public)/experts/page.test.tsx)
- [page.test.tsx](file:///d:/Code/ivoire-business-club-next/src/app/(public)/experts/[slug]/page.test.tsx)
