---
generated: 2026-06-13
status: approved
trigger: Navigation site production — absence de contenu gratuit pour visiteurs/membres sans abonnement
scope: Major — nouvel Epic complet
approved_by: Jonathan
approved_at: 2026-06-13
---

# Sprint Change Proposal — Contenu Éditorial IBC

**Date** : 2026-06-13  
**Projet** : IBC (Ivoire Business Club)  
**Auteur** : Hermes CC Workflow  
**Statut** : Approuvé

---

## 1. Issue Summary

**Problème** : Le site IBC est un "tout ou rien" — le visiteur non abonné n'accède qu'à la landing page et aux teaser deals. Il n'existe aucune ressource intermédiaire (articles, conseils, guides) pour nourrir l'entonnoir de conversion et retenir les visiteurs avant l'acte d'achat.

**Contexte de découverte** : Le fondateur a navigué le site en production et constaté que les membres sans abonnement n'ont accès à aucune ressource gratuite. L'absence de contenu éditorial réduit la valeur perçue et le taux de conversion.

**Évidence** :
- PRD FR41-FR45 : "Landing & Contenu" se limite à la landing statique, teaser deals, tiers comparison, mur des succès. Zéro FR sur le contenu éditorial.
- PRD section 6.1 : "Freemium inversé" mentionne les teasers deals mais pas de contenu éditorial gratuit.
- Architecture : aucun modèle `Article` dans le schéma Prisma, aucune route `/articles/*`.

---

## 2. Impact Analysis

### Epic Impact

| Epic | Impact | Détail |
|------|--------|--------|
| Epic 1-7 | Aucun | Tous `done`, feature purement additive |
| Epic 8 | Aucun | Tests E2E existants non impactés |
| **Epic 9 (nouveau)** | Création | Contenu Éditorial & Ressources Membres |

### Story Impact

Aucune story existante modifiée. 4 nouvelles stories dans l'Epic 9.

### Artifact Conflicts

| Artefact | Changement requis |
|----------|-------------------|
| PRD | Ajout FR46-FR51, renommage section 8.7, MAJ section 6.1 |
| Architecture | Nouvel enum `ArticleVisibility`, nouveau modèle `Article`, nouvelles routes, nouveaux composants |
| Epics | Ajout Epic 9 avec 4 stories |
| UX Spec | N/A (pas de spec UX distincte) |

### Technical Impact

- **Base de données** : nouvelle migration additive (enum + table `articles`)
- **API** : 5 nouveaux endpoints sous `/api/articles`
- **Routes** : 6 nouvelles pages (3 publiques, 3 admin)
- **Composants** : 3 nouveaux composants features
- **Aucun breaking change** : feature purement additive, zéro modification du code existant
- **Gate premium** : réutilisation du pattern `getUserPremiumAccess` existant

---

## 3. Recommended Approach

**Chemin choisi** : Ajustement direct (Option 1) — ajout d'un Epic 9

**Justification** :
- Feature additive qui ne modifie aucune story existante
- Aucun rollback nécessaire
- Risque technique faible : réutilise les patterns existants (Tier enum, premium gate, admin CRUD, audit logs)
- Effort moyen : ~4 stories dimensionnées pour un agent DS chacune
- Timeline : 1 sprint complet

**Alternatives considérées** :
- Rollback (Option 2) : pas viable — aucun travail existant à revertir
- MVP Review (Option 3) : pas applicable — le MVP est déployé et fonctionne

---

## 4. Detailed Change Proposals

### 4.1 PRD Modifications

**Section 8.7 — Renommage et ajout FR**

```
OLD: 8.7 Landing & Contenu
NEW: 8.7 Landing & Contenu Éditorial
```

**Ajout FR46-FR51** :

| FR | Description |
|----|-------------|
| FR46 | L'admin peut créer, éditer et publier des articles (titre, extrait, contenu riche, catégorie, visibilité) |
| FR47 | L'admin peut définir la visibilité d'un article : PUBLIC (tous), AFFRANCHI, GRANDS_FRERES, BOSS |
| FR48 | Un visiteur non connecté peut consulter les articles publics (visibilité PUBLIC) |
| FR49 | Un membre connecté peut consulter les articles dont la visibilité correspond à son tier ou inférieur |
| FR50 | Un membre sans abonnement actif voit les articles PUBLIC uniquement, avec un CTA d'upgrade pour les articles premium |
| FR51 | Les articles sont accessibles via /articles (catalogue) et /articles/[slug] (détail), optimisés pour le SEO |

**Section 6.1 — Mise à jour Freemium inversé**

```
OLD: Les deals sont publics partiellement (teaser : titre + localisation), mais la mise en relation 
et le dossier complet sont payants. Cela augmente le SEO organique et convertit par la preuve de valeur.

NEW: Les deals sont publics partiellement (teaser : titre + localisation), mais la mise en relation 
et le dossier complet sont payants. Les articles PUBLIC servent de levier de conversion gratuit : 
conseils investissement, guides juridiques, témoignages — les articles premium (visibilité tier) 
donnent un aperçu de la valeur réservée aux abonnés. Cela augmente le SEO organique et convertit 
par la preuve de valeur.
```

### 4.2 Architecture Modifications

**Nouvel enum** :

```prisma
enum ArticleVisibility {
  PUBLIC
  AFFRANCHI
  GRAND_FRERE
  BOSS
}
```

**Nouveau modèle** :

```prisma
model Article {
  id          String            @id @default(cuid())
  title       String
  slug        String            @unique
  excerpt     String
  content     String
  category    String
  visibility  ArticleVisibility @default(PUBLIC)
  authorId    String
  published   Boolean           @default(false)
  publishedAt DateTime?
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  author User @relation(fields: [authorId], references: [id], onDelete: Cascade)

  @@index([published, visibility, publishedAt])
  @@index([category, published])
  @@map("articles")
}
```

**Relation User** :

```prisma
// Ajout dans le modèle User existant :
articles  Article[]
```

**Nouvelles routes** :

```
src/app/
├── (public)/articles/
│   ├── page.tsx              # Catalogue articles
│   └── [slug]/page.tsx       # Détail article + gate premium
├── (admin)/articles/
│   ├── page.tsx              # Liste admin CRUD
│   ├── new/page.tsx          # Création article
│   └── [id]/edit/page.tsx    # Édition article
├── api/articles/
│   ├── route.ts              # GET (liste) + POST (création admin)
│   └── [id]/route.ts         # GET + PUT + DELETE
```

**Nouveaux composants** :

```
src/components/features/articles/
├── ArticleCard.tsx
├── ArticleContent.tsx
└── VisibilitySelector.tsx
```

**Logique de filtrage visibilité** :

```
PUBLIC → visible par tous
AFFRANCHI → visible si user connecté + tier ≥ AFFRANCHI
GRAND_FRERE → visible si tier ≥ GRAND_FRERE
BOSS → visible si tier ≥ BOSS

Non-abonné : articles PUBLIC intégralement + titres/excerpt premium avec CTA upgrade
```

### 4.3 Epic & Stories — Epic 9

**Epic 9 : Contenu Éditorial & Ressources Membres**

| Story | Titre | Dépendance |
|-------|-------|------------|
| 9-1 | Modèle Article, migration et API routes | Aucune |
| 9-2 | Interface admin CRUD articles | 9-1 |
| 9-3 | Catalogue public et pages détail avec gate premium | 9-1 |
| 9-4 | SEO, navigation et intégration site | 9-3 |

**9-1 — Modèle Article, migration et API routes**
- Ajouter enum `ArticleVisibility` au schéma Prisma
- Ajouter modèle `Article` + relation `User.articles`
- Créer la migration
- Implémenter API routes : `GET /api/articles` (liste filtrée par visibilité user), `POST /api/articles` (admin), `GET /api/articles/[id]`, `PUT /api/articles/[id]` (admin), `DELETE /api/articles/[id]` (admin)
- Validation Zod pour la création/édition
- Seeds : 3-4 articles de démo (1 PUBLIC, 1 AFFRANCHI, 1 GRAND_FRERE, 1 BOSS)
- Tests unitaires API

**9-2 — Interface admin CRUD articles**
- Page liste admin `/admin/articles` avec tableau (titre, catégorie, visibilité, statut published, date)
- Page création `/admin/articles/new` avec formulaire (titre, slug auto-généré, excerpt, contenu markdown, catégorie, sélecteur visibilité, toggle published)
- Page édition `/admin/articles/[id]/edit`
- Actions : publier/dépublier, supprimer (avec confirmation)
- Audit log sur chaque action CRUD admin
- Tests unitaires composants admin

**9-3 — Catalogue public et pages détail avec gate premium**
- Page catalogue `/articles` : grille de cards filtrée par visibilité user
- Page détail `/articles/[slug]` : contenu complet ou excerpt + CTA upgrade
- Composants : `ArticleCard`, `ArticleContent` (rendu markdown)
- Filtre par catégorie (tabs ou chips)
- Tests unitaires gates + composants

**9-4 — SEO, navigation et intégration site**
- Meta tags dynamiques (title, description, OG) sur chaque article
- Sitemap XML incluant les articles publiés PUBLIC
- Lien "Articles" dans la navigation principale
- Section "Derniers articles" sur la landing page (3 derniers PUBLIC)
- Structured data JSON-LD (Article schema)
- Tests E2E Playwright : navigation articles, gate premium, SEO meta

---

## 5. Implementation Handoff

**Classification du scope** : Moderate — backlog reorganization + nouveau sprint

**Handoff** :
- **Product Owner / Developer** : Mise à jour PRD + architecture + epics.md + sprint-status.yaml
- **Developer agents** : Implémentation séquentielle 9-1 → 9-2 + 9-3 → 9-4 via BMAD CS/DS/CR

**Critères de succès** :
1. L'admin peut créer, éditer, publier et supprimer des articles avec visibilité tier
2. Un visiteur non connecté voit les articles PUBLIC uniquement
3. Un membre abonné voit les articles correspondant à son tier
4. Un membre sans abonnement actif voit les articles PUBLIC + CTA upgrade pour les premium
5. Chaque article est optimisé SEO (meta tags, sitemap, JSON-LD)
6. Les articles sont accessibles depuis la navigation principale
7. La landing page affiche les 3 derniers articles PUBLIC
8. Tests unitaires et E2E passent

**Prochaine étape BMAD** :
1. Mettre à jour sprint-status.yaml (Epic 9 + 4 stories en backlog)
2. Mettre à jour epics.md (Epic 9 avec stories détaillées)
3. Lancer `bmad-create-story` (CS) pour Story 9-1