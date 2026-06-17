---
baseline_commit: fd0f26f
---
# Story 9.9: Lead Magnet — Envoi Automatique du Guide Gratuit

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**En tant que** visiteur de la page d'accueil IBC,  
**Je veux** recevoir le guide gratuit "Investir en Côte d'Ivoire 2026" par email après avoir saisi mon adresse,  
**Afin de** découvrir les opportunités d'investissement en CI et potentiellement rejoindre le club.

## Contexte

Le composant `LeadMagnet` (`src/components/landing/lead-magnet.tsx`) existe déjà visuellement sur la page d'accueil mais son handler `handleSubmit` est un placeholder qui ne fait qu'afficher un message de succès sans aucun backend. Aucun email n'est envoyé, aucune donnée n'est persistée. Le guide PDF a été uploadé dans `public/guides/Investir en Côte d'Ivoire 2026.pdf` (commit `fd0f26f`).

Le système email `src/lib/email.ts` (nodemailer + SMTP Infomaniak) est fonctionnel et déjà utilisé pour la vérification email, les activations d'abonnement, et les notifications d'opportunités. Il expose une fonction `sendEmail()` privée et des fonctions publiques spécialisées. Il faut ajouter une nouvelle fonction `sendGuideEmail()`.

Le formulaire newsletter du footer (`src/components/landing/footer.tsx`) a le même problème (`onSubmit={(e) => e.preventDefault()}`), mais cette story se concentre uniquement sur le lead magnet. La newsletter pourra être traitée dans une story ultérieure.

## Acceptance Criteria

1. **API Route POST /api/lead-magnet**
   - **Given** un visiteur qui saisit son adresse email dans le formulaire du lead magnet.
   - **When** le formulaire est soumis (fetch POST vers `/api/lead-magnet` avec `{ email }`).
   - **Then** l'API valide l'email (Zod), persiste l'entrée en base (table `lead_magnets`), envoie un email contenant un lien de téléchargement vers le guide PDF, et retourne `200 OK` avec un message de confirmation.

2. **Modélisation Prisma & Migration**
   - **Given** le schéma Prisma mis à jour avec le modèle `LeadMagnet`.
   - **When** la migration est lancée via `npx prisma migrate dev`.
   - **Then** la table `lead_magnets` est créée avec les champs : `id` (UUID), `email` (unique, not null), `createdAt` (default now), `guideSentAt` (nullable, timestamp de l'envoi). Un index unique sur `email` empêche les doublons.

3. **Email du guide**
   - **Given** une adresse email valide soumise via le lead magnet.
   - **When** l'API traite la requête.
   - **Then** un email est envoyé via `sendEmail()` avec :
     - Sujet : "Votre guide gratuit — Investir en Côte d'Ivoire 2026"
     - Corps (text/plain) : message d'introduction + lien direct vers le PDF (`APP_URL/guides/Investir en Côte d'Ivoire 2026.pdf`)
     - Expéditeur : config `MAIL_FROM_NAME` / `MAIL_FROM_ADDRESS`

4. **Déduplication & idempotence**
   - **Given** une adresse email déjà présente en base.
   - **When** le visiteur resoumet le même email.
   - **Then** l'API ne renvoie PAS d'erreur 500. Elle renvoie `200 OK` avec un message indiquant que le guide a déjà été envoyé (ou renvoie à nouveau l'email selon le choix DS — recommandé : idempotent, ne pas renvoyer l'email, retourner un message "déjà reçu"). Le champ `guideSentAt` n'est pas mis à jour une seconde fois.

5. **Mise à jour du composant LeadMagnet**
   - **Given** le composant `LeadMagnet` sur la page d'accueil.
   - **When** l'utilisateur soumet le formulaire.
   - **Then** le composant fait un `fetch('POST /api/lead-magnet', { body: JSON.stringify({ email }) })`, gère les états loading / success / error, et affiche un message approprié selon la réponse de l'API (succès, déjà reçu, ou erreur).

6. **Sécurité & Validation**
   - **Given** une requête malformée (email invalide, champ manquant, body vide).
   - **When** l'API reçoit la requête.
   - **Then** elle retourne `400 Bad Request` avec un message d'erreur clair. Aucune information sensible n'est divulguée dans la réponse. L'endpoint est publiquement accessible (pas d'auth requise) mais rate-limited si possible (au minimum validation Zod stricte).

## Tasks / Subtasks

- [ ] **Modélisation & Migration Prisma (AC: 2)**
  - [ ] Ajouter le modèle `LeadMagnet` dans `prisma/schema.prisma` avec `@@map("lead_magnets")`, index unique sur `email`.
  - [ ] Synchroniser `prisma/schema.dev.prisma` (SQLite) à l'identique.
  - [ ] Lancer la migration : `npx prisma migrate dev --name add_lead_magnet_model`.
  - [ ] Régénérer le client Prisma : `npx prisma generate`.

- [ ] **Fonction email sendGuideEmail (AC: 3)**
  - [ ] Ajouter `sendGuideEmail({ to }: { to: string })` dans `src/lib/email.ts`.
  - [ ] Sujet : "Votre guide gratuit — Investir en Côte d'Ivoire 2026".
  - [ ] Corps : greeting générique + texte de présentation + lien de téléchargement `${APP_URL}/guides/Investir en Côte d'Ivoire 2026.pdf` (URL-encode le nom de fichier).
  - [ ] Utiliser `sendEmail()` existant.

- [ ] **Validation Zod (AC: 6)**
  - [ ] Ajouter `leadMagnetSchema` dans `src/lib/validations.ts` pour valider `email` (email valide, trim, non vide).

- [ ] **API Route POST /api/lead-magnet (AC: 1, 4, 6)**
  - [ ] Créer `src/app/api/lead-magnet/route.ts`.
  - [ ] Valider le body via `leadMagnetSchema`. Si invalide → `400`.
  - [ ] Vérifier si l'email existe déjà en DB (`prisma.leadMagnet.findUnique({ where: { email } })`).
  - [ ] Si existe déjà → retourner `200` avec message "Vous avez déjà reçu ce guide".
  - [ ] Si non → créer l'entrée (`prisma.leadMagnet.create`), appeler `sendGuideEmail()`, mettre à jour `guideSentAt` via `prisma.leadMagnet.update`, retourner `200` avec message de succès.
  - [ ] Si l'envoi email échoue → logguer l'erreur, retourner `500` avec message générique. Ne pas supprimer l'entrée (permet retry manuel).
  - [ ] Créer `src/app/api/lead-magnet/route.test.ts` avec tests vitest.

- [ ] **Mise à jour du composant LeadMagnet (AC: 5)**
  - [ ] Modifier `src/components/landing/lead-magnet.tsx`.
  - [ ] Ajouter état `loading` et `error`.
  - [ ] `handleSubmit` fait un `fetch('POST /api/lead-magnet', { headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ email }) })`.
  - [ ] Gérer la réponse : `200` → message de succès, `400` → message d'erreur de validation, `500` → message d'erreur générique.
  - [ ] Afficher un spinner / état loading sur le bouton pendant la requête.

- [ ] **Tests (AC: 1, 4, 6)**
  - [ ] Tester le happy path : email valide → 200 + email envoyé.
  - [ ] Tester la déduplication : même email deux fois → 200 + message "déjà reçu", pas de second email.
  - [ ] Tester l'email invalide → 400.
  - [ ] Tester le body manquant → 400.
  - [ ] Exécuter `npx vitest run` et s'assurer que tous les tests passent.

## Dev Notes

- **Version de Prisma** : Prisma v7. Les imports du client doivent provenir de `@/generated/prisma/client`.
- **Double synchronisation des Schémas** : Toute modification de structure doit être reportée dans `prisma/schema.prisma` (PostgreSQL) et `prisma/schema.dev.prisma` (SQLite).
- **Système email** : Utiliser `sendEmail()` de `src/lib/email.ts`. Le transporter est configuré via les variables d'environnement `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_ENCRYPTION`, `MAIL_FROM_NAME`, `MAIL_FROM_ADDRESS`. Ne pas créer un nouveau transporter — réutiliser l'existant.
- **URL du guide** : Le fichier PDF est à `public/guides/Investir en Côte d'Ivoire 2026.pdf`. L'URL publique sera `${APP_URL}/guides/Investir%20en%20C%C3%B4te%20d'Ivoire%202026.pdf` (URL-encoded). Vérifier que Next.js sert correctement les fichiers avec des espaces et des caractères accentués dans `public/`.
- **Pas d'auth** : L'endpoint `/api/lead-magnet` est public (pas de session requise). La sécurité repose sur la validation Zod et la déduplication.
- **Gestion d'erreur** : Utiliser `sanitizeError` de `src/lib/sanitize-log.ts` pour les logs d'erreur. Ne pas exposer les détails de l'erreur SMTP dans la réponse HTTP.
- **Next.js 16** : API routes Next.js App Router. Utiliser `export async function POST(request: NextRequest)`.

### Project Structure Notes

- API route : `src/app/api/lead-magnet/route.ts` (nouveau).
- Composant : `src/components/landing/lead-magnet.tsx` (modification).
- Email : `src/lib/email.ts` (ajout fonction).
- Validation : `src/lib/validations.ts` (ajout schéma).
- Schema : `prisma/schema.prisma` + `prisma/schema.dev.prisma` (ajout modèle).

### References

- Composant LeadMagnet actuel : `src/components/landing/lead-magnet.tsx`
- Système email : `src/lib/email.ts`
- Validations existantes : `src/lib/validations.ts`
- Client Prisma : `src/lib/prisma.ts`
- Guide PDF : `public/guides/Investir en Côte d'Ivoire 2026.pdf`
- Schéma Prisma : `prisma/schema.prisma`

## Dev Agent Record

### Agent Model Used

*(to be filled by DS agent)*

### Debug Log References

*(to be filled by DS agent)*

### Completion Notes List

*(to be filled by DS agent)*

### File List

*(to be filled by DS agent)*