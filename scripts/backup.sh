#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# ESTANTE LIVRE — Backup manual do banco (plano free do Supabase)
# ═══════════════════════════════════════════════════════════════════
#
# O plano free do Supabase NÃO faz backup automático diário (isso só
# existe no plano Pro). Este script tira um dump completo do banco
# usando pg_dump, pra você guardar em algum lugar seguro.
#
# Uso local:
#   export DATABASE_URL="postgresql://postgres.[REF]:[SENHA]@aws-0-xxxxx.pooler.supabase.com:5432/postgres"
#   ./scripts/backup.sh
#
# Onde achar a DATABASE_URL:
#   Painel do Supabase → botão "Connect" (topo da página) → aba "Direct"
#   → "Session pooler" → copie a URI, com a senha real no lugar de
#   [YOUR-PASSWORD]. Repare que o usuário vem como "postgres.SEU_REF",
#   não só "postgres" — isso é obrigatório pra conexão via pooler.
#
# Requer o cliente `pg_dump` na versão 17 (o Supabase roda Postgres 17;
# uma versão mais antiga do pg_dump recusa conectar em servidor mais
# novo que ele):
#   macOS:   brew install libpq@17 && brew link --force libpq@17
#   Ubuntu:  sudo apt-get install postgresql-common && \
#            sudo /usr/share/postgresql-common/pgdg/apt.postgresqlorg.sh -y && \
#            sudo apt-get install postgresql-client-17
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Erro: defina a variável DATABASE_URL antes de rodar este script."
  echo "Veja instruções no topo deste arquivo."
  exit 1
fi

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
OUT_DIR="${BACKUP_DIR:-./backups}"
OUT_FILE="${OUT_DIR}/estante-livre-${TIMESTAMP}.dump"

mkdir -p "$OUT_DIR"

echo "Gerando backup em ${OUT_FILE}…"
pg_dump "$DATABASE_URL" -F c -f "$OUT_FILE"

echo "Backup concluído: ${OUT_FILE}"
echo "Para restaurar: pg_restore -d \"\$DATABASE_URL\" --clean --if-exists \"${OUT_FILE}\""

# Mantém só os 10 backups mais recentes na pasta local, pra não lotar o disco
ls -1t "${OUT_DIR}"/estante-livre-*.dump 2>/dev/null | tail -n +11 | xargs -r rm --
