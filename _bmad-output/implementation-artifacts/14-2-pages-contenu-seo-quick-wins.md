---
baseline_commit: 0f07b0dcb8dc54bbb37b0a2cc4b96be9ab5e31ad
Status: done
---

# Story 14.2 : Pages de Contenu SEO Quick Wins

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**En tant que** visiteur recherchant des opportunités business en Côte d'Ivoire,  
**Je veux** trouver des pages de contenu pertinentes sur IBC quand je recherche "abidjan business" ou "ivoire business actualite",  
**Afin que** je découvre le club et m'inscrive.

## Contexte Business

Le site IBC génère 75 clics/3 mois et seul la homepage est indexée. Google Search Console montre des requêtes non-brand exploitables : "abidjan business" (56 impressions, position 11.3) et "ivoire business actualite" (24 impressions, position 9.0). La Story 14.1 a posé les fondations SEO techniques (canonicalisation www, sitemap, robots.txt, meta homepage). Cette story crée deux pages de contenu ciblant ces requêtes, améliore le maillage interne et optimise les métas des sous-pages publiques pour accélérer l'indexation et capter du trafic qualifié.

## Acceptance Criteria

1. **AC1 — Page /business-abidjan**
   - **Given** un visiteur accède à `https://www.ivoire-business-club.com/business-abidjan`
   - **When** la page est rendue
   - **Then** le `<h1>` contient "Business à Abidjan"
   - **And** le `<title>` contient "Business à Abidjan"
   - **And** la meta description cible "business abidjan" et "opportunités"
   - **And** le contenu fait minimum 300 mots
   - **And** la page est incluse dans le sitemap XML
   - **And** la page a une balise canonical

2. **AC2 — Page /actualites**
   - **Given** un visiteur accède à `https://www.ivoire-business-club.com/actualites`
   - **When** la page est rendue
   - **Then** le `<h1>` contient "Actualités"
   - **And** le `<title>` contient "Actualités" et "Ivoire Business Club"
   - **And** la page agrège les 6 derniers articles publiés + les 3 prochains événements
   - **And** la page est incluse dans le sitemap XML
   - **And** la page a une balise canonical

3. **AC3 — Maillage interne homepage**
   - **Given** la homepage
   - **When** elle est rendue
   - **Then** elle contient au moins un lien vers `/business-abidjan`
   - **And** elle contient au moins un lien vers `/actualites`
   - **And** les liens utilisent des ancres descriptives contenant les mots-clés cibles

4. **AC4 — Meta descriptions des sous-pages publiques**
   - **Given** les pages `/articles`, `/events`, `/experts`, `/partners`, `/opportunities`
   - **When** elles sont rendues
   - **Then** chacune a un `<title>` optimisé (50-60 caractères) et une `<meta description>` (140-160 caractères)
   - **And** les titles mentionnent "Ivoire Business Club" pour le branding

## Delta d'Implémentation (État Actuel → Cible)

### Fichiers existants à modifier

1. **`src/app/sitemap.ts`** — EXISTE (refait par 14.1) :
   - Ajouter `/business-abidjan` et `/actualites` dans `staticRoutes` avec `priority: 0.8`.

2. **`src/app/(public)/page.tsx`** — Homepage existante :
   - Conserver le rendu `force-dynamic` actuel (nécessaire pour Prisma au build).
   - Ajouter un maillage interne vers `/business-abidjan` et `/actualites` avec des ancres descriptives.
   - Option A : ajouter deux liens dans le footer via `Footer`.
   - Option B : ajouter une section dédiée dans le `main` (ex: "Découvrir IBC" avec liens vers les pages SEO).
   - Les ancres doivent contenir les mots-clés cibles : "Business à Abidjan", "Actualités Ivoire Business Club".

3. **`src/app/(public)/articles/page.tsx`** — Meta à optimiser :
   - Title actuel : `"Le Catalogue IBC"` (14 caractères) → remplacer par un title 50-60 chars mentionnant "Ivoire Business Club".
   - Description actuelle : 159 caractères → vérifier qu'elle reste dans 140-160 chars et mentionne le branding/club.

4. **`src/app/(public)/events/page.tsx`** — Meta à optimiser :
   - Title actuel : `"Calendrier des événements — Ivoire Business Club"` (46 caractères) → optimiser vers 50-60 chars.
   - Description actuelle : 102 caractères → étendre à 140-160 chars.

5. **`src/app/(public)/experts/page.tsx`** — Meta manquante :
   - Pas d'`export const metadata`. À ajouter avec title 50-60 chars mentionnant "Ivoire Business Club" et description 140-160 chars.

6. **`src/app/(public)/partners/page.tsx`** — Meta partielle :
   - Title actuel : `"Partenaires Agréés | Ivoire Business Club"` (44 caractères) → optimiser vers 50-60 chars.
   - Description actuelle : 147 caractères → vérifier/ajuster pour 140-160 chars.

7. **`src/app/(public)/opportunities/page.tsx`** — Meta manquante :
   - Pas d'`export const metadata`. À ajouter avec title 50-60 chars mentionnant "Ivoire Business Club" et description 140-160 chars.

### Fichiers à créer

8. **`src/app/(public)/business-abidjan/page.tsx`** — NOUVEAU :
   - Server Component Next.js 16.
   - `export const revalidate = 3600`.
   - Metadata : `title: "Business à Abidjan | Ivoire Business Club"`, meta description ciblant "business abidjan" + "opportunités".
   - `<h1>Business à Abidjan</h1>`.
   - Contenu statique en français, 300+ mots, structuré avec h2.
   - Utiliser le même layout visuel que les autres pages publiques : fond `#090D16`, header desktop + `LandingMobileNav`, `Footer`.
   - Pas de `force-dynamic` — contenu statique + revalidate.

9. **`src/app/(public)/actualites/page.tsx`** — NOUVEAU :
   - Server Component Next.js 16.
   - `export const revalidate = 3600`.
   - Metadata : `title: "Actualités | Ivoire Business Club"`, description 140-160 chars.
   - `<h1>Actualités</h1>`.
   - Fetch 6 derniers articles `published: true`, `visibility: 'PUBLIC'`, `publishedAt <= now`, triés par `publishedAt desc`.
   - Fetch 3 prochains événements `status: 'PUBLISHED'`, `startDate >= now`, triés par `startDate asc`.
   - Afficher les articles sous forme de cartes (titre, excerpt, date, lien vers `/articles/[slug]`).
   - Afficher les événements sous forme de cartes (titre, date, lieu, lien vers `/events/[slug]`).
   - Gérer les erreurs Prisma avec fallback tableau vide + log `sanitizeError`.
   - Même layout visuel que les autres pages publiques.

## Tasks / Subtasks

- [x] **AC1 — Créer `src/app/(public)/business-abidjan/page.tsx`**
  - [x] Server component avec `export const revalidate = 3600`.
  - [x] Metadata title + description optimisés (description contient "business abidjan" et "opportunités").
  - [x] `<h1>Business à Abidjan</h1>`.
  - [x] Rédiger contenu statique français de 300+ mots avec au moins 2 sous-titres `<h2>`.
  - [x] Reproduire le header desktop, `LandingMobileNav`, `Footer`.
  - [x] Pas de `&&` dans JSX ; utiliser des ternaires `condition ? <X /> : null`.

- [x] **AC2 — Créer `src/app/(public)/actualites/page.tsx`**
  - [x] Server component avec `export const revalidate = 3600`.
  - [x] Metadata title `"Actualités | Ivoire Business Club"` + description 140-160 chars.
  - [x] `<h1>Actualités</h1>`.
  - [x] Fetch 6 derniers articles PUBLIC publiés via `prisma.article.findMany`.
  - [x] Fetch 3 prochains événements PUBLISHED via `prisma.event.findMany`.
  - [x] Gestion d'erreur avec `sanitizeError` et fallback vide.
  - [x] Affichage des articles et événements en cartes avec liens canoniques.
  - [x] Reproduire le header desktop, `LandingMobileNav`, `Footer`.
  - [x] Pas de `&&` dans JSX.

- [x] **AC3 — Maillage interne homepage**
  - [x] Modifier `src/app/(public)/page.tsx` pour ajouter des liens vers `/business-abidjan` et `/actualites`.
  - [x] Option privilégiée : ajouter une section dans `main` avant le footer avec ancres descriptives.
  - [x] Ancres exemples : "Business à Abidjan — opportunités et networking", "Actualités Ivoire Business Club".
  - [x] Alternative : ajouter les liens dans `Footer` via un nouveau groupe de liens SEO.

- [x] **AC4 — Optimiser les métas des sous-pages publiques**
  - [x] `src/app/(public)/articles/page.tsx` : title 50-60 chars mentionnant IBC.
  - [x] `src/app/(public)/events/page.tsx` : title 50-60 chars, description 140-160 chars.
  - [x] `src/app/(public)/experts/page.tsx` : ajouter `export const metadata`.
  - [x] `src/app/(public)/partners/page.tsx` : ajuster title/description.
  - [x] `src/app/(public)/opportunities/page.tsx` : ajouter `export const metadata`.

- [x] **Mise à jour sitemap**
  - [x] Ajouter `/business-abidjan` et `/actualites` dans `staticRoutes` de `src/app/sitemap.ts`.

- [x] **Validation transversale**
  - [x] Exécuter `npm run build` sans erreur.
  - [x] Vérifier que `/business-abidjan` et `/actualites` sont accessibles.
  - [x] Vérifier que les balises canonical sont présentes sur les nouvelles pages (héritées de `metadataBase` + `alternates.canonical` du layout).
  - [x] Vérifier la longueur des titles/descriptions avec un outil SEO ou comptage manuel.

## Dev Notes

### Stack & Conventions

- **Next.js 16.2.6**, App Router, TypeScript.
- **Prisma 7.8.0** : importer depuis `@/lib/prisma`.
- **Langue du projet** : tout le contenu, UI, métadonnées en **français**. Les noms de variables/fonctions restent en anglais.
- **JSX Guardrail** : interdiction stricte de `&&` dans JSX. Utiliser des ternaires `condition ? <Component /> : null` ou pré-calculer des booléens.
- **Client components** : ajouter `'use client'` uniquement si des gestionnaires d'événements sont présents. Les deux nouvelles pages sont des server components.
- **Sécurisation des logs** : passer les erreurs capturées à `sanitizeError(error)` avant `console.error`.

### Architecture SEO héritée de la Story 14.1

- `src/app/layout.tsx` contient déjà `metadataBase: new URL('https://www.ivoire-business-club.com')` et `alternates: { canonical: '/' }`.
- Toute page hérite automatiquement d'une balise canonical absolue vers sa version www.
- `src/app/sitemap.ts` utilise `revalidate = 3600` et retourne `MetadataRoute.Sitemap`.
- `src/app/robots.ts` est déjà en place et référence le sitemap.

### Modèles de données pertinents

- `Article` : `slug`, `title`, `excerpt`, `published`, `visibility`, `publishedAt`, `updatedAt`, `imageUrl`, `category`.
- `Event` : `slug`, `title`, `description`, `startDate`, `endDate`, `location`, `imageUrl`, `status`, `updatedAt`.

### Layout visuel à reproduire

Les pages publiques utilisent un pattern cohérent :
- Conteneur principal : `<div className="flex min-h-screen flex-col bg-[#090D16] text-white">`
- Mobile nav : `<LandingMobileNav />`
- Header desktop sticky avec logo, liens de navigation, CTA connexion/tableau de bord
- Footer : `<Footer />` (composant client car il contient un formulaire newsletter)
- Titres : `text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-[#D4A847] bg-clip-text text-transparent`

### Contenu suggéré pour `/business-abidjan`

> **h1 : Business à Abidjan**
>
> **h2 : Pourquoi faire du business à Abidjan ?**
> Abidjan, capitale économique de la Côte d'Ivoire, concentre la majeure partie des opportunités d'affaires du pays. Avec son port, son aéroport international et sa communauté d'entrepreneurs dynamiques, la ville attire chaque année des investisseurs de la diaspora ivoirienne en Europe.
>
> **h2 : Opportunités business à Abidjan**
> Les secteurs porteurs incluent l'immobilier, l'agro-industrie, la tech, l'énergie et les services financiers. Que vous cherchiez un partenaire local, un deal à financer ou des conseils pour vous implanter, l'écosystème abidjanais offre des opportunités concrètes.
>
> **h2 : Rejoindre un club business à Abidjan**
> L'Ivoire Business Club rassemble des entrepreneurs, investisseurs et experts basés en Côte d'Ivoire et en Europe. Notre mission : fluidifier les mises en relation, sécuriser les deals et accompagner les membres dans leurs projets business à Abidjan et au-delà.
>
> CTA : découvrir les opportunités / s'inscrire.

### Fetch pour `/actualites`

```typescript
const latestArticles = await prisma.article.findMany({
  where: {
    published: true,
    visibility: 'PUBLIC',
    publishedAt: { lte: new Date() },
  },
  orderBy: { publishedAt: 'desc' },
  take: 6,
  select: { id: true, slug: true, title: true, excerpt: true, imageUrl: true, publishedAt: true, category: true },
});

const upcomingEvents = await prisma.event.findMany({
  where: {
    status: 'PUBLISHED',
    startDate: { gte: new Date() },
  },
  orderBy: { startDate: 'asc' },
  take: 3,
  select: { id: true, slug: true, title: true, startDate: true, location: true, imageUrl: true },
});
```

### Propositions de titles/descriptions (à vérifier longueur exacte)

| Page | Title | Description |
|------|-------|-------------|
| `/articles` | `Articles & Conseils | Ivoire Business Club` | `Découvrez articles, guides et témoignages exclusifs de l'Ivoire Business Club pour investir et entreprendre en Côte d'Ivoire.` |
| `/events` | `Événements & Networking | Ivoire Business Club` | `Participez aux rencontres, conférences et sessions networking de l'Ivoire Business Club en Côte d'Ivoire et en Europe.` |
| `/experts` | `Experts & Consultants | Ivoire Business Club` | `Trouvez les experts agréés par l'Ivoire Business Club : conseil, finance, immobilier et accompagnement en Côte d'Ivoire.` |
| `/partners` | `Partenaires Agréés Ivoire Business Club` | `Découvrez les entreprises partenaires de confiance de l'Ivoire Business Club pour vos projets en Côte d'Ivoire.` |
| `/opportunities` | `Opportunités Business | Ivoire Business Club` | `Consultez les opportunités d'affaires vérifiées par l'Ivoire Business Club : investissement, partenariat et deals en Côte d'Ivoire.` |

### Previous Story Learnings

- **Story 14.1** : `metadataBase` + `alternates.canonical` dans `src/app/layout.tsx` suffisent pour générer les canonicals. Pas besoin de déclaration explicite dans chaque page.
- **Conventions de code établies** : pas de `&&` dans JSX, `params` et `searchParams` asynchrones, `sanitizeError` avant log, contenu en français.
- **Story 9.4** : le sitemap doit inclure les articles `PUBLIC` publiés. Le sitemap actuel le fait déjà.

### Testing Requirements

- **Build** : `npm run build` doit passer sans erreur.
- **Lighthouse SEO** : score 100 attendu sur `/business-abidjan` et `/actualites` (h1, title, meta description, canonical, sitemap).
- **Longueur meta** : vérifier title 50-60 chars, description 140-160 chars pour les 5 sous-pages.
- **Maillage interne** : vérifier présence des liens `/business-abidjan` et `/actualites` dans le HTML de la homepage.
- **Sitemap** : vérifier que `/sitemap.xml` contient `/business-abidjan` et `/actualites`.

### Project Structure Notes

- Les pages publiques sont dans `src/app/(public)/`.
- Le sitemap App Router est à `src/app/sitemap.ts`.
- Le layout racine à `src/app/layout.tsx` fournit `metadataBase` et `alternates.canonical`.
- Le footer client est dans `src/components/landing/footer.tsx`.

### References

- Sprint change proposal SEO : [sprint-change-proposal-2026-06-24.md](../../../_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-24.md#L190-L235)
- Story 14.1 (contexte SEO existant) : [14-1-infrastructure-seo-technique.md](../../../_bmad-output/implementation-artifacts/14-1-infrastructure-seo-technique.md)
- Sitemap existant : [src/app/sitemap.ts](../../../src/app/sitemap.ts)
- Layout racine : [src/app/layout.tsx](../../../src/app/layout.tsx)
- Homepage : [src/app/(public)/page.tsx](../../../src/app/(public)/page.tsx)
- Page articles : [src/app/(public)/articles/page.tsx](../../../src/app/(public)/articles/page.tsx)
- Page events : [src/app/(public)/events/page.tsx](../../../src/app/(public)/events/page.tsx)
- Page experts : [src/app/(public)/experts/page.tsx](../../../src/app/(public)/experts/page.tsx)
- Page partners : [src/app/(public)/partners/page.tsx](../../../src/app/(public)/partners/page.tsx)
- Page opportunities : [src/app/(public)/opportunities/page.tsx](../../../src/app/(public)/opportunities/page.tsx)
- Footer : [src/components/landing/footer.tsx](../../../src/components/landing/footer.tsx)
- Schéma Prisma : [prisma/schema.prisma](../../../prisma/schema.prisma)

## Dev Agent Record

### Agent Model Used

kimi-k2.7-code

### Debug Log References

- Adaptation du type `nextEvent` dans `src/app/(public)/page.tsx` pour correspondre à `NextEventCardEvent` (champ optionnel `endDate`).

### Completion Notes List

- Créé `src/app/(public)/business-abidjan/page.tsx` : server component, `revalidate = 3600`, title/description optimisés, contenu 300+ mots, 3 h2, header/footer/mobilenav.
- Créé `src/app/(public)/actualites/page.tsx` : server component, `revalidate = 3600`, fetch 6 articles publics + 3 événements à venir, fallback vide + `sanitizeError`, cartes avec liens canoniques.
- Mis à jour `src/app/sitemap.ts` : ajout de `/business-abidjan` et `/actualites` en `staticRoutes` avec `priority: 0.8`.
- Maillage interne homepage : section "Découvrir IBC" dans `src/app/(public)/page.tsx` avec liens descriptifs vers `/business-abidjan` et `/actualites`.
- Optimisé les métas de `/articles`, `/events`, `/experts`, `/partners`, `/opportunities` (titles 50-60 chars, descriptions 140-160 chars, branding IBC).
- Tests unitaires ajoutés pour `business-abidjan` et `actualites`.
- Tests existants mis à jour (`events/page.test.tsx`, `page.test.tsx` homepage).
- `npm run build` OK (sortie standalone, nouvelles pages en static 1h).
- `npx vitest run` OK (896 passés, 0 échec).

### File List

- `src/app/sitemap.ts` (UPDATE)
- `src/app/(public)/page.tsx` (UPDATE)
- `src/app/(public)/page.test.tsx` (UPDATE)
- `src/app/(public)/articles/page.tsx` (UPDATE)
- `src/app/(public)/events/page.tsx` (UPDATE)
- `src/app/(public)/events/page.test.tsx` (UPDATE)
- `src/app/(public)/experts/page.tsx` (UPDATE)
- `src/app/(public)/partners/page.tsx` (UPDATE)
- `src/app/(public)/opportunities/page.tsx` (UPDATE)
- `src/app/(public)/business-abidjan/page.tsx` (CREATE)
- `src/app/(public)/business-abidjan/page.test.tsx` (CREATE)
- `src/app/(public)/actualites/page.tsx` (CREATE)
- `src/app/(public)/actualites/page.test.tsx` (CREATE)
- `_bmad-output/implementation-artifacts/14-2-pages-contenu-seo-quick-wins.md` (UPDATE)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (UPDATE)

### Change Log

- 2026-06-24 : Création des pages SEO `/business-abidjan` et `/actualites` (Story 14-2).
- 2026-06-24 : Maillage interne homepage et optimisation des métas des sous-pages publiques.
- 2026-06-24 : Ajout de tests et validation build + vitest OK.
- 2026-06-24 : CR patches appliqués — titres/descriptions optimisés, ternaires JSX, marge word count.

Status: done
