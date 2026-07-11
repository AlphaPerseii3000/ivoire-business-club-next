# Sprint Change Proposal — Epic 28: Consolidation & Hardening

**Date :** 2026-07-11  
**Auteur :** Hermes (CC workflow)  
**Projet :** IBC — Ivoire Business Club  
**Statut :** En attente de validation par Jonathan  

---

## Section 1: Issue Summary

**Trigger :** Tous les epics 1 à 27 sont terminés (~90 stories livrées). Le fichier `deferred-work.md` contient 30+ items techniques reportés issus des code reviews successives. Ces items n'ont jamais été intégrés dans un epic structuré et constituent une dette technique accumulée.

**Problèmes identifiés (regroupés par thème) :**

### PostHog — Errors non gérées (6+ endpoints)
- `posthogServer.capture` peut crasher des pages/API entières si PostHog a des soucis réseau sur : signup, reactions, lead-magnet, opportunity interest, reviews, document access, bank transfer page
- Events dupliqués sur refresh de la page virement (server-side capture à chaque rendu)
- Google OAuth sign-in non tracké (cassure du funnel sign-in method)
- PostHog server singleton stale en dev (pas de reset sur changement de config)
- Missing server shutdown flush/close handler (perte d'events en mémoire)

### Sécurité — Rate-limiting et hardening manquants
- Absence de rate-limiting sur routes API password update + set-password invitation
- `CRON_SECRET` comparison non timing-safe (`token !== expected`)
- Comptes Google OAuth lockés hors config password (dead-end UX)
- Absence de security auditing et email notifications sur changement de mot de passe
- Absence de cooldown sur bouton d'invitation (spam d'emails possible)

### Robustesse & Data Integrity
- Overbooking race condition sur inscription événements (concurent registrations)
- Pagination manquante : articles admin, companies API, gallery events
- `session.user as any` typage faible répété dans endpoints articles
- Commentaires : absence de modération/suppression + risque spam/flood
- Duplication de code layout sur pages légales + pages publiques (header/footer)
- Lien d'ancre `#pricing` brisé hors page d'accueil

### Tech Debt & Code Quality
- `siteUrl` hardcoded à plusieurs endroits (sitemap, pages)
- Tests unitaires dégradés (fireEvent au lieu de userEvent, regex espaces insécables)
- CSS parsing fragile dans tests (fs.readFileSync globals.css)
- next.config.ts : import top-level `patch-readlink.js` sans try-catch
- PostHog singleton stale en dev (pas de reset sur changement env)
- specialties stockées en comma-separated au lieu d'une table relationnelle

---

## Section 2: Impact Analysis

| Artifact | Impact |
|----------|--------|
| PRD | Aucun changement fonctionnel — hardening et tech debt uniquement |
| Epics | Nouvel Epic 28 (Consolidation & Hardening) — 4 stories |
| Architecture | Aucun changement de stack. Patterns existants étendus (try-catch PostHog, rate-limiting, pagination) |
| Sprint Status | Ajout epic-28 + 4 stories en backlog |
| Code | ~15-20 fichiers modifiés répartis sur 4 stories. Voir détail par story. |

---

## Section 3: Recommended Approach

**Option 1: Direct Adjustment — Ajouter un nouvel Epic 28 additif.** ✅

Aucun rollback nécessaire. L'existant fonctionne. On durcit et nettoie par-dessus.
- Effort : Medium-High (4 stories, ~15-20 fichiers)
- Risque : Low (hardening additif, pas de refonte)
- Timeline : Sprint de consolidation après les epics feature

---

## Section 4: Detailed Change Proposals

### Nouvel Epic 28: Consolidation & Hardening

---

#### Story 28-1: PostHog Error Handling & Analytics Hardening

**FR-PH01** : Tous les appels `posthogServer.capture` sont wrappés dans try-catch pour éviter qu'une défaillance PostHog ne crash l'API ou la page  
**FR-PH02** : La page virement bancaire ne capture plus d'event serveur à chaque rendu (évite les duplications)  
**FR-PH03** : Le sign-in via Google OAuth déclenche l'event client `user_signed_in` (parité avec credentials)  
**FR-PH04** : Le serveur PostHog flush ses events en mémoire avant shutdown (process exit signals)  
**FR-PH05** : Le singleton PostHog se réinitialise en dev quand les variables d'env changent

**Acceptance Criteria :**

```gherkin
Given un endpoint API qui appelle posthogServer.capture après une opération DB
When PostHog a une erreur réseau (timeout, DNS, connexion refusée)
Then l'API retourne quand même un 200/201 (le résultat DB est préservé)
And l'erreur PostHog est loggée (console.error) mais non propagée

Given la page /pricing/virement
When l'utilisateur rafraîchit la page 3 fois
Then l'event `bank_transfer_page_viewed` n'est capturé qu'une seule fois (ou via client-side uniquement)

Given un utilisateur qui se connecte via Google OAuth
When le callback OAuth réussit
Then l'event `user_signed_in` avec propriété `method: "google"` est capturé côté client

Given le serveur Next.js en cours d'exécution
When il reçoit SIGTERM ou SIGINT
Then les events PostHog en mémoire sont flushés avant l'arrêt

Given le serveur en mode développement
When une variable d'env PostHog change
Then le singleton se réinitialise au prochain appel (pas besoin de restart manuel)

Given le projet après implémentation
When npm run build est exécuté
Then le build passe sans erreur

Given les tests existants
When npx vitest run est exécuté
Then ils passent sans régression
```

**Fichiers impactés (estimés) :**
- `src/lib/posthog-server.ts` (try-catch wrapper, shutdown handler, dev singleton)
- `src/app/api/auth/signup/route.ts`
- `src/app/api/articles/[id]/reactions/route.ts`
- `src/app/api/lead-magnet/route.ts`
- `src/app/api/opportunities/[id]/interest/route.ts`
- `src/app/api/opportunities/[id]/reviews/route.ts`
- `src/app/api/opportunities/[id]/documents/[documentId]/request-access/route.ts`
- `src/app/(public)/pricing/virement/page.tsx`
- `src/app/auth/signin/page.tsx` (Google OAuth tracking)

---

#### Story 28-2: Security Hardening — Rate Limiting, Timing-Safe Comparison & Password UX

**FR-SH01** : Les routes API `/api/user/password` (changement mot de passe) et `/api/auth/set-password` (invitation) sont rate-limitées  
**FR-SH02** : La comparaison du `CRON_SECRET` utilise `crypto.timingSafeEqual` (constant-time)  
**FR-SH03** : Les utilisateurs authentifiés via Google OAuth peuvent définir un mot de passe local depuis leur profil  
**FR-SH04** : Un changement de mot de passe réussi déclenche un log d'audit et un email de notification  
**FR-SH05** : Le bouton d'envoi d'invitation a un cooldown de 30s pour empêcher le spam d'emails  
**FR-SH06** : La page de réinitialisation de mot de passe valide le token au chargement (avant soumission)

**Acceptance Criteria :**

```gherkin
Given la route PUT /api/user/password
When plus de 5 tentatives par minute depuis la même IP
Then la 6ème retourne 429 avec Retry-After

Given la route POST /api/auth/set-password
When plus de 3 tentatives par minute depuis la même IP
Then la 4ème retourne 429 avec Retry-After

Given l'endpoint cron /api/cron/remind-incomplete-users
When le header Authorization Bearer est comparé au CRON_SECRET
Then la comparaison utilise crypto.timingSafeEqual (constant-time)
And les headers avec espaces supplémentaires entre "Bearer" et le token sont acceptés

Given un utilisateur authentifié via Google OAuth (pas de mot de passe local)
When il accède à son profil et clique sur "Définir un mot de passe"
Then un formulaire lui permet de créer un mot de passe local (sans exiger l'ancien)

Given un changement de mot de passe réussi
When l'API répond 200
Then un log d'audit est créé (AUDIT_ACTIONS.PASSWORD_CHANGED)
And un email de notification est envoyé à l'utilisateur

Given le bouton d'envoi d'invitation dans le profil admin
When l'admin clique sur "Envoyer l'invitation"
Then le bouton est désactivé pendant 30s avec un countdown visible

Given la page de reset password avec un token
When la page se charge
Then le token est validé côté serveur et un message s'affiche s'il est expiré/invalide avant la soumission

Given le projet après implémentation
When npm run build est exécuté
Then le build passe sans erreur

Given les tests existants
When npx vitest run est exécuté
Then ils passent sans régression
```

**Fichiers impactés (estimés) :**
- `src/lib/rate-limit.ts` (nouveaux limiteurs)
- `src/app/api/user/password/route.ts`
- `src/app/api/auth/set-password/route.ts`
- `src/app/api/cron/remind-incomplete-users/route.ts`
- `src/components/features/auth/profile-edit-form.tsx` (Google OAuth password setup)
- `src/app/api/user/invite/route.ts` (cooldown)
- `src/lib/audit-log.ts` (PASSWORD_CHANGED action)
- `src/app/(dashboard)/profile/page.tsx` ou composant invitation (cooldown UI)

---

#### Story 28-3: Robustesse & Data Integrity — Pagination, Race Conditions & Types

**FR-RD01** : L'inscription à un événement utilise une transaction + vérification de places disponibles atomique (anti-overbooking)  
**FR-RD02** : La liste admin des articles est paginée  
**FR-RD03** : L'API publique `/api/companies` est paginée  
**FR-RD04** : L'API galerie d'événements `/api/events/[id]/gallery` est paginée  
**FR-RD05** : Les endpoints articles utilisent un typage sécurisé pour la session (suppression des `as any`)  
**FR-RD06** : Les commentaires peuvent être modifiés ou supprimés par leur auteur  
**FR-RD07** : Un rate-limiting anti-flood est appliqué à la création de commentaires (5/minute/utilisateur)

**Acceptance Criteria :**

```gherkin
Given un événement avec 10 places disponibles
When 12 utilisateurs s'inscrivent simultanément
Then exactement 10 inscriptions réussissent et 2 sont refusées (places épuisées)
And la vérification du compteur et la création sont dans une transaction atomique

Given la liste admin des articles avec 50+ articles
When l'admin ouvre /admin/articles
Then la page affiche 20 articles par page avec navigation

Given l'API GET /api/companies avec 50+ entreprises
When un client la consulte
Then elle retourne 20 résultats par page avec métadonnées de pagination

Given l'API GET /api/events/[id]/gallery avec 50+ photos
When un client la consulte
Then elle retourne 20 résultats par page

Given les endpoints d'API articles (route.ts, [id]/route.ts)
When on inspecte le code
Then session.user est typé via le type SessionUser généré par Auth.js (pas de `as any`)

Given un membre connecté qui a posté un commentaire
When il consulte le commentaire
Then il voit un bouton "Modifier" et "Supprimer"
And la modification met à jour le contenu avec un timestamp `updatedAt`
And la suppression est soft (marqué deleted, contenu masqué)

Given un utilisateur qui poste 6 commentaires en 1 minute
When le 6ème est soumis
Then l'API retourne 429 avec Retry-After

Given le projet après implémentation
When npm run build est exécuté
Then le build passe sans erreur

Given les tests existants
When npx vitest run est exécuté
Then ils passent sans régression
```

**Fichiers impactés (estimés) :**
- `src/app/api/events/[id]/register/route.ts` (transaction + optimistic lock)
- `src/app/(admin)/admin/articles/page.tsx` (pagination)
- `src/app/api/companies/route.ts` (pagination)
- `src/app/api/events/[id]/gallery/route.ts` (pagination)
- `src/app/api/articles/route.ts` + `src/app/api/articles/[id]/route.ts` (typage session)
- `src/app/api/articles/[id]/comments/route.ts` (edit/delete + rate-limit)
- `prisma/schema.prisma` (Comment.updatedAt, Comment.deletedAt)

---

#### Story 28-4: Code Quality & Tech Debt Cleanup

**FR-CQ01** : Les en-têtes et footers des pages publiques sont centralisés dans le layout Next.js (suppression de la duplication)  
**FR-CQ02** : L'URL de base du site (`siteUrl`) est centralisée dans une constante unique et utilisée partout  
**FR-CQ03** : Le lien "Tarifs" fonctionne depuis toutes les pages (redirige vers `/#pricing` sur la landing)  
**FR-CQ04** : L'import top-level de `patch-readlink.js` dans `next.config.ts` est sécurisé (try-catch)  
**FR-CQ05** : Les tests utilisent `userEvent` au lieu de `fireEvent` pour les interactions interactives  
**FR-CQ06** : Le parsing CSS dans les tests d'accessibilité est remplacé par une vérification runtime (getComputedStyle)

**Acceptance Criteria :**

```gherkin
Given les pages publiques (landing, articles, events, partners, experts, mentions-legales, etc.)
When on inspecte le code source
Then le header et le footer sont définis une seule fois dans le layout Next.js et hérités par toutes les pages
And aucune page ne redéfinit manuellement le header/footer

Given le fichier sitemap.ts et les pages qui construisent des URLs absolues
When on cherche l'URL de base
Then elle provient d'une constante unique (ex: `src/lib/site-config.ts` ou `process.env.NEXT_PUBLIC_SITE_URL`)

Given le lien "Tarifs" dans la navigation mobile sur /partners ou /partners/[slug]
When l'utilisateur clique dessus
Then il est redirigé vers la landing page avec l'ancre #pricing (et non une ancre sur la page courante)

Given le fichier next.config.ts
When le module patch-readlink.js est absent ou corrompu
Then le build ne crash pas (try-catch autour de l'import)

Given les tests interactifs (boutons, formulaires, selects)
When on inspecte le code de test
Then ils utilisent userEvent.click / userEvent.type (pas fireEvent)

Given le test d'accessibilité accessibility.test.tsx
When il vérifie les animations CSS
Then il utilise getComputedStyle ou un mock runtime au lieu de fs.readFileSync(globals.css)

Given le projet après implémentation
When npm run build est exécuté
Then le build passe sans erreur

Given les tests existants
When npx vitest run est exécuté
Then ils passent sans régression
```

**Fichiers impactés (estimés) :**
- `src/app/(public)/layout.tsx` (centralisation header/footer)
- `src/app/(public)/page.tsx` (suppression header dupliqué)
- `src/app/(public)/mentions-legales/page.tsx`, `politique-confidentialite/page.tsx`, `cgv/page.tsx` (suppression layout dupliqué)
- `src/components/landing/mobile-nav.tsx` (fix lien #pricing)
- `src/app/sitemap.ts` + autres (centralisation siteUrl)
- `next.config.ts` (try-catch import)
- `src/app/accessibility.test.tsx` (refactor CSS parsing)
- Tests : `bank-transfer-instructions.test.tsx` et autres (userEvent)

---

## Section 5: Deferred Items Explicitly Out of Scope

Les items suivants sont intentionnellement exclus de l'Epic 28 car ils sont low-priority ou nécessitent une décision produit :

- **specialties comma-separated → table relationnelle** : Refonte schéma Prisma + migration data. À traiter dans un epic dédié si le besoin métier émerge.
- **Boilerplate `promoteConfiguredAdminUser` sur chaque page admin** : Pattern pré-existant profondément ancré. Refactor global hors scope.
- **`reminderCount` global counter vs `ReminderLog` table** : Acceptable pour le scope actuel. À revisiter si analytics par séquence nécessaire.
- **Documentation mTLS / IP allow-listing pour cron** : Hardening réseau infrastructure, pas code. À documenter séparément.

---

## Section 6: Implementation Handoff

- **Scope :** Medium-High — Nouvel epic, 4 stories, ~15-20 fichiers modifiés
- **Handoff :** CS → DS → CR par story via `bmad-orchestrator` (subagents), lancé dans une nouvelle session chat
- **Séquence recommandée :** 28-1 (PostHog) → 28-2 (Security) → 28-3 (Robustness) → 28-4 (Code Quality)
  - 28-1 en premier : PostHog errors peuvent crasher le site en production, c'est le plus urgent
  - 28-2 ensuite : security hardening à fermer avant que la plateforme monte en charge
  - 28-3 et 28-4 peuvent être parallélisés si capacité le permet
- **Success criteria :**
  - `npm run build` passe après chaque story
  - `npx vitest run` sans régression après chaque story
  - PostHog errors n'affectent plus la disponibilité des API
  - Rate-limiting actif sur tous les endpoints sensibles
  - Pagination en place sur toutes les listes admin/publiques
  - Plus de `as any` dans les endpoints articles