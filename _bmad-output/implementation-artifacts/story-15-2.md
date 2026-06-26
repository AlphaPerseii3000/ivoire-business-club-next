---
Story: "15.2"
StoryKey: "15-2-relances-automatiques-cron"
Title: "Relances automatiques par email (cron)"
Status: "done"
Priority: "P1"
Epic: "Epic 15 — Onboarding Enforcement & Relances Automatiques"
FRs: ["FR-ONB4", "FR-ONB5"]
NFRs: ["NFR-S5", "NFR-S7", "NFR-A1", "NFR-P2"]
UXDRs: ["UX-DR13", "UX-DR19", "UX-DR20"]
Created: "2026-06-26"
baseline_commit: "d66dbcf"
last_updated: '2026-06-26T21:56:00+0200'
---

# Story 15.2 : Relances automatiques par email (cron)

Status: done

<!-- Note: Ultimate context engine analysis completed - comprehensive developer guide created. Brownfield/delta story: email verification flow, complete-profile page, welcome email, JWT claims, and soft-gate already implemented by story 15-1. This story adds only the automated reminder cron and its deployment docs. -->

## Story

**En tant que** admin IBC,  
**Je veux** que les membres incomplets reçoivent des relances automatiques par email,  
**Afin de** maximiser le taux de complétion sans intervention manuelle.

## Acceptance Criteria

1. **AC1 — Route cron protégée**
   - **Given** la route `POST /api/cron/remind-incomplete-users`
   - **When** elle reçoit une requête sans header `Authorization: Bearer <CRON_SECRET>`
   - **Then** elle retourne 401 Unauthorized
   - **And** si le secret correspond à `process.env.CRON_SECRET`, elle exécute la logique de relance

2. **AC2 — Logique de relance séquencée**
   - **Given** la route cron est déclenchée
   - **When** elle s'exécute
   - **Then** elle parcourt tous les utilisateurs avec `emailVerified === false` OU `onboardingCompletedAt === null`
   - **And** pour chaque utilisateur, elle calcule le nombre de jours depuis l'inscription (`createdAt`)
   - **And** elle applique les règles suivantes :
     - **J+1** (inscription il y a 1 jour ±12h) : Email "Vérifiez votre adresse email" avec lien `/auth/verify-email?resend=1`
     - **J+3** (inscription il y a 3 jours ±12h) : Email "Complétez votre profil IBC" avec lien `/onboarding/complete-profile`
     - **J+7** (inscription il y a 7 jours ±12h) : Email "Dernier rappel — votre compte IBC n'est pas finalisé" avec les 2 liens
   - **And** un utilisateur ne reçoit pas plus d'un email par cycle de relance
   - **And** si l'utilisateur a `emailVerified === true` mais `onboardingCompletedAt === null`, il ne reçoit que les relances profil (J+3, J+7)

3. **AC3 — Suivi des relances envoyées**
   - **Given** le système de relance
   - **When** un email est envoyé
   - **Then** un enregistrement est persisté pour éviter les doublons
   - **And** le log contient : `userId`, `type` (EMAIL_VERIFICATION | PROFILE_COMPLETION | FINAL_REMINDER), `sentAt`

4. **AC4 — Idempotence**
   - **Given** le cron est déclenché deux fois le même jour
   - **When** il s'exécute
   - **Then** aucun email n'est envoyé en double (vérification via le log de relance)

5. **AC5 — Email templates**
   - **Given** les emails de relance
   - **When** ils sont rendus
   - **Then** ils sont en français, avec le branding IBC
   - **And** chaque email contient un CTA clair et un lien direct vers l'action requise
   - **And** chaque email mentionne "Vous recevez cet email car vous avez créé un compte sur Ivoire Business Club"

6. **AC6 — Documentation déploiement**
   - **Given** la route cron
   - **When** elle est déployée
   - **Then** la variable d'environnement `CRON_SECRET` est documentée dans `.env.example`
   - **And** les instructions de déploiement crontab VPS Hetzner sont documentées dans un fichier `docs/cron-setup.md`

7. **AC7 — Déploiement crontab VPS Hetzner**
   - **Given** le VPS Hetzner qui héberge IBC
   - **When** l'admin configure le cron
   - **Then** le secret est stocké dans un fichier protégé : `echo "<secret>" > /etc/ibc/cron-secret && chmod 600 /etc/ibc/cron-secret`
   - **And** la ligne crontab suivante est ajoutée via `crontab -e` :
     ```
     # Daily onboarding reminders at 09:00
     0 9 * * * curl -fsS -X POST https://www.ivoire-business-club.com/api/cron/remind-incomplete-users -H "Authorization: Bearer $(cat /etc/ibc/cron-secret)" >> /var/log/ibc-cron.log 2>&1
     ```
   - **And** le fichier de log est créé : `touch /var/log/ibc-cron.log`
   - **And** le cron s'exécute une fois par jour à 09:00 (heure serveur)
   - **And** les erreurs sont loggées dans `/var/log/ibc-cron.log`

## Tasks / Subtasks

- [x] **AC1 — Créer la route cron protégée**
  - [x] Créer `src/app/api/cron/remind-incomplete-users/route.ts` avec handler `POST`.
  - [x] Lire le header `Authorization` ; retourner `401 Unauthorized` s'il manque ou ne correspond pas à `process.env.CRON_SECRET`.
  - [x] Normaliser la comparaison avec `Bearer <secret>` (trim, sensitive exact match).
  - [x] Retourner `200 OK { data: { processed: number, sent: number } }` en cas de succès.

- [x] **AC2 — Implémenter le séquenceur de relance**
  - [x] Créer `src/lib/reminders.server.ts` pour isoler la logique métier et faciliter les tests.
  - [x] Requêter `prisma.user.findMany` avec `select` minimal : `id`, `email`, `name`, `emailVerified`, `onboardingCompletedAt`, `createdAt`, `lastReminderSentAt`, `reminderCount`.
  - [x] Filtrer les utilisateurs dont `emailVerified === false` OU `onboardingCompletedAt === null` ET `createdAt` >= J-7 (limite pour ne pas spammer les comptes anciens).
  - [x] Calculer `ageDays = floor((now - createdAt) / 24h)` ; appliquer une fenêtre de ±12h (43200000 ms) autour de chaque jal J+1 / J+3 / J+7.
  - [x] Déterminer le reminder type applicable :
    - `EMAIL_VERIFICATION` si `ageDays ~ 1` ET `emailVerified === false`.
    - `PROFILE_COMPLETION` si `ageDays ~ 3` ET `onboardingCompletedAt === null`.
    - `FINAL_REMINDER` si `ageDays ~ 7` ET (`emailVerified === false` OU `onboardingCompletedAt === null`).
  - [x] S'assurer qu'un utilisateur ne reçoit qu'un seul email par exécution cron (un seul type applicable par jour).

- [x] **AC3/AC4 — Persister le suivi des relances et garantir l'idempotence**
  - [x] Modifier `prisma/schema.prisma` : ajouter sur `User` :
    - `lastReminderSentAt DateTime?`
    - `reminderCount Int @default(0)`
  - [x] Exécuter `npx prisma migrate dev --name add_user_reminder_fields`.
  - [x] À chaque envoi, incrémenter `reminderCount` et mettre à jour `lastReminderSentAt`.
  - [x] Vérifier l'idempotence : si `lastReminderSentAt` est aujourd'hui (même date UTC), ne pas renvoyer (ou utiliser un log distinct si besoin future story 15.3).
  - [x] Alternative technique note : le SCP mentionne une table `ReminderLog` ou un champ JSON. **L'approche retenue** est les champs sur `User` (plus simple, pas de nouvelle table).

- [x] **AC5 — Créer les templates email de relance**
  - [x] Ajouter dans `src/lib/email.ts` :
    - `sendReminderEmail({ to, name, type, links })` avec `type: "EMAIL_VERIFICATION" | "PROFILE_COMPLETION" | "FINAL_REMINDER"`.
    - Brancher sur `sendEmail()` existant.
    - Sujets en français :
      - EMAIL_VERIFICATION : "Vérifiez votre adresse email — Ivoire Business Club"
      - PROFILE_COMPLETION : "Complétez votre profil IBC"
      - FINAL_REMINDER : "Dernier rappel — votre compte IBC n'est pas finalisé"
    - Corps texte en français, CTA clair, mention obligatoire : "Vous recevez cet email car vous avez créé un compte sur Ivoire Business Club".
    - Lien email vérification : `${APP_URL}/auth/verify-email?resend=1`.
    - Lien profil : `${APP_URL}/onboarding/complete-profile`.
    - Final reminder : inclure les 2 liens.

- [x] **AC5 — Rendre les emails "responsive/branding" (plain-text baseline)**
  - [x] Utiliser le système `sendEmail()` actuel (texte brut) ; ajouter un template HTML optionnel via la même méthode nodemailer `html` si `nodemailer` le supporte déjà.
  - [x] Minimum requis : texte en français, CTA clair, mention légale, liens directs. HTML responsive est un plus si simple à ajouter (1 template basique IBC teal/white).

- [x] **AC6 — Documenter le déploiement**
  - [x] Ajouter `CRON_SECRET=` dans `.env.example` (section Auth ou dédié Cron).
  - [x] Créer `docs/cron-setup.md` avec :
    - [x] Objectif de la route.
    - [x] Variables d'environnement (`CRON_SECRET`, `APP_URL`).
    - [x] Commandes VPS Hetzner exactes (création dossier, secret, permissions, crontab, log file).
    - [x] Exemple de ligne crontab et fuseau horaire.
    - [x] Commande de test manuel avec `curl`.
    - [x] Section troubleshooting (vérifier les logs, le secret, l'heure serveur).

- [x] **AC7 — Fournir les instructions de déploiement crontab VPS Hetzner**
  - [x] Le fichier `docs/cron-setup.md` doit contenir la procédure exacte reprise dans AC7 (echo secret, chmod 600, crontab -e, touch log, heure 09:00).
  - [x] **AC7 est un livrable docs uniquement** : le DS ne configure pas le VPS, mais fournit la procédure qu'un admin ou DevOps exécutera.

- [x] **Tests et validation de non-régression**
  - [x] Tests unitaires `src/lib/reminders.server.test.ts` :
    - [x] 401 si secret absent/incorrect.
    - [x] J+1 envoie EMAIL_VERIFICATION si `emailVerified=false`.
    - [x] J+3 envoie PROFILE_COMPLETION si `onboardingCompletedAt=null`.
    - [x] J+7 envoie FINAL_REMINDER si l'un des deux est incomplet.
    - [x] Email vérifié + profil incomplet → seulement J+3 / J+7.
    - [x] Double exécution le même jour n'envoie pas 2 emails (idempotence via `lastReminderSentAt`).
    - [x] Utilisateur complet (`emailVerified=true` et `onboardingCompletedAt` set) → ignoré.
    - [x] Utilisateur inscrit depuis > 7 jours → ignoré.
  - [x] Tests route handler `src/app/api/cron/remind-incomplete-users/route.test.ts` :
    - [x] 401 sans header / secret invalide.
    - [x] 200 avec secret valide.
    - [x] Retour `processed` / `sent` cohérent.
  - [x] Tests email `src/lib/email.test.ts` (ou fichier dédié) :
    - [x] Sujets et mentions légaux présents.
    - [x] Liens corrects selon le type.
  - [x] `npm run build` passe sans erreur.
  - [x] `npx prisma migrate dev` et `npx prisma generate` OK.

## Dev Notes

### Contexte brownfield / delta

Story 15.1 a déjà implémenté l'enforcement layer (widget, soft-gate, JWT claims, auto-resend). Cette story ne consiste qu'à ajouter le cron de relances programmées.

| Élément | État | Fichier(s) |
|---------|------|-----------|
| Envoi email existant | ✅ | `src/lib/email.ts` (`sendEmailVerificationEmail`) |
| Auto-resend vérification | ✅ | `src/lib/verification-email.server.ts` (créé par story 15.1) |
| Soft-gate onboarding | ✅ | `src/middleware.ts` (story 15.1) |
| JWT claims `emailVerified` + `onboardingCompleted` | ✅ | `src/lib/auth.ts` / `src/lib/auth.config.ts` (story 15-1) |
| Modèle User avec `emailVerified`, `onboardingCompletedAt` | ✅ | `prisma/schema.prisma` L88, L92 |

**Ce qui est manquant (delta à implémenter) :**
- Route cron `POST /api/cron/remind-incomplete-users`.
- Logique de séquence J+1/J+3/J+7.
- Champs `User.lastReminderSentAt` + `User.reminderCount`.
- Templates email de relance dans `src/lib/email.ts`.
- Documentation `docs/cron-setup.md`.

### Contraintes techniques critiques

- **Route cron sans session utilisateur :** ne PAS utiliser `auth()` ; la route s'authentifie uniquement via `CRON_SECRET`.
- **Pas de Prisma dans le middleware :** cette story n'interagit PAS avec le middleware ; elle reste côté Node.js route handler + Prisma.
- **Idempotence stricte :** vérifier `lastReminderSentAt` avant chaque envoi. Si un envoi a déjà eu lieu aujourd'hui (date UTC), sauter l'utilisateur.
- **Batch raisonnable :** la requête Prisma doit limiter aux 7 derniers jours (`createdAt >= now - 7 days`) pour éviter de charger tous les anciens utilisateurs.
- **Emails texte brut :** `sendEmail()` actuel envoie du texte brut uniquement. Si on ajoute un HTML, s'assurer que le texte reste présent (`text` field) pour la deliverability.
- **Ne pas spammer les utilisateurs vérifiés :** si `emailVerified === true`, ne jamais envoyer EMAIL_VERIFICATION (même à J+1).
- **Ne pas spammer les profils complets :** si `onboardingCompletedAt !== null`, ne jamais envoyer PROFILE_COMPLETION.
- **Erreurs d'envoi :** logger avec `sanitizeError`, ne pas faire échouer tout le batch si un seul email échoue (catch par utilisateur, continuer).
- **Guardrail JSX :** pas de JSX dans cette story, mais si un composant d'admin de relance manuelle est ajouté plus tard, utiliser des ternaires, jamais `&&`.

### Files to create / modify

**NEW files :**
- `src/app/api/cron/remind-incomplete-users/route.ts`
- `src/app/api/cron/remind-incomplete-users/route.test.ts`
- `src/lib/reminders.server.ts`
- `src/lib/reminders.server.test.ts`
- `docs/cron-setup.md`

**UPDATE files :**
- `prisma/schema.prisma` — ajouter `lastReminderSentAt` et `reminderCount` au modèle `User`.
- `src/lib/email.ts` — ajouter `sendReminderEmail` et helpers de templates.
- `.env.example` — ajouter `CRON_SECRET=`.

### Architecture compliance

- **Route handlers RESTful :** la route cron est un Route Handler Next.js App Router (`route.ts`), cohérent avec le reste du projet.
- **Auth pattern :** cette route n'utilise PAS `auth()` ; elle utilise une clé API (`CRON_SECRET`) transmise en header `Authorization: Bearer ...`.
- **Emails :** réutiliser `sendEmail()` / `sendEmailVerificationEmail()` de `src/lib/email.ts`. Ne pas créer de nouveau transporteur.
- **Prisma :** importer `prisma` depuis `@/lib/prisma` ; ne pas instancier un nouveau `PrismaClient`.
- **Tests :** Vitest + mocks Prisma ; tests co-localisés avec `*.test.ts(x)`.
- **Error logging :** utiliser `sanitizeError` de `@/lib/sanitize-log` pour tout log d'erreur.
- **Migration :** tout changement de schéma doit être suivi d'une migration Prisma et d'un `npx prisma generate`.

### Library / framework requirements

- Aucune nouvelle dépendance NPM attendue.
- `nodemailer` déjà utilisé via `src/lib/email.ts`.
- `crypto` (Node.js built-in) pour les tokens de vérification si besoin ; ici, J+1 utilise `resend=1` (pas de token généré par le cron).

### Testing requirements

- Couvrir la protection par secret (401 / 200).
- Couvrir les 3 types de reminders et les 3 fenêtres temporelles.
- Couvrir l'idempotence (double cron même jour).
- Couvrir les exclusions (complet, > 7 jours, email déjà vérifié).
- Couvrir la résilience (erreur d'email isolée, pas de crash global).
- Valider `npm run build`.

### UX / accessibility

- Textes des emails en français, non-techniques.
- Mention légale obligatoire en bas de chaque email.
- CTA clair et lien direct (pas de lien raccourci ou ambigu).

## Previous Story Intelligence

- Story 15.1 a établi le pattern JWT claims `emailVerified` / `onboardingCompleted`, le middleware soft-gate, et `src/lib/verification-email.server.ts` pour l'auto-resend. Le cron ne duplique PAS cette logique : il envoie des **relances programmées** à J+1/J+3/J+7, pas au `signIn`.
- Story 15.1 a aussi créé `src/lib/verification-email.server.ts` avec logique de génération de token SHA-256 + limite 24h. Le cron J+1 peut simplement rediriger vers `/auth/verify-email?resend=1` sans générer de token lui-même.

## Project Context Reference

- Projet : Ivoire Business Club (IBC).
- Stack : Next.js 16.2.6, React 19.2.4, Prisma 7.8.0, Auth.js v5 beta.31, TailwindCSS 4.x, shadcn/ui.
- Build : `output: 'standalone'` ; déployé sur VPS Infomaniak (Ubuntu 24.04) via PM2 + Nginx.
- Langue des artefacts : Français (contrairement à `config.yaml` qui indique "English" — tous les BMAD artifacts IBC sont en français).
- Emails : SMTP Infomaniak via `src/lib/email.ts` (nodemailer).

## References

- SCP — Story 15.2 : `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-26.md`, section "### Story 15.2 : Relances automatiques par email (cron)" (lignes 185-258).
- Architecture : `_bmad-output/planning-artifacts/architecture.md`, sections "Authentication & Security" (JWT), "API & Communication Patterns", "Infrastructure & Deployment".
- Code existant :
  - `src/lib/email.ts`
  - `src/lib/verification-email.server.ts`
  - `src/app/api/auth/send-verification/route.ts`
  - `src/app/api/user/onboarding/route.ts`
  - `prisma/schema.prisma`
- Docs existant : `docs/auth-and-middleware.md` (pattern Auth.js v5, pas directement utilisé par cette story mais référence de sécurité).

## Dev Agent Record

### Agent Model Used

kimi-k2.7-code (via Hermes delegate_task)

### Debug Log References

### Completion Notes List

- Story créée à partir du SCP (source primaire), pas de `epics.md` (Epic 15 y est absent car ajouté par le SCP).
- Approche suivi des relances retenue : champs `lastReminderSentAt` + `reminderCount` sur `User` (plus simple qu'une table `ReminderLog`, conformément aux Technical Notes du SCP).
- AC7 traité comme livrable documentation uniquement (`docs/cron-setup.md`).

### File List

- `_bmad-output/implementation-artifacts/story-15-2.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (status mis à jour)

### Implementation Plan

Story implémentée en delta sur le code existant : ajout d'une route cron protégée, logique de relance séquencée J+1/J+3/J+7, champs Prisma pour le suivi/idempotence, templates email dans `src/lib/email.ts`, et documentation de déploiement VPS Hetzner.

- Route cron `src/app/api/cron/remind-incomplete-users/route.ts` créée avec auth `CRON_SECRET`, sans session utilisateur.
- Logique métier séquencée isolée dans `src/lib/reminders.server.ts` : fenêtre ±12h, J+1/J+3/J+7, idempotence via `lastReminderSentAt`, compteur `reminderCount`, batch résilient.
- Migration Prisma `add_user_reminder_fields` appliquée sur `schema.prisma` et `schema.dev.prisma` (champs `lastReminderSentAt`, `reminderCount`).
- Templates `sendReminderEmail` ajoutés dans `src/lib/email.ts` (3 types, texte français, CTA, mention légale).
- Tests unitaires et route handler co-localisés, tous passent.
- `docs/cron-setup.md` et `.env.example` mis à jour avec la procédure VPS Hetzner et la variable `CRON_SECRET`.

## Review Findings

### Code review of story-15-2 (2026-06-26)

**Verdict:** PASS (with minor patches applied and low-severity notes deferred).

**Patch findings (fixed):**
- [x] [Review][Patch] `route.test.ts` leaves `process.env` mutated after tests; added `afterEach` to restore original env.
- [x] [Review][Patch] `docs/cron-setup.md` troubleshooting row now uses valid Markdown and adds a replay-risk note in the security checklist.

**Deferred / low-severity notes (not blocking):**
- `CRON_SECRET` comparison is not timing-safe (`token !== expected`) and `getBearerToken` rejects headers with extra spaces between "Bearer" and the token [src/app/api/cron/remind-incomplete-users/route.ts:8-18]. Hard to exploit in practice; consider `crypto.timingSafeEqual` and allowing single extra space as future hardening.
- `reminderCount` is a global counter rather than per-type; acceptable for current scope but may need `ReminderLog` table if future analytics require per-sequence counts.

**Verification run:**
- `npm run build` : passed
- `npx vitest run` : 141 test files, 962 tests passed

*Review conducted according to `bmad-code-review` workflow. Story status left unchanged (`review`) per instructions.*
