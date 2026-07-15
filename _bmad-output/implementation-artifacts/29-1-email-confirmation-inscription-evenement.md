---
baseline_commit: "c7fabd54831b8f1a1adb98f3f75bb6b9f926fd0e"
---

# Story 29-1: Email de confirmation d'inscription à un événement

## Status: done

## Source

Spec fourni par le PO (Jonathan) — fonctionnalité post-implémentation Epic 25 (événements).

## Contexte

La route `POST /api/events/[id]/register` crée un `EventRegistration` en BDD mais n'envoie aucun email de confirmation au participant. Il faut implémenter l'envoi d'un email transactionnel via le système Resend existant (`src/lib/email.ts`).

## Acceptance Criteria

### AC1 — Nouvelle fonction `sendEventRegistrationEmail` dans `src/lib/email.ts`

- Fonction exportée, async, utilisant `sendEmail` + `getEmailHtmlWrapper` existants
- Paramètres conformes au spec (to, name, eventTitle, eventSlug, startDate, endDate, eventType, location, onlineUrl, amountPaid, payOnSite, description)
- Sujet : `Votre inscription à l'événement — ${eventTitle}`

### AC2 — Contenu texte (text)

- Greeting (`Bonjour [name],` ou `Bonjour,`)
- Confirmation de l'inscription
- Titre de l'événement
- Date/heure affichée dans les deux fuseaux : Europe/Paris et Africa/Abidjan
  - Format : `vendredi 25 juillet 2025 à 18:00` (fr-FR, Intl.DateTimeFormat)
  - Si endDate fourni : plage `de {start} à {end}` dans chaque fuseau
- Lieu (si IN_PERSON ou HYBRID) : afficher `location`
- Lien online (si ONLINE ou HYBRID) : afficher `onlineUrl`
- Prix :
  - `payOnSite === true` → "Paiement sur place"
  - `amountPaid !== null && amountPaid > 0` → "Montant : {amountPaid} XOF"
  - `amountPaid === 0 ou null sans payOnSite` → "Gratuit"
- Lien vers la page de l'événement : `{APP_URL}/events/{eventSlug}`
- Lien vers l'espace membre si membre : `{APP_URL}/dashboard` (non affiché pour visiteur)
- Signature IBC

### AC3 — Contenu HTML (contentHtml via getEmailHtmlWrapper)

- Titre de l'événement en `<strong>`
- Bloc date/heure avec les deux fuseaux dans un tableau HTML (style similaire au tableau de paiement dans `sendWelcomeEmail`)
- Lieu et/ou lien online selon le type d'événement
- Information de prix (gratuit / payant / paiement sur place)
- CTA : `{ label: "Voir l'événement", url: "{APP_URL}/events/{eventSlug}" }`

### AC4 — Formatage des dates avec double fuseau horaire

- Utiliser `Intl.DateTimeFormat` avec `timeZone: "Europe/Paris"` et `timeZone: "Africa/Abidjan"`
- Format : `weekday long, day numeric, month long, year numeric, hour 2-digit, minute 2-digit`
- Locale : `fr-FR`
- Si `endDate` fourni : afficher la plage dans chaque fuseau

### AC5 — Intégration dans `route.ts`

- Importer `sendEventRegistrationEmail` depuis `@/lib/email`
- Enrichir le `select` de l'Event dans la transaction : ajouter `slug, startDate, endDate, eventType, location, onlineUrl, description`
- Après `posthogServer.capture`, appeler `sendEventRegistrationEmail` avec les données
- L'appel email ne doit PAS bloquer la réponse — si l'email échoue, log l'erreur en console mais ne pas throw
- Récupérer `name` : `session.user.name` pour les membres, `null` pour les visiteurs

### AC6 — Tests

- Dans `route.test.ts` : vérifier que `sendEventRegistrationEmail` est appelé après une inscription réussie (mock la fonction)
- Dans `email.test.ts` ou `route.test.ts` : vérifier le contenu de l'email (présence des deux fuseaux, titre, lieu/lien selon le type)

### AC7 — Contraintes

- Utiliser `getEmailHtmlWrapper` existant — pas de nouveau template
- Respecter le style des autres emails (couleurs, typographie, structure)
- Email en français
- Liens via `getAppUrl()` comme les autres emails
- Pas de migration Prisma
- Pattern fire-and-forget : `sendEventRegistrationEmail(...).catch(err => console.error(...))` — ne pas await

## Dev Agent Record

Implementation completed.
- `src/lib/email.ts`: added `sendEventRegistrationEmail` with dual timezone formatting, HTML wrapper reuse, location/online URL/price logic, event CTA.
- `src/app/api/events/[id]/register/route.ts`: fire-and-forget call to `sendEventRegistrationEmail` after successful registration; select enriched with event fields; transaction returns full `event` object.
- `src/app/api/events/[id]/register/route.test.ts`: added mock and test verifying email is dispatched after successful registration; updated mock event objects with new fields.
- `src/lib/email.test.ts`: added 6 tests covering dual timezone, online URL, payOnSite, free, amount, and CTA.
- Verified with `npm run build` and `npx vitest run src/lib/email.test.ts src/app/api/events/[id]/register/route.test.ts`.