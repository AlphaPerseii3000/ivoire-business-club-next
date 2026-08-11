# Audit SEO IBC — Diagnostic de non-indexation

## Contexte
Le site IBC (Next.js App Router) n'est pas indexé par Google malgré les efforts SEO précédents.

## Constats techniques

### 1. robots.txt (src/app/robots.ts)
- Règle `Allow: /` pour tous les user agents
- Sitemap référencé : `https://www.ivoirebusinessclub.com/sitemap.xml`
- **Problème potentiel** : le domaine canonique est `www.ivoirebusinessclub.com` mais le site est peut-être servi sur `ivoirebusinessclub.com` sans www → risque de contenu dupliqué ou de redirections mal configurées.

### 2. Sitemap (src/app/sitemap.ts)
- Génère les URLs statiques + articles + événements
- Utilise `siteUrl` — vérifier que cette constante pointe vers le bon domaine (www ou non-www)

### 3. Middleware
- `src/middleware.ts` exclut déjà `robots.txt` et `sitemap.xml` de l'authentification — bon signe.

### 4. Problèmes potentiels identifiés
1. **Pas de `robots.txt` visible dans les logs** — les requêtes 404 pour `/robots.txt` dans les logs suggèrent que le fichier n'est peut-être pas servi correctement en production.
2. **Sitemap** — vérifier que `sitemap.xml` est accessible publiquement.
3. **Canonical URLs** — vérifier que les URLs canoniques pointent vers `https://www.ivoire-business.com` (ou le domaine principal) et non vers des doublons.
4. **Google Search Console** — vérifier que le site est soumis et que le sitemap est soumis.

Laisse-moi vérifier les fichiers clés du projet IBC pour comprendre l'état actuel du SEO.

<｜DSML｜tool_calls>
<｜DSML｜invoke name="search_files">
<｜DSML｜parameter name="path" string="true">/home/alphaperseii/projects/ibc/src/app