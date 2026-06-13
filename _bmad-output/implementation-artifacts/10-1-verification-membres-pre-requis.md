# Story 10.1: Vérification membres — pré-requis automatiques et validation admin

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a membre IBC et administrateur,
I want que la vérification publique d'un membre soit conditionnée par des pré-requis automatiques clairs puis validée manuellement par un admin,
so that seuls les profils actifs, complets et à email vérifié apparaissent dans l'annuaire public `/members`.

## Acceptance Criteria

1. **Flux de vérification email utilisateur**
   - **Given** un membre authentifié avec `emailVerified = false`, **when** il déclenche `POST /api/auth/send-verification`, **then** le système crée un `VerificationToken` lié au membre, envoie un email avec un lien `/auth/verify-email?token=...`, et retourne un succès sans exposer le token dans les logs.
   - **Given** un token valide et non expiré, **when** la page `/auth/verify-email` appelle `POST /api/auth/verify-email`, **then** `user.emailVerified` passe à `true`, le token est supprimé et la transition automatique de vérification membre est évaluée.
   - **Given** un token absent, inconnu ou expiré, **when** `POST /api/auth/verify-email` est appelé, **then** la route retourne une erreur française claire (`400` ou `404`) sans modifier l'utilisateur.

2. **Logique centralisée des pré-requis**
   - **Given** un utilisateur, **when** `isEligibleForVerification(user)` est appelé, **then** il retourne l'éligibilité et les critères manquants selon : `emailVerified = true`, `bio`, `location`, `country` non vides, et `status = ACTIVE`.
   - **Given** un utilisateur `PENDING` qui remplit tous les pré-requis, **when** `autoTransitionVerificationStatus(userId)` est appelé, **then** son `verificationStatus` passe automatiquement à `EN_COURS`.
   - **Given** un utilisateur `VERIFIED` ou `REJECTED`, **when** les pré-requis changent ou la fonction auto-transition est appelée, **then** le statut ne rétrograde jamais vers `EN_COURS`.

3. **Validation admin protégée par pré-requis**
   - **Given** un admin actif (`role = ADMIN`, `status !== SUSPENDED`) sur `POST /api/admin/users/[id]/verify`, **when** il envoie `action=verify` pour un membre éligible, **then** le membre passe à `VERIFIED` et un audit log est créé pour le changement réel.
   - **Given** un membre auquel il manque au moins un pré-requis, **when** l'admin tente `action=verify`, **then** la route refuse la vérification (`400`/`409`) avec la liste des critères manquants et ne modifie pas `verificationStatus`.
   - **Given** `action=reject`, **when** l'admin rejette un membre, **then** le statut passe à `REJECTED` selon le comportement existant, sans exiger les pré-requis d'éligibilité.

4. **UI admin membres**
   - **Given** `/admin/members`, **when** la table s'affiche, **then** la colonne Vérification montre le badge de statut existant et des indicateurs pré-requis (email, profil, compte actif) pour chaque membre.
   - **Given** un membre non éligible, **when** l'admin voit les actions, **then** le bouton « Vérifier ✓ » est désactivé/grisé et une infobulle liste les critères manquants (ex. « Email non vérifié, Bio manquante, Localisation manquante »).
   - **Given** un membre éligible (`EN_COURS` ou `PENDING` avec critères complets), **when** l'admin consulte les actions, **then** « Vérifier ✓ » est actif.

5. **UI membre dans `/settings`**
   - **Given** un membre connecté, **when** il ouvre `/settings`, **then** il voit son statut : `PENDING` → « ⏳ En attente de vérification », `EN_COURS` → « 🔄 Vérification en cours — un admin validera bientôt votre profil », `VERIFIED` → « ✓ Membre vérifié », `REJECTED` → « ❌ Vérification rejetée ».
   - **Given** des pré-requis manquants, **when** `/settings` s'affiche, **then** la page liste précisément les éléments manquants : email non vérifié, bio manquante, localisation manquante, pays manquant, compte suspendu.
   - **Given** `emailVerified = false`, **when** le membre consulte `/settings`, **then** un bouton « Renvoyer l'email de vérification » appelle `POST /api/auth/send-verification` avec feedback de succès/erreur.

6. **Déclencheurs de transition automatique**
   - **Given** un membre met à jour son profil via `POST /api/user/profile`, **when** `bio`, `location` et `country` deviennent complets, **then** la route appelle `autoTransitionVerificationStatus()` après la persistance du profil.
   - **Given** un membre vérifie son email avec succès, **when** `emailVerified` passe à `true`, **then** la route appelle `autoTransitionVerificationStatus()` après la mise à jour DB.

7. **Tests et régressions**
   - **Given** les nouvelles routes, helpers et guards, **when** `npx vitest run` est exécuté, **then** les tests couvrent les succès, erreurs, guards admin, statut suspendu, pré-requis manquants et non-rétrogradation.
   - **Given** Next.js 16 strict JSX, **when** `npm run build` est exécuté, **then** le build passe sans `&&` dans le JSX ajouté/modifié.

## Tasks / Subtasks

- [ ] Créer la logique centralisée `src/lib/verification.ts` (AC: 2, 6, 7)
  - [ ] Exporter `isEligibleForVerification(user)` avec résultat explicite `{ eligible, missingPrerequisites }`.
  - [ ] Exporter `getVerificationPrerequisites(user)` ou équivalent pour alimenter les UI admin/settings sans duplication.
  - [ ] Exporter `autoTransitionVerificationStatus(userId)` : charge l'utilisateur, vérifie les pré-requis, met à jour uniquement `PENDING → EN_COURS`, retourne si un changement a eu lieu.
  - [ ] Ne jamais rétrograder `VERIFIED`/`REJECTED`; ne pas passer un compte `SUSPENDED` en `EN_COURS`.
  - [ ] Ajouter `src/lib/verification.test.ts` couvrant éligible, chaque critère manquant, chaînes vides/espaces, `PENDING → EN_COURS`, non-rétrogradation.

- [ ] Implémenter le flux email de vérification (AC: 1, 6, 7)
  - [ ] Créer `src/app/api/auth/send-verification/route.ts` : exige session, refuse utilisateur introuvable, no-op/succès clair si email déjà vérifié, crée un token aléatoire sécurisé, expire le token, envoie l'email.
  - [ ] Ajouter `sendEmailVerificationEmail()` dans `src/lib/email.ts` avec sujet/copie française et lien `${APP_URL}/auth/verify-email?token=...`.
  - [ ] Créer `src/app/api/auth/verify-email/route.ts` : valide le token, vérifie expiration, met `emailVerified = true`, supprime le token, appelle `autoTransitionVerificationStatus()`.
  - [ ] Créer `src/app/auth/verify-email/page.tsx` : page client ou server+client minimaliste qui lit `token`, appelle la route et affiche succès/erreur/action retour settings.
  - [ ] Option recommandée : appeler l'envoi automatique après signup email dans `src/app/api/auth/signup/route.ts`; si l'email échoue, ne pas annuler la création du compte sauf décision explicite, mais loguer une erreur sanitisée.
  - [ ] Tests : routes send/verify email, template email, token expiré/invalide, token supprimé, email déjà vérifié.

- [ ] Protéger la validation admin membre (AC: 3, 7)
  - [ ] Modifier `src/app/api/admin/users/[id]/verify/route.ts` pour refuser les admins suspendus (`status === SUSPENDED`).
  - [ ] Valider `action` explicitement : seuls `verify` et `reject` sont acceptés.
  - [ ] Pour `action=verify`, charger les champs pré-requis (`emailVerified`, `bio`, `location`, `country`, `status`, `verificationStatus`) et utiliser `isEligibleForVerification()`.
  - [ ] Retourner une erreur structurée avec `code` et `missingPrerequisites` si le membre n'est pas éligible.
  - [ ] Préserver l'audit log existant uniquement lorsque le statut change réellement; l'audit doit rester avant toute future side effect fallible.
  - [ ] Tests : non admin, admin suspendu, action invalide, utilisateur manquant, verify refusé si critères manquants, verify accepté si complet, reject accepté même incomplet, idempotence/audit.

- [ ] Mettre à jour `/admin/members` et `AdminMemberActions` (AC: 4, 7)
  - [ ] Dans `src/app/(admin)/admin/members/page.tsx`, sélectionner `emailVerified`, `bio`, `location`, `country` en plus des champs existants.
  - [ ] Calculer les pré-requis via `getVerificationPrerequisites()`/`isEligibleForVerification()` côté serveur et transmettre à `AdminMemberActions`.
  - [ ] Afficher dans la colonne Vérification des icônes/labels lisibles : email, profil, compte actif, avec couleur + texte (pas couleur seule).
  - [ ] Modifier `src/components/features/admin/admin-member-actions.tsx` : ajouter props `canVerifyMember`/`missingPrerequisites`, désactiver « Vérifier ✓ » si incomplet, encapsuler dans `Tooltip`/`TooltipTrigger`/`TooltipContent` existants.
  - [ ] Garder « Envoyer email de confirmation » inchangé : c'est l'email de confirmation d'abonnement, pas l'email de vérification d'adresse.
  - [ ] Tests component/page : props transmises, bouton désactivé, tooltip avec critères manquants, bouton actif si éligible, pas de régression self-suspend/email confirmation.

- [ ] Mettre à jour `/settings` côté membre (AC: 5, 7)
  - [ ] Modifier `src/app/(dashboard)/settings/page.tsx` pour afficher le statut exact `PENDING`, `EN_COURS`, `VERIFIED`, `REJECTED`.
  - [ ] Afficher la liste des pré-requis manquants via la même logique centralisée.
  - [ ] Ajouter un petit composant client (ex. `src/components/features/auth/resend-verification-button.tsx`) pour appeler `POST /api/auth/send-verification` et afficher feedback accessible (`role="status"`).
  - [ ] Supprimer/adapter le texte actuel « Réservé aux membres Boss » : la vérification membre concerne tous les membres visibles publiquement, pas uniquement Boss.
  - [ ] Tests page/composant : rendu des quatre statuts, missing prereqs, bouton resend seulement si email non vérifié, feedback succès/erreur.

- [ ] Appeler l'auto-transition après mise à jour profil (AC: 6, 7)
  - [ ] Modifier `src/app/api/user/profile/route.ts` après la transaction de mise à jour pour appeler `autoTransitionVerificationStatus(userId)`.
  - [ ] Si la transition se produit, retourner les données mises à jour cohérentes (`verificationStatus = EN_COURS`) ou documenter/recharger le profil pour éviter une réponse stale.
  - [ ] Tests : profil incomplet ne transitionne pas; profil complet + email vérifié transitionne; `VERIFIED`/`REJECTED` ne rétrograde pas.

- [ ] Exécuter la validation finale (AC: 7)
  - [ ] `cd /home/alphaperseii/projects/ibc && npx vitest run`
  - [ ] `cd /home/alphaperseii/projects/ibc && npm run build`

## Dev Notes

### Décision produit et périmètre

- La décision produit validée est l'**approche B : critères automatiques + validation admin**. Un membre apparaît publiquement dans `/members` uniquement si `verificationStatus = "VERIFIED"`. L'admin garde la validation finale, mais le bouton « Vérifier ✓ » doit être impossible à utiliser tant que l'email, le profil et le compte actif ne sont pas conformes. [Source: `_bmad-output/implementation-artifacts/member-verification-context.md`]
- Le statut `EN_COURS` signifie : « tous les pré-requis automatiques sont remplis, en attente de validation admin ». Transition automatique uniquement `PENDING → EN_COURS`. [Source: `member-verification-context.md`]
- Ne pas confondre deux emails : le bouton admin existant « Envoyer email de confirmation » envoie une **confirmation d'abonnement**, pas une vérification d'adresse email. [Source: `member-verification-context.md`; `src/app/api/admin/users/[id]/confirmation-email/route.ts`; `src/lib/email.ts`]

### Architecture / stack à respecter

- Stack en place : Next.js 16.2.6 App Router, React 19.2.4, Prisma 7.8.0, Auth.js v5 beta.31, TailwindCSS 4, nodemailer SMTP Infomaniak. [Source: `_bmad-output/planning-artifacts/architecture.md#Technology Versions`; `package.json`]
- Prisma client importé via `@/lib/prisma`; les enums `VerificationStatus` sont `PENDING`, `EN_COURS`, `VERIFIED`, `REJECTED`. Prisma 7 SQLite/dev valide les enums côté client seulement : ne pas compter sur la DB pour rattraper des strings invalides. [Source: `prisma/schema.prisma`; `member-verification-context.md`]
- Auth.js v5 : `NextAuth()` doit rester appelé avec un seul objet spread comme dans `src/lib/auth.ts`; ne pas modifier en signature à deux arguments. [Source: `src/lib/auth.ts`; `member-verification-context.md`]
- Next.js 16 guardrail : dans tout JSX ajouté/modifié, utiliser des ternaires `condition ? <JSX /> : null`; éviter `condition && <JSX />`, et pré-calculer les booléens composés avant le `return`. [Source: `_bmad-output/planning-artifacts/architecture.md#JSX Boolean Guardrail`]
- API routes : format attendu succès `{ data: T }` ou `{ success: true }`; erreurs `{ error, code?, details? }` en français; `try/catch` et logs sanitisés pour erreurs inattendues. [Source: `architecture.md#API & Communication Patterns`; routes existantes]

### État actuel des fichiers à modifier

- `src/app/api/admin/users/[id]/verify/route.ts` : vérifie session et rôle admin, mais **ne vérifie pas `admin.status`**, ne valide pas `action` explicitement, transforme toute action non `verify` en `REJECTED`, charge seulement `verificationStatus`, met à jour directement puis audite si changement. À corriger pour ajouter pré-requis et guards sans casser l'audit idempotent. [Source: fichier lu]
- `src/components/features/admin/admin-member-actions.tsx` : composant client avec boutons suspend/re-activate, confirmation abonnement, verify/reject. `canVerify` est aujourd'hui basé seulement sur `verificationStatus` (`PENDING|EN_COURS|REJECTED`) et `isPending`; aucune notion de pré-requis. Il existe un composant `Tooltip` dans `src/components/ui/tooltip.tsx` déjà utilisé par `whatsapp-cta`. [Source: fichiers lus]
- `src/app/(admin)/admin/members/page.tsx` : table admin sélectionne actuellement `id,image,name,email,tier,status,verificationStatus,createdAt,subscriptions`; il faut ajouter les champs de pré-requis et afficher des indicateurs. Les tests existants mockent `AdminMemberActions`, il faudra mettre à jour les fixtures avec `verificationStatus` et nouveaux champs. [Source: fichier et test lus]
- `src/app/(dashboard)/settings/page.tsx` : section vérification actuelle est orientée « identité / Boss » et ne liste pas les pré-requis. Elle doit être remplacée par une information de vérification membre pour tous les membres. [Source: fichier lu]
- `src/app/api/user/profile/route.ts` : met à jour profil et tags dans transaction puis retourne `updatedUser`; il faut appeler auto-transition après persistance et éviter une réponse stale si le statut passe `EN_COURS`. [Source: fichier et test lus]
- `src/lib/email.ts` : utilise nodemailer, `APP_URL` pour liens dashboard/opportunity, `_resetTransporter()` pour tests. Ajouter le template de vérification en gardant les tests isolables. [Source: fichier et `src/lib/email.test.ts`]
- `src/app/api/auth/signup/route.ts` : crée l'utilisateur credentials avec `emailVerified=false` par défaut; aucun email de vérification envoyé aujourd'hui. Si l'envoi automatique est ajouté, ne pas exposer le token et traiter l'échec email sans fuite de secret. [Source: fichier lu]

### Modèle de données pertinent

- `User`: `email`, `name`, `bio?`, `location?`, `country?`, `status`, `verificationStatus`, `emailVerified`, relation `verificationTokens`. [Source: `prisma/schema.prisma`]
- `VerificationToken`: `identifier @id @default(cuid())`, `token @unique`, `expires`, `userId?`, `createdAt`, relation optionnelle User, `@@unique([identifier, token])`. Pour cette story, utiliser `token` pour le lien et idéalement `identifier = user.email` ou une valeur stable liée à l'utilisateur. [Source: `prisma/schema.prisma`]
- Aucun changement de schema n'est requis pour cette story.

### Implémentation recommandée pour `src/lib/verification.ts`

```ts
type VerificationUser = {
  emailVerified: boolean;
  bio: string | null;
  location: string | null;
  country: string | null;
  status: "ACTIVE" | "SUSPENDED";
  verificationStatus: "PENDING" | "EN_COURS" | "VERIFIED" | "REJECTED";
};

export function isEligibleForVerification(user: VerificationUser) {
  const missing = getMissingVerificationPrerequisites(user);
  return { eligible: missing.length === 0, missingPrerequisites: missing };
}
```

- Utiliser `trim()` pour `bio`, `location`, `country`; `"   "` doit compter comme manquant.
- Les libellés manquants doivent être réutilisables par API et UI (codes stables + labels français), par exemple `EMAIL_UNVERIFIED`, `BIO_MISSING`, `LOCATION_MISSING`, `COUNTRY_MISSING`, `ACCOUNT_SUSPENDED`.
- `autoTransitionVerificationStatus(userId)` doit faire une mise à jour conditionnelle seulement si le statut lu est `PENDING` et l'éligibilité vraie. Retourner `{ changed: boolean, status }` ou équivalent pour les routes.

### Sécurité et effets de bord

- Les routes `POST /api/auth/send-verification` et `/api/auth/verify-email` doivent éviter de logger le token brut. En cas d'erreur email, utiliser `sanitizeError` comme les routes existantes.
- Le token doit être généré avec une source cryptographique (`crypto.randomBytes` ou Web Crypto), stocké en DB, et expirer (ex. 24h). Si un nouveau token est envoyé, supprimer les anciens tokens de même `userId`/`identifier` pour éviter les confusions.
- Pour les audits admin, conserver la règle existante et les guardrails BMAD : auditer les changements réels, et si une future side effect fallible est ajoutée, l'audit doit précéder cette side effect. [Source: `confirmation-email` tests; contexte BMAD]
- Admin route groups/API doivent vérifier que l'admin n'est pas suspendu (`status !== SUSPENDED`), comme déjà fait dans la route status et confirmation-email. [Source: tests lus]

### UX / accessibilité

- UI en français, texte non technique, diacritiques corrects. [Source: PRD/UX]
- Boutons : cible tactile min. `min-h-11` déjà utilisée; état disabled doit expliquer pourquoi via tooltip ou texte inline. [Source: UX spec §12.1]
- Indicateurs de pré-requis : ne pas utiliser la couleur seule. Ajouter icône/texte (`✓ Email`, `✗ Email non vérifié`, etc.) et conserver contraste lisible. [Source: UX spec §13.3]
- `/settings` doit proposer un prochain pas clair : compléter profil, vérifier email, attendre admin, ou contacter support si rejeté (si lien support existant; sinon texte clair).

### Tests attendus

- Ajouter/mettre à jour au minimum :
  - `src/lib/verification.test.ts`
  - `src/app/api/auth/send-verification/route.test.ts`
  - `src/app/api/auth/verify-email/route.test.ts`
  - `src/app/auth/verify-email/page.test.tsx` ou test du composant client associé
  - `src/app/api/admin/users/[id]/verify/route.test.ts` (nouveau si absent)
  - `src/components/features/admin/admin-member-actions.test.tsx` (si absent) ou couverture via page
  - `src/app/(admin)/admin/members/page.test.tsx`
  - `src/app/(dashboard)/settings/page.test.tsx`
  - `src/app/api/user/profile/route.test.ts`
  - `src/lib/email.test.ts`
- Chaque nouveau guard conditionnel doit avoir un test : admin suspendu, action invalide, pré-requis manquants, token expiré, token invalide, email déjà vérifié, non-rétrogradation.

### Références

- [Source: `_bmad-output/implementation-artifacts/member-verification-context.md`] Décision produit, état actuel, fichiers à créer/modifier, pièges connus.
- [Source: `_bmad-output/planning-artifacts/architecture.md`] Stack, structure, API patterns, guardrails JSX, Auth.js/Prisma.
- [Source: `_bmad-output/planning-artifacts/prd.md`] FR3, FR7, NFR-S5, NFR-S8, NFR-S9, accessibilité.
- [Source: `_bmad-output/planning-artifacts/ux-spec.md`] Disabled state + tooltip, mobile-first, accessibilité, feedback patterns.
- [Source: `prisma/schema.prisma`] Champs `User`, enum `VerificationStatus`, modèle `VerificationToken`.
- [Source: `src/app/api/admin/users/[id]/verify/route.ts`] État actuel de la validation admin membre.
- [Source: `src/components/features/admin/admin-member-actions.tsx`] Actions admin existantes.
- [Source: `src/app/(admin)/admin/members/page.tsx`] Table admin membres existante.
- [Source: `src/app/(dashboard)/settings/page.tsx`] Section vérification à remplacer.
- [Source: `src/app/api/user/profile/route.ts`] Point d'intégration auto-transition profil.
- [Source: `src/lib/email.ts`] Patterns email SMTP et tests.

## Project Structure Notes

- Respecter les emplacements imposés : nouvelles API sous `src/app/api/auth/**/route.ts`, page sous `src/app/auth/verify-email/page.tsx`, logique métier sous `src/lib/verification.ts`.
- Préférer un petit composant client dédié pour le bouton de renvoi d'email plutôt que transformer toute la page settings en client component.
- Ne pas créer de nouveau système d'email ou provider : étendre `src/lib/email.ts` (nodemailer/Infomaniak actuellement en production code).
- Ne pas modifier le filtre public `/members` : il filtre déjà `verificationStatus: "VERIFIED"`, ce qui est la règle produit.

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List

- À créer : `src/lib/verification.ts`
- À créer : `src/app/api/auth/send-verification/route.ts`
- À créer : `src/app/api/auth/verify-email/route.ts`
- À créer : `src/app/auth/verify-email/page.tsx`
- À modifier : `src/lib/email.ts`
- À modifier : `src/app/api/auth/signup/route.ts` (si envoi automatique à l'inscription retenu)
- À modifier : `src/app/api/admin/users/[id]/verify/route.ts`
- À modifier : `src/components/features/admin/admin-member-actions.tsx`
- À modifier : `src/app/(admin)/admin/members/page.tsx`
- À modifier : `src/app/(dashboard)/settings/page.tsx`
- À modifier : `src/app/api/user/profile/route.ts`
- Tests à créer/modifier selon la section Tests attendus.
