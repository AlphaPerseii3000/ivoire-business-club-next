# Proposition de Modification de Sprint — Onboarding Enforcement & Relances Automatiques

**Projet :** Ivoire Business Club (IBC)  
**Auteur :** Jonathan (PO) / Hermes (Correct Course)  
**Date :** 26 juin 2026  
**Statut :** En attente de validation  
**Workflow :** bmad-correct-course (CC)  

---

## 1. Résumé du Changement

### 1.1 Problème identifié

Les membres s'inscrivent sur IBC mais ne vérifient pas leur email et ne complètent pas leur profil. Exemples concrets (extraction admin du 26/06/2026) :

| Membre | Email | Email vérifié | Profil complété | Date inscription |
|--------|-------|---------------|-----------------|-----------------|
| Oka Ahou Marie Gisèle | marieoka92@gmail.com | ✗ | ✗ | 26/06/2026 |
| Zahouli Bi Serge | zahoulibiserge289@gmail.com | ✗ | ✗ | 26/06/2026 |
| Camara Aboubacar | camarawilder2@gmail.com | ✗ | ✗ | 26/06/2026 |
| Ézéckiel Baron | jayoliver13ezekiel@gmail.com | ✗ | ✗ | 25/06/2026 |
| Abole Vianney | abolevianney123@icloud.com | ✗ | ✗ | 25/06/2026 |

**Tendance :** 100% des nouvelles inscriptions sur 2 jours n'ont ni email vérifié ni profil complété.

### 1.2 Diagnostic technique

L'analyse du code existant révèle que **tous les composants existent mais aucun enforcement n'est appliqué** :

| Élément | État actuel | Problème |
|---------|-------------|----------|
| Email de vérification envoyé à l'inscription | ✅ (`signup/route.ts`) | Un seul envoi, jamais relancé |
| Page `/auth/verify-email` | ✅ | Fonctionne, mais l'utilisateur doit y aller volontairement |
| Banner ambre sur dashboard si email non vérifié | ✅ (`dashboard/page.tsx` L54-74) | Passive — n'empêche rien |
| Page `/onboarding/complete-profile` | ✅ | Existe mais **non requise** — aucun gate |
| Welcome email avec lien profil | ✅ (`email.ts` L270) | Envoyé une fois, jamais relancé |
| Middleware de gate | ❌ | N'existe pas |
| Emails de relance automatiques | ❌ | N'existent pas |
| Widget de progression visible | ❌ | N'existe pas |

### 1.3 Classification du changement

- **Type :** Nouvelles exigences fonctionnelles émergentes (gap opérationnel identifié post-déploiement)
- **Étendue :** Additive — aucun rollback nécessaire, 1 nouvel epic
- **Risque :** Faible — modifications de UI et ajout de route API cron, pas de changement de modèle de données

---

## 2. Analyse d'Impact

### 2.1 Impact sur les Epics et Stories

**Epics existants impactés :** Aucun. Les epics 1-14 ont leurs stories en `done`. Aucune modification de story existante.

**Nouvel epic créé :**

| Epic | Titre | Stories |
|------|-------|---------|
| Epic 15 | Onboarding Enforcement & Relances | 3 stories (15.1 → 15.3) |

### 2.2 Conflits d'Artéfacts

**PRD :**
- Ajout de FR pour l'onboarding enforcement (FR-ONB1 à FR-ONB6)
- Aucune modification des FR existants

**Architecture :**
- `src/app/(dashboard)/layout.tsx` : Ajout d'un wrapper de progression onboarding
- `src/app/(dashboard)/dashboard/page.tsx` : Remplacement de la banner ambre par un widget de progression
- Nouvelle route API `POST /api/cron/remind-incomplete-users` (protégée par `CRON_SECRET`)
- Nouveau endpoint `POST /api/auth/resend-verification` (déjà partiellement existant via `ResendVerificationButton`)
- Nouveau middleware de soft-gate sur les routes premium du dashboard
- Pas de changement de schéma Prisma — utilise les champs existants `emailVerified`, `onboardingCompletedAt`

**UX/UI :**
- Nouveau composant `OnboardingProgressWidget` (checklist visuelle 2 étapes)
- Écran de blocage `CompleteProfileGate` sur les routes premium
- Modification de la banner dashboard existante

### 2.3 Impact Technique

| Composant | Impact |
|-----------|--------|
| `src/app/(dashboard)/layout.tsx` | Ajout du `OnboardingProgressWidget` dans le layout |
| `src/app/(dashboard)/dashboard/page.tsx` | Remplacement banner ambre par widget interactif |
| `src/app/api/cron/remind-incomplete-users/route.ts` | Nouveau — route cron protégée par secret |
| `src/lib/email.ts` | Ajout `sendReminderEmail` (réutilise `sendEmailVerificationEmail` + nouveau template relance profil) |
| `src/middleware.ts` | Ajout d'un soft-gate : si `emailVerified === false` OU `onboardingCompletedAt === null`, bloquer `/dashboard/opportunities`, `/members`, `/dashboard/matching`, `/articles` avec redirection vers écran de complétion |
| `src/app/(dashboard)/onboarding-gate/page.tsx` | Nouveau — écran de blocage avec checklist et CTAs |
| `src/components/features/onboarding/onboarding-progress-widget.tsx` | Nouveau — widget checklist 2 étapes |

**Important — contrainte middleware :** Le middleware tourne en Edge Runtime. `emailVerified` et `onboardingCompletedAt` doivent être embarqués dans le JWT token. Vérifier si ces champs sont déjà dans les claims Auth.js. Si non, ajouter au callback `jwt` dans `auth.ts`.

---

## 3. Approche Recommandée

**Option sélectionnée :** Direct Adjustment (Option 1)

- **Effort :** Moyen (1-2 jours de développement)
- **Risque :** Faible
- **Justification :** Les changements sont purement additifs (nouveau widget, nouvelle route cron, soft-gate). Aucun impact sur les fonctionnalités existantes. Le ROI est immédiat : les membres incomplets seront bloqués sur les features premium et recevront des relances automatiques.

---

## 4. Propositions de Changement Détaillées

### 4.1 Nouvelles Exigences Fonctionnelles (FR)

| FR | Description | Story |
|----|-------------|-------|
| FR-ONB1 | Le dashboard affiche un widget de progression onboarding (email vérifié + profil complété) avec pourcentage et CTAs actionnables | 15.1 |
| FR-ONB2 | Les routes premium du dashboard (`/dashboard/opportunities`, `/members`, `/dashboard/matching`, `/articles`) sont bloquées si l'email n'est pas vérifié OU le profil non complété, avec un écran de complétion et CTAs | 15.1 |
| FR-ONB3 | À la connexion, si l'email n'est pas vérifié, le système renvoie automatiquement un email de vérification (max 1 fois par 24h) | 15.1 |
| FR-ONB4 | Une route cron `/api/cron/remind-incomplete-users` envoie des emails de relance à J+1 (vérification email), J+3 (completion profil), J+7 (dernier rappel) aux utilisateurs incomplets | 15.2 |
| FR-ONB5 | Le cron est protégé par un secret (`CRON_SECRET`) et peut être déclenché via Vercel Cron, cron Hermes, ou curl manuel | 15.2 |
| FR-ONB6 | L'admin voit un indicateur de complétion onboarding dans la liste des membres (badges email/profil) pour identifier rapidement les membres incomplets | 15.3 |

### 4.2 Nouvel Epic

---

## Epic 15 : Onboarding Enforcement & Relances Automatiques

**Objectif :** Forcer la complétion de l'onboarding (vérification email + profil) en bloquant l'accès aux features premium et en envoyant des relances automatiques. Transformer l'onboarding passif actuel en parcours obligatoire.

**Business Value :** Actuellement 100% des nouvelles inscriptions sont incomplètes. Les membres non vérifiés ne peuvent pas être approuvés par l'admin (`verificationStatus` reste PENDING), n'apparaissent pas dans `/members`, et ne bénéficient pas du matching. Ce epic transforme le funnel d'onboarding en parcours guidé et obligatoire.

**FRs couverts :** FR-ONB1, FR-ONB2, FR-ONB3, FR-ONB4, FR-ONB5, FR-ONB6

---

### Story 15.1 : Widget de progression + soft-gate sur features premium

**En tant que** membre connecté avec onboarding incomplet,  
**Je veux** voir un widget de progression et être guidé vers la complétion,  
**Afin que** je puisse finaliser mon inscription et accéder aux features du club.

**Acceptance Criteria :**

1. **AC1 — Widget de progression sur le dashboard**
   - **Given** un membre connecté sur `/dashboard`
   - **When** la page se charge
   - **Then** un widget `OnboardingProgressWidget` remplace la banner ambre existante
   - **And** il affiche 2 étapes : "Vérifier mon email" et "Compléter mon profil"
   - **And** chaque étape a un statut visuel (✗ en rouge / ✓ en vert)
   - **And** un pourcentage de progression s'affiche (0%, 50%, 100%)
   - **And** chaque étape incomplète a un CTA cliquable ("Vérifier maintenant" / "Compléter mon profil")
   - **And** si les 2 étapes sont complètes, le widget disparaît

2. **AC2 — Soft-gate sur les routes premium**
   - **Given** un membre avec `emailVerified === false` OU `onboardingCompletedAt === null`
   - **When** il tente d'accéder à `/dashboard/opportunities`, `/members`, `/dashboard/matching`, ou `/articles`
   - **Then** il est redirigé vers `/dashboard?incomplete=1`
   - **And** le widget de progression s'affiche en mode prioritaire (bordure rouge, animation subtile)

3. **AC3 — Auto-resend email de vérification à la connexion**
   - **Given** un membre avec `emailVerified === false`
   - **When** il se connecte (credentials ou Google OAuth)
   - **Then** le système renvoie automatiquement l'email de vérification si le dernier envoi date de plus de 24h
   - **And** un toast s'affiche : "Un email de vérification vient de vous être envoyé"
   - **And** si le dernier envoi date de moins de 24h, aucun renvoi

4. **AC4 — Routes autorisées pour les membres incomplets**
   - **Given** un membre avec onboarding incomplet
   - **When** il navigue
   - **Then** les routes suivantes restent accessibles : `/dashboard`, `/profile`, `/settings`, `/pricing`, `/onboarding/complete-profile`, `/auth/verify-email`
   - **And** les routes bloquées renvoient vers `/dashboard?incomplete=1`

5. **AC5 — JWT claims pour le middleware**
   - **Given** le callback `jwt` dans `auth.ts`
   - **When** un token JWT est créé/mis à jour
   - **Then** le token embarque `emailVerified` (boolean) et `onboardingCompleted` (boolean, dérivé de `onboardingCompletedAt !== null`)
   - **And** le middleware peut lire ces claims sans accès à Prisma (Edge Runtime compatible)

**Technical Notes :**
- Le middleware Edge Runtime ne peut PAS faire de requêtes Prisma. Les champs `emailVerified` et `onboardingCompleted` doivent être dans le JWT.
- Vérifier `auth.config.ts` (Edge) vs `auth.ts` (Node). Le callback `jwt` est dans `auth.ts` (Node) — c'est OK car le JWT est créé côté serveur puis lu côté Edge.
- Le `ResendVerificationButton` existe déjà (`src/components/features/auth/resend-verification-button.tsx`). L'auto-resend à la connexion réutilise la même logique serveur.
- Utiliser des ternaires (`condition ? <JSX> : null`) en JSX, jamais `&&` (pitfall #22.5 Next.js 16 strict).

---

### Story 15.2 : Relances automatiques par email (cron)

**En tant que** admin IBC,  
**Je veux** que les membres incomplets reçoivent des relances automatiques par email,  
**Afin de** maximiser le taux de complétion sans intervention manuelle.

**Acceptance Criteria :**

1. **AC1 — Route cron protégée**
   - **Given** la route `POST /api/cron/remind-incomplete-users`
   - **When** elle reçoit une requête sans header `Authorization: Bearer <CRON_SECRET>`
   - **Then** elle retourne 401 Unauthorized
   - **And** si le secret correspond, elle exécute la logique de relance

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
   - **Then** un enregistrement est créé dans une table `ReminderLog` (ou champ JSON `reminderSentAt` sur User) pour éviter les doublons
   - **And** le log contient : `userId`, `type` (EMAIL_VERIFICATION | PROFILE_COMPLETION | FINAL_REMINDER), `sentAt`

4. **AC4 — Idempotence**
   - **Given** le cron est déclenché deux fois le même jour
   - **When** il s'exécute
   - **Then** aucun email n'est envoyé en double (vérification via le log de relance)

5. **AC5 — Email templates**
   - **Given** les emails de relance
   - **When** ils sont rendus
   - **Then** ils sont en français, responsive, avec le branding IBC
   - **And** chaque email contient un CTA clair et un lien direct vers l'action requise
   - **And** chaque email mentionne "Vous recevez cet email car vous avez créé un compte sur Ivoire Business Club"

6. **AC6 — Documentation déploiement**
   - **Given** la route cron
   - **When** elle est déployée
   - **Then** la variable d'environnement `CRON_SECRET` est documentée dans `.env.example`
   - **And** un exemple de déclencheur est documenté : `curl -X POST https://www.ivoire-business-club.com/api/cron/remind-incomplete-users -H "Authorization: Bearer $CRON_SECRET"`

**Technical Notes :**
- Pour le suivi des relances, ajouter un champ `lastReminderSentAt` (DateTime?) et `reminderCount` (Int, default 0) sur le modèle User, OU créer une table `ReminderLog` dédiée. Le champ sur User est plus simple et évite une migration de table.
- Alternative sans migration : utiliser un champ JSON `reminders` sur User (`{ emailVerification: "2026-06-27T10:00:00Z", profileCompletion: "2026-06-29T10:00:00Z" }`).
- Le cron peut être déclenché par : (a) Vercel Cron (si déployé sur Vercel), (b) cron job Hermes, (c) crontab sur le VPS Infomaniak, (d) curl manuel.
- Les emails de relance réutilisent `sendEmail()` de `src/lib/email.ts`.

---

### Story 15.3 : Indicateur admin de complétion onboarding

**En tant que** admin IBC,  
**Je veux** voir rapidement quels membres n'ont pas complété leur onboarding,  
**Afin de** les relancer manuellement si nécessaire ou de comprendre les blocages.

**Acceptance Criteria :**

1. **AC1 — Badges visuels sur la liste des membres**
   - **Given** l'admin sur `/admin/members`
   - **When** il consulte la liste
   - **Then** chaque membre affiche 2 badges : "Email ✓/✗" et "Profil ✓/✗"
   - **And** les badges ✗ sont en rouge ambre
   - **And** un filtre rapide permet de n'afficher que les membres incomplets

2. **AC2 — Filtre "incomplets"**
   - **Given** l'admin sur `/admin/members`
   - **When** il active le filtre "Onboarding incomplet"
   - **Then** seuls les membres avec `emailVerified === false` OU `onboardingCompletedAt === null` s'affichent

3. **AC3 — Action de relance manuelle**
   - **Given** l'admin sur le détail d'un membre incomplet
   - **When** il clique sur "Relancer par email"
   - **Then** le système envoie manuellement l'email de relance approprié (vérification ou profil) indépendamment du cron

**Technical Notes :**
- La page `/admin/members` existe déjà (Story 6.5). Modification additive : ajout de badges + filtre + bouton.
- Réutiliser les fonctions d'email de `src/lib/email.ts`.

---

## 5. Plan de Handoff

### 5.1 Classification du changement

- **Scope :** Moderate — 1 nouvel epic, 3 nouvelles stories, modifications de layout + middleware
- **Handoff :** Developer agent (DS) pour implémentation, puis CR

### 5.2 Actions post-déploiement (manuelles, hors code)

| Action | Outil | Priorité |
|--------|-------|----------|
| Configurer `CRON_SECRET` dans `.env` | Variable d'environnement | P0 |
| Mettre en place le déclencheur cron (Hermes cron job, crontab VPS, ou Vercel Cron) | `cronjob` Hermes ou crontab | P0 |
| Vérifier que les JWT claims incluent `emailVerified` et `onboardingCompleted` | Test avec `jwt.io` | P0 |

### 5.3 Success Criteria

- Les nouveaux inscrits voient le widget de progression dès leur première connexion
- Les membres incomplets sont redirigés vers le dashboard lorsqu'ils tentent d'accéder aux features premium
- Les emails de vérification sont auto-renvoyés à la connexion (max 1x/24h)
- Le cron envoie des relances à J+1, J+3, J+7 sans doublons
- L'admin peut filtrer les membres incomplets et relancer manuellement
- `npm run build` passe sans erreur
- Les tests unitaires couvrent : widget de progression, soft-gate middleware, logique cron (séquence J+1/J+3/J+7), idempotence