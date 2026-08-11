---
baseline_commit: ""
---

# Story 30-1: Canonicalisation www / non-www — alignement sur non-www

## Status: ready-for-dev

## Source

Audit SEO live + Google Search Console (2026-08-10). Découvert lors de l'investigation d'indexation Google demandée par le PO. Le conflit de canonicalisation a été confirmé par test HTTP direct et par les données GSC (voir `audit-seo.md` dans la racine du projet).

## Contexte

Le site est servi en **non-www** en production : `https://ivoire-business-club.com` renvoie 200, et `https://www.ivoire-business-club.com` redirige en 301 vers le non-www. Pourtant, la constante centrale `SITE_URL` dans `src/lib/site-config.ts` a pour **défaut** `https://www.ivoire-business-club.com` (avec www).

Toutes les surfaces SEO dépendent de cette constante unique :
- `src/app/layout.tsx` → `metadataBase: new URL(SITE_URL)` + `alternates.canonical: '/'`
- `src/app/sitemap.ts` → URLs du sitemap basées sur `SITE_URL`
- `src/app/robots.ts` → URL du sitemap dans robots.txt basée sur `SITE_URL`

Conséquence : chaque page déclare un `<link rel="canonical">` pointant vers `https://www.ivoire-business-club.com/...`, mais cette URL fait un 301 vers le non-www. Google indexe donc les **deux** versions (confirmé par GSC : `www.../` a 24 impressions, `ivoire-business-club.com/` a 599 impressions sur 30 jours), ce qui **dilue les signaux de ranking** et scinde le trafic.

Le choix canonique est déjà fait par Google et par la prod : **non-www**. Il faut aligner le code.

## Correction proposée

Changer le **défaut** de `SITE_URL` dans `src/lib/site-config.ts` de `https://www.ivoire-business-club.com` vers `https://ivoire-business-club.com` (non-www).

En production, `NEXT_PUBLIC_SITE_URL` et `NEXT_PUBLIC_APP_URL` ne sont pas définis dans `.env`/`.env.local`, donc le défaut s'applique actuellement (avec www). Après le changement, le défaut (et donc la prod) pointera vers non-www, aligné avec la redirection serveur et le canonical Google.

Aucune autre modification n'est nécessaire : toutes les surfaces lisent `SITE_URL`, donc une seule source à corriger.

## Acceptance Criteria

### AC1 — `SITE_URL` défaut = non-www

- Le défaut de `SITE_URL` dans `src/lib/site-config.ts` est `https://ivoire-business-club.com` (non-www)
- L'ordre de résolution reste inchangé : `NEXT_PUBLIC_SITE_URL` → `NEXT_PUBLIC_APP_URL` → défaut

### AC2 — Aucune autre source www dans les surfaces SEO

- `src/app/layout.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts` ne contiennent plus de référence dure `www.ivoire-business-club.com` — elles lisent toutes `SITE_URL`
- Pas de hardcode `www` ailleurs dans les fichiers touchés

### AC3 — Build et tests passent

- `npm run build` passe sans erreur
- `npx vitest run` passe sans régression
- Aucun fichier hors `src/lib/site-config.ts` modifié (sauf si un test de config existe et doit être mis à jour)

### AC4 — Vérification en production post-déploiement

- `curl -s https://ivoire-business-club.com/ | grep canonical` renvoie `https://ivoire-business-club.com/` (non-www)
- `curl -s https://ivoire-business-club.com/sitemap.xml | grep ivoire-business-club.com` ne contient que des URLs non-www
- Après redéploiement, resoumettre le sitemap dans GSC et requérir la ré-indexation de la homepage

## Notes de vérification

- En local, le `.env` définit `APP_URL=http://localhost:3000` mais cela n'affecte pas `SITE_URL` (qui lit `NEXT_PUBLIC_SITE_URL`/`NEXT_PUBLIC_APP_URL`, pas `APP_URL`). Le test unitaire de `site-config.ts` (si existant) peut vérifier le nouveau défaut.
- Le changement est minimal (1 ligne de défaut). Il est **critique** de ne pas modifier la redirection www→non-www existante ni le comportement serveur.

## Dev Agent Record

- **Date de découverte** : 2026-08-10
- **Diagnostic** : conflit canonical www vs non-www (canonical déclaré = www, redirection serveur = non-www)
- **Preuve GSC** : `www.../` 24 impressions vs `ivoire-business-club.com/` 599 impressions sur 30 jours → double indexation
- **Preuve HTTP** : `www.../` → 301 → non-www, mais HTML sert canonical www
