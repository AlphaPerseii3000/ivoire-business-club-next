---
baseline_commit: 3d56a4d16ad4d3c3a2e78330bfc00176b6f782d9
---

# Story 28.5 : Stylisation des e-mails transactionnels (Resend HTML)

Status: done

## Story

As a **membre ou gestionnaire IBC**,  
I want **que tous les e-mails transactionnels envoyés par la plateforme soient stylisés en HTML moderne et responsive**,  
so that **les communications reflètent l'identité visuelle haut de gamme (or, marine, émeraude) d'Ivoire Business Club et offrent une expérience utilisateur premium**.

## Acceptance Criteria

1. **AC-1 — Wrapper HTML Unifié et Responsive**
   - Given la fonction `sendEmail` dans `src/lib/email.ts`,  
     When un e-mail est expédié,  
     Then il contient à la fois une version `text` (brute) et une version `html` (stylisée).  
     And le template HTML utilise un wrapper standard avec :
     - Un en-tête (Header) élégant affichant "Ivoire Business Club" avec les couleurs de la charte.
     - Un corps de message (Body) propre avec une typographie soignée (sans-serif, interlignage confortable).
     - Des boutons de Call-to-Action (CTA) stylisés (fond or ou marine, coins arrondis, texte contrasté, liens absolus).
     - Un pied de page (Footer) avec les mentions légales standard d'IBC, le lien vers le tableau de bord et une signature d'équipe.

2. **AC-2 — Compatibilité et Intégration CSS In-line**
   - Given les limitations des clients mail (Outlook, Gmail, Apple Mail),  
     When le code HTML est généré,  
     Then il n'utilise que du CSS en ligne (attributs `style` sur les balises) et des structures robustes (tableaux pour l'alignement et les espacements).
   - Les couleurs de la charte IBC doivent être utilisées de manière cohérente :
     - Navy Blue : `#1E3A5F`
     - Gold : `#D4A847`
     - Emerald Green : `#2D8B4E`
     - Background : `#F6F5F2`

3. **AC-3 — Refactorisation des Fonctions d'E-mail existantes**
   - Given les fonctions d'envoi d'e-mails dans `src/lib/email.ts`,  
     When la story est implémentée,  
     Then tous les e-mails existants génèrent et envoient du HTML en plus du texte brut :
     - **Authentification / Sécurité :** vérification d'adresse e-mail, réinitialisation de mot de passe, invitation (définition de mot de passe), changement de mot de passe.
     - **Abonnements :** confirmation d'abonnement, activation, rejet (avec affichage clair du motif).
     - **Deals / Opportunités :** deal vérifié, deal nécessitant des corrections (avec affichage de la note), deal matché.
     - **Onboarding / Welcomes :** e-mail d'accueil avec les instructions de paiement (virement bancaire ou Mobile Money Orange/Wave) présentées sous forme de cartes d'informations ou tables structurées.
     - **Relances & Guides :** relances d'onboarding/profil et e-mail de téléchargement du Guide IBC 2026.

4. **AC-4 — Structure de Présentation des Paiements**
   - Given l'e-mail d'accueil (`sendWelcomeEmail`),  
     When l'utilisateur a choisi un mode de paiement (Virement ou Mobile Money),  
     Then les détails de paiement (IBAN, Numéro marchand, Référence, Étapes) sont affichés dans un bloc d'information distinct et visuellement mis en valeur (fond gris clair/crème, bordure subtile, texte hiérarchisé).

5. **AC-5 — Maintien des Tests et du Pattern Fire-and-Forget**
   - Given la suite de tests unitaires et les routes API,  
     When les modifications sont appliquées,  
     Then `src/lib/email.test.ts` est adapté pour vérifier la présence du champ `html` lors de l'appel à `resend.emails.send`.  
     And le pattern non bloquant `void send...().catch(...)` reste opérationnel sans crash ni régression.  
     And la commande `npm run build` et `npx vitest run src/lib/email.test.ts` s'exécutent avec succès.

## Tasks / Subtasks

- [x] **T1 — Conception du Wrapper HTML et Helper de Template** (AC: #1, #2)
  - [x] T1.1 Créer une fonction helper `getEmailHtmlWrapper(subject: string, contentHtml: string, cta?: { label: string; url: string })` qui retourne le template HTML complet avec styles inline.
  - [x] T1.2 Concevoir le design : en-tête bleu marine avec texte ou logo doré, corps blanc cassé ou blanc, bouton de CTA doré (`#D4A847`), pied de page épuré.
  - [x] T1.3 Mettre en place la parité de contenu : s'assurer que pour chaque e-mail, la version `text` et la version `html` contiennent exactement les mêmes informations textuelles.

- [x] **T2 — Migration des templates d'authentification et de mot de passe** (AC: #3)
  - [x] T2.1 Adapter `sendEmailVerificationEmail` : contenu HTML + bouton CTA de vérification.
  - [x] T2.2 Adapter `sendPasswordResetEmail` : contenu HTML + bouton CTA de réinitialisation.
  - [x] T2.3 Adapter `sendSetPasswordEmail` : contenu HTML + bouton CTA d'invitation.
  - [x] T2.4 Adapter `sendPasswordChangedEmail` : contenu HTML informatif.

- [x] **T3 — Migration des templates d'abonnement et d'opportunités** (AC: #3)
  - [x] T3.1 Adapter `sendSubscriptionActivatedEmail` et `sendAdminSubscriptionConfirmationEmail`.
  - [x] T3.2 Adapter `sendSubscriptionRejectedEmail` en structurant le motif de rejet dans un encadré rouge ou neutre.
  - [x] T3.3 Adapter `sendOpportunityVerifiedEmail` et `sendOpportunityMatchedEmail` avec bouton CTA menant directement au deal.
  - [x] T3.4 Adapter `sendOpportunityRejectedEmail` avec mise en valeur de la note administrative de correction.

- [x] **T4 — Migration de l'e-mail d'accueil et des instructions de paiement** (AC: #3, #4)
  - [x] T4.1 Structurer le contenu de `sendWelcomeEmail` en blocs HTML propres.
  - [x] T4.2 Si le virement bancaire est choisi, afficher les coordonnées de virement dans un tableau propre avec possibilité de copier les champs (IBAN, BIC).
  - [x] T4.3 Si le Mobile Money (Wave/Orange) est choisi, afficher les instructions étape par étape de manière aérée et lisible.

- [x] **T5 — Adaptation des relances et du guide gratuit** (AC: #3)
  - [x] T5.1 Adapter `sendReminderEmail` (les trois types de rappels).
  - [x] T5.2 Adapter `sendGuideEmail` avec un bouton CTA pour télécharger le Guide 2026.

- [x] **T6 — Validation Technique et Tests** (AC: #5)
  - [x] T6.1 Mettre à jour `src/lib/email.test.ts` pour mocker et valider le format HTML en plus du format texte.
  - [x] T6.2 Exécuter les tests : `npx vitest run src/lib/email.test.ts`.
  - [x] T6.3 Vérifier que le build de production passe : `npm run build`.

### Review Findings

- [x] [Review][Decision] Incohérence de ton (Tutoiement en texte brut, Vouvoiement en HTML) — Dans `sendPasswordResetEmail`, la version texte brut tutoie le membre alors que la version HTML le vouvoie.
- [x] [Review][Decision] Absence complète de la couleur d'accent émeraude (`#2D8B4E`) dans les e-mails — La couleur émeraude exigée par l'AC-2 n'est utilisée dans aucun template visuel.
- [x] [Review][Decision] Date d'échéance inexistante dans l'e-mail de rappel final — L'e-mail de rappel final indique "Après cette date..." mais aucune date ou délai n'est communiqué.
- [x] [Review][Patch] Code mort et logique défaillante pour les liens de contournement [src/lib/email.ts:511]
- [x] [Review][Patch] Styles CSS dupliqués et incompatibilités Outlook dans les tableaux de virement [src/lib/email.ts:403]
- [x] [Review][Patch] Génération de liens cassés (`undefined` ou relatifs) si `APP_URL` n'est pas défini [src/lib/email.ts:174]
- [x] [Review][Patch] Absence d'encodage URL pour le token de vérification [src/lib/email.ts:175]
- [x] [Review][Patch] Absence d'échappement des variables injectées dans le code HTML [src/lib/email.ts:179]
- [x] [Review][Patch] Copyright avec année statique dans le footer [src/lib/email.ts:121]
- [x] [Review][Patch] Lien tableau de bord absent du footer standard du Wrapper [src/lib/email.ts:117]
- [x] [Review][Patch] Signature de l'équipe déportée de façon incohérente et redondante [src/lib/email.ts:201]
- [x] [Review][Patch] Syntaxe française incorrecte et termes linguistiques franglais [src/lib/email.ts:201]
- [x] [Review][Patch] Duplication des mentions légales dans les rappels [src/lib/email.ts:567]
- [x] [Review][Patch] Manque d'assertions pour le format HTML dans plusieurs tests unitaires [src/lib/email.test.ts:22]
- [x] [Review][Patch] Lecture statique de la variable d'environnement RESEND_FROM_EMAIL [src/lib/email.ts:40]

## Dev Notes

### Charte graphique IBC (Hexadécimal)
- **Couleur principale (Bleu Marine) :** `#1E3A5F`
- **Couleur d'accent (Or) :** `#D4A847`
- **Couleur de succès (Émeraude) :** `#2D8B4E`
- **Couleur d'erreur (Rouge) :** `#EF4444` (pour le motif de rejet d'abonnement / corrections de deal)
- **Couleur de fond globale :** `#F6F5F2` (gris très clair chaleureux)
- **Typographies de secours :** System-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif.

### Fichiers impactés

| Fichier | Action | Raison |
|--------|--------|--------|
| `src/lib/email.ts` | UPDATE | Refactoring de tous les e-mails en format HTML + Wrapper |
| `src/lib/email.test.ts` | UPDATE | Ajustement des assertions de test pour le format HTML |

### Bonnes pratiques d'intégration e-mail
- Utiliser uniquement des balises `<table>` pour l'alignement des colonnes et des espaces verticaux (les marges/paddings sur `<div>` sont mal supportés par Outlook).
- Forcer les styles inline sur chaque balise (`style="font-family: ...; color: ...;"`).
- S'assurer que le contraste texte/fond respecte WCAG AA (ex: texte blanc sur bouton doré, texte marine sur fond blanc cassé).
- Le logo ou l'image de marque peut être chargé à distance (depuis `process.env.APP_URL` ou une URL CDN stable), ou simplement représenté par un très bel en-tête textuel stylisé si aucune image n'est disponible hors ligne.

### Références
- [Source: `src/lib/email.ts` — Code source à styliser]
- [Source: `src/lib/email.test.ts` — Tests unitaires existants]
- [Source: `src/app/globals.css` — Variables de couleur d'IBC]
- [Source: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-07-11-consolidation.md` — Contexte de consolidation]

## Dev Agent Record

### Agent Model Used

Gemini 3.5 Flash (High)

### Debug Log References

None

### Completion Notes List

- Conception et intégration du wrapper HTML d'e-mail unifié avec CSS inline (couleurs de la charte IBC : bleu marine `#1E3A5F`, or `#D4A847`, émeraude `#2D8B4E`, fond `#F6F5F2`).
- Refactorisation de toutes les fonctions utilitaires dans `src/lib/email.ts` pour générer et expédier la version HTML des emails (vérification de mail, mot de passe oublié/modifié, acceptation/rejet d'abonnement avec encadré Crimson Red, opportunités créées/matchées/rejetées, relances, guide PDF).
- Structuration soignée de l'e-mail d'accueil avec les coordonnées de paiement (tableau pour les virements bancaires, instructions ordonnées pour le Mobile Money).
- Mise à jour et validation de la suite de tests unitaires dans `src/lib/email.test.ts` pour garantir la transmission correcte des versions HTML.
- Validation réussie de la construction de production via `npm run build`.

### File List

- `src/lib/email.ts`
- `src/lib/email.test.ts`

### Change Log

- 2026-07-13: Implémentation et tests complets de la stylisation des e-mails.
