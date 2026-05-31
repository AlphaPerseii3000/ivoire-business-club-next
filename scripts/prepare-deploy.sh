#!/usr/bin/env bash
set -eu

printf "🚀 IBC — Préparation du déploiement production...\n"

# --- Step 1: Regenerate Prisma Client with PostgreSQL provider (NFR-SC3) ---
# The dev build uses SQLite (schema.dev.prisma). For production deploy,
# we MUST use PostgreSQL exclusively. We regenerate Prisma Client with
# the PostgreSQL schema, then rebuild Next.js standalone with the PG client.
printf "🔄 Régénération du Prisma Client en mode PostgreSQL...\n"
export PRISMA_SCHEMA=prisma/schema.prisma
export DATABASE_URL="postgresql://deploy:deploy@localhost:5432/ibc_deploy"
if ! npx prisma generate 2>/dev/null; then
  printf "⚠️  Échec de la régénération avec PRISMA_SCHEMA, tentative avec --schema...\n"
  if ! DATABASE_URL="postgresql://deploy:deploy@localhost:5432/ibc_deploy" npx prisma generate --schema=prisma/schema.prisma; then
    printf "❌ Erreur : Impossible de régénérer Prisma Client en mode PostgreSQL.\n" >&2
    printf "   Vérifiez que prisma/schema.prisma a provider = \"postgresql\".\n" >&2
    exit 1
  fi
fi
printf "  ✓ Prisma Client régénéré avec provider=postgresql.\n"

# --- Step 2: Build Next.js standalone with PG Prisma Client ---
printf "🔨 Build Next.js standalone avec Prisma Client PostgreSQL...\n"
if ! DATABASE_URL="postgresql://deploy:deploy@localhost:5432/ibc_deploy" npx next build; then
  printf "❌ Erreur : npm run build a échoué. Corrigez les erreurs avant le déploiement.\n" >&2
  exit 1
fi
printf "  ✓ Build Next.js standalone réussi.\n"

# Verify standalone output exists
if [ ! -f ".next/standalone/server.js" ]; then
  printf "❌ Erreur : .next/standalone/server.js n'existe pas après le build.\n" >&2
  exit 1
fi
if [ ! -d ".next/static" ]; then
  printf "❌ Erreur : .next/static n'existe pas après le build.\n" >&2
  exit 1
fi

# --- Step 3: Assemble deploy-dist ---
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

printf "🧹 Suppression défensive des secrets et bases locaux...\n"
find deploy-dist -type f \( -name '.env' -o -name '.env.local' -o -name '.env.*.local' -o -name '*.db' -o -name '*.sqlite' -o -name '*.sqlite3' \) -delete

printf "🔒 Vérification absence de secrets et bases SQLite dans deploy-dist/...\n"
if find deploy-dist -type f \( -name '.env' -o -name '.env.local' -o -name '.env.*.local' -o -name '*.db' -o -name '*.sqlite' -o -name '*.sqlite3' \) | grep -q .; then
  printf "❌ Erreur : deploy-dist contient un secret ou une base SQLite.\n" >&2
  find deploy-dist -type f \( -name '.env' -o -name '.env.local' -o -name '*.db' -o -name '*.sqlite' -o -name '*.sqlite3' \) >&2
  exit 1
fi

# --- Step 4: NFR-SC3 assertion ---
printf "🔍 Vérification NFR-SC3 : absence de activeProvider \"sqlite\" dans l'artefact de production...\n"
if grep -rq 'activeProvider:"sqlite"' deploy-dist/.next/standalone/ 2>/dev/null; then
  printf "❌ Erreur NFR-SC3 : l'artefact deploy-dist contient activeProvider \"sqlite\".\n" >&2
  printf "   Le Prisma Client en production DOIT utiliser PostgreSQL.\n" >&2
  printf "   Le build Next.js a été exécuté avec le schema PostgreSQL — investigation requise.\n" >&2
  exit 1
fi
printf "  ✓ Aucun activeProvider \"sqlite\" trouvé dans l'artefact de production.\n"

printf "\n✅ Paquet de déploiement prêt dans deploy-dist/\n\n"
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
printf "\n🎯 Runtime PM2 : cwd=deploy-dist, script=./.next/standalone/server.js, PORT=3000, HOSTNAME=0.0.0.0\n"
printf "📚 Voir scripts/DEPLOY.md pour rsync, migrations PostgreSQL, PM2, Nginx et Certbot.\n"

# --- Step 5: Restore dev Prisma Client ---
printf "\n🔄 Restauration du Prisma Client SQLite pour le développement local...\n"
unset PRISMA_SCHEMA
export DATABASE_URL="file:${PWD}/prisma/dev.db"
if npx prisma generate 2>/dev/null; then
  printf "  ✓ Prisma Client SQLite restauré pour le développement.\n"
else
  printf "  ⚠️  Échec de la restauration SQLite — exécutez manuellement : DATABASE_URL=file:./prisma/dev.db npx prisma generate\n"
fi