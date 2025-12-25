#!/bin/bash
set -euo pipefail

# Backup Script for Grok Trading Bot
# Run daily via cron: 0 2 * * * /opt/grok-trading/scripts/backup.sh

BACKUP_DIR="/opt/grok-trading/backups"
APP_DIR="/opt/grok-trading"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup..."

# Backup Docker volumes
echo "Backing up Docker volumes..."
docker run --rm \
    -v grok-trading_uptime_kuma_data:/source:ro \
    -v "$BACKUP_DIR":/backup \
    alpine tar -czf "/backup/uptime_kuma_$DATE.tar.gz" -C /source .

# Backup environment file (encrypted)
echo "Backing up configuration..."
if [ -f "$APP_DIR/.env" ]; then
    cp "$APP_DIR/.env" "$BACKUP_DIR/env_$DATE.bak"
    chmod 600 "$BACKUP_DIR/env_$DATE.bak"
fi

# Backup trading data if exists
if [ -d "$APP_DIR/data" ]; then
    tar -czf "$BACKUP_DIR/data_$DATE.tar.gz" -C "$APP_DIR" data
fi

# Backup logs
if [ -d "$APP_DIR/logs" ]; then
    tar -czf "$BACKUP_DIR/logs_$DATE.tar.gz" -C "$APP_DIR" logs
fi

# Create combined backup archive
echo "Creating combined backup..."
COMBINED_BACKUP="$BACKUP_DIR/grok_trading_backup_$DATE.tar.gz"
tar -czf "$COMBINED_BACKUP" \
    -C "$BACKUP_DIR" \
    $(ls -1 "$BACKUP_DIR" | grep "_$DATE" | grep -v "grok_trading_backup")

# Calculate checksum
sha256sum "$COMBINED_BACKUP" > "$COMBINED_BACKUP.sha256"

# Cleanup individual backup files (keep combined only)
rm -f "$BACKUP_DIR"/*_$DATE.tar.gz "$BACKUP_DIR"/*_$DATE.bak 2>/dev/null || true

# Remove old backups
echo "Cleaning up old backups..."
find "$BACKUP_DIR" -name "grok_trading_backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.sha256" -mtime +$RETENTION_DAYS -delete

# List current backups
echo ""
echo "Current backups:"
ls -lh "$BACKUP_DIR"/grok_trading_backup_*.tar.gz 2>/dev/null || echo "No backups found"

# Calculate total backup size
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
echo ""
echo "Total backup size: $TOTAL_SIZE"

echo ""
echo "[$(date)] Backup completed: $COMBINED_BACKUP"
