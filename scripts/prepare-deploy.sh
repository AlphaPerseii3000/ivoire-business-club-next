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

printf "🧹 Suppression défensive des secrets et bases locales éventuellement inclus par le tracing standalone...\n"
find deploy-dist -type f \( -name '.env' -o -name '.env.local' -o -name '.env.*.local' -o -name '*.db' -o -name '*.sqlite' -o -name '*.sqlite3' \) -delete

printf "🔒 Vérification absence de secrets et bases SQLite dans deploy-dist/...\n"
if find deploy-dist -type f \( -name '.env' -o -name '.env.local' -o -name '.env.*.local' -o -name '*.db' -o -name '*.sqlite' -o -name '*.sqlite3' \) | grep -q .; then
  printf "❌ Erreur : deploy-dist contient un secret ou une base SQLite.\n" >&2
  find deploy-dist -type f \( -name '.env' -o -name '.env.local' -o -name '*.db' -o -name '*.sqlite' -o -name '*.sqlite3' \) >&2
  exit 1
fi

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
