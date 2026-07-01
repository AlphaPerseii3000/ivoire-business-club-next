# Spécification et Plan : Alignement de l'abonnement et de l'affichage utilisateur

## Description du problème

Sur la page `/dashboard`, l'encart "Mon abonnement" ne reflétait pas correctement la réalité :
1. Même si un utilisateur avait demandé un abonnement à un plan premium (par exemple, "Les Boss" ou "Les Grands Frères"), l'affichage indiquait toujours le plan de base "Les Affranchis" tant que l'abonnement était en attente (`PENDING` ou `TRIAL`), car l'affichage utilisait la colonne `user.tier` au lieu de `subscription.tier`.
2. De plus, lors de la validation d'un abonnement par l'administrateur, le statut de la souscription passait bien à `ACTIVE`, mais le tier de l'utilisateur (`user.tier`) dans la table `users` n'était pas mis à jour. L'utilisateur restait donc bloqué sur le plan de base, n'accédant pas aux fonctionnalités payantes correspondantes à sa souscription.

## Changements effectués

### 1. Interface utilisateur (Tableau de bord)
- **Fichier modifié** : [page.tsx](file:///d:/Code/ivoire-business-club-next/src/app/(dashboard)/dashboard/page.tsx)
- **Modifications** :
  - Remplacement de `user.tier` par `subscription.tier` dans la section **Mon abonnement** pour afficher le libellé correct correspondant à la souscription de l'utilisateur (même en attente).
  - Utilisation de `subscription.tier` dans la bannière de paiement en attente `PendingSubscriptionBanner` au lieu du tier par défaut de l'utilisateur.

### 2. Base de données et synchronisation (Route API)
- **Fichier modifié** : [route.ts](file:///d:/Code/ivoire-business-club-next/src/app/api/admin/subscriptions/[id]/route.ts)
- **Modifications** :
  - Ajout d'une mise à jour de la table `User` dans la transaction de validation d'abonnement administrée. Le tier de l'utilisateur (`user.tier`) – pour l'accès aux fonctionnalités premium – est maintenant automatiquement mis à jour avec le tier choisi dans l'abonnement (`subscription.tier`).
  - Réinitialisation automatique du tier de l'utilisateur à `AFFRANCHI` en cas de refus (`reject`) ou de suspension (`suspend`) de l'abonnement.

### 3. Tests unitaires
- **Fichier modifié** : [route.test.ts](file:///d:/Code/ivoire-business-club-next/src/app/api/admin/subscriptions/[id]/route.test.ts)
- **Modifications** :
  - Mock de la méthode `user.update` dans l'implémentation de la transaction Prisma de test.
  - Ajout d'assertions pour s'assurer que `tx.user.update` est bien appelé lors de la validation, du rejet et de la suspension d'un abonnement avec le bon tier.

## Plan de vérification

### Tests automatisés
- Exécution des tests unitaires de la route de validation :
  `npx vitest run src/app/api/admin/subscriptions/[id]/route.test.ts`
  *(Tous les 12 tests ont réussi)*
