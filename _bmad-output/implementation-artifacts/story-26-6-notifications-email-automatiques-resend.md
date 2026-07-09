---
baseline_commit: bfc61ea8731cc6d4a2d053efc0bae243316503f4
---

# Story 26.6 : Notifications Email Automatiques (Resend)

Status: review

## Story

As an **administrateur IBC**,  
I want **que les emails transactionnels (abonnement approuvé / refusé, opportunité validée / rejetée) soient expédiés automatiquement via l'API Resend**,  
so that **les membres et porteurs reçoivent une notification soignée en français sans bloquer la réponse des routes admin**.

## Acceptance Criteria

1. **AC-1 — Migration de Nodemailer SMTP vers Resend API**
   - Given `src/lib/email.ts` utilisant Nodemailer + Infomaniak SMTP,  
     When le développeur exécute cette story,  
     Then `src/lib/email.ts` utilise le package `resend`, les variables `RESEND_API_KEY` et `RESEND_FROM_EMAIL`, et toutes les signatures publiques existantes restent inchangées.

2. **AC-2 — Dépendances propres**
   - Given `package.json` contenant `nodemailer` et `@types/nodemailer`,  
     When la migration est terminée,  
     Then `resend` est installé et `nodemailer` + `@types/nodemailer` sont désinstallés ; `package-lock.json` est mis à jour.

3. **AC-3 — Envoi d'email lors de l'approbation d'abonnement**
   - Given un abonnement approuvé par l'admin via `PATCH /api/admin/subscriptions/[id]`,  
     Then l'utilisateur reçoit automatiquement un email l'informant que son compte est actif.

4. **AC-4 — Envoi d'email lors du rejet d'abonnement**
   - Given un abonnement refusé par l'admin via `PATCH /api/admin/subscriptions/[id]`,  
     Then l'utilisateur reçoit un email avec la justification du refus.

5. **AC-5 — Envoi d'email lors de la validation / réjection d'opportunité**
   - Given une opportunité validée ou rejetée via `PATCH /api/admin/opportunities/[id]/verify`,  
     Then le porteur reçoit un email avec le statut de validation.

6. **AC-6 — Fire-and-forget avec log d'erreur**
   - Given un envoi d'email transactionnel,  
     Then il ne bloque pas la réponse HTTP de l'API ; les échecs sont loggés de manière asynchrone via `console.error` avec `sanitizeError`.

7. **AC-7 — Idempotence côté opportunité**
   - Given un deal déjà `VERIFIED` ou `REJECTED`,  
     When un admin re-applique le même statut,  
     Then aucun email n'est renvoyé au porteur et aucun email de matching n'est renvoyé aux membres.

8. **AC-8 — Audit log avant effet de bord**
   - Given toute action admin déclenchant un email,  
     Then `safeCreateAuditLog` est appelé **avant** l'envoi d'email (pas après).

9. **AC-9 — Tests mis à jour**
   - Given la suite de tests existante,  
     Then `src/lib/email.test.ts`, `src/app/api/admin/subscriptions/[id]/route.test.ts` et `src/app/api/admin/opportunities/[id]/verify/route.test.ts` sont adaptés pour mocker `resend` au lieu de Nodemailer, et les tests passent.

## Tasks / Subtasks

- [x] **T1 — Auditer `src/lib/email.ts` et toutes ses signatures publiques** (AC: #1, #2)
  - [x] T1.1 Lister toutes les fonctions exportées actuelles (`sendEmailVerificationEmail`, `sendSubscriptionActivatedEmail`, `sendAdminSubscriptionConfirmationEmail`, `sendSubscriptionRejectedEmail`, `sendOpportunityVerifiedEmail`, `sendOpportunityMatchedEmail`, `sendOpportunityRejectedEmail`, `sendWelcomeEmail`, `sendReminderEmail`, `sendGuideEmail`, `sendPasswordResetEmail`, `sendSetPasswordEmail`).
  - [x] T1.2 Vérifier qu'aucune signature ne change ; seule l'implémentation interne (`sendEmail` / `getTransporter`) est refactorée.
  - [x] T1.3 Installer `resend` (`npm install resend`).
  - [x] T1.4 Désinstaller `nodemailer` et `@types/nodemailer` (`npm uninstall nodemailer @types/nodemailer`).
  - [x] T1.5 Supprimer `_transporter`, `_resetTransporter`, `getTransporter`, `getSender` et toutes les références aux variables `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_ENCRYPTION`, `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME`.
  - [x] T1.6 Initialiser le client Resend avec `new Resend(process.env.RESEND_API_KEY)`.
  - [x] T1.7 Utiliser `process.env.RESEND_FROM_EMAIL` comme expéditeur (`from`) ; nommer l'expéditeur `Ivoire Business Club` (comportement actuel).
  - [x] T1.8 Renvoyer le résultat de `resend.emails.send({ from, to, subject, text })` dans `sendEmail` ; conserver le log `console.log` en non-test.

- [x] **T2 — Adapter `src/app/api/admin/subscriptions/[id]/route.ts` au fire-and-forget** (AC: #3, #4, #6, #8)
  - [x] T2.1 Confirmer que `safeCreateAuditLog` est bien appelé **avant** l'envoi d'email (déjà correct).
  - [x] T2.2 Transformer le bloc `try { ... } catch { return 500 }` actuel autour des emails en appels asynchrones non bloquants : `void sendSubscriptionActivatedEmail(...).catch(error => console.error(...))`.
  - [x] T2.3 S'assurer que l'API retourne `200 { data: updatedSubscription }` même si l'email échoue.
  - [x] T2.4 Conserver `sanitizeError` dans le log d'erreur.

- [x] **T3 — Vérifier `src/app/api/admin/opportunities/[id]/verify/route.ts`** (AC: #5, #6, #7, #8)
  - [x] T3.1 Confirmer que `safeCreateAuditLog` précède `sendFinalEmail` (déjà correct).
  - [x] T3.2 Conserver l'appel à `sendFinalEmail` sans `await` ou via `void ... .catch(...)` pour rester fire-and-forget.
  - [x] T3.3 Conserver `notifyMatchedMembers` en `try/catch` avec `Promise.allSettled` ; vérifier qu'il ne se déclenche que lorsque `currentStatus !== "VERIFIED"` et `effectiveNextStatus === "VERIFIED"` (idempotence déjà présente).
  - [x] T3.4 S'assurer que `sendFinalEmail` n'est appelé que lorsque `!pendingSecondVerification` (déjà correct).

- [x] **T4 — Mettre à jour les tests** (AC: #9)
  - [x] T4.1 Réécrire `src/lib/email.test.ts` : mocker le module `resend` au lieu de `nodemailer`, initialiser `process.env.RESEND_API_KEY` et `RESEND_FROM_EMAIL` dans `beforeEach`.
  - [x] T4.2 Adapter les assertions : vérifier l'appel à `resend.emails.send` avec `{ from, to, subject, text }`.
  - [x] T4.3 Mettre à jour `src/app/api/admin/subscriptions/[id]/route.test.ts` : l'email est maintenant fire-and-forget, vérifier qu'il est appelé et que l'API retourne 200 même si l'email échoue.
  - [x] T4.4 Mettre à jour `src/app/api/admin/opportunities/[id]/verify/route.test.ts` si nécessaire (les mocks existants doivent rester compatibles).
  - [x] T4.5 Lancer `npx vitest run src/lib/email.test.ts src/app/api/admin/subscriptions/[id]/route.test.ts src/app/api/admin/opportunities/[id]/verify/route.test.ts`.

- [x] **T5 — Variables d'environnement et documentation** (AC: #1, #2)
  - [x] T5.1 S'assurer que `.env.example` contient toujours `RESEND_API_KEY` et `RESEND_FROM_EMAIL` (déjà présents).
  - [x] T5.2 Laisser les variables `MAIL_*` dans `.env.example` pour compatibilité ascendante, mais ne plus les utiliser dans le code (mises en commentaire).
  - [x] T5.3 Vérifier que `next.config.ts` n'a pas besoin de modification (les variables publiques ne changent pas).

- [x] **T6 — Build et validation** (AC: #9)
  - [x] T6.1 Lancer `npm run build`.
  - [x] T6.2 Lancer la suite de tests Vitest concernée.
  - [x] T6.3 Vérifier qu'aucune référence à `nodemailer` ne subsiste dans le code source (`grep -r "nodemailer" src/ --include="*.ts" --include="*.tsx"`).

## Dev Notes

### Contexte métier

Cette story remplace définitivement l'envoi SMTP Infomaniak (Nodemailer) par l'API Resend, choisie dans l'architecture IBC pour sa simplicité, sa délivrabilité et sa correspondance au modèle transactionnel de la plateforme. Les emails concernés sont :
- **Abonnement approuvé** → `sendSubscriptionActivatedEmail`
- **Abonnement refusé** → `sendSubscriptionRejectedEmail`
- **Opportunité validée** → `sendOpportunityVerifiedEmail`
- **Opportunité rejetée** → `sendOpportunityRejectedEmail`
- **Opportunité matchée** → `sendOpportunityMatchedEmail` (déjà en place)

L'objectif est une migration **delta** : le code existant appelle déjà ces fonctions ; il faut juste changer le transporteur et garantir le pattern fire-and-forget.

### Architecture / Guardrails

- **Next.js 16 App Router / Route Handlers :** les routes admin sont des Route Handlers. Les envois d'email sont des effets de bord qui ne doivent pas impacter le statut HTTP renvoyé au client.
- **Resend API :** utiliser le constructeur `Resend(apiKey)` et la méthode `resend.emails.send({ from, to, subject, text })`. Le package officiel est `resend`.
- **Fire-and-forget :** ne pas `await` l'envoi d'email dans le chemin critique de la réponse. Utiliser `void sendXxx(...).catch(...)` pour logger l'erreur sans bloquer.
- **Audit log placement :** `safeCreateAuditLog` doit précéder l'envoi d'email (pitfall #53). Cela est déjà respecté dans les deux routes admin concernées.
- **Idempotent State-Transition Side Effects :** les emails d'opportunité ne doivent pas être renvoyés si le statut ne change pas effectivement. La route `verify/route.ts` gère déjà ce cas via `currentStatus === nextStatus` et `!pendingSecondVerification`.
- **JSX Boolean Guardrail :** cette story ne crée pas de composant JSX, mais tout template React-Email éventuel doit utiliser `condition ? <Component /> : null` (pitfall #31).
- **Secrets :** ne jamais logger `RESEND_API_KEY`, le payload d'erreur complet ou l'objet `error` brut. Utiliser `sanitizeError`.

### Fichiers impactés

| Fichier | Action | Raison |
|--------|--------|--------|
| `src/lib/email.ts` | REFACTOR | Remplacer Nodemailer par Resend, garder les signatures publiques |
| `src/app/api/admin/subscriptions/[id]/route.ts` | UPDATE | Transformer l'envoi d'email en fire-and-forget |
| `src/app/api/admin/opportunities/[id]/verify/route.ts` | UPDATE (léger) | Vérifier / confirmer le fire-and-forget et l'idempotence |
| `src/lib/email.test.ts` | UPDATE | Mocker Resend au lieu de Nodemailer |
| `src/app/api/admin/subscriptions/[id]/route.test.ts` | UPDATE | Adapter aux envois non bloquants |
| `src/app/api/admin/opportunities/[id]/verify/route.test.ts` | UPDATE (léger) | Confirmer la compatibilité des mocks |
| `package.json` | UPDATE | `+resend`, `-nodemailer`, `-@types/nodemailer` |
| `package-lock.json` | UPDATE (auto) | Suite aux modifications de dépendances |

### Détails techniques

#### 1. Refactor de `src/lib/email.ts`

Remplacer l'import et la logique SMTP par :

```typescript
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "";

async function sendEmail({ to, subject, text }: { to: string; subject: string; text: string }) {
  if (!process.env.RESEND_API_KEY || !FROM_EMAIL) {
    throw new Error("RESEND_API_KEY and RESEND_FROM_EMAIL must be configured for email sending");
  }

  const result = await resend.emails.send({
    from: `Ivoire Business Club <${FROM_EMAIL}>`,
    to,
    subject,
    text,
  });

  if (process.env.NODE_ENV !== "test") {
    console.log(`[email] Sent to ${to}: ${subject} (id: ${result.data?.id ?? "n/a"})`);
  }

  return result;
}
```

> **Note :** `result` de Resend v3 contient `{ data: { id }, error }`. Le log doit rester robuste si `data` est `null`.

Supprimer `_resetTransporter` de l'API publique. Les tests pourront mocker `resend.emails.send` directement.

#### 2. Fire-and-forget dans `src/app/api/admin/subscriptions/[id]/route.ts`

Après l'audit log, transformer :

```typescript
try {
  if (action === "validate") {
    await sendSubscriptionActivatedEmail({ ... });
  }
  if (action === "reject") {
    await sendSubscriptionRejectedEmail({ ... });
  }
} catch (emailError) {
  console.error("Subscription email error:", sanitizeError(emailError));
  return NextResponse.json({ error: "Abonnement mis à jour, mais l'email n'a pas pu être envoyé.", code: "EMAIL_FAILED" }, { status: 500 });
}
```

en :

```typescript
if (action === "validate") {
  void sendSubscriptionActivatedEmail({
    to: subscription.user.email,
    name: subscription.user.name,
    tier: subscription.tier,
  }).catch((emailError) => {
    console.error("Subscription email error:", sanitizeError(emailError));
  });
}

if (action === "reject") {
  void sendSubscriptionRejectedEmail({
    to: subscription.user.email,
    name: subscription.user.name,
    tier: subscription.tier,
    reason: parsed.data.reason,
  }).catch((emailError) => {
    console.error("Subscription email error:", sanitizeError(emailError));
  });
}
```

#### 3. Vérification de `src/app/api/admin/opportunities/[id]/verify/route.ts`

Le code actuel est déjà structuré de manière asynchrone :

```typescript
try {
  if (!pendingSecondVerification) {
    await sendFinalEmail(effectiveNextStatus, updated);
  }
} catch (error) {
  console.error("[admin-opportunity-email]", { opportunityId: id, status: effectiveNextStatus, error: sanitizeError(error) });
}
```

Pour être strictement fire-and-forget (ne pas attendre le résultat de Resend), remplacer par :

```typescript
if (!pendingSecondVerification) {
  void sendFinalEmail(effectiveNextStatus, updated).catch((error) => {
    console.error("[admin-opportunity-email]", { opportunityId: id, status: effectiveNextStatus, error: sanitizeError(error) });
  });
}
```

`notifyMatchedMembers` gère déjà ses envois via `Promise.allSettled` ; laisser tel quel, mais s'assurer qu'elle est toujours appelée après vérification effective du changement de statut (`currentStatus !== "VERIFIED"`).

#### 4. Tests

**Mock Resend dans `email.test.ts` :**

```typescript
const mockSend = vi.hoisted(() => vi.fn());

vi.mock("resend", () => ({
  Resend: vi.fn(() => ({ emails: { send: mockSend } })),
}));
```

Initialiser :

```typescript
process.env.RESEND_API_KEY = "re_xxxxxxxx";
process.env.RESEND_FROM_EMAIL = "contact@ivoire-business-club.com";
```

Assertion type :

```typescript
expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
  from: "Ivoire Business Club <contact@ivoire-business-club.com>",
  to: "member@example.com",
  subject: "Votre abonnement IBC est activé",
  text: expect.stringContaining("Votre abonnement IBC Grands Frères est activé"),
}));
```

**Tests de routes admin :** l'email étant fire-and-forget, les assertions existantes sur `mockSendActivated.toHaveBeenCalledWith(...)` restent valides. Vérifier en plus que l'API retourne 200 même quand `mockSendActivated.mockRejectedValueOnce(new Error("resend down"))`.

### Anti-patterns à éviter

- ❌ Réécrire `src/lib/email.ts` from scratch — il faut migrer le transporteur, pas recréer les templates texte.
- ❌ Changer les signatures des fonctions email exportées — de nombreux appelants (`auth.ts`, `verification-email.server.ts`, signup route, admin routes) les utilisent.
- ❌ Utiliser `await` sur l'envoi d'email dans les routes admin — cela bloque la réponse et viole AC-6.
- ❌ Logger l'objet d'erreur Resend brut contenant potentiellement des détails sensibles — toujours passer par `sanitizeError`.
- ❌ Supprimer les variables `MAIL_*` de `.env.example` — les garder pour compatibilité ascendante (décision PO).
- ❌ Oublier de mettre à jour `package-lock.json` — utiliser `npm install`/`npm uninstall`.

### Références

- [Source: `_bmad-output/planning-artifacts/epic-26-consolidation-spec.md` — Story 26.6]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — Emails Resend, API Response Format, Idempotent State-Transition Side Effects, JSX Boolean Guardrail]
- [Source: `_bmad-output/planning-artifacts/prd.md` — FR1–FR7 (auth/emails), FR8–FR14 (tiers/subscriptions), FR15–FR23 (marketplace/verification)]
- [Source: `src/lib/email.ts` — implémentation Nodemailer actuelle à refactorer]
- [Source: `src/app/api/admin/subscriptions/[id]/route.ts` — approbation / rejet abonnement]
- [Source: `src/app/api/admin/opportunities/[id]/verify/route.ts` — vérification / rejet opportunité]
- [Source: `src/lib/email.test.ts` — tests Nodemailer actuels à adapter]
- [Source: `package.json` — dépendances `nodemailer` et `@types/nodemailer`]

## Dev Agent Record

### Agent Model Used

- kimi-k2.7-code (via Hermes Agent).

### Debug Log References

- Aucun build ou test exécuté à ce stade (phase create-story uniquement).

### Completion Notes List

- Story 26.6 identifiée dans `sprint-status.yaml` comme `backlog` → passage à `ready-for-dev`.
- Fichier de story créé avec le contexte complet de migration Resend, les guardrails fire-and-forget, l'audit log placement et les fichiers impactés.
- Baseline commit enregistré : `bfc61ea8731cc6d4a2d053efc0bae243316503f4`.
- **Implémentation DS terminée** :
  - `src/lib/email.ts` refactoré de Nodemailer SMTP vers Resend API ; toutes les signatures publiques conservées ; `_resetTransporter`, `_transporter`, `getTransporter`, `getSender` supprimés ; log `console.log` préservé en non-test.
  - `resend` installé (`^4.x`), `nodemailer` et `@types/nodemailer` désinstallés.
  - `src/app/api/admin/subscriptions/[id]/route.ts` : envoi d'email fire-and-forget (`void send...().catch(...)`), retourne toujours 200 même en cas d'échec email, audit log avant envoi.
  - `src/app/api/admin/opportunities/[id]/verify/route.ts` : `sendFinalEmail` en fire-and-forget, audit log avant envoi, idempotence conservée (`currentStatus !== "VERIFIED"`).
  - `src/lib/email.test.ts` et `src/app/api/admin/subscriptions/[id]/route.test.ts` adaptés pour mocker Resend et tester le comportement fire-and-forget.
  - `.env.example` mis à jour : `RESEND_API_KEY` / `RESEND_FROM_EMAIL` actifs, variables `MAIL_*` commentées pour compatibilité ascendante.
- **Validation** :
  - `npm run build` : OK.
  - `npx vitest run src/lib/email.test.ts src/app/api/admin/subscriptions/[id]/route.test.ts src/app/api/admin/opportunities/[id]/verify/route.test.ts` : OK (42/42).
  - `npx vitest run` complet : OK (181 fichiers, 1280 tests).
  - `grep -r "nodemailer" src/` : aucune référence résiduelle.

### File List

- `_bmad-output/implementation-artifacts/story-26-6-notifications-email-automatiques-resend.md` (NEW)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (UPDATE : statut 26-6 → review)
- `src/lib/email.ts` (REFACTOR : Nodemailer → Resend)
- `src/lib/email.test.ts` (UPDATE : mock Resend, assertions Resend)
- `src/app/api/admin/subscriptions/[id]/route.ts` (UPDATE : fire-and-forget)
- `src/app/api/admin/subscriptions/[id]/route.test.ts` (UPDATE : tests fire-and-forget + email failures)
- `src/app/api/admin/opportunities/[id]/verify/route.ts` (UPDATE : fire-and-forget)
- `package.json` (UPDATE : +resend, -nodemailer, -@types/nodemailer)
- `package-lock.json` (UPDATE : suite aux modifications de dépendances)
- `.env.example` (UPDATE : Resend actif, MAIL_* commentées pour compatibilité ascendante)

### Change Log

- 2026-07-09 — Création du contexte de la story 26.6 : notifications email automatiques via Resend.
- 2026-07-09 — Implémentation DS 26.6 terminée : migration Resend, fire-and-forget, tests verts, build OK.
