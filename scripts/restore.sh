#!/bin/bash
set -euo pipefail

# Restore Script for Grok Trading Bot

BACKUP_DIR="/opt/grok-trading/backups"
APP_DIR="/opt/grok-trading"

# Check for backup file argument
if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup_file.tar.gz>"
    echo ""
    echo "Available backups:"
    ls -lh "$BACKUP_DIR"/grok_trading_backup_*.tar.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE="$1"

# Check if file exists
if [ ! -f "$BACKUP_FILE" ]; then
    # Try with full path
    if [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
        BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILE"
    else
        echo "Error: Backup file not found: $BACKUP_FILE"
        exit 1
    fi
fi

# Verify checksum if available
CHECKSUM_FILE="$BACKUP_FILE.sha256"
if [ -f "$CHECKSUM_FILE" ]; then
    echo "Verifying backup integrity..."
    if sha256sum -c "$CHECKSUM_FILE"; then
        echo "Checksum verified."
    else
        echo "Error: Checksum verification failed!"
        exit 1
    fi
fi

echo ""
echo "WARNING: This will restore from: $BACKUP_FILE"
echo "Current data will be overwritten!"
read -p "Continue? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

# Create temp restore directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

echo ""
echo "Extracting backup..."
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

# Stop services
echo "Stopping services..."
cd "$APP_DIR"
docker compose -f docker-compose.prod.yml down || true

# Restore environment file
if [ -f "$TEMP_DIR"/*.bak ]; then
    echo "Restoring configuration..."
    cp "$TEMP_DIR"/*.bak "$APP_DIR/.env"
    chmod 600 "$APP_DIR/.env"
fi

# Restore Docker volumes
if [ -f "$TEMP_DIR/uptime_kuma_"*.tar.gz ]; then
    echo "Restoring Uptime Kuma data..."
    docker run --rm \
        -v grok-trading_uptime_kuma_data:/target \
        -v "$TEMP_DIR":/backup \
        alpine sh -c "rm -rf /target/* && tar -xzf /backup/uptime_kuma_*.tar.gz -C /target"
fi

# Restore data directory
if [ -f "$TEMP_DIR/data_"*.tar.gz ]; then
    echo "Restoring data directory..."
    tar -xzf "$TEMP_DIR"/data_*.tar.gz -C "$APP_DIR"
fi

# Start services
echo "Starting services..."
docker compose -f docker-compose.prod.yml up -d

echo ""
echo "Restore completed!"
echo "Check service status: docker compose -f docker-compose.prod.yml ps"
