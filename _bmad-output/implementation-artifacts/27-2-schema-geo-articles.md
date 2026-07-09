---
baseline_commit: e1d1f00c353cffabcfc729f522f984d8d95b1f44
agent_model_name_version: kimi-k2.7-code
---

# Story 27.2 : Schema structuré GEO pour articles

Status: ready-for-dev

<!-- Validation optionnelle : lancer validate-create-story avant dev-story si besoin. -->

## Story

**En tant que** moteur de recherche IA (ChatGPT, Perplexity, Google AI Overviews, etc.),
**Je veux** que chaque article public expose un JSON-LD `Article` enrichi, un `BreadcrumbList`, un éventuel `FAQPage`, et un contenu structuré avec résumé et sous-titres clairs,
**Afin que** les agents IA puissent extraire, résumer et citer précisément les articles du site IBC.

## Contexte Business

L'Epic 14 a posé un JSON-LD `Article` basique sur `/articles/[slug]`. La story 27.1 a supprimé le `force-dynamic` et ajouté `generateStaticParams` + `revalidate = 3600`. Cette story 27.2 enrichit le JSON-LD existant (image, mainEntityOfPage, wordCount, articleBody) et ajoute le `BreadcrumbList` ainsi qu'un `FAQPage` quand le contenu Markdown contient une section FAQ. Elle ne touche pas à l'infrastructure technique déjà en place.

Le site est en Next.js 16 App Router avec des Server Components. La page article est déjà statique/revalidée. L'objectif est purement un **delta** d'enrichissement des données structurées et de lisibilité du contenu pour l'extraction IA.

## Acceptance Criteria

1. **AC-1 — JSON-LD Article enrichi (FR-GE05)**
   - **Given** une page article détail publiée
   - **When** on inspecte le JSON-LD `Article`
   - **Then** il inclut au moins : `image`, `mainEntityOfPage`, `wordCount`, `articleSection`
   - **And** les champs existants (`headline`, `description`, `datePublished`, `dateModified`, `author`, `publisher`) sont conservés
   - **And** `image` pointe vers `article.imageUrl` si présent, sinon vers le logo IBC (`/logo-ibc.webp`) en URL absolue
   - **And** `mainEntityOfPage` pointe vers l'URL canonique absolue de la page article
   - **And** `wordCount` est calculé depuis `article.content` (nombre de mots séparés par des espaces, >= 0)
   - **And** `articleSection` vaut `article.category`

2. **AC-2 — JSON-LD FAQPage quand FAQ détectée (FR-GE06)**
   - **Given** un article contenant une section FAQ (marquée par un heading `FAQ` en début de ligne, ou par des lignes de type `Q: ...` / `A: ...`)
   - **When** la page est rendue
   - **Then** un deuxième objet JSON-LD `FAQPage` est injecté dans le même script ou dans un script séparé
   - **And` il contient un tableau `mainEntity` de type `Question` avec `name` (question) et `acceptedAnswer` (`@type: Answer`, `text`)

3. **AC-3 — BreadcrumbList JSON-LD sur chaque article (FR-GE07)**
   - **Given** une page article détail
   - **When** on inspecte le JSON-LD
   - **Then** un objet `BreadcrumbList` est présent
   - **And** il contient 3 `itemListElement` : `Accueil` (`/`), `Articles` (`/articles`), `[titre de l'article]` (`/articles/[slug]`)
   - **And** chaque élément a `position` incrémental 1, 2, 3

4. **AC-4 — Build et tests sans régression**
   - **Given** le projet après implémentation
   - **When** `npm run build` est exécuté
   - **Then** le build passe sans erreur
   - **And** les tests existants de `src/app/(public)/articles/[slug]/page.test.tsx` passent sans régression

5. **AC-5 — Structuration du contenu pour extraction IA (FR-GE08)**
   - **Given** le rendu d'un article
   - **When** on inspecte le DOM
   - **Then** le résumé/extrait est visible en haut de page (avant ou juste avant le corps)
   - **And** le corps Markdown est rendu avec des balises sémantiques H2/H3 via `ArticleContent`
   - **And** les paragraphes sont courts et aérés (garanti par le CSS prose existant)

## Delta d'Implémentation (État Actuel → Cible)

### Fichier existant à modifier

1. **`src/app/(public)/articles/[slug]/page.tsx`** — EXISTS
   - Ligne 27 : `export const revalidate = 3600;` déjà présent (story 27.1).
   - Lignes 234-257 : JSON-LD `Article` basique existant.
   - Cible : enrichir `jsonLd` avec `image`, `mainEntityOfPage`, `wordCount`, `articleSection`.
   - Cible : injecter un second JSON-LD `BreadcrumbList` (script séparé ou tableau de schemas).
   - Cible : conditionnellement injecter un JSON-LD `FAQPage` si FAQ détectée dans `article.content`.
   - Cible : s'assurer que le résumé/extrait reste affiché avant ou en introduction du corps (actuellement visible dans le header ; maintenir/renforcer).

### Fichiers à ne PAS créer/modifier (hors scope / déjà faits)

- `src/app/robots.ts` — fait en 27.1.
- `src/app/llms.txt/route.ts` — fait en 27.1.
- `src/app/llms-full.txt/route.ts` — fait en 27.1.
- `src/app/(public)/events/[slug]/page.tsx` — story 27.3.
- `src/app/sitemap.ts` — story 27.3 (lastModified events).

## Tasks / Subtasks

- [ ] **T1 — Enrichir le JSON-LD Article existant** (AC: #1)
  - [ ] T1.1 Calculer `wordCount` : `article.content.trim().split(/\s+/).filter(Boolean).length`.
  - [ ] T1.2 Ajouter `image` : si `article.imageUrl` commence par `http` l'utiliser tel quel, sinon préfixer avec `siteUrl` ; si absent, utiliser `${siteUrl}/logo-ibc.webp`.
  - [ ] T1.3 Ajouter `mainEntityOfPage` : `{ @type: "WebPage", @id: articleUrl }`.
  - [ ] T1.4 Ajouter `articleSection` : `article.category`.
  - [ ] T1.5 Conserver les champs existants : `headline`, `description`, `datePublished`, `dateModified`, `author`, `publisher`.
  - [ ] T1.6 Si le contenu premium est masqué (gate), continuer à exposer les métadonnées publiques (`excerpt` en `description`, `wordCount` et `articleBody` basés sur `excerpt` ou contenu tronqué ? Garder cohérent — voir pièges).

- [ ] **T2 — Générer le BreadcrumbList JSON-LD** (AC: #3)
  - [ ] T2.1 Construire un objet `BreadcrumbList` avec 3 `ListItem`.
  - [ ] T2.2 Item 1 : `name: "Accueil"`, `item: siteUrl`, `position: 1`.
  - [ ] T2.3 Item 2 : `name: "Articles"`, `item: ${siteUrl}/articles`, `position: 2`.
  - [ ] T2.4 Item 3 : `name: article.title`, `item: articleUrl`, `position: 3`.
  - [ ] T2.5 Injecter ce schema dans la page (même `<script>` en tableau ou second `<script>`).

- [ ] **T3 — Détecter et générer FAQPage JSON-LD** (AC: #2)
  - [ ] T3.1 Créer une fonction utilitaire `parseFaqFromMarkdown(content: string)` dans `src/lib/article-faq.ts` (ou inline dans page.tsx si simple) qui retourne `Array<{ question: string; answer: string }>`.
  - [ ] T3.2 Algorithme de parsing simple et robuste :
    - Si le Markdown contient un heading `## FAQ` (insensible à la casse), extraire le bloc suivant jusqu'au prochain heading `## ` ou fin du document.
    - Parser les lignes `**Q:** ...` / `**A:** ...` ou `- **Q:** ...` / `- **A:** ...`.
    - Fallback : chercher des lignes commençant par `Q:` / `A:` ou `Question:` / `Réponse:`.
  - [ ] T3.3 Transformer en JSON-LD `FAQPage` avec `mainEntity` = tableau de `Question` objects.
  - [ ] T3.4 Nettoyer les réponses Markdown (retirer `**A:**`, balises HTML légères) avant injection.
  - [ ] T3.5 N'injecter le script FAQPage que si au moins une paire Q/R valide est extraite.

- [ ] **T4 — Maintenir la structuration du contenu pour extraction IA** (AC: #5)
  - [ ] T4.1 Vérifier que l'`excerpt` est affiché en introduction (actuellement dans le header de métadonnées).
  - [ ] T4.2 Si `hasAccess` est true, le corps complet est rendu par `ArticleContent` en H2/H3 via `marked`/`prose`.
  - [ ] T4.3 Si `hasAccess` est false, l'extrait reste visible (pas de contenu masqué fuité).
  - [ ] T4.4 Aucun changement CSS majeur requis ; `prose` s'en charge.

- [ ] **T5 — Validation transversale** (AC: #4)
  - [ ] T5.1 Lancer `npm run build`.
  - [ ] T5.2 Lancer `npx vitest run src/app/(public)/articles/[slug]/page.test.tsx`.
  - [ ] T5.3 Vérifier le JSON-LD rendu dans le HTML statique (`.next/server/app/articles/[slug].html` ou via `curl` en local).
  - [ ] T5.4 Optionnel : valider le JSON-LD via https://search.google.com/test/rich-results avec un extrait de code.

## Dev Notes

### Contexte technique

- **Next.js 16.2.6 App Router**, `output: 'standalone'`.
- **Auth.js v5 beta.31** avec split config. La page article appelle `auth()` ; en mode statique, `auth()` retourne `null` au build, ce qui est acceptable pour le JSON-LD public.
- **Prisma 7.8.0** : `Article` est défini dans `prisma/schema.prisma` (lignes 486-509). Champs utiles : `title`, `slug`, `excerpt`, `content`, `category`, `imageUrl`, `publishedAt`, `updatedAt`, `createdAt`, `author`.
- **Tests co-localisés** : `src/app/(public)/articles/[slug]/page.test.tsx` avec Vitest + mocks Prisma/auth.
- **ArticleContent** : utilise `marked` + `DOMPurify` pour convertir le Markdown en HTML. Les headings `##`/`###` sont déjà générés sémantiquement.

### Architecture / Guardrails

- **JSON-LD Next.js** : injecter via `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />`. Échapper les `<` avec `.replace(/</g, "\\u003c")` comme déjà fait.
- **Multi-schemas** : il est courant d'embarquer plusieurs JSON-LD en injectant un tableau `[articleLd, breadcrumbLd, faqLd]` dans un seul `<script>`.
- **wordCount** : simple split sur les espaces. Pas besoin de bibliothèque externe.
- **FAQ detection** : rester sur une heuristique Markdown simple (heading `FAQ` + lignes `Q:`/`A:`). Ne pas parser HTML DOM côté serveur.
- **Contenu premium** : le JSON-LD public doit refléter l'article (titre, extrait, catégorie). Le `articleBody` complet ne doit pas être exposé si l'utilisateur n'a pas accès (risque de fuite premium). Cependant, FR-GE05 demande `articleBody` (extrait). Utiliser `article.excerpt` pour `articleBody` quand le contenu complet est derrière le gate, ou tronquer `article.content` à ~300 mots pour les visibilités non PUBLIC.
- **URL absolues** : toujours préfixer `siteUrl` aux chemins relatifs (`/logo-ibc.webp`, `/articles/[slug]`).

### Fichiers impactés

| Fichier | Action | Raison |
|---------|--------|--------|
| `src/app/(public)/articles/[slug]/page.tsx` | UPDATE | Enrichir JSON-LD, ajouter BreadcrumbList + FAQPage conditionnel |
| `src/lib/article-faq.ts` (suggéré) | CREATE | Fonction utilitaire de parsing FAQ depuis le Markdown |
| `src/app/(public)/articles/[slug]/page.test.tsx` | UPDATE si besoin | Ajouter des assertions sur les nouveaux champs JSON-LD |
| `_bmad-output/implementation-artifacts/sprint-status.yaml` | UPDATE | Story 27-2 → ready-for-dev |

### Détails techniques

#### 1. Exemple de JSON-LD Article cible

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Titre de l'article",
  "description": "Extrait de l'article",
  "image": "https://www.ivoire-business-club.com/uploads/article-cover.jpg",
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://www.ivoire-business-club.com/articles/guide-abidjan"
  },
  "datePublished": "2026-06-11T12:00:00.000Z",
  "dateModified": "2026-06-11T12:00:00.000Z",
  "author": {
    "@type": "Person",
    "name": "Alexandre"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Ivoire Business Club",
    "logo": {
      "@type": "ImageObject",
      "url": "https://www.ivoire-business-club.com/logo-ibc.webp"
    }
  },
  "wordCount": 1240,
  "articleSection": "guide",
  "articleBody": "Extrait de l'article..."
}
```

#### 2. Exemple de BreadcrumbList

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Accueil",
      "item": "https://www.ivoire-business-club.com/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Articles",
      "item": "https://www.ivoire-business-club.com/articles"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Titre de l'article",
      "item": "https://www.ivoire-business-club.com/articles/guide-abidjan"
    }
  ]
}
```

#### 3. Exemple de FAQPage

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Qui peut consulter cet article ?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Les membres Premium et Affranchi de l'Ivoire Business Club."
      }
    }
  ]
}
```

#### 4. Exemple d'utilitaire de parsing FAQ (src/lib/article-faq.ts)

```typescript
export interface FaqItem {
  question: string;
  answer: string;
}

function cleanLine(line: string): string {
  return line.replace(/^[-*]\s*/, '').replace(/\*\*/g, '').trim();
}

export function parseFaqFromMarkdown(content: string): FaqItem[] {
  if (!content) return [];
  const normalized = content.replace(/\r\n/g, '\n');
  const faqHeadingIndex = normalized.search(/^##?\s*FAQ\s*$/im);
  if (faqHeadingIndex === -1) return [];

  const afterHeading = normalized.slice(faqHeadingIndex);
  const nextHeadingMatch = afterHeading.slice(1).match(/^##\s+/im);
  const block = nextHeadingMatch
    ? afterHeading.slice(0, nextHeadingMatch.index! + 1)
    : afterHeading;

  const items: FaqItem[] = [];
  const lines = block.split('\n').map(cleanLine).filter(Boolean);
  let currentQuestion: string | null = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/^[-*]\s*/, '');
    const qMatch = line.match(/^(?:Q[:\s]\s*|Question[:\s]\s*)/i);
    const aMatch = line.match(/^(?:A[:\s]\s*|Réponse[:\s]\s*|Answer[:\s]\s*)/i);

    if (qMatch) {
      currentQuestion = line.slice(qMatch[0].length).trim();
    } else if (aMatch && currentQuestion) {
      items.push({
        question: currentQuestion,
        answer: line.slice(aMatch[0].length).trim(),
      });
      currentQuestion = null;
    }
  }

  return items;
}
```

> **Note :** adapter si les réponses sont sur plusieurs lignes ; dans ce cas collecter les lignes jusqu'à la prochaine question.

### Pièges à éviter

1. **Ne pas réintroduire `force-dynamic`.** La story 27.1 l'a retiré.
2. **Ne pas exposer le contenu premium dans `articleBody`.** Si `article.visibility !== PUBLIC` et l'utilisateur n'a pas accès, utiliser `article.excerpt` pour `articleBody` (ou ne pas inclure `articleBody`).
3. **Les URLs absolues sont obligatoires dans schema.org.** Toujours concaténer `siteUrl`.
4. **`wordCount` = 0 acceptable** si `content` est vide (ne pas planter).
5. **Tests existants** : les mocks de `prisma.article.findFirst` retournent `mockArticle` sans `imageUrl`. Ajouter `imageUrl` dans les mocks si on veut tester le chemin image existante.
6. **FAQ détectée uniquement si la section est explicite.** Éviter de générer un FAQPage à partir d'un contenu sans heading FAQ.
7. **JSON-LD valide** : `JSON.stringify` gère l'échappement, mais on doit aussi échapper `<` pour éviter les injections HTML.
8. **articleBody vs description** : `description` reste `article.excerpt` ; `articleBody` peut reprendre l'extrait (FR-GE05 précise "extrait").

### Références

- Epic 27 GEO dans `_bmad-output/planning-artifacts/epics.md` (lignes 2679-2749).
- Sprint Change Proposal GEO : `_bmad-output/planning-artifacts/sprint-change-proposal-2026-07-09-geo.md`.
- Story 27.1 précédente : `_bmad-output/implementation-artifacts/27-1-infrastructure-geo-technique.md`.
- Fichier existant : `src/app/(public)/articles/[slug]/page.tsx` (JSON-LD basique lignes 234-257).
- Modèle Article : `prisma/schema.prisma` lignes 486-509.
- Architecture SEO/GEO : Story 14.1 `_bmad-output/implementation-artifacts/14-1-infrastructure-seo-technique.md`.

## Dev Agent Record

### Agent Model Used

kimi-k2.7-code

### Debug Log References

*(À remplir par le dev agent)*

### Completion Notes List

*(À remplir par le dev agent)*

### File List

- `src/app/(public)/articles/[slug]/page.tsx` — UPDATE
- `src/lib/article-faq.ts` — CREATE (suggéré)
- `src/app/(public)/articles/[slug]/page.test.tsx` — UPDATE (si besoin)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — UPDATE
