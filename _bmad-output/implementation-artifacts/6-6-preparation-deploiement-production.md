---
Story: "6.6"
StoryKey: "6-6-preparation-deploiement-production"
Title: "Préparation Déploiement Production"
Status: "ready-for-dev"
Priority: "P0"
Epic: "Epic 6 — Administration et Back-office"
FRs: []
NFRs: ["NFR-D1", "NFR-D2", "NFR-D3", "NFR-D4", "NFR-D5", "NFR-D6", "NFR-SC3"]
Created: "2026-05-22"
---

# Story 6.6: Préparation Déploiement Production

Status: ready-for-dev

<!-- Note: Ultimate context engine analysis completed - comprehensive developer guide created. Story brownfield/delta: une partie du socle déploiement existe déjà depuis Story 1.7 (`output: "standalone"`, `ecosystem.config.js`, `scripts/prepare-deploy.sh`, `npm run prepare-deploy`). Cette story doit finaliser/adapter pour la production Infomaniak, Nginx/Certbot et PostgreSQL; ne pas réinventer ce qui fonctionne déjà. -->

## Story

En tant qu'administrateur technique,
je veux préparer l'application pour le déploiement sur VPS Infomaniak,
afin de garantir la stabilité et la scalabilité en production.

## Acceptance Criteria

1. **Build Next.js standalone vérifié et non régressif**
   - Given le projet Next.js,
   - When `npm run build` est exécuté,
   - Then le build génère `.next/standalone/server.js` grâce à `output: 'standalone'` dans `next.config.ts`.
   - And les headers de sécurité existants dans `next.config.ts` sont conservés.
   - And aucune dépendance ou configuration inutile ne casse les routes App Router, Auth.js, Prisma ou les assets statiques. (NFR-D1)

2. **Configuration PM2 conforme au contrat production**
   - Given `ecosystem.config.js`,
   - When le fichier est lu depuis le paquet de déploiement,
   - Then il définit strictement l'application `ibc-app`, le script attendu pour le runtime standalone (`server.js` dans le contexte du paquet final ou chemin équivalent documenté), le mode cluster, `instances: "max"`, `autorestart: true`, et `max_memory_restart: "500M"`.
   - And `PORT=3000`, `HOSTNAME=0.0.0.0`, `NODE_ENV=production`, logs PM2, et rotation/commande `pm2-logrotate` sont documentés ou configurés.
   - And l'écart actuel `max_memory_restart: "512M"` doit être ramené à `500M` ou explicitement justifié par un test/revue; l'AC source exige 500M. (NFR-D2, NFR-D6)

3. **Script `prepare-deploy.sh` idempotent et paquet `deploy-dist/` complet**
   - Given `.next/standalone/` existe après build,
   - When `bash scripts/prepare-deploy.sh` ou `npm run prepare-deploy` est exécuté,
   - Then `deploy-dist/` est recréé proprement et contient au minimum `.next/standalone/`, `.next/static/`, `public/`, et `ecosystem.config.js`.
   - And la structure finale permet de démarrer le serveur standalone avec PM2 sans chemins cassés pour `.next/static` et `public`.
   - And `.env.example` et un répertoire `logs/` peuvent être inclus comme aides, mais aucun secret réel (`.env`, `.env.local`) ni fichier DB SQLite (`*.db`, `*.sqlite`, `*.sqlite3`) n'est copié. (NFR-D5)

4. **Nginx reverse proxy et cache statique prêts pour Infomaniak**
   - Given le serveur Nginx sur VPS Ubuntu 24.04,
   - When la configuration production est installée,
   - Then les assets Next statiques sous `/_next/static/` sont servis depuis le répertoire correspondant du déploiement avec `Cache-Control` immuable et cache 365 jours.
   - And tout le reste est proxifié vers `http://127.0.0.1:3000` avec headers proxy requis (`Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`) et support WebSocket/HTTP upgrade si nécessaire.
   - And la configuration Nginx n'expose pas `.env`, fichiers SQLite, dossiers internes Prisma, ni fichiers cachés sensibles. (NFR-D3)

5. **SSL Let's Encrypt / Certbot opérationnel avec renouvellement automatique**
   - Given le domaine IBC pointe vers le VPS,
   - When Certbot est installé et exécuté,
   - Then HTTPS Let's Encrypt est actif pour le domaine IBC avec redirection HTTP → HTTPS et renouvellement automatique systemd/timer ou cron.
   - And une commande de validation `certbot renew --dry-run` est documentée.
   - And les headers HTTPS/HSTS déjà définis côté Next.js restent cohérents avec la terminaison TLS Nginx. (NFR-D4)

6. **Production utilise PostgreSQL via `DATABASE_URL`, plus SQLite**
   - Given l'application démarre en production,
   - When `DATABASE_URL` est fourni,
   - Then Prisma utilise PostgreSQL et non `better-sqlite3`/SQLite.
   - And `prisma/schema.prisma` utilise un provider compatible PostgreSQL pour la production, le client Prisma est configuré avec l'adapter PostgreSQL approprié si requis par Prisma 7, et les migrations sont applicables contre PostgreSQL.
   - And le code `src/lib/prisma.ts` n'instancie pas `PrismaBetterSqlite3` en production.
   - And le mode SQLite peut rester documenté uniquement pour dev/test si l'équipe le décide, mais il ne doit pas être le chemin runtime production. (NFR-SC3)

7. **Documentation et validation opérationnelle de déploiement**
   - Given un développeur/admin technique suit la documentation,
   - When il exécute le runbook de déploiement,
   - Then il peut construire, empaqueter, transférer, configurer `.env`, lancer `prisma migrate deploy`, démarrer/recharger PM2, configurer Nginx, activer SSL, et vérifier l'application sans étape implicite.
   - And les commandes de rollback minimal (`pm2 restart`, restauration release précédente, logs PM2/Nginx) sont documentées.
   - And les validations finales incluent `npm run build`, `npm run prepare-deploy`, vérification `deploy-dist`, validation Prisma/migration PostgreSQL, et contrôle syntaxe Nginx (`nginx -t`). (NFR-D1 à D6, NFR-SC3)

## Tasks / Subtasks

- [ ] **AC1: Vérifier et préserver le build standalone existant**
  - [ ] Lire `next.config.ts` avant modification; conserver `output: "standalone"` et la fonction `headers()` avec HSTS/CSP/X-Frame-Options/X-Content-Type-Options.
  - [ ] Exécuter `npm run build` et vérifier explicitement l'existence de `.next/standalone/server.js`.
  - [ ] Documenter la taille du standalone (`du -sh .next/standalone`) et investiguer seulement si elle dépasse un seuil raisonnable; éviter les refactors hors scope.

- [ ] **AC2/AC3: Aligner PM2 et le paquet `deploy-dist/`**
  - [ ] Lire `ecosystem.config.js` et `scripts/prepare-deploy.sh` complètement avant modification.
  - [ ] Corriger `max_memory_restart` de `512M` vers `500M` pour satisfaire l'AC source, sauf justification explicite acceptée dans les notes dev.
  - [ ] Clarifier le chemin PM2: soit `script: "server.js"` avec copie/placement du serveur à la racine attendue du paquet, soit `script: "./.next/standalone/server.js"` si le paquet conserve cette arborescence; dans tous les cas, documenter le `cwd` exact et tester le démarrage.
  - [ ] S'assurer que `prepare-deploy.sh` copie `.next/standalone/`, `.next/static/`, `public/`, `ecosystem.config.js`, `.env.example` (optionnel), crée `logs/`, et exclut secrets/DB binaires.
  - [ ] Vérifier que la structure des assets statiques correspond au mode standalone Next.js et à la config Nginx (`/_next/static/`).
  - [ ] Exécuter `npm run prepare-deploy` et vérifier les chemins attendus dans `deploy-dist/`.

- [ ] **AC4/AC5: Ajouter la configuration Nginx + Certbot production**
  - [ ] Créer un fichier de configuration exemple versionné, recommandé `scripts/nginx/ibc-app.conf.example` ou `deploy/nginx/ibc-app.conf`, sans domaine/chemin secret hardcodé au-delà de placeholders explicites (`example.com`, `/var/www/ibc/current`).
  - [ ] Configurer `location /_next/static/` avec `alias` ou `root` cohérent vers le dossier `.next/static`, `expires 365d`, `Cache-Control "public, max-age=31536000, immutable"`, et `try_files` sûr.
  - [ ] Configurer `location /` vers `proxy_pass http://127.0.0.1:3000` avec headers proxy standard et timeouts raisonnables.
  - [ ] Bloquer l'accès aux fichiers sensibles (`.env`, fichiers cachés, `.sqlite`, `.db`, dossiers internes si exposés par erreur).
  - [ ] Documenter installation Nginx, activation site, `nginx -t`, reload, installation Certbot, émission certificat, redirection HTTPS, et `certbot renew --dry-run`.

- [ ] **AC6: Migrer le runtime production Prisma vers PostgreSQL**
  - [ ] Auditer `prisma/schema.prisma`, `prisma.config.ts`, `src/lib/prisma.ts`, `package.json`, `.env.example`, tests et migrations existantes.
  - [ ] Remplacer le provider Prisma de production par `postgresql` conformément au PRD/architecture; si un support SQLite dev/test est conservé, le documenter sans laisser SQLite comme chemin production.
  - [ ] Ajouter la dépendance adapter PostgreSQL Prisma 7 appropriée (ex: `@prisma/adapter-pg`/driver compatible) et retirer l'usage production de `@prisma/adapter-better-sqlite3` dans `src/lib/prisma.ts`.
  - [ ] S'assurer que `DATABASE_URL` attendu en production est une URL PostgreSQL (`postgresql://` ou `postgres://`) et mettre à jour `.env.example` avec un commentaire clair, sans secret réel.
  - [ ] Vérifier/générer les migrations pour PostgreSQL. Les migrations existantes créées pour SQLite peuvent nécessiter une stratégie propre (`prisma migrate diff`, baseline ou nouvelle migration PostgreSQL) : ne pas faire de conversion superficielle non testée.
  - [ ] Exécuter `prisma validate` et une validation de migration contre une base PostgreSQL locale/temporaire ou documenter précisément le blocage si aucun PostgreSQL n'est disponible.

- [ ] **AC7: Runbook de déploiement et rollback**
  - [ ] Créer/mettre à jour `scripts/DEPLOY.md` avec étapes complètes: prérequis VPS Ubuntu 24.04, Node/npm, PM2, Nginx, Certbot, variables d'environnement, PostgreSQL, build/package/rsync, migrations, PM2, logs, health checks.
  - [ ] Inclure les commandes de vérification: `npm run build`, `npm run prepare-deploy`, `pm2 start/reload ecosystem.config.js --env production`, `pm2 status`, `pm2 logs`, `nginx -t`, `systemctl status nginx`, `certbot renew --dry-run`.
  - [ ] Inclure rollback minimal et troubleshooting: logs PM2/Nginx, problème `DATABASE_URL`, assets 404, certificat, port 3000 occupé, permissions `/var/www/ibc`.

- [ ] **Tests et validation finale**
  - [ ] `npm run build` passe.
  - [ ] `.next/standalone/server.js` existe.
  - [ ] `npm run prepare-deploy` passe et produit `deploy-dist/` complet.
  - [ ] `test -f deploy-dist/.next/standalone/server.js`, `test -d deploy-dist/.next/static`, `test -d deploy-dist/public`, `test -f deploy-dist/ecosystem.config.js` passent.
  - [ ] Démarrage standalone/PM2 testé localement si possible avec variables minimales non secrètes; sinon documenter la limite.
  - [ ] `./node_modules/.bin/prisma validate` passe.
  - [ ] Validation PostgreSQL/migration réalisée ou blocage technique explicite documenté.
  - [ ] La config Nginx exemple passe une revue syntaxique/documentaire; si test local possible, `nginx -t` avec chemins temporaires.
  - [ ] `git status` vérifié: aucun `.env`, `.env.local`, `dev.db`, `*.sqlite`, `*.sqlite3`, `deploy-dist/` ou log runtime ne doit être committé.

## Dev Notes

### Delta scope — état actuel vérifié dans le codebase

- `next.config.ts` existe déjà avec `output: "standalone"` et des headers de sécurité. **Ne pas supprimer** la configuration `headers()` existante; elle porte HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy et Permissions-Policy.
- `ecosystem.config.js` existe déjà. État actuel vérifié: `name: "ibc-app"`, `script: "./.next/standalone/server.js"`, `instances: "max"`, `exec_mode: "cluster"`, `autorestart: true`, `max_memory_restart: "512M"`, `PORT: 3000`, `HOSTNAME: "0.0.0.0"`, logs sous `./logs/`. L'AC source demande `script server.js` et mémoire 500M: traiter cet écart explicitement.
- `scripts/prepare-deploy.sh` existe déjà. Il vérifie `.next/standalone`, recrée `deploy-dist/`, copie `.next/standalone`, `.next/static`, `public`, `ecosystem.config.js`, `.env.example`, crée `logs/`, et affiche un résumé.
- `package.json` expose déjà `"prepare-deploy": "npm run build && bash scripts/prepare-deploy.sh"`.
- Aucun fichier Nginx/Certbot versionné n'a été trouvé dans le dépôt. Story 6.6 doit ajouter un exemple/runbook de production.
- `prisma/schema.prisma` utilise actuellement `datasource db { provider = "sqlite" }`.
- `src/lib/prisma.ts` instancie actuellement `PrismaBetterSqlite3` depuis `@prisma/adapter-better-sqlite3`, y compris si `DATABASE_URL` n'est pas une URL `file:`. Ce n'est pas conforme à NFR-SC3 pour la production PostgreSQL.
- `.env.example` contient `DATABASE_URL=` sans préciser PostgreSQL; ajouter un commentaire clair pour prod.

### Story foundation from Epic 6 / PRD

Epic 6 vise un back-office admin complet et la préparation du déploiement production. Story 6.6 est la dernière story de l'epic et clôt les NFR de déploiement: standalone Next.js, PM2 cluster, Nginx cache statique/reverse proxy, Certbot SSL, scripts automatisés, logs PM2, et PostgreSQL en production.

### Architecture / deployment guardrails

- Hosting cible: VPS Cloud Infomaniak, Ubuntu 24.04.
- Runtime cible: Next.js 16 standalone derrière Nginx, process PM2 cluster.
- Base production: PostgreSQL managé (Supabase/Railway dans l'architecture MVP) ou PostgreSQL accessible via `DATABASE_URL`.
- Déploiement attendu: `npm run build` → `.next/standalone/`; `prepare-deploy.sh` → paquet; `rsync` vers VPS; `prisma migrate deploy`; `pm2 restart/reload ibc-app`; Nginx reverse proxy; Certbot SSL.
- Tous les accès DB applicatifs doivent passer par `src/lib/prisma.ts`. Ne pas introduire d'accès SQL applicatif ad hoc; raw SQL seulement dans migrations si nécessaire.
- Ne jamais committer secrets/env réels. `.env.example` uniquement.

### Nginx reference shape

Utiliser des placeholders et adapter le chemin réel du release:

```nginx
server {
  listen 80;
  server_name example.com www.example.com;

  location /_next/static/ {
    alias /var/www/ibc/current/.next/static/;
    expires 365d;
    add_header Cache-Control "public, max-age=31536000, immutable";
    try_files $uri =404;
  }

  location ~ /(?:\.env|.*\.sqlite3?|.*\.db)$ {
    deny all;
    return 404;
  }

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Certbot peut ensuite gérer la redirection HTTPS et les blocs TLS via `certbot --nginx -d example.com -d www.example.com`, puis `certbot renew --dry-run`.

### PostgreSQL migration caution

Cette story n'est pas seulement une modification de documentation: l'AC6 exige que la production n'utilise plus SQLite. Avec Prisma 7 et adapter pattern, vérifier les APIs exactes avant de changer `src/lib/prisma.ts`. Une solution superficielle qui laisse `PrismaBetterSqlite3` actif en production ne satisfait pas l'AC.

Points d'attention:

- Adapter PostgreSQL/driver à ajouter dans `package.json` et lockfile.
- `prisma/schema.prisma` provider `postgresql` pour production.
- Migrations existantes SQLite: vérifier leur compatibilité PostgreSQL; si elles contiennent du SQL SQLite-specific, créer une stratégie propre de baseline/migrations PostgreSQL.
- Tests existants peuvent dépendre de SQLite. Si un double mode dev/test est nécessaire, l'isoler clairement sans affaiblir la production.
- `DATABASE_URL` production doit être une URL PostgreSQL et être définie dans l'environnement PM2/VPS.

### Previous Story Intelligence

From Story 6.5:

- Les patches de review ont renforcé l'obligation de ne pas mentir sur la complétude: les effets de bord critiques doivent être réellement vérifiés, pas seulement documentés.
- Les sessions Auth.js utilisent JWT; ne pas supposer que la présence de modèles `Session` en DB suffit à refléter le runtime. Pour cette story, appliquer la même rigueur aux validations: prouver le chemin runtime réel PM2/Nginx/PostgreSQL.
- Les actions admin et logs évitent les données sensibles. Pour le déploiement, appliquer le même principe: aucun secret `.env`, token, cookie, URL signée ou DB binaire dans `deploy-dist` versionné ou dans les logs committés.
- `npm run lint` peut avoir des problèmes préexistants hors scope; documenter séparément tout échec non lié et corriger ce qui est introduit par cette story.

From Story 1.7:

- Le socle standalone/PM2/script existe déjà et ne doit pas être dupliqué.
- Next standalone n'inclut pas automatiquement `public/` et `.next/static/`; la copie séparée est obligatoire.
- Le serveur standalone lit `HOSTNAME` et `PORT`.
- Les headers de sécurité dans `next.config.ts` viennent d'une correction précédente et doivent être préservés.
- Nginx/Certbot et PostgreSQL étaient explicitement hors scope de Story 1.7; ils sont maintenant dans le scope de Story 6.6.

### Git Intelligence Summary

Recent commits before story creation:

- `174e319 chore(bmad): mark story 6-4 done`
- `c0a0286 chore(bmad): mark story 6-5 done — CR patches applied, status updated`
- `09b5f0f fix(admin): CR patches — audit log before email + suspended admin guard`
- `c92ea37 feat(admin): implement user management and confirmation emails`
- `35c09c0 docs(bmad): create story 6-5 user management`

Pattern à suivre: story context commit séparé, implémentation commit ensuite, status/review après validation. Garder les changements story 6.6 centrés sur déploiement, infrastructure et DB production.

### Latest Tech Information

Vérifié localement depuis `package.json` et les artefacts le 2026-05-22:

- Next.js `16.2.6`, React `19.2.4`.
- Prisma `^7.8.0` avec générateur `prisma-client` vers `src/generated/prisma`.
- Auth.js `^5.0.0-beta.31` avec split config; ne pas refactorer auth hors nécessité.
- Le projet contient encore `better-sqlite3` et `@prisma/adapter-better-sqlite3`; ils sont acceptables uniquement pour dev/test si conservés, pas pour production.
- PM2/Nginx/Certbot sont des dépendances système/VPS, pas des dépendances npm applicatives.

### Project Structure Notes

Fichiers probablement à modifier/créer:

- `next.config.ts` — lecture/validation; modification seulement si nécessaire, préserver headers.
- `ecosystem.config.js` — aligner mémoire 500M et chemin script/cwd documenté.
- `scripts/prepare-deploy.sh` — vérifier/corriger le packaging et exclusions de secrets.
- `scripts/DEPLOY.md` — runbook production complet.
- `scripts/nginx/ibc-app.conf.example` ou `deploy/nginx/ibc-app.conf` — exemple Nginx.
- `prisma/schema.prisma` — provider production PostgreSQL.
- `prisma.config.ts` — vérifier `DATABASE_URL` et workflow migrate deploy.
- `src/lib/prisma.ts` — adapter PostgreSQL production; plus de `PrismaBetterSqlite3` en prod.
- `package.json` / lockfile — dépendance adapter PostgreSQL si nécessaire.
- `.env.example` — préciser `DATABASE_URL` PostgreSQL production et variables runtime.
- `.gitignore` — vérifier `deploy-dist/`, `logs/`, DB SQLite et secrets.

Fichiers à éviter sauf nécessité explicite:

- `src/lib/auth.config.ts`, `src/middleware.ts`, pages admin/membre: non liés au déploiement.
- Routes API métier/opportunités/subscriptions: hors scope.
- Modèles Prisma métier non liés à la migration provider: éviter de changer les champs fonctionnels.

### Testing Requirements

Validation minimale attendue avant dev-story completion:

- `npm run build`.
- Vérification `.next/standalone/server.js`.
- `npm run prepare-deploy` puis vérification des chemins dans `deploy-dist/`.
- Démarrage local du serveur standalone/PM2 si possible avec env de test non secret.
- `./node_modules/.bin/prisma validate`.
- Validation de migration PostgreSQL (`prisma migrate deploy` contre une DB PostgreSQL de test/temporaire ou procédure équivalente documentée).
- Revue/test de la config Nginx; `nginx -t` si Nginx disponible localement ou sur VPS.
- `certbot renew --dry-run` documenté; exécuté uniquement sur environnement adéquat avec domaine pointé.
- `npx vitest run` recommandé après changements Prisma/runtime pour détecter régressions; documenter les échecs préexistants séparément.

### References

- `_bmad-output/planning-artifacts/epics.md` lignes 1013-1015: objectif Epic 6.
- `_bmad-output/planning-artifacts/epics.md` lignes 1149-1179: Story 6.6 et AC source.
- `_bmad-output/planning-artifacts/architecture.md` lignes 239-252: Infrastructure & Deployment.
- `_bmad-output/planning-artifacts/architecture.md` lignes 412-503: structure projet et fichiers de déploiement attendus.
- `_bmad-output/planning-artifacts/architecture.md` lignes 520-548: data boundary et flux `Nginx → Next.js → Prisma → PostgreSQL`.
- `_bmad-output/planning-artifacts/prd.md` lignes 360-367: NFR-D1 à NFR-D6.
- `_bmad-output/planning-artifacts/prd.md` ligne 352: NFR-SC3 PostgreSQL production.
- `_bmad-output/planning-artifacts/prd.md` lignes 379-388: stack actuelle et SQLite dev-only.
- `_bmad-output/planning-artifacts/prd.md` lignes 437-442: préparation déploiement semaine 2.
- `_bmad-output/implementation-artifacts/1-7-configuration-deploiement-standalone-et-pm2.md`: socle standalone/PM2/script et guardrails à réutiliser.
- `_bmad-output/implementation-artifacts/6-5-gestion-des-utilisateurs-et-emails-admin.md`: learnings récents, sensibilité secrets/logs et validation réelle.
- `next.config.ts`: configuration standalone + security headers actuelle.
- `ecosystem.config.js`: PM2 actuel à ajuster.
- `scripts/prepare-deploy.sh`: packaging actuel à préserver/renforcer.
- `prisma/schema.prisma`, `src/lib/prisma.ts`, `prisma.config.ts`: état SQLite actuel à migrer pour production.

## Dev Agent Record

### Agent Model Used

GPT-5.5 Codex (Hermes Agent)

### Debug Log References

### Completion Notes List

### File List
