# Runbook de déploiement production IBC

Cible: VPS Cloud Infomaniak Ubuntu 24.04, Next.js standalone, PM2 cluster, Nginx reverse proxy, HTTPS Let's Encrypt, PostgreSQL.

## 1. Préparer la release localement

```bash
npm ci
npx prisma validate
npm run build
test -f .next/standalone/server.js
du -sh .next/standalone
npm run prepare-deploy
```

Le paquet `deploy-dist/` doit contenir:

- `.next/standalone/server.js`
- `.next/static/`
- `public/`
- `ecosystem.config.js`
- `prisma.config.ts`, `prisma/schema.prisma`, `prisma/migrations-postgresql/`
- `package.json`, `package-lock.json` pour les commandes Prisma opérationnelles
- `.env.example`
- `logs/`

Le script refuse les fichiers `.env`, `.env.local`, `*.db`, `*.sqlite` et `*.sqlite3` dans le paquet.

## 2. Transférer vers le VPS

Exemple avec un répertoire de releases atomiques:

```bash
RELEASE=$(date +%Y%m%d%H%M%S)
ssh deploy@example.com "mkdir -p /var/www/ibc/releases/$RELEASE"
rsync -az --delete deploy-dist/ deploy@example.com:/var/www/ibc/releases/$RELEASE/
ssh deploy@example.com "ln -sfn /var/www/ibc/releases/$RELEASE /var/www/ibc/current"
```

## 3. Configurer l'environnement production

Sur le VPS:

```bash
cd /var/www/ibc/current
cp .env.example .env
nano .env
chmod 600 .env
```

Variables critiques:

```bash
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
NEXTAUTH_URL=https://example.com
APP_URL=https://example.com
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB?schema=public
```

Production doit utiliser PostgreSQL (`postgresql://` ou `postgres://`). SQLite `file:` est réservé au dev/test local.

## 4. Installer les dépendances système

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
sudo npm install -g pm2
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 14
pm2 set pm2-logrotate:compress true
```

## 5. Appliquer les migrations PostgreSQL

Depuis le répertoire release avec `DATABASE_URL` PostgreSQL configuré:

```bash
cd /var/www/ibc/current
npx prisma validate
npx prisma migrate deploy
```

Le fichier `prisma.config.ts` sélectionne `prisma/schema.prisma` et `prisma/migrations-postgresql` quand `DATABASE_URL` est PostgreSQL.

## 6. Démarrer ou recharger PM2

Le paquet utilise `cwd=deploy-dist/current` et `script=./.next/standalone/server.js`.

```bash
cd /var/www/ibc/current
mkdir -p logs
pm2 start ecosystem.config.js --env production
# ou, si l'app existe déjà:
pm2 reload ibc-app --update-env
pm2 save
pm2 startup systemd
pm2 logs ibc-app --lines 100
```

Contrat PM2 attendu:

- app: `ibc-app`
- mode: cluster
- instances: `max`
- `PORT=3000`
- `HOSTNAME=0.0.0.0`
- `NODE_ENV=production`
- `max_memory_restart=500M`

## 7. Configurer Nginx

```bash
sudo cp deploy/nginx/ibc-app.conf.example /etc/nginx/sites-available/ibc-app
sudo nano /etc/nginx/sites-available/ibc-app  # remplacer example.com et /var/www/ibc/current si besoin
sudo ln -sfn /etc/nginx/sites-available/ibc-app /etc/nginx/sites-enabled/ibc-app
sudo nginx -t
sudo systemctl reload nginx
```

La configuration sert `/_next/static/` depuis `/var/www/ibc/current/.next/static/` avec cache immutable 365 jours, bloque les fichiers sensibles et proxifie le reste vers `http://127.0.0.1:3000` avec headers proxy standards.

## 8. Activer HTTPS Let's Encrypt / Certbot

Le domaine doit déjà pointer vers le VPS.

```bash
sudo certbot --nginx -d example.com -d www.example.com
sudo systemctl list-timers | grep certbot
sudo certbot renew --dry-run
sudo nginx -t
sudo systemctl reload nginx
```

Les headers HSTS/CSP/X-Frame-Options/X-Content-Type-Options restent définis côté Next.js; Nginx termine TLS et transmet `X-Forwarded-Proto`.

## 9. Vérifications finales

```bash
curl -I https://example.com/
curl -I https://example.com/_next/static/CHUNK_A_REMPLACER.js
pm2 status ibc-app
pm2 logs ibc-app --lines 100
sudo tail -n 100 /var/log/nginx/error.log
```

Vérifier aussi une connexion Auth.js, une page publique, une page dashboard premium et une page admin avec compte actif.

## 10. Rollback minimal

Si la nouvelle release échoue:

```bash
PREVIOUS=/var/www/ibc/releases/<release-precedente>
ln -sfn "$PREVIOUS" /var/www/ibc/current
cd /var/www/ibc/current
pm2 reload ibc-app --update-env
sudo nginx -t && sudo systemctl reload nginx
pm2 logs ibc-app --lines 200
sudo tail -n 200 /var/log/nginx/error.log
```

Si seul le process Node est instable:

```bash
pm2 restart ibc-app --update-env
pm2 logs ibc-app --lines 200
```
