param(
  [string]$HostName = "ivoire-business-club.com",
  [string]$User = "deploy",
  [string]$RemoteRoot = "/var/www/ibc",
  [string]$ArtifactPath = "deploy.tar.gz",
  [switch]$SkipPrepare
)

$ErrorActionPreference = "Stop"

function Invoke-Step {
  param(
    [string]$Label,
    [scriptblock]$Command
  )

  Write-Host ""
  Write-Host "==> $Label"
  & $Command
}

$Release = (Get-Date).ToUniversalTime().ToString("yyyyMMddHHmmss")
$Remote = "$User@$HostName"
$RemoteArtifact = "/tmp/ibc-$Release.tar.gz"
$RemoteScript = @"
set -eu
RELEASE="$Release"
REMOTE_ROOT="$RemoteRoot"
PREVIOUS="`$(readlink -f "`$REMOTE_ROOT/current" 2>/dev/null || true)"
NEW="`$REMOTE_ROOT/releases/`$RELEASE"

test -f "`$NEW/.next/standalone/server.js"
ln -sfn "`$NEW" "`$REMOTE_ROOT/current"
cd "`$REMOTE_ROOT/current"

# Ensure the shared uploads directory exists
mkdir -p "`$REMOTE_ROOT/shared/uploads"

# Symlink the shared uploads into the release public folder
rm -rf public/uploads
ln -sfn "`$REMOTE_ROOT/shared/uploads" public/uploads

# Symlink the shared uploads into Next.js standalone public folder if it exists
if [ -d .next/standalone/public ]; then
  rm -rf .next/standalone/public/uploads
  ln -sfn "`$REMOTE_ROOT/shared/uploads" .next/standalone/public/uploads
fi

if [ -n "`$PREVIOUS" ] && [ -f "`$PREVIOUS/.env" ]; then
  cp "`$PREVIOUS/.env" .env
fi

test -f .env
chmod 600 .env
npm ci --omit=dev
npx prisma validate
npx prisma migrate deploy
pm2 delete ibc-app || true
pm2 start ecosystem.config.js
pm2 save
sudo nginx -t
sudo systemctl reload nginx
readlink -f "`$REMOTE_ROOT/current"
pm2 status ibc-app
"@

Invoke-Step "Verification des outils" {
  foreach ($Tool in @("npm", "tar", "ssh", "scp")) {
    if (-not (Get-Command $Tool -ErrorAction SilentlyContinue)) {
      throw "Outil introuvable: $Tool"
    }
  }
}

if (-not $SkipPrepare) {
  Invoke-Step "Preparation de l'artefact production" {
    npm run prepare-deploy
  }
}

Invoke-Step "Verification de deploy-dist" {
  $RequiredPaths = @(
    "deploy-dist/.next/standalone/server.js",
    "deploy-dist/.next/static",
    "deploy-dist/public",
    "deploy-dist/ecosystem.config.js",
    "deploy-dist/.env.example",
    "deploy-dist/prisma/schema.prisma",
    "deploy-dist/prisma/migrations-postgresql",
    "deploy-dist/prisma.config.ts",
    "deploy-dist/logs"
  )

  foreach ($Path in $RequiredPaths) {
    if (-not (Test-Path $Path)) {
      throw "Artefact incomplet, chemin manquant: $Path"
    }
  }

  $ForbiddenFiles = Get-ChildItem -Path deploy-dist -Recurse -Force -File |
    Where-Object {
      $_.Name -in @(".env", ".env.local") -or
      $_.Name -like ".env.*.local" -or
      $_.Name -like "*.db" -or
      $_.Name -like "*.sqlite" -or
      $_.Name -like "*.sqlite3"
    }

  if ($ForbiddenFiles) {
    $ForbiddenFiles | Select-Object -ExpandProperty FullName
    throw "deploy-dist contient un secret local ou une base locale."
  }

  $SqliteProvider = Get-ChildItem -Path "deploy-dist/.next/standalone" -Recurse -Force -File |
    Select-String -Pattern 'activeProvider:"sqlite"' -ErrorAction SilentlyContinue

  if ($SqliteProvider) {
    $SqliteProvider | Select-Object -First 10
    throw 'deploy-dist contient activeProvider:"sqlite".'
  }
}

Invoke-Step "Creation de la release distante $Release" {
  ssh $Remote "mkdir -p '$RemoteRoot/releases/$Release'"
}

Invoke-Step "Compression et transfert" {
  if (Test-Path $ArtifactPath) {
    Remove-Item -Force $ArtifactPath
  }

  tar -C deploy-dist -czf $ArtifactPath .
  scp $ArtifactPath "${Remote}:$RemoteArtifact"
  ssh $Remote "tar -xzf '$RemoteArtifact' -C '$RemoteRoot/releases/$Release' && rm '$RemoteArtifact'"
}

Invoke-Step "Activation de la release" {
  ($RemoteScript -replace "`r`n", "`n") | ssh $Remote "bash -s"
}

Invoke-Step "Verification HTTPS publique" {
  curl.exe -I "https://ivoire-business-club.com/"
  curl.exe -I "https://www.ivoire-business-club.com/"
}

Write-Host ""
Write-Host "Deploiement termine. Release active: $Release"
