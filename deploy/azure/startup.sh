#!/bin/bash
# App Service startup command for the H-Fleet demo instance.
#
# Set this as the Startup Command on the Web App:
#   bash deploy/azure/startup.sh
#
# App Service gives us one writable path that survives a restart or a redeploy:
# /home. Everything else is replaced wholesale on deploy, so the database lives
# in /home/data and the app directory stays disposable.
set -euo pipefail

DATA_DIR=${HFLEET_DATA_DIR:-/home/data}
mkdir -p "$DATA_DIR"
export DATABASE_URL="file:${DATA_DIR}/hfleet.db"

echo "H-Fleet starting — database ${DATABASE_URL}"

# Bring the schema up to date. Safe on every boot: applies only what's missing,
# and does nothing at all once the database is current.
npx prisma migrate deploy

# Seed once. A restart must not wipe whatever was demonstrated last week, so
# this only fires on an empty database — the reset path is deliberate and
# manual (see deploy/AZURE.md).
if [ "$(npx tsx deploy/azure/is-seeded.ts)" = "empty" ]; then
  echo "Empty database — seeding."
  if [ "${SEED_ANONYMISE:-}" != "1" ]; then
    # The seed would otherwise load 194 real employees onto a reachable URL.
    echo "REFUSING TO SEED: SEED_ANONYMISE is not set to 1." >&2
    echo "Set it in the Web App's Environment variables, then restart." >&2
    exit 1
  fi
  npx tsx prisma/seed.ts
else
  echo "Database already seeded — leaving it alone."
fi

# App Service routes to whatever port it hands us in $PORT.
exec npm run start
