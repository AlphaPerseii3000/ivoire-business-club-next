---
Story: "6.2"
StoryKey: "6-2-metriques-cles-et-analytics-admin"
Title: "Métriques Clés et Analytics Admin"
Status: "ready-for-dev"
Priority: "P1"
Epic: "Epic 6 — Administration et Back-office"
FRs: ["FR36", "FR44"]
NFRs: ["NFR-P2", "NFR-S5", "NFR-S8", "NFR-A1", "NFR-A3"]
UXDRs: ["UX-DR17", "UX-DR34"]
Created: "2026-05-21"
---

# Story 6.2: Métriques Clés et Analytics Admin

Status: ready-for-dev

<!-- Note: Story brownfield/delta. Le dashboard admin existe déjà sur `/admin`; cette story remplace ses cartes génériques par les métriques FR36 et ajoute l'alias `/admin/dashboard` sans casser la navigation existante. -->

## Story

En tant qu'administrateur IBC,
je veux consulter les indicateurs clés de la plateforme,
afin de prendre des décisions éclairées sur la croissance et la qualité.

## Acceptance Criteria

1. **Dashboard analytics admin protégé**
   - Given un utilisateur non authentifié accède à `/admin/dashboard`,
   - When la page est rendue,
   - Then il est redirigé vers `/auth/signin`.
   - Given un utilisateur authentifié non-admin accède à `/admin/dashboard`,
   - When la page est rendue,
   - Then il est redirigé vers `/dashboard`.
   - Given un utilisateur avec `role === "ADMIN"`,
   - When il consulte `/admin/dashboard`,
   - Then la page affiche le tableau de bord analytics en français et n'utilise pas `getUserPremiumAccess()`.
   - And l'accès existant `/admin` reste fonctionnel : soit il rend le même dashboard, soit il redirige explicitement vers `/admin/dashboard`.

2. **Rangée de 4 cartes métriques FR36**
   - Given l'admin sur la page analytics,
   - When les données sont chargées,
   - Then une rangée responsive de 4 cartes s'affiche en haut :
     1. « MRR » calculé depuis les abonnements `ACTIVE`.
     2. « Membres actifs (7j) » calculé comme nombre distinct de `Session.userId` avec `updatedAt` dans les 7 derniers jours et `expires >= now`; si les sessions JWT ne peuplent pas la table, afficher `0` avec une aide « Sessions actives suivies côté serveur uniquement » plutôt que d'inventer une valeur.
     3. « Conversion onboarding → signup » calculée en MVP comme `utilisateurs avec abonnement créé / utilisateurs inscrits`, exprimée en pourcentage; libellé d'aide obligatoire : « Proxy MVP basé sur les abonnements créés ».
     4. « Churn mensuel » calculé comme `abonnements CANCELLED sur les 30 derniers jours / abonnements actifs au début de la période`, exprimé en pourcentage; si le dénominateur vaut `0`, afficher `0 %` et ne jamais afficher `NaN` ou `Infinity`.
   - And les montants sont formatés en euros avec `Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })`.

3. **Détail par métrique : valeur, variation, tendance**
   - Given chaque carte métrique,
   - When elle est affichée,
   - Then elle contient une valeur actuelle, une variation vs période précédente, et une mini-tendance visuelle accessible.
   - And les variations utilisent des libellés français : « +X % vs période précédente », « -X % vs période précédente », ou « Stable vs période précédente ».
   - And la tendance ne dépend jamais uniquement de la couleur : icône/texte/`aria-label` doivent expliciter hausse, baisse ou stabilité.

4. **Revalidation des données sans temps réel complexe**
   - Given un abonnement est activé ou résilié,
   - When l'admin recharge `/admin/dashboard` ou revient après une revalidation,
   - Then le MRR et les compteurs reflètent les données récentes.
   - And l'implémentation choisit la revalidation Next.js toutes les 5 minutes (`revalidate = 300`) ou une stratégie équivalente côté Server Component; ne pas ajouter WebSocket/SSE/PostHog/Plausible dans cette story.

5. **UX admin responsive et accessible**
   - Given l'admin sur desktop ≥1024px,
   - When il consulte les métriques,
   - Then les 4 cartes sont visibles sur une rangée ou grille 4 colonnes dans le style admin existant.
   - Given l'admin sur mobile,
   - When il consulte les métriques,
   - Then les cartes s'empilent proprement avec des textes lisibles, aucune table obligatoire, et des cibles interactives ≥44px.
   - And tous les textes visibles sont en français, jargon minimum, avec aides courtes pour les métriques proxy.

6. **Régression, sécurité et validation**
   - Given cette story modifie une zone admin brownfield,
   - When l'implémentation est terminée,
   - Then les tests couvrent les calculs de métriques, les cas zéro, le formatage français, l'accès ADMIN, et le rendu des 4 cartes.
   - And `./node_modules/.bin/prisma validate`, les tests ciblés, `npx vitest run`, et `npm run build` passent ou les échecs préexistants hors scope sont documentés.
   - And tout nouveau JSX conditionnel utilise des ternaires, jamais `&&`, avec les booléens composés pré-calculés avant le `return`.
   - And aucun log ne contient titres, descriptions, notes, URLs signées, documents, emails complets ou payloads complets; si un log est nécessaire, limiter aux IDs/statuts/actions.

## Tasks / Subtasks

- [ ] **AC1: Préserver et étendre le routage admin brownfield**
  - [ ] Auditer `src/app/(admin)/layout.tsx`, `src/app/(admin)/admin/layout.tsx` et `src/app/(admin)/admin/page.tsx` avant modification.
  - [ ] Créer ou réutiliser une implémentation partagée pour le dashboard afin que `/admin/dashboard` satisfasse l'AC sans dupliquer toute la logique.
  - [ ] Préserver le contrôle d'accès admin : `auth()` depuis `@/lib/auth`, lookup Prisma du rôle, redirect `/auth/signin` si non authentifié, redirect `/dashboard` si non admin.
  - [ ] Mettre à jour la navigation admin visible pour libeller « Tableau de bord » en français et pointer vers `/admin/dashboard` ou préserver `/admin` comme alias cohérent.
  - [ ] Ne pas utiliser `getUserPremiumAccess()`, `PremiumAccessBlockedPanel`, ni une logique de tier premium membre dans les routes admin.

- [ ] **AC2: Implémenter les calculs analytics côté serveur**
  - [ ] Créer `src/lib/admin-analytics.ts` avec des fonctions pures et testables pour calculer MRR, membres actifs 7j, conversion, churn, variation et tendance.
  - [ ] Calculer le MRR à partir des `Subscription` en statut `ACTIVE`; utiliser `getAmountForTier(subscription.tier)` plutôt que réintroduire Stripe/CinetPay ou ajouter un champ montant hors scope.
  - [ ] Calculer les périodes avec des bornes explicites : période actuelle = 30 derniers jours pour MRR/churn/conversion, période précédente = les 30 jours avant; membres actifs = 7 derniers jours vs 7 jours précédents.
  - [ ] Protéger tous les diviseurs à zéro avec helpers (`safePercent`, `safeVariationPercent`) pour éviter `NaN`, `Infinity`, ou erreurs de rendu.
  - [ ] Utiliser uniquement Prisma via `src/lib/prisma.ts`; ne pas instancier un nouveau client.

- [ ] **AC2/AC3: Construire les composants de métriques**
  - [ ] Créer `src/components/features/admin/admin-metrics-cards.tsx` ou équivalent dans `components/features/admin/`.
  - [ ] Chaque carte doit afficher : titre, valeur formatée, aide courte, variation vs période précédente, mini-tendance accessible.
  - [ ] Utiliser `Card`, `Badge`/styles existants et `lucide-react` si utile; ne pas ajouter de librairie de charts.
  - [ ] Pour la mini-tendance, utiliser une micro-visualisation simple (3–5 barres SVG/divs avec `aria-label`) ou une icône de tendance; pas de données personnelles dans les props.
  - [ ] Tous les libellés visibles doivent être en français : « MRR », « Membres actifs (7j) », « Conversion onboarding → signup », « Churn mensuel », « vs période précédente ».

- [ ] **AC4: Revalidation et fraîcheur des données**
  - [ ] Ajouter `export const revalidate = 300` sur la page Server Component analytics ou une alternative équivalente compatible Next.js 16.
  - [ ] Ne pas implémenter de temps réel WebSocket/SSE dans cette story; si une action abonnement revalide déjà des paths, ajouter `/admin/dashboard` seulement si le pattern existant le permet simplement.
  - [ ] Vérifier que `PATCH /api/admin/subscriptions/[id]` continue de fonctionner sans changement fonctionnel hors scope.

- [ ] **AC5: UX responsive et accessibilité**
  - [ ] Desktop : grille `sm:grid-cols-2 lg:grid-cols-4` ou équivalent, largeur max alignée avec les pages admin existantes (`max-w-7xl`).
  - [ ] Mobile : cartes empilées, texte non tronqué pour les valeurs critiques, aides lisibles, pas de table obligatoire.
  - [ ] Ajouter `aria-label` aux tendances visuelles et ne jamais utiliser la couleur comme seul indicateur de hausse/baisse/stabilité.
  - [ ] Vérifier les cibles tactiles des liens/actions admin (`min-h-11` ou padding équivalent).
  - [ ] Remplacer le libellé anglais « Dashboard » dans la navigation si touché par « Tableau de bord ».

- [ ] **AC6: Tests et validation**
  - [ ] Ajouter `src/lib/admin-analytics.test.ts` pour MRR par tier, membres actifs 7j, conversion proxy, churn, variation positive/négative/stable, et diviseurs à zéro.
  - [ ] Ajouter/mettre à jour un test de page ou composant (`src/app/(admin)/admin/dashboard/page.test.tsx` ou composant partagé) pour vérifier les 4 cartes, textes français, format euros, aides proxy et role-gating.
  - [ ] Vérifier qu'aucun nouveau JSX conditionnel n'utilise `&&`; pré-calculer les booléens composés avant `return`.
  - [ ] Exécuter `./node_modules/.bin/prisma validate`.
  - [ ] Exécuter les tests ciblés analytics/admin.
  - [ ] Exécuter `npx vitest run`.
  - [ ] Exécuter `npm run build`.
  - [ ] Documenter les résultats dans le Dev Agent Record.

## Dev Notes

### Scope delta — dashboard admin existant

Le projet est brownfield. La route admin existe déjà et ne doit pas être réécrite from-scratch :

- `src/app/(admin)/layout.tsx` protège toute la zone admin avec `auth()` + lookup Prisma `role === "ADMIN"`, puis rend la sidebar admin.
- `src/app/(admin)/admin/page.tsx` répète déjà le contrôle admin, charge aujourd'hui `totalUsers`, `totalOpportunities`, `pendingVerifications`, `activeSubscriptions`, puis affiche des cartes génériques.
- `src/app/(admin)/admin/layout.tsx` existe aussi comme layout imbriqué non-authentifiant avec nav `Dashboard/Membres/Abonnements/Opportunités`; éviter d'introduire une divergence supplémentaire. Si ce layout est modifié, harmoniser les libellés en français sans casser les routes.
- `src/app/(admin)/admin/subscriptions/page.tsx` charge les abonnements `PENDING` et `ACTIVE`, récupère les `Payment` par `providerRef`, et utilise `AdminSubscriptionActions`. À préserver.

Implémentation recommandée : extraire la logique du dashboard actuel en composant/fonction partagée, créer `src/app/(admin)/admin/dashboard/page.tsx`, puis décider si `/admin` rend le même composant ou redirige vers `/admin/dashboard`. Garder `/admin` fonctionnel pour les liens existants et les habitudes admin.

### Définitions de métriques MVP à utiliser

Les AC source demandent des analytics produit mais le codebase ne contient pas encore d'événements analytics visiteurs/onboarding. Ne pas ajouter PostHog/Plausible ou un schéma event tracking dans cette story. Utiliser les proxies MVP ci-dessous et les expliciter dans l'UI :

- **MRR** : somme mensuelle des abonnements `ACTIVE`, via `getAmountForTier(tier)` : Affranchis 29 €, Grands Frères 49 €, Boss 99 €.
- **Membres actifs (7j)** : nombre distinct de sessions serveur actives avec `Session.updatedAt >= now - 7 jours` et `Session.expires >= now`. Si la stratégie JWT ne peuple pas cette table en pratique, le résultat peut être 0; ne pas remplacer par un faux compteur.
- **Conversion onboarding → signup** : proxy MVP = utilisateurs ayant au moins un `Subscription` / total `User`. Ajouter l'aide UI « Proxy MVP basé sur les abonnements créés ».
- **Churn mensuel** : abonnements passés à `CANCELLED` sur les 30 derniers jours / abonnements actifs au début de la période. Comme le schéma n'a pas `cancelledAt`, utiliser `updatedAt` pour approximer la date de résiliation et mentionner ce choix en commentaire/test, pas dans un log.
- **Variation vs période précédente** : comparer période actuelle et période précédente de même longueur; afficher stable si l'écart arrondi vaut 0 ou si les deux valeurs sont 0.

### Contraintes architecture / sécurité

- Next.js 16.2.6 + React 19.2.4 + App Router; Server Components par défaut pour le fetch analytics.
- Prisma 7.8.0 avec `@prisma/adapter-better-sqlite3`; utiliser le singleton `src/lib/prisma.ts`, qui résout les URL SQLite relatives en chemins absolus.
- Auth.js v5 beta.31 : `auth.config.ts` reste Edge-only; ne jamais importer Prisma/bcrypt dans le middleware ou `auth.config.ts`.
- Admin-gating = rôle `ADMIN`, pas accès premium. Les routes dashboard membres peuvent utiliser `getUserPremiumAccess()`, les routes admin non.
- API/Server Components admin : erreurs en français si surface utilisateur, pas de payload sensible en logs.
- NFR-S8 : ne jamais logger titres, descriptions, notes, signed URLs, documents, emails complets ou payloads complets. Logs autorisés uniquement IDs/statuts/actions, mais cette story ne devrait pas nécessiter de nouveaux logs.
- Guardrail JSX Next.js 16 : aucun `&&` en position JSX; utiliser ternaires et const booléennes pré-calculées.

### UX / accessibilité

- UI entièrement en français même si la config BMAD indique `document_output_language: English`.
- Style aligné avec les pages admin existantes : `max-w-7xl`, cartes arrondies, bordures, `text-muted-foreground`, grille responsive.
- Le document UX demande une rangée de métriques en haut du dashboard admin; cette story est précisément la concrétisation FR36 de cette rangée.
- Couleur jamais seule : hausse/baisse/stabilité doivent avoir texte + icône/aria-label.
- Éviter les dashboards complexes façon fintech; garder des cartes simples, lisibles et actionnables.

### Previous Story Intelligence — Story 6.1

Story 6.1 a durci le kanban opportunités et a passé `prisma validate`, tests ciblés, `npx vitest run` et `npm run build`. Leçons à réutiliser :

- Les pages admin doivent conserver `auth()` + rôle `ADMIN` et ne pas mélanger la logique premium membre.
- Préférer les deltas testables au redesign : ajouter les métriques FR36 au dashboard existant, ne pas refondre tout le back-office.
- Les nouveaux tests doivent être ciblés et stables; utiliser des helpers purs pour les calculs afin d'éviter des tests fragiles de rendu.
- Toute mutation ou revalidation liée aux abonnements doit rester idempotente et ne pas dupliquer emails/notifications/audit.
- La story 6.1 a confirmé que `/admin/subscriptions` et `/admin/opportunities` existent et doivent rester accessibles via la navigation admin.

### Deferred Work

- Migration `avatarUrl` dans la migration initiale : open item Epic 6 data migration, mais sans impact direct sur ces métriques sauf si des avatars sont ajoutés au dashboard; ne pas traiter dans cette story.
- Patterns JSX `&&` préexistants hors diff : ne pas lancer de hardening global ici, mais n'en introduire aucun nouveau.
- `POST /api/user/profile` tags optionnels : hors scope.

### Latest Tech Information

- `npm view` au 2026-05-21 confirme les versions pertinentes : Next.js `16.2.6`, Prisma `7.8.0`, React latest `19.2.6` alors que le projet reste en `19.2.4`, `lucide-react` latest `1.16.0` alors que le projet utilise `1.14.0`.
- Ne pas upgrader de dépendances dans cette story : suivre `package.json` existant pour limiter le risque brownfield.
- `npm view next-auth version` retourne la stable v4 (`4.24.14`) alors que le projet utilise volontairement `next-auth@5.0.0-beta.31`; conserver le pattern Auth.js v5 documenté.

### Project Structure Notes

- Dashboard actuel : `src/app/(admin)/admin/page.tsx`.
- Dashboard alias à créer : `src/app/(admin)/admin/dashboard/page.tsx`.
- Layout admin global : `src/app/(admin)/layout.tsx`.
- Layout admin imbriqué : `src/app/(admin)/admin/layout.tsx`.
- Abonnements à préserver : `src/app/(admin)/admin/subscriptions/page.tsx`, `src/components/admin-subscription-actions.tsx`, `src/app/api/admin/subscriptions/[id]/route.ts`.
- Config montants tiers : `src/lib/bank-transfer-config.ts`.
- Nouveau module recommandé : `src/lib/admin-analytics.ts` + `src/lib/admin-analytics.test.ts`.
- Nouveau composant recommandé : `src/components/features/admin/admin-metrics-cards.tsx` + test associé si utile.

### References

- `_bmad-output/planning-artifacts/epics.md` lignes 1013-1068 : objectif Epic 6 et AC Story 6.2.
- `_bmad-output/planning-artifacts/prd.md` lignes 308-315 : FR35-FR40, dont FR36 métriques clés.
- `_bmad-output/planning-artifacts/prd.md` lignes 123-139 : North Star et KPIs de phase (MRR, actifs, churn, mises en relation).
- `_bmad-output/planning-artifacts/architecture.md` lignes 71-87 : stack brownfield et contraintes Auth.js/Prisma/Next.js.
- `_bmad-output/planning-artifacts/architecture.md` lignes 180-216 : autorisation admin et patterns API.
- `_bmad-output/planning-artifacts/architecture.md` lignes 369-390 : guardrail JSX et idempotence des effets secondaires.
- `_bmad-output/planning-artifacts/ux-spec.md` lignes 697-704 : top metrics row du dashboard admin.
- `_bmad-output/implementation-artifacts/6-1-tableau-de-bord-kanban-des-opportunites.md` : précédente story Epic 6, admin-gating et validation build/tests.
- `_bmad-output/implementation-artifacts/deferred-work.md` : éléments différés à ne pas embarquer hors scope.

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

### Change Log

- 2026-05-21: Story créée en `ready-for-dev` avec scope delta brownfield et garde-fous analytics/admin.
