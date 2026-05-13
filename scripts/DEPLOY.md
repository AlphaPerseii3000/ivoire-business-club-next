# Déploiement IBC — Guide VPS (Infomaniak)

Ce document décrit le processus complet pour déployer l'application IBC sur un VPS avec PM2 et Nginx.

## Prérequis

- **Node.js** 20+ (LTS recommandé)
- **PM2** installé globalement (`npm install -g pm2`)
- **Nginx** installé et configuré
- **PostgreSQL** (base de données production)
- **Certbot** pour SSL (Let's Encrypt)

## Variables d'environnement requises

Copiez `.env.example` en `.env` et renseignez toutes les variables :

```bash
cp .env.example .env
nano .env
```

| Variable | Description | Obligatoire |
|----------|-------------|-------------|
| `NEXTAUTH_URL` | URL publique de l'application (ex: `https://ibc.example.com`) | ✅ |
| `NEXTAUTH_SECRET` | Secret JWT (générer avec `openssl rand -base64 32`) | ✅ |
| `GOOGLE_CLIENT_ID` | ID client Google OAuth | ✅ |
| `GOOGLE_CLIENT_SECRET` | Secret client Google OAuth | ✅ |
| `DATABASE_URL` | URL de connexion PostgreSQL | ✅ |
| `UPSTASH_REDIS_REST_URL` | URL Redis Upstash (rate limiting) | ⚠️ Optionnel |
| `UPSTASH_REDIS_REST_TOKEN` | Token Redis Upstash | ⚠️ Optionnel |
| `R2_ACCOUNT_ID` | ID compte Cloudflare R2 | ⚠️ Optionnel (futur) |
| `R2_ACCESS_KEY_ID` | Clé d'accès R2 | ⚠️ Optionnel (futur) |
| `R2_SECRET_ACCESS_KEY` | Clé secrète R2 | ⚠️ Optionnel (futur) |
| `R2_BUCKET_NAME` | Nom du bucket R2 | ⚠️ Optionnel (futur) |
| `R2_PUBLIC_URL` | URL publique du bucket R2 | ⚠️ Optionnel (futur) |
| `RESEND_API_KEY` | Clé API Resend (emails) | ⚠️ Optionnel (futur) |
| `APP_URL` | URL publique (même que NEXTAUTH_URL) | ✅ |

## Commandes de build et déploiement

### Build et préparation

```bash
# Build complet + assemblage du dossier deploy-dist/
npm run prepare-deploy
```

Ou manuellement :

```bash
# 1. Build de production
npm run build

# 2. Assembler le dossier de déploiement
bash scripts/prepare-deploy.sh
```

### Transfert vers le VPS

```bash
rsync -avz deploy-dist/ user@vps:/var/www/ibc/
```

### Sur le VPS

```bash
cd /var/www/ibc

# 1. Configurer les variables d'environnement
cp .env.example .env
nano .env  # Renseigner les variables

# 2. Démarrer avec PM2
pm2 start ecosystem.config.js

# 3. Sauvegarder la configuration PM2
pm2 save
pm2 startup
```

## Configuration PM2

L'application utilise PM2 en mode cluster. La configuration est dans `ecosystem.config.js` :

- **Mode** : Cluster (1 processus par cœur CPU)
- **Mémoire max** : 512M par processus (redémarrage automatique)
- **Auto-restart** : Activé
- **Logs** : Structurés JSON avec horodatage

### Commandes utiles PM2

```bash
pm2 status              # Voir le statut des processus
pm2 logs ibc-app        # Voir les logs en temps réel
pm2 restart ibc-app     # Redémarrer l'application
pm2 stop ibc-app        # Arrêter l'application
pm2 delete ibc-app      # Supprimer le processus
pm2 monit               # Monitoring en temps réel
pm2 describe ibc-app    # Détails du processus

# Rotation des logs (installer une fois)
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

## Configuration Nginx (Reverse Proxy)

Créer la configuration Nginx :

```bash
sudo nano /etc/nginx/sites-available/ibc
```

```nginx
server {
    listen 80;
    server_name ibc.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/ibc /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## SSL avec Certbot

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d ibc.example.com
```

Certbot configure automatiquement le renouvellement SSL.

## Mise à jour de l'application

```bash
# Sur la machine de développement
npm run prepare-deploy
rsync -avz deploy-dist/ user@vps:/var/www/ibc/

# Sur le VPS
pm2 restart ibc-app
```

## Dépannage

- **L'application ne démarre pas** : Vérifier que `HOSTNAME=0.0.0.0` est dans l'env PM2 ou `.env`
- **Erreur de base de données** : Vérifier `DATABASE_URL` et que PostgreSQL est accessible
- **Logs vides** : Vérifier que le dossier `logs/` existe et est accessible en écriture
- **Port déjà utilisé** : Vérifier qu'aucun autre processus n'utilise le port 3000 (`lsof -i :3000`)
- **Assets statiques manquants** : Vérifier que `.next/static` et `public/` sont bien copiés
