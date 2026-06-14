# Story 9.3: Catalogue Public et Pages Détail avec Gate Premium

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**En tant que** visiteur ou membre IBC,  
**Je veux** parcourir et lire des articles selon mon niveau d'accès,  
**Afin de** bénéficier de contenu éditorial gratuit et découvrir la valeur premium.

## Acceptance Criteria

1. **Visiteur anonyme sur le catalogue**
   - **Given** un visiteur non connecté sur `/articles`
   - **When** la page se charge
   - **Then** seuls les articles `PUBLIC` publiés sont affichés, triés par date de publication récente.

2. **Membre actif avec accès complet**
   - **Given** un membre connecté avec le tier `AFFRANCHI` (ou supérieur) et un abonnement actif sur `/articles`
   - **When** la page se charge
   - **Then** les articles `PUBLIC` et `AFFRANCHI` (et les tiers inférieurs correspondants) sont affichés intégralement avec un lien de lecture complète.

3. **Membre inactif ou sans abonnement (Catalogue)**
   - **Given** un membre connecté sans abonnement actif (ou au statut inactif) sur `/articles`
   - **When** la page se charge
   - **Then** les articles `PUBLIC` sont affichés intégralement, tandis que les articles premium (`AFFRANCHI`, `GRAND_FRERE`, `BOSS`) affichent leur titre, leur extrait (`excerpt`) et un bouton CTA clair "Abonnez-vous pour lire" (qui redirige vers `/pricing`).

4. **Accès au détail d'un article public**
   - **Given** un visiteur (anonyme ou connecté) sur `/articles/comment-investir-abidjan`
   - **When** l'article est marqué `PUBLIC` et publié
   - **Then** le contenu complet de l'article est affiché avec ses balises meta SEO.

5. **Accès au détail d'un article premium (Gated)**
   - **Given** un utilisateur connecté sans abonnement actif (ou visiteur anonyme) sur `/articles/guide-premium`
   - **When** l'article a une visibilité premium (ex: `AFFRANCHI`)
   - **Then** le titre et l'extrait (`excerpt`) sont affichés, accompagnés d'un encart premium (Gate Panel) contenant un message incitant à l'abonnement et un bouton CTA "Abonnez-vous pour lire l'article complet" pointant vers `/pricing`.

6. **Filtrage par catégorie**
   - **Given** un utilisateur sur `/articles`
   - **When** il clique sur un filtre de catégorie (`conseil`, `guide`, `témoignage`, `actu` ou "Tous")
   - **Then** la page affiche uniquement les articles correspondant à cette catégorie et qui respectent les règles de visibilité selon son niveau d'accès.

7. **Article inexistant ou brouillon**
   - **Given** un utilisateur accédant à `/articles/article-inconnu`
   - **When** l'article n'existe pas en base de données ou n'est pas publié (`published: false`)
   - **Then** une page 404 standard (via `notFound()`) est affichée.

## Tasks / Subtasks

- [ ] **Configuration des routes d'accès public (AC: 1, 4)**
  - [ ] Modifier [src/lib/auth.config.ts](file:///D:/Code/ivoire-business-club-next/src/lib/auth.config.ts) pour ajouter `"/articles"` au tableau `publicRoutes`. Cela permettra aux visiteurs anonymes d'accéder aux pages `/articles` et `/articles/[slug]` sans être redirigés vers `/auth/signin`.

- [ ] **Composants d'interface utilisateur (AC: 1, 2, 3, 5, 6)**
  - [ ] Créer `src/components/features/articles/ArticleCard.tsx` :
    - Recevoir l'article, un indicateur d'accès autorisé (`hasAccess`) et le tier de l'article.
    - Afficher le titre, l'extrait (`excerpt`), la catégorie, la date de publication formattée en français.
    - Afficher un badge de visibilité stylisé selon les couleurs établies dans la story 9.2 (PUBLIC = gris/neutral, AFFRANCHI = teal, GRAND_FRERE = amber, BOSS = violet) avec une icône de verrou si l'accès est bloqué.
    - Si `hasAccess` est faux, rendre un bouton/lien "Abonnez-vous pour lire" pointant vers `/pricing` ou vers `/articles/[slug]` (où la gate sera affichée).
    - Si `hasAccess` est vrai, rendre un bouton "Lire l'article" pointant vers `/articles/[slug]`.
  - [ ] Créer `src/components/features/articles/ArticleContent.tsx` :
    - Rendre le contenu Markdown de l'article sous forme HTML de manière propre et sécurisée (parseur basique sans bibliothèque lourde, transformant les paragraphes, les titres `#` / `##`, les listes à puces `-`, et le gras `**`).

- [ ] **Catalogue et Détail Articles (AC: 1, 2, 3, 4, 5, 6, 7)**
  - [ ] Créer `src/app/(public)/articles/page.tsx` (Page catalogue Server Component) :
    - Récupérer la session actuelle via `auth()`.
    - Vérifier si l'utilisateur possède un abonnement actif avec `hasActiveSubscription(session?.user?.id)`.
    - Récupérer le tier de l'utilisateur connecté `(session?.user as any)?.tier`.
    - Récupérer tous les articles publiés (`published: true`) depuis Prisma, triés par date décroissante.
    - Gérer le filtrage par catégorie en utilisant le paramètre de requête d'URL `category` (ex: `/articles?category=conseil`).
    - Appliquer le filtrage de visibilité côté serveur :
      - Visiteur anonyme : n'afficher que les articles de visibilité `PUBLIC`.
      - Membre connecté : afficher tous les articles, mais calculer `hasAccess` pour chacun en utilisant `getAccessibleArticleVisibilities(userTier, hasActiveSub)`. Les articles non accessibles affichent le CTA "Abonnez-vous pour lire".
    - Intégrer l'en-tête (Header) et le pied de page (Footer) de la landing page pour conserver une identité visuelle premium.
  - [ ] Créer `src/app/(public)/articles/[slug]/page.tsx` (Page de détail Server Component) :
    - Attendre et destructurer `params` asynchrones : `const { slug } = await params;`.
    - Récupérer l'article correspondant au `slug` depuis Prisma. Si non trouvé ou non publié, appeler `notFound()`.
    - Récupérer la session, le statut d'abonnement actif et le tier de l'utilisateur.
    - Calculer les droits d'accès complets : `isAdmin || article.visibility === "PUBLIC" || (hasActiveSub && visibilities.includes(article.visibility))`.
    - Si l'accès est autorisé : afficher le titre, les métadonnées (catégorie, auteur, date) et le contenu complet via le composant `ArticleContent`.
    - Si l'accès est restreint : afficher le titre, l'extrait (`excerpt`), et un bloc d'incitation premium (Gate Panel) avec une icône de cadenas et un bouton CTA "Abonnez-vous pour lire l'article complet" pointant vers `/pricing`.
    - Exposer des métadonnées SEO basiques (titre de l'article, extrait en description).

- [ ] **Tests unitaires et de validation (AC: 1-7)**
  - [ ] Créer `src/app/(public)/articles/page.test.tsx` pour tester :
    - Le rendu de la page catalogue pour un visiteur anonyme (seuls les articles publics sont visibles).
    - Le rendu pour un membre actif (accès complet aux articles de son tier).
    - Le rendu pour un membre inactif (affichage des articles premium sous forme d'extrait + CTA d'upgrade).
    - Le fonctionnement du filtre par catégorie.
  - [ ] Créer `src/app/(public)/articles/[slug]/page.test.tsx` pour tester :
    - L'accès complet à un article public.
    - La restriction d'accès avec Gate Panel (extrait + CTA) pour un article premium sans abonnement.
    - L'affichage de la page 404 (appel de `notFound`) pour un article inexistant ou non publié.
  - [ ] Lancer les tests avec `npx vitest run` et s'assurer que tout passe avec succès.

## Dev Notes

### Architecture & Conventions

- **Next.js 16 / React 19 Params** : Dans les composants serveurs de Next.js 16, destructurer `params` de façon asynchrone (ex: `const { slug } = await params;`).
- **Garde-fous JSX** : Remplacer systématiquement les court-circuits logiques `condition && <Component />` par des ternaires explicites `condition ? <Component /> : null` pour éviter les crashs de rendu sous React 19.
- **Accès Premium** : Utiliser exclusivement `hasActiveSubscription(userId)` de [src/lib/subscription-access.ts](file:///D:/Code/ivoire-business-club-next/src/lib/subscription-access.ts) pour vérifier le statut de paiement. Ne jamais faire confiance au tier de l'utilisateur sans valider l'abonnement actif.
- **Sécurisation des logs** : Passer toutes les erreurs attrapées dans les blocs `try/catch` à `sanitizeError` de `@/lib/sanitize-log` avant de faire un `console.error`.

### Fichiers impactés ou créés

- [src/lib/auth.config.ts](file:///D:/Code/ivoire-business-club-next/src/lib/auth.config.ts) (MODIFIED) - Ajout de `/articles` aux routes publiques.
- `src/components/features/articles/ArticleCard.tsx` (NEW) - Carte d'article avec gate et badge.
- `src/components/features/articles/ArticleContent.tsx` (NEW) - Rendu du contenu Markdown.
- `src/app/(public)/articles/page.tsx` (NEW) - Catalogue public des articles.
- `src/app/(public)/articles/[slug]/page.tsx` (NEW) - Page détail article avec premium gate.
- `src/app/(public)/articles/page.test.tsx` (NEW) - Suite de tests unitaires pour le catalogue.
- `src/app/(public)/articles/[slug]/page.test.tsx` (NEW) - Suite de tests unitaires pour le détail.

### Références

- Définition d'Epic 9 : [epics.md#L1373-L1409](file:///D:/Code/ivoire-business-club-next/_bmad-output/planning-artifacts/epics.md#L1373-L1409)
- Modèle de données Prisma : [prisma/schema.prisma#L359-L377](file:///D:/Code/ivoire-business-club-next/prisma/schema.prisma#L359-L377)
- Logique de visibilité : [src/lib/article-visibility.ts](file:///D:/Code/ivoire-business-club-next/src/lib/article-visibility.ts)
- Vérification d'abonnement : [src/lib/subscription-access.ts](file:///D:/Code/ivoire-business-club-next/src/lib/subscription-access.ts)
- Proposition de modification de Sprint : [sprint-change-proposal-2026-06-13.md](file:///D:/Code/ivoire-business-club-next/_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-13.md)

## Dev Agent Record

### Agent Model Used

Gemini 3.5 Flash (Medium)

### Debug Log References

### Completion Notes List

### File List
