---
baseline_commit: 3d09c5ed71e1e440f1f934a834ef3c552e73bde2
agent_model_name_version: kimi-k2.7-code
---

# Story 27.3 : Schema structuré GEO pour événements

Status: in-progress

<!-- Validation optionnelle : lancer validate-create-story avant dev-story si besoin. -->

## Story

**En tant que** moteur de recherche IA (ChatGPT, Perplexity, Google AI Overviews, etc.),  
**Je veux** que chaque page événement expose un JSON-LD `Event` (schema.org/Event) complet, un `BreadcrumbList`, et une description sécurisée pour les événements privés,  
**Afin que** les agents IA puissent extraire, résumer et citer précisément les événements du site IBC sans fuite de contenu membre.

## Contexte Business

L'Epic 14 a posé les fondations SEO techniques et la story 27.1 a supprimé le `force-dynamic` ainsi qu'ajouté `generateStaticParams` + `revalidate = 3600` sur `/events/[slug]`. La story 27.2 a enrichi les articles avec JSON-LD `Article`, `BreadcrumbList` et `FAQPage`. Cette story 27.3 applique le même principe aux événements : enrichir la page détail avec des données structurées schema.org/Event et un BreadcrumbList.

Le site est en Next.js 16 App Router avec des Server Components. La page événement est déjà statique/revalidée. L'objectif est purement un **delta** d'enrichissement des données structurées pour le GEO, avec une attention particulière aux événements privés (visibilité `PRIVATE`) pour ne pas exposer de détails réservés aux membres dans le JSON-LD public.

## Acceptance Criteria

1. **AC-1 — JSON-LD Event complet sur chaque page événement (FR-GE09)**
   - **Given** une page événement détail publiée
   - **When** on inspecte le JSON-LD
   - **Then** un schema.org/Event est présent avec au moins : `name`, `description`, `startDate`, `endDate`, `organizer`
   - **And** `name` vaut `event.title`
   - **And** `startDate` et `endDate` sont au format ISO 8601 (`toISOString()`)
   - **And** `organizer` est de type `Organization` avec `name: "Ivoire Business Club"`

2. **AC-2 — Location physique de type Place (FR-GE09 / Gherkin)**
   - **Given** un événement avec `eventType === "IN_PERSON"` et `location` renseigné
   - **When** on inspecte le JSON-LD Event
   - **Then** `location` est de type `Place` avec `name` (texte de localisation) et `address` (même valeur)

3. **AC-3 — Location en ligne de type VirtualLocation (FR-GE09 / Gherkin)**
   - **Given** un événement avec `eventType === "ONLINE"` et `onlineUrl` renseigné
   - **When** on inspecte le JSON-LD Event
   - **Then** `location` est de type `VirtualLocation` avec `url` = `event.onlineUrl`

4. **AC-4 — Offers présent si pricing public (FR-GE09 / Gherkin)**
   - **Given** un événement avec un prix visiteur (`pricing.visitor > 0`)
   - **When** on inspecte le JSON-LD Event
   - **Then** `offers` est présent avec `price`, `priceCurrency: "XOF"`, et `availability`
   - **And** `availability` vaut `https://schema.org/InStock` si des places sont disponibles, sinon `https://schema.org/SoldOut`
   - **And** si l'événement est gratuit (`pricing` vide ou tous les prix à 0), `offers` n'est pas inclus (ou est explicite avec `price: 0` si le validateur l'exige)

5. **AC-5 — Image présente si coverImagePath existe (FR-GE09 / Gherkin)**
   - **Given** un événement avec `coverImagePath` renseigné
   - **When** on inspecte le JSON-LD Event
   - **Then** `image` est présente avec l'URL absolue de l'image de couverture (`${siteUrl}/api/media/events/${event.id}/cover`)
   - **And** si `coverImagePath` est absent, `image` pointe vers le logo IBC (`${siteUrl}/logo-ibc.webp`)

6. **AC-6 — BreadcrumbList JSON-LD sur chaque événement (FR-GE10)**
   - **Given** une page événement détail
   - **When** on inspecte le JSON-LD
   - **Then** un objet `BreadcrumbList` est présent
   - **And** il contient 3 `itemListElement` : `Accueil` (`/`), `Événements` (`/events`), `[titre de l'événement]` (`/events/[slug]`)
   - **And** chaque élément a `position` incrémental 1, 2, 3

7. **AC-7 — Événements privés : description masquée dans le JSON-LD (FR-GE11)**
   - **Given** un événement avec `visibility === "PRIVATE"`
   - **When** on inspecte le JSON-LD Event
   - **Then** `description` contient le message générique "Événement réservé aux membres"
   - **And** aucun détail privé (description complète, lieu, onlineUrl, prix membre) n'est exposé dans le JSON-LD public
   - **And** `eventStatus` vaut `https://schema.org/EventScheduled` (même logique que pour un événement public programmé)

8. **AC-8 — Sitemap lastModified déjà correct pour les événements (FR-GE12)**
   - **Given** le fichier `src/app/sitemap.ts`
   - **When** on inspecte la section événements
   - **Then** `lastModified` est déjà basé sur `event.updatedAt`
   - **And** aucune modification n'est requise pour cette story

9. **AC-9 — Build et tests sans régression**
   - **Given** le projet après implémentation
   - **When** `npm run build` est exécuté
   - **Then** le build passe sans erreur
   - **And** les tests existants de `src/app/(public)/events/[slug]/page.test.tsx` passent sans régression
   - **And** de nouveaux tests couvrent le JSON-LD Event et le BreadcrumbList

## Delta d'Implémentation (État Actuel → Cible)

### Fichier existant à modifier

1. **`src/app/(public)/events/[slug]/page.tsx`** — EXISTS
   - Ligne 27 : `export const revalidate = 3600;` déjà présent (story 27.1).
   - Actuellement : AUCUN JSON-LD structuré (contrairement aux articles qui ont déjà le pattern 27.2).
   - Cible : ajouter un `<script type="application/ld+json">` injectant un tableau `[eventLd, breadcrumbLd]`.
   - Cible : enrichir la requête `getEventBySlug` pour inclure `author: { select: { name: true } }` si l'on souhaite afficher l'organisateur (optionnel, l'AC-1 accepte `Ivoire Business Club` comme organizer par défaut).
   - Cible : construire `eventLd` avec les champs schema.org/Event requis.
   - Cible : gérer la visibilité `PRIVATE` pour masquer la description dans le JSON-LD public.

### Fichiers à ne PAS créer/modifier (hors scope / déjà faits)

- `src/app/robots.ts` — fait en 27.1.
- `src/app/llms.txt/route.ts` — fait en 27.1.
- `src/app/llms-full.txt/route.ts` — fait en 27.1.
- `src/app/sitemap.ts` — FR-GE12 déjà satisfait.
- `src/app/(public)/articles/[slug]/page.tsx` — story 27.2.

## Tasks / Subtasks

- [ ] **T1 — Enrichir la requête event si nécessaire** (AC: #1)
  - [ ] T1.1 Ajouter `author: { select: { name: true } }` dans `getEventBySlug` si l'on expose l'auteur comme organizer (sinon garder `Ivoire Business Club` comme valeur par défaut).
  - [ ] T1.2 S'assurer que la requête retourne tous les champs nécessaires : `id`, `title`, `slug`, `description`, `startDate`, `endDate`, `eventType`, `visibility`, `location`, `onlineUrl`, `coverImagePath`, `maxCapacity`, `pricing`, `status`, `updatedAt`.

- [ ] **T2 — Générer le JSON-LD Event** (AC: #1 à #5, #7)
  - [ ] T2.1 Construire l'objet `eventLd` avec `@context: "https://schema.org"` et `@type: "Event"`.
  - [ ] T2.2 Remplir `name`, `startDate`, `endDate` (ISO 8601, omettre `endDate` si null).
  - [ ] T2.3 `organizer` : `{ @type: "Organization", name: "Ivoire Business Club" }` (ou `event.author?.name` si l'auteur est exposé).
  - [ ] T2.4 `location` : `Place` avec `name`/`address` pour `IN_PERSON`, `VirtualLocation` avec `url` pour `ONLINE`.
  - [ ] T2.5 `offers` : conditionnel, uniquement si `pricing.visitor > 0`, avec `price`, `priceCurrency: "XOF"`, `availability` selon les places restantes, `validFrom` optionnel.
  - [ ] T2.6 `image` : URL absolue de couverture si présente, sinon logo IBC.
  - [ ] T2.7 `eventStatus` : `EventScheduled` pour les événements publics/privés programmés. Éventuellement `EventCancelled` si `status === "CANCELLED"` (cohérent avec le rendu de la page).
  - [ ] T2.8 Pour `visibility === "PRIVATE"`, forcer `description` à `"Événement réservé aux membres"`, masquer `location`, `onlineUrl`, `offers`, et tout contenu détaillé dans le JSON-LD.

- [ ] **T3 — Générer le BreadcrumbList JSON-LD** (AC: #6)
  - [ ] T3.1 Construire un objet `BreadcrumbList` avec 3 `ListItem`.
  - [ ] T3.2 Item 1 : `name: "Accueil"`, `item: siteUrl`, `position: 1`.
  - [ ] T3.3 Item 2 : `name: "Événements"`, `item: ${siteUrl}/events`, `position: 2`.
  - [ ] T3.4 Item 3 : `name: event.title`, `item: eventUrl`, `position: 3`.
  - [ ] T3.5 Injecter ce schema dans la page via le même `<script type="application/ld+json">` que l'Event (tableau de schemas).

- [ ] **T4 — Injecter les scripts JSON-LD dans le JSX** (AC: #1, #6)
  - [ ] T4.1 Utiliser `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([eventLd, breadcrumbLd]).replace(/</g, "\\u003c") }} />`.
  - [ ] T4.2 Placer le script dans le `<div>` racine de la page, avant `<LandingMobileNav />` (même pattern que les articles et les pages partenaires/experts).

- [ ] **T5 — Mettre à jour et compléter les tests** (AC: #9)
  - [ ] T5.1 Ouvrir `src/app/(public)/events/[slug]/page.test.tsx`.
  - [ ] T5.2 Ajouter un test qui vérifie que le JSON-LD `Event` est injecté avec les champs requis (`name`, `description`, `startDate`, `endDate`, `location`, `organizer`, `offers`, `image`).
  - [ ] T5.3 Ajouter un test qui vérifie le `BreadcrumbList` avec `Accueil > Événements > [titre]`.
  - [ ] T5.4 Ajouter un test pour un événement privé : la description JSON-LD doit être `"Événement réservé aux membres"` et aucun détail privé ne doit apparaître.
  - [ ] T5.5 Lancer `npx vitest run src/app/(public)/events/[slug]/page.test.tsx`.

- [ ] **T6 — Validation transversale** (AC: #9)
  - [ ] T6.1 Lancer `npm run build`.
  - [ ] T6.2 Lancer `npx vitest run src/app/(public)/events/[slug]/page.test.tsx`.
  - [ ] T6.3 Optionnel : valider le JSON-LD généré via https://search.google.com/test/rich-results avec un extrait de HTML.

## Dev Notes

### Contexte technique

- **Next.js 16.2.6 App Router**, `output: 'standalone'`.
- **Auth.js v5 beta.31** avec split config. La page événement appelle `auth()` ; en mode statique, `auth()` retourne `null` au build, ce qui est acceptable pour le JSON-LD public. L'utilisateur connecté verra le rendu statique de base ; le JSON-LD public reste cohérent.
- **Prisma 7.8.0** : modèle `Event` défini dans `prisma/schema.prisma` (lignes 557-583). Champs utiles : `title`, `slug`, `description`, `startDate`, `endDate`, `eventType`, `visibility`, `location`, `onlineUrl`, `coverImagePath`, `maxCapacity`, `pricing` (Json), `status`, `updatedAt`, `createdAt`, `authorId`.
- **Tests co-localisés** : `src/app/(public)/events/[slug]/page.test.tsx` avec Vitest + mocks Prisma/auth.
- **Utilitaires events** : `src/lib/event-utils.ts` expose `normalizePricing`, `formatEventPricing`, `getRemainingSpots`, `getPriceForTier`, `isPrivateEventForVisitor`, `formatEventDate`, etc.

### Architecture / Guardrails

- **JSON-LD Next.js** : injecter via `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas).replace(/</g, "\\u003c") }} />`. Échapper les `<` pour éviter les injections HTML.
- **Multi-schemas** : embarquer `[eventLd, breadcrumbLd]` dans un seul `<script>`, comme déjà fait dans `src/app/(public)/articles/[slug]/page.tsx`.
- **URL absolues** : toujours préfixer `siteUrl` aux chemins relatifs (`/logo-ibc.webp`, `/api/media/events/${id}/cover`).
- **Contenu privé** : quand `visibility === "PRIVATE"`, le JSON-LD public doit refléter uniquement le titre, la date, le statut programmé et le message générique. Ne JAMAIS exposer `description` complète, `location`, `onlineUrl` ou `pricing` membre.
- **`eventStatus`** : utiliser l'URL canonique schema.org : `https://schema.org/EventScheduled`. Si l'événement est annulé (`status === "CANCELLED"`), utiliser `https://schema.org/EventCancelled`.
- **`offers`** : schema.org attend `price` (number ou string), `priceCurrency` (ISO 4217 : `XOF`), et `availability` (`https://schema.org/InStock` ou `https://schema.org/SoldOut` ou `https://schema.org/InStoreOnly`). Pour un événement gratuit, ne pas inclure `offers` est acceptable.
- **`location`** : pour `IN_PERSON`, `Place` avec `name` et `address` (même texte). Pour `ONLINE`, `VirtualLocation` avec `url`. Ne pas mélanger les deux.
- **JSX Boolean Guardrail** : pré-calculer tous les booléens composés avant le `return`. Ne pas utiliser `&&` dans le JSX.
- **Ne pas réintroduire `force-dynamic`** : la story 27.1 l'a retiré.

### Fichiers impactés

| Fichier | Action | Raison |
|---------|--------|--------|
| `src/app/(public)/events/[slug]/page.tsx` | UPDATE | Ajouter JSON-LD Event + BreadcrumbList, gérer visibilité privée |
| `src/app/(public)/events/[slug]/page.test.tsx` | UPDATE | Ajouter des assertions JSON-LD Event et BreadcrumbList |
| `_bmad-output/implementation-artifacts/sprint-status.yaml` | UPDATE | Story 27-3 → ready-for-dev |

### Détails techniques

#### 1. Exemple de JSON-LD Event cible (événement public en présentiel)

```json
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "Lancement Réseau IBC",
  "description": "Une soirée de networking pour les membres et investisseurs du réseau IBC.",
  "startDate": "2026-07-15T10:00:00.000Z",
  "endDate": "2026-07-15T14:00:00.000Z",
  "eventStatus": "https://schema.org/EventScheduled",
  "location": {
    "@type": "Place",
    "name": "Abidjan, Cocody",
    "address": "Abidjan, Cocody"
  },
  "organizer": {
    "@type": "Organization",
    "name": "Ivoire Business Club"
  },
  "offers": {
    "@type": "Offer",
    "price": 10000,
    "priceCurrency": "XOF",
    "availability": "https://schema.org/InStock",
    "validFrom": "2026-07-01T00:00:00.000Z"
  },
  "image": "https://www.ivoire-business-club.com/api/media/events/evt-1/cover"
}
```

#### 2. Exemple de JSON-LD Event cible (événement en ligne)

```json
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "Webinaire Investir en Côte d'Ivoire",
  "description": "Une soirée de networking pour les membres et investisseurs du réseau IBC.",
  "startDate": "2026-07-15T10:00:00.000Z",
  "eventStatus": "https://schema.org/EventScheduled",
  "location": {
    "@type": "VirtualLocation",
    "url": "https://meet.example.com/abc123"
  },
  "organizer": {
    "@type": "Organization",
    "name": "Ivoire Business Club"
  },
  "image": "https://www.ivoire-business-club.com/logo-ibc.webp"
}
```

#### 3. Exemple de JSON-LD Event pour événement privé (visiteur non connecté)

```json
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "Soirée exclusive membres",
  "description": "Événement réservé aux membres",
  "startDate": "2026-08-01T18:00:00.000Z",
  "eventStatus": "https://schema.org/EventScheduled",
  "organizer": {
    "@type": "Organization",
    "name": "Ivoire Business Club"
  },
  "image": "https://www.ivoire-business-club.com/logo-ibc.webp"
}
```

> **Note :** pour un événement privé, `location`, `onlineUrl` et `offers` ne doivent PAS être présents dans le JSON-LD public.

#### 4. Exemple de BreadcrumbList

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Accueil",
      "item": "https://www.ivoire-business-club.com/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Événements",
      "item": "https://www.ivoire-business-club.com/events"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Lancement Réseau IBC",
      "item": "https://www.ivoire-business-club.com/events/lancement-reseau-ibc"
    }
  ]
}
```

#### 5. Exemple d'injection dans le JSX (src/app/(public)/events/[slug]/page.tsx)

```typescript
const siteUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://www.ivoire-business-club.com").replace(/\/$/, "");
const eventUrl = `${siteUrl}/events/${slug}`;
const isPrivateVisitor = isPrivateEventForVisitor(event.visibility, isAuthenticated);

const eventImageUrl = event.coverImagePath
  ? `${siteUrl}/api/media/events/${event.id}/cover`
  : `${siteUrl}/logo-ibc.webp`;

const pricing = normalizePricing(event.pricing);
const { visitor, isFree } = formatEventPricing(pricing);
const remainingSpots = getRemainingSpots(event.maxCapacity, event.registrations);

const hasPublicOffers = !isPrivateVisitor && !isFree && visitor !== null && visitor > 0;

const eventLd: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "Event",
  "name": event.title,
  "description": isPrivateVisitor ? "Événement réservé aux membres" : event.description,
  "startDate": event.startDate.toISOString(),
  "eventStatus": event.status === "CANCELLED"
    ? "https://schema.org/EventCancelled"
    : "https://schema.org/EventScheduled",
  "organizer": {
    "@type": "Organization",
    "name": "Ivoire Business Club",
  },
  "image": eventImageUrl,
};

if (event.endDate) {
  eventLd.endDate = event.endDate.toISOString();
}

if (!isPrivateVisitor) {
  if (event.eventType === "ONLINE" && event.onlineUrl) {
    eventLd.location = {
      "@type": "VirtualLocation",
      "url": event.onlineUrl,
    };
  } else if (event.eventType === "IN_PERSON" && event.location) {
    eventLd.location = {
      "@type": "Place",
      "name": event.location,
      "address": event.location,
    };
  }

  if (hasPublicOffers) {
    eventLd.offers = {
      "@type": "Offer",
      "price": visitor,
      "priceCurrency": "XOF",
      "availability": remainingSpots === 0
        ? "https://schema.org/SoldOut"
        : "https://schema.org/InStock",
    };
  }
}

const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Accueil", "item": siteUrl },
    { "@type": "ListItem", "position": 2, "name": "Événements", "item": `${siteUrl}/events` },
    { "@type": "ListItem", "position": 3, "name": event.title, "item": eventUrl },
  ],
};

const schemas = [eventLd, breadcrumbLd];
```

Puis dans le JSX :

```tsx
<div className="flex min-h-screen flex-col bg-[#090D16] text-white">
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas).replace(/</g, "\\u003c") }}
  />
  <LandingMobileNav />
  ...
</div>
```

### Pièges à éviter

1. **Ne pas réintroduire `force-dynamic`.** La story 27.1 l'a retiré.
2. **Ne pas exposer de contenu premium dans le JSON-LD.** Si `event.visibility === "PRIVATE"`, la description JSON-LD doit être le message générique et les champs sensibles masqués.
3. **Les URLs absolues sont obligatoires dans schema.org.** Toujours concaténer `siteUrl`.
4. **`offers` uniquement si prix visiteur > 0.** Un événement gratuit ne doit pas générer d'offre payante.
5. **`eventStatus` en URL absolue.** Utiliser `https://schema.org/EventScheduled`, pas la chaîne `"EventScheduled"`.
6. **`location` : un seul type par événement.** Pas de `Place` + `VirtualLocation` simultanés.
7. **Tests existants** : le mock `baseEvent` dans `page.test.tsx` contient déjà `coverImagePath`, `location`, `onlineUrl`, `pricing`, `eventType`. Ajouter des assertions JSON-LD en récupérant le `<script type="application/ld+json">`.
8. **Valeurs `Date` non valides :** vérifier `!isNaN(event.startDate.getTime())` avant `toISOString()` si les données mockées peuvent être instables.
9. **Ne pas modifier `src/app/sitemap.ts`** : FR-GE12 est déjà satisfait (`lastModified: event.updatedAt`).
10. **Utiliser `isPrivateEventForVisitor`** : cette fonction existante (`visibility === "PRIVATE" && !isAuthenticated`) est la source de vérité pour savoir si le visiteur courant doit voir un teaser.

### Références

- Epic 27 GEO dans `_bmad-output/planning-artifacts/epics.md` (sections correspondantes).
- Sprint Change Proposal GEO : `_bmad-output/planning-artifacts/sprint-change-proposal-2026-07-09-geo.md` (FR-GE09 à FR-GE12).
- Story 27.1 précédente : `_bmad-output/implementation-artifacts/27-1-infrastructure-geo-technique.md`.
- Story 27.2 précédente : `_bmad-output/implementation-artifacts/27-2-schema-geo-articles.md` (pattern JSON-LD + BreadcrumbList à suivre).
- Fichier existant : `src/app/(public)/events/[slug]/page.tsx`.
- Fichier de référence : `src/app/(public)/articles/[slug]/page.tsx` (pattern 27.2).
- Sitemap : `src/app/sitemap.ts` (FR-GE12 déjà OK).
- Modèle Event : `prisma/schema.prisma` lignes 557-583.
- Utilitaires Event : `src/lib/event-utils.ts`.

## Dev Agent Record

### Agent Model Used

kimi-k2.7-code

### Debug Log References

- Baseline commit : ddeb087686580ddf6975218de3fbb6872f2717f6 (story 27-2 marquée done après review PASS).

### Completion Notes List

- Story 27.3 identifiée dans `sprint-status.yaml` comme `backlog` → passage à `ready-for-dev`.
- Fichier de story créé avec le contexte complet GEO pour les événements, les guardrails de contenu privé, le pattern JSON-LD/BreadcrumbList, et la vérification FR-GE12.
- Aucune implémentation de code effectuée à ce stade (phase create-story uniquement).

### File List

- `_bmad-output/implementation-artifacts/story-27-3.md` (NEW)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (UPDATE : statut 27-3 → ready-for-dev)

### Change Log

- 2026-07-09 — Création du contexte de la story 27.3 : schema structuré GEO pour événements.
