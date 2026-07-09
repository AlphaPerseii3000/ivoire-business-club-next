---
baseline_commit: 08c7789
agent_model_name_version: kimi-k2.7-code
---

# Story 27.1 : Infrastructure GEO Technique

Status: done

<!-- Validation optionnelle : lancer validate-create-story avant dev-story si besoin. -->

## Story

**En tant que** moteur de recherche IA (ChatGPT, Perplexity, Google AI Overviews, etc.),  
**Je veux** que le site IBC expose des fichiers `llms.txt` / `llms-full.txt`, un `robots.txt` permissif pour les AI crawlers, et des pages articles/événements pré-rendues en statique,  
**Afin que** les contenus publics soient découverts, compris et cités par les agents IA.

## Contexte Business

L'Epic 14 a posé les fondations SEO techniques (canonical, sitemap, robots.txt de base, meta homepage). L'Epic 27 ajoute une couche GEO (Generative Engine Optimization) par-dessus. Cette première story est l'infrastructure technique de cette couche : elle n'ajoute pas de JSON-LD enrichi (stories 27.2 et 27.3) mais prépare le terrain pour que les crawlers IA accèdent efficacement aux articles et événements publics.

Le site est aujourd'hui en `force-dynamic` sur `/articles/[slug]` et `/events/[slug]`, ce qui pénalise le crawl IA. Il n'expose pas non plus de `llms.txt` / `llms-full.txt` et le `robots.ts` actuel n'a qu'une règle générique `userAgent: '*'` sans règles explicites pour les bots IA.

## Acceptance Criteria

1. **AC-1 — robots.txt permissif pour les crawlers IA**
   - **Given** le fichier `robots.txt` du site
   - **When** un crawler IA (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Google-Extended) le lit
   - **Then** il trouve une règle explicite `Allow: /` pour son User-Agent
   - **And** le sitemap est toujours référencé
   - **And** les routes privées (`/admin/*`, `/dashboard/*`, `/api/*`, `/auth/*`, `/onboarding/*`) restent `Disallow`

2. **AC-2 — Route `/llms.txt` publiée**
   - **Given** la route `/llms.txt`
   - **When** un agent IA ou un visiteur y accède
   - **Then** il reçoit un fichier Markdown avec : titre du site, description courte, liens vers `/articles`, `/events`, `/experts`, `/partners`, `/business-abidjan` avec descriptions courtes
   - **And** le `Content-Type` est `text/plain; charset=utf-8`
   - **And** la route est générée statiquement au build (`export const dynamic = 'force-static'` ou `revalidate` long)

3. **AC-3 — Route `/llms-full.txt` publiée**
   - **Given** la route `/llms-full.txt`
   - **When** un agent IA y accède
   - **Then** il reçoit le contenu Markdown des articles **PUBLIC** publiés + des événements **PUBLISHED**
   - **And** le format inclut pour chaque entrée : titre, URL canonique, extrait/description, date de publication
   - **And** le contenu premium (articles non PUBLIC, événements non PUBLISHED) n'est PAS inclus
   - **And** le `Content-Type` est `text/plain; charset=utf-8`
   - **And** la route est régénérée périodiquement (ISR avec `revalidate = 3600` par exemple)

4. **AC-4 — Page article détail en rendu statique/revalidé**
   - **Given** la page article détail `/articles/[slug]`
   - **When** elle est construite par Next.js
   - **Then** elle n'est plus en `force-dynamic`
   - **And** elle utilise un mode de rendu statique ou revalidé (`export const dynamic = 'force-static'` ou ISR + `generateStaticParams` / `revalidate`)

5. **AC-5 — Page événement détail en rendu statique/revalidé**
   - **Given** la page événement détail `/events/[slug]`
   - **When** elle est construite par Next.js
   - **Then** elle n'est plus en `force-dynamic`
   - **And** elle utilise un mode de rendu statique ou revalidé

6. **AC-6 — Build et tests sans régression**
   - **Given** le projet après implémentation
   - **When** `npm run build` est exécuté
   - **Then** le build passe sans erreur
   - **And** les tests existants des pages article (`src/app/(public)/articles/[slug]/page.test.tsx`) et événement (`src/app/(public)/events/[slug]/page.test.tsx`) passent sans régression

## Delta d'Implémentation (État Actuel → Cible)

### Fichiers existants à modifier

1. **`src/app/robots.ts`** — EXISTS
   - Actuel : une seule règle `userAgent: '*'`, `allow: '/'`.
   - Cible : tableau de `rules` avec des entrées explicites pour chaque AI crawler listé + une règle par défaut.

2. **`src/app/(public)/articles/[slug]/page.tsx`** — EXISTS
   - Actuel : `export const dynamic = "force-dynamic";` ligne 27.
   - Cible : retirer `force-dynamic`, ajouter `generateStaticParams` (slug des articles PUBLIC publiés) + `export const revalidate = 3600` (ou équivalent).
   - **Contrainte importante :** la page appelle `auth()` et `hasActiveSubscription()` pour gérer l'accès premium. `auth()` ne casse pas le rendu statique car Auth.js v5 en App Router peut être appelé dans un Server Component statique (pas d'accès à `cookies()`/`headers()` bloquant ici — Auth.js lit le cookie via son propre mécanisme). Cependant, pour garantir un rendu véritablement statique, il faut s'assurer qu'aucune donnée utilisateur n'est utilisée pour le rendu initial HTML public. Le HTML statique sera généré pour un visiteur non connecté (aucun cookie), puis revalidé/Revalidé. L'expérience utilisateur connectée reste gérée côté client ou via des Server Components dynamiques dans d'autres routes.
   - **Approche recommandée :** générer le rendu public/statique de base (titre, excerpt, image, JSON-LD Article basique) ; le gate premium reste dans le JSX car il ne dépend que de `auth()` qui, en statique, retourne `null`. Les utilisateurs connectés verront la page statique puis éventuellement une hydration client pour afficher le contenu premium si applicable — mais pour cette story, l'objectif est le crawl IA, donc le rendu public est la priorité.

3. **`src/app/(public)/events/[slug]/page.tsx`** — EXISTS
   - Actuel : `export const dynamic = "force-dynamic";` ligne 27.
   - Cible : idem article — `generateStaticParams` + ISR.
   - **Contrainte :** la page appelle `auth()` et `prisma.eventRegistration.findFirst`. En rendu statique, `auth()` retournera `null`, donc `isAlreadyRegistered = false`. C'est acceptable pour le rendu public ; les utilisateurs connectés verront le rendu statique de base. L'expérience personnalisée (CTA "déjà inscrit") peut être gérée ultérieurement via un composant client, mais hors scope de cette story.

### Fichiers à créer

4. **`src/app/llms.txt/route.ts`** — DOES NOT EXIST
   - Route Handler GET qui retourne du Markdown brut.
   - `export const dynamic = 'force-static';` pour génération au build.

5. **`src/app/llms-full.txt/route.ts`** — DOES NOT EXIST
   - Route Handler GET qui charge depuis Prisma : articles `published: true, visibility: 'PUBLIC', publishedAt <= now()` + événements `status: 'PUBLISHED'`.
   - `export const revalidate = 3600;` pour ISR.

## Tasks / Subtasks

- [x] **T1 — Mettre à jour `src/app/robots.ts` pour les crawlers IA** (AC: #1)
  - [x] T1.1 Importer `MetadataRoute.Robots` si pas déjà fait.
  - [x] T1.2 Transformer `rules` en tableau d'objets.
  - [x] T1.3 Ajouter une entrée par AI crawler avec `userAgent` exact et `allow: '/'` : `GPTBot`, `ClaudeBot`, `PerplexityBot`, `OAI-SearchBot`, `Google-Extended`.
  - [x] T1.4 Garder la règle par défaut `userAgent: '*'` avec `allow: '/'` et `disallow` des routes privées.
  - [x] T1.5 S'assurer que le sitemap est référencé en URL absolue `https://www.ivoire-business-club.com/sitemap.xml`.
  - [x] T1.6 Vérifier `/robots.txt` en dev après redémarrage.

- [x] **T2 — Créer `src/app/llms.txt/route.ts`** (AC: #2)
  - [x] T2.1 Créer le dossier/fichier `src/app/llms.txt/route.ts`.
  - [x] T2.2 Exporter `GET` qui retourne `new Response(markdown, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })`.
  - [x] T2.3 Rédiger le Markdown avec : `# Ivoire Business Club`, description, liens vers `/articles`, `/events`, `/experts`, `/partners`, `/business-abidjan` avec descriptions courtes.
  - [x] T2.4 Utiliser `export const dynamic = 'force-static';` pour génération statique au build.
  - [x] T2.5 Vérifier `/llms.txt` en dev et en build.

- [x] **T3 — Créer `src/app/llms-full.txt/route.ts`** (AC: #3)
  - [x] T3.1 Créer le dossier/fichier `src/app/llms-full.txt/route.ts`.
  - [x] T3.2 Exporter `GET` async qui charge via Prisma les articles PUBLIC publiés et les événements PUBLISHED.
  - [x] T3.3 Formater le Markdown : section `# Articles`, puis pour chaque article : titre, URL canonique, extrait, date ; section `# Événements`, même format.
  - [x] T3.4 Utiliser `export const revalidate = 3600;` pour ISR (le contenu change quand un article/événement est publié).
  - [x] T3.5 Gérer les erreurs Prisma avec `sanitizeError` et retourner le markdown de base (même vide) pour ne pas casser le build.
  - [x] T3.6 Vérifier `/llms-full.txt` en dev et après publication d'un article.

- [x] **T4 — Passer `/articles/[slug]` en statique/revalidé** (AC: #4, #6)
  - [x] T4.1 Retirer `export const dynamic = "force-dynamic";` de `src/app/(public)/articles/[slug]/page.tsx`.
  - [x] T4.2 Ajouter `export const revalidate = 3600;`.
  - [x] T4.3 Ajouter `export async function generateStaticParams()` qui retourne les slugs des articles `published: true, visibility: 'PUBLIC', publishedAt <= now()`.
  - [x] T4.4 S'assurer que `generateMetadata` reste compatible (elle est déjà async et appelle Prisma).
  - [x] T4.5 Vérifier que `auth()` ne bloque pas le build en statique — si nécessaire, isoler les appels `auth()` / `hasActiveSubscription()` derrière une vérification conditionnelle ou un composant client. En pratique, Auth.js v5 en App Router autorise `auth()` dans des pages statiques ; le rendu statique se fera pour un visiteur non connecté.
  - [x] T4.6 Lancer `npm run build` et corriger les éventuelles erreurs de "dynamic server usage".
  - [x] T4.7 Lancer `npx vitest run src/app/(public)/articles/[slug]/page.test.tsx`.

- [x] **T5 — Passer `/events/[slug]` en statique/revalidé** (AC: #5, #6)
  - [x] T5.1 Retirer `export const dynamic = "force-dynamic";` de `src/app/(public)/events/[slug]/page.tsx`.
  - [x] T5.2 Ajouter `export const revalidate = 3600;`.
  - [x] T5.3 Ajouter `export async function generateStaticParams()` qui retourne les slugs des événements `status: 'PUBLISHED'`.
  - [x] T5.4 Vérifier que `auth()` / `prisma.eventRegistration` ne cassent pas le build statique.
  - [x] T5.5 Lancer `npm run build`.
  - [x] T5.6 Lancer `npx vitest run src/app/(public)/events/[slug]/page.test.tsx`.

- [x] **T6 — Validation transversale** (AC: #6)
  - [x] T6.1 Lancer `npm run build` complet.
  - [x] T6.2 Lancer `npx vitest run` (ou du moins les tests des deux pages détail).
  - [x] T6.3 Vérifier `/robots.txt`, `/llms.txt`, `/llms-full.txt` après build (`.next/server/app/...`).
  - [x] T6.4 Vérifier que `/articles/[slug]` et `/events/[slug]` génèrent des fichiers HTML statiques dans `.next/server/app/articles/[slug].html` ou équivalent.

## Dev Notes

### Contexte technique

- **Next.js 16.2.6 App Router**, `output: 'standalone'`.
- **Auth.js v5 beta.31** avec split config. `auth()` peut être appelé dans des Server Components statiques car il ne dépend pas de `cookies()` / `headers()` appelés explicitement par le développeur. Cependant, si Next.js détecte une dépendance dynamique (ex. `cookies()` dans `next/headers`), le rendu devient dynamique. Vérifier qu'aucun `cookies()` / `headers()` n'est introduit.
- **Prisma 7.8.0** : importer `prisma` depuis `@/lib/prisma`.
- **Convention de fichiers** : les Route Handlers pour `llms.txt` et `llms-full.txt` doivent être dans `src/app/llms.txt/route.ts` et `src/app/llms-full.txt/route.ts` (Next.js App Router supporte les points dans les segments de route).

### Architecture / Guardrails

- **Route Handlers texte brut :** pour `llms.txt` et `llms-full.txt`, utiliser `new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })`. Ne pas renvoyer de JSON.
- **Génération statique vs ISR :**
  - `llms.txt` : contenu quasi statique → `force-static`.
  - `llms-full.txt` : contenu évolutif → ISR `revalidate = 3600`.
  - `/articles/[slug]` et `/events/[slug]` : ISR `revalidate = 3600` + `generateStaticParams` pour pré-rendre les pages existantes au build.
- **robots.txt multiple règles :** `MetadataRoute.Robots` accepte un tableau `rules: [{ userAgent: 'GPTBot', allow: '/' }, ...]`.
- **Accès premium et statique :** le rendu statique d'une page article/event doit produire une version publique (gate affiché). L'expérience connectée premium reste hors scope de cette story. Si des tests existants simulent `auth()` avec un utilisateur, ils continueront de fonctionner car les mocks Vitest ne dépendent pas du mode de rendu Next.js.
- **JSX Boolean Guardrail :** aucun changement JSX majeur attendu, mais si vous ajoutez une condition, pré-calculer les booléens avant le return.

### Fichiers impactés

| Fichier | Action | Raison |
|---------|--------|--------|
| `src/app/robots.ts` | UPDATE | Ajouter les règles AI crawlers |
| `src/app/llms.txt/route.ts` | CREATE | Route statique pour llms.txt |
| `src/app/llms-full.txt/route.ts` | CREATE | Route ISR pour contenu articles + événements |
| `src/app/(public)/articles/[slug]/page.tsx` | UPDATE | Retirer force-dynamic, ajouter generateStaticParams + ISR |
| `src/app/(public)/events/[slug]/page.tsx` | UPDATE | Retirer force-dynamic, ajouter generateStaticParams + ISR |
| `src/app/(public)/articles/[slug]/page.test.tsx` | UPDATE si besoin | Adapter aux mocks / comportement statique |
| `src/app/(public)/events/[slug]/page.test.tsx` | UPDATE si besoin | Adapter aux mocks / comportement statique |

### Détails techniques

#### 1. Exemple de `src/app/robots.ts` cible

```typescript
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = 'https://www.ivoire-business-club.com';
  const privateRoutes = ['/admin/*', '/dashboard/*', '/api/*', '/auth/*', '/onboarding/*'];

  return {
    rules: [
      { userAgent: 'GPTBot', allow: '/', disallow: privateRoutes },
      { userAgent: 'ClaudeBot', allow: '/', disallow: privateRoutes },
      { userAgent: 'PerplexityBot', allow: '/', disallow: privateRoutes },
      { userAgent: 'OAI-SearchBot', allow: '/', disallow: privateRoutes },
      { userAgent: 'Google-Extended', allow: '/', disallow: privateRoutes },
      { userAgent: '*', allow: '/', disallow: privateRoutes },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
```

#### 2. Exemple de `src/app/llms.txt/route.ts`

```typescript
export const dynamic = 'force-static';

const siteUrl = 'https://www.ivoire-business-club.com';

export function GET(): Response {
  const body = `# Ivoire Business Club

Le club business de la diaspora ivoirienne en Europe : opportunités d'investissement, networking et deals exclusifs en Côte d'Ivoire.

## Pages clés

- [Articles, Guides & Conseils](${siteUrl}/articles) — Analyses, guides d'investissement et témoignages exclusifs.
- [Événements, Conférences & Networking](${siteUrl}/events) — Calendrier des rencontres IBC en Côte d'Ivoire et en Europe.
- [Experts](${siteUrl}/experts) — Répertoire des experts et conseillers du réseau IBC.
- [Partenaires](${siteUrl}/partners) — Entreprises et partenaires sélectionnés du club.
- [Business Abidjan](${siteUrl}/business-abidjan) — Le guide pratique pour entreprendre et investir à Abidjan.
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
```

#### 3. Exemple de `src/app/llms-full.txt/route.ts`

```typescript
import { prisma } from '@/lib/prisma';
import { sanitizeError } from '@/lib/sanitize-log';
import { ArticleVisibility, EventStatus } from '@/generated/prisma/client';

export const revalidate = 3600;

const siteUrl = 'https://www.ivoire-business-club.com';

function formatDate(date: Date | null): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export async function GET(): Promise<Response> {
  let articles: Array<{ title: string; slug: string; excerpt: string; publishedAt: Date | null }> = [];
  let events: Array<{ title: string; slug: string; description: string; startDate: Date }> = [];

  try {
    articles = await prisma.article.findMany({
      where: { published: true, visibility: ArticleVisibility.PUBLIC, publishedAt: { lte: new Date() } },
      select: { title: true, slug: true, excerpt: true, publishedAt: true },
      orderBy: { publishedAt: 'desc' },
    });
  } catch (error) {
    console.error('Erreur llms-full.txt articles:', sanitizeError(error));
  }

  try {
    events = await prisma.event.findMany({
      where: { status: EventStatus.PUBLISHED },
      select: { title: true, slug: true, description: true, startDate: true },
      orderBy: { startDate: 'desc' },
    });
  } catch (error) {
    console.error('Erreur llms-full.txt events:', sanitizeError(error));
  }

  let markdown = `# Ivoire Business Club — Contenu public complet\n\n`;

  markdown += `## Articles\n\n`;
  if (articles.length === 0) {
    markdown += `_Aucun article public disponible._\n\n`;
  } else {
    for (const article of articles) {
      markdown += `### ${article.title}\n`;
      markdown += `- URL : ${siteUrl}/articles/${article.slug}\n`;
      markdown += `- Date : ${formatDate(article.publishedAt)}\n`;
      markdown += `- Extrait : ${article.excerpt}\n\n`;
    }
  }

  markdown += `## Événements\n\n`;
  if (events.length === 0) {
    markdown += `_Aucun événement public disponible._\n\n`;
  } else {
    for (const event of events) {
      markdown += `### ${event.title}\n`;
      markdown += `- URL : ${siteUrl}/events/${event.slug}\n`;
      markdown += `- Date : ${formatDate(event.startDate)}\n`;
      markdown += `- Description : ${event.description.slice(0, 500)}${event.description.length > 500 ? '...' : ''}\n\n`;
    }
  }

  return new Response(markdown, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
```

> **Note :** pour `events`, si `description` est un champ `String` non nullable, le slice est sûr. Adapter si le type dans Prisma est différent.

#### 4. Exemple de modification `/articles/[slug]/page.tsx`

```typescript
// Supprimer :
// export const dynamic = "force-dynamic";

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const articles = await prisma.article.findMany({
      where: { published: true, visibility: 'PUBLIC', publishedAt: { lte: new Date() } },
      select: { slug: true },
    });
    return articles.map((article) => ({ slug: article.slug }));
  } catch (error) {
    console.error('generateStaticParams articles error:', sanitizeError(error));
    return [];
  }
}
```

#### 5. Exemple de modification `/events/[slug]/page.tsx`

```typescript
// Supprimer :
// export const dynamic = "force-dynamic";

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const events = await prisma.event.findMany({
      where: { status: EventStatus.PUBLISHED },
      select: { slug: true },
    });
    return events.map((event) => ({ slug: event.slug }));
  } catch (error) {
    console.error('generateStaticParams events error:', sanitizeError(error));
    return [];
  }
}
```

### Pièges à éviter

1. **Ne pas oublier `export const revalidate` après avoir retiré `force-dynamic`.** Sinon Next.js peut tomber en rendu dynamique par défaut si `auth()` est détecté comme dépendance dynamique.
2. **`generateStaticParams` doit retourner un tableau, même vide.** Sinon erreur de build.
3. **`llms.txt` avec point dans le nom de dossier :** Next.js App Router supporte `src/app/llms.txt/route.ts` — vérifier que le dossier est bien nommé `llms.txt`.
4. **Tests Vitest et `generateStaticParams` :** les tests des pages ne testent généralement pas `generateStaticParams` car ils appellent directement la page avec des `params`. Vérifier que les mocks Prisma restent co-localisés et que `generateStaticParams` n'est pas appelée implicitement dans les tests existants (elle ne l'est pas).
5. **Auth.js en statique :** si le build échoue avec "Dynamic server usage", identifier la source (`cookies()`, `headers()`, `auth()`, etc.) et isoler. Dans ce projet, `auth()` est historiquement compatible avec les pages statiques ; en cas de doute, privilégier `export const dynamic = 'force-static'` sur les nouvelles routes et ISR sur les pages existantes.
6. **`llms-full.txt` et longueur de contenu :** si le contenu est très long, le fichier `route.ts` peut devenir une réponse de plusieurs Mo. Pour cette story, limiter l'extrait (article.excerpt, event.description tronqué). La story 27.2/27.3 pourra enrichir avec `articleBody` complet si nécessaire.

### Références

- Epic 27 GEO dans `_bmad-output/planning-artifacts/epics.md` (lignes 2679-2718).
- Sprint Change Proposal GEO : `_bmad-output/planning-artifacts/sprint-change-proposal-2026-07-09-geo.md`.
- Architecture SEO/GEO existante : Story 14.1 `_bmad-output/implementation-artifacts/14-1-infrastructure-seo-technique.md`.
- Fichiers existants : `src/app/robots.ts`, `src/app/sitemap.ts`, `src/app/(public)/articles/[slug]/page.tsx`, `src/app/(public)/events/[slug]/page.tsx`.
- Project context : `project-context.md` (règles Next.js 16, Prisma 7, Auth.js v5, tests co-localisés).

## Dev Agent Record

### Agent Model Used

kimi-k2.7-code

### Debug Log References

- Build OK ; warning préexistant sur `coverImagePath` absent de la DB utilisée en build (story 25-3).
- Full Vitest suite OK (181 fichiers, 1280 tests).

### Completion Notes List

- AC-1 : robots.ts expose des règles explicites `Allow: /` pour GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Google-Extended, plus la règle par défaut ; sitemap absolu conservé ; routes privées `Disallow`.
- AC-2 : route `/llms.txt` générée statiquement (`force-static`), Content-Type `text/plain; charset=utf-8`, Markdown avec titre, description et liens clés.
- AC-3 : route `/llms-full.txt` en ISR (`revalidate = 3600`), Markdown des articles PUBLIC publiés + événements PUBLISHED, gestion d'erreur via `sanitizeError`, contenu premium exclu.
- AC-4 : `/articles/[slug]` n'est plus `force-dynamic` ; ISR `revalidate = 3600` + `generateStaticParams` pour les articles PUBLIC publiés ; `generateMetadata` inchangée.
- AC-5 : `/events/[slug]` n'est plus `force-dynamic` ; ISR `revalidate = 3600` + `generateStaticParams` pour les événements PUBLISHED.
- AC-6 : build Next.js OK (routes `/llms.txt`, `/llms-full.txt`, `/articles/[slug]`, `/events/[slug]` en statique/SSG) ; tests Vitest 1280/1280 OK sans régression.

### File List

- `src/app/robots.ts` — UPDATE
- `src/app/llms.txt/route.ts` — CREATE
- `src/app/llms-full.txt/route.ts` — CREATE
- `src/app/(public)/articles/[slug]/page.tsx` — UPDATE
- `src/app/(public)/events/[slug]/page.tsx` — UPDATE
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — UPDATE
- `_bmad-output/implementation-artifacts/27-1-infrastructure-geo-technique.md` — UPDATE