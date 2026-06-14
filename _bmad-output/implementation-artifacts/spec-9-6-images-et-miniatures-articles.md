---
title: 'Images et miniatures pour les articles IBC'
type: 'feature'
created: '2026-06-14T21:03:00+02:00'
status: 'done'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Les administrateurs d'IBC ne pouvaient pas téléverser d'images de couverture ni insérer d'images dans le contenu des articles pour illustrer les publications et attirer les visiteurs via le catalogue public et la page d'accueil.

**Approach:** Ajouter le champ `imageUrl` au modèle de données `Article`, créer une route d'API de téléversement sécurisée (supportant R2 avec fallback local), enrichir le formulaire d'administration avec un uploader de couverture et un raccourci d'insertion d'images Markdown en ligne, et ajuster l'affichage public (LatestArticles, ArticleCard, et page de détail).

## Boundaries & Constraints

**Always:**
- Utiliser la configuration R2/S3 si disponible.
- Fournir un fallback local sécurisé (`/public/uploads/articles/`) en cas d'absence de configuration cloud (environnement de dev).
- Limiter les types de fichiers aux images courantes (jpeg, png, webp, gif) et la taille à 5 Mo.

**Ask First:**
- (Aucune décision supplémentaire requise, le plan initial a été validé et appliqué).

**Never:**
- Permettre à des utilisateurs non administrateurs d'appeler l'API de téléversement.
- Bloquer le démarrage ou l'utilisation locale en exigeant des clés R2 fictives ou non configurées.

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` -- Modèle de base de données PostgreSQL de production
- `prisma/schema.dev.prisma` -- Modèle de base de données SQLite de développement
- `src/lib/validations.ts` -- Schémas de validation Zod d'articles
- `src/app/api/admin/articles/upload/route.ts` -- Route d'API sécurisée pour le téléversement d'images
- `src/app/api/articles/route.ts` -- Route de gestion et création globale des articles
- `src/app/api/articles/[id]/route.ts` -- Route d'édition des articles individuels
- `src/components/features/admin/article-form.tsx` -- Formulaire d'édition admin d'article
- `src/components/features/articles/ArticleCard.tsx` -- Carte d'aperçu d'un article
- `src/components/landing/latest-articles.tsx` -- Composant des derniers articles en page d'accueil
- `src/app/(public)/articles/[slug]/page.tsx` -- Page de détail d'un article

## Tasks & Acceptance

**Execution:**
- [x] Modifier les schémas Prisma (`schema.prisma` et `schema.dev.prisma`) pour ajouter `imageUrl`
- [x] Lancer la synchronisation de base de données SQLite en local (`prisma db push` / `generate`)
- [x] Mettre à jour `src/lib/validations.ts` (`articleCreateSchema`, `articleUpdateSchema`)
- [x] Créer la route d'API `/api/admin/articles/upload`
- [x] Mettre à jour `/api/articles` et `/api/articles/[id]`
- [x] Ajouter l'uploader et le raccourci d'insertion Markdown dans `ArticleForm`
- [x] Mettre à jour les vues publiques (`LatestArticles`, `ArticleCard`, detail page)
- [x] Adapter et corriger les tests unitaires dans `article-form.test.tsx`

**Acceptance Criteria:**
- Given un administrateur connecté sur `/admin/articles/new`, when il sélectionne une image, then elle est téléversée et prévisualisée.
- Given un administrateur modifiant un article, when il utilise le bouton d'insertion en ligne, then une image est téléversée et le tag Markdown correspondant est inséré dans l'éditeur.
- Given des visiteurs sur `/articles` et la page d'accueil, when un article dispose d'une image de couverture, then sa miniature s'affiche élégamment sur la carte.

## Spec Change Log

(Aucune modification post-approbation).

## Design Notes

- Les fichiers locaux sont sauvegardés dans `public/uploads/articles/`. L'accès en lecture se fait via la route statique de Next `/uploads/articles/[nom-du-fichier]`.
- Les images dans le corps de l'article sont gérées nativement par le parseur Markdown existant via le tag `![alt](url)` généré.

## Verification

**Commands:**
- `npx vitest run src/components/features/admin/article-form.test.tsx` -- expected: 4 tests pass

### Review Findings

- [x] [Review][Patch] Local upload path `/uploads/articles/...` fails Zod URL validation schema [src/lib/validations.ts]
- [x] [Review][Patch] Individual article edit route `[id]/route.ts` does not update `imageUrl` [src/app/api/articles/[id]/route.ts]
- [x] [Review][Patch] Missing `group` class on parent Card prevents thumbnail hover zoom animation [src/components/features/articles/ArticleCard.tsx:504]
- [x] [Review][Patch] Empty string value for `imageUrl` causes empty image rendering in views [src/app/(public)/articles/[slug]/page.tsx:60]
- [x] [Review][Patch] Standard `<img>` elements used instead of Next.js optimized `<Image>` [src/app/(public)/articles/[slug]/page.tsx]
- [x] [Review][Patch] Security Vulnerability: Arbitrary File Upload via Client-Spoofed MIME Type [src/app/api/admin/articles/upload/route.ts:105]
- [x] [Review][Patch] Unsanitized extension extraction from file name in upload API [src/app/api/admin/articles/upload/route.ts:120]
- [x] [Review][Patch] Direct DOM selection `document.getElementById("content")` in React form [src/components/features/admin/article-form.tsx:340]
- [x] [Review][Patch] Markdown syntax corruption via special characters in file name [src/components/features/admin/article-form.tsx:338]
- [x] [Review][Patch] Form submission allowed during active image uploads [src/components/features/admin/article-form.tsx]
- [x] [Review][Patch] Database seed execution and process exit on module import [prisma/seed.ts]
- [x] [Review][Patch] Silently failing ephemeral local storage in production [src/app/api/admin/articles/upload/route.ts]
- [x] [Review][Patch] Hardcoded styling values in latest-articles preview fallback [src/components/landing/latest-articles.tsx]


