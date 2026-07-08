---
baseline_commit: 1929073ea9075ca7549cb863bd7a6aae6e63921e
---

# Story 26.3: Upload de Preuve de Virement & Validation Admin

Status: done

## Story

**En tant que** nouveau membre ayant choisi le virement bancaire,  
**je veux** téléverser mon attestation de virement lors de ma souscription,  
**afin que** l'administrateur puisse valider rapidement mon paiement et activer mon abonnement.

## Acceptance Criteria

1. **Champ de téléversement accessible en sélection virement bancaire** (AC1) : Sur l'écran de paiement, quand le membre sélectionne `BANK_TRANSFER`, le formulaire affiche un champ Drag & Drop / sélection de fichier acceptant uniquement `application/pdf`, `image/jpeg`, `image/png` jusqu'à 5 Mo.
2. **Téléversement sécurisé R2 et persistance en DB** (AC2) : Lorsque le membre valide sa souscription, le justificatif est uploadé sur Cloudflare R2 sous `subscriptions/{subscriptionId}/receipts/{uuid}.{ext}`. La souscription est mise à jour avec `paymentReceiptUrl` (URL publique) et `paymentReceiptKey` (clé R2). Le statut passe à `PENDING` (ou reste `TRIAL` selon le flux d'attente actuel : pour le virement bancaire, la route `POST /api/subscriptions` crée déjà une souscription `PENDING`).
3. **Aperçu admin du reçu téléversé** (AC3) : Dans l'écran admin de validation (`/admin/subscriptions`), les abonnements en attente avec un `paymentReceiptUrl` affichent un lien/bouton d'aperçu pour consulter le justificatif.
4. **Approbation admin avec synchronisation du tier en transaction** (AC4) : Quand l'admin clique sur "Approuver" (action `validate` de `PATCH /api/admin/subscriptions/[id]`), la souscription passe à `ACTIVE` et `user.tier` est synchronisé avec `subscription.tier` dans la même transaction Prisma. La route existe déjà et réalise cela — vérifier qu'elle reste idempotente.
5. **Conformité UX Next.js 16** : Aucun `&&` dans JSX ; les booléens composés sont précalculés avant le return.
6. **Tests** : tests unitaires/d'intégration Vitest co-localisés mis à jour ou ajoutés, sans casser les tests existants.

## Tasks / Subtasks

- [ ] **Mise à jour des modèles Prisma** (AC #2)
  - [ ] Ajouter `paymentReceiptUrl String?` et `paymentReceiptKey String?` au modèle `Subscription` dans `prisma/schema.prisma`.
  - [ ] Ajouter les deux mêmes champs dans `prisma/schema.dev.prisma`.
  - [ ] Générer la migration locale : `npx prisma migrate dev --name add_subscription_receipt_fields`.
- [ ] **Ajout du helper de clé R2 pour les reçus** (AC #2)
  - [ ] Dans `src/lib/r2.ts`, ajouter une fonction `createSubscriptionReceiptR2Key(subscriptionId: string, fileName: string, mimeType: string)` qui renvoie `subscriptions/{subscriptionId}/receipts/{uuid}.{ext}` en réutilisant `getDocumentExtension` et `crypto.randomUUID()`.
  - [ ] Constantes dédiées : `RECEIPT_ALLOWED_MIME_TYPES` (pdf/jpeg/png) et `RECEIPT_MAX_SIZE_BYTES = 5 * 1024 * 1024` (le projet a déjà `DOCUMENT_ALLOWED_MIME_TYPES` avec webp et 10 Mo, mais les reçus doivent être strictement limités à 5 Mo / pdf-jpeg-png).
- [ ] **Création de la route API d'upload de reçu** (AC #2) : `src/app/api/subscriptions/upload-receipt/route.ts` [NEW]
  - [ ] Méthode `POST`, runtime `nodejs`.
  - [ ] Authentifier la session via `auth()` ; refuser si non connecté (401).
  - [ ] Récupérer la souscription `PENDING`/`TRIAL` la plus récente de l'utilisateur (`prisma.subscription.findFirst` avec `userId`, `provider: BANK_TRANSFER`, `status in [PENDING, TRIAL]`, tri `createdAt desc`).
  - [ ] Lire `formData`, valider le fichier avec un schéma Zod strict (5 Mo, pdf/jpeg/png).
  - [ ] Vérifier la configuration R2 via `getMissingR2Env()` et renvoyer 503 si absente.
  - [ ] Uploader le buffer via `uploadObjectToS3(key, buffer, mimeType)` avec `createSubscriptionReceiptR2Key`.
  - [ ] Mettre à jour la souscription : `paymentReceiptUrl = createPublicDocumentUrl(key)`, `paymentReceiptKey = key`, `status` inchangé (la route `POST /api/subscriptions` a déjà positionné `PENDING` pour le virement bancaire).
  - [ ] Retourner `{ data: { subscriptionId, paymentReceiptUrl, paymentReceiptKey } }` (201) ou une erreur structurée `{ error, code? }`.
  - [ ] Respecter le pattern `try/catch` et ne jamais exposer d'erreur interne brute.
- [ ] **Mise à jour du sélecteur de moyen de paiement** (AC #1)
  - [ ] Modifier `src/components/payment-method-selector.tsx` pour afficher un champ de fichier quand `selectedProvider === "BANK_TRANSFER"`.
  - [ ] Précalculer `const showReceiptUpload = selectedProvider === "BANK_TRANSFER";` avant le return.
  - [ ] Accepter le fichier sélectionné via `<input type="file" accept=".pdf,.jpg,.jpeg,.png" />` avec un label et une zone de drop stylisée (classes Tailwind existantes : `rounded-xl border bg-card p-4`, etc.).
  - [ ] Valider la taille et le type côté client avant soumission et afficher un message d'erreur clair.
  - [ ] Étendre l'interface `PaymentMethodSelectorProps` : `onSubmit?: (provider, file?, phone?) => void` ou gérer le fichier via un state local et une prop `onFileSelected?: (file: File | null) => void` pour ne pas casser les appelants existants. Privilégier l'approche la moins invasive : ajouter `onFileChange?: (file: File | null) => void` que le parent consomme.
- [ ] **Intégration de l'upload dans le flux de confirmation virement** (AC #1, #2)
  - [ ] Modifier `src/components/bank-transfer-instructions.tsx` :
    - [ ] Lorsque le membre clique sur "J'ai effectué le virement", s'il a sélectionné un fichier valide, appeler `POST /api/subscriptions/upload-receipt` en `FormData` (champ `file`) **avant** ou **après** la création de la souscription — le plus robuste est : créer d'abord la souscription via `POST /api/subscriptions` (retourne `subscription.id`), puis appeler `upload-receipt` avec cet `id`.
    - [ ] Attendre le retour de `upload-receipt` pour afficher l'état confirmé.
  - [ ] Alternative acceptable si plus simple UX : fusionner la création de souscription + l'upload dans un seul `FormData` vers `/api/subscriptions/upload-receipt` qui crée la souscription puis upload. **MAIS** cela rompt le pattern existant du bouton "J'ai effectué le virement". Recommandation : conserver le flux en deux appels (création → upload) et utiliser `subscription.id` retourné par `POST /api/subscriptions`.
- [ ] **Mise à jour de l'écran admin `/admin/subscriptions`** (AC #3)
  - [ ] Dans `src/app/(admin)/admin/subscriptions/page.tsx`, inclure `paymentReceiptUrl` dans la sélection Prisma et le typer dans `AdminSubscription`.
  - [ ] Ajouter une colonne "Justificatif" dans le tableau des abonnements à valider (et optionnellement dans actifs).
  - [ ] Afficher un lien/bouton "Voir le reçu" quand `paymentReceiptUrl` est présent (précalculer `const hasReceipt = Boolean(subscription.paymentReceiptUrl);` avant le JSX).
  - [ ] Ouvrir le fichier dans un nouvel onglet (`target="_blank" rel="noopener noreferrer"`) ou dans une visionneuse PDF/image native du navigateur.
- [ ] **Vérification / ajustement de la route admin d'approbation** (AC #4)
  - [ ] Contrôler `src/app/api/admin/subscriptions/[id]/route.ts` :
    - [ ] L'action `validate` fait déjà `tx.subscription.update({ status: ACTIVE })` + `tx.user.update({ tier: subscription.tier })` dans une transaction.
    - [ ] S'assurer qu'elle reste idempotente (re-cliquer sur "Approuver" quand le statut est déjà `ACTIVE` doit retourner une erreur de transition `409` plutôt que re-déclencher les side effects emails/audit).
    - [ ] Décider si l'approbation doit exiger un `paymentReceiptUrl` non nul pour `BANK_TRANSFER`. AC4 ne le mentionne pas explicitement, mais le contexte métier suggère que pour un virement, le reçu doit être présent. **À discuter/implémenter avec prudence** : ajouter une validation `if (subscription.provider === "BANK_TRANSFER" && !subscription.paymentReceiptUrl) return 409 { code: "RECEIPT_MISSING" }` sous peine d'empêcher l'approbation d'anciennes souscriptions créées avant cette story. Pour ne pas casser l'existant, privilégier un warning côté UI (bouton grisé si pas de reçu) plutôt qu'un blocage hard côté API.
- [ ] **Mise à jour des tests**
  - [ ] Adapter `src/components/bank-transfer-instructions.test.tsx` : simuler la sélection d'un fichier, mocker `fetch` pour `/api/subscriptions` puis `/api/subscriptions/upload-receipt`, vérifier l'appel FormData et l'affichage du tracker PENDING.
  - [ ] Ajouter `src/app/api/subscriptions/upload-receipt/route.test.ts` : couvrir authentification, validation MIME/taille, upload R2 mocké, mise à jour DB, retour 201.
  - [ ] Adapter `src/app/(admin)/admin/subscriptions/page.test.tsx` si existant, sinon créer un test minimal vérifiant le lien de reçu.
  - [ ] Exécuter `npx vitest run` sur les fichiers touchés.

## Dev Notes

### Delta sur code existant — NE PAS réinventer

- **Upload R2 existant** : `src/app/api/opportunities/[id]/documents/upload/route.ts` est le patron à copier. Il utilise `formData`, `documentPresignSchema`, `uploadObjectToS3`, `createDocumentR2Key`, `createPublicDocumentUrl`, retourne `{ data: serializeDocument(document) }`. Pour les reçus, adapter la clé R2 et persister directement sur `Subscription` plutôt que sur une table `Document`.
- **R2 helpers existants** : `src/lib/r2.ts` expose `uploadObjectToS3`, `createPublicDocumentUrl`, `getMissingR2Env`, `isAllowedDocumentMimeType`, `getDocumentExtension`. Ajouter une fonction dédiée aux reçus pour respecter le préfixe imposé par l'architecture.
- **Sélecteur de paiement existant** : `src/components/payment-method-selector.tsx` gère déjà `BANK_TRANSFER` / `WAVE` / `ORANGE_MONEY` via `onSubmit(provider, phone)`. Ajouter la prop `onFileChange` et le champ fichier uniquement pour `BANK_TRANSFER`.
- **Route de création de souscription existante** : `src/app/api/subscriptions/route.ts` crée une souscription `PENDING` pour virement bancaire et retourne `{ data: { subscription, payment } }`. Le client de `/pricing/virement` peut récupérer `subscription.id` pour l'upload.
- **Route admin d'approbation existante** : `src/app/api/admin/subscriptions/[id]/route.ts` valide déjà la transition, calcule `endDate`, synchronise `user.tier`, envoie l'email, loggue l'audit. AC4 est donc en grande partie déjà satisfait ; le dev doit vérifier l'idempotence et éventuellement afficher le reçu côté admin.

### Architecture et patterns à suivre

- **JSX Boolean Guardrail** : ne jamais utiliser `&&` dans JSX. Précalculer chaque booléen composé en constante avant le return. Exemple :
  ```tsx
  const showReceiptUpload = selectedProvider === "BANK_TRANSFER";
  const hasSelectedFile = selectedFile !== null;
  ```
  Puis `{showReceiptUpload ? <UploadField /> : null}` et `{hasSelectedFile ? <FilePreview /> : null}`.
- **Prisma multi-schémas** : modifier impérativement **les deux** `schema.prisma` et `schema.dev.prisma` ; sinon les tests unitaires et le dev local échoueront.
- **TypeScript strict** : typer `paymentReceiptUrl` et `paymentReceiptKey` comme `string | null` dans les interfaces des composants admin et du sélecteur.
- **API Response Format** : succès `NextResponse.json({ data: T }, { status: 201 })` ; erreur `NextResponse.json({ error: string, code?: string }, { status })`.
- **Server-only imports** : la route d'upload doit importer `"server-only"` et ne jamais importer `@/lib/prisma` côté client.
- **Tailwind / shadcn** : réutiliser les primitives existantes (`Card`, `Button`, `Input`, `Label`) et les classes Tailwind v4 (`rounded-xl`, `border`, `bg-muted`, `p-4`, `text-sm`, `text-destructive`, etc.).
- **Accessibilité** : champ fichier avec `aria-describedby`, messages d'erreur `role="alert"`, focus visible `focus-visible:ring-2 focus-visible:ring-ring`.

### Détail du flux virement recommandé

1. Membre choisit un tier sur `/pricing` → `PaymentMethodSelector` avec `BANK_TRANSFER` sélectionné.
2. Le membre sélectionne son justificatif de virement dans le nouveau champ fichier.
3. Clic sur "Continuer" → `pricing-tier-selection.tsx` redirige vers `/pricing/virement?tier=...&period=...`.
4. Sur `/pricing/virement`, `BankTransferInstructions` affiche les coordonnées bancaires.
5. Le membre clique "J'ai effectué le virement" :
   - Appel `POST /api/subscriptions` (corps `{ tier, period }`) → crée souscription `PENDING` avec `providerRef`.
   - Appel `POST /api/subscriptions/upload-receipt` avec `FormData` contenant `subscriptionId` et `file`.
   - La route met à jour `paymentReceiptUrl` / `paymentReceiptKey` sur la souscription.
   - UI passe à l'état confirmé avec `SubscriptionStatusTracker status="PENDING"`.

### Références

- **Epic 26 — Story 26.3** : [epics.md (L2560-L2585)](file:///D:/Code/ivoire-business-club-next/_bmad-output/planning-artifacts/epics.md#L2560-L2585)
- **Spec consolidation Epic 26** : [epic-26-consolidation-spec.md (L102-L114)](file:///D:/Code/ivoire-business-club-next/_bmad-output/planning-artifacts/epic-26-consolidation-spec.md#L102-L114)
- **Architecture R2 / receipts** : [architecture.md (L157-L161, L212, L234, L440-L447)](file:///D:/Code/ivoire-business-club-next/_bmad-output/planning-artifacts/architecture.md#L157-L161)
- **Route upload documents (patron)** : `src/app/api/opportunities/[id]/documents/upload/route.ts`
- **Route admin d'approbation** : `src/app/api/admin/subscriptions/[id]/route.ts`
- **Règles générales du projet** : [project-context.md](file:///D:/Code/ivoire-business-club-next/project-context.md)

## Dev Agent Record

### Agent Model Used

kimi-k2.7-code (2 batches)

### Debug Log References

### Completion Notes List

- Intégration de l’upload du justificatif dans `BankTransferInstructions` : après création de la souscription via `POST /api/subscriptions`, appel `POST /api/subscriptions/upload-receipt` en FormData avec `subscriptionId` et `file`. Échec d’upload traité en warning toast sans bloquer la confirmation.
- Ajout d’un champ fichier inline sur la page `/pricing/virement` via `BankTransferInstructions` (state local `localReceiptFile`), avec validation PDF/JPEG/PNG ≤ 5 Mo, aperçu du fichier sélectionné et bouton de retrait.
- Colonne "Justificatif" ajoutée dans le tableau admin `/admin/subscriptions` : lien "Voir le reçu" ouvrant l’URL publique R2 dans un nouvel onglet quand `paymentReceiptUrl` est présent, sinon tiret. `paymentReceiptUrl` inclus dans les 3 requêtes Prisma.
- Vérification de l’idempotence de la route admin `PATCH /api/admin/subscriptions/[id]/validate` : transition guard renvoie 409 sur statut déjà ACTIVE confirmé.
- Tests mis à jour / ajoutés : `bank-transfer-instructions.test.tsx`, `payment-method-selector.test.tsx`, `page.test.tsx` admin.
- Validation globale : `npm run build` passe, `npx vitest run` → 179 fichiers, 1261 tests passent, grep `&&` JSX vide.

### File List

- `prisma/schema.prisma`
- `prisma/schema.dev.prisma`
- `src/lib/r2.ts`
- `src/lib/validations.ts`
- `src/app/api/subscriptions/upload-receipt/route.ts` [NEW]
- `src/app/api/subscriptions/upload-receipt/route.test.ts` [NEW]
- `src/components/payment-method-selector.tsx`
- `src/components/payment-method-selector.test.tsx`
- `src/components/bank-transfer-instructions.tsx`
- `src/components/bank-transfer-instructions.test.tsx`
- `src/app/(admin)/admin/subscriptions/page.tsx`
- `src/app/api/admin/subscriptions/[id]/route.ts` (vérification uniquement)
