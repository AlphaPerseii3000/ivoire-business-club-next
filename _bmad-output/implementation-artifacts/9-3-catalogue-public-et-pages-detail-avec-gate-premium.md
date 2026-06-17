---
baseline_commit: 3686d44903c443f7ce4c7d3e74177640dcaab4ae
---
# Story 9.3: Catalogue Public et Pages Détail avec Gate Premium

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**En tant que** visiteur ou membre IBC,  
**Je veux** parcourir et lire des articles selon mon niveau d'accès, voir l'opportunité d'investissement associée et pouvoir partager l'article sur les réseaux sociaux,  
**Afin de** bénéficier du contenu éditorial gratuit, évaluer les deals connexes pour convertir, et diffuser les analyses intéressantes du club.

## Acceptance Criteria

1. **Visiteur anonyme sur le catalogue**
   - **Given** un visiteur non connecté sur `/articles`
   - **When** la page se charge
   - **Then** seuls les articles `PUBLIC` publiés sont affichés, triés par date de publication récente.

2. **Membre actif avec accès complet**
   - **Given** un membre connecté avec le tier `AFFRANCHI` (ou supérieur) et un abonnement actif sur `/articles`
   - **When** la page se charge
   - **Then** les articles `PUBLIC` et `AFFRANCHI` (et les tiers inférieurs correspondants) sont affichés intégralement avec un lien de lecture complète.

3. **Membre inactif ou sans abonnement (Catalogue)**
   - **Given** un membre connecté sans abonnement actif (ou au statut inactif) sur `/articles`
   - **When** la page se charge
   - **Then** les articles `PUBLIC` sont affichés intégralement, tandis que les articles premium (`AFFRANCHI`, `GRAND_FRERE`, `BOSS`) affichent leur titre, leur extrait (`excerpt`) et un bouton CTA clair "Abonnez-vous pour lire" (qui redirige vers `/pricing`).

4. **Accès au détail d'un article public**
   - **Given** un visiteur (anonyme ou connecté) sur `/articles/comment-investir-abidjan`
   - **When** l'article est marqué `PUBLIC` et publié
   - **Then** le contenu complet de l'article est affiché avec ses balises meta SEO.

5. **Accès au détail d'un article premium (Gated)**
   - **Given** un utilisateur connecté sans abonnement actif (ou visiteur anonyme) sur `/articles/guide-premium`
   - **When** l'article a une visibilité premium (ex: `AFFRANCHI`)
   - **Then** le titre et l'extrait (`excerpt`) sont affichés, accompagnés d'un encart premium (Gate Panel) contenant un message incitant à l'abonnement et un bouton CTA "Abonnez-vous pour lire l'article complet" pointant vers `/pricing`.

6. **Filtrage par catégorie**
   - **Given** un utilisateur sur `/articles`
   - **When** il clique sur un filtre de catégorie (`conseil`, `guide`, `témoignage`, `actu` ou "Tous")
   - **Then** la page affiche uniquement les articles correspondant à cette catégorie et qui respectent les règles de visibilité selon son niveau d'accès.

7. **Article inexistant ou brouillon**
   - **Given** un utilisateur accédant à `/articles/article-inconnu`
   - **When** l'article n'existe pas en base de données ou n'est pas publié (`published: false`)
   - **Then** une page 404 standard (via `notFound()`) est affichée.

8. **Association Opportunité & DealCard (Nouveau - SCP 2026-06-16)**
   - **Given** un membre connecté éligible lisant un article publié sur `/articles/[slug]`
   - **When** cet article est associé à une opportunité d'investissement (`opportunityId` non nul)
   - **And** l'utilisateur a accès au tier requis de cette opportunité (vérifié via `canUserAccessOpportunity`)
   - **Then** un encart "Opportunité associée" s'affiche sous l'article en utilisant le composant `DealCard`.
   - **Given** un visiteur anonyme, un membre inactif ou un membre avec un tier insuffisant
   - **When** il lit la page de l'article associé
   - **Then** l'encart d'opportunité associée (`DealCard`) n'est pas affiché (masquage strict par sécurité).

9. **Boutons de partage social (Nouveau - SCP 2026-06-16)**
   - **Given** la page détail d'un article sur `/articles/[slug]`
   - **When** l'article est rendu et accessible
   - **Then** des boutons de partage (WhatsApp, LinkedIn, Twitter/X, Email, et Copier le lien) sont disponibles sous le contenu de l'article.
   - **And** ils utilisent des URLs de partage propres et dynamiques basées sur les métadonnées SEO existantes de l'article.
   - **And** cliquer sur "Copier le lien" copie l'URL de l'article dans le presse-papiers et affiche une notification de succès ("Lien copié !").

## Tasks / Subtasks

- [x] **Mise à jour des requêtes de base de données (AC: 8)**
  - [x] Modifier la fonction `getArticleBySlug` dans [src/app/(public)/articles/[slug]/page.tsx](file:///D:/Code/ivoire-business-club-next/src/app/(public)/articles/[slug]/page.tsx) pour inclure la relation `opportunity` avec toutes les données nécessaires pour le composant `DealCard` :
    - `author`: `select` { `name`, `id`, `phone`, `location`, `opportunities` (vérifiées) }
    - `tags`: triés et sélectionnés { `category`, `value` }
    - `_count`: select { `documents`, `verificationApprovals` }
    - `documents`: uniquement les images de couverture pour la miniature (comme dans le feed).

- [x] **Contrôle d'accès à l'opportunité associée (AC: 8)**
  - [x] Importer `canUserAccessOpportunity` depuis [src/lib/opportunity-visibility.ts](file:///D:/Code/ivoire-business-club-next/src/lib/opportunity-visibility.ts).
  - [x] Dans [src/app/(public)/articles/[slug]/page.tsx](file:///D:/Code/ivoire-business-club-next/src/app/(public)/articles/[slug]/page.tsx), si l'article possède une opportunité associée (`article.opportunity` existe) :
    - Calculer si l'utilisateur y a accès : `isAdmin || (isLoggedIn && hasActiveSub && canUserAccessOpportunity(article.opportunity.requiredTier, userTier))`.
    - Si oui, passer les données formatées de l'opportunité au composant `DealCard`.

- [x] **Création du composant client ShareButtons (AC: 9)**
  - [x] Créer `src/components/features/articles/ShareButtons.tsx` (Client Component) :
    - Recevoir en props le `title` de l'article, l'excerpt ou description, et le `slug` (ou l'URL absolue calculée côté serveur).
    - Fournir les liens de partage dynamiques et sécurisés pour :
      - **WhatsApp** : `https://api.whatsapp.com/send?text=[title]%20[url]`
      - **LinkedIn** : `https://www.linkedin.com/sharing/share-offsite/?url=[url]`
      - **Twitter/X** : `https://twitter.com/intent/tweet?text=[title]&url=[url]`
      - **Email** : `mailto:?subject=[title]&body=[url]`
      - **Copier le lien** : Implémenter le copier dans le presse-papiers avec `navigator.clipboard.writeText` et afficher un toast success avec `toast.success("Lien copié !")` de la bibliothèque `sonner`.
    - Utiliser des icônes Lucide appropriées (`Share2`, `Linkedin`, `Twitter` / `X` customisé, `Mail`, `Link`).
    - Appliquer un style visuel haut de gamme (fond sombre, bordure subtile, hover fluide avec micro-animations de scale, couleurs de marque discrètes ou dorées d'Ivoire Business Club).

- [x] **Intégration UI sur la page détail de l'article (AC: 8, 9)**
  - [x] Dans [src/app/(public)/articles/[slug]/page.tsx](file:///D:/Code/ivoire-business-club-next/src/app/(public)/articles/[slug]/page.tsx) :
    - Importer `DealCard` depuis [src/components/features/deals/deal-card.tsx](file:///D:/Code/ivoire-business-club-next/src/components/features/deals/deal-card.tsx).
    - Rendre le composant `ShareButtons` directement sous l'article (au-dessus des réactions) ou à côté.
    - Si l'utilisateur est éligible et que l'article a un deal associé, afficher une section `"Opportunité associée"` contenant le composant `DealCard` en bas de page.

- [x] **Mise à jour et écriture des Tests Unitaires (AC: 8, 9)**
  - [x] Mettre à jour [src/app/(public)/articles/[slug]/page.test.tsx](file:///D:/Code/ivoire-business-club-next/src/app/(public)/articles/[slug]/page.test.tsx) :
    - Ajouter un test vérifiant que si l'article a une opportunité associée et que l'utilisateur a le tier requis, l'encart `DealCard` apparaît avec le titre de l'opportunité.
    - Ajouter un test vérifiant que si l'utilisateur n'est pas connecté ou n'a pas le tier requis, le `DealCard` de l'opportunité associée ne s'affiche pas.
    - Ajouter des tests pour vérifier le rendu du composant de partage d'article.
  - [x] S'assurer du passage au vert de la suite de tests complète avec `npx vitest run`.

## Dev Notes

### Architecture & Conventions

- **Next.js 16 / React 19 Params** : Dans les composants serveurs de Next.js 16, destructurer `params` de façon asynchrone (ex: `const { slug } = await params;`).
- **Garde-fous JSX** : Remplacer systématiquement les court-circuits logiques `condition && <Component />` par des ternaires explicites `condition ? <Component /> : null` pour éviter les crashs de rendu sous React 19.
- **Accès Premium** : Utiliser exclusivement `hasActiveSubscription(userId)` pour vérifier le statut de paiement. Ne jamais faire confiance au tier de l'utilisateur sans valider l'abonnement actif.
- **Sécurisation des logs** : Passer toutes les erreurs attrapées dans les blocs `try/catch` à `sanitizeError` de `@/lib/sanitize-log` avant de faire un `console.error`.
- **Zéro Nesting d'Ancres (Crucial)** : Le composant `DealCard` contient déjà une balise `<Link>` englobante vers `/dashboard/opportunities/[id]`. Ne jamais englober le `DealCard` dans un autre lien de redirection pour éviter des exceptions de rendu et de réhydratation HTML.

### Fichiers impactés ou créés

- [src/app/(public)/articles/[slug]/page.tsx](file:///D:/Code/ivoire-business-club-next/src/app/(public)/articles/[slug]/page.tsx) (MODIFIED) - Inclusion de la jointure d'opportunité, contrôle d'accès tier, rendu de la DealCard et des ShareButtons.
- `src/components/features/articles/ShareButtons.tsx` (NEW) - Composant de partage social dynamique.
- [src/app/(public)/articles/[slug]/page.test.tsx](file:///D:/Code/ivoire-business-club-next/src/app/(public)/articles/[slug]/page.test.tsx) (MODIFIED) - Tests unitaires de validation pour l'intégration de l'opportunité associée et des boutons de partage.

### Références

- Définition d'Epic 9 : [epics.md#L1306-L1314](file:///D:/Code/ivoire-business-club-next/_bmad-output/planning-artifacts/epics.md#L1306-L1314)
- Modèle de données Prisma : [prisma/schema.prisma#L397-L421](file:///D:/Code/ivoire-business-club-next/prisma/schema.prisma#L397-L421)
- Logique de visibilité d'opportunités : [src/lib/opportunity-visibility.ts](file:///D:/Code/ivoire-business-club-next/src/lib/opportunity-visibility.ts)
- Proposition de modification de Sprint : [sprint-change-proposal-2026-06-16.md](file:///D:/Code/ivoire-business-club-next/_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-16.md)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (Thinking)

### Debug Log References

- lucide-react v1.17.0 ne contient pas l'icône `Linkedin` — remplacé par SVG custom (`LinkedInIcon`).
- Renommé l'import `Link` de lucide en `LinkIcon` pour éviter la collision avec `next/link`.

### Completion Notes List

- ✅ Requête Prisma `getArticleBySlug` étendue pour inclure la relation `opportunity` complète (author, tags, _count, documents thumbnail).
- ✅ Contrôle d'accès opportunité : `isAdmin || (isLoggedIn && hasActiveSub && canUserAccessOpportunity())` — masquage strict par sécurité.
- ✅ Composant `ShareButtons` créé — 5 canaux : WhatsApp, LinkedIn, X, Email, Copier le lien. Design premium, micro-animations, toast sonner.
- ✅ Intégration UI : ShareButtons sous le contenu (au-dessus des réactions), DealCard en section « Opportunité associée » en bas. Zéro nesting d'ancres respecté.
- ✅ Type `DealCardDeal` exporté depuis `deal-card.tsx` pour réutilisation type-safe.
- ✅ 12 tests passent (5 originaux + 7 nouveaux) couvrant AC 8 et AC 9.

### File List

- `src/app/(public)/articles/[slug]/page.tsx` (MODIFIED) — Prisma query étendue, imports, access logic, ShareButtons + DealCard rendering
- `src/components/features/articles/ShareButtons.tsx` (NEW) — Composant client de partage social
- `src/components/features/deals/deal-card.tsx` (MODIFIED) — Export du type `DealCardDeal`
- `src/app/(public)/articles/[slug]/page.test.tsx` (MODIFIED) — 7 nouveaux tests pour AC 8 & 9

### Change Log

- 2026-06-17 : Mise à jour de la Story 9.3 pour intégrer l'association d'opportunité avec `DealCard` sous contrôle de tier et les boutons de partage social dynamique.
- 2026-06-17 : Implémentation complète — query Prisma, contrôle d'accès, ShareButtons, intégration UI, 12 tests verts.
