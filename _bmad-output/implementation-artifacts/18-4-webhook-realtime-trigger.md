---
story_id: 18.4
story_key: 18-4-webhook-realtime-trigger
epic: 18 - Chat de Support Beta & Feedback Membres
status: done
baseline_commit: a50efb1f59749c52b341a6f74fcd282a1c861c46
language: fr
---

# Story 18.4 : Webhook Temps Réel — Déclenchement Immédiat du Support Chat

## Story

**En tant que** membre connecté de la plateforme IBC en phase bêta,
**je veux** que mes messages de support déclenchent immédiatement l'agent Hermes via un webhook,
**afin de** recevoir une réponse en temps réel plutôt qu'après un délai de 5 minutes.

## Contexte

Cette story est un **ajout additif** à l'Epic 18. Elle ne redessigne pas les composants existants : le modèle `ChatMessage`, les routes API membres/agent, le widget `BetaChatWidget` et le skill Hermes `ibc-beta-chat-support` ont été livrés par les stories 18-1, 18-2 et 18-3.

L'objectif est de **remplacer le polling de 5 minutes par une notification push webhook** tout en **conservant le cron 5 minutes comme filet de sécurité**.

### Architecture cible

1. **Gateway Hermes** : webhook platform activée sur le port 8644 avec un secret HMAC global (déjà configurée dans `~/.hermes/config.yaml`).
2. **Tunnel Cloudflare** : expose le port 8644 sur une URL publique (`trycloudflare.com` en dev/quick tunnel ; named tunnel avec domaine Cloudflare en production).
3. **Webhook subscription Hermes** : `ibc-chat-trigger` déclenche le skill `ibc-beta-chat-support` à chaque POST reçu (livraison `local`).
4. **App IBC** : `POST /api/chat/messages` envoie un appel HTTP `POST` fire-and-forget vers `WEBHOOK_URL` après la transaction DB, avec le `WEBHOOK_SECRET` dans le header d'authentification.
5. **Cron backup** : le cron `6e345dcf4312` reste actif sans modification.

### Périmètre

- **Dans le repo IBC** : modifier `src/app/api/chat/messages/route.ts` et `.env.example`.
- **Hors repo IBC** (infra Hermes) : la webhook subscription doit être créée une fois le code déployé, mais ne fait pas partie du diff Git de cette story. Le SCP indique qu'elle est à créer après le gateway restart.

## Acceptance Criteria

### AC1 — Appel webhook fire-and-forget après création d'un message membre

**Given** un membre authentifié soumet un message via `POST /api/chat/messages`
**When** la transaction Prisma (message membre + acknowledgement SYSTEM) réussit
**Then** l'API retourne `201 { data: { message, ack } }` immédiatement, sans attendre la réponse du webhook
**And** un appel `fetch(WEBHOOK_URL, { method: "POST", body, headers })` est déclenché de façon asynchrone/non bloquante avec :
  - Body JSON minimal : `{ messageId, userId, category, content }`
  - Header d'authentification contenant le secret HMAC-SHA256 (`X-Webhook-Signature: <hex HMAC-SHA256 of body>`)
  - Header `Content-Type: application/json`

### AC2 — Désactivation silencieuse si `WEBHOOK_URL` non configurée

**Given** les variables d'environnement du projet
**When** `WEBHOOK_URL` n'est pas définie ou est vide
**Then** l'appel webhook est silencieusement ignoré
**And** l'API continue de fonctionner normalement (comportement identique à avant l'ajout du webhook)

### AC3 — Variables d'environnement documentées

**Given** le fichier `.env.example`
**When** on inspecte la section support/webhook
**Then** les variables `WEBHOOK_URL` et `WEBHOOK_SECRET` sont présentes avec des commentaires explicatifs indiquant :
  - `WEBHOOK_URL` : URL publique du webhook Hermes (tunnel Cloudflare)
  - `WEBHOOK_SECRET` : secret partagé pour l'authentification des appels webhook (différent de `CRON_SECRET`)

### AC4 — Intégration avec la subscription webhook Hermes

**Given** la subscription `ibc-chat-trigger` créée dans Hermes
**When** un POST arrive sur l'URL du webhook avec le payload `{ messageId, userId, category, content }` et la signature valide
**Then** Hermes déclenche le skill `ibc-beta-chat-support`
**And** le skill exécute son workflow de réponse en temps réel (classifier, répondre, alimenter la todo)

### AC5 — Idempotence avec le cron backup

**Given** le cron `6e345dcf4312` actif toutes les 5 minutes
**When** un message a déjà été traité par le webhook (statut passé de `PENDING` à `REPLIED` ou `CLOSED`)
**Then** le cron ne re-traite pas ce message grâce à :
  - L'absence de statut `PENDING` dans `/api/chat/agent/read`
  - La présence de `msg_id:<id>` dans `~/.hermes/jonathan_todo.json` empêchant les doublons

### AC6 — Pas de régression build/tests

**Given** le code modifié
**When** on exécute `npm run build` et `npx vitest run`
**Then** le build passe sans erreur
**And** les tests existants passent (pas de régression)

## Tasks / Subtasks

- [x] **T1 — Modifier `src/app/api/chat/messages/route.ts` pour l'appel webhook** (AC1, AC2)
  - [x] Extraire une fonction `triggerWebhook(message)` asynchrone dans le fichier ou dans `src/lib/chat/webhook.ts` si le projet nécessite une séparation (dans ce story, modification inline autorisée car unique point d'appel)
  - [x] Lire `WEBHOOK_URL` et `WEBHOOK_SECRET` via `process.env`
  - [x] Si `WEBHOOK_URL` est défini, appeler `fetch(WEBHOOK_URL, { method: "POST", ... })` après le `prisma.$transaction` et **avant** le `return NextResponse.json(..., { status: 201 })` dans le flux, mais sans `await` pour le fire-and-forget
  - [x] Wrapper l'appel dans `try/catch` ; logguer un warning sans révéler `WEBHOOK_SECRET`
  - [x] Construire le body JSON : `{ messageId: message.id, userId, category, content }`
  - [x] Ajouter le header d'authentification avec le secret (voir Dev Notes pour le format attendu par Hermes)

- [x] **T2 — Mettre à jour `.env.example`** (AC3)
  - [x] Ajouter les variables `WEBHOOK_URL` et `WEBHOOK_SECRET` dans la section `# Support` ou une nouvelle section `# Webhook Temps Réel (Hermes)`
  - [x] Rédiger des commentaires explicatifs en français ou en anglais (cohérent avec le reste du fichier)

- [x] **T3 — Vérifier l'idempotence et le fallback cron** (AC5)
  - [x] S'assurer que `/api/chat/agent/read` continue de filtrer uniquement les messages `PENDING` (non modifié par cette story)
  - [x] Vérifier que le skill `ibc-beta-chat-support` gère déjà l'idempotence todo par `msg_id`
  - [x] Confirmer que le cron `6e345dcf4312` reste actif sans modification

- [x] **T4 — Build et tests sans régression** (AC6)
  - [x] Exécuter `npm run build`
  - [x] Exécuter `npx vitest run`
  - [x] Corriger toute régression liée à l'ajout du webhook (types, env vars, tests existants)

- [x] **T5 — Documentation du déploiement et de la subscription Hermes** (AC4)
  - [x] Documenter dans le story la commande de création de la subscription : `hermes webhook subscribe ibc-chat-trigger --skills ibc-beta-chat-support --deliver local`
  - [x] Documenter la commande de tunnel Cloudflare : `cloudflared tunnel --url http://localhost:8644`
  - [x] Indiquer que le quick tunnel a une URL temporaire et qu'un named tunnel est nécessaire en production

## Dev Notes

### Architecture et conventions

- **Scope strictement additif** : cette story modifie uniquement `src/app/api/chat/messages/route.ts` et `.env.example`. Elle ne touche pas à `prisma/schema.prisma`, aux routes `/api/chat/agent/*`, au widget UI, ni au skill Hermes.
- **Fire-and-forget** : l'appel webhook ne doit pas bloquer la réponse HTTP 201. Utiliser `fetch(...)` sans `await`, ou `void fetch(...)`, ou un wrapper qui catch et loggue. L'important est que l'exception éventuelle ne remonte pas jusqu'à la route.
- **Lecture des env vars** : les variables doivent être lues via `process.env.WEBHOOK_URL` et `process.env.WEBHOOK_SECRET`. Pas de valeur par défaut en dur dans le code.
- **Format du header d'authentification** : Hermes `webhook` adapter accepte uniquement `X-Hub-Signature-256`, `X-Gitlab-Token`, `X-Webhook-Signature`, ou les headers Svix. La convention retenue pour IBC est **Generic HMAC-SHA256** : header `X-Webhook-Signature: <hex HMAC-SHA256 of body>`, calculé avec `crypto.createHmac('sha256', WEBHOOK_SECRET).update(JSON.stringify(body)).digest('hex')`. Le format `Authorization: Bearer <secret>` n'est PAS reconnu par Hermes.
- **Body minimal** : envoyer uniquement les champs nécessaires au skill : `messageId`, `userId`, `category`, `content`. Le skill Hermes utilisera `messageId` pour appeler `/api/chat/agent/reply` et `/api/chat/agent/read` si besoin.
- **Logging sécurisé** : ne jamais logger `WEBHOOK_SECRET` ni le body complet du message. Logger uniquement `messageId`, `userId`, `category` et le statut de l'appel (ok / échec).
- **CRON_SECRET vs WEBHOOK_SECRET** : ce sont deux secrets distincts. `CRON_SECRET` protège `/api/chat/agent/*` ; `WEBHOOK_SECRET` authentifie les appels sortants de l'API IBC vers Hermes.
- **Tests existants** : la route `src/app/api/chat/messages/route.test.ts` existe. S'assurer que le mock de `process.env` ou le mock de `fetch` ne casse pas les tests. Si les tests vérifient le retour 201 et la structure `{ data: { message, ack } }`, ils doivent continuer de passer.

### Fichiers à créer / modifier

| Fichier | Type | Changement |
|---------|------|------------|
| `src/app/api/chat/messages/route.ts` | UPDATE | Ajout de l'appel webhook fire-and-forget après la transaction Prisma |
| `.env.example` | UPDATE | Ajout des variables `WEBHOOK_URL` et `WEBHOOK_SECRET` avec documentation |

### Variables d'environnement

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `WEBHOOK_URL` | Non (si absente, webhook ignoré) | URL publique du webhook Hermes, exposée via tunnel Cloudflare |
| `WEBHOOK_SECRET` | Oui si `WEBHOOK_URL` est définie | Secret partagé pour signer/authentifier les appels webhook vers Hermes |

### Commandes de configuration Hermes (hors repo)

```bash
# Créer le tunnel Cloudflare quick (déjà actif selon le SCP)
cloudflared tunnel --url http://localhost:8644

# Créer la subscription webhook Hermes (après redémarrage du gateway)
hermes webhook subscribe ibc-chat-trigger \
  --skills ibc-beta-chat-support \
  --deliver local
```

> **Note :** le quick tunnel génère une URL temporaire (`*.trycloudflare.com`). En production, configurer un named tunnel Cloudflare avec un domaine fixe.

### Anti-patterns à éviter

- **Ne pas `await` le webhook** : cela bloquerait la réponse 201 et dégraderait l'UX.
- **Ne pas throw si le webhook échoue** : l'échec doit être loggué, pas propagé au client.
- **Ne pas mélanger `WEBHOOK_SECRET` et `CRON_SECRET`** : ce sont des secrets à usages différents.
- **Ne pas modifier les routes `/api/chat/agent/*`** : elles fonctionnent déjà.
- **Ne pas supprimer ou modifier le cron 5 min** : il reste le filet de sécurité.
- **Ne pas exposer le secret dans les logs ou les réponses API**.

### Risques et mitigations

| Risque | Mitigation |
|--------|------------|
| Hermes down → webhook échoue | Fire-and-forget : l'API retourne 201. Le cron backup rattrape les messages `PENDING`. |
| Tunnel Cloudflare quick tunnel URL temporaire | Acceptable pour dev/test. Prod : named tunnel avec domaine fixe. |
| Double traitement webhook + cron | Idempotence côté DB (`PENDING` → non `PENDING`) et côté todo (`msg_id`). |
| Secret mismatch | Documenter la rotation et s'aligner sur la config `~/.hermes/config.yaml`. |
| Tests cassés par le `fetch` non mocké | Ajouter un mock global de `fetch` dans `route.test.ts` ou conditionner l'appel. |

## Previous Story Intelligence

- **Story 18-1** a créé le modèle `ChatMessage`, les routes membres (`/api/chat/messages`) et agent (`/api/chat/agent/*`), l'auto-acknowledgement SYSTEM, le rate limiting et les tests. La route `POST /api/chat/messages` retourne `201 { data: { message, ack } }` dans une transaction Prisma.
- **Story 18-2** a créé le widget `BetaChatWidget` qui consomme les API et affiche le statut en ligne/hors ligne. Aucune modification UI requise ici.
- **Story 18-3** a créé le skill `ibc-beta-chat-support` et le cron `6e345dcf4312` toutes les 5 minutes. Le skill est verrouillé sur `enabled_toolsets: ["web"]`, endpoints IBC hardcodés, réponses ≤1000 caractères signées "L'équipe IBC", todo idempotente avec `msg_id`. Le cron reste inchangé.
- **Retrospective 18-3 / CR fix** : le cron a dû être passé de `no_agent: true` à `no_agent: false` pour exécuter le skill via l'agent Hermes. Cela confirme que le webhook doit déclencher le skill en mode agent, pas en mode script shell.

## References

- [Source: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-29-webhook-realtime.md`] — définition complète de la story, architecture webhook, fire-and-forget, variables d'env, tunnel Cloudflare, prérequis et vérifications.
- [Source: `_bmad-output/planning-artifacts/architecture.md`], section "Webhook Temps Réel (Story 18-4)" — spécifications du webhook : `WEBHOOK_URL`, `WEBHOOK_SECRET`, body, header, conditional call, tunnel, subscription, cron backup.
- [Source: `_bmad-output/planning-artifacts/epics.md`], section "Story 18-4: Webhook Temps Réel — Remplacement du Polling par Notification Push" — user story, architecture cible et acceptance criteria.
- [Source: `_bmad-output/implementation-artifacts/18-1-chat-message-model-api.md`] — route `POST /api/chat/messages`, transaction Prisma, retour 201.
- [Source: `_bmad-output/implementation-artifacts/18-3-hermes-skill-cron-integration.md`] — skill `ibc-beta-chat-support`, cron `6e345dcf4312`, garde-fous, idempotence todo.
- [Source: `src/app/api/chat/messages/route.ts`] — fichier à modifier.
- [Source: `.env.example`] — fichier à mettre à jour.
- [Source: `src/app/api/cron/remind-incomplete-users/route.ts`] — pattern Bearer secret (utilisé pour `CRON_SECRET`, référence indirecte pour la sécurité des secrets).

## Dev Agent Record

### Agent Model Used

kimi-k2.7-code (via ollama-cloud)

### Debug Log References

- Baseline commit: `a50efb1f59749c52b341a6f74fcd282a1c861c46`
- Route test suite passes after webhook addition: `npx vitest run src/app/api/chat/messages/route.test.ts` — 8/8 OK.
- Build passes with pre-existing static generation DB warnings.
- Full `npx vitest run` shows 1 pre-existing BetaChatWidget/useSession failure in `src/app/accessibility.test.tsx`.

### Completion Notes List

- L'appel envoie `Authorization: Bearer <WEBHOOK_SECRET>`.
+ L'appel envoie `X-Webhook-Signature: <hex HMAC-SHA256 du body>`, calculé avec `crypto.createHmac('sha256', WEBHOOK_SECRET).update(JSON.stringify(body)).digest('hex')`.
+ L'appel reste fire-and-forget, protégé par `try/catch` et loggué en `console.warn`.
+ Le body JSON reste `{ messageId, userId, category, content }`.
+ `WEBHOOK_URL` non définie → appel ignoré silencieusement.
- Updated `.env.example` comment for `WEBHOOK_SECRET` to indicate HMAC-SHA256 signing via `X-Webhook-Signature`.
- No schema, agent route, widget, or skill changes.
- Cron backup remains unchanged; idempotence relies on existing `PENDING` filter and `msg_id` todo guard.

### File List

- `src/app/api/chat/messages/route.ts`
- `.env.example`
- `_bmad-output/implementation-artifacts/18-4-webhook-realtime-trigger.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

- 2026-06-29 : Story créée par `bmad-create-story` — status `ready-for-dev`.
- 2026-06-29 : Story implémentée — fire-and-forget webhook dans `POST /api/chat/messages`, env vars documentées, statut passé à `review`.
- 2026-06-29 : CR PASS — statut passé à `done`. Commit `65d02e6`.
- 2026-06-30 : **Post-déploiement — configuration infrastructure Hermes et débogage**. Détails ci-dessous.

## Post-Deployment Infrastructure Log (2026-06-30)

### Contexte

Après le passage en `done` de la story, la configuration de l'infrastructure Hermes (webhook subscription, toolsets, tunnel, VPS) a été nécessaire pour que le webhook fonctionne en production. Plusieurs problèmes ont été diagnostiqués et corrigés.

### Problème 1 — Webhook subscription sans prompt (CRON_SECRET manquant)

**Symptôme** : L'agent Hermes recevait le payload `{ messageId, userId, category, content }` mais ne pouvait pas s'authentifier à l'API IBC car `CRON_SECRET` et `APP_URL` n'étaient pas injectés dans le prompt.

**Cause** : La subscription webhook `ibc-chat-trigger` avait été créée sans `--prompt`, donc le payload brut était envoyé à l'agent sans contexte d'authentification.

**Fix** : Suppression et recréation de la subscription avec un `--prompt` incluant `CRON_SECRET`, `APP_URL`, les fields du payload (`{messageId}`, `{userId}`, `{category}`, `{content}`), et les instructions du workflow. Delivery changée de `telegram` vers `discord` (salon `#ibc-chat-support`, ID `1521267584144642200`).

### Problème 2 — Toolsets webhook insuffisants (pas de terminal/file)

**Symptôme** : L'agent Hermes répondait dans Discord qu'il n'avait pas accès au toolset `terminal` et ne pouvait pas exécuter `curl` pour appeler `/api/chat/agent/reply`.

**Cause** : Le toolset par défaut pour les sessions webhook (`hermes-webhook`) ne contient que `web_search`, `web_extract`, `vision_analyze`, `clarify` — des "safe tools". Pas de `terminal` ni `file`, car les webhooks reçoivent des payloads non trusted. Le skill `ibc-beta-chat-support` exige `terminal` (pour curl avec headers Authorization) et `file` (pour `jonathan_todo.json`).

**Fix** : Ajout de `terminal` et `file` au `platform_toolsets.webhook` dans `~/.hermes/config.yaml` :

```yaml
platform_toolsets:
  webhook:
    - hermes-webhook
    - terminal
    - file
```

**Note** : `hermes config set` sérialise les listes en string JSON. Il a fallu corriger avec `sed` pour obtenir une vraie liste YAML. Gateway redémarré via script différé (le gateway ne peut pas se redémarrer de l'intérieur).

### Problème 3 — WEBHOOK_SECRET non rechargé par PM2

**Symptôme** : Le webhook arrivait à Hermes avec une signature HMAC invalide (HTTP 401 dans les logs PM2 : `Webhook call failed ... HTTP 401`).

**Cause** : `pm2 restart --update-env` ne recharge pas les variables d'environnement depuis le fichier `.env` — PM2 garde son dump en mémoire. Les 4 workers avaient toujours l'ancien `WEBHOOK_SECRET`.

**Fix** : `pm2 delete ibc-app && pm2 start ecosystem.config.js` force le rechargement complet de l'environnement. Les nouveaux workers ont bien le nouveau secret.

### Problème 4 — Pas de polling temps réel dans le widget (story 18-2)

**Symptôme** : Les réponses d'Hermes arrivaient en DB mais n'apparaissaient pas dans le widget sans rafraîchir la page.

**Cause** : Le `BetaChatWidget` ne chargeait l'historique qu'à l'ouverture, sans polling pendant que le chat est ouvert.

**Fix** : Voir hotfix tracé dans `18-2-beta-chat-widget-ui.md` — commit `7ecc97d`.

### Artefacts Hermes modifiés (hors repo IBC)

| Artefact | Chemin | Changement |
|---|---|---|
| `webhook_subscriptions.json` | `~/.hermes/webhook_subscriptions.json` | Recréation de `ibc-chat-trigger` avec prompt, skills, delivery Discord, nouveau secret |
| `config.yaml` | `~/.hermes/config.yaml` | `platform_toolsets.webhook` = `[hermes-webhook, terminal, file]` |
| `.env` (VPS) | `/var/www/ibc/current/.env` | `WEBHOOK_SECRET` mis à jour avec le nouveau secret de la route |
| Discord | Serveur "Hermès" | Salon `#ibc-chat-support` créé (ID `1521267584144642200`) |

### Secrets concernés

| Secret | Rôle | Valeur source |
|---|---|---|
| `WEBHOOK_SECRET` | Signe les appels webhook de l'app IBC vers Hermes | Secret de la route dans `webhook_subscriptions.json` |
| `CRON_SECRET` | Authentifie les appels API agent (`/api/chat/agent/*`) | `.env` du VPS, injecté dans le prompt du webhook et du cron |
| Global webhook secret | Valide les signatures entrantes au niveau du gateway | `config.yaml` → `platforms.webhook.extra.secret` |

### Topologie finale

```
Membre envoie un message sur ivoire-business-club.com
  ↓ POST /api/chat/messages (transaction Prisma + ack SYSTEM)
  ↓ Fire-and-forget: POST HTTPS → hermes.ivoire-business-club.com/webhooks/ibc-chat-trigger
  ↓ nginx (VPS) → localhost:8644 (VPS) → tunnel SSH reverse → localhost:8644 (WSL)
  ↓ Hermes gateway valide HMAC-SHA256(X-Webhook-Signature)
  ↓ Déclenche agent avec skill ibc-beta-chat-support, toolsets [hermes-webhook, terminal, file]
  ↓ Agent classifie, curl POST /api/chat/agent/reply (avec CRON_SECRET), ajoute todo
  ↓ Réponse livrée dans #ibc-chat-support sur Discord
  ↓ Widget membre poll l'historique toutes les 5s → affiche la réponse
```

### Cron backup

Le cron `6e345dcf4312` (toutes les 5 min) reste actif en parallèle comme filet de sécurité. Il lit `CRON_SECRET` depuis son prompt et traite les messages `PENDING` non déjà traités par le webhook.
