---
baseline_commit: 4a35f44a44367aec8a63d118f83f301b52fb5be5
---

# Story 26.2: Registre de Consentement APDP / RGPD à l'Inscription

Status: done

## Story

**En tant que** visiteur,  
**je veux** donner mon consentement explicite aux CGV et à la Politique de Confidentialité lors de mon inscription,  
**afin de** valider mon compte conformément à la réglementation APDP et au RGPD.

## Acceptance Criteria

1. **Case à cocher de consentement obligatoire** : Un champ de case à cocher obligatoire est présent sur le formulaire d'inscription `/auth/signup`. Le bouton de soumission reste désactivé ou retourne une erreur de validation claire si la case n'est pas cochée.
2. **Texte de consentement & Liens vers un nouvel onglet** : Le texte à côté de la case est *"J'accepte les CGV et la Politique de Confidentialité d'IBC."*. Les mots *"CGV"* et *"Politique de Confidentialité"* sont des liens ouvrant leurs pages respectives (`/cgv` et `/politique-confidentialite`) dans un nouvel onglet (`target="_blank" rel="noopener noreferrer"`) afin de ne pas perdre les données saisies par l'utilisateur.
3. **Sécurité et validation de la route API** : La route `/api/auth/signup` valide la présence et la valeur `true` du consentement. En cas d'appel direct frauduleux ou manquant de ce consentement, la route retourne une erreur `400 Bad Request` avec un message d'erreur explicite.
4. **Enregistrement de la conformité en base de données** : Lors de la création de l'utilisateur en base de données, la date exacte du consentement est stockée dans `acceptedTermsAt` et la version des termes dans `termsVersion` (valeur initiale `"1.0"`).
5. **Couverture de tests unitaires & intégration** :
   - Les tests d'API (`route.test.ts`) et de page UI (`page.test.tsx`) sont mis à jour pour intégrer la validation et le comportement de ce nouveau champ, et s'exécutent avec succès.
   - Les tests de régression ne doivent pas être cassés.

## Tasks / Subtasks

- [ ] **Mise à jour des modèles Prisma** (AC #4)
  - [ ] Ajouter `acceptedTermsAt DateTime?` et `termsVersion String?` au modèle `User` dans `prisma/schema.prisma` (PostgreSQL).
  - [ ] Ajouter ces mêmes champs au modèle `User` dans `prisma/schema.dev.prisma` (SQLite - utilisé pour le dev local et les tests).
  - [ ] Lancer les migrations pour générer le client mis à jour : `npx prisma migrate dev --name add_user_consent_fields` (local).
- [ ] **Mise à jour de la validation Zod** (AC #1, #3)
  - [ ] Modifier `signupSchema` dans `src/lib/validations.ts` pour y inclure `acceptTerms: z.literal(true, { errorMap: () => ({ message: "Vous devez accepter les conditions pour continuer." }) })`.
- [ ] **Mise à jour de la route API Inscription** (AC #3, #4)
  - [ ] Dans `src/app/api/auth/signup/route.ts`, adapter la déstructuration de `parsed.data` pour en extraire `acceptTerms` (sans le transmettre directement à l'appel Prisma pour éviter les erreurs de type Prisma).
  - [ ] Passer `acceptedTermsAt: new Date()` et `termsVersion: "1.0"` dans l'objet `data` de `prisma.user.create`.
- [ ] **Intégration du composant UI** (AC #1, #2)
  - [ ] Modifier `src/app/auth/signup/page.tsx` pour ajouter la case à cocher de consentement.
  - [ ] Styliser la case pour correspondre au design haut de gamme de la plateforme (couleurs sobres, accent-primary, états de focus soignés).
  - [ ] Ajouter la gestion des messages d'erreur Zod sous la case à cocher.
  - [ ] Ajouter un texte informatif de consentement sous le bouton de connexion Google OAuth pour couvrir ce point réglementaire : *"En continuant avec Google, vous acceptez également les CGV et la Politique de Confidentialité d'IBC."*
- [ ] **Couverture de la conformité Google OAuth** (AC #4)
  - [ ] Dans `src/lib/auth.ts`, mettre à jour `patchPrismaAdapter` pour s'assurer que lors de la création d'un nouvel utilisateur via le flux Google OAuth (qui contourne le formulaire frontend), les champs `acceptedTermsAt: new Date()` et `termsVersion: "1.0"` soient automatiquement initialisés.
- [ ] **Mise à jour et validation des suites de tests** (AC #5)
  - [ ] Adapter `src/app/api/auth/signup/route.test.ts` : ajouter `acceptTerms: true` dans les requêtes de tests réussis et modifier les assertions d'appel `mockUserCreate` pour s'attendre à `acceptedTermsAt: expect.any(Date)` et `termsVersion: "1.0"`. Ajouter un test spécifique validant le rejet en cas d'absence de consentement.
  - [ ] Adapter `src/app/auth/signup/page.test.tsx` : ajouter l'interaction avec le checkbox dans les tests de soumission réussie, et ajouter un test qui vérifie que la soumission sans case cochée est bloquée par Zod.
  - [ ] Exécuter `npx vitest run src/app/api/auth/signup/route.test.ts` et `npx vitest run src/app/auth/signup/page.test.tsx`.

## Dev Notes

### Delta sur code existant — NE PAS réinventer
- **Formulaire existant** : `src/app/auth/signup/page.tsx` utilise déjà `react-hook-form` avec le validateur `zodResolver(signupSchema)`. La case à cocher doit simplement s'insérer sous le champ du mot de passe et avant le bouton de soumission.
- **Base de données** : Le projet utilise un système multi-schémas Prisma (`prisma/schema.prisma` pour la prod PostgreSQL et `prisma/schema.dev.prisma` pour le dev SQLite). **Vous devez impérativement modifier les deux fichiers** sous peine d'avoir des incohérences lors du run des tests unitaires ou du dev local.

### Architecture et patterns à suivre
- **JSX Escape Guardrail** : Attention aux apostrophes non échappées dans le texte du label du formulaire qui provoquent des erreurs ESLint. Utilisez `J&apos;accepte les` ou `{"J'accepte les"}`.
- **Prisma Create Payload** : Zod valide `acceptTerms: true`, mais le modèle de base de données ne contient pas cette colonne sous forme de booléen. Veillez à ne **pas** passer `acceptTerms` directement dans l'appel `prisma.user.create` (ex: `data: { ...parsed.data }` ❌ provoquera une erreur d'exécution). Extrayez-le préalablement par déstructuration ou passez les champs explicitement.
- **Styles CSS/Tailwind** : Utiliser la stack globale Tailwind CSS v4. Styliser l'input checkbox avec des classes cohérentes avec les inputs textes de la page :
  ```html
  className="h-4 w-4 rounded border bg-background text-primary accent-primary focus:ring-2 focus:ring-primary/25"
  ```
  Le design doit demeurer minimaliste, élégant et s'intégrer harmonieusement à la boîte de dialogue sombre.

### Références
- **Spécifications Epic 26** : [epic-26-consolidation-spec.md (L88-L100)](file:///D:/Code/ivoire-business-club-next/_bmad-output/planning-artifacts/epic-26-consolidation-spec.md#L88-L100)
- **Spécifications UX** : [ux-spec.md (L1352)](file:///D:/Code/ivoire-business-club-next/_bmad-output/planning-artifacts/ux-spec.md#L1352)
- **Règles Générales du Projet** : [project-context.md](file:///D:/Code/ivoire-business-club-next/project-context.md)

## Dev Agent Record

### Agent Model Used

Gemini 3.5 Flash (High)

### Debug Log References

- Vitest API suite check (task-104) passed (7/7 tests).
- Vitest UI suite check (task-109) passed (10/10 tests).

### Completion Notes List

- *À remplir par le développeur après implémentation.*

### File List

- `prisma/schema.prisma`
- `prisma/schema.dev.prisma`
- `src/lib/validations.ts`
- `src/app/api/auth/signup/route.ts`
- `src/app/api/auth/signup/route.test.ts`
- `src/app/auth/signup/page.tsx`
- `src/app/auth/signup/page.test.tsx`
- `src/lib/auth.ts`
