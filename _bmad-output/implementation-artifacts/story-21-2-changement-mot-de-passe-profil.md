---
baseline_commit: 9b338c06aea9846d43c3b211e7d94d192a32cf0e
---
# Story 21.2 : Changement de mot de passe dans le profil

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**En tant que** membre connecté à l'application avec un compte credentials,
**Je veux** pouvoir changer mon mot de passe depuis mon profil,
**Afin de** maintenir la sécurité de mon compte et le mettre à jour lorsque c'est nécessaire.

## Contexte

Cette story est la deuxième de l'**Epic 21 : Gestion des mots de passe**. Elle fait suite à la Story 21.1 (Mot de passe oublié) et s'adresse aux utilisateurs déjà connectés. Elle implémente une section « Sécurité » dans l'édition du profil permettant de modifier le mot de passe après avoir validé le mot de passe actuel de l'utilisateur.

**Sources :** [sprint-change-proposal-2026-07-01-password-management.md](../planning-artifacts/sprint-change-proposal-2026-07-01-password-management.md), [epics.md](../planning-artifacts/epics.md), [prd.md](../planning-artifacts/prd.md), [architecture.md](../planning-artifacts/architecture.md), [ux-spec.md](../planning-artifacts/ux-spec.md).

## Acceptance Criteria

### AC1 — Section Sécurité dans le profil (Compte Credentials)

**Given** un utilisateur connecté qui s'est inscrit via credentials (possédant un `passwordHash` en base)
**When** il se rend sur la page `/profile`
**Then** il voit une section « Sécurité » (ou « Changement de mot de passe ») avec un formulaire contenant :
- Un champ pour le mot de passe actuel (type password, masqué par défaut)
- Un champ pour le nouveau mot de passe (type password, masqué par défaut)
- Un champ pour la confirmation du nouveau mot de passe (type password, masqué par défaut)
- Un bouton « Mettre à jour le mot de passe »

### AC2 — Indicateur de force du nouveau mot de passe

**Given** l'utilisateur saisit son nouveau mot de passe
**When** il tape dans le champ « Nouveau mot de passe »
**Then** un indicateur textuel et de couleur affiche la force du mot de passe en temps réel (« Faible » en rouge, « Moyen » en orange, « Fort » en vert), identique à la logique utilisée lors de l'inscription (signup).

### AC3 — Cas des utilisateurs Google OAuth (Sans mot de passe local)

**Given** un utilisateur connecté via Google OAuth (dont le champ `passwordHash` est `null` en base)
**When** il se rend sur la page `/profile`
**Then** le formulaire de changement de mot de passe n'est pas affiché
**And** un message explicite s'affiche à la place dans la section Sécurité : « Votre compte est connecté via Google. Aucun mot de passe local n'est configuré pour ce compte. » (avec un style ou un badge Google premium).

### AC4 — Validation côté client & validations Zod

**Given** l'utilisateur interagit avec le formulaire de changement de mot de passe
**When** il saisit des données non valides (ex. nouveau mot de passe < 8 caractères ou confirmation ne correspondant pas)
**Then** les erreurs de validation s'affichent de manière inline en temps réel ou lors du blur :
- « Le mot de passe actuel est requis »
- « Le nouveau mot de passe doit contenir au moins 8 caractères »
- « Les nouveaux mots de passe ne correspondent pas »
**And** la soumission du formulaire est bloquée tant que les erreurs persistent.

### AC5 — Soumission réussie

**Given** le formulaire rempli avec des données valides (mot de passe actuel correct, nouveau mot de passe valide et confirmé)
**When** l'utilisateur soumet le formulaire
**Then** le système :
1. Envoie une requête `POST /api/user/password`
2. Valide le mot de passe actuel avec bcryptjs en base
3. Met à jour le `passwordHash` de l'utilisateur avec la nouvelle valeur hachée (bcryptjs, coût 12)
4. Affiche un toast de succès : « Mot de passe mis à jour avec succès. »
5. Réinitialise le formulaire de changement de mot de passe (champs vides).

### AC6 — Échec de la soumission : Mot de passe actuel incorrect

**Given** l'utilisateur saisit un mot de passe actuel incorrect
**When** il soumet le formulaire
**Then** la requête échoue avec un code 400
**And** un toast d'erreur s'affiche : « Le mot de passe actuel est incorrect. »
**And** aucun mot de passe n'est modifié en base.

### AC7 — Protection de la route API

**Given** un visiteur non authentifié (pas de session active)
**When** il tente d'appeler `POST /api/user/password`
**Then** l'API renvoie un statut 401 avec l'erreur « Non autorisé ».

### AC8 — Pas de régression build/tests

**Given** le code modifié
**When** `npm run build` et `npx vitest run` sont exécutés
**Then** le build passe sans erreur et tous les tests existants et nouveaux passent avec succès.

## Tasks / Subtasks

- [x] **Task 1 — Validations Zod (AC4)**
  - [x] 1.1 Ajouter le schéma `passwordChangeSchema` dans `src/lib/validations.ts`
  - [x] 1.2 Le schéma doit valider :
    - `currentPassword` : chaîne non vide
    - `newPassword` : chaîne de min 8 caractères
    - `confirmNewPassword` : chaîne non vide
  - [x] 1.3 Utiliser `refine` pour s'assurer que `newPassword === confirmNewPassword`
  - [x] 1.4 Exporter le type `PasswordChangeInput`

- [x] **Task 2 — API Route de changement de mot de passe (AC5/AC6/AC7)**
  - [x] 2.1 Créer le dossier et le fichier `src/app/api/user/password/route.ts`
  - [x] 2.2 Vérifier l'authentification avec `auth()` de `@/lib/auth`. Retourner 401 si non autorisé
  - [x] 2.3 Valider le corps de la requête avec `passwordChangeSchema`
  - [x] 2.4 Récupérer l'utilisateur courant en base avec son `passwordHash`
  - [x] 2.5 Si l'utilisateur n'a pas de `passwordHash` (compte Google) -> retourner 400 « Ce compte utilise la connexion Google. »
  - [x] 2.6 Comparer `currentPassword` et `passwordHash` avec `bcrypt.compare` (bcryptjs). Si incorrect -> retourner 400 « Le mot de passe actuel est incorrect. »
  - [x] 2.7 Hacher le nouveau mot de passe avec `bcrypt.hash` (bcryptjs, coût 12) et mettre à jour le document `User`
  - [x] 2.8 Logger les erreurs avec `sanitizeError()` de `src/lib/sanitize-log.ts`

- [x] **Task 3 — Modification de la page profil du serveur (AC1/AC3)**
  - [x] 3.1 Modifier `src/app/(dashboard)/profile/page.tsx` pour inclure `passwordHash` dans les champs sélectionnés de la requête Prisma du profil utilisateur
  - [x] 3.2 Déterminer la valeur booléenne `hasPassword = !!user.passwordHash`
  - [x] 3.3 Transmettre cette information au composant client `ProfileEditForm` sans exposer le mot de passe haché (ex: ajouter `hasPassword` dans les propriétés de l'objet utilisateur passé)

- [x] **Task 4 — UI : Intégration du formulaire de mot de passe (AC1/AC2/AC3/AC4/AC5/AC6)**
  - [x] 4.1 Dans `src/components/features/auth/profile-edit-form.tsx`, modifier l'interface `ProfileEditFormProps` pour ajouter `hasPassword?: boolean` dans la définition de l'utilisateur
  - [x] 4.2 Ajouter un deuxième formulaire indépendant (avec son propre `useForm`) pour la gestion du mot de passe. **Raison** : Séparer la soumission du profil général de celle du mot de passe pour éviter de forcer l'utilisateur à saisir ses mots de passe lors d'une simple modification de bio/téléphone
  - [x] 4.3 Sous le formulaire existant, ajouter un `Separator` puis une section « Sécurité »
  - [x] 4.4 Si `user.hasPassword` est faux : afficher un composant informatif premium signalant la connexion Google (avec une icône Google ou un style soigné)
  - [x] 4.5 Si `user.hasPassword` est vrai : afficher le formulaire avec les champs `currentPassword`, `newPassword` et `confirmNewPassword`
  - [x] 4.6 Implémenter l'indicateur de force du nouveau mot de passe en temps réel à l'aide de la fonction `getPasswordStrength` (dupliquer ou extraire la logique utilisée dans la page de signup pour assurer la cohérence)
  - [x] 4.7 Connecter la soumission au point de terminaison `POST /api/user/password`. En cas de succès : vider les champs du formulaire, afficher un toast de succès. En cas d'erreur Zod ou d'erreur API (400) : afficher les messages appropriés.

- [x] **Task 5 — Tests Unitaires & d'Intégration (AC8)**
  - [x] 5.1 Créer `src/app/api/user/password/route.test.ts`
    - Tester les cas nominaux de succès
    - Tester le cas mot de passe actuel incorrect (400)
    - Tester le cas utilisateur non authentifié (401)
    - Tester le cas utilisateur OAuth sans mot de passe local (400)
    - Tester la validation Zod
  - [x] 5.2 Mettre à jour `src/components/features/auth/profile-edit-form.test.tsx`
    - Tester le rendu de la section Sécurité pour un utilisateur classique (champs présents)
    - Tester le rendu du message Google pour un utilisateur sans mot de passe
    - Tester la validation des champs (mots de passe différents, longueur insuffisante)
    - Tester l'appel API de changement de mot de passe et l'affichage du toast de succès
  - [x] 5.3 Exécuter le build et les tests (`npm run build` et `npx vitest run`) pour s'assurer que tout passe sans régression.

## Dev Notes

### Architecture & patterns à suivre

- **Runtime API :** Route handlers Next.js App Router (`route.ts`) sous `src/app/api/user/...`.
- **Session & Auth :** Utiliser `auth()` depuis `@/lib/auth` pour valider l'identité de l'utilisateur connecté.
- **Formulaires multiples :** Utilisez deux instances distinctes de `useForm` de `react-hook-form` au sein du fichier `profile-edit-form.tsx` (ou extrayez la section de changement de mot de passe dans un sous-composant `PasswordChangeForm` dédié, ce qui est recommandé pour la lisibilité).
- **Indicateur de force :** La force du mot de passe doit suivre les critères de la story 21.1 :
  - `< 8 caractères` -> Faible (Rouge)
  - `≥ 8 caractères` mais pas de combinaison complète -> Moyen (Orange)
  - `≥ 12 caractères` + lettres + chiffres + symboles -> Fort (Vert)
- **Sanitisation :** Utiliser `sanitizeError()` pour tous les logs d'erreurs en mode serveur afin d'éviter la fuite de secrets ou de données sensibles.
- **JSX boolean guardrail (Next.js 16 strict) :** Ne pas utiliser `&&` dans le JSX pour l'affichage conditionnel de variables potentiellement vides/numériques. Privilégier les expressions ternaires ou des booléens pré-calculés.
- **Styling :** Utiliser les composants UI shadcn existants (`Input`, `Label`, `Button`, `Card`, etc.) pour maintenir le style premium et la cohérence avec le reste du profil.

### Fichiers à créer / modifier

**Nouveaux fichiers :**
- `src/app/api/user/password/route.ts`
- `src/app/api/user/password/route.test.ts`

**Fichiers à modifier :**
- `src/lib/validations.ts` — ajouter `passwordChangeSchema`
- `src/app/(dashboard)/profile/page.tsx` — sélectionner `passwordHash` et transmettre `hasPassword`
- `src/components/features/auth/profile-edit-form.tsx` — ajouter l'UI de changement de mot de passe / message Google
- `src/components/features/auth/profile-edit-form.test.tsx` — ajouter les tests de l'UI correspondants

## Project Structure Reference

- Pages du tableau de bord : `src/app/(dashboard)/...`
- Composants de fonctionnalités : `src/components/features/...`
- Utilitaires et validations : `src/lib/...`
- Modèles de données : `prisma/schema.prisma`

## References

- [PRD §8.1 / FR78, §9.2 / NFR-S12](../planning-artifacts/prd.md)
- [Sprint Change Proposal — Gestion des Mots de Passe](../planning-artifacts/sprint-change-proposal-2026-07-01-password-management.md)
- [Story 21.1 : Mot de passe oublié (Patterns de token, bcryptjs et tests)](./story-21-1-mot-de-passe-oublie.md)
- [Architecture & UX Specifications](../planning-artifacts/architecture.md) / [ux-spec.md](../planning-artifacts/ux-spec.md)
- Code de référence : `src/app/api/auth/reset-password/route.ts`, `src/app/auth/signup/page.tsx`, `src/components/features/auth/profile-edit-form.tsx`

## Previous Story Intelligence

- La Story 21-1 a été implémentée avec succès (forgot-password, reset-password, token model). Elle a mis en place le hachage bcryptjs de coût **12** pour les mots de passe.
- Les tests unitaires de routes et de pages ont été ajoutés et validés par le processus de Code Review. Le build Next.js passe sans avertissement.

## Git Intelligence Summary

Derniers commits en rapport avec l'authentification et le mot de passe :
- `9b338c0` — chore(bmad): mark story 21-1 done — review PASS
- `fc7837a` — feat(21-1): forgot-password and reset-password flow
- `8cff28f` — chore(bmad): create story 21-1-mot-de-passe-oublie

## Latest Technical Information

- Stack technique inchangée : Next.js 16.2.6, React 19.2.4, Prisma 7.8.0, Auth.js 5.0.0-beta.31, bcryptjs 3.0.3, Zod 4.4.3.
- Utilisation recommandée de `bcryptjs` (et non de `bcrypt` natif) pour le hachage.

## Dev Agent Record

### Agent Model Used

Gemini 3.5 Flash (High)

### Debug Log References

- Résolution de la collision de sélecteurs de tests dans profile-edit-form.test.tsx par l'utilisation d'expressions régulières strictes (^...$).
- Validation réussie des tests unitaires d'API et UI via Vitest.
- Compilation de production Next.js finalisée sans avertissements ni erreurs.

### Completion Notes List

- Implémentation du schéma de validation `passwordChangeSchema` dans `src/lib/validations.ts`.
- Création de la route API `POST /api/user/password` sécurisée avec vérification de la session utilisateur, comparaison bcryptjs du mot de passe actuel (coût 12) et hachage du nouveau mot de passe.
- Modification du point d'entrée serveur `src/app/(dashboard)/profile/page.tsx` pour inclure `passwordHash` et transmettre de manière sécurisée le booléen `hasPassword` au formulaire client sans exposer le mot de passe haché.
- Ajout d'une section de sécurité dans `ProfileEditForm` avec un formulaire indépendant de changement de mot de passe, un indicateur de force temps réel réutilisant la logique du signup, et un message d'avertissement stylisé pour les comptes liés via Google OAuth.
- Ajout d'une suite complète de tests Vitest couvrant tous les cas d'utilisation API et composants UI (100% de réussite).

### File List

- À créer : `src/app/api/user/password/route.ts`
- À créer : `src/app/api/user/password/route.test.ts`
- À modifier : `src/lib/validations.ts`
- À modifier : `src/app/(dashboard)/profile/page.tsx`
- À modifier : `src/components/features/auth/profile-edit-form.tsx`
- À modifier : `src/components/features/auth/profile-edit-form.test.tsx`

## Story Completion Status

- Status: **review**
- Note: Ultimate context engine analysis completed - comprehensive developer guide created.
