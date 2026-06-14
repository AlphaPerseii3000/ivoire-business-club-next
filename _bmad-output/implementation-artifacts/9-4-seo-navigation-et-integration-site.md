---
baseline_commit: 2fa0419852baa150150a74341ec35d0828d85139
---
# Story 9.4: SEO, Navigation et Intégration Site

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**En tant que** fondateur IBC,  
**Je veux** que les articles soient optimisés pour le SEO et intégrés dans la navigation du site,  
**Afin de** maximiser le trafic organique et la découverte du contenu.

## Acceptance Criteria

1. **Métadonnées SEO dynamiques sur le détail de l'article**
   - **Given** un article publié sur `/articles/[slug]`
   - **When** la page est rendue
   - **Then** les meta tags dynamiques (`title`, `description`, `og:title`, `og:description`, `og:image`) sont présents et corrects dans le HTML généré.

2. **Inclusion du sitemap XML**
   - **Given** le sitemap XML du site
   - **When** il est généré (ex: accès à `/sitemap.xml`)
   - **Then** les articles publiés `PUBLIC` sont inclus avec leur URL, `lastmod` (date de mise à jour) et `priority` appropriée.

3. **Lien de navigation principale**
   - **Given** la navigation principale du site
   - **When** l'utilisateur consulte le header/navbar (sur la landing page, sur le catalogue, sur le détail de l'article et sur la page de tarification)
   - **Then** un lien "Articles" pointe vers `/articles`.

4. **Section "Derniers articles" sur la Landing Page**
   - **Given** la landing page `/`
   - **When** un visiteur y accède
   - **Then** une section "Derniers articles" affiche les 3 derniers articles `PUBLIC` publiés (titre, excerpt, date et lien de lecture).

5. **Données structurées JSON-LD**
   - **Given** un article publié sur `/articles/[slug]`
   - **When** la page est rendue
   - **Then** un bloc de structured data JSON-LD (`schema.org/Article`) est présent avec les champs `headline`, `description`, `datePublished`, `dateModified` et `author`.

6. **Tests de validation E2E**
   - **Given** les tests E2E Playwright
   - **When** ils sont exécutés
   - **Then** les scénarios navigation articles, gate premium (visiteur vs membre), et SEO meta tags passent avec succès.

## Tasks / Subtasks

- [x] **Mise à jour des en-têtes de navigation (AC: 3)**
  - [x] Modifier [src/app/(public)/page.tsx](file:///D:/Code/ivoire-business-club-next/src/app/(public)/page.tsx) pour ajouter le lien `<Link href="/articles" className="text-slate-300 hover:text-white transition-colors">Articles</Link>` dans la barre de navigation de la page d'accueil.
  - [x] Modifier [src/app/(public)/articles/page.tsx](file:///D:/Code/ivoire-business-club-next/src/app/(public)/articles/page.tsx) pour ajouter le même lien (ou s'assurer de la présence du lien de manière cohérente).
  - [x] Modifier [src/app/(public)/articles/[slug]/page.tsx](file:///D:/Code/ivoire-business-club-next/src/app/(public)/articles/[slug]/page.tsx) pour renommer le lien "Catalogue" en "Articles" dans l'en-tête de navigation.
  - [x] Modifier [src/app/(public)/pricing/page.tsx](file:///D:/Code/ivoire-business-club-next/src/app/(public)/pricing/page.tsx) pour ajouter un lien "Articles" vers `/articles` de manière stylisée.

- [x] **Section "Derniers articles" sur la page d'accueil (AC: 4)**
  - [x] Créer le composant `src/components/landing/latest-articles.tsx` :
    - Recevoir une liste d'articles.
    - Rendre une section moderne avec un en-tête ("Actualités & Conseils"), un titre accrocheur, et une grille responsive.
    - Chaque carte d'article doit afficher la catégorie (badge stylisé), le titre (cliquable vers `/articles/[slug]`), l'extrait (`excerpt`), et la date formatée en français.
    - Utiliser des micro-animations de hover élégantes (comme des ombres douces teal/gold, des bordures semi-transparentes et des effets glassmorphism).
  - [x] Modifier [src/app/(public)/page.tsx](file:///D:/Code/ivoire-business-club-next/src/app/(public)/page.tsx) pour :
    - Effectuer une requête Prisma afin de récupérer les 3 derniers articles publiés ayant une visibilité `PUBLIC` (triés par `publishedAt` descendant).
    - Importer et insérer le composant `<LatestArticles articles={latestArticles} />` au sein du layout `<main>` juste après la section `<OpportunityTeasers>`.

- [x] **Métadonnées SEO avancées et JSON-LD (AC: 1, 5)**
  - [x] Modifier `generateMetadata` dans [src/app/(public)/articles/[slug]/page.tsx](file:///D:/Code/ivoire-business-club-next/src/app/(public)/articles/[slug]/page.tsx) pour :
    - Générer le titre `${article.title} — Ivoire Business Club`.
    - Fournir la description `article.excerpt`.
    - Ajouter le bloc `openGraph` complet contenant `title`, `description`, `type: "article"`, `url` absolu de la page, `images` (avec `/logo-ibc.webp` en fallback), et `locale: "fr_FR"`.
  - [x] Modifier le composant `ArticleDetailPage` dans [src/app/(public)/articles/[slug]/page.tsx](file:///D:/Code/ivoire-business-club-next/src/app/(public)/articles/[slug]/page.tsx) pour injecter un script JSON-LD de type `Article` de schema.org avec les clés : `headline`, `description`, `datePublished`, `dateModified`, `author.name`, et `publisher` (comprenant le nom et le logo de l'IBC).

- [x] **Génération du sitemap XML dynamique (AC: 2)**
  - [x] Créer le fichier `src/app/sitemap.ts` :
    - Récupérer tous les articles publiés avec visibilité `PUBLIC` depuis Prisma.
    - Déterminer l'URL absolue de base à partir de `process.env.NEXT_PUBLIC_APP_URL` (avec repli sur `https://ivoirebusinessclub.com`).
    - Retourner un tableau d'URLs pour les pages statiques (`/`, `/articles`, `/pricing`) et pour chaque article public avec `lastModified`, `changeFrequency`, et `priority`.

- [x] **Tests de validation E2E avec Playwright (AC: 6)**
  - [x] Créer le fichier `e2e/articles.spec.ts` pour automatiser la validation E2E :
    - Test de navigation : Vérifier que le clic sur le lien "Articles" de la landing page mène bien à `/articles`.
    - Test de la landing page : S'assurer que la section "Derniers articles" est visible et affiche au moins les articles publics existants.
    - Test des métadonnées SEO : S'assurer de la présence des meta tags OpenGraph et du script JSON-LD structuré sur la page de détail d'un article.
    - Test de la Gate Premium : Valider qu'un visiteur anonyme ou non abonné accédant à un article premium (ex: visibilité `AFFRANCHI`) voit bien la gate avec l'extrait et le CTA d'abonnement vers `/pricing`, alors qu'un article public est lisible en entier.
    - Test du sitemap XML : Vérifier que la route `/sitemap.xml` répond correctement et inclut les URLs des articles publics.

## Dev Notes

### Architecture & Garde-fous Next.js 16 / React 19
- **Métadonnées SEO** : Next.js 16 génère automatiquement les balises `<meta>` à partir de l'objet retourné par `generateMetadata`. Veillez à ce que l'URL racine `metadataBase` soit configurée au niveau du layout racine `src/app/layout.tsx` (ou passée de manière absolue).
- **JSON-LD** : L'injection de données structurées via un composant `<script type="application/ld+json">` est parfaitement supportée et recommandée dans l'App Router.
- **Récupération asynchrone des paramètres** : Dans Next.js 16, les `params` de route dynamique doivent être attendus de manière asynchrone (ex: `const { slug } = await params;`). C'est déjà en place dans `src/app/(public)/articles/[slug]/page.tsx`, conservez ce pattern !
- **Prisma Client** : Toujours importer `prisma` depuis `@/lib/prisma` pour éviter les ouvertures multiples de connexions à la base de données.

### Fichiers impactés ou créés
- [src/app/(public)/page.tsx](file:///D:/Code/ivoire-business-club-next/src/app/(public)/page.tsx) (MODIFIED)
- [src/app/(public)/articles/page.tsx](file:///D:/Code/ivoire-business-club-next/src/app/(public)/articles/page.tsx) (MODIFIED)
- [src/app/(public)/articles/[slug]/page.tsx](file:///D:/Code/ivoire-business-club-next/src/app/(public)/articles/[slug]/page.tsx) (MODIFIED)
- [src/app/(public)/pricing/page.tsx](file:///D:/Code/ivoire-business-club-next/src/app/(public)/pricing/page.tsx) (MODIFIED)
- `src/components/landing/latest-articles.tsx` (NEW)
- `src/app/sitemap.ts` (NEW)
- `e2e/articles.spec.ts` (NEW)

### Références
- Modèle Prisma `Article` : [prisma/schema.prisma#L359-L377](file:///D:/Code/ivoire-business-club-next/prisma/schema.prisma#L359-L377)
- Logique de visibilité : [src/lib/article-visibility.ts](file:///D:/Code/ivoire-business-club-next/src/lib/article-visibility.ts)
- Page détail articles de la story 9.3 : [src/app/(public)/articles/[slug]/page.tsx](file:///D:/Code/ivoire-business-club-next/src/app/(public)/articles/[slug]/page.tsx)
- Fichier d'Epics : [epics.md#L1411-L1443](file:///D:/Code/ivoire-business-club-next/_bmad-output/planning-artifacts/epics.md#L1411-L1443)

## Dev Agent Record

### Agent Model Used

Gemini 3.5 Flash (Medium)

### Debug Log References
- task-126: ESLint code checks passed successfully on all modified files
- task-173: Successful production Next.js webpack build verification
- task-230: Playwright local browser environment binaries successfully downloaded and installed
- task-527: 100% success rate on Playwright Chromium E2E test suite (5/5 tests passed)

### Completion Notes List
- Intégration globale des articles avec ajout du lien "Articles" dans toutes les navigations du site (landing page, catalogue, page de détail de l'article, page de tarification).
- Création du composant moderne et esthétique `LatestArticles` avec glassmorphism, animations au survol et grille responsive pour afficher les 3 dernières actualités publiques directement sur la page d'accueil.
- Implémentation des métadonnées SEO dynamiques (titre absolu pour contourner le gabarit global, description openGraph complète, images openGraph, langue fr_FR) sur la page de détail.
- Injection de données structurées dynamiques au format JSON-LD (type Article de schema.org) comprenant les dates de publication/modification ISO, auteur, éditeur et logo officiel de l'IBC.
- Génération d'un sitemap XML dynamique à l'adresse `/sitemap.xml` incluant les pages statiques du site et les URLs des articles avec visibilité `PUBLIC` (les articles premium restent privés et non indexés).
- Couverture complète par des tests E2E Playwright de la navigation, de la section actualités, des métadonnées SEO/JSON-LD, de la gate de restriction premium pour les visiteurs anonymes, et de l'accessibilité du sitemap XML.
- Résolution d'un problème dans les tests unitaires existants (`page.test.tsx`) en fournissant le champ `updatedAt` manquant et en adaptant l'assertion à la structure d'objet du titre SEO absolu.

### File List
- src/app/(public)/page.tsx
- src/app/(public)/articles/page.tsx
- src/app/(public)/articles/[slug]/page.tsx
- src/app/(public)/articles/[slug]/page.test.tsx
- src/app/(public)/pricing/page.tsx
- src/components/landing/latest-articles.tsx
- src/app/sitemap.ts
- e2e/articles.spec.ts

### Review Findings

- [x] [Review][Patch] Problème de sérialisation et d'hydratation des dates dans LatestArticles [src/app/(public)/page.tsx:80]
- [x] [Review][Patch] Risque d'injection XSS dans le script JSON-LD de la page détail d'un article [src/app/(public)/articles/[slug]/page.tsx:150]
- [x] [Review][Patch] Accès non sécurisé à la relation author dans la page détail d'un article [src/app/(public)/articles/[slug]/page.tsx:133]
- [x] [Review][Patch] Crash potentiel sur la date de modification dans le JSON-LD [src/app/(public)/articles/[slug]/page.tsx:132]
- [x] [Review][Patch] Crash potentiel lors du parsing de date dans LatestArticles [src/components/landing/latest-articles.tsx:38]
- [x] [Review][Patch] Génération d'URLs invalides dans le sitemap avec double slash [src/app/sitemap.ts:7]
- [x] [Review][Patch] Mauvaise pratique SEO avec modification de date dynamique sur pages statiques [src/app/sitemap.ts:29]
- [x] [Review][Patch] Inclusion d'articles programmés dans le futur sur la page d'accueil [src/app/(public)/page.tsx:83]
- [x] [Review][Patch] Couverture de tests E2E insuffisante pour les abonnés actifs [e2e/articles.spec.ts:1]
- [x] [Review][Defer] Redondance et duplication de l'URL de base (siteUrl) [src/app/sitemap.ts:7] — deferred, pre-existing
- [x] [Review][Defer] Utilisation d'une balise <a> standard pour la connexion [src/app/(public)/page.tsx:128] — deferred, pre-existing
- [x] [Review][Defer] Incohérence et doublons dans la structure des en-têtes de navigation [src/app/(public)/page.tsx:88] — deferred, pre-existing
- [x] [Review][Defer] Risque de plantage de la page d'accueil sur la récupération des opportunités [src/app/(public)/page.tsx:45] — deferred, pre-existing
- [x] [Review][Defer] Mauvaise gestion des paramètres de requête multiples pour la catégorie [src/app/(public)/articles/page.tsx:35] — deferred, pre-existing


