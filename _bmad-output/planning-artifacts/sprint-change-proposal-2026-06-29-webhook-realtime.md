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
  - src/app/api/chat/messages/route.ts
  - ~/.hermes/skills/productivity/ibc-beta-chat-support/SKILL.md
  - ~/.hermes/cron/jobs.json
workflowType: correct-course
project_name: ibc
user_name: Alphaperseii
status: approved
completedAt: '2026-06-29'
---

# Sprint Change Proposal — Webhook Temps Réel pour le Chat de Support Beta

**Date :** 2026-06-29
**Auteur :** Hermes (PO: Jonathan)
**Type :** Story additionnel dans Epic 18 existant (additif, pas de scope drift)

---

## 1. Trigger / Contexte

Le chat de support bêta (Epic 18, stories 18-1 à 18-3) fonctionne en polling : un cron Hermes interroge l'API IBC toutes les 5 minutes pour récupérer les messages PENDING. L'expérience utilisateur est dégradée — un membre peut attendre jusqu'à 5 minutes avant de recevoir une réponse.

Jonathan demande le remplacement du polling par un webhook temps réel : quand un membre envoie un message, l'API IBC notifie Hermes immédiatement, ce qui déclenche le skill `ibc-beta-chat-support` en temps réel.

## 2. Analyse d'impact

### Artifacts impactés

| Artifact | Impact | Détails |
|----------|--------|---------|
| `epics.md` | Ajout Story 18-4 | Nouveau story dans Epic 18 existant |
| `architecture.md` | Ajout section webhook | Pattern webhook fire-and-forget + tunnel Cloudflare documentés |
| `sprint-status.yaml` | Ajout entry | `18-4-webhook-realtime-trigger: ready-for-dev` |
| `src/app/api/chat/messages/route.ts` | Modification | Ajout appel webhook fire-and-forget après transaction |
| `.env.example` | Ajout variables | `WEBHOOK_URL` + `WEBHOOK_SECRET` |
| `~/.hermes/config.yaml` | Déjà modifié | Webhook platform activée (secret HMAC global) |
| `~/.hermes/webhook_subscriptions.json` | À créer | Subscription `ibc-chat-trigger` |

### Conflits / contradictions

Aucun. Le story est purement additif :
- Le cron 5 min reste actif comme backup (pas de suppression)
- Le skill `ibc-beta-chat-support` n'est pas modifié (déjà fonctionnel)
- L'API `POST /api/chat/messages` garde son comportement existant (201 + transaction) — l'appel webhook est ajouté après la transaction

### Risques

| Risque | Mitigation |
|-------|------------|
| Hermes down → webhook échoue | Fire-and-forget : l'API retourne 201 quoi qu'il arrive. Le cron backup rattrape les messages ratés. |
| Tunnel Cloudflare quick tunnel → URL temporaire | Acceptable pour dev/test. Pour la prod, configurer un named tunnel avec domaine Cloudflare. |
| HMAC secret mismatch | Le secret global du webhook Hermes est dans `~/.hermes/config.yaml`. L'app IBC envoie ce secret dans le header. Documenter la rotation. |
| Double traitement (webhook + cron) | Idempotence : (1) `msg_id` dans le todo file empêche les doublons, (2) le statut du message passe à non-PENDING après traitement webhook. |

## 3. Proposal

### Approche technique

1. **Code IBC** : Modifier `POST /api/chat/messages` pour ajouter un appel `fetch(WEBHOOK_URL, { method: 'POST', body, headers })` fire-and-forget après la transaction DB. L'appel est wrappé dans un `try/catch` qui logge en warning mais ne throw pas. Si `WEBHOOK_URL` n'est pas définie, l'appel est ignoré.

2. **Infra Hermes** (déjà partiellement configuré) :
   - Webhook platform activée dans `~/.hermes/config.yaml` (port 8644, secret HMAC)
   - Tunnel cloudflared quick tunnel actif : `https://edges-iron-scout-joshua.trycloudflare.com` (temporaire)
   - Webhook subscription `ibc-chat-trigger` à créer : déclenche skill `ibc-beta-chat-support`, deliver `local`

3. **Cron backup** : Le cron `6e345dcf4312` reste actif sans modification.

4. **Variables d'env** : `WEBHOOK_URL` et `WEBHOOK_SECRET` ajoutées au `.env.example` et au `.env` du VPS.

### Périmètre hors IBC repo (infra Hermes — déjà exécuté par Hermes)

- `~/.hermes/config.yaml` : webhook platform activée ✅
- Tunnel cloudflared : quick tunnel démarré ✅ (URL temporaire)
- Gateway restart : cron one-shot schedulé ✅
- Webhook subscription : à créer après gateway restart

## 4. Handoff

### Séquence d'implémentation (pour bmad-orchestrator)

1. **Story 18-4** (CS → DS → CR) :
   - CS : créer le story .md depuis les ACs dans epics.md
   - DS : modifier `src/app/api/chat/messages/route.ts` + `.env.example`
   - CR : code review du changement

### Prérequis

- Gateway Hermes redémarré avec webhook platform activée (cron one-shot `8a9d637d9929` à 21:35)
- Tunnel cloudflared actif (quick tunnel en cours, named tunnel pour prod)
- `WEBHOOK_URL` et `WEBHOOK_SECRET` à définir sur le VPS IBC après création de la webhook subscription

### Vérification

- `npm run build` : build successful
- `npx vitest run` : tests existants passent (pas de régression)
- Test manuel : poster un message via le chat → vérifier que Hermes reçoit le webhook et répond en temps réel
- Test fallback : arrêter Hermes → poster un message → vérifier que l'API retourne 201 → vérifier que le cron backup traité le message au prochain cycle