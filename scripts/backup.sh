#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# ESTANDE LIVRE — Backup manual do banco (plano free do Supabase)
# ═══════════════════════════════════════════════════════════════════
#
# O plano free do Supabase NÃO faz backup automático diário (isso só
# existe no plano Pro). Este script tira um dump completo do banco
# usando pg_dump, pra você guardar em algum lugar seguro.
#
# Uso local:
#   export DATABASE_URL="postgresql://postgres:[SENHA]@db.[REF].supabase.co:5432/postgres"
#   ./scripts/backup.sh
#
# Onde achar a DATABASE_URL:
#   Painel do Supabase → Project Settings → Database → Connection string → URI
#
# Requer o cliente `pg_dump` instalado (vem com o PostgreSQL):
#   macOS:   brew install libpq && brew link --force libpq
#   Ubuntu:  sudo apt install postgresql-client
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Erro: defina a variável DATABASE_URL antes de rodar este script."
  echo "Veja instruções no topo deste arquivo."
  exit 1
fi

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
OUT_DIR="${BACKUP_DIR:-./backups}"
OUT_FILE="${OUT_DIR}/estande-livre-${TIMESTAMP}.dump"

mkdir -p "$OUT_DIR"

echo "Gerando backup em ${OUT_FILE}…"
pg_dump "$DATABASE_URL" -F c -f "$OUT_FILE"

echo "Backup concluído: ${OUT_FILE}"
echo "Para restaurar: pg_restore -d \"\$DATABASE_URL\" --clean --if-exists \"${OUT_FILE}\""

# Mantém só os 10 backups mais recentes na pasta local, pra não lotar o disco
ls -1t "${OUT_DIR}"/estande-livre-*.dump 2>/dev/null | tail -n +11 | xargs -r rm --
