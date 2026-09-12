#!/bin/sh
set -e
umask 077

CONFIG_DIR="/app/config"
mkdir -p "$CONFIG_DIR"
chmod 700 "$CONFIG_DIR"
# Repair permissions on existing secrets, databases, journals, and backups.
for runtime_file in "$CONFIG_DIR"/.*_secret "$CONFIG_DIR"/*.db "$CONFIG_DIR"/*.db-* "$CONFIG_DIR"/*.db.*; do
    if [ -f "$runtime_file" ]; then
        chmod 600 "$runtime_file"
    fi
done
SECRET_FILE="$CONFIG_DIR/.nextauth_secret"
CONFIG_ENCRYPTION_SECRET_FILE="$CONFIG_DIR/.config_encryption_secret"
BOOTSTRAP_SECRET_FILE="$CONFIG_DIR/.bootstrap_secret"

if [ -z "${NEXTAUTH_SECRET:-}" ]; then
    if [ ! -f "$SECRET_FILE" ]; then
        echo "Generating NEXTAUTH_SECRET..."
        head -c 32 /dev/urandom | base64 > "$SECRET_FILE"
    fi
    chmod 600 "$SECRET_FILE"
    export NEXTAUTH_SECRET=$(cat "$SECRET_FILE")
fi

if [ -z "${CONFIG_ENCRYPTION_SECRET:-}" ]; then
    if [ ! -f "$CONFIG_ENCRYPTION_SECRET_FILE" ]; then
        echo "Generating CONFIG_ENCRYPTION_SECRET..."
        head -c 32 /dev/urandom | base64 > "$CONFIG_ENCRYPTION_SECRET_FILE"
    fi
    chmod 600 "$CONFIG_ENCRYPTION_SECRET_FILE"
    export CONFIG_ENCRYPTION_SECRET=$(cat "$CONFIG_ENCRYPTION_SECRET_FILE")
fi

if [ -z "${BOOTSTRAP_SECRET:-}" ]; then
    if [ ! -f "$BOOTSTRAP_SECRET_FILE" ]; then
        echo "Generating persistent bootstrap secret..."
        head -c 32 /dev/urandom | base64 > "$BOOTSTRAP_SECRET_FILE"
    fi
    chmod 600 "$BOOTSTRAP_SECRET_FILE"
    export BOOTSTRAP_SECRET=$(cat "$BOOTSTRAP_SECRET_FILE")
fi

echo "Running database migrations..."
prisma db push --skip-generate

echo "Starting dotHome..."
exec node server.js
