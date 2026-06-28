# Migration rétroactive — Synchronisation des membres existants

Ce document décrit le script one-shot `scripts/sync-onboarding-to-profile.ts`, qui synchronise rétroactivement les champs `User` des membres ayant déjà complété l'onboarding avant la correction apportée par la Story 16.1.

## Pourquoi ce script ?

La Story 16.1 a corrigé l'API `PUT /api/user/onboarding` pour qu'elle synchronise automatiquement le formulaire d'onboarding (`onboardingForm`) et les colonnes `User` (`name`, `phone`, `location`, `country`, `bio`, `tier`).

Les membres inscrits **avant** cette correction ont un `onboardingCompletedAt` renseigné mais des champs `User` potentiellement vides. Ce script les parcourt un par un et remplit uniquement les champs manquants.

## Exécution

```bash
npx tsx scripts/sync-onboarding-to-profile.ts
```

Le script affiche un résumé final :

```
N utilisateurs synchronisés, M utilisateurs déjà à jour, K utilisateurs sans onboardingForm
```

## Dry-run

Pour visualiser les changements sans modifier la base de données :

```bash
npx tsx scripts/sync-onboarding-to-profile.ts --dry-run
```

En mode dry-run, le script liste chaque utilisateur concerné ainsi que les champs qui seraient synchronisés, mais aucune écriture n'a lieu.

## Mapping des champs

Le script réutilise le même mapping que l'API onboarding (Story 16.1) :

| `onboardingForm` JSON | Champ `User` | Transformation |
|---|---|---|
| `fullName` | `name` | Direct |
| `phone` | `phone` | `\|\| null` (chaîne vide → null) |
| `address` | `location` | `\|\| null` (chaîne vide → null) |
| `country` | `country` | Direct |
| `activity` | `bio` | `\|\| null` (chaîne vide → null) |
| `tier` | `tier` | Direct si actuellement `AFFRANCHI` |

## Guardrail : ne jamais écraser un champ non-null

Le script est **additif** :

- Si un champ `User` est déjà renseigné (non null), il est conservé.
- Si le JSON `onboardingForm` contient une valeur vide pour un champ, la valeur existante en base n'est pas écrasée.
- Le champ `tier` n'est mis à jour que si la valeur actuelle est la valeur par défaut `AFFRANCHI` et que le JSON contient une valeur différente.

## Cas edge gérés

| Cas | Comportement |
|---|---|
| `onboardingForm` est `null` ou absent | L'utilisateur est comptabilisé dans `withoutForm` et ignoré. |
| `onboardingForm` est une chaîne JSON invalide | Ignoré, pas d'erreur fatale. |
| `onboardingForm` n'est pas un objet (par exemple un tableau) | Ignoré. |
| Champ présent mais vide dans le JSON | Le champ `User` correspondant n'est pas synchronisé ; la valeur existante est conservée. |
| Utilisateur Google OAuth sans `onboardingForm` mais avec des champs déjà remplis | Ignoré car aucun onboarding à synchroniser. |
| Erreur inattendue pour un utilisateur | L'erreur est loguée, le script passe à l'utilisateur suivant et retourne un code d'erreur non nul à la fin. |

## Audit trail

Pour chaque utilisateur synchronisé, un `AuditLog` est créé **après** la transaction Prisma :

```ts
{
  action: "ONBOARDING_SYNC_MIGRATION",
  entityType: "User",
  entityId: user.id,
  metadata: { syncedFields: ["name", "phone", "location", "country", "bio", "tier"] }
}
```

L'action `ONBOARDING_SYNC_MIGRATION` a été ajoutée dans `src/lib/audit-log.ts` :

```ts
export const AUDIT_ACTIONS = {
  // ...
  ONBOARDING_COMPLETED: "ONBOARDING_COMPLETED",
  ONBOARDING_SYNC_MIGRATION: "ONBOARDING_SYNC_MIGRATION",
  // ...
};
```

Si l'audit log échoue, la migration de l'utilisateur concerné **n'est pas rollback** : l'audit est une trace d'observabilité, pas une donnée fonctionnelle.

## Cycle de vie

- Le script est conçu pour être exécuté une seule fois après le déploiement de la Story 16.1.
- Il est **idempotent** : une seconde exécution ne modifiera rien car les champs seront déjà remplis.

## Prérequis

- `DATABASE_URL` doit être configurée (fichier `.env`).
- `npx tsx` doit être disponible pour exécuter le script.
- Le client Prisma (`@/lib/prisma`) doit être en mesure de se connecter à la base configurée.

## Fichiers liés

- `scripts/sync-onboarding-to-profile.ts` — script de migration.
- `scripts/sync-onboarding-to-profile.test.ts` — tests unitaires du script.
- `src/lib/audit-log.ts` — définition de l'action `ONBOARDING_SYNC_MIGRATION`.
- `src/app/api/user/onboarding/route.ts` — implémentation Story 16.1 (mapping réutilisé).
- `src/lib/verification.server.ts` — `autoTransitionVerificationStatus` appelée après synchronisation.
