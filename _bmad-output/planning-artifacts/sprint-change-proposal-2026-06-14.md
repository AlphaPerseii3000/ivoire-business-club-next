---
generated: 2026-06-14
status: approved
trigger: Ajout de réactions interactives et engageantes sur les articles (Epic 9)
scope: Minor — ajustement direct avec ajout d'une story dans l'Epic 9
approved_by: Jonathan
approved_at: 2026-06-14
---

# Sprint Change Proposal — Réactions sur les Articles IBC

**Date** : 2026-06-14  
**Projet** : IBC (Ivoire Business Club)  
**Auteur** : Antigravity CC Agent  
**Statut** : Proposé

---

## 1. Issue Summary

**Problème** : Le catalogue d'articles éditoriaux (développé dans l'Epic 9) est purement informatif et statique. Il n'offre aucune interaction sociale ou engagement utilisateur. Pour créer une communauté d'affaires vivante et engageante, les membres doivent pouvoir réagir aux articles en exprimant leur intérêt ou appréciation (ex. j'aime, applaudissements, idées inspirantes).

**Contexte de découverte** : Expression de besoin du fondateur d'IBC (Jonathan) de rendre le contenu éditorial plus interactif et engageant.

**Évidence** :
- PRD section 8.7 & Epic 9 existants : se limitent au catalogue, à la lecture d'articles complets et au paywall/gate premium. Zéro fonctionnalité de feedback ou d'interaction.
- Schéma Prisma actuel : aucun modèle permettant de lier un utilisateur, un article et une interaction/réaction.

---

## 2. Impact Analysis

### Epic Impact

| Epic | Impact | Détail |
|------|--------|--------|
| Epic 1-7 | Aucun | Éléments déjà terminés et non affectés |
| Epic 8 | Aucun | Les tests E2E de non-régression devront être exécutés, mais aucun impact sur les tests existants |
| **Epic 9** | Modification | Ajout d'une nouvelle story **Story 9.5: Réactions et Engagement sur les Articles** |
| Epic 10 | Aucun | Non affecté |

### Story Impact

Aucune story existante n'est modifiée ou détruite. Une nouvelle story **9.5** est ajoutée à la fin de l'Epic 9.

### Artifact Conflicts

| Artefact | Changement requis |
|----------|-------------------|
| PRD | Ajout de deux nouvelles exigences fonctionnelles : **FR52** (Réagir aux articles) et **FR53** (Comptabilisation et affichage en temps réel). |
| Architecture | Ajout d'un enum `ReactionType` et du modèle `ArticleReaction` dans `schema.prisma`. Création de la route API `POST/GET /api/articles/[id]/reactions`. |
| Epics | Ajout de la **Story 9.5** dans `epics.md` avec ses critères d'acceptation. |
| Sprint Status | Ajout de la story `9-5-reactions-et-engagement-sur-les-articles: backlog` sous `epic-9` dans `sprint-status.yaml`. |

### Technical Impact

- **Base de données** : Nouvelle migration Prisma additive pour créer la table `article_reactions` et l'enum `ReactionType`.
- **API Routes** : Ajout de la route `src/app/api/articles/[id]/reactions/route.ts` supportant :
  - `GET` : Récupérer le décompte global des réactions par type, ainsi que la réaction éventuelle de l'utilisateur connecté.
  - `POST` : Ajouter/modifier/retirer (toggle) une réaction pour l'utilisateur connecté.
- **Frontend** : Création d'un composant de réactions `ArticleReactions.tsx` avec des micro-animations interactives de type hover et active (mise à l'échelle, feedback visuel au clic).
- **Accessibilité** : Boutons de réactions avec attributs `aria-label` descriptifs, conformes aux exigences WCAG AA.

---

## 3. Recommended Approach

**Chemin choisi** : Ajustement direct (Option 1) — ajout de la Story 9.5 dans l'Epic 9.

**Justification** :
- Solution purement additive sans effet de bord sur le reste du produit ou sur les autres Epics.
- Risque technique minime : réutilise les relations Prisma standard, l'authentification par session et les composants de boutons existants.
- Effort estimé : Faible à Moyen. ~1 story complète (implémentation du schéma DB, API route, et composant UI).

---

## 4. Detailed Change Proposals

### 4.1 PRD Modifications

**Section 8.7 — Ajout de FR52 et FR53** :

| FR | Description |
|----|-------------|
| **FR52** | Un membre connecté peut réagir à un article publié en choisissant parmi plusieurs types de réactions (ex. LIKE/J'aime, CLAP/Applaudissements, INSIGHTFUL/Inspirant). Cliquer à nouveau retire la réaction (effet bascule/toggle). |
| **FR53** | Le système comptabilise et affiche le nombre de réactions par type sur la page de détail de l'article en temps réel (ou après rafraîchissement d'état local). |

### 4.2 Architecture Modifications

**Modifications du schéma Prisma (`prisma/schema.prisma`)** :

```prisma
enum ReactionType {
  LIKE
  CLAP
  INSIGHTFUL
}

model ArticleReaction {
  id        String       @id @default(cuid())
  userId    String
  articleId String
  type      ReactionType @default(LIKE)
  createdAt DateTime     @default(now())

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  article Article @relation(fields: [articleId], references: [id], onDelete: Cascade)

  @@unique([userId, articleId])
  @@index([articleId])
  @@map("article_reactions")
}
```

Mise à jour des modèles existants dans `schema.prisma` :
- `User` : ajout de `reactions ArticleReaction[]`
- `Article` : ajout de `reactions ArticleReaction[]`

**Nouvelle API Route** :
- `src/app/api/articles/[id]/reactions/route.ts`

**Nouveau Composant UI** :
- `src/components/features/articles/ArticleReactions.tsx` : Intègre des icônes interactives (ex. Lucide icons ThumbsUp, Heart, Sparkles) avec des transitions douces.

### 4.3 Epic & Stories — Story 9.5

**9-5 — Réactions et Engagement sur les Articles** :
- Mettre à jour le schéma Prisma et exécuter la migration.
- Implémenter l'API route `GET` et `POST` pour `/api/articles/[id]/reactions` avec gestion du toggle.
- Créer le composant interactif `ArticleReactions.tsx` avec des micro-interactions de style (effet hover, scale-105, vibration/scale au clic).
- Intégrer le composant sur la page de détail `/articles/[slug]`.
- Ajouter des tests unitaires et E2E (Playwright) pour s'assurer qu'un visiteur non connecté ne peut pas réagir, et qu'un membre connecté peut réagir, modifier sa réaction ou la retirer.

---

## 5. Implementation Handoff

**Classification du scope** : Minor — Direct implementation by Developer agent.

**Handoff** :
- **Developer agent** : Mettre en œuvre le schéma Prisma, les API routes, le composant UI, puis effectuer les tests.

**Critères de succès** :
1. Un membre connecté peut cliquer sur un bouton de réaction sous un article pour enregistrer ou retirer sa réaction.
2. Le décompte des réactions est mis à jour et s'affiche de manière esthétique.
3. Un utilisateur non connecté ne peut pas interagir (il est invité à se connecter ou redirigé).
4. Le design est haut de gamme, fluide et parfaitement responsive.
5. Tous les tests passent.
