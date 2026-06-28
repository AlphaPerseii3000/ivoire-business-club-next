---
stepsCompleted:
  - step-01-trigger
  - step-02-checklist
  - step-03-impact
  - step-04-proposal
  - step-05-handoff
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - prisma/schema.prisma
  - src/lib/email.ts
  - src/lib/auth.ts
  - src/app/api/cron/remind-incomplete-users/route.ts
workflowType: correct-course
project_name: ibc
user_name: Alphaperseii
status: pending-approval
completedAt: '2026-06-28'
---

# Sprint Change Proposal — Chat de Support Beta & Feedback Membres

**Date :** 2026-06-28
**Auteur :** Hermes (PO: Jonathan)
**Type :** Nouvel epic additif (Epic 18)

---

## 1. Trigger / Contexte

La plateforme IBC est en phase bêta. Les membres peuvent rencontrer des bugs techniques, des problèmes d'accessibilité, ou avoir des demandes d'intégrations spécifiques. Actuellement, aucun canal de feedback in-app n'existe — les membres doivent quitter la plateforme pour contacter le support.

Jonathan demande un bouton flottant en bas à gauche ouvrant une fenêtre de chat permettant aux membres de :
- Signaler des problèmes techniques (bugs, erreurs, pages cassées)
- Remonter des problèmes d'accessibilité
- Soumettre des demandes d'intégration de fonctionnalités

**Contraintes spécifiques :**
- Le chat doit indiquer clairement que la plateforme est en phase bêta
- Les messages doivent être reçus et traités par Hermes (l'agent CLI de Jonathan)
- Hermes doit pouvoir répondre en direct via un skill dédié avec des garde-fous ultra-sécurisés
- Toutes les demandes doivent être ajoutées à la to-do liste permanente Hermes (`~/.hermes/jonathan_todo.json`)
- **Hermes ne tourne pas 24/7** : système hybride avec auto-acknowledgement immédiat + polling cron toutes les 5 minutes quand la machine de Jonathan est allumée

## 2. Checklist CC

### 2.1 Artifacts existants impactés

| Artifact | Impact | Détails |
|----------|--------|---------|
| `prd.md` | Ajout FR73–FR76 | 4 nouveaux FR pour le chat de support bêta |
| `architecture.md` | Ajout section | Nouveau modèle `ChatMessage`, nouvelles routes API, intégration Hermes externe |
| `epics.md` | Ajout Epic 18 | 3 stories (18-1, 18-2, 18-3) |
| `sprint-status.yaml` | Ajout entries | `epic-18: in-progress` + 3 stories en `backlog` |
| `prisma/schema.prisma` | Ajout modèle | `ChatMessage` + enum `ChatMessageStatus` |
| `~/.hermes/jonathan_todo.json` | Consommateur | Hermes y ajoute les demandes extraites du chat |

### 2.2 Conflits / contradictions

Aucun conflit avec les artifacts existants. Cette feature est purement additive — aucun FR existant n'est modifié, aucun epic existant n'est impacté. Le bouton flottant est un overlay global, indépendant des layouts existants.

### 2.3 Risques

| Risque | Mitigation |
|-------|------------|
| Hermes ne tourne pas 24/7 → réponses différées | Auto-acknowledgement immédiat ("Merci, votre message a été reçu. L'équipe vous répondra sous peu.") + indicateur de statut (en ligne/hors ligne) |
| Sécurité Hermes : un membre pourrait tenter d'accéder au système via le chat | Skill Hermes dédié avec garde-fous stricts : pas d'accès terminal, pas d'accès fichiers, pas d'accès au système. Hermes ne peut que lire les messages DB et y répondre. |
| Spam / abuse | Rate limiting sur l'API (max 1 message / 30 sec / utilisateur), authentification requise (membre connecté uniquement) |
| Stockage DB infini | Pas de purge automatique dans la V1. Les messages sont stockés en DB PostgreSQL. Ajouter une tâche de purge manuelle dans la todo liste Hermes. |

## 3. Analyse d'impact

### 3.1 Impact PRD

Ajout de 4 nouveaux Functional Requirements :

- **FR73** : La plateforme affiche un bouton flottant en bas à gauche sur toutes les pages, permettant d'ouvrir une fenêtre de chat de support. Le chat indique clairement que la plateforme est en phase bêta.
- **FR74** : Un membre connecté peut soumettre un message via le chat de support (bug technique, problème d'accessibilité, demande d'intégration). Le système envoie un auto-acknowledgement immédiat confirmant la réception.
- **FR75** : Les messages de chat sont stockés en base de données et accessibles via une API authentifiée. Un agent externe (Hermes) peut lire les messages non traités et y répondre via une API sécurisée par token.
- **FR76** : Chaque message de chat reçu est automatiquement ajouté à la to-do liste permanente du système de support (Hermes), permettant le suivi et la traitement des demandes.

### 3.2 Impact Architecture

**Nouveau modèle Prisma : `ChatMessage`**

```prisma
enum ChatMessageStatus {
  PENDING      // Message du membre, en attente de réponse
  ACKNOWLEDGED  // Auto-acknowledgement envoyé
  REPLIED      // Hermes a répondu
  CLOSED       // Conversation fermée
}

enum ChatMessageAuthor {
  MEMBER       // Message envoyé par le membre
  HERMES       // Message envoyé par Hermes (réponse)
  SYSTEM       // Message système (auto-acknowledgement)
}

model ChatMessage {
  id          String            @id @default(cuid())
  userId      String            // Membre qui a envoyé le message (ou destinataire pour HERMES)
  user        User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  author      ChatMessageAuthor // Qui a écrit ce message
  status      ChatMessageStatus @default(PENDING)
  category    String?           // "bug_technique" | "accessibilite" | "demande_integration" | "autre"
  content     String            // Contenu du message (markdown plain text, max 5000 chars)
  replyToId   String?           // ID du message auquel celui-ci répond (pour threading)
  replyTo     ChatMessage?      @relation("ChatReply", fields: [replyToId], references: [id])
  replies     ChatMessage[]     @relation("ChatReply")
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  @@index([userId, createdAt])
  @@index([status])
}
```

**Nouvelles routes API :**

| Route | Méthode | Auth | Description |
|-------|---------|------|-------------|
| `/api/chat/messages` | `POST` | Session (membre) | Soumettre un nouveau message |
| `/api/chat/messages` | `GET` | Session (membre) | Récupérer ses messages + réponses (paginé) |
| `/api/chat/unread` | `GET` | Session (membre) | Compteur de messages non lus (badge) |
| `/api/chat/agent/read` | `GET` | Bearer token (CRON_SECRET) | Hermes lit les messages PENDING (tous users) |
| `/api/chat/agent/reply` | `POST` | Bearer token (CRON_SECRET) | Hermes répond à un message |
| `/api/chat/agent/close` | `POST` | Bearer token (CRON_SECRET) | Hermes ferme une conversation |

**Sécurité agent externe :**
- Les routes `/api/chat/agent/*` sont protégées par `CRON_SECRET` (Bearer token), identique au pattern utilisé pour `/api/cron/remind-incomplete-users`.
- Hermes ne peut QUE : lire les messages PENDING et y répondre. Il ne peut PAS : accéder aux utilisateurs, aux opportunités, aux documents, ou à toute autre ressource de la plateforme.
- Le skill Hermes dédié aura des garde-fous stricts : pas d'accès terminal, pas d'accès fichiers, pas d'accès au système. Seuls les appels HTTP à l'API IBC sont autorisés.

**Auto-acknowledgement :**
- Quand un membre poste un message (POST `/api/chat/messages`), le système crée immédiatement un `ChatMessage` avec `author: SYSTEM` et `status: ACKNOWLEDGED` contenant un message bêta pré-défini.
- Le message original reste `PENDING` jusqu'à ce qu'Hermes réponde.

### 3.3 Impact Epics

**Nouvel Epic 18 : Chat de Support Beta & Feedback Membres**

| Story | Titre | Description |
|-------|-------|-------------|
| 18-1 | Modèle ChatMessage + API routes | Créer le modèle Prisma `ChatMessage` + enum, migration, routes API (membre + agent externe), auto-acknowledgement |
| 18-2 | UI bouton flottant + fenêtre chat | Composant client `BetaChatWidget`, bouton flottant bas-gauche, fenêtre chat avec bannière bêta, formulaire de message, affichage des réponses, badge unread |
| 18-3 | Intégration Hermes (skill + cron + todo) | Skill Hermes dédié `ibc-beta-chat-support` avec garde-fous, cron job polling 5 min, ajout auto à la todo liste permanente |

### 3.4 Impact Sprint Status

```yaml
epic-18: in-progress
18-1-chat-message-model-api: backlog
18-2-beta-chat-widget-ui: backlog
18-3-hermes-skill-cron-integration: backlog
```

## 4. Proposal

### 4.1 Approche technique

**Frontend (Story 18-2) :**
- Composant `BetaChatWidget` : `"use client"`, conditionné à `auth()` (membre connecté uniquement).
- Bouton flottant : `position: fixed; bottom: 1.5rem; left: 1.5rem; z-index: 50`.
- Fenêtre de chat : panel coulissant (Sheet ou Dialog) avec :
  - Bannière bêta en haut : "🚧 Plateforme en phase bêta — Votre feedback nous aide à m'améliorer"
  - Liste des catégories : Bug technique, Accessibilité, Demande d'intégration, Autre
  - Zone de saisie (textarea, max 5000 chars) + bouton envoyer
  - Historique des messages (membre + réponses Hermes)
  - Indicateur de statut : "En ligne" (si Hermes a répondu récemment) / "Hors ligne" (si pas de réponse depuis > 30 min)
- Badge sur le bouton : compteur de messages non lus (réponses Hermes non vues par le membre)
- Framer Motion pour l'animation d'ouverture/fermeture (avec `initial={false}` pour éviter le piège SSR opacity:0 — pitfall 22.9).
- Intégration dans `src/app/(dashboard)/layout.tsx` ET `src/app/layout.tsx` (visible sur toutes les pages pour les membres connectés).

**Backend (Story 18-1) :**
- Migration Prisma additive (nouveau modèle, pas de modification des modèles existants).
- Routes API avec rate limiting (reusing le pattern `@upstash/ratelimit` si disponible, sinon middleware custom).
- Auto-acknowledgement system message créé dans la même transaction que le message du membre.

**Intégration Hermes (Story 18-3) :**
- **Skill `ibc-beta-chat-support`** : skill Hermes dédié avec garde-fous stricts.
  - `enabled_toolsets: ["web"]` — uniquement accès HTTP, pas de terminal, pas de fichiers, pas de code exec.
  - Le skill contient : URL de l'API IBC, le CRON_SECRET, les instructions pour lire/répondre/clôturer.
  - Garde-fous : ne jamais exécuter de commandes, ne jamais accéder à d'autres endpoints que `/api/chat/agent/*`, ne jamais révéler le CRON_SECRET, ne jamais accéder au système de fichiers.
  - Le skill extrait les demandes et les ajoute à `~/.hermes/jonathan_todo.json` via le tool `patch` ou `write_file` (mais uniquement sur le fichier todo, rien d'autre).
- **Cron job** : `every 5m`, skill `ibc-beta-chat-support`, qui :
  1. GET `/api/chat/agent/read` → récupère les messages PENDING
  2. Pour chaque message : génère une réponse contextualisée (bug → "Merci, nous investiguons...", demande → "Bonne idée, ajouté à notre roadmap...")
  3. POST `/api/chat/agent/reply` → envoie la réponse
  4. Extrait les demandes actionnables et les ajoute à `~/.hermes/jonathan_todo.json`
  5. Optionnel : POST `/api/chat/agent/close` si la demande est traitée

### 4.2 Garde-fous Hermes — Détail

Le skill `ibc-beta-chat-support` est le point critique de sécurité. Voici les garde-fous :

1. **Toolset restreint** : `enabled_toolsets: ["web"]` — Hermes ne peut faire que des requêtes HTTP. Pas de terminal, pas de fichiers, pas de code exec, pas de delegation.
2. **Endpoints autorisés uniquement** : le skill hardcode les URLs `https://ibc-domain/api/chat/agent/read`, `/api/chat/agent/reply`, `/api/chat/agent/close`. Hermes ne doit jamais appeler d'autres URLs.
3. **Secret unique** : le CRON_SECRET est stocké dans le skill (ou dans les env vars Hermes). Il ne donne accès qu'aux routes `/api/chat/agent/*` — pas aux autres routes API IBC.
4. **Pas d'accès DB direct** : Hermes passe par l'API, jamais par Prisma ou la DB directement.
5. **Filtrage des demandes** : Hermes classifie les messages en catégories (bug, accessibilité, demande, spam) et ne remonte que les demandes actionnables à la todo liste. Les spam/troll sont ignorés.
6. **Réponse bornée** : les réponses Hermes sont limitées à 1000 chars, pas de markdown complexe, pas de liens externes, pas de code. Juste du texte simple et professionnel.
7. **Pas de révélation d'identité** : les réponses sont signées "L'équipe IBC", jamais "Hermes" ou "IA".
8. **Todo liste** : les demandes sont ajoutées avec un préfixe `[IBC-CHAT]` pour les distinguer des autres tâches.

### 4.3 Considérations de déploiement

- Le composant `BetaChatWidget` est inclus dans les layouts existants. Pas de modification des pages existantes.
- La migration Prisma est additive — pas de risque pour les données existantes.
- Les routes API sont nouvelles — pas de conflit avec les routes existantes.
- Le cron Hermes tourne sur la machine de Jonathan, pas sur le serveur IBC. Si la machine est éteinte, les messages s'accumulent en DB et sont traités au prochain démarrage.

## 5. Handoff

### Séquence d'implémentation

1. **Story 18-1** (DS) : Modèle + migration + API routes + auto-ack. → Build + tests.
2. **Story 18-2** (DS) : UI BetaChatWidget + intégration layouts. → Build + tests + CR.
3. **Story 18-3** (DS) : Skill Hermes + cron job + test end-to-end. → Test réel.

### Prérequis

- `CRON_SECRET` déjà configuré (existant pour le cron remind-incomplete-users).
- Domaine IBC production connu (pour le skill Hermes).
- Machine de Jonathan allumée pour le polling cron.

### Vérification

- `npm run build` : build successful avec les nouveaux modèles et routes.
- `npx vitest run` : tests unitaires pour les routes API et le composant chat.
- Test manuel : poster un message via le chat, vérifier l'auto-ack, vérifier que Hermes le lit via l'API agent.
- Test cron : lancer le cron manuellement, vérifier que Hermes répond et ajoute à la todo liste.