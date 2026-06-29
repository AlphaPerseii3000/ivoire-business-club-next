---
story_id: 18.1
story_key: 18-1-chat-message-model-api
epic: 18 - Chat de Support Beta & Feedback Membres
status: done
created: 2026-06-29
updated: 2026-06-29T07:18:00+02:00
language: fr
---

# Story 18.1 : Modèle ChatMessage + API routes

## Story

**En tant que** membre connecté de la plateforme IBC en bêta,
**je veux** pouvoir soumettre un message de support via une API sécurisée et recevoir un accusé de réception immédiat,
**afin de** signaler des bugs, remonter des problèmes d'accessibilité ou proposer des intégrations, tout en sachant que l'équipe pourra les consulter et y répondre de manière sécurisée.

## Contexte

Cette story constitue la fondation backend de l'Epic 18 (Chat de Support Beta & Feedback Membres). Elle est un prérequis strict aux stories 18-2 (UI) et 18-3 (intégration Hermes). Son scope est limité au modèle de données, à la migration Prisma correspondante et aux routes API membres + agent externe. Aucune interface utilisateur n'est requise ici.

Les messages sont stockés dans une table dédiée `ChatMessage` avec des statuts explicites. L'agent externe Hermes interagit uniquement via des routes API sécurisées par `CRON_SECRET` ; il n'a jamais d'accès direct à la base de données ou aux autres ressources métier.

## Acceptance Criteria

### AC1 — Modèle Prisma `ChatMessage` et enums

**Given** le schéma Prisma actuel
**When** on ajoute le modèle `ChatMessage` ainsi que les enums `ChatMessageStatus` et `ChatMessageAuthor`
**Then** :
- `ChatMessage` est relié à `User` par `userId` (cascade on delete)
- `ChatMessage` supporte le threading via `replyToId`/`replies`
- Les indexes `[userId, createdAt]` et `[status]` sont présents
- Aucun modèle existant n'est modifié (migration additive)

### AC2 — Migration Prisma additive

**Given** le nouveau modèle `ChatMessage`
**When** on génère et applique la migration
**Then** :
- La migration s'appuie sur `prisma migrate dev` (ou `prisma migrate deploy` en prod)
- Seules des tables/enums Chat sont créés — aucune modification de tables existantes
- Le build (`npm run build`) continue de fonctionner après génération du client

### AC3 — Soumission d'un message membre (POST /api/chat/messages)

**Given** un membre authentifié
**When** il soumet un message avec `category` et `content`
**Then** :
- Un `ChatMessage` est créé avec `author=MEMBER`, `status=PENDING`, `userId` de la session
- La catégorie est validée parmi `bug_technique`, `accessibilite`, `demande_integration`, `autre`
- Le contenu est requis, trimmé et limité à 5000 caractères (validation serveur stricte)
- La requête est rate-limitée à 1 message / 30 secondes / utilisateur
- En cas de rate-limit, l'API retourne 429

### AC4 — Auto-acknowledgement système

**Given** un membre qui soumet un message
**When** le message est persisté
**Then** une transaction Prisma crée simultanément :
- Le message membre en `PENDING`
- Un second `ChatMessage` avec `author=SYSTEM`, `status=ACKNOWLEDGED`, `content` = "Merci, votre message a été reçu. L'équipe vous répondra sous peu. 🚧 Plateforme en phase bêta."

### AC5 — Récupération de l'historique membre (GET /api/chat/messages)

**Given** un membre authentifié
**When** il appelle l'endpoint avec pagination (`page`, `limit` optionnels)
**Then** :
- L'API retourne uniquement les messages du membre connecté (tous `author`) et leurs réponses
- Les résultats sont triés par `createdAt` descendant
- La pagination est limitée par défaut (ex. 20) et maximum 50 éléments par page

### AC6 — Compteur de non-lus (GET /api/chat/unread)

**Given** un membre authentifié
**When** il consulte son compteur de non-lus
**Then** l'API retourne le nombre de messages où l'auteur est `HERMES` (réponses) ou `SYSTEM` (ack) **non lus** par ce membre

> **Note :** Le flag de lecture n'existe pas dans la V1 du modèle. La logique "non lu" est déterminée par le fait qu'un message de l'équipe/SYSTEM n'a pas encore été lu par le membre. Story 18-2 implémentera la lecture côté client. Pour l'API, compter les réponses Hermes et messages SYSTEM depuis la dernière `readAt` (ou absence de `readAt`).
>
> **Décision V1 simple :** ajouter un champ optionnel `readAt DateTime?` sur `ChatMessage` et l'actualiser par Story 18-2 lors de l'ouverture du chat. L'endpoint `GET /api/chat/unread` compte les messages de l'équipe/SYSTEM dont `readAt` est null et `createdAt` est après la dernière ouverture.
> Alternative acceptée : endpoint retourne le nombre de réponses Hermes/SYSTEM non marquées `readAt` non null, sans flag "lu" explicite. Documenter le choix dans le code.

### AC7 — Endpoint agent : lecture des messages PENDING (GET /api/chat/agent/read)

**Given** une requête authentifiée par Bearer `CRON_SECRET`
**When** l'agent appelle `/api/chat/agent/read`
**Then** :
- L'endpoint retourne les messages `PENDING` (seulement ce statut)
- Les messages incluent `id`, `userId`, `category`, `content`, `createdAt`
- Si le secret est invalquant ou absent → 401
- L'agent NE peut accéder qu'à la table `ChatMessage`

### AC8 — Endpoint agent : réponse à un message (POST /api/chat/agent/reply)

**Given** une requête authentifiée par Bearer `CRON_SECRET`
**When** l'agent soumet `{ messageId, content }`
**Then** :
- Le message référencé passe de `PENDING` à `REPLIED`
- Un nouveau `ChatMessage` est créé avec `author=HERMES`, `replyToId=messageId`, `userId` identique au message parent
- Le contenu est requis, trimmé et limité à 1000 caractères
- L'endpoint retourne 404 si le message n'existe pas ou n'est pas `PENDING`

### AC9 — Endpoint agent : clôture d'une conversation (POST /api/chat/agent/close)

**Given** une requête authentifiée par Bearer `CRON_SECRET`
**When** l'agent soumet `{ messageId }`
**Then** :
- Le message référencé passe à `CLOSED`
- L'endpoint est idempotent : si le message est déjà `CLOSED`, retourner 200
- L'endpoint retourne 404 si le message n'existe pas

## Tasks / Subtasks

- [x] **T1 — Modèle et migration Prisma** (AC1, AC2)
  - [x] Ajouter dans `prisma/schema.prisma` les enums `ChatMessageStatus` et `ChatMessageAuthor` et le modèle `ChatMessage` (relation `User`, threading, indexes)
  - [x] Générer et appliquer la migration : `npx prisma migrate dev --name add_chat_message`
  - [x] Vérifier que le client Prisma est régénéré et que le build passe

- [x] **T2 — Route POST /api/chat/messages** (AC3, AC4)
  - [x] Créer `src/app/api/chat/messages/route.ts`
  - [x] Protéger par `auth()` (membre connecté uniquement)
  - [x] Valider le payload avec Zod : category ∈ `{bug_technique, accessibilite, demande_integration, autre}`, content non vide, max 5000 chars
  - [x] Appliquer le rate limiting 1 req / 30 s / user en réutilisant `src/lib/rate-limit.ts`
  - [x] Créer le message membre + l'acknowledgement SYSTEM dans une transaction Prisma
  - [x] Retourner `201 { data: { message: ChatMessage, ack: ChatMessage } }`

- [x] **T3 — Route GET /api/chat/messages** (AC5)
  - [x] Ajouter la méthode GET dans `src/app/api/chat/messages/route.ts`
  - [x] Filtrer sur `userId` de la session, trier par `createdAt` desc
  - [x] Paginer avec `page`/`limit` (limit par défaut 20, max 50)
  - [x] Retourner `200 { data: { messages: ChatMessage[], total, page, limit } }`

- [x] **T4 — Route GET /api/chat/unread** (AC6)
  - [x] Créer `src/app/api/chat/unread/route.ts`
  - [x] Protéger par `auth()`
  - [x] Compter les messages `author IN [HERMES, SYSTEM]` liés à l'utilisateur dont `readAt` est null
  - [x] Retourner `200 { data: { unreadCount: number } }`

- [x] **T5 — Routes agent /api/chat/agent/* ** (AC7, AC8, AC9)
  - [x] Créer `src/app/api/chat/agent/read/route.ts` — GET, Bearer `CRON_SECRET`, retourne messages `PENDING`
  - [x] Créer `src/app/api/chat/agent/reply/route.ts` — POST, Bearer `CRON_SECRET`, valide `{ messageId, content }`, met à jour le parent `REPLIED`, crée message HERMES
  - [x] Créer `src/app/api/chat/agent/close/route.ts` — POST, Bearer `CRON_SECRET`, valide `{ messageId }`, met à jour `CLOSED` de façon idempotente
  - [x] Réutiliser la fonction `getBearerToken` et le pattern de `src/app/api/cron/remind-incomplete-users/route.ts`
  - [x] S'assurer que les routes agent n'accèdent qu'à `prisma.chatMessage`

- [x] **T6 — Tests et validation** (tous AC)
  - [x] Ajouter des tests unitaires pour les routes chat (mock `auth()` et rate limiter)
  - [x] Exécuter `npm run build`
  - [x] Exécuter `npx vitest run` (ou `npm test -- --run`)

## Dev Notes

### Architecture et conventions

- **Prisma** : importer le client depuis `@/generated/prisma/client`. Le modèle `ChatMessage` doit être purement additif.
- **Auth** : les routes membres utilisent `auth()` depuis `@/lib/auth.ts`. Seuls `MEMBER`/`ADMIN` authentifiés peuvent poster/lire.
- **Rate limiting** : réutiliser `src/lib/rate-limit.ts` (`createRateLimiter`). Créer un `chatMessageRateLimiter` avec `{ requests: 1, windowSeconds: 30 }`.
- **API Response Format** : succès `Response.json({ data: T })` ; erreur `Response.json({ error: string, code?: string }, { status })` — cf. architecture.md § API Response Format.
- **Route Handlers Next.js 16** : les routes API doivent être dans `src/app/api/<route>/route.ts`, retournant des objets `Response`/`NextResponse`.
- **Agent auth** : `CRON_SECRET` via header `Authorization: Bearer <token>`, identique à `src/app/api/cron/remind-incomplete-users/route.ts`.
- **JSX Boolean Guardrail** : non applicable ici (backend), mais rappel pour Story 18-2.

### Modèle Prisma attendu

Source : `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-28-beta-chat.md`, section 3.2.

```prisma
enum ChatMessageStatus {
  PENDING
  ACKNOWLEDGED
  REPLIED
  CLOSED
}

enum ChatMessageAuthor {
  MEMBER
  HERMES
  SYSTEM
}

model ChatMessage {
  id          String            @id @default(cuid())
  userId      String
  user        User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  author      ChatMessageAuthor
  status      ChatMessageStatus @default(PENDING)
  category    String?           // "bug_technique" | "accessibilite" | "demande_integration" | "autre"
  content     String            // markdown plain text, max 5000 chars
  replyToId   String?
  replyTo     ChatMessage?      @relation("ChatReply", fields: [replyToId], references: [id])
  replies     ChatMessage[]     @relation("ChatReply")
  readAt      DateTime?         // Optionnel : marque de lecture côté client
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  @@index([userId, createdAt])
  @@index([status])
  @@map("chat_messages")
}
```

**Note sur le champ `readAt` :** Le SCP d'origine ne mentionne pas ce champ. Story 18-1 l'ajoute afin que l'endpoint `/api/chat/unread` (AC6) puisse fonctionner de manière simple. C'est une extension additive justifiée.

### Fichiers à créer / modifier

| Fichier | Type | Changement |
|---------|------|------------|
| `prisma/schema.prisma` | UPDATE | Ajout des enums `ChatMessageStatus`, `ChatMessageAuthor` et modèle `ChatMessage` |
| `prisma/migrations/*_add_chat_message/migration.sql` | NEW | Migration générée automatiquement |
| `src/app/api/chat/messages/route.ts` | NEW | POST + GET membres |
| `src/app/api/chat/unread/route.ts` | NEW | GET unread count |
| `src/app/api/chat/agent/read/route.ts` | NEW | GET PENDING pour agent Hermes |
| `src/app/api/chat/agent/reply/route.ts` | NEW | POST réponse agent |
| `src/app/api/chat/agent/close/route.ts` | NEW | POST clôture agent |
| `src/lib/rate-limit.ts` | UPDATE | Ajout du limiter chat (`chatMessageRateLimiter`) |
| `.env.example` | UPDATE | Documenter `CRON_SECRET` déjà existant |

### Schémas Zod recommandés (à placer dans `src/lib/validations.ts`)

```ts
const chatCategory = z.enum(["bug_technique", "accessibilite", "demande_integration", "autre"]);

export const chatMessageCreateSchema = z.object({
  category: chatCategory,
  content: z.string().trim().min(1).max(5000),
});

export const chatAgentReplySchema = z.object({
  messageId: z.string().cuid(),
  content: z.string().trim().min(1).max(1000),
});

export const chatAgentCloseSchema = z.object({
  messageId: z.string().cuid(),
});
```

### Points de vigilance

1. **Purement additif** : ne modifier AUCUN modèle existant. Si un ajustement du schéma semble nécessaire (ex. relation `User.chatMessages`), il doit être strictement additif.
2. **Rate limiting user-based** : utiliser `getClientIdentifier(req, userId)` pour éviter qu'un utilisateur ne contourne la limite en changeant d'IP.
3. **Validation serveur** : la limite de 5000 caractères doit être appliquée côté serveur malgré toute validation client future.
4. **Agent isolation** : les routes agent ne doivent pas appeler d'autres modèles Prisma que `chatMessage`. En particulier, ne jamais renvoyer d'informations utilisateur (email, nom) dans les réponses agent.
5. **Secret par route** : `CRON_SECRET` est déjà utilisé par `src/app/api/cron/remind-incomplete-users/route.ts`. Pas besoin de créer un nouveau secret.
6. **Idempotence close** : vérifier le statut actuel avant de mettre à jour pour éviter des lignes d'audit inutiles.
7. **Threading** : un message de réponse Hermes a `replyToId` pointant vers le message membre original. Il reste en statut `PENDING` par défaut ; le parent passe à `REPLIED`.
8. **Auto-ack content** : le message d'acknowledgement doit mentionner explicitement la phase bêta, comme exigé par FR74.
9. **Retour du POST** : retourner à la fois le message membre et l'ack afin que Story 18-2 puisse afficher l'historique immédiatement.

### Anti-patterns à éviter

- Ne pas créer un nouveau secret d'agent ; réutiliser `CRON_SECRET`.
- Ne pas implémenter un WebSocket / SSE pour le chat en V1 ; le polling est géré côté Story 18-2/18-3.
- Ne pas marquer l'acknowledgement comme `PENDING` : il doit être `ACKNOWLEDGED`.
- Ne pas inclure de données `User` dans les réponses agent (conformité + isolation).
- Ne pas appeler `prisma.user.*` dans les routes agent.

## References

- [Source: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-28-beta-chat.md`], sections 1, 3.2, 4.1, 4.2 — définition complète de l'Epic 18 et du modèle ChatMessage.
- [Source: `_bmad-output/planning-artifacts/architecture.md`], sections API & Communication Patterns, Support Chat & Hermes Integration, API Response Format, Authentication & Security.
- [Source: `prisma/schema.prisma`] — conventions de modèles, relations, enums et `@map`.
- [Source: `src/lib/auth.ts`] — pattern `auth()` pour routes API membres.
- [Source: `src/lib/rate-limit.ts`] — factory Upstash pour rate limiting.
- [Source: `src/app/api/cron/remind-incomplete-users/route.ts`] — pattern Bearer `CRON_SECRET` pour routes agent.
- [Source: `_bmad-output/implementation-artifacts/19-2b-posthog-identification-gaps.md`] — format de story récente et conventions du projet.

## Dev Agent Record

### Agent Model Used

Hermes / kimi-k2.7-code

### Debug Log References

N/A — story de formalisation, pas d'implémentation.

### Completion Notes List

- Story 18-1 implémentée dans le code.
- Modèle Prisma `ChatMessage`, enums `ChatMessageStatus`/`ChatMessageAuthor`, relation `User`, threading `replyToId`/`replies`, indexes `[userId, createdAt]` et `[status]` créés dans `prisma/schema.prisma` et `prisma/schema.dev.prisma`.
- Migration `20260629050711_add_chat_message` générée et appliquée sous SQLite dev.
- Routes membres : `POST/GET /api/chat/messages`, `GET /api/chat/unread` avec auth session, validation Zod, rate limiting 1 msg/30 s, pagination, compteur de non-lus.
- Routes agent : `GET /api/chat/agent/read`, `POST /api/chat/agent/reply`, `POST /api/chat/agent/close` protégées par `CRON_SECRET` Bearer ; agent isolé à `prisma.chatMessage`.
- Auto-acknowledgement SYSTEM créé dans la transaction du message membre avec le message bêta requis.
- Tests unitaires co-localisés créés pour les 5 routes (26 tests chat), tous passent.
- Build Next.js et suite de tests complète (1023 tests) passent sans régression.
- Status de la story mis à jour à `review` dans `sprint-status.yaml`.

### File List

- `_bmad-output/implementation-artifacts/18-1-chat-message-model-api.md` (status `review`, tâches cochées)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (story 18-1 → review)
- `prisma/schema.prisma` (modèle `ChatMessage` et enums)
- `prisma/schema.dev.prisma` (modèle `ChatMessage` et enums)
- `prisma/migrations/20260629050711_add_chat_message/migration.sql` (migration additive SQLite)
- `src/lib/rate-limit.ts` (ajout `chatMessageRateLimiter`)
- `src/lib/validations.ts` (schémas Zod chat)
- `src/app/api/chat/messages/route.ts` (POST + GET membres)
- `src/app/api/chat/messages/route.test.ts`
- `src/app/api/chat/unread/route.ts` (GET non-lus)
- `src/app/api/chat/unread/route.test.ts`
- `src/app/api/chat/agent/read/route.ts` (GET PENDING agent)
- `src/app/api/chat/agent/read/route.test.ts`
- `src/app/api/chat/agent/reply/route.ts` (POST réponse agent)
- `src/app/api/chat/agent/reply/route.test.ts`
- `src/app/api/chat/agent/close/route.ts` (POST clôture agent)
- `src/app/api/chat/agent/close/route.test.ts`

### Change Log

- 2026-06-29 : Implémentation complète story 18-1 (modèle, migration, 5 routes API, tests, build + tests OK). Status `review`.
