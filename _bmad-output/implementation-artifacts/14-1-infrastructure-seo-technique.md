---
baseline_commit: 0f07b0dcb8dc54bbb37b0a2cc4b96be9ab5e31ad
---

# Story 14.1 : Infrastructure SEO Technique

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**En tant que** moteur de recherche (Googlebot),  
**Je veux** que le site soit techniquement optimisé pour le crawl et l'indexation,  
**Afin que** toutes les pages publiques soient découvertes et indexées correctement.

## Contexte Business

Le site IBC génère actuellement 75 clics/3 mois avec seulement 2 URLs indexées (homepage www + non-www en duplicate). Aucune sous-page n'est indexée, aucun sitemap n'est soumis dans Google Search Console. Cette story vise à corriger les fondations SEO techniques (canonicalisation, sitemap, robots.txt, meta homepage) pour permettre l'indexation des ~15+ pages publiques existantes.

## Acceptance Criteria

1. **AC1 — Redirect 301 www (non-www → www)**
   - **Given** un visiteur accède à `https://ivoire-business-club.com/` (sans www)
   - **When** la requête est traitée
   - **Then** une redirection 301 permanente renvoie vers `https://www.ivoire-business-club.com/`
   - **And** cela s'applique à toutes les sous-pages (ex: `/articles` → `https://www.ivoire-business-club.com/articles`)

2. **AC2 — Canonical tags sur chaque page**
   - **Given** n'importe quelle page du site
   - **When** le HTML est rendu
   - **Then** la balise `<link rel="canonical">` est présente
   - **And** elle pointe vers la version `www.ivoire-business-club.com` de l'URL courante
   - **And** `metadataBase` est configuré dans `layout.tsx`

3. **AC3 — robots.txt**
   - **Given** un crawler accède à `https://www.ivoire-business-club.com/robots.txt`
   - **When** le fichier est servi
   - **Then** il contient `Allow: /`
   - **And** il référence le sitemap : `Sitemap: https://www.ivoire-business-club.com/sitemap.xml`
   - **And** il disallow les routes privées (`/admin/*`, `/dashboard/*`, `/api/*`, `/auth/*`, `/onboarding/*`)

4. **AC4 — Sitemap XML complet**
   - **Given** un crawler accède à `https://www.ivoire-business-club.com/sitemap.xml`
   - **When** le sitemap est généré
   - **Then** il contient toutes les routes publiques statiques : `/`, `/articles`, `/events`, `/experts`, `/partners`, `/opportunities`, `/pricing`
   - **And** il contient les routes dynamiques : articles publiés, events publiés, experts publiés, entreprises publiées
   - **And** l'URL de base est `https://www.ivoire-business-club.com` (avec www et tirets)
   - **And** `force-dynamic` est retiré (le sitemap peut être généré au build ou avec revalidation)

5. **AC5 — Meta homepage optimisée**
   - **Given** la homepage `https://www.ivoire-business-club.com/`
   - **When** le HTML est rendu
   - **Then** le `<title>` contient explicitement "business club" et "Abidjan"
   - **And** le title fait entre 50 et 60 caractères
   - **And** la `<meta description>` fait entre 140 et 160 caractères
   - **And** la description mentionne "club business", "Côte d'Ivoire", "entrepreneurs"
   - **And** OpenGraph title et description sont alignés

6. **AC6 — Configuration Infomaniak (documentation)**
   - **Given** le serveur Infomaniak (Apache/Nginx)
   - **When** la configuration est déployée
   - **Then** la redirection 301 www est aussi configurée au niveau serveur (en complément du next.config.ts)
   - **And** cela est documenté dans le fichier de déploiement

## Delta d'Implémentation (État Actuel → Cible)

### Fichiers existants à modifier

1. **`src/app/sitemap.ts`** — EXISTS mais incomplet :
   - Utilise `export const dynamic = 'force-dynamic'` → retirer, remplacer par `export const revalidate = 3600`.
   - Fallback URL `https://ivoirebusinessclub.com` → corriger en `https://www.ivoire-business-club.com`.
   - Couvre seulement `/`, `/articles`, `/pricing` + articles.
   - Manque les routes statiques `/events`, `/experts`, `/partners`, `/opportunities`.
   - Manque les routes dynamiques `/events/[slug]`, `/experts/[slug]`, `/partners/[slug]`.

2. **`src/app/layout.tsx`** — NO `metadataBase`, NO `alternates.canonical` :
   - Ajouter `metadataBase: new URL('https://www.ivoire-business-club.com')`.
   - Ajouter `alternates: { canonical: '/' }` (Next.js résoudra automatiquement en URL absolue).

3. **`src/app/(public)/page.tsx`** — Meta homepage sous-optimale :
   - Title actuel : `"Ivoire Business Club — Bâtir son futur en Afrique"` (47 caractères, ne mentionne pas explicitement "business club" + "Abidjan").
   - Description actuelle : `"Découvrez la mission de l'IBC, accédez à des deals d'élite en Côte d'Ivoire, et comparez nos offres de membre."` (113 caractères, manque "club business" / "entrepreneurs").
   - Mettre à jour title (50-60 chars), description (140-160 chars), et OpenGraph correspondants.

4. **`next.config.ts`** — NO `redirects()` function :
   - Ajouter `async redirects()` avec une règle 301 de `ivoire-business-club.com/*` vers `https://www.ivoire-business-club.com/:splat*` pour toutes les routes (`permanent: true`).
   - Le matcher source doit utiliser le hostname (pas de scheme dans `source`).

### Fichiers à créer

5. **`src/app/robots.ts`** — DOES NOT EXIST :
   - Créer un fichier `robots.ts` conforme à l'App Router Next.js.
   - Retourner `{ rules: { userAgent: '*', allow: '/', disallow: ['/admin/*', '/dashboard/*', '/api/*', '/auth/*', '/onboarding/*'] }, sitemap: 'https://www.ivoire-business-club.com/sitemap.xml' }`.
   - Le matcher middleware actuel exclut déjà `robots.txt` et `sitemap.xml` du middleware auth.

### Configuration serveur

6. **`scripts/DEPLOY.md`** — documentation Nginx existante :
   - Le DEPLOY.md mentionne actuellement la redirection `www.ivoire-business-club.com` → `ivoire-business-club.com` (non-www canonique).
   - Cette story change la canonicalisation vers `www` comme canonique.
   - Mettre à jour les blocs Nginx (HTTP et HTTPS) pour rediriger `ivoire-business-club.com` → `www.ivoire-business-club.com`.
   - Mettre à jour les variables `IBC_HOST`, exemples de `curl`, et les mentions de domaine canonique dans le runbook.
   - Note : le domaine est acheté chez Infomaniak, mais le trafic web est servi par un VPS Hetzner via Nginx. La redirection doit être configurée côté Nginx sur le VPS, pas côté Infomaniak (sauf si l'hébergement Infomaniak est utilisé). Documenter cette décision.

## Tasks / Subtasks

- [ ] **AC1 — Redirect 301 www dans next.config.ts**
  - [ ] Ajouter `async redirects()` dans `next.config.ts`.
  - [ ] Règle 301 permanent pour hostname `ivoire-business-club.com` vers `https://www.ivoire-business-club.com/:path*`.
  - [ ] Vérifier que les requêtes API et les routes statiques suivent la redirection.

- [ ] **AC2 — metadataBase + canonical dans layout.tsx**
  - [ ] Ajouter `metadataBase: new URL('https://www.ivoire-business-club.com')`.
  - [ ] Ajouter `alternates: { canonical: '/' }`.
  - [ ] Vérifier que Next.js injecte `<link rel="canonical" href="https://www.ivoire-business-club.com/..." />` sur toutes les pages.

- [ ] **AC3 — Créer src/app/robots.ts**
  - [ ] Exporter `robots()` retournant `rules` et `sitemap`.
  - [ ] `Allow: /` explicite + disallow des routes privées.
  - [ ] S'assurer que `robots.txt` est accessible sans middleware auth (déjà exclu par matcher).

- [ ] **AC4 — Refonte de src/app/sitemap.ts**
  - [ ] Remplacer `force-dynamic` par `export const revalidate = 3600`.
  - [ ] Corriger l'URL de fallback : `https://www.ivoire-business-club.com`.
  - [ ] Ajouter les routes statiques manquantes : `/events`, `/experts`, `/partners`, `/opportunities`.
  - [ ] Ajouter les routes dynamiques : `/events/[slug]` (PUBLISHED), `/experts/[slug]` (isPublished), `/partners/[slug]` (isPublished), `/articles/[slug]` (déjà partiellement présent — vérifier la couverture).
  - [ ] Gérer les erreurs Prisma sans casser la génération du sitemap (tableau vide + log avec `sanitizeError`).
  - [ ] S'assurer que l'URL de base contient toujours `www` et les tirets.

- [ ] **AC5 — Meta homepage optimisée dans src/app/(public)/page.tsx**
  - [ ] Rédiger un title de 50-60 caractères contenant "business club" + "Abidjan".
  - [ ] Rédiger une description de 140-160 caractères mentionnant "club business", "Côte d'Ivoire", "entrepreneurs".
  - [ ] Aligner OpenGraph title/description avec les meta de base.
  - [ ] Exemple proposé (à valider longueur exacte) :
    - Title : `"Ivoire Business Club | Club business à Abidjan & en Europe"` (53 caractères)
    - Description : `"Rejoins le club business IBC à Abidjan : opportunités, investissements et networking pour entrepreneurs en Côte d'Ivoire et en Europe."` (148 caractères)

- [ ] **AC6 — Mise à jour documentation déploiement**
  - [ ] Modifier `scripts/DEPLOY.md` pour refléter `www.ivoire-business-club.com` comme domaine canonique.
  - [ ] Inverser la redirection Nginx : non-www → www.
  - [ ] Mettre à jour les exemples `curl`, les variables `IBC_HOST`, et les blocs server_name.
  - [ ] Documenter la configuration côté Infomaniak (DNS A/AAAA pointant vers www vers le VPS).

- [ ] **Validation transversale**
  - [ ] Exécuter `npm run build` sans erreur.
  - [ ] Vérifier que `/robots.txt` et `/sitemap.xml` sont générés et accessibles.
  - [ ] Vérifier le header `Location` sur `curl -I http://localhost:3000/` en forçant `Host: ivoire-business-club.com` (mode dev).

## Dev Notes

### Stack & Conventions

- **Next.js 16.2.6**, App Router, TypeScript.
- **Prisma 7.8.0** : importer depuis `@/lib/prisma` (pas directement `@/generated/prisma/client` dans les pages serveur).
- **Langue du projet** : Toutes les UI, messages de validation, toasts, logs et commentaires en **français**. Les noms de variables/fonctions restent en anglais.
- **Sécurisation des logs** : Passer toutes les erreurs capturées à `sanitizeError(error)` de `@/lib/sanitize-log` avant `console.error`.
- **No 'use client'** : Cette story touche uniquement des server components / métadonnées / config. Aucun composant client n'est concerné.

### Architecture SEO Next.js 16

- `metadataBase` dans `src/app/layout.tsx` sert de base pour résoudre toutes les URLs canoniques relatives.
- `alternates.canonical` au niveau du layout root génère automatiquement une canonical pour chaque page en fonction du pathname courant.
- `src/app/sitemap.ts` doit retourner `Promise<MetadataRoute.Sitemap>` et ne **pas** utiliser `force-dynamic` pour le crawl budget ; utiliser `export const revalidate = 3600`.
- `src/app/robots.ts` suit la convention App Router `robots.ts` : export default une fonction `robots()`.

### Modèles de données pertinents

- `Article` : champs `slug`, `published`, `visibility: PUBLIC | AFFRANCHI | GRAND_FRERE | BOSS`, `publishedAt`, `updatedAt`.
- `Event` : champs `slug`, `status: DRAFT | PUBLISHED | CANCELLED`, `updatedAt`.
- `Expert` : champs `slug`, `isPublished`, `updatedAt`.
- `Company` : champs `slug`, `isPublished`, `updatedAt`.
- `Opportunity` : pas de champ `slug` visible dans le schéma ; la route `/opportunities` est une liste publique de teasers. Seule la route statique `/opportunities` doit être dans le sitemap.

### URLs de base dans le code

- Plusieurs pages utilisent encore `https://ivoirebusinessclub.com` comme fallback. Cette story doit unifier la canonicalisation vers `https://www.ivoire-business-club.com`.
- La variable d'environnement `NEXT_PUBLIC_APP_URL` n'est pas définie dans `.env.example`. Vérifier sa présence en production (actuellement `APP_URL` et `NEXTAUTH_URL` sont documentées). Si `NEXT_PUBLIC_APP_URL` est absente, utiliser le fallback hardcodé correct `https://www.ivoire-business-club.com`.
- Attention : `scripts/DEPLOY.md` utilise `APP_URL=https://ivoire-business-club.com` (non-www) ; cette story implique de passer à `https://www.ivoire-business-club.com`.

### Middleware / Routes privées

- Le matcher middleware exclut `robots.txt` et `sitemap.xml`, donc aucun risque de blocage.
- Routes à disallow dans `robots.txt` : `/admin/*`, `/dashboard/*`, `/api/*`, `/auth/*`, `/onboarding/*`.

### Previous Story Learnings

- **Story 13.4 (Partenaires)** : les détails des pages publiques utilisent déjà `generateMetadata` avec des URLs absolues construites à partir de `NEXT_PUBLIC_APP_URL`. S'assurer que tous ces fallbacks soient corrigés si l'occasion se présente, mais rester concentré sur la story 14.1 (delta scope).
- **Conventions de code établies** : pas de double esperluette `&&` dans JSX, `params` dynamiques attendus de manière asynchrone (`const { slug } = await params;`), `notFound()` suivi immédiatement de `return null`.

### Testing Requirements

- **Build** : `npm run build` doit passer sans erreur.
- **Validation sitemap** : vérifier que `sitemap.xml` contient au moins 15 URLs (statiques + dynamiques).
- **Validation robots.txt** : vérifier que `/robots.txt` retourne un fichier valide avec `Sitemap: https://www.ivoire-business-club.com/sitemap.xml`.
- **Validation redirect** : `curl -I -H "Host: ivoire-business-club.com" http://localhost:3000/` doit retourner `301` vers `https://www.ivoire-business-club.com/`.
- **Validation meta** : title homepage 50-60 caractères, description 140-160 caractères.

### Project Structure Notes

- Les pages publiques sont dans `src/app/(public)/`.
- Les fichiers de configuration SEO App Router (`sitemap.ts`, `robots.ts`) doivent être à la racine de `src/app/`.
- Le layout racine `src/app/layout.tsx` est le bon endroit pour `metadataBase` et `alternates.canonical` globaux.

### References

- Sprint change proposal SEO : [sprint-change-proposal-2026-06-24.md](../../../_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-24.md#L131-L187)
- Épique 14 : Epic 14 — SEO & Indexation (même source)
- Sitemap existant : [src/app/sitemap.ts](../../../src/app/sitemap.ts)
- Layout racine : [src/app/layout.tsx](../../../src/app/layout.tsx)
- Homepage : [src/app/(public)/page.tsx](../../../src/app/(public)/page.tsx)
- Next config : [next.config.ts](../../../next.config.ts)
- Middleware : [src/middleware.ts](../../../src/middleware.ts)
- Runbook déploiement : [scripts/DEPLOY.md](../../../scripts/DEPLOY.md#L770-L873)
- Schéma Prisma : [prisma/schema.prisma](../../../prisma/schema.prisma)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
