# Sprint Change Proposal — GEO (Generative Engine Optimization)

**Date :** 2026-07-09  
**Auteur :** Hermes (CC workflow)  
**Projet :** IBC — Ivoire Business Club  
**Statut :** Approuvé par Jonathan  

---

## Section 1: Issue Summary

**Trigger :** Jonathan demande que les articles et événements du site IBC soient optimisés pour le SEO ET le GEO (Generative Engine Optimization) — visibilité dans les moteurs de recherche IA (ChatGPT, Perplexity, Google AI Overviews).

**Problème identifié :**

Epic 14 a couvert le SEO technique de base (canonical, sitemap, robots.txt, meta tags, JSON-LD Article), mais :

- ❌ Aucun fichier `llms.txt` / `llms-full.txt` (standard B2A pour agents IA)
- ❌ `robots.txt` ne mentionne pas explicitement les AI crawlers (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Google-Extended)
- ❌ Pages articles et événements en `force-dynamic` → mauvais pour le crawl AI (les bots IA préfèrent du HTML statique pré-rendu)
- ❌ **Événements** n'ont AUCUN JSON-LD structuré (pas de schema.org/Event)
- ❌ **Articles** ont un JSON-LD `Article` basique mais manquent : `image`, `mainEntityOfPage`, `FAQPage`, `BreadcrumbList`
- ❌ Pas de `BreadcrumbList` sur aucune page publique
- ❌ Pas de structuration de contenu pour l'extraction IA (résumés en blocs, réponses directes)

## Section 2: Impact Analysis

| Artifact | Impact |
|----------|--------|
| PRD | Ajout FR-GE01 à FR-GE12 (additif, pas de conflit avec FR existants) |
| Epics | Nouvel Epic 27 (GEO) — 3 stories |
| Architecture | Aucun changement de stack, patterns SEO existants étendus |
| Sprint Status | Ajout epic-27 + 3 stories en backlog |
| Code | `robots.ts`, `sitemap.ts`, articles `[slug]/page.tsx`, events `[slug]/page.tsx`, nouveau `llms.txt`, nouveau composant BreadcrumbList |

## Section 3: Recommended Approach

**Option 1: Direct Adjustment — Ajouter un nouvel Epic 27 additif.** ✅

Aucun rollback nécessaire. L'existant fonctionne. On ajoute une couche GEO par-dessus.
- Effort : Medium
- Risque : Low
- Timeline : Aucun impact sur le sprint en cours (Epic 26 story 26-7 reste en backlog)

## Section 4: Detailed Change Proposals

### Nouvel Epic 27: GEO — Generative Engine Optimization

#### Story 27-1: Infrastructure GEO technique

**FR-GE01** : Le site permet le crawl par les bots IA principaux (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Google-Extended) via robots.txt  
**FR-GE02** : Un fichier `llms.txt` est publié à la racine du domaine, listant les pages clés en Markdown avec descriptions courtes  
**FR-GE03** : Un fichier `llms-full.txt` est publié, embarquant le contenu Markdown des articles et événements publiés  
**FR-GE04** : Les pages articles et événements publiques ne sont plus en `force-dynamic` (pré-rendu statique pour optimiser le crawl)

**Acceptance Criteria :**

```gherkin
Given le fichier robots.txt du site
When un crawler IA (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Google-Extended) le lit
Then il trouve une règle explicite Allow pour son User-Agent

Given la route /llms.txt
When un agent IA ou un visiteur y accède
Then il reçoit un fichier Markdown avec : titre du site, description, liens vers /articles, /events, /experts, /partners, /business-abidjan avec descriptions courtes

Given la route /llms-full.txt
When un agent IA y accède
Then il reçoit le contenu Markdown des articles PUBLIC publiés + événements PUBLISHED

Given la page article détail /articles/[slug]
When elle est construite par Next.js
Then elle n'est plus en force-dynamic mais utilise un mode de rendu statique ou revalidé

Given la page événement détail /events/[slug]
When elle est construite par Next.js
Then elle n'est plus en force-dynamic mais utilise un mode de rendu statique ou revalidé

Given le projet après implémentation
When npm run build est exécuté
Then le build passe sans erreur
```

#### Story 27-2: Schema structuré GEO pour articles

**FR-GE05** : Le JSON-LD des articles est enrichi avec `image`, `mainEntityOfPage`, `wordCount`, `articleBody` (extrait)  
**FR-GE06** : Si l'article contient une section FAQ, un JSON-LD `FAQPage` est généré  
**FR-GE07** : Un `BreadcrumbList` JSON-LD est présent sur chaque page article (Accueil > Articles > [titre])  
**FR-GE08** : Le contenu des articles est structuré pour l'extraction IA (résumé en haut, sous-titres H2/H3 clairs, paragraphes courts)

**Acceptance Criteria :**

```gherkin
Given une page article détail publiée
When on inspecte le JSON-LD Article
Then il inclut : image, mainEntityOfPage, wordCount, articleSection

Given un article contenant une section FAQ (marquée par un heading "FAQ" ou des éléments Q/R)
When la page est rendue
Then un JSON-LD FAQPage est généré avec Question/Answer pour chaque item

Given une page article détail
When on inspecte le JSON-LD
Then un BreadcrumbList est présent : Accueil > Articles > [titre de l'article]

Given le projet après implémentation
When npm run build est exécuté
Then le build passe sans erreur

Given les tests de la page article
When npx vitest run est exécuté sur les tests existants
Then ils passent sans régression
```

#### Story 27-3: Schema structuré GEO pour événements

**FR-GE09** : Un JSON-LD `Event` (schema.org/Event) est présent sur chaque page événement avec : name, description, startDate, endDate, location, organizer, offers (si pricing), image  
**FR-GE10** : Un `BreadcrumbList` JSON-LD est présent sur chaque page événement (Accueil > Événements > [titre])  
**FR-GE11** : Les événements privés (membres uniquement) ont un JSON-LD Event avec `eventStatus: EventScheduled` mais `description` limitée (pas de fuite de contenu privé)  
**FR-GE12** : Le sitemap inclut les dates `lastModified` correctes pour les événements

**Acceptance Criteria :**

```gherkin
Given une page événement détail publiée
When on inspecte le JSON-LD
Then un schema.org/Event est présent avec : name, description, startDate, endDate, organizer

Given un événement avec une localisation physique
When on inspecte le JSON-LD Event
Then location est de type Place avec name et address

Given un événement en ligne (onlineUrl)
When on inspecte le JSON-LD Event
Then location est de type VirtualLocation avec url

Given un événement avec pricing public
When on inspecte le JSON-LD Event
Then offers est présent avec price, priceCurrency, availability

Given un événement avec coverImagePath
When on inspecte le JSON-LD Event
Then image est présent

Given une page événement détail
When on inspecte le JSON-LD
Then un BreadcrumbList est présent : Accueil > Événements > [titre de l'événement]

Given un événement privé (visibility PRIVATE)
When on inspecte le JSON-LD Event
Then la description ne contient pas de détails privés (message générique "Événement réservé aux membres")

Given le projet après implémentation
When npm run build est exécuté
Then le build passe sans erreur

Given les tests de la page événement
When npx vitest run est exécuté sur les tests existants
Then ils passent sans régression
```

## Section 5: Implementation Handoff

- **Scope :** Moderate — Nouvel epic, 3 stories, backlog reorganization
- **Handoff :** CS → DS → CR par story via `bmad-orchestrator` (subagents), lancé dans une nouvelle session chat
- **Séquence recommandée :** 27-1 → 27-2 → 27-3 (l'infrastructure GEO en premier, puis les schemas par type de contenu)
- **Success criteria :**
  - `llms.txt` + `llms-full.txt` accessibles en production
  - JSON-LD valide (testable via Google Rich Results Test)
  - `npm run build` passe
  - Tests existants passent sans régression