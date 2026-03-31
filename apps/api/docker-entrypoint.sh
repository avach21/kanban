#!/bin/sh
set -eu

cd /app

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL must be set before starting the API container."
  exit 1
fi

attempt=1
max_attempts="${DB_MIGRATE_MAX_ATTEMPTS:-20}"

until bun run db:migrate; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "Database migrations failed after $attempt attempts."
    exit 1
  fi

  echo "Database not ready yet. Retrying migrations ($attempt/$max_attempts)..."
  attempt=$((attempt + 1))
  sleep 2
done

cd /app/apps/api
exec "$@"
