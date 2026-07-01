# Sprint Change Proposal — Gestion des Mots de Passe

**Date :** 2026-07-01  
**Auteur :** Hermes (Correct Course Workflow)  
**Projet :** IBC (Ivoire Business Club)  
**Change Scope :** Moderate — Nouvel epic + 3 stories  

---

## Section 1 — Issue Summary

### Problem Statement

Des utilisateurs IBC ont été créés directement depuis le WhatsApp de Sarah (flux d'onboarding prospection). Ces utilisateurs ont un compte en base avec un `passwordHash` généré automatiquement, mais **ils ne connaissent pas leur mot de passe** et n'ont aucun moyen de :

1. Demander un mot de passe oublié (page "forgot password" inexistante)
2. Modifier leur mot de passe depuis leur profil (champ password absent du `ProfileEditForm`)
3. Définir un mot de passe initial (aucun flux "set-password" pour utilisateurs créés sans consentement explicite)

**Exemple concret :** Michel Adonis a un compte IBC créé via WhatsApp mais ne peut pas se connecter. Sa seule option actuelle est Google OAuth, uniquement si son email est un compte Google.

### Discovery Context

Constaté lors d'une question opérationnelle sur la capacité des utilisateurs WhatsApp à se connecter. Audit du codebase confirmé :
- `src/app/auth/signin/page.tsx` : aucun lien "mot de passe oublié"
- `src/components/features/auth/profile-edit-form.tsx` : aucun champ password (email en read-only)
- `src/app/api/auth/` : aucune route `forgot-password` ou `reset-password`
- `src/lib/rate-limit.ts` : commentaire explicite mentionnant "future routes (password reset, email change, etc.)"
- `src/app/api/admin/users/[id]/` : aucune action admin de gestion de credentials

### Evidence

- PRD (FR1-FR7) couvre l'authentification mais ne mentionne pas la gestion de mot de passe oublié
- Architecture document mentionne Auth.js split config mais pas de reset password flow
- Epic 1 (Auth) est `done` sans inclure cette fonctionnalité
- Le flux WhatsApp (Epic 18) a créé un cas d'usage non prévu par le PRD initial

---

## Section 2 — Impact Analysis

### Epic Impact

| Epic | Status Actuel | Impact | Détail |
|------|---------------|--------|--------|
| Epic 1 (Auth) | `done` | Aucun | Ne pas modifier un epic terminé |
| Epic 18 (Chat/WhatsApp) | `in-progress` | Indirect | C'est ce flux qui a créé le besoin, mais pas de modif nécessaire |
| Epic 19 (PostHog) | `in-progress` | Optionnel | Ajouter events `password_reset_requested`, `password_changed` |
| Epic 20 (Fix connexion) | `in-progress` | Aucun | Indépendant |
| **Epic 21 (NEW)** | N/A | **Création** | Gestion des mots de passe |

### Story Impact

**Nouvel epic — 3 stories proposées :**

| Story | Description | Effort | Risque |
|-------|-------------|--------|--------|
| 21-1 | Mot de passe oublié (page + API + email reset) | Medium | Low |
| 21-2 | Changement de mot de passe dans le profil | Low | Low |
| 21-3 | Set-password flow pour utilisateurs créés via WhatsApp | Medium | Low |

### Artifact Conflicts

| Artifact | Impact | Modifications |
|----------|--------|---------------|
| **PRD** | Oui | Ajouter FR77, FR78, FR79 |
| **Architecture** | Oui | Documenter nouvelles routes API + modèle de données pour tokens |
| **UX Spec** | Oui | Nouvelles pages forgot/reset password, section sécurité profil |
| **Epics** | Oui | Ajouter Epic 21 |

### Technical Impact

- **Nouvelles routes API :** 3 (forgot-password, reset-password, user/password)
- **Nouvelles pages :** 2 (forgot-password, reset-password)
- **Composants modifiés :** ProfileEditForm (ajout section password), signin page (ajout lien)
- **Modèle de données :** Réutilisation ou extension de `VerificationToken` (à décider en DS)
- **Emails :** Nouveau template Resend pour reset password + set-password invitation
- **Rate limiting :** Nouveau rate limiter pour forgot-password endpoint
- **Validations :** Nouveaux schémas Zod (passwordChangeSchema, passwordResetSchema)

---

## Section 3 — Recommended Approach

### Selected Path: Option 1 — Direct Adjustment

**Créer un nouvel Epic 21 "Gestion des mots de passe" avec 3 stories.**

### Rationale

- **Effort :** Medium — les patterns Auth.js, bcrypt, Zod, Resend, rate limiting sont déjà établis dans le projet
- **Risque technique :** Low — suit les conventions existantes, aucune nouvelle dépendance
- **Impact timeline :** Minimal — 1-2 sessions DS, n'impacte pas les epics existants
- **Impact business :** Direct — débloque les utilisateurs WhatsApp actuels (Michel Adonis et autres)
- **Sustainability :** La fonctionnalité est essentielle pour tout produit avec authentification credentials

### Trade-offs

- **Alternative 1 (Quick Dev) :** Trop complexe pour QQ — 5+ fichiers, sécurité critique, nouvelles routes
- **Alternative 2 (Rollback) :** Non applicable — rien à rollback
- **Alternative 3 (MVP scope reduction) :** Non nécessaire — c'est un ajout, pas une remise en cause

---

## Section 4 — Detailed Change Proposals

### PRD Modifications

**Ajouter au section 8.1 (Authentification & Gestion des Utilisateurs) :**

```
NEW FR77 : Un utilisateur peut demander un email de réinitialisation de mot de passe en saisissant son adresse email
NEW FR78 : Un utilisateur connecté peut modifier son mot de passe depuis son profil (ancien mot de passe requis)
NEW FR79 : Un utilisateur créé sans mot de passe connu (via WhatsApp/admin) peut définir son mot de passe via un lien d'invitation email
```

**Ajouter au section 9.2 (Sécurité) :**

```
NEW NFR-S10 : Rate limiting sur /api/auth/forgot-password : 3 demandes/minute/IP
NEW NFR-S11 : Tokens de reset password expirent après 1 heure
NEW NFR-S12 : Ancien mot de passe requis pour changement dans le profil (vérification bcrypt)
```

### Architecture Modifications

**Nouvelles routes API :**

```
src/app/api/
├── auth/
│   ├── forgot-password/route.ts    # POST — génère token + envoie email (rate limited)
│   └── reset-password/route.ts     # POST — vérifie token + set nouveau password
├── user/
│   └── password/route.ts           # POST — authentifié, ancien + nouveau password
```

**Nouvelles pages :**

```
src/app/auth/
├── forgot-password/page.tsx        # Formulaire email
└── reset-password/page.tsx         # Formulaire nouveau password (token via ?token=xxx)
```

**Modifications composants :**

```
src/app/auth/signin/page.tsx        # Ajouter lien "Mot de passe oublié ?"
src/components/features/auth/profile-edit-form.tsx  # Ajouter section changement password
```

**Modèle de données — Option A (recommandée) : Étendre VerificationToken**

```prisma
model VerificationToken {
  // ... champs existants ...
  tokenType String @default("EMAIL_VERIFICATION")  // EMAIL_VERIFICATION | PASSWORD_RESET | SET_PASSWORD
}
```

**Modèle de données — Option B : Modèle dédié**

```prisma
model PasswordResetToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  expires   DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())
}
```

**Décision :** À trancher en DS. Option A plus simple (réutilise l'existant), Option B plus propre (séparation des concerns).

### UX Modifications

- Page `/auth/forgot-password` : formulaire simple (email), message de confirmation générique ("Si un compte existe, un email a été envoyé")
- Page `/auth/reset-password?token=xxx` : formulaire nouveau password + confirmation, indicateur de force
- Lien "Mot de passe oublié ?" sous le champ password sur `/auth/signin`
- Section "Sécurité" dans le profil : champs ancien password + nouveau password + confirmation
- Email template : reset password (Resend), avec pré-header et bouton CTA

### Sprint Status Modifications

**Ajouter au `sprint-status.yaml` :**

```yaml
  epic-21: in-progress
  21-1-mot-de-passe-oublie: backlog
  21-2-changement-mot-de-passe-profil: backlog
  21-3-set-password-flow-whatsapp: backlog
  epic-21-retrospective: optional
```

---

## Section 5 — Implementation Handoff

### Change Scope Classification: **Moderate**

Requires backlog reorganization (new epic + stories) and PO/DEV coordination.

### Handoff Plan

| Role | Responsibility |
|------|---------------|
| Hermes (Orchestrator) | Créer Epic 21 + stories dans sprint-status.yaml, rédiger story .md files, dispatcher DS |
| DS Subagent | Implémenter les 3 stories en séquence (21-1 → 21-2 → 21-3) |
| CR | Code review après chaque story (sécurité critique) |
| Jonathan | Approbation finale avant publication |

### Success Criteria

1. Un utilisateur peut demander un reset password via `/auth/forgot-password` et recevoir un email
2. Le lien de reset fonctionne, expire après 1h, et permet de définir un nouveau password
3. Un utilisateur connecté peut changer son password depuis `/profile` (ancien password requis)
4. Les utilisateurs créés via WhatsApp peuvent définir leur password via un email d'invitation
5. Rate limiting actif sur forgot-password (3/min/IP)
6. Tests passent (unit + integration)
7. Build Next.js réussit sans erreur

### Dependencies & Sequencing

- Story 21-1 doit être implémentée en premier (établit le pattern de token + email)
- Story 21-2 est indépendante mais peut réutiliser le pattern
- Story 21-3 dépend de 21-1 (réutilise le mécanisme de token reset)

---

## Approval

**Statut :** En attente d'approbation de Jonathan

*Generated by BMAD Correct Course Workflow — 2026-07-01*