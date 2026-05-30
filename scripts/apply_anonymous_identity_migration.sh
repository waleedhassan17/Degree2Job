#!/usr/bin/env bash
set -euo pipefail

MIGRATION_FILE="${1:-$(cd "$(dirname "$0")/.." && pwd)/supabase/deploy_anonymous_identity.sql}"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required"
  echo "Usage: DATABASE_URL='postgresql://...' $0 [path/to/sql-file]"
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "node is not installed or not on PATH"
  exit 1
fi

if [[ ! -f "$MIGRATION_FILE" ]]; then
  echo "Migration file not found: $MIGRATION_FILE"
  exit 1
fi

echo "Applying anonymous identity migration: $MIGRATION_FILE"
node "$(cd "$(dirname "$0")/.." && pwd)/scripts/apply_anonymous_identity_migration.mjs" "$MIGRATION_FILE"
