#!/usr/bin/env bash
# Backup e restauração dos dados locais do TickTask.
#
#   ./ticktask-backup.sh backup            cria um snapshot novo ao lado deste script
#   ./ticktask-backup.sh list              lista os snapshots
#   ./ticktask-backup.sh restore [pasta]   restaura o snapshot indicado (padrão: o mais recente)
#
# Variáveis opcionais:
#   TICKTASK_DATA_DIR     pasta de dados do app (padrão: ~/.config/ticktask)
#   TICKTASK_BACKUP_ROOT  onde ficam os snapshots (padrão: a pasta deste script)

set -euo pipefail

DATA_DIR="${TICKTASK_DATA_DIR:-$HOME/.config/ticktask}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_ROOT="${TICKTASK_BACKUP_ROOT:-$SCRIPT_DIR}"

DB_FILE="ticktask.db"
CONFIG_FILES=(notion-config.json mcp-config.json)
ASSET_DIRS=(notes-assets drawings)

die() { echo "ERRO: $*" >&2; exit 1; }
info() { echo "==> $*"; }

require_python() {
  command -v python3 >/dev/null || die "python3 não encontrado (necessário para copiar o banco com segurança)."
  python3 -c "import sqlite3" 2>/dev/null || die "o python3 instalado não tem o módulo sqlite3."
}

# Usa a API de backup do SQLite: gera uma cópia consistente mesmo com o app aberto,
# já incorporando o conteúdo do arquivo -wal.
sqlite_backup() {
  python3 - "$1" "$2" <<'PY'
import sqlite3, sys
src_path, dst_path = sys.argv[1], sys.argv[2]
src = sqlite3.connect(src_path, timeout=30)
dst = sqlite3.connect(dst_path)
src.backup(dst)
src.close()
dst.execute("PRAGMA journal_mode=DELETE")
dst.close()
PY
}

# Imprime "ok|<tasks>|<projetos>|<entradas de tempo>" ou falha.
sqlite_check() {
  python3 - "$1" <<'PY'
import sqlite3, sys
con = sqlite3.connect(f"file:{sys.argv[1]}?mode=ro&immutable=1", uri=True)
result = con.execute("PRAGMA integrity_check").fetchone()[0]
if result != "ok":
    print(result)
    sys.exit(1)
def count(table):
    try:
        return con.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
    except sqlite3.Error:
        return "?"
print(f"ok|{count('tasks')}|{count('projects')}|{count('time_entries')}")
PY
}

app_running() {
  if [[ "$DATA_DIR" == "$HOME/.config/ticktask" ]] && pgrep -x ticktask >/dev/null 2>&1; then
    return 0
  fi
  local lock="$DATA_DIR/SingletonLock"
  if [[ -L "$lock" ]]; then
    local target pid host
    target="$(readlink "$lock")"
    host="${target%-*}"
    pid="${target##*-}"
    [[ "$host" == "$(hostname)" ]] && kill -0 "$pid" 2>/dev/null && return 0
  fi
  return 1
}

list_snapshots() {
  find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -name '20[0-9][0-9]-*' ! -name '*.partial' -printf '%f\n' 2>/dev/null | sort
}

cmd_backup() {
  require_python
  [[ -f "$DATA_DIR/$DB_FILE" ]] || die "banco não encontrado em $DATA_DIR/$DB_FILE"

  local stamp dest tmp
  stamp="$(date +%Y-%m-%d_%H%M%S)"
  dest="$BACKUP_ROOT/$stamp"
  tmp="$dest.partial"

  mkdir -p "$BACKUP_ROOT"
  chmod 700 "$BACKUP_ROOT"
  rm -rf "$tmp"
  mkdir -m 700 "$tmp"
  trap 'rm -rf "$tmp"' EXIT

  info "Copiando o banco (cópia consistente, pode ser feita com o app aberto)..."
  sqlite_backup "$DATA_DIR/$DB_FILE" "$tmp/$DB_FILE"

  local check
  check="$(sqlite_check "$tmp/$DB_FILE")" || die "a cópia do banco falhou na verificação de integridade: $check"
  IFS='|' read -r _ n_tasks n_projects n_entries <<<"$check"

  for d in "${ASSET_DIRS[@]}"; do
    if [[ -d "$DATA_DIR/$d" ]]; then
      info "Copiando $d/ ($(find "$DATA_DIR/$d" -type f | wc -l) arquivos)..."
      cp -a "$DATA_DIR/$d" "$tmp/"
    fi
  done
  for f in "${CONFIG_FILES[@]}"; do
    if [[ -f "$DATA_DIR/$f" ]]; then
      info "Copiando $f..."
      cp -a "$DATA_DIR/$f" "$tmp/"
    fi
  done

  {
    echo "data:            $(date -Iseconds)"
    echo "máquina:         $(hostname)"
    echo "origem:          $DATA_DIR"
    echo "tasks:           $n_tasks"
    echo "projetos:        $n_projects"
    echo "entradas tempo:  $n_entries"
    echo
    echo "sha256:"
    (cd "$tmp" && find . -type f ! -name MANIFEST.txt -print0 | sort -z | xargs -0 sha256sum)
  } >"$tmp/MANIFEST.txt"

  mv "$tmp" "$dest"
  trap - EXIT
  sync

  info "Backup concluído: $dest"
  echo "    tasks: $n_tasks | projetos: $n_projects | entradas de tempo: $n_entries"
  echo "    tamanho: $(du -sh "$dest" | cut -f1)"
}

cmd_list() {
  local snaps
  snaps="$(list_snapshots)"
  [[ -n "$snaps" ]] || { echo "Nenhum snapshot em $BACKUP_ROOT"; return; }
  while read -r s; do
    local tasks
    tasks="$(grep -m1 '^tasks:' "$BACKUP_ROOT/$s/MANIFEST.txt" 2>/dev/null | awk '{print $2}')"
    printf '%s   tasks: %s   %s\n' "$s" "${tasks:-?}" "$(du -sh "$BACKUP_ROOT/$s" | cut -f1)"
  done <<<"$snaps"
}

cmd_restore() {
  require_python
  local assume_yes=0 src=""
  for arg in "$@"; do
    case "$arg" in
      -y|--yes) assume_yes=1 ;;
      *) src="$arg" ;;
    esac
  done

  if [[ -z "$src" ]]; then
    local latest
    latest="$(list_snapshots | tail -n1)"
    [[ -n "$latest" ]] || die "nenhum snapshot encontrado em $BACKUP_ROOT"
    src="$BACKUP_ROOT/$latest"
  elif [[ ! -d "$src" && -d "$BACKUP_ROOT/$src" ]]; then
    src="$BACKUP_ROOT/$src"
  fi
  [[ -f "$src/$DB_FILE" ]] || die "snapshot inválido (sem $DB_FILE): $src"

  if app_running; then
    die "o TickTask está aberto. Feche pelo ícone da bandeja → Sair e rode de novo."
  fi

  local check
  check="$(sqlite_check "$src/$DB_FILE")" || die "o banco do snapshot está corrompido: $check"
  IFS='|' read -r _ n_tasks n_projects n_entries <<<"$check"

  echo "Snapshot:  $src"
  echo "Conteúdo:  $n_tasks tasks, $n_projects projetos, $n_entries entradas de tempo"
  echo "Destino:   $DATA_DIR"
  if [[ $assume_yes -eq 0 ]]; then
    read -r -p "Restaurar? Os dados atuais serão movidos para uma pasta pre-restore. [s/N] " ans
    [[ "$ans" =~ ^[sSyY]$ ]] || { echo "Cancelado."; exit 0; }
  fi

  mkdir -p "$DATA_DIR"
  chmod 700 "$DATA_DIR"

  local safety="$DATA_DIR/pre-restore-$(date +%Y-%m-%d_%H%M%S)"
  local moved=0
  for item in "$DB_FILE" "$DB_FILE-wal" "$DB_FILE-shm" "${ASSET_DIRS[@]}" "${CONFIG_FILES[@]}"; do
    if [[ -e "$DATA_DIR/$item" ]]; then
      mkdir -p "$safety"
      mv "$DATA_DIR/$item" "$safety/"
      moved=1
    fi
  done
  [[ $moved -eq 1 ]] && info "Dados anteriores guardados em $safety"

  info "Restaurando o banco..."
  cp "$src/$DB_FILE" "$DATA_DIR/$DB_FILE"
  chmod 644 "$DATA_DIR/$DB_FILE"

  for d in "${ASSET_DIRS[@]}"; do
    [[ -d "$src/$d" ]] && { info "Restaurando $d/..."; cp -a "$src/$d" "$DATA_DIR/"; }
  done
  for f in "${CONFIG_FILES[@]}"; do
    [[ -f "$src/$f" ]] && { info "Restaurando $f..."; cp -a "$src/$f" "$DATA_DIR/"; }
  done
  sync

  info "Restauração concluída."
  echo "    Abra o TickTask e confira as tasks."
  echo "    O Google Calendar precisa ser reconectado em Configurações (o token fica no keyring do sistema)."
}

case "${1:-}" in
  backup) cmd_backup ;;
  list) cmd_list ;;
  restore) shift; cmd_restore "$@" ;;
  *)
    sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'
    exit 1
    ;;
esac
