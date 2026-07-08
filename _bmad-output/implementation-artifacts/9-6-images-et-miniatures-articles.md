---
title: "Images et miniatures pour les articles IBC"
status: done
story_key: 9-6-images-et-miniatures-articles
epic: 9
created: 2026-06-14
last_updated: 2026-07-08
baseline_commit: N/A (implemented via spec, not via DS cycle)
---

# Story 9-6: Images et miniatures pour les articles

> **Note**: Cette story a été implémentée via un spec `bmad-quick-dev` (`spec-9-6-images-et-miniatures-articles.md`) sans créer de fichier story .md dédié. Ce fichier est créé rétroactivement pour assurer la traçabilité BMAD. Le spec ci-dessus sert de source de vérité complète.

## Spec de référence

Voir: `spec-9-6-images-et-miniatures-articles.md`

## Intent

Les administrateurs d'IBC ne pouvaient pas téléverser d'images de couverture ni insérer d'images dans le contenu des articles. Cette story ajoute le champ `imageUrl` au modèle `Article`, une route d'API de téléversement sécurisée (R2 + fallback local), un uploader dans le formulaire admin, et l'affichage des miniatures sur les vues publiques.

## Acceptance Criteria

1. Given un administrateur connecté sur `/admin/articles/new`, when il sélectionne une image, then elle est téléversée et prévisualisée.
2. Given un administrateur modifiant un article, when il utilise le bouton d'insertion en ligne, then une image est téléversée et le tag Markdown correspondant est inséré dans l'éditeur.
3. Given des visiteurs sur `/articles` et la page d'accueil, when un article dispose d'une image de couverture, then sa miniature s'affiche élégamment sur la carte.

## Implementation Summary

- Modèles Prisma (PostgreSQL + SQLite) : champ `imageUrl` ajouté
- Route API `/api/admin/articles/upload` avec validation MIME et sécurité
- Formulaire admin : uploader de couverture + raccourci insertion Markdown
- Vues publiques : `LatestArticles`, `ArticleCard`, page détail avec miniatures
- Fallback local `/public/uploads/articles/` quand R2 non configuré

## Code Review

Tous les findings du CR ont été patchés (14 patches appliqués). Voir le spec pour la liste complète.

## Dev Agent Record

- **Status**: done
- **Implementation**: via spec (quick-dev pattern)
- **Verification**: `npx vitest run src/components/features/admin/article-form.test.tsx` — 4 tests pass
- **CR**: PASS (tous les patches appliqués)