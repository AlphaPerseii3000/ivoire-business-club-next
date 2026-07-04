---
story_key: 25-4-inscription-paiement-event
epic: epic-25
title: Inscription + paiement event (virement + mobile money + pay-on-site)
status: review
created_at: 2026-07-04
baseline_commit: 0a22f091d1297b429861bbd47daceebf813e6bb6
---

# Story 25.4 : Inscription + paiement event (virement + mobile money + pay-on-site)

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**En tant qu'** utilisateur (membre ou visiteur pour les événements publics),
**Je veux** m'inscrire à un événement et payer selon mon mode de paiement préféré,
**Afin de** réserver ma place et recevoir une confirmation.

## Contexte

La Story 25-4 est la **quatrième story de l'Epic 25 : Plateforme d'Événements — Couverture, Visibilité, Tarification & Galerie**. Elle dépend directement des stories 25-1 (schéma Prisma étendu), 25-2 (upload de couverture) et 25-3 (page publique d'événements).

**Cette story est un DELTA fonctionnel majeur** : elle introduit le système d'inscription aux événements, la gestion de la capacité en temps réel, l'intégration des paiements par virement, mobile money (Wave/Orange Money) et paiement sur place, ainsi que l'interface d'administration pour lister et filtrer les inscrits.

**Sources :**
- [Sprint Change Proposal — Epic 25 (2026-07-04)](file:///d:/Code/ivoire-business-club-next/_bmad-output/planning-artifacts/sprint-change-proposal-2026-07-04.md) §1.2, §4.3, §4.5, Story 25-4
- [Story 25-3 — Page event publique avec teaser privé](./25-3-page-event-publique-teaser-prive-places.md)
- [Architecture Decision Document](../planning-artifacts/architecture.md) §API Patterns, §Frontend Architecture, §Auth Architecture
- Code existant : `src/app/(public)/events/[slug]/page.tsx`, `src/lib/event-utils.ts`, `prisma/schema.prisma`

## Acceptance Criteria

### AC1 — Formulaire d'inscription pour membre connecté (Événement PUBLIC ou PRIVÉ)

**Given** un membre connecté sur la page d'un événement PUBLIC ou PRIVÉ avec des places disponibles
**When** il clique sur le bouton « S'inscrire »
**Then** un formulaire d'inscription s'affiche dans un Dialog/Modal (Shadcn/BaseUI) contenant :
- Ses informations de profil préremplies et non éditables (Nom, Email)
- Son tarif spécifique calculé en fonction de son tier (`AFFRANCHI`, `GRAND_FRERE` ou `BOSS`) en FCFA
- Un sélecteur de mode de paiement : Virement bancaire, Wave, Orange Money, ou Paiement sur place

### AC2 — Inscription pour visiteur non connecté (Événement PUBLIC)

**Given** un visiteur non connecté sur la page d'un événement PUBLIC avec des places disponibles
**When** il clique sur le bouton « S'inscrire »
**Then** il doit saisir obligatoirement son email dans le formulaire et choisir son mode de paiement (au tarif « Visiteur »)

### AC3 — Option « Payer sur place » avec avertissement

**Given** un utilisateur (membre ou visiteur) remplissant le formulaire d'inscription
**When** il choisit l'option « Payer sur place » et soumet le formulaire
**Then** un avertissement clair s'affiche : *« Attention : les places ne sont pas garanties pour le paiement sur place. Pré-inscrivez-vous pour réserver votre place. »*
**And** l'enregistrement `EventRegistration` est créé en base avec `payOnSite: true` et `amountPaid: null`

### AC4 — Option « Virement » ou « Mobile Money » (Création Payment)

**Given** un membre connecté choisissant Virement bancaire, Wave ou Orange Money
**When** il valide son inscription
**Then** le système crée dans une transaction Prisma unique :
- Un enregistrement `EventRegistration` avec `status: REGISTERED` et `amountPaid` correspondant au tarif de son tier
- Un enregistrement `Payment` avec `userId: session.user.id`, `amount: tarif`, `currency: XOF`, `provider: provider`, `status: pending` et `providerRef: EVT-[eventId]-[userId]`
**And** affiche un message de confirmation avec les instructions de paiement.

**Given** un visiteur non connecté choisissant Virement ou Mobile Money
**When** il valide son inscription
**Then** le système crée uniquement l'enregistrement `EventRegistration` avec `userId: null`, `email: inputEmail`, `status: REGISTERED`, `amountPaid: visitorPrice` et `payOnSite: false` (sans créer de ligne `Payment` en raison de la contrainte de clé étrangère `Payment.userId` non nulle en base)
**And** affiche les instructions de paiement.

### AC5 — Gestion de la capacité maximale (Complet)

**Given** un événement dont la capacité maximale (`maxCapacity`) est atteinte (nombre d'inscriptions avec `status = REGISTERED` égal ou supérieur à `maxCapacity`)
**When** un utilisateur consulte la page de l'événement
**Then** le bouton « S'inscrire » est désactivé et affiche « Complet »
**And** si une requête API directe `POST /api/events/[id]/register` est envoyée pour cet événement, elle échoue avec une erreur `400` ("L'événement est complet").

### AC6 — Contraintes d'unicité d'inscription

**Given** un utilisateur (membre avec `userId` ou visiteur avec `email`) déjà inscrit à un événement
**When** il tente de s'inscrire à nouveau (ou soumet une requête API `POST`)
**Then** le système bloque l'inscription et renvoie une erreur *« Vous êtes déjà inscrit à cet événement »* (grâce aux contraintes uniques `eventId_userId` ou `eventId_email`).

### AC7 — Suivi des inscriptions côté Admin

**Given** l'admin sur la page `/admin/events/[id]/registrations`
**When** il consulte la liste des inscrits
**Then** il voit un tableau listant :
- Le profil de l'inscrit (Nom/Email ou Email de visiteur)
- Son tier au moment de l'inscription (Snapshot)
- Le mode de paiement et montant
- Le statut de l'inscription (`REGISTERED`, `ATTENDED`, `CANCELLED`, `NO_SHOW`)
- La date d'inscription
**And** l'admin peut filtrer les inscriptions par statut et modifier le statut de chaque inscription (ex: marquer comme Présent (`ATTENDED`)).

### AC8 — Build et Tests Verts

**Given** les tests unitaires et le build
**When** `npm run build` et `npx vitest run` sont exécutés
**Then** tout passe avec succès.

---

## Tasks / Subtasks

- [x] **Task 1 — Schémas de validation & API d'inscription publique (AC1, AC2, AC3, AC4, AC5, AC6)**
  - [x] 1.1 Ajouter la validation Zod `eventRegistrationSchema` dans `src/lib/validations.ts` pour valider : `email` (optionnel/requis selon auth), `payOnSite` (boolean), `provider` (enum PaymentProvider optionnel), `providerPhone` (string optionnelle).
  - [x] 1.2 Créer le fichier `src/app/api/events/[id]/register/route.ts` (API publique d'inscription) :
    - Récupérer et `await` le paramètre `id` (asynchrone avec Next.js 16).
    - Appeler `auth()` pour vérifier si l'utilisateur est connecté et obtenir ses infos (tier, id, email).
    - Valider le body via `eventRegistrationSchema`.
    - Gérer la logique dans un `prisma.$transaction` :
      - Vérifier que l'événement existe, est `PUBLISHED`, et récupérer sa grille tarifaire et sa capacité.
      - Si `maxCapacity` est défini, compter les inscriptions existantes avec `status: REGISTERED`. Si `count >= maxCapacity`, lever une erreur "Complet".
      - Vérifier l'unicité : si une inscription existe déjà pour ce `eventId` + `userId` (membre) ou `eventId` + `email` (visiteur), lever une erreur "Déjà inscrit".
      - Créer l'enregistrement `EventRegistration` avec `tierSnapshot` (ou `AFFRANCHI` par défaut si visiteur), `amountPaid` (prix du tier ou 0 si gratuit ou null si `payOnSite`), et `payOnSite`.
      - Si l'utilisateur est connecté ET que le montant est supérieur à 0 ET que `payOnSite` est faux : créer un enregistrement `Payment` associé.
    - Envoyer un événement PostHog `event_register` pour analytics.
    - Retourner un statut `201` sur succès.
  - [x] 1.3 Créer les tests unitaires associés dans `src/app/api/events/[id]/register/route.test.ts` (mocking prisma, tests de capacité, d'unicité, de paiement).

- [x] **Task 2 — Composant client d'inscription `EventRegisterButton` (AC1, AC2, AC3, AC5, AC6)**
  - [x] 2.1 Créer `src/components/features/events/EventRegisterButton.tsx` ("use client") :
    - Recevoir les props : `eventId`, `eventTitle`, `eventDate`, `userTier`, `userEmail`, `pricing`, `remainingSpots`, `isAlreadyRegistered`.
    - Rendre le bouton principal « S'inscrire ». Si `remainingSpots <= 0` (et `maxCapacity !== null`), désactiver le bouton et afficher « Complet ».
    - Si `isAlreadyRegistered` est vrai, désactiver le bouton et afficher « Déjà inscrit ».
    - Au clic, ouvrir le composant modal `Dialog` (de `src/components/ui/dialog.tsx`).
    - Dans la modale, afficher :
      - Pour les membres : Nom et Email (lecture seule), Tier actuel, Tarif calculé.
      - Pour les visiteurs : un champ input d'email requis.
      - Un sélecteur radio/select pour le mode de paiement (Virement, Wave, Orange Money, Sur place).
      - Si l'option « Sur place » est choisie, afficher un message d'avertissement jaune visible (AC3).
    - Gérer la soumission du formulaire vers `/api/events/[id]/register` avec un état de chargement.
    - Afficher des toasts de succès ("Inscription confirmée !") ou d'erreur ("Erreur : ...") via `sonner`.
    - Rafraîchir les données via `router.refresh()` en cas de succès.

- [x] **Task 3 — Intégration dans la page de détail `/events/[slug]/page.tsx` (AC5, AC6)**
  - [x] 3.1 Mettre à jour `src/app/(public)/events/[slug]/page.tsx` :
    - Récupérer la session utilisateur via `auth()`.
    - Vérifier si l'utilisateur est déjà inscrit en faisant une requête Prisma rapide dans le composant Server : `prisma.eventRegistration.findUnique` sur la clé composée `eventId_userId` (si authentifié).
    - Remplacer le bouton « S'inscrire » statique par `<EventRegisterButton ... />`.
    - Passer les props calculées : `eventId={event.id}`, `eventTitle={event.title}`, `eventDate={startDateFormatted}`, `userTier={userTier}`, `userEmail={session?.user?.email}`, `pricing={pricing}`, `remainingSpots={remainingSpots}`, `isAlreadyRegistered={isAlreadyRegistered}`.

- [x] **Task 4 — API Admin : Liste et modification des inscriptions (AC7)**
  - [x] 4.1 Créer la route `GET /api/admin/events/[id]/registrations/route.ts` :
    - Restreindre l'accès aux administrateurs (vérifier la session via `auth()` et le rôle `ADMIN`).
    - Récupérer la liste des inscriptions pour l'événement spécifié avec les détails de l'utilisateur (avatar, nom).
    - Prendre en charge les filtres (par statut) et le tri par date.
  - [x] 4.2 Créer la route `PUT /api/admin/events/[id]/registrations/[registrationId]/route.ts` pour permettre à l'administrateur de mettre à jour le statut (ex: marquer comme présent `ATTENDED` ou annuler `CANCELLED`).
  - [x] 4.3 Créer les tests unitaires pour ces routes admin dans `src/app/api/admin/events/[id]/registrations/route.test.ts`.

- [x] **Task 5 — Interface Admin : Page des inscriptions & Bouton d'action (AC7)**
  - [x] 5.1 Créer la page d'administration `/admin/events/[id]/registrations/page.tsx` :
    - Vérifier que l'utilisateur est admin, sinon rediriger vers `/dashboard`.
    - Récupérer l'événement et ses inscriptions depuis Prisma (Server Component).
    - Rendre une vue premium avec :
      - Un fil d'ariane ou bouton de retour vers `/admin/events`.
      - Des statistiques rapides (Inscrits au total, Présents, Payé sur place, En attente de paiement).
      - Des filtres de recherche et de statut.
      - Un tableau propre (`src/components/ui/table.tsx`) affichant : Nom/Email, Tier Snapshot, Mode de paiement, Montant, Statut (avec badge de couleur), Date.
      - Des boutons d'action rapide pour chaque inscrit (ex: bouton "Marquer présent" qui appelle l'API PUT).
  - [x] 5.2 Modifier `src/components/features/admin/events-list-table.tsx` pour ajouter un bouton d'action « Inscriptions » à côté de « Modifier » et « Supprimer » pour chaque événement, redirigeant vers `/admin/events/[id]/registrations`.

- [x] **Task 6 — Validation finale (AC8)**
  - [x] 6.1 Lancer le build complet pour vérifier qu'aucune erreur TypeScript n'est introduite : `npm run build`.
  - [x] 6.2 Lancer toute la suite de tests : `npx vitest run`.

---

## Dev Notes

### Architecture & patterns à suivre

- **Langue du projet** : Tous les artefacts, UI, messages d'erreur, logs et commentaires de code en **français**.
- **Next.js 16 / React 19 / App Router** : `params` asynchrones requis :
  ```typescript
  export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    ...
  }
  ```
- **Base UI Dialog** : Utiliser la modale standard du projet `src/components/ui/dialog.tsx` pour le formulaire d'inscription.
- **Prisma 7.8.0** : Client Prisma importé de `@/generated/prisma/client` via le singleton `prisma` dans `@/lib/prisma`.
- **Contraintes de transaction** : Toujours utiliser `tx` au lieu de `prisma` à l'intérieur d'un `$transaction` pour éviter les interverrouillages (deadlocks).
- **PostHog** : Suivre l'inscription avec l'événement `event_register` et des propriétés utiles (ex: `eventId`, `eventType`, `paymentMethod`, `isVisitor`).
- **Gestion des paiements** : 
  - *Visiteurs* : ne pas insérer de ligne dans la table `Payment` car `userId` est requis et non-nul dans notre schéma SQL actuel. Les détails du paiement visiteur restent capturés dans `EventRegistration.amountPaid` et `payOnSite: false`.
  - *Membres* : créer à la fois `EventRegistration` et `Payment` (si `amountPaid > 0` et `payOnSite: false`).
- **Statuts d'inscriptions** :
  - `REGISTERED` : Inscrit (statut initial).
  - `ATTENDED` : Présent (marqué par l'admin).
  - `CANCELLED` : Annulé.
  - `NO_SHOW` : Absent sans annulation.

### Références

- Modèle Prisma : [prisma/schema.prisma](file:///d:/Code/ivoire-business-club-next/prisma/schema.prisma#L565-L582)
- Formulaire admin d'événements de référence : [src/components/features/admin/event-form.tsx](file:///d:/Code/ivoire-business-club-next/src/components/features/admin/event-form.tsx)
- Page publique de détail : [src/app/(public)/events/[slug]/page.tsx](file:///d:/Code/ivoire-business-club-next/src/app/(public)/events/[slug]/page.tsx)
- Route de paiement existante : [src/app/api/subscriptions/route.ts](file:///d:/Code/ivoire-business-club-next/src/app/api/subscriptions/route.ts)

## Dev Agent Record

### Agent Model Used

Gemini 3.5 Flash (High)

### Debug Log References

- Isolé les fonctions de base de données Prisma (`generateUniqueSlug`, `getNextPublishedEvent`) dans `src/lib/event-server-utils.ts` afin d'éviter d'importer le client Prisma dans les composants clients React qui utilisent `event-utils.ts`.

### Completion Notes List

- ✅ Implémenté la validation Zod `eventRegistrationSchema` dans `src/lib/validations.ts`.
- ✅ Créé la route API publique d'inscription `POST /api/events/[id]/register/route.ts` gérant la transaction Prisma, l'unicité, la capacité en temps réel, le calcul tarifaire par tier et le suivi PostHog `event_register`.
- ✅ Créé le composant client `EventRegisterButton.tsx` avec modal `Dialog`, calcul dynamique du tarif par tier/visiteur, sélecteur de mode de paiement (Virement, Wave, Orange Money, Sur place) et alerte jaune explicite pour le paiement sur place (AC3).
- ✅ Intégré `EventRegisterButton` dans la page publique de détail d'événement `src/app/(public)/events/[slug]/page.tsx` avec vérification préalable du statut d'inscription de l'utilisateur connecté.
- ✅ Créé la route d'API admin `GET /api/admin/events/[id]/registrations/route.ts` (liste avec filtre statut et recherche par nom/email) et `PUT /api/admin/events/[id]/registrations/[registrationId]/route.ts` avec journalisation d'audit `EVENT_REGISTRATION_UPDATE`.
- ✅ Créé la page admin `/admin/events/[id]/registrations/page.tsx` et le composant `event-registrations-table.tsx` avec cartes de métriques (Total, Présents, En attente, Sur place), filtres et boutons d'action rapide ("Marquer Présent", "No-Show", "Annuler").
- ✅ Ajouté le bouton "Inscriptions" dans le tableau d'administration des événements `events-list-table.tsx`.
- ✅ Rédigé et validé 9 tests unitaires complets (`src/app/api/events/[id]/register/route.test.ts` et `src/app/api/admin/events/[id]/registrations/route.test.ts`) qui passent à 100%.

### File List

- `src/lib/validations.ts`
- `src/app/api/events/[id]/register/route.ts`
- `src/app/api/events/[id]/register/route.test.ts`
- `src/components/features/events/EventRegisterButton.tsx`
- `src/app/(public)/events/[slug]/page.tsx`
- `src/app/api/admin/events/[id]/registrations/route.ts`
- `src/app/api/admin/events/[id]/registrations/[registrationId]/route.ts`
- `src/app/api/admin/events/[id]/registrations/route.test.ts`
- `src/app/admin/events/[id]/registrations/page.tsx`
- `src/components/features/admin/event-registrations-table.tsx`
- `src/components/features/admin/events-list-table.tsx`
- `src/lib/event-utils.ts`
- `src/lib/event-server-utils.ts`
- `src/lib/audit-log.ts`
- `src/app/(public)/page.tsx`
- `src/app/(public)/page.test.tsx`
- `src/app/api/events/[id]/route.ts`
- `src/app/api/events/route.ts`
- `src/app/api/events/next/route.ts`
- `src/app/api/events/next/route.test.ts`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/25-4-inscription-paiement-event.md`

### Change Log

- **2026-07-04** : Implémentation complète de la Story 25-4 (Inscription + Paiement Event). Création du système d'inscription membres/visiteurs, calcul des tarifs par tier, alertes paiement sur place, suivi admin et tests unitaires verts.
ug]/page.tsx)
- Route de paiement existante : [src/app/api/subscriptions/route.ts](file:///d:/Code/ivoire-business-club-next/src/app/api/subscriptions/route.ts)

## Dev Agent Record

### Agent Model Used

Gemini 3.5 Flash (High)

### Debug Log References

### Completion Notes List

### File List
