# Proposition de Modification de Sprint — SEO & Indexation

**Projet :** Ivoire Business Club (IBC)  
**Auteur :** Jonathan (PO) / Hermes (Correct Course)  
**Date :** 24 juin 2026  
**Statut :** En attente de validation  
**Workflow :** bmad-correct-course (CC)  

---

## 1. Résumé du Changement

Cette proposition adresse les problèmes SEO critiques identifiés via Google Search Console (propriété `sc-domain:ivoire-business-club.com`, extraction 24 juin 2026, 3 derniers mois).

### 1.1 État actuel (données GSC)

| Métrique | Valeur |
|----------|--------|
| Clics | 75 |
| Impressions | 2 121 |
| CTR | 3.54% |
| Position moyenne | 6.18 |
| URLs indexées | 2 (homepage www + non-www = duplicate) |
| Sitemaps soumis | 0 |
| Sous-pages indexées | 0 |
| Trafic | Quasi-exclusivement brand search |

### 1.2 Problèmes identifiés

1. **Duplicate content www vs non-www** : `https://www.ivoire-business-club.com/` et `https://ivoire-business-club.com/` sont toutes deux indexées (1403 impressions www, 718 non-www). Le link equity est divisé.
2. **Aucun sitemap XML soumis** dans GSC. Les sous-pages ne sont pas découvertes par Google.
3. **Sitemap existant incomplet** : `src/app/sitemap.ts` ne couvre que 3 routes statiques + articles. Manque events, experts, partners, pricing. URL de fallback erronée (`ivoirebusinessclub.com` au lieu de `ivoire-business-club.com`). `force-dynamic` pénalise le crawl budget.
4. **Pas de robots.txt** : aucun fichier `robots.ts` ou `robots.txt` à la racine.
5. **Meta descriptions sous-optimales** : le title et la description de la homepage ne mentionnent pas explicitement "business club", "Abidjan", "Côte d'Ivoire". CTR 0% sur plusieurs requêtes en position 2-5.
6. **Aucune balise canonical** : pas de `alternates.canonical` dans la metadata, ce qui aggrave le duplicate content.
7. **Pas de pages de contenu SEO** : les requêtes "abidjan business" (56 impressions, position 11.3) et "ivoire business actualite" (24 impressions, position 9.0) n'ont aucune page dédiée pour capturer ce trafic.

### 1.3 Classification du changement

- **Type :** Nouvelles exigences techniques émergentes (post-déploiement SEO)
- **Étendue :** Additive — aucun rollback nécessaire, 1 nouvel epic
- **Risque :** Faible — modifications de configuration et metadata, pas de changement de modèle de données

---

## 2. Analyse d'Impact

### 2.1 Impact sur les Epics et Stories

**Epics existants impactés :** Aucun. Tous les epics 1-13 sont `done` ou `in-progress` avec leurs stories `done`. Aucune modification de story existante.

**Nouvel epic créé :**

| Epic | Titre | Stories |
|------|-------|---------|
| Epic 14 | SEO & Indexation | 2 stories (14.1 → 14.2) |

### 2.2 Conflits d'Artéfacts

**PRD :**
- Ajout de FR pour le SEO technique (FR-SEO1 à FR-SEO7)
- Aucune modification des FR existants

**Architecture :**
- `next.config.ts` : ajout de `redirects()` pour www→non-www (ou inverse)
- Nouveau fichier `src/app/robots.ts`
- Refonte de `src/app/sitemap.ts` (retrait `force-dynamic`, ajout routes manquantes, correction URL fallback)
- `src/app/layout.tsx` : ajout `metadata.alternates.canonical`
- `src/app/(public)/page.tsx` : refonte title + meta description

**UX/UI :**
- Nouvelles pages SEO : `/business-abidjan`, `/actualites`
- Maillage interne depuis la homepage vers ces nouvelles pages

### 2.3 Impact Technique

| Composant | Impact |
|-----------|--------|
| `next.config.ts` | Ajout fonction `redirects()` pour canonicalisation www |
| `src/app/robots.ts` | Nouveau fichier — generation dynamique avec sitemap URL |
| `src/app/sitemap.ts` | Refonte — retrait `force-dynamic`, ajout routes (events, experts, partners), correction URL |
| `src/app/layout.tsx` | Ajout `alternates.canonical` + `metadataBase` |
| `src/app/(public)/page.tsx` | Refonte title (50-60 chars) + meta description (140-160 chars) |
| `src/app/(public)/business-abidjan/page.tsx` | Nouvelle page SEO |
| `src/app/(public)/actualites/page.tsx` | Nouvelle page SEO (agrégat articles + events) |
| Homepage | Ajout maillage interne vers nouvelles pages |

### 2.4 Impact Déploiement

- Les redirects www doivent aussi être configurés côté Infomaniak (Apache `.htaccess` ou Nginx) en complément du `next.config.ts` redirects — Next.js standalone ne gère les redirects qu'au niveau applicatif, pas au niveau serveur.
- **Action complémentaire (manuelle, hors code)** : soumission du sitemap dans GSC via Composio ou interface web.

---

## 3. Approche Recommandée

**Option sélectionnée :** Direct Adjustment (Option 1)

- **Effort :** Moyen (1 jour de développement)
- **Risque :** Faible
- **Justification :** Les changements sont purement additifs (configuration, metadata, nouvelles pages). Aucun impact sur les fonctionnalités existantes. Le ROI SEO est immédiat : indexation des sous-pages, élimination du duplicate content, amélioration du CTR.

---

## 4. Propositions de Changement Détaillées

### 4.1 Nouvelles Exigences Fonctionnelles (FR)

| FR | Description | Story |
|----|-------------|-------|
| FR-SEO1 | Le site doit rediriger 301 permanent de `ivoire-business-club.com` vers `www.ivoire-business-club.com` (canonicalisation www) | 14.1 |
| FR-SEO2 | Chaque page doit inclure une balise `<link rel="canonical">` pointant vers sa version `www` | 14.1 |
| FR-SEO3 | Le site doit exposer un `robots.txt` référençant le sitemap XML | 14.1 |
| FR-SEO4 | Le site doit exposer un `sitemap.xml` dynamique couvrant toutes les pages publiques (statiques + articles + events + experts + partners) | 14.1 |
| FR-SEO5 | La homepage doit avoir un `<title>` de 50-60 chars mentionnant "business club" et "Abidjan" | 14.1 |
| FR-SEO6 | La homepage doit avoir une `<meta description>` de 140-160 chars orientée valeur | 14.1 |
| FR-SEO7 | Le site doit comporter des pages indexables ciblant "abidjan business" et "ivoire business actualite" avec maillage interne depuis la homepage | 14.2 |

### 4.2 Nouvel Epic

---

## Epic 14 : SEO & Indexation

**Objectif :** Coriger les problèmes SEO techniques bloquants (duplicate content, sitemap absent, meta sous-optimales) et créer des pages de contenu pour capturer le trafic non-brand.

**Business Value :** Le site actuel ne génère que 75 clics/3 mois avec 0 sous-page indexée. Les corrections techniques (canonicalisation, sitemap, robots.txt) permettront à Google de découvrir et indexer les ~15+ pages publiques existantes. Les pages de contenu SEO ciblent des requêtes à fort potentiel ("abidjan business" = 56 impressions/mois).

---

### Story 14.1 : Infrastructure SEO Technique

**En tant que** moteur de recherche (Googlebot),  
**Je veux** que le site soit techniquement optimisé pour le crawl et l'indexation,  
**Afin que** toutes les pages publiques soient découvertes et indexées correctement.

**Acceptance Criteria :**

1. **AC1 — Redirect 301 www**
   - **Given** un visiteur accède à `https://ivoire-business-club.com/` (sans www)
   - **When** la requête est traitée
   - **Then** une redirection 301 permanente renvoie vers `https://www.ivoire-business-club.com/`
   - **And** cela s'applique à toutes les sous-pages (ex: `/articles` → `https://www.ivoire-business-club.com/articles`)

2. **AC2 — Canonical tags**
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

**Technical Notes :**
- `next.config.ts` redirects s'appliquent au runtime Next.js, mais Infomaniak (Apache) peut intercepter avant. Les deux doivent être configurés.
- `metadataBase` dans `layout.tsx` résout automatiquement les URLs canoniques relatives.
- Pour le sitemap, utiliser `export const revalidate = 3600` au lieu de `force-dynamic` pour le crawl budget.
- Les pages avec `force-dynamic` (articles, events, experts, partners) doivent avoir une route statique dans le sitemap même si leur contenu est dynamique.

---

### Story 14.2 : Pages de Contenu SEO Quick Wins

**En tant que** visiteur recherchant des opportunités business en Côte d'Ivoire,  
**Je veux** trouver des pages de contenu pertinentes sur IBC quand je recherche "abidjan business" ou "ivoire business actualite",  
**Afin que** je découvre le club et m'inscrive.

**Acceptance Criteria :**

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
   - **And** la page agrège les derniers articles publiés + prochains événements
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
   - **Then** chacune a un `<title>` optimisé (50-60 chars) et une `<meta description>` (140-160 chars)
   - **And** les titles mentionnent "Ivoire Business Club" pour le branding

**Technical Notes :**
- La page `/business-abidjan` est un server component avec contenu statique rédigé en français.
- La page `/actualites` est un server component qui fetch les 6 derniers articles + 3 prochains événements.
- Le maillage interne peut se faire dans le footer ou dans une section dédiée de la homepage.
- Toutes les nouvelles pages doivent avoir `export const revalidate = 3600` pour le SEO.

---

## 5. Plan de Handoff

### 5.1 Classification du changement

- **Scope :** Moderate — 1 nouvel epic, 2 nouvelles stories, modifications de configuration
- **Handoff :** Developer agent (DS) pour implémentation, puis CR

### 5.2 Actions post-déploiement (manuelles, hors code)

| Action | Outil | Priorité |
|--------|-------|----------|
| Soumettre sitemap.xml dans GSC | Composio `GOOGLE_SEARCH_CONSOLE` ou interface web | P0 |
| Privilégier la version www dans GSC | Interface web GSC | P0 |
| Configurer redirect 301 au niveau Apache/Infomaniak | SSH / Panel Infomaniak | P0 |
| Demander réindexation homepage | GSC URL Inspection | P1 |

### 5.3 Success Criteria

- `https://www.ivoire-business-club.com/robots.txt` retourne un robots.txt valide
- `https://www.ivoire-business-club.com/sitemap.xml` retourne un sitemap avec 15+ URLs
- `curl -I https://ivoire-business-club.com/` retourne `301` vers `www.ivoire-business-club.com`
- La homepage a un title de 50-60 chars mentionnant "business club" et "Abidjan"
- Les pages `/business-abidjan` et `/actualites` sont accessibles et indexables
- `npm run build` passe sans erreur