#!/usr/bin/env bash
set -euo pipefail

printf "🚀 IBC — Préparation du déploiement production...\n"

if [ ! -f ".next/standalone/server.js" ]; then
  printf "❌ Erreur : .next/standalone/server.js n'existe pas. Exécutez 'npm run build' d'abord.\n" >&2
  exit 1
fi

if [ ! -d ".next/static" ]; then
  printf "❌ Erreur : .next/static n'existe pas. Exécutez 'npm run build' d'abord.\n" >&2
  exit 1
fi

rm -rf deploy-dist
mkdir -p deploy-dist/.next/standalone deploy-dist/.next/static deploy-dist/logs

printf "📦 Copie du runtime standalone...\n"
cp -a .next/standalone/. deploy-dist/.next/standalone/

printf "📦 Copie des assets Next statiques...\n"
cp -a .next/static/. deploy-dist/.next/static/

printf "📦 Copie du dossier public...\n"
if [ -d "public" ]; then
  cp -a public deploy-dist/
else
  mkdir -p deploy-dist/public
fi

printf "📦 Copie des fichiers de configuration non secrets...\n"
cp ecosystem.config.js deploy-dist/
cp prisma.config.ts deploy-dist/
cp package.json package-lock.json deploy-dist/
cp .env.example deploy-dist/
mkdir -p deploy-dist/prisma
cp prisma/schema.prisma deploy-dist/prisma/schema.prisma
cp -a prisma/migrations-postgresql deploy-dist/prisma/migrations-postgresql

# --- Production Prisma Client: regenerate with PostgreSQL provider ---
# The dev build uses SQLite (schema.dev.prisma). For production deploy,
# we must regenerate Prisma Client with the PostgreSQL schema so the
# standalone artifact uses activeProvider="postgresql", not "sqlite".
printf "🔄 Régénération du Prisma Client en mode PostgreSQL...\n"
PRISMA_SCHEMA=prisma/schema.prisma DATABASE_URL="postgresql://deploy:deploy@localhost:5432/ibc_deploy" npx prisma generate --no-engine 2>/dev/null || {
  printf "⚠️  Impossible de régénérer Prisma Client en mode PostgreSQL.\n"
  printf "    Tentative avec prisma generate standard...\n"
  PRISMA_SCHEMA=prisma/schema.prisma npx prisma generate 2>/dev/null || true
}

# Re-copy regenerated Prisma Client into deploy-dist standalone
if [ -d "deploy-dist/.next/standalone/node_modules/.prisma" ]; then
  rm -rf deploy-dist/.next/standalone/node_modules/.prisma
fi
if [ -d "node_modules/.prisma" ]; then
  mkdir -p deploy-dist/.next/standalone/node_modules
  cp -a node_modules/.prisma deploy-dist/.next/standalone/node_modules/.prisma
fi
if [ -d "deploy-dist/.next/standalone/src/generated/prisma" ]; then
  rm -rf deploy-dist/.next/standalone/src/generated/prisma
fi
if [ -d "src/generated/prisma" ]; then
  mkdir -p deploy-dist/.next/standalone/src/generated
  cp -a src/generated/prisma deploy-dist/.next/standalone/src/generated/prisma
fi

printf "🧹 Suppression défensive des secrets et bases locales éventuellement inclus par le tracing standalone...\n"
find deploy-dist -type f \( -name '.env' -o -name '.env.local' -o -name '.env.*.local' -o -name '*.db' -o -name '*.sqlite' -o -name '*.sqlite3' \) -delete

printf "🔒 Vérification absence de secrets et bases SQLite dans deploy-dist/...\n"
if find deploy-dist -type f \( -name '.env' -o -name '.env.local' -o -name '.env.*.local' -o -name '*.db' -o -name '*.sqlite' -o -name '*.sqlite3' \) | grep -q .; then
  printf "❌ Erreur : deploy-dist contient un secret ou une base SQLite.\n" >&2
  find deploy-dist -type f \( -name '.env' -o -name '.env.local' -o -name '*.db' -o -name '*.sqlite' -o -name '*.sqlite3' \) >&2
  exit 1
fi

# --- NFR-SC3 assertion: production artifact must NOT contain sqlite provider ---
printf "🔍 Vérification NFR-SC3 : absence de activeProvider \"sqlite\" dans l'artefact de production...\n"
if grep -rq 'activeProvider:"sqlite"' deploy-dist/.next/standalone/ 2>/dev/null; then
  printf "❌ Erreur NFR-SC3 : l'artefact deploy-dist contient activeProvider \"sqlite\".\n" >&2
  printf "   Le Prisma Client en production DOIT utiliser PostgreSQL.\n" >&2
  printf "   Exécutez DATABASE_URL=postgresql://... PRISMA_SCHEMA=prisma/schema.prisma npx prisma generate avant prepare-deploy.\n" >&2
  exit 1
fi
printf "  ✓ Aucun activeProvider \"sqlite\" trouvé dans l'artefact de production.\n"

printf "\n✅ Paquet recréé dans deploy-dist/\n\n"
printf "📁 Contrôles principaux :\n"
for required_path in \
  "deploy-dist/.next/standalone/server.js" \
  "deploy-dist/.next/static" \
  "deploy-dist/public" \
  "deploy-dist/ecosystem.config.js" \
  "deploy-dist/.env.example" \
  "deploy-dist/prisma/schema.prisma" \
  "deploy-dist/prisma/migrations-postgresql" \
  "deploy-dist/prisma.config.ts" \
  "deploy-dist/logs"; do
  test -e "$required_path"
  printf "  ✓ %s\n" "$required_path"
done

printf "\n📊 Taille totale :\n"
du -sh deploy-dist/
printf "\n🎯 Runtime PM2 documenté : cwd=deploy-dist, script=./.next/standalone/server.js, PORT=3000, HOSTNAME=0.0.0.0\n"
printf "📚 Voir scripts/DEPLOY.md pour rsync, migrations PostgreSQL, PM2, Nginx et Certbot.\n"
