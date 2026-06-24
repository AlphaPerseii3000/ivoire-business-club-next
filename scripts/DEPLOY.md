# Runbook de déploiement production IBC

Cible: Hetzner CX33 (4 vCPU, 8 GB RAM, 80 GB NVMe), Ubuntu 26.04 LTS, Helsinki FI. Next.js standalone, PM2 cluster, Nginx reverse proxy, HTTPS Let's Encrypt, PostgreSQL 18.

> **Note (2026-05-25):** Déploiement effectif sur Helsinki (hel1) avec Ubuntu 26.04 et PostgreSQL 18. Les instructions ci-dessous référencent Ubuntu 24.04 et PostgreSQL 16 par défaut; adapter les numéros de version si le VPS utilise une version plus récente. Voir les déviations en fin de document.

Ce runbook décrit le déploiement complet de l'application IBC (`ivoire-business-club.com`) sur un VPS Hetzner Cloud CX33. Le chemin recommandé est le script automatisé `npm run deploy:prod`, qui prépare le build PostgreSQL, transfère une release atomique vers `/var/www/ibc/releases/`, active `/var/www/ibc/current`, lance les migrations Prisma, recharge PM2/Nginx et vérifie HTTPS.

## Déploiement rapide

Depuis le dépôt local:

```powershell
npm ci
npm run deploy:prod
```

Par défaut, le script déploie vers `deploy@www.ivoire-business-club.com` et crée une release UTC du type `YYYYMMDDHHMMSS`.

Options utiles:

```powershell
# Reprendre un deploy-dist déjà préparé, sans rebuild local
npm run deploy:prod -- -SkipPrepare

# Cibler explicitement un autre hôte ou utilisateur SSH
npm run deploy:prod -- -HostName www.ivoire-business-club.com -User deploy
```

Préconditions:

- La clé SSH locale doit permettre `ssh deploy@www.ivoire-business-club.com`.
- La release active précédente doit contenir `/var/www/ibc/current/.env`; le script le recopie dans la nouvelle release.
- Si aucun `.env` de production n'existe encore, le créer manuellement sur le serveur avant `npx prisma migrate deploy` et le reload PM2.

Le script échoue volontairement si `deploy-dist/` contient un `.env`, une base SQLite locale ou un Prisma Client généré avec `activeProvider:"sqlite"`.

Architecture cible:

- Domaine canonique: `https://www.ivoire-business-club.com`
- Redirection: `ivoire-business-club.com` → `www.ivoire-business-club.com`
- Application Node/Next.js: `127.0.0.1:3000`, exposée uniquement via Nginx
- Process manager: PM2 en mode `cluster`, application `ibc-app`, `instances=max`
- Base de données: PostgreSQL 16 local au VPS
- Reverse proxy: Nginx avec HTTPS Let's Encrypt
- Chemins de production:
  - Releases: `/var/www/ibc/releases/`
  - Release active: `/var/www/ibc/current`
  - Logs applicatifs: `/var/www/ibc/current/logs/`
  - Configuration Nginx: `/etc/nginx/sites-available/ibc-app`

> Important: les en-têtes de sécurité applicatifs, dont HSTS, CSP, `X-Frame-Options` et autres protections, sont définis côté Next.js. Nginx termine TLS, sert les assets statiques, bloque les fichiers sensibles et transmet correctement les headers proxy.

## 0. Prérequis et provisionnement Hetzner

Dans Hetzner Cloud:

1. Aller sur `https://console.hetzner.cloud/`.
2. Créer un projet nommé par exemple `IBC Production`.
3. Dans ce projet, créer un serveur:
   - Location: `Nuremberg, DE` (`nbg1`)
   - Image: `Ubuntu 24.04`
   - Type: `CX33` — 4 vCPU, 8 GB RAM, 80 GB NVMe
   - IPv4: activée, coût additionnel d'environ `€1/mois`
   - IPv6: activée automatiquement
   - Prix indicatif: environ `€6.99/mois + €1 IPv4 = €7.99/mois`

Noter immédiatement dans un coffre sécurisé:

- IPv4 publique du serveur
- IPv6 publique du serveur
- Nom du serveur Hetzner
- Empreinte de la clé SSH utilisée

Dans les commandes ci-dessous, initialiser localement les variables avec les valeurs visibles dans la console Hetzner:

```bash
export IBC_IPV4="ADRESSE_IPV4_HETZNER"
export IBC_IPV6="ADRESSE_IPV6_HETZNER"
export IBC_HOST="www.ivoire-business-club.com"
```

`ADRESSE_IPV4_HETZNER` et `ADRESSE_IPV6_HETZNER` doivent être remplacées par les adresses réelles affichées par Hetzner. Ne pas inventer ces valeurs.

### 0.2 Ajouter la clé SSH dans Hetzner

Sur la machine locale de déploiement, vérifier ou créer une clé SSH dédiée:

```bash
ls -la ~/.ssh
ssh-keygen -t ed25519 -C "deploy@www.ivoire-business-club.com" -f ~/.ssh/ibc_hetzner_ed25519
cat ~/.ssh/ibc_hetzner_ed25519.pub
```

Dans Hetzner Cloud:

1. Aller dans `Security` → `SSH Keys`.
2. Ajouter le contenu de `~/.ssh/ibc_hetzner_ed25519.pub`.
3. Associer cette clé au serveur lors de sa création ou via la console.

### 0.3 Première connexion SSH en root

Depuis la machine locale:

```bash
ssh -i ~/.ssh/ibc_hetzner_ed25519 root@$IBC_IPV4
```

Accepter l'empreinte SSH uniquement si elle correspond au serveur créé dans Hetzner.

Mettre le système à jour immédiatement:

```bash
apt update
apt full-upgrade -y
reboot
```

Se reconnecter après le redémarrage:

```bash
ssh -i ~/.ssh/ibc_hetzner_ed25519 root@$IBC_IPV4
```

### 0.4 Créer l'utilisateur de déploiement `deploy`

Sur le VPS, en root:

```bash
adduser deploy
usermod -aG sudo deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
```

Tester depuis la machine locale:

```bash
ssh -i ~/.ssh/ibc_hetzner_ed25519 deploy@$IBC_IPV4
sudo whoami
```

La commande doit retourner `root`.

### 0.5 Durcir SSH

Sur le VPS, éditer la configuration SSH:

```bash
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak.$(date +%Y%m%d%H%M%S)
sudo nano /etc/ssh/sshd_config
```

Vérifier ou définir ces directives:

```sshconfig
Port 22
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
X11Forwarding no
AllowUsers deploy
```

Valider puis recharger SSH sans fermer la session active:

```bash
sudo sshd -t
sudo systemctl reload ssh
```

Depuis un autre terminal local, tester une nouvelle connexion:

```bash
ssh -i ~/.ssh/ibc_hetzner_ed25519 deploy@$IBC_IPV4
```

Ne fermer la session root initiale qu'après validation de cette connexion.

### 0.6 Configurer le firewall Hetzner Cloud

Dans Hetzner Cloud Console → projet `IBC Production` → `Firewalls`:

Créer un firewall `ibc-production-firewall` avec les règles entrantes suivantes:

| Protocole | Port | Source | Usage |
|---|---:|---|---|
| TCP | 22 | `0.0.0.0/0`, `::/0` | SSH |
| TCP | 80 | `0.0.0.0/0`, `::/0` | HTTP / Let's Encrypt |
| TCP | 443 | `0.0.0.0/0`, `::/0` | HTTPS |
| ICMP | - | `0.0.0.0/0`, `::/0` | Ping / diagnostic |

Appliquer ce firewall au serveur CX33. Aucune règle publique ne doit exposer PostgreSQL (`5432`) ni le port Node (`3000`).

### 0.7 Configurer UFW sur le VPS

Sur le VPS:

```bash
sudo apt install -y ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow proto icmp
sudo ufw enable
sudo ufw status verbose
```

Si `sudo ufw allow proto icmp` échoue selon la version UFW, autoriser ICMP via `/etc/ufw/before.rules` en conservant les règles ICMP par défaut d'Ubuntu, puis vérifier avec:

```bash
ping -c 3 $IBC_IPV4
```

## 1. Configuration DNS Infomaniak → Hetzner

Cette section est critique: le domaine `ivoire-business-club.com` est acheté chez Infomaniak, mais le trafic web est servi par un VPS Hetzner via Nginx. Les DNS doivent donc être modifiés dans le manager Infomaniak, pas chez Hetzner, sauf si les nameservers du domaine ont été explicitement délégués ailleurs.

> Note canonicalisation (Story 14.1): le domaine canonique est désormais `www.ivoire-business-club.com`. Les enregistrements DNS doivent couvrir à la fois le domaine racine (`@`) et le sous-domaine `www`, tous deux pointant vers le VPS Hetzner. La redirection 301 non-www → www est configurée dans `next.config.ts` et doit être dupliquée au niveau Nginx sur le VPS.

### 1.1 Préparer les adresses Hetzner

Dans la console Hetzner du serveur CX33, récupérer:

- IPv4 publique: valeur à utiliser pour les enregistrements `A`
- IPv6 publique complète: valeur à utiliser pour les enregistrements `AAAA`

Depuis le VPS, on peut aussi vérifier:

```bash
curl -4 https://ifconfig.me && echo
curl -6 https://ifconfig.me && echo
ip addr show
```

### 1.2 Modifier la zone DNS chez Infomaniak

Dans le Manager Infomaniak:

1. Aller dans `Domaine`.
2. Sélectionner `ivoire-business-club.com`.
3. Aller dans `DNS` → `Zones DNS`.
4. Modifier ou créer les enregistrements web suivants:

| Nom | Type | Valeur | TTL recommandé |
|---|---|---|---:|
| `@` ou `ivoire-business-club.com` | `A` | IPv4 du VPS Hetzner | `300` pendant migration, puis `3600` |
| `@` ou `ivoire-business-club.com` | `AAAA` | IPv6 du VPS Hetzner | `300` pendant migration, puis `3600` |
| `www` ou `www.ivoire-business-club.com` | `A` | Même IPv4 du VPS Hetzner | `300` pendant migration, puis `3600` |
| `www` ou `www.ivoire-business-club.com` | `AAAA` | Même IPv6 du VPS Hetzner | `300` pendant migration, puis `3600` |

Ne pas supprimer les enregistrements email existants si l'email Infomaniak est utilisé.

### 1.3 Préserver l'email Infomaniak

Si Infomaniak héberge les emails du domaine, conserver les entrées suivantes telles que fournies par Infomaniak:

- `MX`
- `SPF` en `TXT`
- `DKIM` en `TXT` ou CNAME selon configuration
- `DMARC` en `TXT`
- éventuelles entrées de validation email

Attention: remplacer toute la zone DNS sans recopier ces entrées peut casser la réception ou l'envoi d'emails. La modification nécessaire pour le déploiement web concerne uniquement `A` et `AAAA` pour le domaine racine et `www`.

### 1.4 Propagation et vérification DNS

La propagation DNS prend généralement entre 1h et 24h. Si possible, réduire le TTL à `300` quelques heures avant la migration afin d'accélérer le basculement.

Depuis une machine locale:

```bash
dig +short A ivoire-business-club.com
dig +short AAAA ivoire-business-club.com
dig +short A www.ivoire-business-club.com
dig +short AAAA www.ivoire-business-club.com
nslookup ivoire-business-club.com
nslookup www.ivoire-business-club.com
```

Les réponses doivent correspondre aux IPv4 et IPv6 du VPS Hetzner.

Vérifier aussi via des résolveurs publics:

```bash
dig @1.1.1.1 +short A ivoire-business-club.com
dig @8.8.8.8 +short A ivoire-business-club.com
dig @1.1.1.1 +short AAAA ivoire-business-club.com
dig @8.8.8.8 +short AAAA ivoire-business-club.com
```

Ne pas lancer Certbot avant que `ivoire-business-club.com` et `www.ivoire-business-club.com` pointent effectivement vers le VPS.

## 2. Installation des dépendances système

Toutes les commandes de cette section sont à exécuter sur le VPS avec l'utilisateur `deploy`, via `sudo` si nécessaire.

### 2.1 Mettre Ubuntu à jour

```bash
sudo apt update
sudo apt full-upgrade -y
sudo apt install -y ca-certificates curl gnupg lsb-release apt-transport-https software-properties-common build-essential git unzip jq
sudo reboot
```

Reconnecter ensuite:

```bash
ssh -i ~/.ssh/ibc_hetzner_ed25519 deploy@$IBC_IPV4
```

### 2.2 Installer Node.js 20 LTS via NodeSource

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version
npm --version
```

La version Node doit être `v20.x`. Next.js standalone utilisera le runtime Node installé sur le serveur.

### 2.3 Installer PostgreSQL 16

Ubuntu 24.04 fournit PostgreSQL 16 dans ses dépôts:

```bash
sudo apt install -y postgresql-16 postgresql-client-16 postgresql-contrib
sudo systemctl enable --now postgresql
sudo systemctl status postgresql --no-pager
psql --version
```

Vérifier que PostgreSQL écoute localement uniquement:

```bash
sudo ss -ltnp | grep 5432
```

La liaison attendue est locale (`127.0.0.1:5432` et/ou socket Unix), pas `0.0.0.0:5432`.

### 2.4 Créer la base et l'utilisateur PostgreSQL

Générer un mot de passe long sur le VPS:

```bash
openssl rand -base64 48
```

Créer l'utilisateur et la base. Remplacer `MOT_DE_PASSE_POSTGRES_IBC` par le mot de passe généré, puis le stocker dans un gestionnaire de secrets:

```bash
sudo -u postgres psql
```

Dans `psql`:

```sql
CREATE USER ibc_user WITH PASSWORD 'MOT_DE_PASSE_POSTGRES_IBC';
CREATE DATABASE ibc_prod OWNER ibc_user;
GRANT ALL PRIVILEGES ON DATABASE ibc_prod TO ibc_user;
\c ibc_prod
GRANT ALL ON SCHEMA public TO ibc_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ibc_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ibc_user;
\q
```

Tester la connexion:

```bash
PGPASSWORD='MOT_DE_PASSE_POSTGRES_IBC' psql -h 127.0.0.1 -U ibc_user -d ibc_prod -c 'SELECT current_database(), current_user;'
```

La future variable `DATABASE_URL` aura ce format:

```bash
postgresql://ibc_user:MOT_DE_PASSE_POSTGRES_IBC@127.0.0.1:5432/ibc_prod?schema=public
```

### 2.5 Installer PM2 globalement

```bash
sudo npm install -g pm2
pm2 --version
```

### 2.6 Installer Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable --now nginx
sudo nginx -t
sudo systemctl status nginx --no-pager
```

### 2.7 Installer Certbot et le plugin Nginx

```bash
sudo apt install -y certbot python3-certbot-nginx
certbot --version
```

### 2.8 Créer l'arborescence applicative

```bash
sudo mkdir -p /var/www/ibc/releases /var/www/ibc/shared/uploads /var/www/ibc/backups
sudo chown -R deploy:deploy /var/www/ibc
sudo chmod -R 755 /var/www/ibc
```

## 3. Préparer la release localement

Ces commandes sont à exécuter dans le dépôt local du projet IBC:

```bash
cd /home/alphaperseii/projects/ibc
npm ci
npm run prepare-deploy
```

Le script `npm run prepare-deploy` prépare uniquement le paquet local via `scripts/prepare-deploy.ps1` sur Windows. Le script Bash `scripts/prepare-deploy.sh` reste disponible comme fallback Unix. Pour un déploiement complet, préférer `npm run deploy:prod`. Il prépare un paquet de déploiement autonome dans:

```bash
/home/alphaperseii/projects/ibc/deploy-dist/
```

Ce paquet est destiné à être transféré tel quel sur le serveur. Il doit contenir au minimum:

```text
deploy-dist/
├── .next/
│   ├── standalone/
│   │   └── server.js
│   └── static/
├── public/
├── ecosystem.config.js
├── prisma.config.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations-postgresql/
├── package.json
├── package-lock.json
├── .env.example
└── logs/
```

Vérifier localement le contenu:

```bash
cd /home/alphaperseii/projects/ibc
test -f deploy-dist/.next/standalone/server.js
test -d deploy-dist/.next/static
test -d deploy-dist/public
test -f deploy-dist/ecosystem.config.js
test -f deploy-dist/prisma.config.ts
test -f deploy-dist/prisma/schema.prisma
test -d deploy-dist/prisma/migrations-postgresql
test -f deploy-dist/package.json
test -f deploy-dist/package-lock.json
test -f deploy-dist/.env.example
test -d deploy-dist/logs
find deploy-dist -maxdepth 3 -type f | sort | sed -n '1,120p'
du -sh deploy-dist
```

Vérifier qu'aucun secret local n'est inclus:

```bash
cd /home/alphaperseii/projects/ibc
find deploy-dist \( -name '.env' -o -name '.env.local' -o -name '*.db' -o -name '*.sqlite' -o -name '*.sqlite3' -o -name '.git' \) -print
```

Cette dernière commande ne doit rien afficher.

## 4. Transférer vers le VPS (manuel/fallback)

> Le transfert manuel est conservé comme fallback opérationnel. En usage courant, utiliser plutôt `npm run deploy:prod`.

Le déploiement utilise des releases atomiques:

- Chaque release est copiée dans `/var/www/ibc/releases/<timestamp>/`.
- Le symlink `/var/www/ibc/current` pointe vers la release active.
- Le rollback consiste à repointer `current` vers une release précédente puis recharger PM2.

### 4.1 Créer une release distante

Depuis la machine locale:

```bash
cd /home/alphaperseii/projects/ibc
export IBC_IPV4="ADRESSE_IPV4_HETZNER"
export RELEASE="$(date -u +%Y%m%d%H%M%S)"
ssh -i ~/.ssh/ibc_hetzner_ed25519 deploy@$IBC_IPV4 "mkdir -p /var/www/ibc/releases/$RELEASE"
```

### 4.2 Transférer `deploy-dist/` avec rsync

```bash
rsync -az --delete \
  -e "ssh -i ~/.ssh/ibc_hetzner_ed25519" \
  /home/alphaperseii/projects/ibc/deploy-dist/ \
  deploy@$IBC_IPV4:/var/www/ibc/releases/$RELEASE/
```

### 4.3 Activer la release

```bash
ssh -i ~/.ssh/ibc_hetzner_ed25519 deploy@$IBC_IPV4 "\
  ln -sfn /var/www/ibc/releases/$RELEASE /var/www/ibc/current && \
  mkdir -p /var/www/ibc/current/logs && \
  mkdir -p /var/www/ibc/shared/uploads && \
  rm -rf /var/www/ibc/current/public/uploads && \
  ln -sfn /var/www/ibc/shared/uploads /var/www/ibc/current/public/uploads && \
  if [ -d /var/www/ibc/current/.next/standalone/public ]; then \
    rm -rf /var/www/ibc/current/.next/standalone/public/uploads && \
    ln -sfn /var/www/ibc/shared/uploads /var/www/ibc/current/.next/standalone/public/uploads; \
  fi && \
  chmod 755 /var/www/ibc/current && \
  find /var/www/ibc/releases/$RELEASE -type d -exec chmod 755 {} \; && \
  find /var/www/ibc/releases/$RELEASE -type f -exec chmod 644 {} \; && \
  chmod 755 /var/www/ibc/current/.next/standalone/server.js || true"
```

### 4.4 Vérifier les permissions serveur

Sur le VPS:

```bash
sudo chown -R deploy:deploy /var/www/ibc
ls -la /var/www/ibc
ls -la /var/www/ibc/current
readlink -f /var/www/ibc/current
```

## 5. Configurer l'environnement production

Les variables d'environnement de production sont stockées dans `/var/www/ibc/current/.env`. Ce fichier ne doit jamais être commité ni transféré depuis le poste local.

### 5.1 Créer le fichier `.env`

Sur le VPS:

```bash
cd /var/www/ibc/current
cp .env.example .env
nano .env
chmod 600 .env
```

Vérifier:

```bash
ls -l /var/www/ibc/current/.env
```

Le propriétaire doit être `deploy`, avec des permissions `-rw-------`.

### 5.2 Générer `NEXTAUTH_SECRET`

Sur le VPS:

```bash
openssl rand -base64 48
```

Copier le résultat dans `NEXTAUTH_SECRET`.

### 5.3 Exemple complet de `.env` production

Adapter les secrets et identifiants réels. Les valeurs non secrètes liées au domaine et au runtime doivent rester telles quelles:

```dotenv
NEXTAUTH_URL=https://www.ivoire-business-club.com
NEXTAUTH_SECRET=COLLER_ICI_UN_SECRET_GENERE_PAR_OPENSSL_RAND_BASE64_48
GOOGLE_CLIENT_ID=COLLER_ICI_LE_CLIENT_ID_GOOGLE_OAUTH
GOOGLE_CLIENT_SECRET=COLLER_ICI_LE_CLIENT_SECRET_GOOGLE_OAUTH
DATABASE_URL=postgresql://ibc_user:***@127.0.0.1:5432/ibc_prod?schema=public
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
APP_URL=https://www.ivoire-business-club.com
UPSTASH_REDIS_REST_URL=https://COLLER_ICI_ID_UPSTASH.upstash.io
UPSTASH_REDIS_REST_TOKEN=COLLER_ICI_LE_TOKEN_UPSTASH
R2_ACCOUNT_ID=COLLER_ICI_LE_COMPTE_CLOUDFLARE_R2
R2_ACCESS_KEY_ID=COLLER_ICI_L_ACCESS_KEY_R2
R2_SECRET_ACCESS_KEY=COLLER_ICI_LA_SECRET_KEY_R2
R2_BUCKET_NAME=ibc-production
R2_PUBLIC_URL=https://COLLER_ICI_LE_DOMAINE_PUBLIC_R2
RESEND_API_KEY=COLLER_ICI_LA_CLE_API_RESEND
RESEND_FROM_EMAIL=Ivoire Business Club <contact@ivoire-business-club.com>
BANK_TRANSFER_IBAN=COLLER_ICI_IBAN_PRODUCTION
BANK_TRANSFER_BIC=COLLER_ICI_BIC_PRODUCTION
BANK_TRANSFER_BANK_ADDRESS=COLLER_ICI_ADRESSE_BANQUE_PRODUCTION
SUPPORT_WHATSAPP_NUMBER=COLLER_ICI_NUMERO_WHATSAPP_FORMAT_INTERNATIONAL
```

Les champs `COLLER_ICI_...` doivent être remplacés par les secrets de production. Ils sont volontairement explicites pour éviter de confondre exemple et valeur réelle.

### 5.4 Détail des variables

| Variable | Obligatoire | Exemple / valeur attendue | Rôle |
|---|---:|---|---|
| `NEXTAUTH_URL` | Oui | `https://www.ivoire-business-club.com` | URL publique utilisée par Auth.js pour callbacks et cookies |
| `NEXTAUTH_SECRET` | Oui | sortie de `openssl rand -base64 48` | Secret de signature/chiffrement Auth.js |
| `GOOGLE_CLIENT_ID` | Oui si login Google | valeur Google Cloud OAuth | Client ID OAuth Google |
| `GOOGLE_CLIENT_SECRET` | Oui si login Google | valeur Google Cloud OAuth | Secret OAuth Google |
| `DATABASE_URL` | Oui | `postgresql://ibc_user:***@127.0.0.1:5432/ibc_prod?schema=public` | Connexion PostgreSQL Prisma |
| `NODE_ENV` | Oui | `production` | Runtime production |
| `PORT` | Oui | `3000` | Port local Node/Next.js |
| `HOSTNAME` | Oui | `0.0.0.0` | Interface d'écoute du serveur standalone |
| `APP_URL` | Oui | `https://www.ivoire-business-club.com` | URL canonique applicative; doit matcher le domaine public |
| `UPSTASH_REDIS_REST_URL` | Selon fonctionnalités | URL REST Upstash | Cache, rate limit ou sessions selon implémentation |
| `UPSTASH_REDIS_REST_TOKEN` | Selon fonctionnalités | token Upstash | Authentification API Upstash |
| `R2_ACCOUNT_ID` | Selon fonctionnalités fichiers | ID compte Cloudflare | Stockage objet R2 |
| `R2_ACCESS_KEY_ID` | Selon fonctionnalités fichiers | access key R2 | Accès R2 |
| `R2_SECRET_ACCESS_KEY` | Selon fonctionnalités fichiers | secret key R2 | Accès R2 |
| `R2_BUCKET_NAME` | Selon fonctionnalités fichiers | `ibc-production` | Bucket R2 cible |
| `R2_PUBLIC_URL` | Selon fonctionnalités fichiers | domaine public R2 | URL publique des fichiers |
| `RESEND_API_KEY` | Selon emails | clé API Resend | Envoi d'emails transactionnels |
| `RESEND_FROM_EMAIL` | Selon emails | `Ivoire Business Club <contact@ivoire-business-club.com>` | Expéditeur email |
| `BANK_TRANSFER_IBAN` | Selon paiement virement | IBAN réel | Coordonnées virement |
| `BANK_TRANSFER_BIC` | Selon paiement virement | BIC réel | Coordonnées virement |
| `BANK_TRANSFER_BANK_ADDRESS` | Selon paiement virement | adresse banque réelle | Coordonnées banque |
| `SUPPORT_WHATSAPP_NUMBER` | Selon support | format international, ex. `+225...` | Contact WhatsApp support |

Points critiques:

- `DATABASE_URL` doit commencer par `postgresql://` ou `postgres://` et pointer vers une base PostgreSQL locale ou managée.
- `APP_URL` et `NEXTAUTH_URL` doivent être exactement `https://www.ivoire-business-club.com` en production.
- Le port exposé par PM2 est `3000`; il ne doit pas être ouvert publiquement dans UFW ni Hetzner Firewall.
- Après toute modification de `.env`, recharger PM2 avec `--update-env`.

## 6. Appliquer les migrations PostgreSQL

Les migrations doivent être exécutées depuis la release active, avec `.env` configuré.

Sur le VPS:

```bash
cd /var/www/ibc/current
npm ci --omit=dev
npx prisma validate
npx prisma migrate deploy
```

Si `npx prisma` demande à installer Prisma, refuser et vérifier que `package.json`/`package-lock.json` contiennent bien Prisma. Le paquet `deploy-dist/` doit permettre l'exécution des commandes Prisma nécessaires.

Vérifier les tables créées:

```bash
PGPASSWORD='MOT_DE_PASSE_POSTGRES_IBC' psql -h 127.0.0.1 -U ibc_user -d ibc_prod -c '\dt'
PGPASSWORD='MOT_DE_PASSE_POSTGRES_IBC' psql -h 127.0.0.1 -U ibc_user -d ibc_prod -c 'SELECT migration_name, finished_at FROM "_prisma_migrations" ORDER BY finished_at DESC LIMIT 10;'
```

Vérifier aussi la sélection PostgreSQL par Prisma:

```bash
cd /var/www/ibc/current
node -e "require('dotenv').config({path:'.env'}); console.log(process.env.DATABASE_URL.startsWith('postgresql://') || process.env.DATABASE_URL.startsWith('postgres://'))"
```

La commande doit afficher `true`.

## 7. Configurer PM2

> [!IMPORTANT]
> **Notes de résolution critiques pour le déploiement (Next.js standalone & PM2) :**
> 
> 1. **Injecter dynamiquement les variables d'environnement (`.env`) :**
>    Le serveur de production Next.js standalone (`server.js`) ne charge *pas* automatiquement le fichier `.env` à l'exécution en production. Si PM2 est redémarré de zéro (`pm2 delete`), l'application échouera avec une exception `DATABASE_URL is not configured`.
>    *Solution en place :* Le fichier `ecosystem.config.js` est configuré pour lire et parser dynamiquement le fichier `.env` de la release active à chaque démarrage ou rechargement, injectant toutes les configurations secrètes et la connexion PostgreSQL de manière transparente dans le cluster PM2.
> 
> 2. **Résolution des jonctions node_modules absolues de Turbopack :**
>    Le compilateur Next.js génère des *jonctions de répertoires* (liens symboliques absolus de développement) dans `.next/standalone/.next/node_modules/` pointant vers l'ordinateur du développeur. Compresser directement le dossier entraîne des liens brisés ou des fichiers de 0 octet sur le serveur Linux (`Cannot find module '@prisma/client-xxxx'`).
>    *Procédure de build :* Le script de préparation remplace ces jonctions par des répertoires physiques réels en y recopiant le contenu correspondant depuis `deploy-dist/.next/standalone/node_modules/` (notamment pour `@prisma/client-...`, `pg-...`, `better-sqlite3-...`, et `@aws-sdk/client-s3-...`) avant d'empaqueter le tarball.
> 
> Le fichier `/var/www/ibc/current/ecosystem.config.js` fourni par le paquet de déploiement définit:

- `name=ibc-app`
- `script=./.next/standalone/server.js`
- `instances=max`
- `exec_mode=cluster`
- `max_memory_restart=500M`
- `PORT=3000`
- `HOSTNAME=0.0.0.0`

### 7.1 Démarrer l'application

Sur le VPS:

```bash
cd /var/www/ibc/current
mkdir -p logs
pm2 start ecosystem.config.js --env production
pm2 status
pm2 logs ibc-app --lines 100
```

Si l'application existe déjà, utiliser plutôt:

```bash
cd /var/www/ibc/current
pm2 reload ibc-app --update-env
pm2 status ibc-app
```

### 7.2 Persister PM2 au redémarrage système

```bash
pm2 save
pm2 startup systemd -u deploy --hp /home/deploy
```

La commande `pm2 startup` affiche une commande `sudo env PATH=... pm2 startup ...`; l'exécuter exactement comme indiquée. Ensuite:

```bash
pm2 save
systemctl status pm2-deploy --no-pager
```

### 7.3 Installer et configurer `pm2-logrotate`

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 14
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
pm2 set pm2-logrotate:workerInterval 30
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'
pm2 save
```

Vérifier:

```bash
pm2 conf pm2-logrotate
```

### 7.4 Commandes PM2 utiles

```bash
pm2 status ibc-app
pm2 describe ibc-app
pm2 logs ibc-app --lines 200
pm2 monit
pm2 reload ibc-app --update-env
pm2 restart ibc-app --update-env
pm2 stop ibc-app
```

## 8. Configurer Nginx

Nginx reçoit le trafic HTTP/HTTPS public, sert les assets statiques Next.js avec cache long et proxifie le reste vers PM2 sur `127.0.0.1:3000`.

### 8.1 Créer la configuration Nginx

Sur le VPS:

```bash
sudo nano /etc/nginx/sites-available/ibc-app
```

Coller la configuration complète suivante. Le domaine canonique est `www.ivoire-business-club.com`; le trafic non-www est redirigé 301 vers www. Cette règle serve de filet de sécurité en complément du `redirects()` de Next.js.

```nginx
# IBC production - www.ivoire-business-club.com (canonique)
# Next.js standalone sur 127.0.0.1:3000 via PM2 cluster.

upstream ibc_nextjs {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name ivoire-business-club.com;

    return 301 http://www.ivoire-business-club.com$request_uri;
}

server {
    listen 80;
    listen [::]:80;
    server_name www.ivoire-business-club.com;

    root /var/www/ibc/current/public;

    server_tokens off;
    client_max_body_size 25m;

    gzip on;
    gzip_comp_level 5;
    gzip_min_length 1024;
    gzip_vary on;
    gzip_proxied any;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/json
        application/xml
        application/rss+xml
        image/svg+xml
        font/ttf
        font/otf
        application/vnd.ms-fontobject
        application/font-woff
        application/font-woff2;

    # Bloquer les fichiers sensibles et artefacts internes.
    location ~* (^|/)\.env(?:\..*)?$ { deny all; return 404; }
    location ~* (^|/)\.git(?:/|$) { deny all; return 404; }
    location ~* (^|/)\.github(?:/|$) { deny all; return 404; }
    location ~* (^|/)\.next/server(?:/|$) { deny all; return 404; }
    location ~* (^|/)node_modules(?:/|$) { deny all; return 404; }
    location ~* (^|/)prisma(?:/|$) { deny all; return 404; }
    location ~* (^|/)logs(?:/|$) { deny all; return 404; }
    location ~* \.(?:db|sqlite|sqlite3|bak|backup|old|orig|swp|swo|pem|key|crt|log|ini|conf|sql)$ { deny all; return 404; }

    # Assets Next.js générés: cache immutable 365 jours.
    location /_next/static/ {
        alias /var/www/ibc/current/.next/static/;
        access_log off;
        expires 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }

    # Fichiers publics versionnés courants.
    location ~* \.(?:jpg|jpeg|png|gif|webp|avif|ico|svg|css|js|mjs|woff|woff2|ttf|otf|eot)$ {
        root /var/www/ibc/current/public;
        access_log off;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
        try_files $uri @nextjs;
    }

    location / {
        try_files $uri @nextjs;
    }

    location @nextjs {
        proxy_pass http://ibc_nextjs;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Port $server_port;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
        proxy_connect_timeout 10s;
    }
}
```

Cette configuration HTTP suffit avant Certbot. Certbot ajoutera automatiquement les blocs TLS et les directives de certificats. Après émission du certificat, vérifier que la redirection non-www → www reste active aussi en HTTPS; sinon, ajuster les blocs HTTPS générés pour conserver le domaine canonique `www.ivoire-business-club.com`.

### 8.2 Activer le site

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sfn /etc/nginx/sites-available/ibc-app /etc/nginx/sites-enabled/ibc-app
sudo nginx -t
sudo systemctl reload nginx
```

### 8.3 Vérifier Nginx avant HTTPS

Avec le DNS déjà pointé vers Hetzner:

```bash
curl -I http://ivoire-business-club.com/
curl -I http://www.ivoire-business-club.com/
```

Résultat attendu:

- `http://ivoire-business-club.com/` retourne `301` vers `http://www.ivoire-business-club.com/`.
- `http://www.ivoire-business-club.com/` retourne `200` ou `302` depuis Next.js.

Si le DNS n'est pas encore propagé, tester depuis une machine locale en forçant la résolution:

```bash
curl -I --resolve ivoire-business-club.com:80:$IBC_IPV4 http://ivoire-business-club.com/
curl -I --resolve www.ivoire-business-club.com:80:$IBC_IPV4 http://www.ivoire-business-club.com/
```

## 9. Activer HTTPS Let's Encrypt

Préconditions:

- `ivoire-business-club.com` pointe vers l'IPv4/IPv6 du VPS Hetzner.
- `www.ivoire-business-club.com` pointe vers les mêmes adresses.
- Les ports `80` et `443` sont ouverts dans Hetzner Firewall et UFW.
- Nginx répond correctement en HTTP.

### 9.1 Émettre le certificat

Sur le VPS:

```bash
sudo certbot --nginx -d www.ivoire-business-club.com -d ivoire-business-club.com
```

Choisir l'option de redirection HTTP → HTTPS si Certbot la propose. L'email d'administration doit être une adresse réellement surveillée. Après émission, vérifier que Certbot a bien conservé le bloc `server_name ivoire-business-club.com` redirigeant 301 vers `www.ivoire-business-club.com` dans les blocs HTTPS.

### 9.2 Vérifier la configuration TLS

```bash
sudo nginx -t
sudo systemctl reload nginx
curl -I https://ivoire-business-club.com/
curl -I https://www.ivoire-business-club.com/
```

Résultat attendu:

- `https://www.ivoire-business-club.com/` retourne `200`, `301` ou `302` selon la route, sans erreur TLS.
- `https://ivoire-business-club.com/` redirige vers `https://www.ivoire-business-club.com/`.
- Les headers applicatifs de sécurité sont présents lorsque la réponse vient de Next.js.

### 9.3 Vérifier le renouvellement automatique

```bash
sudo systemctl list-timers | grep -E 'certbot|snap.certbot'
sudo certbot renew --dry-run
```

Le dry-run doit se terminer sans erreur.

## 10. Vérifications finales

### 10.1 Santé système et services

Sur le VPS:

```bash
pm2 status ibc-app
pm2 describe ibc-app
sudo systemctl status nginx --no-pager
sudo systemctl status postgresql --no-pager
sudo ufw status verbose
```

### 10.2 Vérifications HTTP/HTTPS

Depuis une machine externe ou le VPS:

```bash
curl -I http://ivoire-business-club.com/
curl -I http://www.ivoire-business-club.com/
curl -I https://ivoire-business-club.com/
curl -I https://www.ivoire-business-club.com/
curl -I https://www.ivoire-business-club.com/_next/static/
```

Pour vérifier un asset réel Next.js:

```bash
cd /var/www/ibc/current
ASSET=$(find .next/static -type f \( -name '*.js' -o -name '*.css' \) | head -n 1 | sed 's#^\.next/static#/_next/static#')
echo "$ASSET"
curl -I "https://www.ivoire-business-club.com$ASSET"
```

Le header attendu pour les assets `/_next/static/` contient:

```text
Cache-Control: public, max-age=31536000, immutable
```

### 10.3 Vérifications applicatives

Tester manuellement dans un navigateur:

1. Page d'accueil: `https://www.ivoire-business-club.com/`
2. Redirection non-www: `https://ivoire-business-club.com/` doit finir sur le domaine www.
3. Login Auth.js:
   - vérifier le bouton de connexion;
   - effectuer une connexion Google si configurée;
   - vérifier que le callback OAuth revient sur `https://www.ivoire-business-club.com`.
4. Pages publiques clés du site.
5. Espace membre / dashboard premium avec un compte actif.
6. Pages admin avec un compte autorisé.
7. Flux email transactionnel si Resend est utilisé.
8. Upload ou lecture de fichiers si Cloudflare R2 est utilisé.
9. Fonctionnalités dépendantes de Redis/Upstash si activées.
10. Affichage des informations de virement bancaire si présentes dans l'application.

### 10.4 Vérifications logs

```bash
pm2 logs ibc-app --lines 200
sudo tail -n 200 /var/log/nginx/access.log
sudo tail -n 200 /var/log/nginx/error.log
sudo journalctl -u nginx -n 100 --no-pager
sudo journalctl -u postgresql -n 100 --no-pager
```

Aucune erreur récurrente ne doit apparaître (`500`, erreurs Prisma, erreurs Auth.js callback, erreurs de connexion PostgreSQL, erreurs de permissions sur `.next/static`).

### 10.5 Vérifications base de données

```bash
PGPASSWORD='MOT_DE_PASSE_POSTGRES_IBC' psql -h 127.0.0.1 -U ibc_user -d ibc_prod -c 'SELECT now();'
PGPASSWORD='MOT_DE_PASSE_POSTGRES_IBC' psql -h 127.0.0.1 -U ibc_user -d ibc_prod -c 'SELECT COUNT(*) FROM "_prisma_migrations";'
```

## 11. Rollback

Le rollback revient à réactiver une release précédente. Il ne supprime pas la nouvelle release; il modifie seulement le symlink `/var/www/ibc/current`.

### 11.1 Lister les releases disponibles

Sur le VPS:

```bash
ls -lah /var/www/ibc/releases
readlink -f /var/www/ibc/current
```

Identifier la release précédente, par exemple `/var/www/ibc/releases/20260525120000`.

### 11.2 Rebasculer vers la release précédente

```bash
export PREVIOUS_RELEASE="/var/www/ibc/releases/20260525120000"
test -f "$PREVIOUS_RELEASE/.next/standalone/server.js"
ln -sfn "$PREVIOUS_RELEASE" /var/www/ibc/current
cd /var/www/ibc/current
pm2 reload ibc-app --update-env
sudo nginx -t
sudo systemctl reload nginx
pm2 status ibc-app
```

Vérifier après rollback:

```bash
curl -I https://www.ivoire-business-club.com/
pm2 logs ibc-app --lines 200
sudo tail -n 200 /var/log/nginx/error.log
```

### 11.4 Attention aux migrations

Un rollback applicatif ne rollback pas automatiquement la base PostgreSQL. Si une migration destructive a été appliquée, restaurer un backup PostgreSQL ou exécuter une migration corrective. Avant toute release contenant des migrations risquées:

```bash
mkdir -p /var/www/ibc/backups
pg_dump -h 127.0.0.1 -U ibc_user -d ibc_prod -F c -f /var/www/ibc/backups/ibc_prod_before_release_$(date -u +%Y%m%d%H%M%S).dump
```

## 12. Maintenance et monitoring

### 12.1 Logs applicatifs et système

Commandes courantes:

```bash
pm2 status ibc-app
pm2 logs ibc-app --lines 300
pm2 monit
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
sudo journalctl -u nginx -f
sudo journalctl -u postgresql -f
sudo journalctl -u pm2-deploy -f
```

Les logs PM2 sont aussi disponibles sous le home de `deploy`:

```bash
ls -lah /home/deploy/.pm2/logs
```

### 12.2 Backups PostgreSQL avec `pg_dump`

Créer un répertoire de backups:

```bash
sudo mkdir -p /var/backups/ibc/postgresql
sudo chown deploy:deploy /var/backups/ibc/postgresql
chmod 700 /var/backups/ibc/postgresql
```

Créer un fichier de mot de passe PostgreSQL pour automatiser `pg_dump` sans exposer le mot de passe dans la crontab:

```bash
cat > /home/deploy/.pgpass <<'EOF'
127.0.0.1:5432:ibc_prod:ibc_user:MOT_DE_PASSE_POSTGRES_IBC
EOF
chmod 600 /home/deploy/.pgpass
```

Tester un backup manuel:

```bash
pg_dump -h 127.0.0.1 -U ibc_user -d ibc_prod -F c -f /var/backups/ibc/postgresql/ibc_prod_$(date -u +%Y%m%d%H%M%S).dump
ls -lh /var/backups/ibc/postgresql
```

Installer une tâche cron quotidienne à 02:30 UTC avec rétention de 14 jours:

```bash
crontab -e
```

Ajouter:

```cron
30 2 * * * pg_dump -h 127.0.0.1 -U ibc_user -d ibc_prod -F c -f /var/backups/ibc/postgresql/ibc_prod_$(date -u +\%Y\%m\%d\%H\%M\%S).dump && find /var/backups/ibc/postgresql -type f -name 'ibc_prod_*.dump' -mtime +14 -delete
```

Vérifier la restauration sur un environnement non-production avant de considérer les backups comme valides:

```bash
createdb -h 127.0.0.1 -U ibc_user ibc_restore_test
pg_restore -h 127.0.0.1 -U ibc_user -d ibc_restore_test --clean --if-exists /var/backups/ibc/postgresql/NOM_DU_BACKUP.dump
```

### 12.3 Snapshots Hetzner

Dans Hetzner Cloud Console:

1. Activer les backups automatiques si souhaité.
2. Prendre un snapshot manuel avant les opérations majeures:
   - montée de version Node;
   - montée de version PostgreSQL;
   - migration Prisma importante;
   - changement Nginx/TLS significatif.
3. Nommer les snapshots clairement, par exemple `ibc-prod-before-prisma-migration-YYYYMMDD`.

Les snapshots ne remplacent pas les backups PostgreSQL logiques: conserver les deux.

### 12.4 Mises à jour système avec `unattended-upgrades`

Installer:

```bash
sudo apt install -y unattended-upgrades apt-listchanges
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

Vérifier la configuration:

```bash
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades
sudo nano /etc/apt/apt.conf.d/20auto-upgrades
```

Configuration attendue dans `/etc/apt/apt.conf.d/20auto-upgrades`:

```text
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
```

Contrôler régulièrement:

```bash
sudo unattended-upgrade --dry-run --debug
sudo tail -n 200 /var/log/unattended-upgrades/unattended-upgrades.log
```

### 12.5 Nettoyage des anciennes releases

Conserver les 5 dernières releases et supprimer les plus anciennes:

```bash
cd /var/www/ibc/releases
ls -1dt */ | tail -n +6 | xargs -r rm -rf
```

Ne jamais supprimer la release active:

```bash
readlink -f /var/www/ibc/current
```

### 12.6 Vérification périodique santé production

À exécuter après chaque déploiement et au moins une fois par semaine:

```bash
curl -fsS https://www.ivoire-business-club.com/ >/dev/null && echo "IBC HTTPS OK"
curl -fsSI https://ivoire-business-club.com/ 2>&1 | grep -E '^location: https://www\.ivoire-business-club\.com' && echo "IBC www redirect OK"
pm2 status ibc-app
sudo certbot certificates
sudo certbot renew --dry-run
PGPASSWORD='MOT_DE_PASSE_POSTGRES_IBC' psql -h 127.0.0.1 -U ibc_user -d ibc_prod -c 'SELECT now();'
df -h
free -h
```

Sur un CX33 avec 8 GB RAM, surveiller particulièrement:

- consommation mémoire PM2 par worker;
- redémarrages `max_memory_restart=500M`;
- espace disque utilisé par logs, backups et anciennes releases;
- latence PostgreSQL locale;
- erreurs Auth.js liées aux callbacks OAuth ou cookies sécurisés.

### 12.7 Procédure standard de redéploiement ultérieur

Pour chaque nouvelle version:

```powershell
npm ci
npm run deploy:prod
```

Si `.env` n'est pas copié automatiquement depuis la release précédente, recréer `/var/www/ibc/current/.env` depuis `.env.example` et les secrets de production avant de relancer le script ou de lancer Prisma/PM2 manuellement.

---

## TODO Post-Déploiement

Ce qui reste à configurer ou corriger après le premier déploiement (2026-05-25).

### P0 — Login Google OAuth cassé

- **Problème** : Auth.js `PrismaAdapter` envoie `emailVerified: null` lors du login Google, mais le schéma Prisma exige `emailVerified Boolean @default(false)` (non-nullable). Conséquence : `PrismaClientValidationError: Argument emailVerified must not be null`.
- **Fix en cours** : `patchPrismaAdapter` dans `src/lib/auth.ts` intercepte `createUser` pour remplacer `null` par `false`. Déployé mais ne fonctionne pas encore — le PrismaAdapter appelle peut-être `createUser` différemment ou le build standalone n'inclut pas le patch correctement.
- **Alternative** : Rendre `emailVerified` nullable dans le schéma (`Boolean?`) avec une migration, ou utiliser un custom adapter qui nettoie les données avant l'insertion Prisma.
- **Fichiers** : `src/lib/auth.ts`, `prisma/schema.prisma`

### P1 — Variables `.env` vides (fonctionnalités désactivées)

| Variable | Impact |
|---|---|
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` | Upload de fichiers désactivé (documents, photos de profil) |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Emails transactionnels désactivés (confirmation, reset mot de passe, notifications) |
| `BANK_TRANSFER_IBAN`, `BANK_TRANSFER_BIC`, `BANK_TRANSFER_BANK_ADDRESS` | Infos virement bancaire manquantes sur la page paiement |

### P2 — Variables `.env` vides (confort)

| Variable | Impact |
|---|---|
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Rate limiting désactivé (avertissement dans les logs, non bloquant) |
| `SUPPORT_WHATSAPP_NUMBER` | Lien WhatsApp support manquant |

### P2 — Optimisations et nettoyage serveur

- [ ] Montrer les TTL DNS de 300s à 3600s une fois la migration stabilisée (réduit la charge DNS)
- [ ] Configurer `pm2-logrotate` pour la rotation des logs applicatifs
- [ ] Nettoyer l'ancienne release `/var/www/ibc/releases/20260525205929/` une fois la nouvelle validée
- [ ] Configurer les backups PostgreSQL (pg_dump cron ou Hetzner snapshot)
- [ ] Ajouter un monitoring minimum (uptime check, alerte si PM2 crash loop)

### Notes runbook vs réalité terrain

- Le déploiement automatisé copie le `.env` depuis la release précédente avec `cp`, puis applique `chmod 600`.
- Le paquet de production embarque `prisma/schema.prisma` et `prisma/migrations-postgresql`; `prisma.config.ts` sélectionne donc PostgreSQL quand `DATABASE_URL` est celui de production.
- Si PM2 est supprimé puis recréé au lieu d'être rechargé, vérifier que le runtime standalone lit bien les variables de production attendues.
