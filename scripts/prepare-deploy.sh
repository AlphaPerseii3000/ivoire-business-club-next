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
mkdir -p deploy-dist/.next/standalone
cp -r .next/standalone/. deploy-dist/.next/standalone/

# Copier les static assets (nécessaires séparément en standalone mode)
echo "📦 Copie des assets statiques..."
mkdir -p deploy-dist/.next/static
cp -r .next/static/. deploy-dist/.next/static/

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