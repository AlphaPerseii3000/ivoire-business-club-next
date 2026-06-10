# IBC — Recommandations pour une Landing Page 3D & IA d'Exception

Ce document sert de guide et de spécification technique pour concevoir une landing page immersive, moderne et interactive ("qui claque") pour l'**Ivoire Business Club (IBC)**. Il s'appuie sur des technologies 3D (comme Spline ou React Three Fiber) et sur la génération d'assets optimisés par Intelligence Artificielle (Midjourney, Spline AI, Luma AI, etc.).

---

## 1. Direction Artistique & Expérience Visuelle

Pour créer un effet "Wow" immédiat tout en respectant l'identité d'IBC, la landing page doit adopter les principes suivants :

*   **Palette de Couleurs Premium :** 
    *   Fond sombre profond (Sleek Dark Mode : `#090D16` à `#0F172A`) pour faire ressortir les éléments lumineux.
    *   Accent Principal : Teal d'IBC (`#0F766E`) avec des variantes vibrantes (`#14B8A6`).
    *   Accent Secondaire : Amber chaleureux (`#F59E0B` / `#D97706`) symbolisant la croissance et la richesse de l'Afrique.
    *   Accents Verts WhatsApp (`#25D366`) pour les actions de contact.
*   **Aesthétique Glassmorphism & Mesh Gradients :** 
    *   Fonds de cartes semi-transparents avec flou d'arrière-plan (`backdrop-blur-md bg-white/5 border border-white/10`).
    *   Gradients de fond fluides et animés en arrière-plan (glows colorés en teal et amber).
*   **3D Interactive (Spline) :** 
    *   Un modèle 3D principal interactif dans la section Hero (ex: Globe terrestre stylisé mettant en valeur l'axe Europe-Afrique, ou une carte 3D interactive de la Côte d'Ivoire).
    *   Animations au défilement (Scroll-driven animations) pour faire pivoter ou déplacer les objets 3D à mesure que l'utilisateur descend.
*   **Micro-interactions & Typographie Moderne :**
    *   Police d'en-tête géométrique et premium (ex: *Outfit* ou *Clash Display*) et police de corps ultra-lisible (*Inter*).
    *   Transitions fluides sur les boutons (hover scale, lueur glow).

---

## 2. Guide de Création des Assets avec l'IA

Pour alimenter cette landing page avec des visuels de haute qualité sans coûts de studio, nous utiliserons des outils génératifs d'IA. Voici le guide étape par étape pour chaque type d'asset.

### A. Le Fond de Page et les Textures (Midjourney / DALL-E 3)
Nous voulons un fond de page avec un aspect technologique et professionnel, mais ancré en Afrique.

*   **Prompt Midjourney recommandé (Hero Background) :**
    > `/imagine prompt: A futuristic cybernetic city skyline of Abidjan, Ivory Coast, glowing teal and amber lights, digital network nodes connecting buildings, holographic business maps, dark night mode, cinematic lighting, 8k, photorealistic, ultra-detailed, web header background --ar 16:9 --style raw`

*   **Prompts Midjourney pour les illustrations de sections :**
    *   **Section "Réseautage & Synergie" (Networking intercontinental) :**
        > `/imagine prompt: A professional African businessman and a European woman investor shaking hands in a high-tech modern office overlooking Abidjan, double exposure with abstract digital network lines, teal and gold color palette, corporate premium design, 3d render style, clean studio light --ar 4:3`
    *   **Section "Investissement & Deals" (Opportunités de croissance) :**
        > `/imagine prompt: A clean 3D render of a futuristic holographic map of West Africa, showing glowing connections, rising golden 3D charts, glowing teal nodes, premium glassmorphism base, dark UI design style, cinematic studio lighting, high-tech finance concept --ar 4:3 --v 6.0`
    *   **Section "Mentorat & Accompagnement" (Partage d'expérience) :**
        > `/imagine prompt: A business mentor guiding a young entrepreneur in a sleek co-working space in Abidjan, looking at a transparent digital screen showing growth analytics, warm amber and cool teal ambient lighting, professional, realistic, cinematic corporate photography --ar 4:3`
    *   **Section "Club d'Affaires & Prestige" (Exclusivité) :**
        > `/imagine prompt: A luxury modern business lounge with elegant glass furniture, premium dark navy walls, subtle gold accents, large window overlooking the glowing skyline of Cocody Abidjan at night, sophisticated atmosphere, minimal architectural render style --ar 4:3`

### B. Les Avatars de Témoignages et Portraits Professionnels (Mur des Succès)
Pour le mur des succès et les profils de membres, il nous faut des portraits professionnels réalistes, diversifiés et engageants de membres de la diaspora et d'entrepreneurs locaux.

*   **Prompt Midjourney de base (Standard) :**
    > `/imagine prompt: Corporate headshot of an African entrepreneur in their 30s, smiling, confident, blurred modern office background, soft professional lighting, highly detailed skin texture, captured on 85mm lens, corporate directory style --ar 1:1`

*   **Prompts Midjourney pour des profils spécifiques :**
    *   **Profil 1 : Jeune entrepreneure Tech (Diaspora Europe) :**
        > `/imagine prompt: Close up corporate portrait of a confident West African woman in her late 20s, wearing modern business casual attire, natural hair, warm smile, blurred chic Parisian office background with soft daylight, professional photography, high-end commercial aesthetic, 85mm lens --ar 1:1 --style raw`
    *   **Profil 2 : Investisseur Senior / Business Angel :**
        > `/imagine prompt: Professional headshot of an elegant African businessman in his 50s, wearing a tailored navy suit with a subtle gold lapel pin, confident and experienced expression, modern glass boardroom background with soft teal reflection, corporate portrait photography, Hasselblad --ar 1:1`
    *   **Profil 3 : Entrepreneur local (Côte d'Ivoire) :**
        > `/imagine prompt: Headshot of an energetic African male entrepreneur in his mid 30s, smiling warmly, wearing a smart casual blazer, modern sunny Abidjan office balcony background, natural bright golden hour lighting, photorealistic, depth of field --ar 1:1`
    *   **Profil 4 : Cadre Financière / Experte en Investissement :**
        > `/imagine prompt: Studio portrait of a professional African-European woman in her 40s, smart glasses, confident smile, clean corporate dark background with subtle amber glow, high-end business directory style, soft studio lighting, sharp focus --ar 1:1`

---

## 3. Guide de Création et d'Intégration de la 3D (Spline)

Pour la 3D, nous recommandons **Spline** car il permet de concevoir des scènes 3D interactives légères, gérant le responsive et les événements de souris sans coder en Three.js.

### Concept 3D proposé : "L'Axe Europe-Afrique Connecté"
Une scène 3D contenant un globe terrestre stylisé en verre foncé avec des lignes lumineuses (teal/amber) reliant Paris/Bruxelles à Abidjan. Au passage de la souris, le globe tourne légèrement. Sur mobile, il se recentre et se réduit automatiquement.

### Étape 1 : Création dans Spline
1.  Créez un compte gratuit sur [Spline.design](https://spline.design/).
2.  Dans la bibliothèque de Spline, recherchez un modèle de **Globe** ou importez une carte 3D de la Côte d'Ivoire au format `.gltf` / `.obj`.
3.  Appliquez des matériaux "Glassmorphism" :
    *   Matériau de base : Couleur sombre, transmission élevée (transparence), rugosité faible.
    *   Lumières : Ajoutez une lumière directionnelle teal d'un côté et une lumière ponctuelle amber de l'autre pour créer le reflet premium.
4.  Configurez les interactions :
    *   **State / Hover :** Rotation lente au survol de la souris.
    *   **Scroll Animate :** Associez la rotation sur l'axe Y au défilement de la page Web.

### Étape 2 : Exportation & Intégration Next.js
Une fois la scène prête dans Spline, cliquez sur **Export** > **Viewer** et copiez l'URL publique de la scène (ex: `https://prod.spline.design/.../scene.splinecode`).

Pour l'intégrer proprement dans Next.js sans bloquer le chargement initial (LCP < 2s) :
1.  Utilisez le chargement différé (Dynamic Imports) pour ne charger le composant 3D qu'après le premier rendu de la page.
2.  Affichez un **Skeleton Loader** (image 2D optimisée de la scène 3D) en attendant que la scène soit chargée.

```tsx
// Exemple de composant Next.js 16 (React Server Component safe)
import dynamic from 'next/dynamic';

const SplineViewer = dynamic(() => import('@/components/ui/SplineScene'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-slate-900 rounded-lg w-full h-[500px]" />
});
```

---

## 4. Plan d'Action pas-à-pas pour la Fourniture des Assets

Pour réussir le déploiement de la landing page, voici comment nous allons procéder pour collecter et optimiser les assets :

| Étape | Asset | Action Utilisateur (Jonathan) / Agent | Format Attendu |
| :--- | :--- | :--- | :--- |
| **Step 1** | **Images de fond & Avatars** | 1. Générer sur Midjourney/DALL-E.<br>2. Compresser via Tinypng/WebP.<br>3. Placer dans `public/assets/images/`. | `.webp` (max 150kb pour le hero, 20kb pour les avatars) |
| **Step 2** | **Scène 3D Spline** | 1. Créer la scène sur Spline.<br>2. Exporter et fournir le lien `.splinecode`.<br>3. Configurer l'intégration dynamique dans le code. | URL `spline.design` |
| **Step 3** | **Textes & Copie** | Adapter le contenu textuel fourni dans `NEW landing page.md`. | Markdown |
| **Step 4** | **SEO & Metadatas** | Définir les meta tags (title, description) et open graph dans Next.js `layout.tsx` ou `page.tsx`. | JSON/Typescript |

---

## 5. Performance (NFR-P1) & Accessibilité (NFR-A1)

Pour que le site "claque" aussi en termes de performances (LCP < 2s sur 3G) :
1.  **Format WebP/AVIF obligatoire** pour toutes les images.
2.  **Lazy loading** activé sur les images situées sous la ligne de flottaison.
3.  **3D désactivée sur les connexions lentes** ou remplacée par une image statique sur mobile si les performances chutent.
4.  **Aria-labels** sur le visualiseur 3D pour que les lecteurs d'écran comprennent l'intention de la page sans bloquer dessus.
