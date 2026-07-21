#!/usr/bin/env sh
# Sauvegarde de la base de production (à planifier via cron, ex. quotidien).
#   0 3 * * *  cd /opt/eclolink && ./scripts/backup.sh >> /var/log/eclolink-backup.log 2>&1
set -e

OUT_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$OUT_DIR"

# shellcheck disable=SC1091
[ -f .env ] && . ./.env

STAMP=$(date +%Y%m%d_%H%M%S)
FILE="$OUT_DIR/eclolink_${STAMP}.sql.gz"

docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U "${POSTGRES_USER:-eclolink}" "${POSTGRES_DB:-eclolink}" | gzip > "$FILE"

echo "Backup écrit : $FILE"

# Rétention : supprime les sauvegardes de plus de 30 jours.
find "$OUT_DIR" -name 'eclolink_*.sql.gz' -mtime +30 -delete
