# Sprint Change Proposal — 2026-07-04

## Epic 25 : Plateforme d'Événements — Couverture, Visibilité, Tarification & Galerie

**Auteur :** Session Party-Mode (John/PM, Mary/Analyst, Sally/UX, Winston/Architect, Amelia/Dev, Paige/TW)
**Date :** 2026-07-04
**Projet :** IBC (Ivoire Business Club)
**Statut :** En attente d'approbation PO

---

## 1. Résumé du Changement

### 1.1 Déclencheur

Epic 12 (Événements) est terminé avec 3 stories (12-1, 12-2, 12-3) couvrant un MVP basique : modèle Event avec `title, description, startDate, endDate, location, imageUrl, status`, CRUD admin, page calendrier publique, composant landing popup. Le PO (Jonathan) souhaite étendre significativement les fonctionnalités événements pour en faire une **source de revenus non négligeable** et un **levier de conversion d'abonnement**.

### 1.2 Contexte de découverte

Session Party-Mode le 2026-07-04 avec les 6 agents BMAD installés. Décisions validées par le PO :

1. **Upload photo de couverture** : remplacement de `imageUrl` (URL externe) par upload direct sur le VPS
2. **Événements en ligne vs présentiel** : distinction par `eventType` (ONLINE / IN_PERSON)
3. **Événements publics vs privés** : `visibility` (PUBLIC / PRIVATE), les privés réservés aux membres connectés
4. **Teaser pour visiteurs** : les events privés sont visibles mais floutés sur la page publique, avec CTA « Devenir membre »
5. **Tarification par tier d'abonnement** : grille JSON `{ visitor, affranchi, grand_frere, boss }` en FCFA, Boss souvent gratuit
6. **Inscription avec paiement** : même système que les abonnements (virement + mobile money Epic 11), option « payer sur place » avec avertissement places non garanties
7. **Compteur de places** : décompte en temps réel sur la page event, basé sur `EventRegistration` + `maxCapacity`
8. **Galerie collaborative post-event** : upload photos par membres ET admin, page dédiée dans le dashboard + section « Moments IBC » sur la landing

---

## 2. Analyse d'Impact

### 2.1 Impact sur le PRD

Le PRD actuel (v1.1) ne contient **aucune FR dédiée aux événements**. Epic 12 avait été ajouté sans mise à jour du PRD. Ce proposal ajoute une nouvelle section FR 8.10.

| Section PRD | Impact |
|---|---|
| §8 Exigences Fonctionnelles | Ajout §8.10 « Événements & Inscriptions » (FR80–FR92) |
| §9 NFR | NFR-I3 (stockage R2) : ajout stockage VPS pour images events |
| §11.2 Risques | Ajout : capacité événement dépassée, no-show avec place perdue |
| §12 Feuille de route | Ajout Epic 25 dans le roadmap post-Epic 24 |

### 2.2 Impact sur les Epics

| Epic | Statut | Impact |
|---|---|---|
| Epic 12 (done) | Terminé | Non invalidé — le modèle Event existant est étendu, pas remplacé. Les 3 stories 12-x restent valides. |
| **Epic 25 (nouveau)** | Backlog | 6 stories nouvelles, dépendance linéaire (25-1 débloque 25-2 à 25-6) |

### 2.3 Impact sur l'Architecture

| Composant | Impact |
|---|---|
| Prisma schema | Ajout enums `EventType`, `EventVisibility`, `RegistrationStatus`. Extension modèle `Event` (7 nouveaux champs). Nouveaux modèles `EventRegistration`, `EventGalleryPhoto`. |
| Stockage fichiers | Nouveau : stockage local VPS `/var/www/ibc-media/events/{eventId}/` pour couvertures + galerie. Sert via route API Next.js. Nginx cache-control. **Différent de R2** (réservé aux documents juridiques). |
| API routes | Nouvelles : upload couverture, upload galerie, inscription event, liste inscrits admin, galerie publique |
| Form admin | Refactor complet : form basique → form en sections (5 étapes) avec upload file, select eventType/visibility, grille tarifaire |
| Page publique events | Refactor : cards avec blur CSS pour events privés, badges type/visibilité, grille prix par tier, compteur places |
| Landing page | Nouvelle section « Moments IBC » (carousel photos derniers events) |
| Dashboard | Nouvelle page « Événements passés » avec galerie photos |
| Paiement | Réutilisation du modèle `Payment` existant (provider BANK_TRANSFER / MOBILE_MONEY) pour les inscriptions payantes |
| Dépendances | Ajout `sharp` (resize/optimisation images upload) |

### 2.4 Impact Technique

- **Migration Prisma** : ajout de champs au modèle Event existant + 2 nouveaux modèles. L'event existant (1 seul en base) perdra son `imageUrl` — l'admin re-uploadera la couverture.
- **Stockage VPS** : créer le dossier `/var/www/ibc-media/events/` avec permissions appropriées sur le VPS de production. Nginx config pour servir ce dossier avec cache-control.
- **`sharp`** : nouvelle dépendance native. Vérifier la compatibilité avec l'environnement de build Next.js 16 standalone.
- **Sécurité upload** : validation type MIME (jpeg/png/webp), taille max (5MB couverture, 10MB galerie), sanitization nom de fichier, resize automatique (couverture: 1920x1080 max, galerie: 1200x800 max).
- **PostHog** : tracking des événements métier : `event_view`, `event_register`, `event_register_private_teaser_conversion` (visiteur → signup via teaser event privé).

---

## 3. Approche Recommandée

**Approche : Adjustment Direct — nouvel epic additif**

- Aucun rollback nécessaire (Epic 12 reste valide, on étend le modèle)
- Nouvel Epic 25 avec 6 stories en dépendance linéaire
- Le PO a déjà validé toutes les décisions produit pendant le party-mode
- Effort estimé : 6 stories, complexité moyenne-élevée (migration, upload, paiement, galerie)
- Risque : moyen (migration schema + nouveau système de stockage, mais réutilisation des patterns paiement existants)
- Impact timeline : ajoute ~2-3 sprints de travail après Epic 24

---

## 4. Propositions de Changement Détaillées

### 4.1 PRD — Nouvelle Section 8.10 : Événements & Inscriptions

Ajouter après §8.9 (Support Bêta & Feedback) :

```markdown
### 8.10 Événements & Inscriptions

- **FR80** : L'admin peut créer un événement avec un type (EN_LIGNE ou EN_PRESENTIEL) et une visibilité (PUBLIC ou PRIVÉ)
- **FR81** : L'admin peut uploader une image de couverture pour chaque événement (stockage VPS, formats jpeg/png/webp, max 5MB, redimensionnement automatique)
- **FR82** : Pour un événement EN_PRESENTIEL, le lieu est requis ; pour un événement EN_LIGNE, un lien de visioconférence est requis
- **FR83** : L'admin peut définir une capacité maximale (maxCapacity) pour un événement
- **FR84** : L'admin peut définir une grille tarifaire par tier : prix visiteur, prix Affranchi, prix Grand Frère, prix Boss (en FCFA). Un prix null/0 signifie gratuit pour ce tier.
- **FR85** : Les événements PUBLIC sont visibles par tous les visiteurs, membres et non-membres
- **FR86** : Les événements PRIVÉ sont visibles sur la page /events mais floutés pour les visiteurs non-membres (titre + date visibles, lieu et détails floutés) avec un CTA « Devenir membre pour réserver »
- **FR87** : Les membres connectés voient les événements PRIVÉ sans flou et peuvent s'inscrire
- **FR88** : Un membre ou visiteur (pour events PUBLIC) peut s'inscrire à un événement en choisissant son mode de paiement : virement bancaire, mobile money (Wave/Orange Money), ou paiement sur place
- **FR89** : Le système affiche en temps réel le nombre de places restantes sur la page de l'événement (maxCapacity - inscriptions confirmées)
- **FR90** : Le système avertit les utilisateurs choisissant « payer sur place » que les places ne sont pas garanties
- **FR91** : L'admin peut consulter la liste des inscrits à un événement avec leur tier, mode de paiement et statut d'inscription
- **FR92** : Les membres et l'admin peuvent uploader des photos dans la galerie d'un événement passé. L'admin peut modérer (supprimer) les photos. Une section « Moments IBC » sur la landing page affiche les photos des derniers événements.
```

### 4.2 PRD — NFR-I3 (mise à jour)

```markdown
- **NFR-I3** : Stockage des documents juridiques sur Cloudflare R2 (pas de frais de sortie). Stockage des images d'événements (couvertures + galerie) sur le VPS local (/var/www/ibc-media/events/).
```

### 4.3 Architecture — Modèle de données Prisma

```prisma
enum EventType {
  ONLINE
  IN_PERSON
}

enum EventVisibility {
  PUBLIC
  PRIVATE
}

enum RegistrationStatus {
  REGISTERED
  ATTENDED
  CANCELLED
  NO_SHOW
}

model Event {
  id             String          @id @default(cuid())
  title          String
  slug           String          @unique
  description    String
  startDate      DateTime
  endDate        DateTime?
  eventType      EventType       @default(IN_PERSON)
  visibility     EventVisibility @default(PUBLIC)
  location       String?         // requis si IN_PERSON, null si ONLINE
  onlineUrl      String?         // lien visio si ONLINE
  coverImagePath String?         // chemin VPS /var/www/ibc-media/events/{id}/cover.{ext}
  maxCapacity    Int?
  pricing        Json?           // { "visitor": 10000, "affranchi": 5000, "grand_frere": 3000, "boss": 0 }
  status         EventStatus     @default(DRAFT)
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  authorId       String
  author         User            @relation(fields: [authorId], references: [id], onDelete: Cascade)
  registrations  EventRegistration[]
  galleryPhotos  EventGalleryPhoto[]

  @@index([startDate])
  @@index([status, startDate])
  @@index([visibility, status, startDate])
  @@map("events")
}

model EventRegistration {
  id           String             @id @default(cuid())
  eventId      String
  userId       String?
  email        String             // pour visiteurs non-membres (events PUBLIC)
  tierSnapshot Tier               // snapshot du tier au moment de l'inscription
  amountPaid   Int?               // 0 si gratuit, null si pay-on-site
  payOnSite    Boolean            @default(false)
  status       RegistrationStatus @default(REGISTERED)
  createdAt    DateTime           @default(now())
  event        Event              @relation(fields: [eventId], references: [id], onDelete: Cascade)
  user         User?              @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@unique([eventId, userId])
  @@unique([eventId, email])
  @@index([eventId, status])
  @@map("event_registrations")
}

model EventGalleryPhoto {
  id           String   @id @default(cuid())
  eventId      String
  uploadedById String
  filePath     String   // chemin VPS /var/www/ibc-media/events/{eventId}/gallery/{filename}
  caption      String?
  createdAt    DateTime @default(now())
  event        Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  uploader     User     @relation(fields: [uploadedById], references: [id], onDelete: Cascade)

  @@index([eventId, createdAt])
  @@map("event_gallery_photos")
}
```

Relations à ajouter sur `User` :
```prisma
  eventRegistrations  EventRegistration[]
  galleryPhotos       EventGalleryPhoto[]
```

### 4.4 Architecture — Stockage VPS

```
/var/www/ibc-media/
  events/
    {eventId}/
      cover.{ext}          # image de couverture (redimensionnée 1920x1080 max)
      gallery/
        {uuid}.{ext}       # photos galerie (redimensionnées 1200x800 max)
```

Route API de service : `GET /api/media/events/{eventId}/cover` → lit le fichier sur disque, renvoie avec `Content-Type` et `Cache-Control: public, max-age=31536000`. Idem pour galerie : `GET /api/media/events/{eventId}/gallery/{photoId}`.

Nginx : bloc location `/media/` avec alias vers `/var/www/ibc-media/` + cache-control 1 an (alternative : servir directement via Nginx sans passer par Next.js pour les performances).

### 4.5 Epics — Nouvel Epic 25

Ajouter après Epic 24 dans `epics.md` :

```markdown
## Epic 25 : Plateforme d'Événements — Couverture, Visibilité, Tarification & Galerie

Transformer le MVP événements (Epic 12) en une plateforme complète générant des revenus et servant de levier de conversion d'abonnement. Ajoute : upload de couverture sur VPS, distinction en ligne/présentiel, visibilité public/privé avec teaser flouté pour les visiteurs, tarification par tier d'abonnement, inscription avec paiement, compteur de places en temps réel, et galerie collaborative post-event.

**FRs couverts :** FR80–FR92 (Événements & Inscriptions)
**NFRs couverts :** NFR-I3 (stockage VPS images events), NFR-P2 (temps réponse API), NFR-A1 (accessibilité)
**Dépendances :** Epic 12 (modèle Event de base), Epic 11 (mobile money), Epic 2 (virement bancaire)

---

### Story 25-1 : Migration modèle Event + pricing + visibility + eventType

**En tant qu'** admin,
**Je veux** que le modèle Event supporte le type d'événement, la visibilité, la tarification et la capacité,
**Afin de** pouvoir créer des événements différenciés (en ligne/présentiel, public/privé, payant/gratuit).

**Acceptance Criteria :**

**Given** le schéma Prisma actuel avec le modèle Event basique
**When** la migration est exécutée
**Then** le modèle Event inclut : `eventType` (ONLINE/IN_PERSON, default IN_PERSON), `visibility` (PUBLIC/PRIVATE, default PUBLIC), `location` devient optionnel, `onlineUrl` (String?), `coverImagePath` (String?, remplace imageUrl), `maxCapacity` (Int?), `pricing` (Json?), et les nouveaux modèles `EventRegistration` et `EventGalleryPhoto` sont créés avec leurs relations

**Given** un événement existant en base avec `imageUrl`
**When** la migration s'exécute
**Then** le champ `imageUrl` est renommé/dropé et l'event existant n'a plus de couverture (l'admin re-uploadera via Story 25-2)

**Given** les nouveaux enums EventType, EventVisibility, RegistrationStatus
**When** `npx prisma generate` est exécuté
**Then** les types TypeScript sont générés et disponibles dans `@/generated/prisma/client`

**Given** les schémas de validation Zod
**When** ils sont mis à jour
**Then** `eventCreateSchema` et `eventUpdateSchema` incluent : eventType, visibility, location (optionnel), onlineUrl (optionnel), maxCapacity (optionnel), pricing (optionnel, structure JSON validée), coverImagePath (optionnel). La validation exige `location` si `eventType = IN_PERSON` et `onlineUrl` si `eventType = ONLINE`.

**Given** le build et les tests
**When** `npm run build` et `npx vitest run` sont exécutés
**Then** le build passe et les tests existants restent verts (rétro-compatibilité)

---

### Story 25-2 : Upload couverture VPS + refactor form admin

**En tant qu'** admin,
**Je veux** uploader une image de couverture pour chaque événement et remplir un formulaire en sections,
**Afin de** créer des événements avec une présentation professionnelle et toutes les métadonnées nécessaires.

**Acceptance Criteria :**

**Given** l'admin sur le formulaire de création/édition d'événement
**When** il remplit le formulaire
**Then** le formulaire est organisé en sections : (1) Infos générales [titre, description, type, visibilité], (2) Logistique [dates, lieu ou lien visio, capacité max], (3) Couverture [upload image], (4) Tarification [prix public + grille par tier], (5) Publication [statut]

**Given** l'admin sur la section Couverture
**When** il sélectionne un fichier image (jpeg/png/webp, max 5MB)
**Then** l'image est uploadée via `/api/admin/events/[id]/cover`, redimensionnée avec `sharp` (1920x1080 max), stockée dans `/var/www/ibc-media/events/{eventId}/cover.{ext}`, et le chemin est sauvegardé dans `coverImagePath`

**Given** un fichier non image ou dépassant 5MB
**When** l'admin tente l'upload
**Then** une erreur de validation s'affiche et l'upload est rejeté

**Given** un événement avec `eventType = IN_PERSON`
**When** l'admin soumet le formulaire
**Then** le champ `location` est requis et validé

**Given** un événement avec `eventType = ONLINE`
**When** l'admin soumet le formulaire
**Then** le champ `onlineUrl` est requis et validé (URL valide)

**Given** la section Tarification
**When** l'admin saisit les prix
**Then** il peut définir un prix pour chaque tier (visiteur, affranchi, grand_frere, boss) en FCFA. Un champ vide ou 0 = gratuit pour ce tier. Si tous les prix sont vides/nuls, l'événement est gratuit (pricing = null).

**Given** l'upload de couverture
**When** l'image est stockée
**Then** elle est servie via `/api/media/events/{eventId}/cover` avec Content-Type approprié et Cache-Control: public, max-age=31536000

**Given** le build et les tests
**When** `npm run build` et les tests du form sont exécutés
**Then** le build passe et les tests vérifient : validation des champs, upload mock, gestion d'erreur

---

### Story 25-3 : Page event publique avec teaser privé + compteur places + grille tarifaire

**En tant que** visiteur ou membre,
**Je veux** consulter la page d'un événement avec toutes les informations pertinentes,
**Afin de** décider si je m'inscris ou si je deviens membre pour accéder aux events privés.

**Acceptance Criteria :**

**Given** un visiteur non connecté sur la page `/events`
**When** il consulte la liste des événements
**Then** les events PUBLIC s'affichent normalement (image de couverture, titre, date, lieu/lien, badge type, prix à partir de)

**Given** un visiteur non connecté sur la page `/events`
**When** il consulte la liste et qu'un event PRIVÉ existe
**Then** la card de l'event privé affiche : image de couverture floutée (CSS blur), badge 🔒 Privé, titre + date visibles, lieu flouté, prix membre barré visible, bouton « Devenir membre pour réserver » → `/signup`

**Given** un membre connecté sur la page `/events`
**When** il consulte la liste
**Then** les events PRIVÉ s'affichent sans flou et avec un bouton « S'inscrire »

**Given** un visiteur ou membre sur la page de détail `/events/[slug]`
**When** l'événement a un `maxCapacity` défini
**Then** le nombre de places restantes s'affiche : « X places restantes » (maxCapacity - count des inscriptions REGISTERED). Si maxCapacity est null → « Places illimitées »

**Given** un visiteur ou membre sur la page de détail
**When** l'événement a une grille tarifaire
**Then** les prix s'affichent par tier : « Visiteur : X FCFA | Membres : à partir de Y FCFA ». Le membre connecté voit son tarif spécifique mis en avant : « Votre tarif (Affranchi) : Y FCFA »

**Given** un event PRIVÉ et un visiteur non connecté
**When** il tente d'accéder à `/events/[slug]` pour un event privé
**Then** la page affiche le teaser (titre, date, description floutée) avec CTA « Devenir membre » au lieu du contenu complet et du bouton d'inscription

**Given** le build et les tests
**When** `npm run build` et les tests sont exécutés
**Then** le build passe et les tests vérifient : affichage public/privé, blur conditionnel, compteur places, grille tarifaire

---

### Story 25-4 : Inscription + paiement event (virement + mobile money + pay-on-site)

**En tant qu'** utilisateur (membre ou visiteur pour events public),
**Je veux** m'inscrire à un événement et payer selon mon mode de paiement préféré,
**Afin de** réserver ma place et recevoir une confirmation.

**Acceptance Criteria :**

**Given** un membre connecté sur la page d'un événement PUBLIC ou PRIVÉ avec places disponibles
**When** il clique sur « S'inscrire »
**Then** un formulaire d'inscription s'affiche avec : choix du mode de paiement (virement / mobile money / sur place), et le montant basé sur son tier

**Given** un visiteur non connecté sur la page d'un événement PUBLIC
**When** il clique sur « S'inscrire »
**Then** il doit saisir son email (pas besoin de compte) et choisir son mode de paiement (tarif visiteur)

**Given** un utilisateur choisissant « payer sur place »
**When** il valide
**Then** un avertissement s'affiche : « Attention : les places ne sont pas garanties pour le paiement sur place. Pré-inscrivez-vous pour réserver votre place. » et l'inscription est créée avec `payOnSite: true, amountPaid: null`

**Given** un utilisateur choisissant virement ou mobile money
**When** il valide
**Then** le système crée un enregistrement `Payment` (provider BANK_TRANSFER ou MOBILE_MONEY) et une `EventRegistration` avec `status: REGISTERED, amountPaid: montant du tier`

**Given** un événement avec maxCapacity atteint (plus de places)
**When** un utilisateur tente de s'inscrire
**Then** le bouton « S'inscrire » est désactivé et affiche « Complet »

**Given** un utilisateur déjà inscrit à un événement
**When** il tente de s'inscrire à nouveau
**Then** une erreur s'affiche « Vous êtes déjà inscrit à cet événement » (contrainte unique eventId+userId / eventId+email)

**Given** l'admin sur `/admin/events/[id]/registrations`
**When** il consulte la liste des inscrits
**Then** il voit : nom/email, tier, mode de paiement, montant, statut d'inscription, avec tri et filtre par statut

**Given** le build et les tests
**When** `npm run build` et les tests sont exécutés
**Then** le build passe et les tests vérifient : création inscription, gestion capacité, contrainte unique, pay-on-site, liste admin

---

### Story 25-5 : Galerie collaborative post-event

**En tant qu'** admin ou membre,
**Je veux** uploader des photos d'un événement passé dans une galerie collaborative,
**Afin de** partager les moments IBC et créer de l'engagement.

**Acceptance Criteria :**

**Given** un membre ou admin connecté sur la page d'un événement passé (startDate < now)
**When** il accède à la galerie `/dashboard/events/[slug]/gallery`
**Then** il voit les photos existantes et un bouton « Ajouter des photos »

**Given** un membre ou admin qui upload une photo (jpeg/png/webp, max 10MB)
**When** il sélectionne un fichier
**Then** l'image est uploadée via `/api/events/[id]/gallery`, redimensionnée avec `sharp` (1200x800 max), stockée dans `/var/www/ibc-media/events/{eventId}/gallery/{uuid}.{ext}`, et un enregistrement `EventGalleryPhoto` est créé

**Given** l'admin sur la galerie
**When** il consulte
**Then** il voit toutes les photos avec le nom de l'uploader et peut supprimer des photos (modération)

**Given** un membre sur la galerie
**When** il consulte
**Then** il voit toutes les photos mais ne peut supprimer que les siennes

**Given** la galerie publique d'un événement
**When** un visiteur accède à `/events/[slug]` (si PUBLIC) ou un membre (si PRIVÉ)
**Then** la galerie s'affiche en bas de la page de l'événement avec les photos en grid responsive

**Given** le build et les tests
**When** `npm run build` et les tests sont exécutés
**Then** le build passe et les tests vérifient : upload mock, permissions (membre vs admin suppression), affichage galerie

---

### Story 25-6 : Section « Moments IBC » sur landing + page dashboard events passés

**En tant que** visiteur ou membre,
**Je veux** voir les moments forts des événements IBC passés,
**Afin de** ressentir l'énergie de la communauté et être incité à participer/rejoindre.

**Acceptance Criteria :**

**Given** la landing page `/`
**When** un visiteur scroll jusqu'à la section « Moments IBC »
**Then** un carousel ou grid de photos des derniers événements s'affiche (sélection automatique : 8-12 photos les plus récentes depuis les galeries d'événements passés PUBLISHED)

**Given** un visiteur sur la section « Moments IBC »
**When** il clique sur une photo
**Then** il est redirigé vers la page de l'événement correspondant (si PUBLIC) ou vers un teaser (si PRIVÉ) avec CTA membre

**Given** un membre connecté sur le dashboard `/dashboard/events`
**When** il accède à la section « Événements passés »
**Then** il voit une liste des événements passés avec leur galerie photos en aperçu (thumbnail grid)

**Given** la page dashboard events passés
**When** le membre clique sur un événement
**Then** il est redirigé vers la galerie complète de cet événement `/dashboard/events/[slug]/gallery`

**Given** le build et les tests
**When** `npm run build` et les tests sont exécutés
**Then** le build passe et les tests vérifient : affichage carousel landing, affichage liste dashboard, navigation vers galerie
```

### 4.6 Sprint Status — Entrées Epic 25

Ajouter dans `sprint-status.yaml` :

```yaml
  epic-25: backlog
  25-1-migration-modele-event-extended: backlog
  25-2-upload-couverture-vps-form-admin: backlog
  25-3-page-event-publique-teaser-prive-places: backlog
  25-4-inscription-paiement-event: backlog
  25-5-galerie-collaborative-post-event: backlog
  25-6-moments-ibc-landing-dashboard: backlog
  epic-25-retrospective: optional
```

---

## 5. Handoff pour Implémentation

### 5.1 Classification du changement

**Moderate** : Nouvel epic avec 6 stories, pas de rollback, dépendances linéaires. Réutilisation des patterns existants (Payment, mobile money, upload) mais nouveau système de stockage VPS.

### 5.2 Séquence d'implémentation

| Ordre | Story | Dépendance | Peut paralléliser avec |
|---|---|---|---|
| 1 | 25-1 Migration modèle | Aucune | — |
| 2 | 25-2 Upload couverture + form | 25-1 | — |
| 3 | 25-3 Page publique + teaser + places | 25-1 | 25-2 |
| 4 | 25-4 Inscription + paiement | 25-1, 25-3 | 25-2 |
| 5 | 25-5 Galerie collaborative | 25-1 | 25-3, 25-4 |
| 6 | 25-6 Moments IBC + dashboard | 25-1, 25-5 | 25-4 |

### 5.3 Critères de succès

- Le build Next.js passe avec la nouvelle migration Prisma
- Les tests unitaires couvrent : validation form, upload, inscription, compteur places, permissions galerie
- Le stockage VPS fonctionne en local dev (dossier local) et en production (VPS)
- L'event existant migre sans crash (perte de couverture acceptée)
- PostHog tracke les nouveaux événements métier

### 5.4 Pré-requis techniques

- Installer `sharp` : `npm install sharp`
- Créer le dossier de stockage local pour le dev : `mkdir -p public/ibc-media/events/` (ou variable d'env `MEDIA_STORAGE_PATH`)
- Configurer le VPS de production : `mkdir -p /var/www/ibc-media/events/` + permissions + Nginx cache-control
- Variable d'environnement : `MEDIA_STORAGE_PATH=/var/www/ibc-media` (prod) ou `./public/ibc-media` (dev)

### 5.5 Destinataires du handoff

- **PO (Jonathan)** : Valide ce proposal, puis lance les sessions CS → DS → CR via bmad-orchestrator en nouvelles sessions chat
- **Architect (Winston)** : Vérifie la compatibilité `sharp` avec le build standalone Next.js 16
- **Dev (Amelia)** : Implémente les stories dans l'ordre, via subagents DS

---

*Proposal généré le 2026-07-04 via session Party-Mode (John, Mary, Sally, Winston, Amelia, Paige) + CC workflow.*