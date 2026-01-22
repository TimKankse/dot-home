#!/bin/sh
set -e

CONFIG_DIR="/app/config"
mkdir -p "$CONFIG_DIR"
SECRET_FILE="$CONFIG_DIR/.nextauth_secret"

if [ ! -f "$SECRET_FILE" ]; then
    echo "Generating NEXTAUTH_SECRET..."
    head -c 32 /dev/urandom | base64 > "$SECRET_FILE"
fi

export NEXTAUTH_SECRET=$(cat "$SECRET_FILE")

echo "Running database migrations..."
prisma db push --skip-generate --accept-data-loss

echo "Starting dotHome..."
exec node server.js
