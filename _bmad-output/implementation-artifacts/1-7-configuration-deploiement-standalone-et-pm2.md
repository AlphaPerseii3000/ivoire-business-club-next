# Story 1.7: Configuration Déploiement — Standalone et PM2

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a technical administrator,
I want the application to be configured for standalone deployment on VPS,
so that deployment on Infomaniak is reliable and production-ready.

## Acceptance Criteria

1. **`output: 'standalone'` in `next.config.ts`**
   - **Given** le fichier `next.config.ts`
   - **When** le build de production est exécuté (`npm run build`)
   - **Then** la sortie génère `.next/standalone/server.js` grâce à `output: 'standalone'` (NFR-D1, P0 blocker #1)

2. **`ecosystem.config.js` pour PM2 cluster**
   - **Given** le fichier `ecosystem.config.js` à la racine
   - **When** PM2 démarre l'application (`pm2 start ecosystem.config.js`)
   - **Then** l'application tourne en mode cluster avec auto-restart et logs rotatifs (NFR-D2, NFR-D6)

3. **`prepare-deploy.sh` script d'assemblage**
   - **Given** le script `prepare-deploy.sh`
   - **When** il est exécuté après un build réussi
   - **Then** il assemble le dossier `deploy-dist/` avec standalone, static assets, public, et ecosystem.config.js (NFR-D5)

## Tasks / Subtasks

- [ ] **Task 1: Ajouter `output: 'standalone'` dans `next.config.ts`** (AC: 1)
  - [ ] 1.1 Modifier `next.config.ts` pour ajouter la propriété `output: 'standalone'`
    ```typescript
    const nextConfig: NextConfig = {
      output: 'standalone',
      async headers() {
        return [
          {
            source: "/(.*)",
            headers: securityHeaders,
          },
        ];
      },
    };
    ```
  - [ ] 1.2 Vérifier que le build réussit avec `npm run build`
  - [ ] 1.3 Vérifier que `.next/standalone/server.js` est bien généré après le build
  - [ ] 1.4 Vérifier que `.next/standalone/` contient les fichiers nécessaires (package.json, server.js, etc.)

- [ ] **Task 2: Créer `ecosystem.config.js` pour PM2** (AC: 2)
  - [ ] 2.1 Créer `ecosystem.config.js` à la racine du projet avec la configuration suivante :
    ```javascript
    module.exports = {
      apps: [
        {
          name: "ibc-app",
          script: "./.next/standalone/server.js",
          cwd: "./",
          instances: "max",
          exec_mode: "cluster",
          autorestart: true,
          max_memory_restart: "512M",
          env: {
            NODE_ENV: "production",
            PORT: 3000,
            HOSTNAME: "0.0.0.0",
          },
          error_file: "./logs/ibc-app-error.log",
          out_file: "./logs/ibc-app-out.log",
          log_date_format: "YYYY-MM-DD HH:mm:ss Z",
          merge_logs: true,
          log_type: "json",
          max_restarts: 10,
          restart_delay: 4000,
          watch: false,
          listen_timeout: 10000,
          kill_timeout: 5000,
        },
      ],
    };
    ```
  - [ ] 2.2 Créer un dossier `logs/` à la racine avec un `.gitkeep` pour que PM2 puisse écrire les logs
  - [ ] 2.3 Ajouter `logs/*.log` au `.gitignore`

- [ ] **Task 3: Créer `scripts/prepare-deploy.sh`** (AC: 3)
  - [ ] 3.1 Créer le dossier `scripts/` s'il n'existe pas
  - [ ] 3.2 Créer `scripts/prepare-deploy.sh` avec le contenu suivant :
    ```bash
    #!/usr/bin/env bash
    set -euo pipefail

    echo "🚀 IBC — Préparation du déploiement..."

    # Vérifier que le build a été exécuté
    if [ ! -d ".next/standalone" ]; then
      echo "❌ Erreur : .next/standalone n'existe pas. Exécutez 'npm run build' d'abord."
      exit 1
    fi

    # Nettoyer le dossier de déploiement précédent
    rm -rf deploy-dist
    mkdir -p deploy-dist

    # Copier le standalone
    echo "📦 Copie du standalone..."
    cp -r .next/standalone deploy-dist/

    # Copier les static assets (nécessaires séparément en standalone mode)
    echo "📦 Copie des assets statiques..."
    cp -r .next/static deploy-dist/.next/static

    # Copier les dossiers publics
    echo "📦 Copie des fichiers publics..."
    cp -r public deploy-dist/

    # Copier le fichier ecosystem.config.js
    echo "📦 Copie du ecosystem.config.js..."
    cp ecosystem.config.js deploy-dist/

    # Copier le .env.example pour référence
    echo "📦 Copie du .env.example..."
    cp .env.example deploy-dist/

    # Afficher le résumé
    echo ""
    echo "✅ Déploiement préparé dans deploy-dist/"
    echo ""
    echo "📁 Structure :"
    find deploy-dist -maxdepth 3 -type f | head -30
    echo ""
    echo "📊 Taille totale :"
    du -sh deploy-dist/
    echo ""
    echo "🎯 Prochaines étapes :"
    echo "  1. rsync -avz deploy-dist/ user@vps:/var/www/ibc/"
    echo "  2. Sur le VPS : cd /var/www/ibc && cp .env.example .env && éditer .env"
    echo "  3. pm2 start ecosystem.config.js"
    echo "  4. pm2 save && pm2 startup"
    ```
  - [ ] 3.3 Rendre le script exécutable : `chmod +x scripts/prepare-deploy.sh`
  - [ ] 3.4 Ajouter un script npm `"prepare-deploy": "npm run build && bash scripts/prepare-deploy.sh"` dans `package.json`

- [ ] **Task 4: Mettre à jour `.gitignore` et préparer le déploiement** (AC: 1, 2, 3)
  - [ ] 4.1 Ajouter les entrées suivantes au `.gitignore` si elles n'y sont pas déjà :
    ```
    # Deployment
    deploy-dist/
    logs/*.log
    ```
  - [ ] 4.2 Vérifier que `.env.example` contient toutes les variables nécessaires pour la production :
    ```
    # Auth
    NEXTAUTH_URL=
    NEXTAUTH_SECRET=
    GOOGLE_CLIENT_ID=
    GOOGLE_CLIENT_SECRET=

    # Database
    DATABASE_URL=

    # Upstash Redis (rate limiting)
    UPSTASH_REDIS_REST_URL=
    UPSTASH_REDIS_REST_TOKEN=

    # Cloudflare R2 (document storage)
    R2_ACCOUNT_ID=
    R2_ACCESS_KEY_ID=
    R2_SECRET_ACCESS_KEY=
    R2_BUCKET_NAME=
    R2_PUBLIC_URL=

    # Resend (emails)
    RESEND_API_KEY=

    # App
    APP_URL=
    ```
  - [ ] 4.3 Créer ou mettre à jour le fichier `.env.example` avec toutes les variables ci-dessus

- [ ] **Task 5: Tester le processus complet de build et déploiement** (AC: 1, 2, 3)
  - [ ] 5.1 Exécuter `npm run build` et vérifier que `.next/standalone/server.js` est créé
  - [ ] 5.2 Exécuter `bash scripts/prepare-deploy.sh` et vérifier que `deploy-dist/` est créé avec :
    - `deploy-dist/.next/standalone/server.js`
    - `deploy-dist/.next/static/` (assets statiques)
    - `deploy-dist/public/` (fichiers publics)
    - `deploy-dist/ecosystem.config.js`
    - `deploy-dist/.env.example`
  - [ ] 5.3 Vérifier que la taille totale du `deploy-dist/` est raisonnable (idéalement < 100 Mo pour NFR-P4)
  - [ ] 5.4 Tester que le serveur standalone démarre : `node deploy-dist/.next/standalone/server.js` (avec DATABASE_URL et NEXTAUTH_SECRET définis)
  - [ ] 5.5 Vérifier que la variable d'environnement `HOSTNAME` est utilisée correctement dans le standalone (Next.js standalone utilise `HOSTNAME` et `PORT`)

- [ ] **Task 6: Documenter le processus de déploiement** (AC: 1, 2, 3)
  - [ ] 6.1 Créer ou mettre à jour `scripts/DEPLOY.md` avec les instructions de déploiement VPS :
    - Prérequis (Node.js 20+, PM2, Nginx, PostgreSQL)
    - Variables d'environnement requises
    - Commandes de build et déploiement
    - Configuration PM2
    - Configuration Nginx (reverse proxy)
    - SSL avec Certbot
    - Commandes utiles PM2 (restart, logs, status)

## Dev Notes

### Architecture Compliance

- **`next.config.ts` — NON-NEGOTIABLE:** Currently contains security headers via `headers()` function (added in Story 1.6 CR patches). The `output: 'standalone'` property MUST be added WITHOUT removing or breaking the existing `headers()` configuration. The final config must have both `output: 'standalone'` and the `headers()` function.

- **Standalone output mode:** When Next.js builds with `output: 'standalone'`, it generates a minimal Node.js server in `.next/standalone/` that includes only the necessary files. However, `.next/static/` and `public/` are NOT included in the standalone output and must be copied separately — this is why `prepare-deploy.sh` handles copying them explicitly.

- **PM2 cluster mode:** The `ecosystem.config.js` uses `instances: "max"` which creates one process per CPU core. For a small VPS (2-4 cores), this means 2-4 instances. PM2's `autorestart: true` ensures zero-downtime on crashes, and `max_memory_restart: "512M"` prevents memory leaks from crashing the server.

- **Standalone server environment variables:** Next.js standalone mode requires the following environment variables to be available at runtime:
  - `HOSTNAME` or `HOST` (defaults to `0.0.0.0` if not set)
  - `PORT` (defaults to 3000 if not set)
  - Plus all application env vars (DATABASE_URL, NEXTAUTH_SECRET, etc.)
  - The `ecosystem.config.js` sets `HOSTNAME: "0.0.0.0"` and `PORT: 3000` by default

- **Static assets in standalone mode:** Next.js standalone does NOT include `public/` and `.next/static/` in the standalone output. These must be copied manually:
  - `.next/static/` → deploy-dist/.next/static/
  - `public/` → deploy-dist/public/
  - This is a well-known Next.js deployment requirement that is easy to miss.

- **Nginx reverse proxy (future - NOT this story):** Nginx configuration for reverse proxy, SSL, and static asset caching (NFR-D3, NFR-D4) belongs to a future story (Story 6.6 - Préparation Déploiement Production). This story focuses on the application-level deployment configuration ONLY.

- **PostgreSQL migration (future - NOT this story):** Migrating DATABASE_URL from SQLite to PostgreSQL is covered in NFR-SC3 but belongs to a future story. This story only ensures the standalone build works and the deployment scripts are ready.

- **API response format:** Follow architecture pattern:
  - Success: `NextResponse.json({ data: T })`
  - Error: `NextResponse.json({ error: string, code?: string }, { status })`

- **Prisma import:** Always import from `@/generated/prisma/client` — project convention.

- **Prisma client:** Use singleton from `@/lib/prisma.ts` — `import { prisma } from "@/lib/prisma"`.

### Current State of Files Being Modified

**`next.config.ts` (today):**
- Currently has security headers configuration via `headers()` function (added in Story 1.6 CR P1 patch)
- Does NOT have `output: 'standalone'` — this is the P0 blocker #1
- **What changes:** Add `output: 'standalone'` to the config object, keeping the existing `headers()` function intact

**`package.json` (today):**
- Has scripts: `dev`, `build`, `start`, `lint`
- Does NOT have `prepare-deploy` script
- Still has `stripe` dependency (to be removed in Story 2.1, NOT this story)
- **What changes:** Add `"prepare-deploy": "npm run build && bash scripts/prepare-deploy.sh"` script

**`.gitignore` (today):**
- Standard Next.js gitignore entries
- Does NOT have `deploy-dist/` or `logs/*.log`
- **What changes:** Add deployment-related entries

**`.env.example` (today):**
- Has auth vars (NEXTAUTH_URL, NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
- Has database url (DATABASE_URL)
- Has Upstash vars (UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN)
- **What changes:** Ensure all production env vars are documented (R2, Resend, APP_URL)

**No `ecosystem.config.js` exists yet — to be CREATED in this story.**
**No `scripts/` directory exists yet — to be CREATED in this story.**
**No `deploy-dist/` directory exists yet — to be CREATED by `prepare-deploy.sh`.**

### File Structure & What to Touch

| File | Action | Why |
|------|--------|-----|
| `next.config.ts` | **UPDATE** | Add `output: 'standalone'` |
| `ecosystem.config.js` | **CREATE** | PM2 cluster configuration |
| `scripts/prepare-deploy.sh` | **CREATE** | Deployment assembly script |
| `scripts/DEPLOY.md` | **CREATE** | Deployment documentation |
| `scripts/.gitkeep` for `logs/` | **CREATE** | Ensure logs directory exists for PM2 |
| `package.json` | **UPDATE** | Add `prepare-deploy` script |
| `.gitignore` | **UPDATE** | Add deployment-related entries |
| `.env.example` | **UPDATE** (if needed) | Ensure all production env vars are documented |

### Technical Requirements

- **Next.js 16 standalone mode:**
  - Adding `output: 'standalone'` to `next.config.ts` generates a self-contained deployable output in `.next/standalone/`
  - The standalone server reads `HOSTNAME` (not `HOST`) and `PORT` environment variables
  - Static assets (`.next/static/`) and public files (`public/`) are NOT included in standalone and must be copied separately
  - The standalone output includes a minimal `node_modules` with only production dependencies
  - The standalone output includes `server.js` which is the entry point for PM2

- **PM2 ecosystem configuration:**
  - `instances: "max"` creates one process per CPU core for cluster mode
  - `exec_mode: "cluster"` enables PM2's built-in load balancer
  - `autorestart: true` restarts crashed processes automatically
  - `max_memory_restart: "512M"` restarts processes exceeding 512MB (prevents memory leaks)
  - `merge_logs: true` combines logs from all instances
  - `log_date_format: "YYYY-MM-DD HH:mm:ss Z"` adds timestamps to logs (NFR-D6)
  - `log_type: "json"` structures logs for parsing
  - PM2 logs are rotated by default with `pm2 install pm2-logrotate` (can be configured after deployment)

- **Deployment script design:**
  - `prepare-deploy.sh` must be idempotent — can be run multiple times safely
  - Uses `set -euo pipefail` for strict error handling
  - Checks that `.next/standalone` exists before attempting to copy
  - Creates `deploy-dist/` with the correct structure for PM2 + Nginx deployment
  - Includes `.env.example` as reference for production configuration
  - Prints a summary of the deployment package

- **Testing: Vitest** — no new tests needed for this configuration story. The validation is:
  1. `npm run build` succeeds and generates `.next/standalone/server.js`
  2. `bash scripts/prepare-deploy.sh` succeeds and creates `deploy-dist/`
  3. `node deploy-dist/.next/standalone/server.js` starts (with env vars set)

- **Testing framework:** Vitest + jsdom + @testing-library/react + jest-dom (already configured from Stories 1.1–1.6). No unit tests needed for config/script files — validation is through build and start tests.

- **Runtime verification:** After adding `output: 'standalone'`, run `npm run build` and verify:
  - `.next/standalone/server.js` exists
  - `.next/standalone/package.json` exists and has correct deps
  - `.next/standalone/node_modules/` exists with production deps only
  - The build completes without errors

### Potential Pitfalls & Regression Prevention

- **DO NOT** remove the `headers()` function from `next.config.ts` — it was added in Story 1.6 CR P1 patch and is required for security headers on all responses. The `output: 'standalone'` and `headers()` must coexist.

- **DO NOT** remove `stripe` from `package.json` — that belongs to Story 2.1.

- **DO NOT** create Nginx configuration files — those belong to Story 6.6 (Préparation Déploiement Production).

- **DO NOT** migrate SQLite to PostgreSQL — that belongs to a future story (NFR-SC3).

- **CRITICAL:** Next.js standalone mode does NOT include `public/` and `.next/static/` in its output. The `prepare-deploy.sh` script MUST copy these directories separately. Missing this step is the most common deployment failure.

- **CRITICAL:** PM2 `cwd` in ecosystem.config.js is set to `./` (project root). The `script` path is `./.next/standalone/server.js`. This ensures PM2 resolves log file paths relative to the project root, so `./logs/` correctly points to the project-root logs directory. Environment variables like `HOSTNAME` and `PORT` must be set in the `env` section of ecosystem.config.js OR in a `.env` file in the same directory.

- **CRITICAL:** When running the standalone server, Next.js looks for `.next/static` relative to the server entry point's location (within `.next/standalone/`). Since PM2's `cwd` is `./` (project root) and `script` is `./.next/standalone/server.js`, Next.js resolves static paths from within `.next/standalone/`. This means `.next/static` must be at `.next/standalone/.next/static` — which is why `prepare-deploy.sh` copies `.next/static` to `deploy-dist/.next/static/` and it gets picked up correctly because the standalone output already has the `.next` directory structure.

- **Note on HOSTNAME:** In Next.js standalone mode, the server uses the `HOSTNAME` environment variable (not `HOST`). Setting it to `0.0.0.0` allows the server to listen on all network interfaces, which is required when running behind Nginx on a VPS.

- **Note on logs directory:** PM2 needs the `logs/` directory to exist for writing log files. The `logs/.gitkeep` file ensures this directory is tracked in git while keeping the directory empty. PM2 will create `ibc-app-error.log` and `ibc-app-out.log` in this directory.

- **The security headers established in Story 1.6** are now in `next.config.ts` via the `headers()` function. This means they will be included in the standalone build output and work correctly in production. The middleware `withSecurityHeaders` was removed in the CR (P1 patch) because it didn't apply to auth redirects — the `next.config.ts` `headers()` method is the correct place.

- **Standalone build size (NFR-P4):** The build output should be < 100MB. If it exceeds this, investigate unnecessary dependencies. The current `stripe` dependency (to be removed in Story 2.1) adds to the bundle size. After removing stripe, the bundle should be well under 100MB.

### Environment Variables

All production environment variables must be available on the VPS. The `.env.example` file serves as a reference:

```env
# Auth
NEXTAUTH_URL=
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Database (PostgreSQL in production)
DATABASE_URL=

# Upstash Redis (rate limiting)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Cloudflare R2 (document storage)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

# Resend (emails)
RESEND_API_KEY=

# App
APP_URL=
```

On the VPS, these must be set in a `.env` file in the same directory as `ecosystem.config.js` (within `deploy-dist/`).

### Previous Story Intelligence

**From Story 1.6 (Renforcement de la Sécurité — Rate Limiting et Headers):**
- Security headers were moved from `src/middleware.ts` to `next.config.ts` `headers()` function during code review (P1 patch). The `withSecurityHeaders` utility was removed from middleware. The current `next.config.ts` has a `securityHeaders` array and `headers()` function — this MUST be preserved.
- `src/middleware.ts` now uses `auth((req) => { ... })` pattern with `NextResponse.next()` — security headers are applied via `next.config.ts`, not middleware.
- Log sanitization utilities `sanitizeError` and `sanitizeForLog` were created in `src/lib/sanitize-log.ts`.
- Rate limiting uses `@upstash/ratelimit` and `@upstash/redis` with graceful fallback when env vars are missing.
- Testing framework: Vitest with jsdom, 129 tests passing after Story 1.6.
- Commit message patterns: `feat(deploy): Story 1.7 — ...` for code, `bmad-create-story: Story 1.7 — ...` for story creation.

**From earlier stories (1.1–1.5):**
- Auth.js split config: `auth.config.ts` (Edge, no Prisma/bcrypt) + `auth.ts` (Node.js, full config)
- Prisma 7: `prisma.config.ts` at project root, PrismaClient imported from `@/generated/prisma/client`
- API response pattern: `{ data: T }` for success, `{ error: string }` for errors
- Zod validation pattern established
- `src/middleware.ts` handles route protection via `authorized` callback

### Git Intelligence

Recent commits confirm established patterns:
- `feat(security): Story 1.6 — Rate limiting, security headers, log sanitization`
- `fix(security): CR Story 1.6 patch findings` — security headers moved to `next.config.ts`
- `bmad-create-story: Story 1.6 — Renforcement de la Sécurité`
- `chore(bmad): story 1.6 CR complete — status done`

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 1 / Story 1.7 — Configuration Déploiement — Standalone et PM2]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — Infrastructure & Deployment section, P0 Blockers #1]
- [Source: `_bmad-output/planning-artifacts/prd.md` — NFR-D1, NFR-D2, NFR-D5, NFR-D6, P0 Blocker #3]
- [Source: `next.config.ts` — Current config with security headers via `headers()` function]
- [Source: `package.json` — Current scripts and dependencies]
- [Source: `.gitignore` — Current gitignore entries]
- [Source: `_bmad-output/implementation-artifacts/1-6-renforcement-de-la-securite-rate-limiting-et-headers.md` — Previous story learnings and CR patches]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

## Review Findings

- [x] [Review][Patch] PM2 log paths resolve relative to `cwd` — `error_file` and `out_file` use `./logs/` but PM2 resolves paths relative to `cwd: "./.next/standalone"`, so logs will write to `.next/standalone/logs/` not the project-root `logs/` directory. **FIX APPLIED:** Changed `cwd` to `./` and `script` to `./.next/standalone/server.js` so logs resolve correctly to project root. — [ecosystem.config.js:8,16-17]
- [x] [Review][Patch] Missing `logs/.gitkeep` — Spec Task 2.2 explicitly requires creating `logs/` with `.gitkeep`. File does not exist. PM2 will fail to write logs on fresh clone. **FIX APPLIED:** Created `logs/.gitkeep`. — [logs/.gitkeep]
- [x] [Review][Patch] `.env.example` missing Stripe env vars — `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and Stripe price IDs are used in `src/lib/stripe.ts` and `src/app/api/stripe/` routes but not documented in `.env.example`. Until Stripe removal (Story 2-1), developers need these vars. **FIX APPLIED:** Added all Stripe env vars with comment noting Story 2.1 removal. — [.env.example]
- [x] [Review][Patch] `prepare-deploy.sh` doesn't create `logs/` directory in `deploy-dist/` — PM2 needs the logs directory to exist before it can write log files. **FIX APPLIED:** Added `mkdir -p deploy-dist/logs` to the script. — [scripts/prepare-deploy.sh]
- [x] [Review][Patch] Multiple files missing trailing newlines — `ecosystem.config.js`, `.env.example`, `src/lib/stripe.ts`, `src/app/api/stripe/checkout/route.ts` all missing final newline. POSIX convention and git hygiene. **FIX APPLIED:** Added trailing newlines to all affected files.