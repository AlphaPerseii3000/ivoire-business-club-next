$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host $Message
}

function Assert-Path {
  param([string]$Path)
  if (-not (Test-Path $Path)) {
    throw "Chemin requis manquant: $Path"
  }
  Write-Host "  OK $Path"
}

Write-Host "IBC - Preparation du deploiement production..."

Write-Step "Regeneration du Prisma Client en mode PostgreSQL..."
$env:PRISMA_SCHEMA = "prisma/schema.prisma"
$env:DATABASE_URL = "postgresql://deploy:deploy@localhost:5432/ibc_deploy"
npx prisma generate
Write-Host "  OK Prisma Client regenere avec provider=postgresql."

Write-Step "Build Next.js standalone avec Prisma Client PostgreSQL..."
npx next build
Write-Host "  OK Build Next.js standalone reussi."

Assert-Path ".next/standalone/server.js"
Assert-Path ".next/static"

Write-Step "Assemblage de deploy-dist..."
if (Test-Path "deploy-dist") {
  Remove-Item -Recurse -Force "deploy-dist"
}

New-Item -ItemType Directory -Force `
  "deploy-dist/.next/standalone", `
  "deploy-dist/.next/static", `
  "deploy-dist/logs" | Out-Null

Copy-Item -Recurse -Force ".next/standalone/*" "deploy-dist/.next/standalone/"
Copy-Item -Recurse -Force ".next/static/*" "deploy-dist/.next/static/"

if (Test-Path "public") {
  Copy-Item -Recurse -Force "public" "deploy-dist/public"
} else {
  New-Item -ItemType Directory -Force "deploy-dist/public" | Out-Null
}

$ConfigFiles = @(
  "ecosystem.config.js",
  "prisma.config.ts",
  "package.json",
  "package-lock.json",
  ".env.example"
)
Copy-Item -Path $ConfigFiles -Destination "deploy-dist/" -Force

New-Item -ItemType Directory -Force "deploy-dist/prisma" | Out-Null
Copy-Item -Force "prisma/schema.prisma" "deploy-dist/prisma/schema.prisma"
Copy-Item -Recurse -Force "prisma/migrations-postgresql" "deploy-dist/prisma/migrations-postgresql"

Write-Step "Verification absence de secrets et bases locales..."
Get-ChildItem -Path "deploy-dist" -Recurse -Force -File |
  Where-Object {
    $_.Name -in @(".env", ".env.local") -or
    $_.Name -like ".env.*.local" -or
    $_.Name -like "*.db" -or
    $_.Name -like "*.sqlite" -or
    $_.Name -like "*.sqlite3"
  } |
  Remove-Item -Force

$ForbiddenFiles = Get-ChildItem -Path "deploy-dist" -Recurse -Force -File |
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
Write-Host "  OK Aucun secret local ni base locale."

Write-Step 'Verification Prisma production: absence de activeProvider:"sqlite"...'
$SqliteProvider = Get-ChildItem -Path "deploy-dist/.next/standalone" -Recurse -Force -File |
  Select-String -Pattern 'activeProvider:"sqlite"' -ErrorAction SilentlyContinue

if ($SqliteProvider) {
  $SqliteProvider | Select-Object -First 10
  throw 'deploy-dist contient activeProvider:"sqlite".'
}
Write-Host '  OK Aucun activeProvider:"sqlite" trouve.'

Write-Step "Controles principaux..."
foreach ($Path in @(
  "deploy-dist/.next/standalone/server.js",
  "deploy-dist/.next/static",
  "deploy-dist/public",
  "deploy-dist/ecosystem.config.js",
  "deploy-dist/.env.example",
  "deploy-dist/prisma/schema.prisma",
  "deploy-dist/prisma/migrations-postgresql",
  "deploy-dist/prisma.config.ts",
  "deploy-dist/logs"
)) {
  Assert-Path $Path
}

$TotalBytes = (Get-ChildItem -Path "deploy-dist" -Recurse -Force -File | Measure-Object Length -Sum).Sum
Write-Host ""
Write-Host "deploy-dist bytes: $TotalBytes"

Write-Step "Restauration du Prisma Client SQLite pour le developpement local..."
Remove-Item Env:PRISMA_SCHEMA -ErrorAction SilentlyContinue
$env:DATABASE_URL = "file:$((Get-Location).Path.Replace('\', '/'))/prisma/dev.db"
npx prisma generate
Write-Host "  OK Prisma Client SQLite restaure pour le developpement."

Write-Host ""
Write-Host "Paquet de deploiement pret dans deploy-dist/"
