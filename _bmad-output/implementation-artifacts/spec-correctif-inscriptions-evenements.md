---
title: 'Correctif inscriptions événements'
type: 'bugfix'
created: '2026-07-08'
status: 'done'
route: 'one-shot'
---

# Correctif inscriptions événements

## Intent

**Problem:** Des erreurs de requêtes Prisma sur le champ `avatarUrl` (inexistant dans le schéma Prisma `User`, qui utilise `image` mappé sur `avatarUrl` en base) provoquaient une erreur 500 et un écran d'erreur ("Oups, une erreur est survenue") sur la page et les API d'inscriptions d'événements. De plus, lors de l'inscription à un événement gratuit, les moyens de règlement étaient affichés inutilement.

**Approach:** Remplacer `avatarUrl: true` par `image: true` dans les requêtes Prisma et faire le mapping vers `avatarUrl` pour préserver le contrat d'API et d'interface utilisateur. Masquer les options de paiement et adapter le bouton d'inscription pour les événements gratuits dans `EventRegisterButton.tsx`.

## Suggested Review Order

**Gestion des inscriptions (Admin)**

- Récupération de l'image (avatar) de l'utilisateur via Prisma et mapping vers `avatarUrl` dans le composant de page serveur.
  [`page.tsx:43`](../../src/app/admin/events/[id]/registrations/page.tsx#L43)

- Correction de la requête Prisma de la liste des inscrits et mapping dans l'API GET.
  [`route.ts:45`](../../src/app/api/admin/events/[id]/registrations/route.ts#L45)

- Correction de la requête Prisma de mise à jour des inscrits et mapping dans l'API PUT.
  [`route.ts:59`](../../src/app/api/admin/events/[id]/registrations/[registrationId]/route.ts#L59)

**Formulaire d'inscription (Public)**

- Masquage des modes de règlement et ajustement dynamique du bouton de soumission si l'événement est gratuit.
  [`EventRegisterButton.tsx:239`](../../src/components/features/events/EventRegisterButton.tsx#L239)

- Masquage des instructions de paiement sur l'écran de succès pour les événements gratuits.
  [`EventRegisterButton.tsx:160`](../../src/components/features/events/EventRegisterButton.tsx#L160)
