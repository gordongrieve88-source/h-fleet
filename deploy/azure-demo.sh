#!/usr/bin/env bash
# Deploy the hosted demo to Azure App Service (h-fleet-demo.azurewebsites.net).
#
# Pattern shared with mrp-review-demo / h-crew-demo: build locally, zip, push —
# never let Kudu build (F1 can't). Unlike the siblings (Neon Postgres), the
# demo database is the SQLite file itself, seeded fresh here and shipped
# INSIDE the zip — so every deploy resets the demo data, and the app needs
# no database service at all.
#
# Requirements: az CLI logged in to the subscription holding mrp-demo-rg.
set -euo pipefail

APP=h-fleet-demo
RG=mrp-demo-rg
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="$(mktemp -d)/bundle"
BS3_VERSION=$(node -p "require('$ROOT/node_modules/better-sqlite3/package.json').version")

cd "$ROOT"
npm run build

# The standalone bundle nests under Projects/h-fleet because Next infers the
# workspace root from a stray lockfile in $HOME; flatten it.
mkdir -p "$STAGE"
cp -R "$ROOT/.next/standalone/Projects/h-fleet/." "$STAGE/"
cp -R "$ROOT/.next/static" "$STAGE/.next/static"
cp -R "$ROOT/public" "$STAGE/public"

# Fresh demo data, shipped in the zip. SEED_ANONYMISE is non-negotiable: the
# real seed's drivers are real employees (see deploy/AZURE.md — "The data"),
# and this database is about to be on the internet. The bundle itself carries
# no real names either way — the app never imports prisma/seed-data, so the
# standalone trace leaves the source file out of the zip.
mkdir -p "$STAGE/prisma"
DATABASE_URL="file:$STAGE/prisma/dev.db" npx prisma migrate deploy
SEED_ANONYMISE=1 DATABASE_URL="file:$STAGE/prisma/dev.db" npx tsx prisma/seed.ts

# The Mac-built native module won't load on App Service — swap in the
# linux-x64 prebuild for the same version (Node 22 = ABI 127).
curl -fsSL -o /tmp/bs3-linux.tar.gz \
  "https://github.com/WiseLibs/better-sqlite3/releases/download/v${BS3_VERSION}/better-sqlite3-v${BS3_VERSION}-node-v127-linux-x64.tar.gz"
tar xzf /tmp/bs3-linux.tar.gz -C /tmp
cp /tmp/build/Release/better_sqlite3.node \
  "$STAGE/node_modules/better-sqlite3/build/Release/better_sqlite3.node"

# Turbopack's externalized-module aliases in .next/node_modules are relative
# symlinks that broke when we flattened the bundle; replace them with real
# copies of the modules they point at.
for link in $(find "$STAGE/.next/node_modules" -type l); do
  target=$(basename "$link" | sed -E 's/-[0-9a-f]{16}$//')
  scope=$(basename "$(dirname "$link")")
  rm "$link"
  case "$scope" in
    node_modules) cp -R "$STAGE/node_modules/$target" "$link" ;;
    *)            cp -R "$STAGE/node_modules/$scope/$target" "$link" ;;
  esac
done
test -z "$(find "$STAGE" -type l)" || { echo "symlinks remain in bundle"; exit 1; }

# Boot shim: first boot copies the seeded db to /home/data (persistent);
# later deploys leave the live data alone.
cp "$ROOT/deploy/azure-boot.js" "$STAGE/boot.js"

ZIP="$(dirname "$STAGE")/h-fleet-demo.zip"
(cd "$STAGE" && zip -qr "$ZIP" .)
az webapp deploy -g "$RG" -n "$APP" --src-path "$ZIP" --type zip --timeout 600000

sleep 10
curl -sf -m 90 "https://$APP.azurewebsites.net/api/health" && echo " — deployed OK"
