# Proposition de Modification de Sprint — Évolutions Fonctionnelles Majeures (Vague 2)

**Projet :** Ivoire Business Club (IBC)  
**Auteur :** Jonathan (PO) / Hermes (Correct Course)  
**Date :** 18 juin 2026  
**Statut :** En attente de validation  
**Workflow :** bmad-correct-course (CC)  

---

## 1. Résumé du Changement

Cette proposition intègre **six évolutions fonctionnelles majeures** qui étendent le périmètre du produit IBC au-delà de la Phase 1 (Epics 1–10). Ces évolutions émergent des besoins opérationnels du club : amélioration de l'onboarding, diversification des moyens de paiement, calendrier d'événements, et annuaires de confiance (experts et entreprises agréées).

### 1.1 Fonctionnalités demandées

| # | Fonctionnalité | Nature | Impact |
|---|---------------|--------|--------|
| 1 | Email d'accueil + formulaire de complétion pour nouveaux adhérents | Extension onboarding | Nouveau workflow email automatique post-inscription + formulaire (fourni par le PO) |
| 2 | Paiement Wave / Orange Money | **Évolution du modèle de paiement** | Complète le virement bancaire (ne le remplace pas). Ajout de 2 providers mobile money |
| 3 | Calendrier d'événements | Nouveau module | Modèle Event, CRUD admin, vue calendrier publique |
| 4 | Prochain événement en landing / pop-up | Extension de #3 | Composant landing + pop-up automatique |
| 5 | Liste d'experts (consultants directs IBC) | Nouveau module | Annuaire des consultants du club (conseil, aide, accompagnement) |
| 6 | Liste d'entreprises agréées (partenaires) | Nouveau module | Annuaire des partenaires engageables (travaux, com', services) |

### 1.2 Contexte

- Le **contrat d'adhésion IBC** (KS Investment SARL, 13 articles) mentionne explicitement les événements de networking (Art. 5) et l'obligation pour le membre de remplir un formulaire d'adhésion.
- Le modèle de paiement actuel est **virement bancaire uniquement** (décision Epic 2, retrait Stripe/CinetPay). L'ajout de Wave et Orange Money est une **extension** — le virement reste l'option par défaut.
- La distinction **Experts vs Entreprises** est métier : les experts sont nos consultants directs (individus), les entreprises sont nos partenaires externes engageables (structures).

### 1.3 Classification du changement

- **Type :** Nouvelles exigences émergentes (stakeholder-driven)
- **Étendue :** Additive — aucun rollback nécessaire, 3 nouveaux epics
- **Risque :** Moyen — l'extension du modèle de paiement touche à un P0 blocker historique (paiement), mais de manière additive

---

## 2. Analyse d'Impact

### 2.1 Impact sur les Epics et Stories

**Epics existants impactés :**

| Epic | Impact | Détail |
|------|--------|--------|
| Epic 2 (Tiers & Paiement) | Modification | Story 2.1 et 2.3 : ajout des options Wave/Orange Money dans le flux de paiement. Extension de l'enum `PaymentProvider`. |
| Epic 7 (Landing & Découverte) | Modification | Story 7.1 : ajout du composant "prochain événement" + pop-up sur la landing page. |

**Nouveaux epics créés :**

| Epic | Titutre | Stories |
|------|---------|---------|
| Epic 11 | Onboarding & Paiement Mobile Money | 5 stories (11.1 → 11.5) |
| Epic 12 | Événements & Calendrier | 3 stories (12.1 → 12.3) |
| Epic 13 | Annuaire Experts & Entreprises Agréées | 4 stories (13.1 → 13.4) |

### 2.2 Conflits d'Artéfacts

| Artéfact | Conflit | Résolution |
|----------|---------|------------|
| **PRD** (`prd.md`) | Aucun FR ne couvre ces 6 features | Ajout de FR58 à FR72 (15 nouvelles exigences) |
| **Epics** (`epics.md`) | Aucun epic ne couvre ces features | Ajout de 3 nouveaux epics (11, 12, 13) + modification des epics 2 et 7 |
| **Architecture** (`architecture.md`) | Modèle de paiement, nouveaux modules | Ajout des modèles Prisma (Event, Expert, Company), extension PaymentProvider |
| **Schéma Prisma** (`schema.prisma`) | Extension nécessaire | Migration additive (nouvelles tables + extension enum) |
| **Sprint status** (`sprint-status.yaml`) | Aucun backlog pour ces features | Ajout de 3 epics + 12 stories en backlog |

### 2.3 Impact Technique

**Base de données — Migration additive :**

```diff
-- Extension PaymentProvider (déjà TEXT en SQLite, enum en PostgreSQL)
+ Ajout des valeurs: WAVE, ORANGE_MONEY

-- Nouvelles tables
+ events (id, title, slug, description, date, endDate, location, imageUrl, status, createdAt, updatedAt)
+ experts (id, name, slug, title, bio, photoUrl, phone, email, whatsapp, specialties, isPublished, createdAt, updatedAt)
+ companies (id, name, slug, description, logoUrl, contactName, contactPhone, contactEmail, website, location, certifications, isPublished, createdAt, updatedAt)

-- Optionnel (selon le choix de modélisation)
+ expert_tags (expertId, tag) -- si tags many-to-many
+ company_sectors (companyId, sector) -- si sectors many-to-many
```

**Endpoints API nouveaux :**
- `GET/POST /api/admin/events` — CRUD admin événements
- `GET /api/events` — Liste publique événements
- `GET /api/events/[slug]` — Détail événement
- `GET /api/events/next` — Prochain événement (pour landing/pop-up)
- `GET/POST /api/admin/experts` — CRUD admin experts
- `GET /api/experts` — Liste publique experts
- `GET /api/experts/[slug]` — Détail expert
- `GET/POST /api/admin/companies` — CRUD admin entreprises
- `GET /api/companies` — Liste publique entreprises
- `GET /api/companies/[slug]` — Détail entreprise
- `POST /api/onboarding/welcome-email` — Envoi email d'accueil post-inscription
- `POST /api/onboarding/complete-profile` — Soumission du formulaire de complétion

**Pages nouvelles :**
- `/events` — Calendrier des événements
- `/events/[slug]` — Détail d'un événement
- `/experts` — Annuaire des experts
- `/experts/[slug]` — Profil d'un expert
- `/partners` — Annuaire des entreprises agréées
- `/partners/[slug]` — Profil d'une entreprise
- `/onboarding/complete-profile` — Formulaire de complétion post-inscription

**Email transactionnel :**
- Email d'accueil automatique post-inscription (Resend ou Infomaniak SMTP)
- Template HTML avec lien vers le formulaire de complétion
- Inclut les informations de base (tiers choisi, instructions de paiement, contrat d'adhésion)

**Sécurité :**
- Les routes admin (events, experts, companies CRUD) réservées au rôle ADMIN
- Les routes publiques en lecture seule
- Le formulaire de complétion exige une session authentifiée
- L'envoi de l'email d'accueil est déclenché côté serveur après création du compte (pas d'API publique)

---

## 3. Approche Recommandée

**Option sélectionnée :** Ajustement direct avec création de nouveaux epics (Direct Adjustment + Epic Extension).

**Justification :**
- Les 6 fonctionnalités sont **additives** — aucune n'invalide le travail existant
- Le modèle de paiement est **étendu**, pas remplacé (virement reste l'option par défaut)
- Les 3 nouveaux epics sont indépendants et peuvent être implémentés en parallèle ou séquentiellement
- Aucun rollback nécessaire
- L'infrastructure existante (Auth.js, Prisma, Resend/SMTP, shadcn/ui) supporte naturellement ces extensions

**Estimation d'effort :** Élevé (~10–14 jours homme pour les 3 epics)  
**Niveau de risque :** Moyen — l'extension du modèle de paiement exige une migration Prisma et la mise à jour du flux de paiement existant sans régression

---

## 4. Propositions de Modifications Détaillées

### 4.1 Modifications dans le PRD (`prd.md`)

**Section 8 : Exigences Fonctionnelles (FR)**  
Ajout des exigences suivantes après FR57 :

#### Onboarding & Email d'accueil
- **FR58** : À l'inscription réussie, le système envoie automatiquement un email d'accueil au nouveau membre contenant : confirmation d'inscription, tiers choisi, lien vers le formulaire de complétion de profil, et informations de paiement (virement bancaire, Wave, Orange Money).
- **FR59** : Un formulaire de complétion de profil est accessible aux nouveaux membres authentifiés (`/onboarding/complete-profile`) pour collecter les informations complémentaires (activité, objectifs, besoins, secteurs d'intérêt, localisation des projets).
- **FR60** : Le formulaire de complétion est pré-rempli avec les données existantes du profil et sauvegarde les réponses en base.

#### Paiement Mobile Money
- **FR61** : Le membre peut choisir entre trois moyens de paiement lors de la sélection du tier : virement bancaire (par défaut), Wave, ou Orange Money.
- **FR62** : Pour Wave et Orange Money, le membre saisit son numéro de téléphone mobile money. Le système génère les instructions de paiement (numéro à appeler, code USSD, ou lien de paiement selon le provider).
- **FR63** : L'admin peut valider manuellement un paiement mobile money après confirmation de réception (même workflow que le virement bancaire : TRIAL → ACTIVE).

#### Événements & Calendrier
- **FR64** : L'admin peut créer, modifier et supprimer des événements (titre, description, date, date de fin, lieu, image, statut : brouillon/publié/annulé).
- **FR65** : Une page publique `/events` affiche le calendrier des événements publiés, triés par date croissante.
- **FR66** : Une page de détail `/events/[slug]` affiche les informations complètes d'un événement.
- **FR67** : Le prochain événement à venir est affiché sur la landing page, soit en encart dans le flux de la page, soit en pop-up (configurable par l'admin).

#### Annuaire Experts
- **FR68** : L'admin peut créer, modifier et supprimer des fiches expert (nom, titre/fonction, bio, photo, téléphone, email, WhatsApp, spécialités/domaines d'expertise, statut publication).
- **FR69** : Une page publique `/experts` affiche la liste des experts publiés avec filtres par spécialité.
- **FR70** : Une page de détail `/experts/[slug]` affiche le profil complet d'un expert avec un bouton de contact WhatsApp/email.

#### Annuaire Entreprises Agréées
- **FR71** : L'admin peut créer, modifier et supprimer des fiches entreprise (nom, description, logo, nom du contact, téléphone, email, site web, localisation, certifications/agréments, secteurs d'activité, statut publication).
- **FR72** : Une page publique `/partners` affiche la liste des entreprises agréées avec filtres par secteur. Une page de détail `/partners/[slug]` affiche le profil complet.

### 4.2 Modifications dans le Schéma Prisma (`schema.prisma`)

```diff
model User {
  ...
  subscriptions  Subscription[]
  opportunities   Opportunity[]
+ onboardingForm Json?      // Données du formulaire de complétion
+ onboardingCompletedAt DateTime?
  ...
}

enum PaymentProvider {
  BANK_TRANSFER
+ WAVE
+ ORANGE_MONEY
}

model Subscription {
  ...
  provider     PaymentProvider
+ providerPhone String?   // Numéro mobile money (pour WAVE/ORANGE_MONEY)
  ...
}

+model Event {
+  id          String    @id @default(cuid())
+  title       String
+  slug        String    @unique
+  description String    @db.Text
+  date        DateTime
+  endDate     DateTime?
+  location    String?
+  imageUrl    String?
+  status      EventStatus @default(DRAFT)
+  createdAt   DateTime  @default(now())
+  updatedAt   DateTime  @updatedAt
+
+  @@index([status, date])
+  @@map("events")
+}

+enum EventStatus {
+  DRAFT
+  PUBLISHED
+  CANCELLED
+}

+model Expert {
+  id          String   @id @default(cuid())
+  name        String
+  slug        String   @unique
+  title       String   // Fonction/titre professionnel
+  bio         String   @db.Text
+  photoUrl    String?
+  phone       String?
+  email       String?
+  whatsapp    String?
+  specialties String[] // Tags de spécialités (conseil, finance, immobilier, juridique, etc.)
+  isPublished Boolean  @default(false)
+  createdAt    DateTime @default(now())
+  updatedAt    DateTime @updatedAt
+
+  @@index([isPublished])
+  @@map("experts")
+}

+model Company {
+  id            String   @id @default(cuid())
+  name          String
+  slug          String   @unique
+  description   String   @db.Text
+  logoUrl       String?
+  contactName   String?
+  contactPhone  String?
+  contactEmail  String?
+  website       String?
+  location      String?
+  certifications String?  // Texte libre ou JSON
+  sectors       String[] // Tags de secteurs (travaux, communication, services, etc.)
+  isPublished   Boolean  @default(false)
+  createdAt     DateTime @default(now())
+  updatedAt     DateTime @updatedAt
+
+  @@index([isPublished])
+  @@map("companies")
+}
```

### 4.3 Modifications dans l'Architecture (`architecture.md`)

**Nouveaux modules architecturaux :**

| Module | Composants | Dépendances |
|--------|-----------|-------------|
| Onboarding | Email d'accueil (Resend/SMTP), Page formulaire de complétion, API soumission | Auth.js, Resend, Prisma |
| Événements | CRUD admin, API publique, Calendrier UI, Composant landing/pop-up | Prisma, shadcn/ui |
| Experts | CRUD admin, API publique, Liste filtrable, Page détail | Prisma, shadcn/ui |
| Entreprises | CRUD admin, API publique, Liste filtrable, Page détail | Prisma, shadcn/ui |

**Extension du module Paiement :**
- Ajout des providers WAVE et ORANGE_MONEY à l'enum `PaymentProvider`
- Le flux de paiement reste manuel (validation admin), identique au virement bancaire
- Le champ `providerPhone` est ajouté à `Subscription` pour stocker le numéro mobile money
- Aucune intégration API tierce (Wave/Orange Money) dans cette vague — paiement par instruction manuelle (code USSD, numéro à appeler) + validation admin, comme le virement

**Routes protégées :**
- `/onboarding/complete-profile` — authentifié uniquement
- `/admin/events`, `/admin/experts`, `/admin/companies` — ADMIN uniquement
- Routes publiques : `/events`, `/experts`, `/partners` — lecture seule, pas d'auth

### 4.4 Modifications dans les Epics (`epics.md`)

#### [MODIFY] Epic 2 : Tiers et Paiement par Virement Bancaire

**Renommé :** Epic 2 : Tiers et Paiement (Virement Bancaire + Mobile Money)

**Story 2.3 (Sélection tier + instructions de paiement) :**
- **OLD :** Le membre reçoit les instructions de virement bancaire (RIB KS Investment, montant, référence).
- **NEW :** Le membre choisit son moyen de paiement : virement bancaire (par défaut), Wave, ou Orange Money. Le système affiche les instructions correspondantes (RIB pour virement, numéro/code USSD pour mobile money). Le champ numéro de téléphone est requis pour Wave et Orange Money.

#### [MODIFY] Epic 7 : Landing Page et Découverte Publique

**Story 7.1 (Landing page) :**
- Ajout : La landing page affiche le prochain événement à venir (composant `NextEventCard`), soit dans le flux de la page, soit en pop-up (configuré par l'admin). Si aucun événement à venir n'existe, le composant ne s'affiche pas.

---

### 4.5 Nouveaux Epics

#### Epic 11 : Onboarding & Paiement Mobile Money

**Objectif :** Automatiser l'accueil des nouveaux adhérents avec un email d'accueil et un formulaire de complétion, et étendre les moyens de paiement aux solutions mobile money africaines (Wave, Orange Money).

**FRs couverts :** FR58, FR59, FR60, FR61, FR62, FR63

---

**Story 11.1 : Email d'accueil automatique post-inscription**

**En tant que** nouveau membre,  
**Je veux** recevoir un email d'accueil automatique après mon inscription,  
**Afin de** connaître les prochaines étapes (formulaire à compléter, paiement, contrat).

**Acceptance Criteria :**

- **Given** un visiteur complète son inscription avec succès  
  **When** le compte est créé en base  
  **Then** un email d'accueil est envoyé automatiquement via Resend (ou Infomaniak SMTP) contenant : confirmation d'inscription, tiers choisi, lien vers `/onboarding/complete-profile`, instructions de paiement, et lien vers le contrat d'adhésion

- **Given** l'email d'accueil  
  **When** il est rendu dans le client mail  
  **Then** le template HTML est responsive, en français, avec le branding IBC

- **Given** l'envoi d'email échoue (Resend/SMTP indisponible)  
  **When** l'erreur se produit  
  **Then** elle est logguée mais ne bloque pas l'inscription de l'utilisateur

---

**Story 11.2 : Formulaire de complétion de profil post-inscription**

**En tant que** nouveau membre,  
**Je veux** compléter un formulaire d'adhésion avec mes informations détaillées,  
**Afin de** faciliter mon matching et mon accompagnement par le club.

**Acceptance Criteria :**

- **Given** un membre authentifié sur `/onboarding/complete-profile`  
  **When** il accède au formulaire  
  **Then** les champs existants de son profil sont pré-remplis (nom, email, téléphone, pays)

- **Given** le formulaire de complétion (fourni par le PO)  
  **When** le membre le soumet  
  **Then** les données sont sauvegardées dans le champ `onboardingForm` (JSON) du User, `onboardingCompletedAt` est setté, et le membre est redirigé vers `/dashboard` avec un toast de confirmation

- **Given** un visiteur non authentifié  
  **When** il tente d'accéder à `/onboarding/complete-profile`  
  **Then** il est redirigé vers `/auth/signin`

- **Given** un membre qui a déjà complété le formulaire  
  **When** il retourne sur `/onboarding/complete-profile`  
  **Then** il voit ses réponses pré-remplies et peut les modifier

---

**Story 11.3 : Modèle de paiement mobile money — Extension PaymentProvider**

**En tant que** développeur,  
**Je veux** étendre le modèle de paiement pour supporter Wave et Orange Money,  
**Afin de** offrir aux membres des moyens de paiement adaptés à l'Afrique de l'Ouest.

**Acceptance Criteria :**

- **Given** le schéma Prisma mis à jour  
  **When** `npx prisma migrate dev` est exécuté  
  **Then** l'enum `PaymentProvider` inclut `WAVE` et `ORANGE_MONEY` (migration additive, non destructive)

- **Given** le modèle Subscription  
  **When** un paiement mobile money est initié  
  **Then** le champ `providerPhone` stocke le numéro de téléphone mobile money

- **Given** la page de sélection de tier (`/dashboard/subscribe`)  
  **When** le membre choisit Wave ou Orange Money  
  **Then** un champ "Numéro de téléphone mobile money" apparaît (validation : format international, pays supporté)

---

**Story 11.4 : UI sélection paiement — Page tier avec choix multi-provider**

**En tant que** membre,  
**Je veux** choisir mon moyen de paiement (virement, Wave, ou Orange Money),  
**Afin de** payer avec le moyen le plus pratique pour moi.

**Acceptance Criteria :**

- **Given** un membre sur la page de sélection de tier  
  **When** il sélectionne un tier  
  **Then** trois options de paiement s'affichent : Virement bancaire (par défaut), Wave, Orange Money

- **Given** le membre choisit Virement bancaire  
  **When** il valide  
  **Then** les instructions de virement s'affichent (RIB KS Investment, montant, référence) — comportement existant inchangé

- **Given** le membre choisit Wave  
  **When** il saisit son numéro de téléphone et valide  
  **Then** les instructions Wave s'affichent (numéro à appeler, montant, référence) et l'abonnement est créé en statut TRIAL avec `provider = WAVE`

- **Given** le membre choisit Orange Money  
  **When** il saisit son numéro de téléphone et valide  
  **Then** les instructions Orange Money s'affichent (code USSD ou numéro, montant, référence) et l'abonnement est créé en statut TRIAL avec `provider = ORANGE_MONEY`

---

**Story 11.5 : Validation admin des paiements mobile money**

**En tant que** admin,  
**Je veux** valider manuellement un paiement Wave ou Orange Money,  
**Afin d'** activer l'abonnement du membre après confirmation de réception.

**Acceptance Criteria :**

- **Given** un abonnement en TRIAL avec `provider = WAVE` ou `ORANGE_MONEY`  
  **When** l'admin consulte le tableau de bord des abonnements  
  **Then** le provider de paiement est affiché avec une icône distinctive (Wave = bleu, Orange Money = orange)

- **Given** l'admin valide le paiement  
  **When** il clique sur "Valider"  
  **Then** l'abonnement passe de TRIAL → ACTIVE (même workflow que le virement bancaire existant)

---

#### Epic 12 : Événements & Calendrier

**Objectif :** Permettre à l'admin de publier des événements de networking et aux membres/public de consulter le calendrier. Le prochain événement est mis en avant sur la landing page.

**FRs couverts :** FR64, FR65, FR66, FR67

---

**Story 12.1 : Modèle Event + CRUD admin**

**En tant qu'** admin,  
**Je veux** créer et gérer des événements,  
**Afin de** informer les membres et le public des prochaines rencontres IBC.

**Acceptance Criteria :**

- **Given** l'admin sur `/admin/events`  
  **When** il crée un événement (titre, description, date, date de fin optionnelle, lieu, image, statut)  
  **Then** l'événement est créé en base avec un slug auto-généré et le statut par défaut DRAFT

- **Given** un événement en brouillon  
  **When** l'admin le publie (statut → PUBLISHED)  
  **Then** l'événement devient visible sur la page publique `/events`

- **Given** un événement publié  
  **When** l'admin l'annule (statut → CANCELLED)  
  **Then** il reste visible sur `/events` avec un badge "Annulé" mais n'apparaît plus dans le composant "prochain événement"

- **Given** l'admin sur la liste des événements  
  **When** il consulte  
  **Then** les événements sont triés par date décroissante avec les actions Modifier/Supprimer/Changer statut

---

**Story 12.2 : Page calendrier d'événements publique**

**En tant que** visiteur,  
**Je veux** consulter le calendrier des événements IBC,  
**Afin de** savoir quand se tiennent les prochaines rencontres.

**Acceptance Criteria :**

- **Given** un visiteur sur `/events`  
  **When** la page se charge  
  **Then** les événements publiés et à venir sont affichés triés par date croissante, avec une carte par événement (titre, date, lieu, image)

- **Given** un visiteur sur `/events/[slug]`  
  **When** il consulte un événement  
  **Then** la page affiche tous les détails (titre, description complète, dates, lieu, image)

- **Given** aucun événement publié à venir  
  **When** la page `/events` se charge  
  **Then** un `EmptyState` s'affiche : "Aucun événement à venir. Revenez bientôt !"

---

**Story 12.3 : Composant "prochain événement" sur landing + pop-up**

**En tant que** visiteur de la landing page,  
**Je veux** voir le prochain événement IBC,  
**Afin de** être informé et incité à participer.

**Acceptance Criteria :**

- **Given** au moins un événement publié avec `date > now()`  
  **When** la landing page se charge  
  **Then** le composant `NextEventCard` s'affiche dans le flux de la page avec : titre, date, lieu, bouton "En savoir plus"

- **Given** la configuration admin "pop-up événement" activée  
  **When** un visiteur arrive sur la landing page pour la première fois (pas de cookie/localStorage)  
  **Then** un pop-up (Dialog) s'affiche avec le prochain événement et un bouton "Fermer" qui set un cookie/localStorage pour ne plus réapparaître

- **Given** aucun événement publié à venir  
  **When** la landing page se charge  
  **Then** le composant `NextEventCard` ne s'affiche pas (pas de placeholder vide)

---

#### Epic 13 : Annuaire Experts & Entreprises Agréées

**Objectif :** Créer deux annuaires distincts — les experts (consultants directs IBC) et les entreprises agréées (partenaires engageables). L'admin gère le contenu, le public consulte.

**FRs couverts :** FR68, FR69, FR70, FR71, FR72

**Distinction métier :**
- **Experts** = consultants directs du club (individus) : conseil, aide, accompagnement sur les projets. Profil personnel, lié à l'expertise.
- **Entreprises** = partenaires externes engageables (structures) : travaux, communication, services divers. Profil d'entreprise, annuaire de confiance.

---

**Story 13.1 : Modèle Expert + CRUD admin**

**En tant qu'** admin,  
**Je veux** créer et gérer des fiches expert,  
**Afin de** présenter les consultants directs du club.

**Acceptance Criteria :**

- **Given** l'admin sur `/admin/experts`  
  **When** il crée un expert (nom, titre/fonction, bio, photo, téléphone, email, WhatsApp, spécialités, statut publication)  
  **Then** la fiche est créée en base avec un slug auto-généré et `isPublished = false`

- **Given** un expert non publié  
  **When** l'admin le publie (`isPublished = true`)  
  **Then** il devient visible sur `/experts`

- **Given** l'admin sur la liste  
  **When** il consulte  
  **Then** les experts sont affichés avec actions Modifier/Supprimer/Changer statut

---

**Story 13.2 : Page publique liste des experts**

**En tant que** visiteur,  
**Je veux** consulter la liste des experts IBC,  
**Afin de** identifier les consultants qui peuvent m'aider sur mes projets.

**Acceptance Criteria :**

- **Given** un visiteur sur `/experts`  
  **When** la page se charge  
  **Then** les experts publiés sont affichés en cartes (photo, nom, titre, spécialités) avec filtres par spécialité (chips horizontaux scrollables)

- **Given** un visiteur sur `/experts/[slug]`  
  **When** il consulte un expert  
  **Then** la page affiche : photo, nom, titre, bio complète, spécialités, et boutons de contact (WhatsApp, email, téléphone si renseignés)

- **Given** aucun expert publié  
  **When** la page `/experts` se charge  
  **Then** un `EmptyState` s'affiche

---

**Story 13.3 : Modèle Company + CRUD admin**

**En tant qu'** admin,  
**Je veux** créer et gérer des fiches entreprise agréée,  
**Afin de** présenter les partenaires engageables du club.

**Acceptance Criteria :**

- **Given** l'admin sur `/admin/companies`  
  **When** il crée une entreprise (nom, description, logo, contact, téléphone, email, site web, localisation, certifications, secteurs d'activité, statut publication)  
  **Then** la fiche est créée en base avec un slug auto-généré et `isPublished = false`

- **Given** une entreprise non publiée  
  **When** l'admin la publie (`isPublished = true`)  
  **Then** elle devient visible sur `/partners`

- **Given** l'admin sur la liste  
  **When** il consulte  
  **Then** les entreprises sont affichées avec actions Modifier/Supprimer/Changer statut

---

**Story 13.4 : Page publique liste des entreprises agréées**

**En tant que** visiteur,  
**Je veux** consulter la liste des entreprises agréées IBC,  
**Afin de** identifier des partenaires de confiance pour mes projets (travaux, communication, services).

**Acceptance Criteria :**

- **Given** un visiteur sur `/partners`  
  **When** la page se charge  
  **Then** les entreprises publiées sont affichées en cartes (logo, nom, description courte, secteurs) avec filtres par secteur (chips horizontaux scrollables)

- **Given** un visiteur sur `/partners/[slug]`  
  **When** il consulte une entreprise  
  **Then** la page affiche : logo, nom, description complète, secteurs, certifications, informations de contact, site web (lien externe)

- **Given** aucune entreprise publiée  
  **When** la page `/partners` se charge  
  **Then** un `EmptyState` s'affiche

---

## 5. Plan de Transfert et Validation

### 5.1 Classification du Changement
- **Classification :** Modérée (Moderate) — 3 nouveaux epics, 12 nouvelles stories, 1 migration additive, modifications sur 2 epics existants.
- **Destinataires du Transfert :** Équipe de Développement (Hermes orchestrator + DS subagents).
- **Critères de Succès :**
  - Email d'accueil envoyé automatiquement à l'inscription
  - Formulaire de complétion fonctionnel et persistant
  - 3 options de paiement (virement, Wave, Orange Money) opérationnelles sur la page de sélection de tier
  - CRUD admin événements + page calendrier publique
  - Composant "prochain événement" sur landing + pop-up
  - CRUD admin experts + page annuaire publique avec filtres
  - CRUD admin entreprises + page annuaire publique avec filtres
  - Toutes les nouvelles pages sont responsive, mobile-first, accessibles (WCAG 2.1 AA)
  - Toutes les routes admin sont protégées (rôle ADMIN)
  - Migration Prisma additive (pas de destruction de données)
  - Build Next.js + tests vitest passent

### 5.2 Plan de Vérification
- **Tests Unitaires / API :** Test des API routes (CRUD events, experts, companies, onboarding, payment)
- **Tests Manuels :**
  - Inscription → vérifier réception email d'accueil
  - Complétion du formulaire → vérifier persistance
  - Sélection de tier avec chaque provider → vérifier instructions correctes
  - Création d'un événement en admin → vérifier affichage sur `/events` + landing
  - Création d'un expert/entreprise → vérifier affichage sur pages publiques
- **Migration :** Vérifier que la migration est additive (pas de DROP/ALTER destructif)
- **Build :** `npm run build` + `npx vitest run` après chaque story DS

### 5.3 Ordre d'Implémentation Recommandé

L'ordre suivant minimise les conflits de dépendance :

1. **Epic 11 (Onboarding & Paiement Mobile Money)** — en premier car il étend le flux d'inscription existant
   - 11.1 → 11.2 → 11.3 → 11.4 → 11.5 (séquentiel)

2. **Epic 12 (Événements)** — indépendant, peut démarrer en parallèle de Epic 11
   - 12.1 → 12.2 → 12.3 (séquentiel)

3. **Epic 13 (Experts & Entreprises)** — indépendant, peut démarrer en parallèle
   - 13.1 → 13.2 → 13.3 → 13.4 (séquentiel, ou 13.1+13.3 en parallèle puis 13.2+13.4)

4. **Modifications Epic 2 et 7** — intégrées dans Epic 11 (Story 11.3/11.4) et Epic 12 (Story 12.3)

### 5.4 Mise à jour du sprint-status.yaml

Après validation, ajouter les entrées suivantes au `sprint-status.yaml` :

```yaml
  epic-11: backlog
  11-1-email-accueil-post-inscription: backlog
  11-2-formulaire-completion-profil: backlog
  11-3-modele-paiement-mobile-money: backlog
  11-4-ui-selection-paiement-multi-provider: backlog
  11-5-validation-admin-paiement-mobile-money: backlog
  epic-12: backlog
  12-1-modele-event-crud-admin: backlog
  12-2-page-calendrier-evenements-publique: backlog
  12-3-composant-prochain-evenement-landing-popup: backlog
  epic-13: backlog
  13-1-modele-expert-crud-admin: backlog
  13-2-page-publique-liste-experts: backlog
  13-3-modele-company-crud-admin: backlog
  13-4-page-publique-liste-entreprises: backlog
```

### 5.5 Référence au contrat d'adhésion

Le contrat d'adhésion IBC (KS Investment SARL, 13 articles) est stocké sur Google Drive :
- **Fichier :** `CONTRAT D'ADHÉSION.pdf` (ID: `1Xrt4dA9dpw6WeOP0HMrZDs-LPAvmsqte`)
- **URL :** https://drive.google.com/file/d/1Xrt4dA9dpw6WeOP0HMrZDs-LPAvmsqte/view

Le contrat mentionne :
- Art. 2 : Durée (Mensuelle, Semestrielle, Annuelle) — à aligner avec le modèle d'abonnement
- Art. 3 : Formules (Affranchis, Grands Frères, Boss) — déjà implémenté
- Art. 4 : Paiement sur compte KS Investment SARL — étendu par cette proposition (Wave, Orange Money)
- Art. 5 : Prestations incluant "événements de networking" — couvert par Epic 12
- Art. 5bis : Obligation du membre de "fournir des informations exactes" via le "formulaire d'adhésion IBC" — couvert par Epic 11 Story 11.2

**Action :** Le contrat d'adhésion doit être intégrable dans l'email d'accueil (lien de téléchargement ou PDF en pièce jointe). À confirmer avec le PO pour la Story 11.1.