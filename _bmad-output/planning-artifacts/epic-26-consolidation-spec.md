# Spécification Technique & Plan d'Implémentation — Epic 26
## Epic 26 : Sécurité, Conformité Légale & Consolidation UX

Ce document sert de **contexte d'exécution et de spécification technique** à fournir aux agents IA ou aux développeurs pour implémenter de manière sécurisée et conforme les pages légales et les améliorations d'audit d'IBC.

---

## 🎯 Objectif Général
Sécuriser la plateforme IBC (antivirus, rate-limiting), assurer sa conformité réglementaire (APDP, CENTIF-CI, pages légales) et éliminer les frictions d'usage majeures (suivi des virements, stats porteurs de projet, suivi WhatsApp).

---

## 📑 Inventaire des Pages Légales à remplir
Ces pages doivent être accessibles via des liens dans le footer de l'application et rédigées en français.

1. **Mentions Légales (`/mentions-legales`)**
   - **Éditeur :** KS Investment, Société Anonyme au capital de [Montant à confirmer], dont le siège social est à Abidjan, Côte d'Ivoire.
   - **Hébergeur :** Cloud VPS Infomaniak (Suisse).
   - **Directeur de la Publication :** Directeur de KS Investment.
2. **Politique de Confidentialité (`/politique-confidentialite`)**
   - **Collecte :** Nom, email, téléphone, pays, justificatif de paiement et pièces d'identité (dossier KYC pour les porteurs).
   - **Objectif :** Club d'affaires privé, intermédiation d'opportunités.
   - **Rétention :** Conservation des données de profil jusqu'à suppression du compte. Conservation des logs de paiement et transactions pendant 5 ans (obligation légale CENTIF-CI).
   - **Régulation :** Conforme APDP (Loi 2013-450 de Côte d'Ivoire) et RGPD (pour les membres résidant dans l'UE).
3. **Conditions Générales de Vente — CGV (`/cgv`)**
   - **Tiers :** Affranchis (29 €/mois), Grands Frères ([Tarif à confirmer] €/mois), Boss (99 €/mois).
   - **Mode de paiement :** Virement bancaire uniquement vers KS Investment, ou Mobile Money (Wave, Orange Money) pour la Côte d'Ivoire.
   - **Validation :** Manuelle par l'administrateur sous 48h ouvrées après réception des fonds.
   - **Remboursement / Prorata :** Pas de remboursement partiel, résiliation à tout moment avec fin de service à l'échéance.

---

## 🗄️ Modifications du Schéma de Base de Données (`prisma/schema.prisma`)
Les modifications suivantes doivent être appliquées et une migration Prisma créée (`npx prisma migrate dev`).

```prisma
// 1. Consentement RGPD / APDP sur le modèle User
model User {
  // ... champs existants
  acceptedTermsAt DateTime?
  termsVersion    String?
  // ... relations existantes
  contactLogs     ContactLog[] @relation("UserContacts")
}

// 2. Justificatif de paiement sur le modèle Subscription
model Subscription {
  // ... champs existants
  paymentReceiptUrl String?    // URL du document téléversé sur Cloudflare R2
  paymentReceiptKey String?    // Clé R2 unique de l'attestation
}

// 3. Modèle de log pour le tracking WhatsApp (AML / CENTIF-CI)
model ContactLog {
  id            String   @id @default(cuid())
  userId        String
  opportunityId String
  createdAt     DateTime @default(now())

  user        User        @relation("UserContacts", fields: [userId], references: [id], onDelete: Cascade)
  opportunity Opportunity @relation(fields: [opportunityId], references: [id], onDelete: Cascade)

  @@index([opportunityId, createdAt])
  @@index([userId, createdAt])
  @@map("contact_logs")
}
```

---

## 🛠️ Plan d'implémentation par User Stories

### 🎫 Story 26.1 : Création des Pages Légales & Footer
*   **Fichiers impactés :**
    *   `src/components/landing/footer.tsx` (Modifier pour inclure les liens)
    *   `src/app/(public)/mentions-legales/page.tsx` [NEW]
    *   `src/app/(public)/politique-confidentialite/page.tsx` [NEW]
    *   `src/app/(public)/cgv/page.tsx` [NEW]
*   **Directives :**
    *   Utiliser la stack CSS globale (Tailwind v4) et des structures sémantiques.
    *   Respecter le design premium d'IBC (typographie lisible, espacement parfait).
*   **Critères d'acceptation :**
    *   *Given* un visiteur non authentifié, *When* il clique sur "Mentions Légales" dans le footer, *Then* il accède à la page `/mentions-legales` rédigée en français.
    *   *Given* un mobile, *Then* les pages s'affichent de façon responsive et ergonomique.

---

### 📋 Story 26.2 : Registre de Consentement APDP / RGPD à l'Inscription
*   **Fichiers impactés :**
    *   `prisma/schema.prisma` (Ajouter les champs `acceptedTermsAt` et `termsVersion`)
    *   `src/components/features/auth/signup-form.tsx` (Ajouter la case à cocher)
    *   `src/app/api/auth/signup/route.ts` (Valider la case à cocher et enregistrer en DB)
*   **Directives :**
    *   La case à cocher doit être obligatoire pour soumettre le formulaire d'inscription.
    *   Texte requis : *"J'accepte les CGV et la Politique de Confidentialité d'IBC."* (avec liens cliquables ouverts dans un nouvel onglet).
*   **Critères d'acceptation :**
    *   *Given* un formulaire d'inscription, *When* la case de consentement n'est pas cochée, *Then* le bouton d'inscription reste désactivé ou retourne une erreur de validation.
    *   *Given* une inscription réussie, *Then* `acceptedTermsAt` contient la date courante et `termsVersion` contient la version active (ex: `"1.0"`).

---

### 💳 Story 26.3 : Upload de Preuve de Virement & Validation Admin
*   **Fichiers impactés :**
    *   `prisma/schema.prisma` (Ajouter les champs de reçu sur `Subscription`)
    *   `src/app/api/subscriptions/upload-receipt/route.ts` [NEW]
    *   `src/components/payment-method-selector.tsx` (Ajouter le champ d'upload de fichier PDF/image)
    *   `src/components/features/admin/kanban-board.tsx` (Afficher le reçu téléversé dans la fiche d'approbation)
*   **Directives :**
    *   Uploader le reçu sur Cloudflare R2 sous le préfixe `subscriptions/{subscriptionId}/receipts/`.
    *   Limiter la taille à 5 Mo et n'accepter que les types Mime `application/pdf`, `image/jpeg`, `image/png`.
*   **Critères d'acceptation :**
    *   *Given* un membre ayant choisi un tier de virement, *When* il téléverse son attestation de virement, *Then* le reçu est stocké sur R2 et associé à sa souscription en DB.
    *   *Given* l'écran admin de validation, *When* l'admin examine les abonnements en attente, *Then* il peut ouvrir et consulter le reçu de virement.

---

### 📞 Story 26.4 : Route de Tracking & Redirection WhatsApp (CENTIF-CI)
*   **Fichiers impactés :**
    *   `prisma/schema.prisma` (Créer le modèle `ContactLog`)
    *   `src/app/api/opportunities/[id]/contact/route.ts` [NEW]
    *   `src/components/shared/whatsapp-cta.tsx`
    *   `src/components/features/deals/whatsapp-cta.tsx`
*   **Directives :**
    *   Ne plus appeler `wa.me` directement depuis le client. Le bouton doit pointer vers `/api/opportunities/[id]/contact`.
    *   La route API doit :
        1. Valider la session de l'utilisateur.
        2. Créer une entrée dans la table `ContactLog`.
        3. Rediriger l'utilisateur vers le lien WhatsApp du porteur de projet via `NextResponse.redirect`.
*   **Critères d'acceptation :**
    *   *Given* un membre cliquant sur "Contacter le porteur sur WhatsApp", *When* l'action est déclenchée, *Then* un log d'audit `ContactLog` est écrit en base de données et l'utilisateur est redirigé de manière transparente sur WhatsApp.

---

### 📊 Story 26.5 : Dashboard de Statistiques d'Attractivité (Koffi)
*   **Fichiers impactés :**
    *   `src/app/(dashboard)/dashboard/opportunities/page.tsx`
    *   `src/components/features/deals/deal-stats.tsx` [NEW]
*   **Directives :**
    *   Récupérer en base de données le compte des entrées `ContactLog` et le compte de `OpportunityInterest` (favoris) liés aux deals de l'utilisateur connecté.
    *   Afficher ces métriques sous forme de cartes d'indicateurs épurées sur chaque opportunité listée dans son espace personnel.
*   **Critères d'acceptation :**
    *   *Given* un porteur de projet connecté, *When* il consulte la liste de ses opportunités soumises, *Then* il voit le nombre de clics WhatsApp et le nombre d'investisseurs ayant manifesté de l'intérêt pour chaque deal.

---

### ✉️ Story 26.6 : Notifications Email Automatiques (Resend)
*   **Fichiers impactés :**
    *   `src/lib/email.ts`
    *   `src/app/api/admin/subscriptions/[id]/route.ts`
    *   `src/app/api/admin/opportunities/[id]/verify/route.ts`
*   **Directives :**
    *   Utiliser l'API Resend pour expédier des emails transactionnels soignés et épurés en français.
    *   Garder les logs d'envoi et intercepter les erreurs d'envoi de manière asynchrone (fire-and-forget).
*   **Critères d'acceptation :**
    *   *Given* un abonnement approuvé par l'admin, *Then* l'utilisateur reçoit automatiquement un email l'informant que son compte est actif.
    *   *Given* une opportunité validée ou rejetée, *Then* le porteur reçoit un email avec le statut de validation.

---

### 🛡️ Story 26.7 : Sécurité (Rate-Limiting & Scan Antivirus)
*   **Fichiers impactés :**
    *   `src/lib/rate-limit.ts`
    *   `src/app/api/chat/messages/route.ts`
    *   `src/app/api/opportunities/route.ts`
    *   `src/app/api/subscriptions/upload-receipt/route.ts`
*   **Directives :**
    *   Ajouter une protection Upstash Redis Rate Limiting sur les routes d'envoi de message (10 messages/minute/IP) et de soumission d'opportunités (2 opportunités/minute/IP).
    *   Pour le scan de fichier R2, implémenter un contrôle strict en backend (Mime validation) et intégrer un check antivirus (via ClamAV Cloud API ou service de validation de fichier) avant d'écrire l'URL en base de données.
*   **Critères d'acceptation :**
    *   *Given* des requêtes répétitives sur le chat ou la création de deal, *When* la limite est franchie, *Then* l'API renvoie un statut `429 Too Many Requests`.

---

## 🧪 Plan de vérification et de Test
Pour chaque story, le développeur devra exécuter et enrichir les suites de tests existantes :
- **Tests unitaires (Vitest) :** `npx vitest run src/app/api/...` pour chaque route modifiée.
- **Tests E2E (Playwright) :** Écrire un fichier `/e2e/epic-26-compliance.spec.ts` pour valider le parcours complet (inscription avec checkbox obligatoire → sélection de tier → upload du reçu → approbation admin dans le Kanban → clic WhatsApp logué).
