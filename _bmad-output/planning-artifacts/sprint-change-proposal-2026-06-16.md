# Proposition de Modification de Sprint — Évolutions du Module Articles (Epic 9)

**Projet :** Ivoire Business Club (IBC)  
**Auteur :** Jonathan (PO) / Antigravity (Dev)  
**Date :** 16 juin 2026  
**Statut :** En attente de validation  

---

## 1. Résumé du Changement

Cette proposition vise à intégrer quatre évolutions et correctifs fonctionnels majeurs dans le module des Articles (**Epic 9**) afin d'améliorer l'interactivité, l'engagement des membres et de renforcer les passerelles de conversion vers les opportunités d'investissement :
1. **Éditeur de texte riche (WYSIWYG/Markdown interactif)** pour la rédaction des articles en admin.
2. **Système de commentaires** interactif pour les membres connectés et abonnés actifs.
3. **Association Articles <-> Opportunités** pour afficher un encart `DealCard` sous les articles connexes.
4. **Partage sur les réseaux sociaux** dynamique et optimisé SEO.

---

## 2. Analyse d'Impact

### 2.1 Impact sur les Epics et Stories
- **Epic concernée :** Epic 9 (Contenu Éditorial & Ressources Membres).
- **Stories modifiées :**
  - **Story 9.2 (Interface Admin CRUD Articles) :** Intégration de l'éditeur Markdown avec barre d'outils et prévisualisation + champ d'association d'une opportunité.
  - **Story 9.3 (Catalogue Public et Pages Détail) :** Affichage de l'encart opportunité (`DealCard`) sous condition de tier et intégration des boutons de partage.
- **Nouvelles Stories ajoutées :**
  - **Story 9.7 :** Système de Commentaires — Modèle, Migration et API routes.
  - **Story 9.8 :** Section Commentaires UI — Rendu des commentaires et formulaire de saisie sécurisé.

### 2.2 Conflits d'Artéfacts
- **PRD (`prd.md`) :** Ajout des exigences fonctionnelles (FR54 à FR57).
- **Epics (`epics.md`) :** Modification des critères d'acceptation des Stories 9.2 et 9.3, et ajout des Stories 9.7 et 9.8.
- **Schéma Prisma (`schema.prisma`) :** Ajout du modèle `Comment` avec relations et suppressions en cascade ; ajout de la relation optionnelle `opportunityId` dans le modèle `Article`.

### 2.3 Impact Technique et Risques
- **Base de données :** Une migration de base de données est requise pour ajouter la table `article_comments` et la clé étrangère `opportunityId` dans la table `articles`. Cette migration est non destructive (ajouts simples).
- **Sécurité et Contrôle d'accès :** Les routes API et les composants UI de commentaires doivent valider que l'utilisateur est authentifié et dispose d'un abonnement actif (`status === 'ACTIVE'`).
- **Abonnements & Tiers :** L'encart opportunité (`DealCard`) affiché sous l'article doit respecter le tier d'accès requis par l'opportunité (ex. un membre Affranchi ne doit pas voir les détails d'un deal réservé aux Boss).

---

## 3. Approche Recommandée

**Option sélectionnée :** Ajustement direct (Direct Adjustment).
- **Justification :** Le module des Articles est déjà implémenté en grande partie (Stories 9.1 à 9.6). L'ajout de ces fonctionnalités s'inscrit naturellement comme une extension logique d'Epic 9 sans remettre en cause la structure existante.
- **Estimation de l'effort :** Moyen (~3-4 jours homme).
- **Niveau de risque :** Faible (isolation forte des modifications au sein d'Epic 9).

---

## 4. Propositions de Modifications Détaillées

### 4.1 Modifications dans le Schéma Prisma (`schema.prisma`)

```diff
model User {
  ...
  reactions          ArticleReaction[]
+ comments           Comment[]
  documentAccessRequests DocumentAccessRequest[] @relation("DocumentAccessRequester")
  ...
}

model Opportunity {
  id                 String              @id @default(cuid())
  ...
  reviews    Review[]
+ articles   Article[]
}

model Article {
  id          String            @id @default(cuid())
  ...
  authorId    String
  author      User              @relation(fields: [authorId], references: [id], onDelete: Cascade)
  reactions   ArticleReaction[]
+ comments    Comment[]
+ opportunityId String?
+ opportunity   Opportunity?    @relation(fields: [opportunityId], references: [id], onDelete: SetNull)

  @@index([published, visibility, publishedAt])
  ...
}

+model Comment {
+  id        String   @id @default(cuid())
+  content   String
+  articleId String
+  authorId  String
+  createdAt DateTime @default(now())
+  updatedAt DateTime @updatedAt
+
+  article   Article  @relation(fields: [articleId], references: [id], onDelete: Cascade)
+  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
+
+  @@index([articleId, createdAt])
+  @@index([authorId, createdAt])
+  @@map("article_comments")
+}
```

---

### 4.2 Modifications dans le Document de Spécifications Produit (`prd.md`)

**Section 8 : Exigences Fonctionnelles (FR)**  
Ajout des exigences suivantes après FR53 :

- **FR54** : L'administrateur dispose d'un éditeur de texte riche ou Markdown interactif doté d'une barre d'outils (Titres, Gras, Italique, Listes) et d'une prévisualisation en temps réel pour créer/modifier des articles.
- **FR55** : Les membres connectés ayant un abonnement actif peuvent lire et publier des commentaires sous les articles. L'accès est bloqué pour les visiteurs anonymes et les abonnements inactifs.
- **FR56** : L'administrateur peut associer un article à une opportunité existante. L'article affiche l'opportunité via le composant `DealCard` sous réserve que l'utilisateur ait le tier requis pour cette opportunité.
- **FR57** : Les articles affichent des boutons de partage sur les réseaux sociaux (WhatsApp, LinkedIn, Twitter/X, Email, Copier le lien) utilisant des URLs de partage propres et dynamiques.

---

### 4.3 Modifications dans le Document des Epics (`epics.md`)

#### [MODIFY] Story 9.2 : Interface Admin CRUD Articles
**OLD :**
- Saisir le contenu de l'article dans un textarea Markdown brut.

**NEW :**
- Saisir le contenu de l'article dans un éditeur Markdown doté d'une barre d'outils de formatage (Titres, Gras, Italique, Listes) et d'un mode de prévisualisation en temps réel.
- Permettre à l'administrateur d'associer facultativement l'article à une opportunité existante via un menu déroulant ou champ de recherche.

---

#### [MODIFY] Story 9.3 : Catalogue Public et Pages Détail
**OLD :**
- Afficher le contenu complet de l'article selon les droits de visibilité.

**NEW :**
- Afficher le contenu complet de l'article selon les droits de visibilité.
- Si l'article est associé à une opportunité, afficher un encart sous l'article en utilisant le composant `DealCard` (uniquement si l'utilisateur a accès au tier requis de l'opportunité).
- Afficher des boutons de partage (WhatsApp, LinkedIn, Twitter/X, Email, Copier le lien) utilisant des URLs de partage dynamiques et propres basées sur les métadonnées SEO de l'article.

---

#### [NEW] Story 9.7 : Système de Commentaires — Modèle, Migration et API
**En tant que** développeur,  
**Je veux** ajouter le modèle Prisma pour les commentaires, exécuter la migration et créer les API routes GET et POST `/api/articles/[id]/comments`,  
**Afin de** stocker et d'exposer les commentaires des membres de manière sécurisée.

**Critères d'acceptation :**
- **Given** le schéma Prisma mis à jour avec le modèle `Comment`.
- **When** la migration est lancée via `npx prisma migrate dev`.
- **Then** la table `article_comments` est créée avec suppression en cascade si l'article ou l'auteur est supprimé.
- **Given** un membre connecté avec abonnement actif.
- **When** il envoie une requête `POST /api/articles/[id]/comments` avec un contenu valide.
- **Then** le commentaire est persisté en base et associé à l'utilisateur et à l'article.
- **Given** un visiteur anonyme ou un membre abonné inactif.
- **When** il tente d'accéder aux API routes `GET` ou `POST` de commentaires.
- **Then** l'API renvoie une erreur `401 Unauthorized` ou `403 Forbidden`.

---

#### [NEW] Story 9.8 : Section Commentaires UI
**En tant que** membre connecté ayant un abonnement actif,  
**Je veux** voir la liste des commentaires et soumettre mon propre commentaire sous un article,  
**Afin de** participer aux discussions autour des analyses et ressources du club.

**Critères d'acceptation :**
- **Given** un membre abonné actif sur `/articles/[slug]`.
- **When** l'article est affiché.
- **Then** une section "Commentaires" apparaît sous l'article affichant l'auteur (avatar, nom), la date de création et le contenu.
- **And** un formulaire permet de rédiger et soumettre un nouveau commentaire (avec état loading et validation de longueur minimale).
- **Given** un membre sans abonnement actif ou un visiteur anonyme.
- **When** il consulte la page détail de l'article.
- **Then** la section des commentaires est remplacée par un encart d'incitation : "Devenez membre actif pour consulter et participer aux discussions."

---

## 5. Plan de Transfert et Validation

### 5.1 Classification du Changement
- **Classification :** Modérée (Moderate) — Nécessite une réorganisation mineure du backlog et des ajustements sur la base de données.
- **Destinataires du Transfert :** Équipe de Développement.
- **Critères de Succès :**
  - Éditeur interactif Markdown opérationnel en création/édition en admin.
  - Relation Prisma validée par migration et seed.
  - Section commentaires restreinte aux membres actifs en lecture/écriture.
  - `DealCard` rendu sous conditions de tier.
  - Partages sociaux testés avec des URLs de partage correctes.

### 5.2 Plan de Vérification
- **Tests Unitaires / API :** Test des API routes GET/POST `/api/articles/[id]/comments` (cas membre actif vs inactif vs anonyme).
- **Tests Manuels :** 
  - Rédaction d'un article en admin avec mise en forme et vérification de la persistance sous format Markdown.
  - Vérification de l'affichage de l'encart `DealCard` sous l'article pour un membre éligible (et masquage/remplacement pour un membre non éligible).
  - Test des boutons de partage et copie de lien.

### 5.3 Ordre d'Implémentation Recommandé
L'équipe de développement doit exécuter les modifications dans l'ordre suivant pour limiter les conflits de dépendance :
1. **Modèle de données et Migration (Story 9.7) :** Mise à jour de `schema.prisma` (modèle `Comment` + relation Article <-> Opportunity) et exécution de `prisma migrate dev`.
2. **API Routes de Commentaires (Story 9.7) :** Écriture et sécurisation des endpoints GET et POST `/api/articles/[id]/comments` (restriction aux membres connectés avec abonnement actif).
3. **Éditeur Markdown & Association Admin (Story 9.2) :** Remplacement du textarea brut par un éditeur Markdown enrichi (barre d'outils et prévisualisation) dans les formulaires admin et ajout du champ de liaison optionnelle à une opportunité.
4. **Intégration Encart Opportunity & Partage Social (Story 9.3) :** Affichage conditionnel de la `DealCard` sous l'article et ajout des boutons de partage social dynamique sur la page de détail.
5. **Section Commentaires UI (Story 9.8) :** Implémentation de la liste des commentaires et du formulaire de saisie en bas d'article avec filtrage d'accès membre actif.
