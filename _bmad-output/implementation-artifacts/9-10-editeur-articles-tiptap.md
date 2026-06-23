---
baseline_commit: HEAD
---

# Story 9.10: Éditeur d'Articles TipTap (WYSIWYG Markdown)

Status: done

## Story

**En tant qu'** administrateur IBC,
**Je veux** un éditeur de texte riche WYSIWYG (TipTap) remplaçant le textarea Markdown actuel,
**Afin de** rédiger des articles avec un formatage visuel complet (titres H1-H4, gras, italique, citations, liens, listes, code inline, séparateurs) sans avoir à écrire manuellement la syntaxe Markdown, tout en conservant le stockage Markdown en base de données.

## Contexte Technique

### État actuel
- `src/components/features/admin/article-form.tsx` utilise un `<Textarea>` avec toolbar basique (1 bouton heading H1, bold, italic, list) et un onglet preview via `marked` + `isomorphic-dompurify`.
- Le contenu est stocké en Markdown dans la DB (champ `Article.content`).
- Le rendu public utilise `src/components/features/articles/ArticleContent.tsx` avec `marked` + `DOMPurify` — **ne doit pas changer**.

### Solution choisie : TipTap v3 + `@tiptap/markdown`
- TipTap est headless, React-first, extensible.
- `@tiptap/markdown` (v3.27+) fournit la conversion bidirectionnelle Markdown ↔ Tiptap JSON.
- Le contenu reste stocké en Markdown dans la DB (sérialisation via `editor.storage.markdown.getMarkdown()`).
- L'input markdown existant est chargé via `contentType: 'markdown'` ou `editor.commands.setContent(markdown, { contentAs: 'markdown' })`.

### Stack
- React 19.2.4, Next.js 16.2.6, TailwindCSS 4, shadcn/ui
- Dépendances à installer :
  - `@tiptap/react` (v3)
  - `@tiptap/pm` (ProseMirror peer dep)
  - `@tiptap/starter-kit` (bundle: Document, Paragraph, Text, Heading, Bold, Italic, ListItem, BulletList, OrderedList, Blockquote, Code, CodeBlock, HorizontalRule, HardBreak)
  - `@tiptap/extension-link` (liens cliquables)
  - `@tiptap/markdown` (conversion markdown bidirectionnelle)

## Acceptance Criteria

1. **Éditeur WYSIWYG TipTap intégré**
   - **Given** l'admin sur `/admin/articles/new` ou `/admin/articles/[id]/edit`
   - **When** la page se charge
   - **Then** l'éditeur TipTap remplace le textarea Markdown précédent
   - **And** l'éditeur affiche un rendu visuel en temps réel (WYSIWYG) du contenu formaté
   - **And** le contenu existant en Markdown est correctement chargé dans l'éditeur au montage

2. **Barre d'outils complète**
   - **Given** l'admin dans l'éditeur TipTap
   - **When** il utilise la barre d'outils
   - **Then** les boutons suivants sont disponibles et fonctionnels :
     - **Titres** : dropdown ou boutons pour H1, H2, H3, H4 (paragraph par défaut)
     - **Gras** (Ctrl+B)
     - **Italique** (Ctrl+I)
     - **Liste à puces**
     - **Liste numérotée**
     - **Citation** (blockquote)
     - **Lien** (dialog ou prompt pour saisir l'URL)
     - **Code inline** (backticks)
     - **Séparateur horizontal** (---)
   - **And** les boutons reflètent l'état actuel de la sélection (actif/inactif)
   - **And** les raccourcis clavier standard fonctionnent (Ctrl+B, Ctrl+I)

3. **Sérialisation Markdown**
   - **Given** l'admin rédige du contenu dans l'éditeur TipTap
   - **When** il soumet le formulaire
   - **Then** le contenu est sérialisé en Markdown valide via `@tiptap/markdown`
   - **And** le Markdown est envoyé à l'API (POST/PUT) dans le champ `content`
   - **And** le Markdown est identique en structure à ce que produisait l'ancien éditeur (compatibilité avec `ArticleContent.tsx`)

4. **Chargement du contenu existant**
   - **Given** un article existant avec du contenu Markdown en base
   - **When** l'admin ouvre la page d'édition `/admin/articles/[id]/edit`
   - **Then** le Markdown est parsé par TipTap et affiché correctement dans l'éditeur
   - **And** les titres, listes, citations, liens, gras, italique sont correctement interprétés

5. **Upload d'images en ligne préservé**
   - **Given** l'admin dans l'éditeur TipTap
   - **When** il clique sur "Insérer une image en ligne"
   - **Then** l'image est uploadée via l'API existante (`/api/admin/articles/upload`)
   - **And** l'image est insérée dans l'éditeur TipTap comme nœud image (avec alt text)
   - **And** l'image est sérialisée en syntaxe Markdown `![alt](url)` lors de la sauvegarde

6. **Compatibilité du rendu public**
   - **Given** un article créé/modifié avec le nouvel éditeur TipTap
   - **When** un membre consulte la page publique de l'article
   - **Then** le rendu via `ArticleContent.tsx` (`marked` + `DOMPurify`) est identique visuellement à ce qui était affiché dans l'éditeur
   - **And** aucun changement n'est nécessaire dans `ArticleContent.tsx`

7. **Tests unitaires mis à jour**
   - **Given** le fichier `article-form.test.tsx` existant
   - **When** les tests sont exécutés
   - **Then** les tests interagissent avec l'éditeur TipTap (pas un textarea)
   - **And** les tests vérifient : soumission de formulaire, catégories, édition pré-remplie, validation, opportunités, formatage (gras via toolbar), et sérialisation markdown
   - **And** les `data-testid` existants sont préservés ou remplacés de manière cohérente (`article-content-input` → éditeur TipTap, `article-title-input`, `article-excerpt-input`, `article-submit-button`, etc.)

8. **Build et performance**
   - **Given** le projet avec les nouvelles dépendances TipTap installées
   - **When** `npm run build` est exécuté
   - **Then** le build réussit sans erreurs TypeScript dans `src/`
   - **And** l'éditeur est côté client uniquement (`"use client"`) — pas de SSR TipTap
   - **And** `npx vitest run` passe tous les tests

## Tasks / Subtasks

- [ ] **Installation des dépendances TipTap (AC: 1, 8)**
  - [ ] Installer : `@tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-link @tiptap/markdown`
  - [ ] Vérifier que `npm run build` passe après installation (avant tout code)

- [ ] **Création du composant `RichTextEditor` (AC: 1, 2, 5)**
  - [ ] Créer `src/components/features/admin/rich-text-editor.tsx` (client component)
  - [ ] Props : `value: string` (markdown), `onChange: (markdown: string) => void`, `data-testid`
  - [ ] Configurer `useEditor` avec les extensions : `StarterKit`, `Link.configure({ openOnClick: false })`, `Markdown`
  - [ ] Charger le contenu initial via `contentType: 'markdown'` ou `editor.commands.setContent(value, { contentAs: 'markdown' })` au montage
  - [ ] Sérialiser le contenu via `editor.storage.markdown.getMarkdown()` sur `onUpdate`
  - [ ] Barre d'outils avec boutons : H1, H2, H3, H4, paragraphe, gras, italique, listes, citation, lien, code inline, séparateur
  - [ ] Boutons reflètent l'état actif (`editor.isActive('bold')`, etc.) via `useEditorState` ou `onSelectionUpdate`
  - [ ] Bouton lien : ouvre un petit popover/dialog pour saisir l'URL, utilise `editor.chain().focus().setLink({ href }).run()`
  - [ ] Bouton image en ligne : réutiliser l'upload existant, insérer via `editor.chain().focus().setImage({ src, alt }).run()`
  - [ ] Styling avec Tailwind : éditeur `prose dark:prose-invert`, toolbar sticky en haut, bordures cohérentes avec le design system

- [ ] **Intégration dans `ArticleForm` (AC: 1, 3, 5)**
  - [ ] Remplacer le bloc `<Tabs>` (write/preview) et le `<Textarea>` par le composant `RichTextEditor`
  - [ ] Conserver la logique `react-hook-form` : `register("content")` remplacé par `setValue("content", markdown)` via `onChange`
  - [ ] Préserver l'upload d'image de couverture (cover image) — inchangent
  - [ ] Préserver tous les autres champs (title, excerpt, category, visibility, opportunity, published)
  - [ ] Supprimer les imports inutilisés : `marked`, `DOMPurify` (si plus utilisés ailleurs dans le form), `Bold, Italic, Heading, List` de lucide-react (remplacés par TipTap toolbar)

- [ ] **Mise à jour des tests (AC: 7)**
  - [ ] Adapter `article-form.test.tsx` :
    - Remplacer les interactions `textarea` par des interactions TipTap (typing dans l'éditeur via `editor.commands` ou DOM du ProseMirror)
    - Le test "bold" doit cliquer sur le bouton toolbar TipTap et vérifier le markdown output contient `**texte**`
    - Le test "preview" n'est plus nécessaire (WYSIWYG = preview permanent) — remplacer par un test de sérialisation markdown
    - Conserver `data-testid="article-content-input"` sur le wrapper de l'éditeur TipTap pour compatibilité
  - [ ] Tous les autres tests (title, excerpt, category, visibility, opportunity, submit) doivent continuer à passer

- [ ] **Vérification de compatibilité (AC: 3, 4, 6)**
  - [ ] Créer un article avec l'éditeur TipTap → vérifier que le markdown sérialisé est valide
  - [ ] Rouvrir l'article en édition → vérifier que le contenu est correctement chargé
  - [ ] Vérifier le rendu public (`ArticleContent.tsx`) avec le markdown produit par TipTap
  - [ ] Tester avec un article existant (contenu markdown legacy) → chargement correct

## Dev Notes

### Pitfalls spécifiques
- **Next.js 16 strict JSX** : pas de `&&` avec string en JSX — utiliser des ternaires (`{cond ? <X/> : null}`).
- **TipTap SSR** : TipTap ne fonctionne pas en SSR. Le composant doit être `"use client"`. Si nécessaire, gating avec `isClient` state pour éviter les warnings `useLayoutEffect` en SSR.
- **`@tiptap/markdown` setContent** : en TipTap v3, `editor.commands.setContent(markdownString, { contentAs: 'markdown' })` ou `contentType: 'markdown'` dans la config de `useEditor`. Vérifier la syntaxe exacte selon la version installée.
- **Sérialisation** : `editor.storage.markdown.getMarkdown()` retourne le markdown. S'assurer que l'extension Markdown est bien chargée pour que ce storage existe.
- **Don't remove `marked` and `isomorphic-dompurify` from package.json** — `ArticleContent.tsx` les utilise toujours pour le rendu public.
- **`data-testid` preservation** : les tests existants utilisent `article-content-input`, `article-title-input`, `article-excerpt-input`, `article-submit-button`, `article-category-trigger`, `article-visibility-trigger`, `article-opportunity-trigger`, `article-custom-category-input`, `markdown-bold-btn`, `markdown-preview-trigger`, `markdown-preview`. Garder les testids critiques. `markdown-bold-btn` → nouveau bouton toolbar TipTap. `markdown-preview-trigger` et `markdown-preview` → supprimer (plus de tab preview, WYSIWYG permanent).
- **Prisma schema unchanged** : pas de migration nécessaire, le champ `content` reste `TEXT` markdown.

### Gardes-fous
- Ne PAS modifier `ArticleContent.tsx` (rendu public).
- Ne PAS modifier les API routes (`/api/articles`, `/api/articles/[id]`) — le payload `content` reste du markdown.
- Ne PAS modifier le schéma Prisma.
- Ne PAS supprimer `marked` et `isomorphic-dompurify` des dépendances.
- Conserver toute la logique existante : cover image upload, inline image upload (réutiliser l'endpoint existant), category select, visibility select, opportunity select, published checkbox.

## Change Impact

- **Fichiers modifiés** :
  - `package.json` (nouvelles deps)
  - `src/components/features/admin/article-form.tsx` (remplacement textarea → TipTap)
  - `src/components/features/admin/article-form.test.tsx` (adaptation tests)
- **Nouveaux fichiers** :
  - `src/components/features/admin/rich-text-editor.tsx` (composant TipTap)
- **Fichiers inchangés** : `ArticleContent.tsx`, API routes, Prisma schema, pages admin

## Test Strategy

1. `npm install` — vérifier que les deps s'installent sans conflit
2. `npm run build` — build Next.js doit passer
3. `npx vitest run` — tous les tests doivent passer
4. Test manuel : créer un article avec tous les formats (H1-H4, bold, italic, listes, citation, lien, code, séparateur, image) → sauver → rouvrir en édition → vérifier la cohérence
5. Test de compatibilité : ouvrir un article existant (contenu markdown legacy) → vérifier le chargement correct

## Dev Agent Record

### Implementation Notes
*(To be filled by DS agent)*

### File List
*(To be filled by DS agent)*

### Review Findings
*(To be filled by CR agent)*