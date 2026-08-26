#!/bin/sh
set -e

CONFIG_DIR="/app/config"
mkdir -p "$CONFIG_DIR"
SECRET_FILE="$CONFIG_DIR/.nextauth_secret"
CONFIG_ENCRYPTION_SECRET_FILE="$CONFIG_DIR/.config_encryption_secret"

if [ ! -f "$SECRET_FILE" ]; then
    echo "Generating NEXTAUTH_SECRET..."
    head -c 32 /dev/urandom | base64 > "$SECRET_FILE"
fi

export NEXTAUTH_SECRET=$(cat "$SECRET_FILE")

if [ -z "${CONFIG_ENCRYPTION_SECRET:-}" ]; then
    if [ ! -f "$CONFIG_ENCRYPTION_SECRET_FILE" ]; then
        echo "Generating CONFIG_ENCRYPTION_SECRET..."
        head -c 32 /dev/urandom | base64 > "$CONFIG_ENCRYPTION_SECRET_FILE"
    fi
    chmod 600 "$CONFIG_ENCRYPTION_SECRET_FILE"
    export CONFIG_ENCRYPTION_SECRET=$(cat "$CONFIG_ENCRYPTION_SECRET_FILE")
fi

echo "Running database migrations..."
prisma db push --skip-generate

echo "Starting dotHome..."
exec node server.js
