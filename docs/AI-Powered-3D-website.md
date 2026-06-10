# IBC — Guide de Conception Web 3D & Animations d'Exception (Higgsfield & React Bits)

Ce document sert de spécification technique et de guide de production pour concevoir des sites web immersifs et interactifs haut de gamme. La philosophie centrale est la vitesse d'exécution, l'exploitation de structures existantes et l'utilisation de vidéos 3D ultra-réalistes générées par IA combinées avec des animations d'interface avancées (React Bits), éliminant ainsi le besoin d'intégrer des moteurs 3D lourds ou complexes comme Spline ou Three.js.

---

## La Stack Technique & Les Outils de Design

*   **Inspiration & Direction :** Pinterest (références de style 3D/Avatars), [Land-book](https://land-book.com) (architecture de mise en page et structures épurées), [Motionsites.ai](https://motionsites.ai) (prompts de base).
*   **Génération & Animation d'Actifs :** Higgsfield AI (modèle *Nano Banana 2* pour les images fixes 4K, *Seedance 2.0* pour les animations vidéo en boucle fluide).
*   **Animations d'Interface & Typographie :** [React Bits](https://reactbits.dev) (intégration de micro-interactions interactives, texte dynamique et effets de survol).
*   **Développement :** React, Tailwind CSS, Vite / Next.js.

---

## Phase 1 : Génération des Actifs 3D Personnalisés (Higgsfield AI)

Les clients premium attendent des visuels sur mesure. L'utilisation d'illustrations génériques libres de droits est à proscrire au profit d'actifs 3D abstraits et de personnages uniques.

1.  **Trouver la Référence Visuelle :** Recherchez sur Pinterest des rendus 3D (ex: formes géométriques brillantes, avatars stylisés pour la FinTech ou le SaaS) et effectuez une capture d'écran pour servir d'image de référence (Image-to-Image).
2.  **Générer l'Arrière-Plan Abstrait (Nano Banana 2 - Qualité 4K) :**
    *   Téléversez l'image de référence sur Higgsfield AI.
    *   *Prompt :* `"Create a background just like this it should have abstract since this is a background for my desktop wallpaper."` (Crée un arrière-plan exactement comme celui-ci, il doit être abstrait car c'est un arrière-plan pour mon fond d'écran de bureau).
3.  **Générer le Personnage Principal :**
    *   Utilisez la même référence visuelle pour conserver la cohérence chromatique et matérielle.
    *   *Prompt :* `"Create me a character like this, expand so their full height is visible."` (Crée-moi un personnage comme celui-ci, élargis pour que toute sa hauteur soit visible).
4.  **Combiner les Éléments (Higgsfield Image Combiner - Ratio 16:9) :**
    *   Sélectionnez l'arrière-plan abstrait et le personnage générés précédemment.
    *   *Prompt :* `"Combine these two images into one image and the character should be in the middle some smaller size."` (Combine ces deux images en une seule et le personnage doit être au milieu avec une taille légèrement réduite).

---

## Phase 2 : Animation Temporelle & Boucles 3D (Seedance 2.0)

Les animations fluides et infinies justifient le positionnement haut de gamme du produit. Nous utilisons le modèle *Seedance 2.0* pour sa capacité à générer des boucles parfaites sans saccades.

1.  **Créer la Boucle d'Arrière-Plan (Hero Loop) :**
    *   Téléversez l'image combinée ou le fond d'écran abstrait dans l'onglet Vidéo.
    *   Réglez la durée sur **8 secondes** et activez l'option **Looping**.
    *   *Prompt :* `"Animate this, no camera movement, no extra elements to be added, no zoom in and no zoom out, looping animation."` (Anime ceci, aucun mouvement de caméra, aucun élément supplémentaire à ajouter, pas de zoom avant ni de zoom arrière, animation en boucle).
2.  **Créer des Vidéos Déclenchées par Défilement (Scroll) :**
    *   Téléversez les images de personnages isolés.
    *   *Prompt :* `"Animate this as well."` (Anime ceci également). Seedance 2.0 ajoutera de subtils mouvements de respiration ou de flottement physique parfaits pour l'interaction.
3.  **Extraction des URL Directes :**
    *   Ouvrez la vidéo générée dans un nouvel onglet et copiez le lien brut (ex: lien Cloudfront). Stockez ces URL pour les injecter directement dans le code.

---

## Phase 3 : Structure de l'Architecture Web

Ne réinventez pas la roue. Inspirez-vous des meilleures compositions et utilisez l'IA pour générer le code structurel de base.

1.  **Générer la Section Hero :**
    *   Copiez un prompt de structure de section Hero depuis Motionsites.ai incluant le support du Dark Mode, de React et de Tailwind CSS, puis soumettez-le à votre assistant de code IA (ex: Google AI Studio).
2.  **Construire le Reste de la Page (Land-book Inspiration) :**
    *   Prenez une capture d'écran d'une mise en page épurée (4 à 5 sections) sur Land-book.com.
    *   Téléversez-la dans votre assistant de code.
    *   *Prompt :* `"Build the rest of the website around 4 to 5 sections. They should have a layout similar to this screenshot. Do not copy the exact layout, just use it as an inspiration of how you can position elements on the page. Keep the same dark mode styles established in the hero section."` (Construis le reste du site web autour de 4 à 5 sections. Elles doivent avoir une mise en page similaire à cette capture d'écran. Ne copie pas la mise en page exacte, utilise-la juste comme inspiration pour positionner les éléments. Garde les mêmes styles de mode sombre établis dans la section hero).

---

## Phase 4 : L'Intégration & "La Touche à 10 000 €"

Cette étape mélange l'intégration vidéo avancée et les bibliothèques d'animations créatives pour obtenir un rendu ultra-premium.

### 1. Fusion Parfaite des Vidéos (Gradients de Transparence)
Pour éviter l'effet "bloc vidéo rectangulaire", appliquez des calques de transition noirs vers transparents en haut et en bas de la vidéo pour la fondre parfaitement dans le fond sombre du site.

*   *Prompt IA :* `"Add a black to transparency overlay from the top of the video... Also add that same transparency effect from the bottom of the video so it goes from black to fully transparent."`

```html
<!-- Exemple de structure de fusion vidéo avec Tailwind CSS -->
<div className="relative overflow-hidden w-full h-[600px] bg-black">
  <!-- Gradient du haut -->
  <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black to-transparent z-10 pointer-events-none" />
  
  <video src="URL_CLOUDFRONT_DIRECT" autoPlay loop muted playsInline className="w-full h-full object-cover opacity-80" />
  
  <!-- Gradient du bas -->
  <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black to-transparent z-10 pointer-events-none" />
</div>
```

### 2. Animation Liée au Défilement (Scroll-Tied & Performance)
Au lieu de lire la vidéo normalement, synchronisez son avancement avec le scroll de la souris. Utilisez `requestAnimationFrame` pour optimiser le rendu et éviter les saccades ou les rafraîchissements excessifs (repaints/reflows).

*   *Prompt IA :* `"Instead of playing this video in the fourth section, let's have it tied to scroll so it only plays when someone scrolls the page. If the video is seeking, tell the browser: 'Update the video frame ONLY when you have completely finished drawing the previous one' using requestAnimationFrame."`

```tsx
// Composant React de contrôle vidéo lié au défilement
import { useEffect, useRef } from 'react';

export function ScrollVideoPlayer({ videoUrl }: { videoUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    let targetTime = 0;
    let currentTime = 0;
    let animationFrameId: number;

    const handleScroll = () => {
      const rect = container.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      // Calcule le progrès du scroll dans la zone du conteneur
      if (rect.top < viewportHeight && rect.bottom > 0) {
        const progress = Math.max(0, Math.min(1, (viewportHeight - rect.top) / (rect.height + viewportHeight)));
        if (video.duration) {
          targetTime = progress * video.duration;
        }
      }
    };

    const updateVideoFrame = () => {
      if (video.readyState >= 2 && video.duration) {
        // Interpolation pour lisser la transition entre les frames
        currentTime += (targetTime - currentTime) * 0.15;
        
        // Empêche la mise à jour si la différence est imperceptible (optimisation des repaints)
        if (Math.abs(currentTime - video.currentTime) > 0.01) {
          video.currentTime = currentTime;
        }
      }
      animationFrameId = requestAnimationFrame(updateVideoFrame);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    animationFrameId = requestAnimationFrame(updateVideoFrame);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-[180vh] bg-black">
      <div className="sticky top-0 w-full h-screen overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-b from-black via-transparent to-black" />
        <video
          ref={videoRef}
          src={videoUrl}
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover opacity-75"
        />
      </div>
    </div>
  );
}
```

### 3. Cartes de Fonctionnalités en Parallaxe Vidéo (Multi-Card Offset)
Pour dynamiser une grille de fonctionnalités sans alourdir la page, étirez une seule vidéo verticale abstraite en arrière-plan de plusieurs cartes, en appliquant un alignement décalé pour chaque carte.

*   *Prompt IA :* `"For this section, let's have this video as a background of each card. The first card should have the video aligned to the top, the second card aligned to the center, and the third card aligned to the bottom."`

```html
<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
  <!-- Carte 1 : Alignement en haut (object-top) -->
  <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-md h-96">
    <video src="URL_VIDEO_ABSTRAITE_VERTICALE" muted loop autoPlay className="absolute inset-0 w-full h-full object-cover object-top opacity-20 pointer-events-none" />
    <div className="relative z-10 p-6">...Contenu...</div>
  </div>

  <!-- Carte 2 : Alignement au centre (object-center) -->
  <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-md h-96">
    <video src="URL_VIDEO_ABSTRAITE_VERTICALE" muted loop autoPlay className="absolute inset-0 w-full h-full object-cover object-center opacity-20 pointer-events-none" />
    <div className="relative z-10 p-6">...Contenu...</div>
  </div>

  <!-- Carte 3 : Alignement en bas (object-bottom) -->
  <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-md h-96">
    <video src="URL_VIDEO_ABSTRAITE_VERTICALE" muted loop autoPlay className="absolute inset-0 w-full h-full object-cover object-bottom opacity-20 pointer-events-none" />
    <div className="relative z-10 p-6">...Contenu...</div>
  </div>
</div>
```

### 4. Animations Typographiques & UI Ultra Stylisées (React Bits)
Intégrez les composants de **React Bits** pour ajouter des effets cinétiques saisissants sans polluer le bundle avec du code custom complexe.

*   **Entrées de Titres Hero (`SplitText` ou `BlurText`) :** Animez l'apparition des lettres ou des mots avec un flou progressif ou une trajectoire physique au chargement de la page.
*   **Boutons Interactifs & CTAs (`ShinyText`) :** Utilisez des effets de reflets métalliques animés lors du passage de la souris pour souligner les actions importantes.
*   **Conteneurs & Bento Grids (`SpotlightCard` ou `TiltCard`) :** Ajoutez un faisceau lumineux qui suit le curseur de l'utilisateur ou une inclinaison 3D subtile sur les cartes de tarification ou de fonctionnalités.
*   **Effet de Curseur Interactif (`SplashCursor`) :** Un tracé de fluide réactif aux mouvements de la souris pour habiller l'arrière-plan du site entier.

### 5. Nettoyage Final de l'Interface Utilisateur
*   **Supprimer les bordures brutes :** Remplacez les bordures pleines par des séparateurs subtils en gradients transparents ou des ombres portées douces (`box-shadow`).
*   **Superpositions et Offsets :** Utilisez des marges négatives (ex: `mt-[-200px]`) sur les sections de texte pour chevaucher légèrement les arrière-plans vidéo et créer de la profondeur visuelle.
*   **Iconographie Premium :** Intégrez des icônes vectorielles animées ou des librairies modernes comme Google Material Icons ou Lucide React pour remplacer le texte brut par des visuels clairs.

---

## Phase 5 : Enregistrement de Démo & Vente du Site

Une fois le site assemblé et optimisé, l'étape commerciale garantit la visibilité de l'œuvre auprès des décideurs.

1.  **Enregistrement Haute Résolution :** Réalisez un enregistrement d'écran fluide (60 FPS) mettant en scène le scroll interactif (Scrolltelling), les effets de parallaxe vidéo et les cartes interactives React Bits.
2.  **Marketing Social Stratégique :** Publiez la vidéo de démonstration sur **X (Twitter)** et **LinkedIn** en la présentant comme une expérience de "Web design ultra-immersif basé sur le scroll-telling".
3.  **Bénéficier de la Visibilité des Outils :** Taguez **Higgsfield AI** et **React Bits** dans vos publications. Ces plateformes repartagent activement les projets innovants qui utilisent leurs technologies, exposant votre travail à des fondateurs de startups et directeurs artistiques disposant de budgets élevés.
