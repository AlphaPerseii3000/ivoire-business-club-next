---
Story: "3.2"
StoryKey: "3-2-upload-et-attachement-de-documents-juridiques"
Title: "Upload et Attachement de Documents Juridiques"
Status: ready-for-dev
Priority: "P0"
Epic: "Epic 3 — Marketplace d'Opportunités et Vérification"
FRs: ["FR15", "FR23", "FR37"]
NFRs: ["NFR-I3", "NFR-S5", "NFR-S8", "NFR-A1", "NFR-A3"]
UXDRs: ["UX-DR8", "UX-DR13", "UX-DR14", "UX-DR19", "UX-DR20", "UX-DR31"]
Created: "2026-05-17"
---

# Story 3.2: Upload et Attachement de Documents Juridiques

Status: ready-for-dev

## Story

En tant que porteur de projet,
je veux uploader des documents juridiques (titre foncier, KYC, registre du commerce) sur mon deal,
afin de renforcer la crédibilité de mon opportunité.

## Acceptance Criteria

1. **Upload via URL signée R2 depuis création ou édition de deal**
   - Given un membre sur la page de son deal (édition ou création),
   - When il clique sur « Ajouter un document » et sélectionne un fichier PDF ou image (< 10 Mo),
   - Then le fichier est uploadé vers Cloudflare R2 via une URL signée (NFR-I3),
   - And un `DocumentRow` s'affiche avec : icône fichier, nom, taille, bouton preview.

2. **Progression non bloquante pendant upload volumineux**
   - Given un document en cours d'upload,
   - When le fichier est volumineux,
   - Then une barre de progression s'affiche,
   - And le membre peut continuer à éditer les autres champs du deal sans perdre l'état du formulaire.

3. **Affichage des documents attachés sur le deal**
   - Given un membre consultant son deal,
   - When des documents sont attachés,
   - Then ils apparaissent dans une section « Documents juridiques » avec un compteur visuel (icône paperclip + nombre).

4. **Preview/téléchargement réservé à l'admin ou à l'auteur**
   - Given un admin ou l'auteur du deal,
   - When il clique sur un document,
   - Then il peut le prévisualiser inline (viewer PDF ou thumbnail image) ou le télécharger.
   - And un membre non auteur ne doit pas accéder aux documents d'un deal non autorisé.

## Tasks / Subtasks

- [ ] Modéliser les documents juridiques en base (AC: #1, #3, #4)
  - [ ] Ajouter un modèle Prisma `Document` (ou `OpportunityDocument` si le nom `Document` pose conflit) relié à `Opportunity` avec `opportunityId`, `uploadedById`, `fileName`, `originalName`, `mimeType`, `size`, `r2Key`, `publicUrl?`, `createdAt`, `updatedAt`.
  - [ ] Ajouter la relation `documents` sur `Opportunity` et `uploadedDocuments` sur `User` si nécessaire.
  - [ ] Conserver les noms Prisma en camelCase et mapper la table en snake_case, par exemple `@@map("opportunity_documents")`.
  - [ ] Créer et appliquer une migration Prisma, puis exécuter `npx prisma generate`.

- [ ] Installer et isoler l'intégration Cloudflare R2 (AC: #1, #4)
  - [ ] Installer `@aws-sdk/client-s3` et `@aws-sdk/s3-request-presigner` (aucun SDK AWS n'est installé actuellement).
  - [ ] Créer `src/lib/r2.ts` côté serveur uniquement : client S3-compatible avec endpoint `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, region `auto`, credentials `R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`, bucket `R2_BUCKET_NAME`.
  - [ ] Valider au démarrage ou à l'appel API que les variables `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` sont présentes.
  - [ ] Ne jamais exposer les secrets R2 au client ; seules les URLs signées et métadonnées nécessaires peuvent être renvoyées.

- [ ] Créer les endpoints de documents (AC: #1, #3, #4)
  - [ ] Créer `POST /api/opportunities/[id]/documents/presign` pour authentifier la session, vérifier que l'utilisateur est l'auteur du deal ou ADMIN, valider `fileName`, `mimeType`, `size`, refuser > 10 Mo, refuser tout type hors PDF/images, générer une clé R2 non devinable, puis renvoyer une URL signée `PUT`.
  - [ ] Créer `POST /api/opportunities/[id]/documents/complete` pour confirmer un upload réussi, créer la ligne DB avec métadonnées, et renvoyer le document créé.
  - [ ] Créer `GET /api/opportunities/[id]/documents` pour lister les documents autorisés d'un deal.
  - [ ] Créer `GET /api/opportunities/[id]/documents/[documentId]/download` ou `preview` pour vérifier les droits et renvoyer une URL signée de lecture/téléchargement courte durée.
  - [ ] Tous les handlers doivent utiliser `auth()` depuis `@/lib/auth`, `prisma` depuis `@/lib/prisma`, `NextResponse.json`, messages d'erreur en français, et ne pas logger de noms de documents sensibles au-delà du minimum utile (NFR-S8).

- [ ] Ajouter validation Zod et utilitaires fichier (AC: #1, #2)
  - [ ] Étendre `src/lib/validations.ts` avec schémas `documentPresignSchema` et `documentCompleteSchema`.
  - [ ] Autoriser strictement `application/pdf`, `image/jpeg`, `image/png`, `image/webp` ; taille maximale `10 * 1024 * 1024`.
  - [ ] Ajouter un utilitaire de formatage taille lisible (`Ko`, `Mo`) ou le garder dans le composant si déjà localisé.

- [ ] Construire le composant `DocumentRow` (AC: #1, #3, #4)
  - [ ] Créer `src/components/features/deals/document-row.tsx` conformément à l'architecture.
  - [ ] Afficher icône fichier adaptée (PDF/image), nom original, taille formatée, état upload/progression, bouton « Aperçu », bouton « Télécharger » si URL disponible.
  - [ ] Respecter WCAG AA : boutons focusables, `aria-label`, texte en français, zone cliquable ≥44px, contraste shadcn/Tailwind.
  - [ ] Utiliser des ternaires en JSX plutôt que `&&` pour respecter la contrainte Next.js 16 du projet.

- [ ] Intégrer l'upload dans le formulaire de création/édition de deal (AC: #1, #2)
  - [ ] Étendre `src/app/(dashboard)/opportunities/new/page.tsx` ou extraire le formulaire dans un client component réutilisable si l'édition arrive dans la même story.
  - [ ] Ajouter une section « Documents juridiques » avec bouton « Ajouter un document », input fichier multiple ou single répété, et états de progression non bloquants via `XMLHttpRequest` (pour `upload.onprogress`) ou une stratégie équivalente permettant de mesurer la progression du PUT signé.
  - [ ] Pour la création de deal, gérer proprement l'ordre : créer l'opportunité puis attacher les documents, ou stocker les fichiers côté client jusqu'à l'obtention de l'`opportunityId`. Ne pas créer de documents orphelins.
  - [ ] Afficher des toasts success/error avec `sonner` et conserver les valeurs du formulaire pendant l'upload.

- [ ] Afficher les documents sur la page détail du deal (AC: #3, #4)
  - [ ] Mettre à jour `src/app/(dashboard)/opportunities/[id]/page.tsx` pour inclure les documents dans la requête Prisma et afficher une section « Documents juridiques ».
  - [ ] Ajouter un compteur visuel paperclip + nombre sur la page détail et, si pertinent, sur la liste `src/app/(dashboard)/opportunities/page.tsx`.
  - [ ] N'afficher preview/téléchargement qu'à l'auteur ou à l'ADMIN. Les autres membres peuvent voir uniquement le compteur si la visibilité future le requiert.
  - [ ] Prévoir preview inline : `<iframe>`/`object` pour PDF, thumbnail `<img>` pour images, avec fallback « Télécharger » si preview indisponible.

- [ ] Tests et vérifications (AC: #1-#4)
  - [ ] Ajouter tests unitaires pour la validation taille/type et l'autorisation auteur/admin vs non auteur si infrastructure Vitest disponible.
  - [ ] Tester manuellement : PDF valide, image valide, type refusé, fichier > 10 Mo, upload interrompu, progression visible, preview auteur/admin, accès refusé non auteur.
  - [ ] Exécuter `npm run lint` et, si les changements Prisma le permettent localement, `npx prisma validate` / `npx prisma generate`.

## Notes

### Contexte existant à préserver

- Story 3.1 est terminée : le modèle `Opportunity` existe et la création d'opportunité fonctionne avec `verificationStatus = PENDING` et `requiresDoubleVerification` automatique pour les montants > 50 000 €.
- Le formulaire actuel de création est dans `src/app/(dashboard)/opportunities/new/page.tsx` et utilise React Hook Form + Zod + `sonner`. Le dev doit l'étendre sans casser la validation actuelle titre/description/catégorie/montant.
- La page liste est `src/app/(dashboard)/opportunities/page.tsx` ; la page détail est `src/app/(dashboard)/opportunities/[id]/page.tsx`.
- L'API existante `src/app/api/opportunities/route.ts` ne gère aujourd'hui que `POST /api/opportunities`.
- Le schéma Prisma actuel ne contient pas de modèle `Document`; `Opportunity` contient seulement les champs du deal et les relations `author` / `verifiedBy`.
- Le code d'avatar upload (`src/app/api/user/avatar/route.ts`) écrit en local dans `public/avatars`; ne pas réutiliser ce stockage local pour les documents juridiques. Story 3.2 exige Cloudflare R2 via URL signée.

### Contraintes architecture / sécurité

- Stack réelle lue dans `package.json` : Next.js 16.2.6, React 19.2.4, Prisma 7.8.0, Auth.js v5 beta.31, TailwindCSS 4, shadcn/ui, Vitest déjà présent.
- Prisma 7 : importer le client depuis `@/generated/prisma/client` indirectement via `src/lib/prisma.ts`; ne pas instancier un second PrismaClient.
- Auth.js v5 : les routes API serveur peuvent utiliser `auth()` depuis `@/lib/auth`; ne jamais importer Prisma/bcrypt dans `auth.config.ts` ou middleware Edge.
- Les endpoints fichiers sont des routes sensibles : session obligatoire (NFR-S5), vérification stricte auteur/ADMIN, erreurs génériques en cas d'accès interdit.
- NFR-S8 : les noms de documents juridiques peuvent être sensibles ; éviter les logs détaillés de `originalName`, URLs signées, clés R2 ou erreurs avec secrets.
- Cloudflare R2 doit être utilisé via SDK S3-compatible et URLs signées. Ne pas passer par un upload multipart serveur avec `formData()` pour les documents de deal, afin de conserver la progression côté client et d'éviter de charger de gros fichiers en mémoire Node.
- Utiliser des clés R2 non devinables, par exemple `opportunities/{opportunityId}/documents/{cuid-or-crypto-random}.{ext}`. Ne pas faire confiance au nom utilisateur pour la clé.
- Les URLs signées doivent avoir une durée courte. Stocker en DB la clé R2 + métadonnées, pas l'URL signée éphémère.

### UX / accessibilité

- `DocumentRow` est explicitement prévu par l'architecture en `components/features/deals/document-row.tsx` et par UX-DR8 : icône fichier, nom, taille, téléchargement, vignette/preview.
- UX spec : l'upload de documents montre barres de progression + miniatures ; le détail deal mobile inclut une section Legal documents en scroll horizontal, desktop en colonne gauche.
- Texte UI en français (NFR-A3 / FR44). Messages recommandés : « Type de fichier non supporté. Utilisez PDF, JPEG, PNG ou WebP. », « Le fichier dépasse la taille maximale de 10 Mo. », « Document ajouté avec succès. ».
- Next.js 16 strict dans ce projet : utiliser des ternaires (`condition ? <Comp /> : null`) plutôt que `&&` dans JSX.

### Portée explicitement exclue

- Ne pas implémenter le kanban admin complet : c'est Story 3.3.
- Ne pas implémenter la logique complète TrustBadge Bronze/Argent/Or : c'est Story 3.5, mais Story 3.2 doit fournir les données documents nécessaires.
- Ne pas ajouter Stripe/CinetPay ou tout provider de paiement tiers.
- Ne pas traiter les mismatches préexistants `avatarUrl` vs `image` ni `Subscription.providerRef` sauf si un changement de cette story le nécessite directement.

### Références

- `epics.md` lignes 57-66 : FR15/FR23 marketplace documents et double vérification.
- `epics.md` lignes 678-701 : définition et AC de Story 3.2.
- `epics.md` lignes 135-139 : NFR-I3 Cloudflare R2.
- `epics.md` lignes 170-178 : UX-DR8 `DocumentRow`.
- `architecture.md` lignes 132-139 : R2, API route handlers, RHF + Zod.
- `architecture.md` lignes 192-216 : conventions API et erreurs.
- `architecture.md` lignes 278-310 et 422-429 : structure composants `features/deals/document-row.tsx`.
- `architecture.md` lignes 483-500 : Prisma comme seule couche DB, R2 comme stockage externe.
- `ux-spec.md` lignes 500-505 : upload avec progress bars + thumbnails.
- `ux-spec.md` lignes 639-660 : layout détail deal avec legal documents.
- Story précédente : `_bmad-output/implementation-artifacts/3-1-creation-et-soumission-dopportunite.md`.

## Dev Agent Record

### Agent Model Used

À renseigner par l'agent dev.

### Debug Log References

### Completion Notes List

### File List
