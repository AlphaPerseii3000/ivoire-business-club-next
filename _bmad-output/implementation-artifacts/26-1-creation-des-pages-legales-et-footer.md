---
baseline_commit: c3cdb0451cfe0566e92a7a0acb6bf0a51254d528
---

# Story 26.1: Création des Pages Légales & Footer

Status: done

## Story

**En tant que** visiteur ou membre d'IBC,  
**je veux** pouvoir consulter les mentions légales, la politique de confidentialité et les CGV d'IBC depuis le footer de l'application,  
**afin de** m'informer sur les conditions légales, le traitement de mes données personnelles et les modalités de vente de la plateforme.

## Acceptance Criteria

1. **Intégration Footer** : Les liens "Mentions légales", "Politique de confidentialité" et "CGV" du footer doivent rediriger vers leurs pages respectives via des composants `<Link>` de Next.js.
2. **Accessibilité des Pages** : Les pages `/mentions-legales`, `/politique-confidentialite` et `/cgv` sont publiques, rédigées en français, et accessibles à tout visiteur (authentifié ou non).
3. **Responsive & Design Premium** : Les pages doivent utiliser un conteneur centré de largeur maximale (`max-w-3xl mx-auto`), une typographie hautement lisible, un fil d'ariane ou lien "Retour à l'accueil" en haut, et un espacement soigné.
4. **Contenu Mentions Légales** : Doit mentionner l'éditeur (KS Investment, Abidjan), l'hébergeur (Infomaniak, Suisse) et le Directeur de la Publication.
5. **Contenu Politique de Confidentialité** : Doit expliciter la collecte (nom, email, téléphone, pays, reçus, KYC), la durée de rétention (jusqu'à suppression du profil / 5 ans pour les transactions et justificatifs de virement pour conformité CENTIF-CI), et les régulations (APDP Loi 2013-450 de Côte d'Ivoire et RGPD).
6. **Contenu CGV** : Doit spécifier les tiers (Affranchis 29 €/mois, Grands Frères 59 €/mois, Boss 129 €/mois), le mode de paiement (virement bancaire vers KS Investment ou Mobile Money pour la Côte d'Ivoire), le délai de validation manuelle par l'admin (48h ouvrées), et la politique de résiliation (sans remboursement partiel, service actif jusqu'à l'échéance).
7. **SEO** : Chaque page doit comporter des métadonnées SEO soignées (Title, Description, Canonical URL, OpenGraph).

## Tasks / Subtasks

- [x] Modifier `src/components/landing/footer.tsx` (AC #1)
  - [x] Importer `Link` depuis `next/link`.
  - [x] Remplacer les balises `<a>` par `<Link>` pour les trois liens légaux.
  - [x] Mettre à jour le lien de la politique pour pointer vers `/politique-confidentialite` (au lieu de `/politique-de-confidentialite`).
- [x] Créer la page Mentions Légales `src/app/(public)/mentions-legales/page.tsx` (AC #2, #3, #4, #7)
  - [x] Définir les métadonnées SEO conformes aux standards du projet.
  - [x] Implémenter un en-tête épuré avec un bouton ou lien de retour vers l'accueil (`/`).
  - [x] Rédiger les mentions obligatoires : Éditeur (KS Investment SA, Abidjan, Côte d'Ivoire), Hébergeur (Cloud VPS Infomaniak, Suisse), Directeur de la publication.
- [x] Créer la page Politique de Confidentialité `src/app/(public)/politique-confidentialite/page.tsx` (AC #2, #3, #5, #7)
  - [x] Définir les métadonnées SEO (titre: "Politique de Confidentialité — IBC").
  - [x] Implémenter le retour vers l'accueil.
  - [x] Rédiger les clauses : Collecte des données de profil et KYC, finalités d'intermédiation d'affaires, durée de conservation (suppression de compte / rétention légale de 5 ans pour conformité CENTIF-CI sur les transactions), conformité avec l'APDP (Loi 2013-450) et le RGPD.
- [x] Créer la page CGV `src/app/(public)/cgv/page.tsx` (AC #2, #3, #6, #7)
  - [x] Définir les métadonnées SEO (titre: "Conditions Générales de Vente (CGV) — IBC").
  - [x] Implémenter le retour vers l'accueil.
  - [x] Rédiger les clauses : Description des abonnements (Affranchis: 29 €/mois, Boss: 99 €/mois), virement bancaire ou Mobile Money (Côte d'Ivoire), validation manuelle sous 48h ouvrées par l'administrateur, aucun remboursement prorata en cas de résiliation.
- [x] Valider la conformité du build TypeScript (`npm run build`) et s'assurer qu'aucun lint error n'est levé.

## Dev Notes

### Delta sur code existant — NE PAS réinventer

- Le footer de la landing page est défini dans `src/components/landing/footer.tsx`. Les liens y sont déjà présents mais utilisent des balises `<a>` classiques. La story demande simplement de les migrer vers des `<Link>` de Next.js pour conserver l'état de l'application et d'harmoniser le chemin de la politique de confidentialité.
- Les pages légales sont de nouvelles routes statiques à ajouter sous le groupe de routes `(public)`.

### Architecture et patterns à suivre

- **Next.js 16 App Router & RSC par défaut** : Ces pages doivent rester des Server Components simples. Aucune directive `'use client'` n'est nécessaire.
- **Tailwind CSS v4 & Prose** : Pour le rendu de longs textes légaux, privilégier l'utilisation de structures sémantiques propres (`<h1>`, `<h2>`, `<p>`, `<ul>`, `<li>`) combinées avec des classes typographiques fluides (`prose prose-invert` ou classes équivalentes du projet). Le fond de l'application étant sombre sur la landing page, veillez au bon contraste du texte.
- **Standard de Métadonnées SEO** :
  ```typescript
  export const metadata: Metadata = {
    title: "Titre de la page — Ivoire Business Club",
    description: "Description de la page...",
    alternates: {
      canonical: "/chemin-de-la-page",
    },
  };
  ```
- **JSX Boolean Guardrail** : Ne jamais utiliser de gardes logiques `&&` directs dans le JSX. Si vous devez afficher des éléments conditionnels, pré-calculez le booléen et utilisez des opérateurs ternaires (`condition ? <Component /> : null`).

### Références

- [Spécification technique Epic 26](file:///d:/Code/ivoire-business-club-next/_bmad-output/planning-artifacts/epic-26-consolidation-spec.md#L73-L85)
- [Spécifications UX des pages légales](file:///d:/Code/ivoire-business-club-next/_bmad-output/planning-artifacts/ux-spec.md#L766-L790)

## Dev Agent Record

### Agent Model Used

Gemini 3.5 Flash

### Debug Log References

- ESLint check (task-194) passed with 0 errors.
- Vitest run (task-244) passed with 15/15 successful tests.
- Next.js production build (task-251) completed successfully.

### Completion Notes List

- Modifié `src/components/landing/footer.tsx` pour utiliser le composant `<Link>` de Next.js et corriger l'URL de la politique de confidentialité.
- Créé `src/app/(public)/mentions-legales/page.tsx` avec les mentions obligatoires de KS Investment SA et Infomaniak SA (Suisse).
- Créé `src/app/(public)/politique-confidentialite/page.tsx` détaillant les données KYC/profil, la conservation de 5 ans pour conformité CENTIF-CI, et les régulations APDP/RGPD.
- Créé `src/app/(public)/cgv/page.tsx` avec les conditions de vente, la tarification (Affranchis : 29 €, Grands Frères : 59 €, Boss : 129 €), les paiements par virement et Mobile Money, la validation sous 48h ouvrées, et l'absence de remboursement partiel en cas de résiliation.
- Rédigé et validé 100% de tests unitaires dédiés pour chaque page légale créée.
- Résolu les anomalies d'attentes de titres pré-existantes dans `page.test.tsx` et `actualites/page.test.tsx`.
- Validé la conformité globale via compilation Next.js de production (`npm run build`).

### File List

- `src/components/landing/footer.tsx`
- `src/app/(public)/mentions-legales/page.tsx`
- `src/app/(public)/mentions-legales/page.test.tsx`
- `src/app/(public)/politique-confidentialite/page.tsx`
- `src/app/(public)/politique-confidentialite/page.test.tsx`
- `src/app/(public)/cgv/page.tsx`
- `src/app/(public)/cgv/page.test.tsx`
- `src/app/(public)/page.test.tsx`
- `src/app/(public)/actualites/page.test.tsx`

### Review Findings

- [x] [Review][Patch] Risque d'erreur de réhydratation Next.js (Hydration Mismatch) & Date d'effet dynamique [src/app/(public)/cgv/page.tsx:73]
- [x] [Review][Patch] Accessibilité de l'émoji d'avertissement dans les CGV [src/app/(public)/cgv/page.tsx:124]
- [x] [Review][Defer] Duplication de code de layout [src/app/(public)/cgv/page.tsx:1] — deferred, pre-existing
