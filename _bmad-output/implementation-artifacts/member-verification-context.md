# IBC — Vérification des membres : Contexte pour implémentation

## Décision produit

**Approche B retenue :** Vérification par critères automatiques + validation admin.

Un membre n'apparaît dans la page publique `/members` que si `verificationStatus = "VERIFIED"`. L'admin valide manuellement via le bouton "Vérifier ✓" dans `/admin/members`, mais le membre doit d'abord remplir des pré-requis automatiques avant de pouvoir être vérifié.

## État actuel du code (déjà déployé en production)

### Schéma Prisma (`prisma/schema.prisma`)

```prisma
model User {
  id                 String             @id @default(cuid())
  email              String             @unique
  name               String
  bio                String?
  image              String?            @map("avatarUrl")
  phone              String?
  location           String?
  country            String?
  tier               Tier               @default(AFFRANCHI)
  role               UserRole           @default(MEMBER)
  status             UserStatus         @default(ACTIVE)
  verificationStatus VerificationStatus @default(PENDING)
  passwordHash       String?
  googleId           String?            @unique
  emailVerified      Boolean            @default(false)
  // ... relations
}

enum VerificationStatus {
  PENDING
  EN_COURS
  VERIFIED
  REJECTED
}
```

### Page publique `/members` (`src/app/(dashboard)/members/page.tsx`)

Filtre **uniquement** sur `verificationStatus: "VERIFIED"` :

```ts
const members = await prisma.user.findMany({
  where: { verificationStatus: "VERIFIED" },
  orderBy: { createdAt: "desc" },
  select: { id, name, location, country, tier, bio, image },
});
```

### Page admin `/admin/members` (`src/app/(admin)/admin/members/page.tsx`)

Affiche une colonne "Vérification" avec badges colorés + boutons d'action.

### Composant actions admin (`src/components/features/admin/admin-member-actions.tsx`)

Boutons existants :
- **Suspendre/Réactiver** → `PATCH /api/admin/users/[id]/status`
- **Envoyer email de confirmation** → `POST /api/admin/users/[id]/confirmation-email`
- **Vérifier ✓** → `POST /api/admin/users/[id]/verify` avec `action=verify` (FormData)
- **Rejeter ✗** → `POST /api/admin/users/[id]/verify` avec `action=reject` (FormData)

### Route API verify (`src/app/api/admin/users/[id]/verify/route.ts`)

Passe `verificationStatus` à `"VERIFIED"` ou `"REJECTED"` selon l'action. Enregistre un audit log.

### Route API confirmation-email (`src/app/api/admin/users/[id]/confirmation-email/route.ts`)

Envoie un email de confirmation d'abonnement (via `sendAdminSubscriptionConfirmationEmail`). **Ne change aucun statut en DB.** Ce n'est PAS un email de vérification d'adresse email.

### Inscription (`src/app/api/auth/signup/route.ts`)

Crée l'utilisateur avec les valeurs par défaut :
- `verificationStatus: PENDING`
- `emailVerified: false`
- `status: ACTIVE`

### Auth.js (`src/lib/auth.ts`)

Patch `emailVerified: null → false` pour les OAuth (Google), mais **aucun flux de vérification email côté utilisateur n'existe**.

## Ce qu'il faut implémenter

### 1. Flux de vérification d'email côté utilisateur

Actuellement, `emailVerified` reste toujours `false`. Il faut :

- **Route API** `POST /api/auth/verify-email` : accepte un token, trouve le `VerificationToken` correspondant, met `user.emailVerified = true`, supprime le token
- **Route API** `POST /api/auth/send-verification` : génère un token, l'enregistre dans `VerificationToken`, envoie un email avec un lien contenant le token
- **Page** `/auth/verify-email` : page de confirmation (lien cliqué dans l'email)
- **Déclencheur** : envoyer automatiquement un email de vérification à l'inscription, ou proposer un bouton "Renvoyer l'email de vérification" dans `/settings`
- Le modèle `VerificationToken` existe déjà dans le schéma Prisma (champs : `identifier`, `token`, `expires`, `userId`, `createdAt`)

### 2. Pré-requis automatiques pour la vérification admin

Dans la page `/admin/members`, le bouton "Vérifier ✓" ne doit être cliquable que si le membre remplit **tous** ces critères :

| Critère | Champ | Condition |
|---|---|---|
| Email vérifié | `user.emailVerified` | `= true` |
| Profil complété | `user.bio` + `user.location` + `user.country` | Non-null et non-vides |
| Compte actif | `user.status` | `= ACTIVE` |

Si un pré-requis manque, afficher le bouton "Vérifier" **grisé/désactivé** avec une infobulle listant les critères manquants (ex : "Email non vérifié, Profil incomplet").

### 3. Statut `EN_COURS`

Le schéma a un statut `EN_COURS` qui n'est pas utilisé actuellement. Il pourrait signifier :
- Le membre a rempli tous les pré-requis automatiques et attend la validation admin
- Transition automatique : quand tous les pré-requis sont remplis, `verificationStatus` passe de `PENDING` → `EN_COURS`
- L'admin voit les membres `EN_COURS` comme "prêts à vérifier" (bouton actif)

### 4. Indication au membre dans `/settings`

Le membre doit voir son statut de vérification et savoir ce qu'il lui manque :
- "⏳ En attente de vérification" si `PENDING`
- "🔄 Vérification en cours — un admin validera bientôt votre profil" si `EN_COURS`
- "✓ Membre vérifié" si `VERIFIED`
- "❌ Vérification rejetée" si `REJECTED`
- Liste des pré-requis manquants (email non vérifié, bio manquante, etc.)
- Bouton "Renvoyer l'email de vérification" si email non vérifié

### 5. Transition automatique PENDING → EN_COURS

Ajouter un hook ou une fonction qui, après chaque mise à jour de profil ou vérification email, vérifie si tous les pré-requis sont remplis et passe automatiquement `PENDING → EN_COURS`. Ne jamais rétrograder (si déjà `VERIFIED` ou `REJECTED`, ne pas revenir à `EN_COURS`).

## Fichiers clés à modifier/créer

| Fichier | Action |
|---|---|
| `src/app/api/auth/send-verification/route.ts` | Créer |
| `src/app/api/auth/verify-email/route.ts` | Créer |
| `src/app/auth/verify-email/page.tsx` | Créer |
| `src/components/features/admin/admin-member-actions.tsx` | Modifier (désactiver bouton si pré-requis manquants, infobulle) |
| `src/app/(admin)/admin/members/page.tsx` | Modifier (afficher icônes pré-requis dans la colonne Vérification) |
| `src/app/(dashboard)/settings/page.tsx` | Modifier (statut vérification + pré-requis manquants) |
| `src/lib/verification.ts` | Créer (logique centralisée : `isEligibleForVerification()`, `autoTransitionVerificationStatus()`) |
| `src/app/api/user/profile/route.ts` | Modifier (appeler auto-transition après mise à jour profil) |
| `src/lib/email.ts` | Modifier (ajouter template email de vérification) |

## Stack technique

- **Next.js 16** (Turbopack, App Router)
- **Prisma 7** (PostgreSQL en production, SQLite en dev)
- **Auth.js v5** (NextAuth)
- **PM2 cluster** sur Hetzner VPS (Ubuntu 26.04, PG 18)
- **Email** : Infomaniak SMTP via nodemailer (module `src/lib/email.ts`)
- **Modèle VerificationToken** : déjà dans le schéma Prisma (`identifier`, `token`, `expires`, `userId`, `createdAt`)

## Pièges connus (BMAD)

- Auth.js v5 passe `emailVerified: null` pour OAuth → déjà patché dans `src/lib/auth.ts` (coerce null → false)
- Next.js 16 strict JSX : utiliser des ternaires `{cond ? <JSX> : null}` pas `{cond && <JSX>}`
- Prisma SQLite en dev : les enums sont validés côté client uniquement, pas en DB
- `verificationStatus` est un enum Prisma, les valeurs sont `PENDING`, `EN_COURS`, `VERIFIED`, `REJECTED`
- Le bouton "Envoyer email de confirmation" existant envoie un email d'abonnement, PAS un email de vérification d'adresse — ne pas confondre les deux