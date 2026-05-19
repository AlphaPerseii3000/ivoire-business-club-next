---
Story: "4.0"
StoryKey: "4-0-consolidation-post-retrospective-epic-3"
Title: "Consolidation post-rétrospective Epic 3 avant Epic 4"
Status: "ready-for-dev"
Priority: "P0"
Epic: "Epic 4 — Deep Links, Tags, Matching et Soft Commitment"
FRs: []
NFRs: ["NFR-S5", "NFR-S8", "NFR-A1"]
Created: "2026-05-19"
---

# Story 4.0: Consolidation post-rétrospective Epic 3 avant Epic 4

Status: ready-for-dev

<!-- Note: Story créée suite à la rétrospective Epic 3. Cette story traite la dette technique différée et renforce les guardrails avant l'Epic 4. -->

## Story

As a développeur IBC,
I want corriger les items différés et renforcer les guardrails identifiés par la rétrospective Epic 3,
so that l'Epic 4 démarre sur une base saine, sans dette accumulée et avec les patterns sécurité documentés.

## Acceptance Criteria

1. **avatarUrl vs image : alignement colonne DB / schéma Prisma**
   - Given `prisma/schema.prisma` déclare `image String?` sur le modèle `User`,
   - When la migration initiale crée la colonne `avatarUrl` dans la table `users`,
   - Then soit `@map("avatarUrl")` est ajouté au champ `image` dans le schéma, soit une migration renomme la colonne `avatarUrl` → `image`,
   - And `npm run build` et `npx vitest run` passent après la modification,
   - And tous les usages de `user.image` dans `src/` retournent correctement l'URL de l'avatar (vérifier les composants `Avatar` shadcn, les pages profil/settings, et l'API avatar upload).

2. **Subscription.providerRef nullable cohérent**
   - Given le champ `providerRef String?` dans `Subscription` était initialement NOT NULL sans default,
   - When le schéma actuel est vérifié,
   - Then `providerRef` est bien `String?` (nullable) dans le schéma et dans la DB,
   - And la migration correspondante existe dans `prisma/migrations/`,
   - And les tests existants (`subscription-access`, admin subscriptions) passent sans modification fonctionnelle,
   - And si la migration correspondante n'existe pas (changement silencieux), en créer une explicite `ALTER TABLE subscriptions ALTER COLUMN providerRef DROP NOT NULL`.

3. **Guardrail JSX booléen composé documenté dans les Dev Notes**
   - Given le pattern `{!a && !b ? <Comp /> : null}` a causé une erreur build dans Story 3.4,
   - When un développeur travaille sur une story IBC,
   - Then les Dev Notes du projet documentent explicitement : « Ne pas utiliser `&&` en JSX, y compris dans les conditions de ternaires. Précalculer toute expression booléenne composée en `const` avant le return JSX. »,
   - And cette règle est ajoutée au fichier `_bmad-output/planning-artifacts/architecture.md` section conventions ou équivalent,
   - And `npm run build` passe.

4. **Patterns sécurité upload documentés dans les Dev Notes**
   - Given les deux CR blockers sécurité de Story 3.2 (métadonnées documents exposées aux non-auteurs, clés R2 client acceptées sans validation),
   - When un développeur implémente un endpoint d'upload de fichiers dans une story future,
   - Then les Dev Notes du projet documentent :
     - (a) Presigned URL : le endpoint de completion DOIT valider la clé R2 côté serveur (regex pattern + scope check),
     - (b) Conditional metadata : ne jamais sérialiser les métadonnées complètes de documents à un utilisateur non autorisé; utiliser `documentCount` + `initialDocuments` conditionnel,
   - And cette documentation est ajoutée au fichier `_bmad-output/planning-artifacts/architecture.md` section sécurité ou équivalent.

5. **`dev.db` exclu des commits futurs**
   - Given un DS subagent a commité `dev.db` dans la Story 3.3,
   - When `.gitignore` est vérifié,
   - Then il contient les patterns `*.db` et `*.sqlite3` (il les contient déjà),
   - And `git log --oneline` ne montre plus de commit futur contenant `dev.db` dans les diffs (pas de correction rétroactive nécessaire, mais vérification que le pattern est en place),
   - And un check préventif est ajouté : mentionner dans les Dev Notes que les DS agents ne doivent pas utiliser `git add -A` qui contourne `.gitignore`.

6. **Vérification manuelle du patch `currentAdminApproved`**
   - Given le CR de la Story 3.5 a trouvé que `currentAdminApproved` était perdu après le merge optimiste,
   - When le Kanban admin est testé manuellement,
   - Then après une première validation d'un deal > 50k€ par un admin A :
     - Le badge affiche « 1/2 vérifications » ou équivalent,
     - Le bouton « Vérifier » est désactivé pour l'admin A avec explication « Vous avez déjà validé ce deal »,
     - L'admin B peut encore cliquer « Vérifier »,
     - Après la 2e validation, le deal passe à `VERIFIED` et l'email de confirmation est envoyé à l'auteur,
   - And ce test est documenté dans les Dev Notes de cette story.

7. **Build et tests passent**
   - Given toutes les modifications ci-dessus,
   - When `npm run build` et `npx vitest run` et `./node_modules/.bin/prisma validate` sont exécutés,
   - Then les trois passent sans erreur.

## Tasks / Subtasks

- [ ] **AC1 : Aligner avatarUrl vs image**
  - [ ] Vérifier le contenu de la migration initiale pour confirmer que la colonne est `avatarUrl` dans la DB
  - [ ] Ajouter `@map("avatarUrl")` au champ `image` dans `prisma/schema.prisma` sur le modèle `User`
  - [ ] Créer une migration additive `npx prisma migrate dev --name add-avatar-url-map` (la migration sera vide si Prisma détecte que `@map` ne change pas la DB — c'est correct)
  - [ ] Exécuter `npx prisma generate`
  - [ ] Vérifier dans `src/` que tous les usages de `user.image` fonctionnent (composants Avatar, pages profil/settings, API avatar upload)
  - [ ] Exécuter `npm run build` et `npx vitest run`

- [ ] **AC2 : Vérifier Subscription.providerRef nullable**
  - [ ] Vérifier que `providerRef String?` est bien nullable dans le schéma actuel
  - [ ] Vérifier que la DB locale a bien la colonne nullable (`PRAGMA table_info(subscriptions)`)
  - [ ] Si la migration correspondante n'existe pas, créer `npx prisma migrate dev --name make-providerref-nullable`
  - [ ] Exécuter `npx vitest run` pour vérifier que les tests passent

- [ ] **AC3 : Documenter le guardrail JSX booléen composé**
  - [ ] Ajouter une section dans `_bmad-output/planning-artifacts/architecture.md` (ou créer un fichier Dev Notes dédié) :
    ```
    ### JSX Boolean Guardrail (Next.js 16 Strict)
    - Ne pas utiliser `&&` en JSX, y compris dans les conditions de ternaires
    - Pattern incorrect : `{!isAuthor && !isAdmin ? <WhatsAppCTA /> : null}`
    - Pattern correct : `const shouldShowWhatsApp = !isAuthor && !isAdmin; {shouldShowWhatsApp ? <WhatsAppCTA /> : null}`
    - Règle : précalculer toute expression booléenne composée en `const` avant le return JSX
    ```
  - [ ] Vérifier que `npm run build` passe toujours

- [ ] **AC4 : Documenter les patterns sécurité upload**
  - [ ] Ajouter une section dans `_bmad-output/planning-artifacts/architecture.md` :
    ```
    ### Upload Security Patterns
    - Presigned URL completion endpoint DOIT valider la clé R2 côté serveur :
      - Regex : `^opportunities/[a-zA-Z0-9-]+/documents/[a-zA-Z0-9-]+\.[a-zA-Z0-9]+$`
      - Scope check : `key.startsWith('opportunities/{opportunityId}/documents/')`
    - Conditional metadata : ne jamais sérialiser `initialDocuments` complet aux non-auteurs/non-admins ;
      utiliser `documentCount` (toujours visible) + `initialDocuments` (seulement pour auteurs/admins)
    ```
  - [ ] Citer les stories source : Story 3.2 CR findings P1 et P2

- [ ] **AC5 : Vérifier .gitignore et prévention**
  - [ ] Confirmer que `.gitignore` contient `*.db` et `*.sqlite3`
  - [ ] Ajouter dans les Dev Notes du projet : « Les DS agents ne doivent pas utiliser `git add -A` ; utiliser `git add -A -- . ':!dev.db' ':!*.sqlite3'` ou ajouter les fichiers explicitement. »

- [ ] **AC6 : Test manuel du patch currentAdminApproved**
  - [ ] Démarrer le serveur de dev (`node node_modules/.bin/next dev --turbopack -p 3000`)
  - [ ] Créer ou utiliser une opportunité avec `requiresDoubleVerification = true` et montant > 50 000 €
  - [ ] En tant qu'admin A, cliquer « Vérifier » : vérifier que le compteur passe à 1/2, le bouton est désactivé pour A, le statut reste EN_COURS
  - [ ] En tant qu'admin B, cliquer « Vérifier » : vérifier que le deal passe à VERIFIED, l'email est envoyé
  - [ ] Documenter les résultats dans les Dev Notes de cette story

- [ ] **AC7 : Vérification build/tests**
  - [ ] Exécuter `./node_modules/.bin/prisma validate`
  - [ ] Exécuter `npx vitest run`
  - [ ] Exécuter `npm run build`

## Dev Notes

### Contexte critique — Items différés depuis Epic 1 et 2

Ces items ont été identifiés dans `deferred-work.md` et les rétrospectives Epic 1 et 2 :

1. **avatarUrl vs image** : Le schéma Prisma déclare `image String?` mais la migration initiale crée la colonne `avatarUrl`. Sans `@map("avatarUrl")`, les queries Prisma utilisent le nom de champ `image` mais la DB a la colonne `avatarUrl`. Cela fonctionne UNIQUEMENT parce que les données sont lues/écrites via `user.image` en Prisma qui mappe vers la colonne `avatarUrl` silencieusement (ou pas — c'est un bug latent). **Fix :** ajouter `@map("avatarUrl")` au champ `image` pour expliciter le mapping.

2. **Subscription.providerRef NOT NULL sans default** : Ce champ était NOT NULL dans le schéma original. Il a été rendu nullable (`String?`) à un moment non tracé par une migration explicite. Le schéma actuel est `String?` et les tests passent. **Fix :** vérifier la DB locale et créer une migration explicite si elle manque.

### Contexte critique — Guardrails Epic 3

3. **JSX `&&` composé** : Story 3.4 a introduit `{!isAuthor && !isAdmin ? <WhatsAppCTA /> : null}`. Next.js 16 strict rejette ce pattern car `&&` dans une position arithmétique JSX. Le CR patch a précalculé en `const shouldShowWhatsApp = !isAuthor && !isAdmin`. Ce pattern doit être documenté pour éviter la répétition.

4. **Upload security** : Story 3.2 a eu deux CR blockers sécurité : (a) métadonnées documents exposées aux non-auteurs sur la page détail, (b) completion endpoint faisant confiance aux clés R2 client. Les deux ont été patchés, mais les patterns doivent être documentés.

5. **git add -A et dev.db** : Story 3.3 DS a commité `dev.db`. Le `.gitignore` contient déjà `*.db`, mais `git add -A` contourne parfois les excludes. Prévention : documenter.

### Contexte critique — Patch Story 3.5

6. **currentAdminApproved** : Le patch optimiste dans `opportunity-kanban-board.tsx` perdait `currentAdminApproved` après la première validation. Le CR a patché avec `optimisticCurrentAdminApproved`. Ce patch doit être vérifié manuellement car le merge React optimiste est un pattern délicat.

### Architecture guardrails existants à respecter

- Prisma 7 : importer depuis `@/generated/prisma/client` via `src/lib/prisma.ts` (singleton), chemin absolu pour BetterSqlite3
- Auth.js v5 : `auth()` depuis `@/lib/auth` dans les routes API; JAMAIS Prisma/bcrypt dans `auth.config.ts` ou middleware Edge
- Next.js 16 strict : TOUJOURS `condition ? <Comp /> : null`, JAMAIS `condition && <Comp />`, y compris dans les conditions de ternaires
- API pattern : `NextResponse.json({ data })` succès, `{ error, code? }` erreur, messages français
- NFR-S8 : ne pas logger titres, descriptions, noms fichiers, URLs signées R2, notes de rejet

### Fichiers à modifier

- `prisma/schema.prisma` — ajouter `@map("avatarUrl")` au champ `image` du modèle User
- `prisma/migrations/` — potentiellement une migration vide (pour le `@map`) ou une migration `ALTER COLUMN` pour `providerRef`
- `_bmad-output/planning-artifacts/architecture.md` — ajouter guardrail JSX booléen composé et patterns sécurité upload

### Références

- `deferred-work.md` — items différés depuis Story 2.0
- Epic 2 retrospective `epic-2-retro-2026-05-15.md` — action items 1 et 2
- Epic 3 retrospective `epic-3-retro-2026-05-19.md` — action items 1-6
- Story 3.2 CR — findings P1 (metadata leak) et P2 (R2 key trust)
- Story 3.4 CR — finding JSX `&&` composé
- Story 3.5 CR — finding `currentAdminApproved` lost in optimistic merge
- `bmad-method-workflow` references : `nextjs16-project-guardrails.md`, `cr-document-upload-security-patterns.md`

## Dev Agent Record

### Agent Model Used

(À compléter par le dev agent)

### Completion Notes List

(À compléter par le dev agent)

### File List

(À compléter par le dev agent)

### Change Log

(À compléter par le dev agent)