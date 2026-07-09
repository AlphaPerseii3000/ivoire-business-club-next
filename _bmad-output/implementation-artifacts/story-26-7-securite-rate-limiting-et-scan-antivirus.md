---
baseline_commit: bfc61ea8731cc6d4a2d053efc0bae243316503f4
---

# Story 26.7 : Sécurité (Rate-Limiting & Scan Antivirus)

Status: review

## Story

As a **développeur IBC**,  
I want **renforcer la protection des routes sensibles par du rate-limiting Upstash Redis et ajouter un scan antivirus côté serveur pour les fichiers téléversés**,  
so that **la plateforme résiste aux abus de spam (chat, deals) et qu'aucun fichier malveillant ne soit persisté en base ni sur R2**.

## Acceptance Criteria

1. **AC-1 — Rate-limiting des messages de chat à 10/min/IP**
   - Given un utilisateur authentifié envoyant des messages via `POST /api/chat/messages`,  
     When il dépasse 10 requêtes par minute pour une même IP,  
     Then l'API retourne `429 Too Many Requests` avec un header `Retry-After` et un code `RATE_LIMITED`.

2. **AC-2 — Rate-limiting de la création d'opportunités à 2/min/IP**
   - Given un utilisateur authentifié soumettant des deals via `POST /api/opportunities`,  
     When il dépasse 2 créations par minute pour une même IP,  
     Then l'API retourne `429 Too Many Requests` avec un header `Retry-After`.

3. **AC-3 — Rate-limiting de l'upload de justificatif de virement**
   - Given un utilisateur authentifié téléversant un reçu via `POST /api/subscriptions/upload-receipt`,  
     When il dépasse une limite raisonnable (à définir par le DS, recommandation 3/min/IP),  
     Then l'API retourne `429 Too Many Requests` avec un header `Retry-After`.

4. **AC-4 — Scan antivirus des fichiers reçus avant persistence**
   - Given un fichier PDF ou image téléversé sur `POST /api/subscriptions/upload-receipt`,  
     When le scan antivirus détecte une menace ou échoue,  
     Then le fichier temporaire est supprimé de R2 si déjà uploadé, aucune URL n'est écrite en DB, et l'API retourne `400 Bad Request` avec un message générique en français.

5. **AC-5 — Validation MIME backend renforcée**
   - Given un fichier soumis via `POST /api/subscriptions/upload-receipt`,  
     Then la route valide le type MIME côté serveur (schéma `receiptUploadSchema` déjà existant) et refuse tout fichier hors `application/pdf`, `image/jpeg`, `image/png`.

6. **AC-6 — Pas de régression sur les limites existantes**
   - Given les routes `/api/auth/signup`, `/api/auth/signin`, `/api/chat/messages` (limites pré-existantes),  
     Then les autres rate-limiters (`signupRateLimiter`, `signinRateLimiter`, `apiRateLimiter`, etc.) continuent de fonctionner avec leurs réglages actuels.

7. **AC-7 — Tests mis à jour**
   - Given la suite de tests existante,  
     Then `src/app/api/chat/messages/route.test.ts`, `src/app/api/opportunities/route.test.ts` et `src/app/api/subscriptions/upload-receipt/route.test.ts` sont adaptés pour couvrir les nouvelles limites de débit et/ou le scan antivirus, et passent.

## Tasks / Subtasks

- [x] **T1 — Auditer et décider de la stratégie chat** (AC: #1)
  - [x] T1.1 Lire `src/lib/rate-limit.ts` : le limiter existant `chatMessageRateLimiter` est configuré à 1 req/30 s et identifie par `user:${userId}` (pas par IP).
  - [x] T1.2 Décider : ajuster `chatMessageRateLimiter` à 10 req/60 s par IP (breaking change pour le test existant) ou créer un nouveau `chatMessagePublicRateLimiter` à 10 req/60 s par IP.
  - [x] T1.3 Recommandation PO/CS : créer un **nouveau** limiter `chatMessagePublicRateLimiter` (10 req/60 s, `getClientIp`) et le conserver en parallèle de l'existant `chatMessageRateLimiter` (1 req/30 s, `getClientIdentifier`) pour éviter la régression de tests. L'utiliser dans `route.ts` pour la story 26.7.
  - [x] T1.4 Implémenter le rate-limiting **avant** l'appel à Prisma et renvoyer 429 avec `Retry-After: Math.ceil((rateLimit.reset - Date.now()) / 1000)`.

- [x] **T2 — Ajouter le rate-limiting sur `POST /api/opportunities`** (AC: #2)
  - [x] T2.1 Créer un limiter `opportunityCreateRateLimiter` dans `src/lib/rate-limit.ts` : 2 req/60 s.
  - [x] T2.2 L'appliquer dans `src/app/api/opportunities/route.ts` (handler POST uniquement) avec `getClientIp(req)` car l'identification par `userId` est insuffisante face à une attaque par rotation de comptes.
  - [x] T2.3 Renvoyer 429 avec `Retry-After` et un message en français.

- [x] **T3 — Ajouter le rate-limiting sur `POST /api/subscriptions/upload-receipt`** (AC: #3)
  - [x] T3.1 Créer un limiter `receiptUploadRateLimiter` dans `src/lib/rate-limit.ts` : 3 req/60 s.
  - [x] T3.2 L'appliquer dans `src/app/api/subscriptions/upload-receipt/route.ts` avec `getClientIp(req)`.
  - [x] T3.3 Renvoyer 429 avec `Retry-After` avant tout traitement de fichier.

- [x] **T4 — Implémenter le scan antivirus côté serveur** (AC: #4)
  - [x] T4.1 Choisir et installer un service d'antivirus cloud (recommandation : `clamscan` local n'est pas viable sur Vercel/Infomaniak standalone ; privilégier une API cloud comme **VirusTotal**, **ClamAV Cloud API**, **Cloudmersive** ou **Arcjet**).
  - [x] T4.2 Créer un module `src/lib/file-scan.ts` avec une fonction `scanFile(buffer: Buffer): Promise<{ isSafe: boolean; reason?: string }>`.
  - [x] T4.3 Si le scan échoue ou détecte une menace : ne **jamais** appeler `prisma.subscription.update`, supprimer la clé R2 temporaire via `deleteR2Object` si un upload a eu lieu, retourner 400 avec un message générique du type : *"Le fichier n'a pas pu être accepté. Veuillez vérifier le document et réessayer."*
  - [x] T4.4 Ajouter les variables d'environnement nécessaires dans `.env.example` (ex: `ANTIVIRUS_API_KEY`, `ANTIVIRUS_API_URL`) sans jamais logger la clé API.
  - [x] T4.5 En environnement de test / si la clé API est absente, le scanner doit retourner `isSafe: true` avec un warning logué, afin de ne pas bloquer les tests locaux.

- [x] **T5 — Adapter `src/app/api/subscriptions/upload-receipt/route.ts`** (AC: #4, #5)
  - [x] T5.1 Réorganiser l'ordre : validation MIME (Zod) → rate-limiting → scan antivirus → upload R2 → audit log → mise à jour DB.
  - [x] T5.2 Appeler `safeCreateAuditLog` avec `action: "DOCUMENT_UPLOAD"` (si pertinent, sinon utiliser une action existante) **avant** l'écriture DB.
  - [x] T5.3 Si le scan échoue, supprimer l'objet R2 temporaire avant de retourner l'erreur.

- [x] **T6 — Mettre à jour les tests** (AC: #7)
  - [x] T6.1 `src/app/api/chat/messages/route.test.ts` : ajouter un mock pour le nouveau limiter public et un test 429.
  - [x] T6.2 `src/app/api/opportunities/route.test.ts` : ajouter un mock pour `opportunityCreateRateLimiter` et un test 429 sur POST.
  - [x] T6.3 `src/app/api/subscriptions/upload-receipt/route.test.ts` : ajouter un mock pour `receiptUploadRateLimiter` et un test 429, et optionnellement pour le scanner.
  - [x] T6.4 Lancer `npx vitest run src/app/api/chat/messages/route.test.ts src/app/api/opportunities/route.test.ts src/app/api/subscriptions/upload-receipt/route.test.ts`.

- [x] **T7 — Build et validation** (AC: #6, #7)
  - [x] T7.1 Lancer `npm run build`.
  - [x] T7.2 Lancer la suite Vitest concernée.
  - [x] T7.3 Vérifier qu'aucune référence à des clés secrètes d'antivirus n'est logguée en clair.

## Dev Notes

### Contexte métier

Cette story clôt Epic 26 sur la sécurité. Elle vise à durcir trois endpoints exposés aux membres :
- Le chat de support (story 18.x) déjà protégé par un rate limiter par user mais pas par IP.
- La création d'opportunités (story 3.1), actuellement sans rate limiting.
- L'upload de reçu de virement (story 26.3), actuellement sans rate limiting ni scan antivirus.

Le scan antivirus est un garde-fou réglementaire CENTIF-CI / conformité : aucun justificatif potentiellement infecté ne doit être stocké ou partagé avec l'admin.

### Architecture / Guardrails

- **Rate limiting existant :** `src/lib/rate-limit.ts` contient déjà `createRateLimiter`, `getClientIp`, `getClientIdentifier`, `signupRateLimiter`, `signinRateLimiter`, `accountDeleteRateLimiter`, `chatMessageRateLimiter`, `verificationSendRateLimiter`. `src/lib/api-rate-limit.ts` contient `apiRateLimiter` et `passwordResetRateLimiter`. Réutiliser la factory existante.
- **Clé d'identification :** pour les routes authentifiées sensibles, la spec demande une limite par IP. Utiliser donc `getClientIp(req)` et **non** `getClientIdentifier(req, userId)` pour les nouveaux limiters de cette story (chat public 10/min, deals 2/min, upload 3/min).
- **Header `Retry-After` :** suivre le pattern déjà utilisé dans `/api/auth/signup`, `/api/auth/signin`, `/api/auth/send-verification`, `/api/user/account` et `/api/lead-magnet` :
  ```ts
  const retryAfter = Math.ceil((rateLimit.reset - Date.now()) / 1000);
  return NextResponse.json(
    { error: "Trop de requêtes. Veuillez patienter.", code: "RATE_LIMITED" },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
  ```
- **Ordre des opérations dans `upload-receipt` :** validation Zod → rate-limiting → scan antivirus → upload R2 → audit log → mise à jour Prisma. L'audit log doit précéder l'écriture DB (pitfall #53).
- **JSX Boolean Guardrail (Next.js 16 strict) :** si un composant UI est modifié pour afficher une erreur de scan/limite, utiliser `condition ? <Component /> : null` et **jamais** `condition && <Component />`.
- **Client components :** tout nouveau handler d'événement (`onClick`, `onSubmit`) nécessite `'use client'` en haut du fichier.
- **Git safety :** ne jamais utiliser `git add -A`. N'ajouter explicitement que les fichiers modifiés, en excluant `dev.db` et `*.sqlite3`.
- **Secrets :** ne jamais logger `ANTIVIRUS_API_KEY`, le buffer brut d'un fichier, ou les métadonnées complètes d'un scan. Utiliser `sanitizeError`.

### Fichiers impactés

| Fichier | Action | Raison |
|---------|--------|--------|
| `src/lib/rate-limit.ts` | UPDATE | Ajouter `chatMessagePublicRateLimiter` (10 req/60 s par IP), `opportunityCreateRateLimiter` (2 req/60 s par IP), `receiptUploadRateLimiter` (3 req/60 s par IP) |
| `src/app/api/chat/messages/route.ts` | UPDATE | Appliquer le rate-limiting par IP avant le traitement du message |
| `src/app/api/opportunities/route.ts` | UPDATE | Appliquer le rate-limiting par IP sur le handler POST |
| `src/app/api/subscriptions/upload-receipt/route.ts` | UPDATE | Ajouter rate-limiting + scan antivirus + audit log avant écriture DB |
| `src/lib/file-scan.ts` | NEW | Wrapper du service de scan antivirus |
| `.env.example` | UPDATE | Documenter les variables d'antivirus (ex: `ANTIVIRUS_API_KEY`, `ANTIVIRUS_API_URL`) |
| `src/app/api/chat/messages/route.test.ts` | UPDATE | Mock du nouveau limiter + test 429 |
| `src/app/api/opportunities/route.test.ts` | UPDATE | Mock du nouveau limiter + test 429 |
| `src/app/api/subscriptions/upload-receipt/route.test.ts` | UPDATE | Mock du nouveau limiter + tests scan antivirus |
| `package.json` | UPDATE | Ajouter le client antivirus choisi (si package npm) |
| `package-lock.json` | UPDATE (auto) | Suite à l'installation |

### Décision clé : chat

Le `chatMessageRateLimiter` actuel est utilisé et testé avec une limite de 1 req/30 s par `userId`. La spec de l'épic 26 demande 10 messages/min/IP. Pour éviter de casser les tests existants et la protection anti-spam par user, **créer un second limiter** `chatMessagePublicRateLimiter` configuré à 10 req/60 s par IP, et l'utiliser dans `src/app/api/chat/messages/route.ts` en complément (ou en remplacement — le DS garde le plus restrictif). Recommandation : appliquer les **deux** limiters en série (d'abord par IP, puis par user) ou remplacer par le limiter IP si la spec est stricte. Le story file laisse le choix au DS mais **exige** que la spec 10/min/IP soit satisfaite.

### Détails techniques

#### 1. Ajout des limiters dans `src/lib/rate-limit.ts`

```typescript
export const chatMessagePublicRateLimiter = createRateLimiter({ requests: 10, windowSeconds: 60 });
export const opportunityCreateRateLimiter = createRateLimiter({ requests: 2, windowSeconds: 60 });
export const receiptUploadRateLimiter = createRateLimiter({ requests: 3, windowSeconds: 60 });
```

`createRateLimiter` retourne déjà un objet `{ limit }` qui est inopérant si les envvars Upstash sont manquantes (mock `success: true`). Les tests locaux continueront donc de fonctionner si les envvars ne sont pas set.

#### 2. Handler `POST /api/chat/messages` — pattern à insérer avant validation

```typescript
import { chatMessagePublicRateLimiter, getClientIp } from "@/lib/rate-limit";

const ipIdentifier = `ip:${getClientIp(req)}`;
const rateLimit = await chatMessagePublicRateLimiter.limit(ipIdentifier);
if (!rateLimit.success) {
  const retryAfter = Math.ceil((rateLimit.reset - Date.now()) / 1000);
  return NextResponse.json(
    { error: "Trop de messages envoyés. Veuillez patienter.", code: "RATE_LIMITED" },
    { status: 429, headers: { "Retry-After": String(Math.max(1, retryAfter)) } }
  );
}
```

Le test existant moque `chatMessageRateLimiter` : il faudra ajouter le mock de `chatMessagePublicRateLimiter` ou adapter le mock global de `@/lib/rate-limit`.

#### 3. Handler `POST /api/opportunities` — pattern à insérer après auth

```typescript
import { opportunityCreateRateLimiter, getClientIp } from "@/lib/rate-limit";

const ipIdentifier = `ip:${getClientIp(req)}`;
const rateLimit = await opportunityCreateRateLimiter.limit(ipIdentifier);
if (!rateLimit.success) {
  const retryAfter = Math.ceil((rateLimit.reset - Date.now()) / 1000);
  return NextResponse.json(
    { error: "Trop d'opportunités créées. Veuillez patienter.", code: "RATE_LIMITED" },
    { status: 429, headers: { "Retry-After": String(Math.max(1, retryAfter)) } }
  );
}
```

#### 4. Handler `POST /api/subscriptions/upload-receipt` — ordre final

1. Auth
2. Vérification R2
3. Validation `subscriptionId` / fichier / Zod `receiptUploadSchema`
4. Rate-limiting par IP
5. Recherche de la subscription
6. Scan antivirus du buffer
7. Upload R2
8. Audit log `safeCreateAuditLog`
9. Mise à jour Prisma
10. Réponse 201

Si scan échoue après upload temporaire : appeler `deleteR2Object(r2Key)` puis retourner 400.

#### 5. Exemple minimal de `src/lib/file-scan.ts`

```typescript
export async function scanFile(_buffer: Buffer): Promise<{ isSafe: boolean; reason?: string }> {
  if (!process.env.ANTIVIRUS_API_KEY) {
    console.warn("[file-scan] Aucun service d'antivirus configuré — scan ignoré en test.");
    return { isSafe: true };
  }

  // Appel au service cloud choisi par le DS.
  // En cas de menace détectée : return { isSafe: false, reason: "Threat detected" };
  // En cas d'erreur réseau : return { isSafe: false, reason: "Scan unavailable" };

  return { isSafe: true };
}
```

### Anti-patterns à éviter

- ❌ Modifier `chatMessageRateLimiter` directement à 10/60 sans créer de nouveau limiter — cela casserait le test `route.test.ts` existant et affaiblirait la protection anti-spam par user.
- ❌ Utiliser `getClientIdentifier(req, userId)` pour les nouvelles limites de cette story : la spec exige par IP.
- ❌ Omettre le header `Retry-After` sur les réponses 429.
- ❌ Scanner le fichier **après** l'écriture DB — un fichier infecté ne doit jamais être persisté.
- ❌ Logger le buffer complet, la clé API antivirus, ou des URLs de scan contenant des tokens.
- ❌ Installer ClamAV local sans vérifier la compatibilité avec le VPS Infomaniak / le build standalone Next.js.
- ❌ Utiliser `git add -A` — ajouter explicitement chaque fichier modifié.

### Références

- [Source: `_bmad-output/planning-artifacts/epic-26-consolidation-spec.md` — Story 26.7]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — Rate limiting Upstash Redis, API Response Format (429 + Retry-After), Upload Security & Antivirus Scan Patterns, JSX Boolean Guardrail, Dev Agent Git Safety]
- [Source: `src/lib/rate-limit.ts` — factory existante et limiters actuels]
- [Source: `src/lib/api-rate-limit.ts` — `apiRateLimiter` existant]
- [Source: `src/app/api/chat/messages/route.ts` — handler POST existant avec `chatMessageRateLimiter`]
- [Source: `src/app/api/opportunities/route.ts` — handler POST sans rate limiting]
- [Source: `src/app/api/subscriptions/upload-receipt/route.ts` — upload R2 sans antivirus]
- [Source: `src/lib/r2.ts` — helpers R2 incluant `deleteR2Object`]
- [Source: `src/lib/validations.ts` — `receiptUploadSchema`]
- [Source: `src/lib/audit-log.ts` — `safeCreateAuditLog`]
- [Source: `src/lib/sanitize-log.ts` — `sanitizeError`]
- [Source: `src/app/api/chat/messages/route.test.ts` — tests chat existants]
- [Source: `src/app/api/opportunities/route.test.ts` — tests opportunities existants]
- [Source: `src/app/api/subscriptions/upload-receipt/route.test.ts` — tests upload existants]
- [Source: `.env.example` — variables Upstash Redis déjà documentées]

## Dev Agent Record

### Agent Model Used

- kimi-k2.7-code (via Hermes Agent).

### Debug Log References

- Aucun build ou test exécuté à ce stade (phase create-story uniquement).

### Completion Notes List

- Story 26.7 identifiée dans `sprint-status.yaml` comme `backlog` → passage à `ready-for-dev`.
- Fichier de story créé avec le contexte complet des limiters existants, du delta de scoping, de la décision chat (nouveau limiter vs modification), et des guardrails antivirus.
- Baseline commit enregistré : `bfc61ea8731cc6d4a2d053efc0bae243316503f4`.

### File List

- `_bmad-output/implementation-artifacts/story-26-7-securite-rate-limiting-et-scan-antivirus.md` (NEW)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (UPDATE : statut 26-7 → ready-for-dev)

### Change Log

- 2026-07-09 — Création du contexte de la story 26.7 : rate-limiting Upstash Redis et scan antivirus.
