---
project_name: 'Ivoire Business Club'
user_name: 'PlayerOne'
date: '2026-07-08'
sections_completed:
  - technology_stack
  - language_rules
  - framework_rules
  - testing_rules
  - style_rules
  - workflow_rules
  - dont_miss_rules
status: 'complete'
rule_count: 25
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- **Next.js :** v16.2.6 (App Router, mode `standalone`, Turbopack, build TS ignoré pendant le build dans `next.config.ts`, symlinks désactivés `resolve.symlinks = false` dans Webpack)
- **React :** v19.2.4
- **TypeScript :** v5.x
- **Tailwind CSS :** v4.x (via `@tailwindcss/postcss` et `@tailwindcss/typography`)
- **Prisma :** v7.8.0 (Client généré localement dans `src/generated/prisma`)
- **Auth.js (Next-Auth) :** v5.0.0-beta.31 (configuration découplée Edge/Node.js dans `auth.config.ts` et `auth.ts`)
- **Bases de données :** PostgreSQL (`pg` v8.21.0) et SQLite (`better-sqlite3` v12.9.0) avec adaptateurs `@prisma/adapter-pg` et `@prisma/adapter-better-sqlite3`
- **Animations & UI :** Radix/Base UI (`@base-ui/react` v1.4.1), Framer Motion v12.40.0, GSAP v3.15.0
- **Éditeur de texte :** TipTap v3.27.1 (`@tiptap/*` pour le markdown, les liens et images)
- **Analytics :** PostHog v1.395.0 (client) & v5.21.2 (serveur)
- **Storage :** AWS SDK S3 / Cloudflare R2 v3.1048.0
- **Rate limiting :** Upstash Redis v1.38.0 & Upstash Ratelimit v2.0.8
- **Tests :** Vitest v4.1.6 (unitaires/d'intégration), Playwright v1.60.0 (E2E)

## Critical Implementation Rules

### Language-Specific Rules

- **TypeScript Strict Mode :** La configuration `strict: true` est obligatoire. Tout nouveau code doit être entièrement typé (pas d'utilisation abusive de `any`).
- **Alias d'imports :** Toujours utiliser l'alias `@/*` pour référencer le dossier `src/` (configuré dans `tsconfig.json`). Ne pas utiliser de chemins relatifs longs (ex: `../../../../components` ❌).
- **Asynchronisme :** Préférer systématiquement `async/await` aux promesses chaânes `.then()`.
- **Gestion des erreurs :** Toujours encapsuler les appels asynchrones ou d'API dans des blocs `try/catch` avec un typage des erreurs explicite ou une assertion sécurisée (ex: `error instanceof Error`).

### Framework-Specific Rules

- **Next.js Server vs Client Components :** Par défaut, tous les composants dans `src/app/` sont des React Server Components (RSC). Utiliser la directive `'use client'` au tout début du fichier uniquement si le composant utilise des hooks d'état (`useState`, `useEffect`), des événements DOM (`onClick`), ou des APIs du navigateur.
- **Séparation Edge/Node.js pour Auth.js v5 :**
  - [auth.config.ts](file:///d:/Code/ivoire-business-club-next/src/lib/auth.config.ts) doit rester 100% compatible avec l'Edge Runtime (aucun import de Prisma, de bcrypt, ni de module Node.js).
  - [auth.ts](file:///d:/Code/ivoire-business-club-next/src/lib/auth.ts) est exécuté sur le runtime Node.js standard et contient l'adaptateur Prisma, bcrypt, ainsi que les providers comme Credentials et Google OAuth.
- **Prisma Client Singleton :** Toujours importer l'instance partagée `prisma` depuis `@/lib/prisma`. Ne jamais instancier directement `new PrismaClient()` pour éviter la saturation des connexions de la base de données.
- **Sécurisation des imports client/serveur :** Ne jamais importer des utilitaires ou des libs spécifiques au serveur (ex: `@/lib/prisma`, `@aws-sdk/client-s3`, `better-sqlite3`) dans des fichiers s'exécutant côté client ou marqués `'use client'`.

### Testing Rules

- **Co-location des tests unitaires/d'intégration :** Tous les tests unitaires et d'intégration écrits pour Vitest doivent être co-localisés directement dans le même dossier que le fichier testé et nommés selon la convention `[nom-du-fichier].test.ts` (ou `[nom-du-fichier].test.tsx`).
- **Tests E2E séparés :** Les scénarios de tests de bout en bout avec Playwright doivent être centralisés dans le répertoire `/e2e` sous la forme `[nom-du-flux].spec.ts`.
- **Environnement de test E2E :** Playwright charge ses variables d'environnement depuis `e2e/.env.test` (configuré dans [playwright.config.ts](file:///d:/Code/ivoire-business-club-next/playwright.config.ts)).
- **Mocks Prisma :** Lors de l'écriture de tests unitaires impliquant la base de données, mocker l'instance `prisma` globale ou les transactions transactionnelles pour éviter d'effectuer des écritures réelles en DB.
- **Commandes pour exécuter les tests :**
  - Exécuter les tests unitaires (Vitest) : `npx vitest run [chemin/du/fichier.test.ts]`
  - Exécuter les tests E2E (Playwright) : `npx playwright test` (ou `npm run test:e2e:local` pour tester en local).

### Code Quality & Style Rules

- **Convention de nommage :**
  - Fichiers et dossiers : kebab-case obligatoire (ex: `admin-access.ts`, `bank-transfer-config.ts`).
  - Variables et fonctions : camelCase (ex: `createPrismaClient`, `getDatabaseProvider`).
  - Constantes et configurations globales : UPPER_SNAKE_CASE.
- **Réutilisation des composants UI :** Toujours étendre et réutiliser les primitives de Base UI (`@base-ui/react`) et les classes Tailwind CSS v4 existantes. Ne pas recréer de composants d'UI basiques (comme des boutons ou des modaux complexes) à partir de zéro.
- **Organisation des répertoires :**
  - Logique métier et utilitaires : dans [src/lib/](file:///d:/Code/ivoire-business-club-next/src/lib).
  - Pages, composants de pages et routes API : dans [src/app/](file:///d:/Code/ivoire-business-club-next/src/app).
  - Composants partagés transverses : dans `src/components/`.
- **Formatage & Linting :** Respecter les règles définies dans [eslint.config.mjs](file:///d:/Code/ivoire-business-club-next/eslint.config.mjs). Le code doit compiler sans avertissements ESLint.

### Development Workflow Rules

- **Suivi du sprint :** L'état du projet et les tâches de développement sont centralisés dans [sprint-status.yaml](file:///d:/Code/ivoire-business-club-next/_bmad-output/implementation-artifacts/sprint-status.yaml). Après avoir terminé une story ou corrigé un bug, le statut de la story et de l'Epic associés doivent être mis à jour dans ce fichier.
- **Scripts de déploiement :**
  - Pour préparer un déploiement : `npm run prepare-deploy` (exécute `scripts/prepare-deploy.ps1`).
  - Pour déployer en production : `npm run deploy:prod` (exécute `scripts/deploy-production.ps1`).
- **Processus de Revue de Code :** Une fois le développement terminé, le développeur fait passer le statut de la story à `review` dans `sprint-status.yaml` et lance un processus de relecture de code à l'aide de l'outil de révision automatique avant de valider la fusion.

### Critical Don't-Miss Rules

- **Validation manuelle d'abonnement :** Tous les paiements tiers (Stripe, CinetPay) ont été retirés. La souscription se fait uniquement par virement bancaire sur le compte de KS Investment. La validation ou la suspension des abonnements doit obligatoirement passer par une action manuelle d'un administrateur.
- **Synchronisation du Tier utilisateur (Règle d'Or d'abonnement) :** Lors de toute modification du statut d'une souscription (`Subscription`) dans la base de données (approbation, rejet, suspension), vous devez impérativement mettre à jour le tier de l'utilisateur (`User.tier`) dans la même transaction Prisma :
  - Si validé : `user.tier` prend la valeur de `subscription.tier`.
  - Si rejeté ou suspendu : `user.tier` doit être réinitialisé à `AFFRANCHI`.
- **Sécurité Edge du Middleware d'Authentification :** Ne jamais importer de dépendance Prisma ou de modules natifs Node.js (ex: `bcryptjs`) dans le middleware ou dans [auth.config.ts](file:///d:/Code/ivoire-business-club-next/src/lib/auth.config.ts) sous peine de casser le routing Edge.
- **Ajout de domaines pour les images ou connections :** Si vous intégrez de nouveaux services ou sources d'images (comme un CDN externe ou un nouveau fournisseur), vous devez obligatoirement mettre à jour la Content Security Policy (CSP) et les `remotePatterns` dans [next.config.ts](file:///d:/Code/ivoire-business-club-next/next.config.ts).
- **Rate-limiting :** Les endpoints sensibles (comme l'authentification credentials, l'envoi d'e-mails ou de messages WhatsApp) doivent être protégés par le module de rate-limiting Upstash Redis.

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any code
- Follow ALL rules exactly as documented
- When in doubt, prefer the more restrictive option
- Update this file if new patterns emerge

**For Humans:**

- Keep this file lean and focused on agent needs
- Update when technology stack changes
- Review quarterly for outdated rules
- Remove rules that become obvious over time

Last Updated: 2026-07-08
