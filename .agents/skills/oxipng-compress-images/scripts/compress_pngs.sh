#!/usr/bin/env bash
set -euo pipefail

MIN_BYTES=3000000
MAX_BYTES=5000000
RESIZE_GEOMETRY="1080x1080>"
RECURSIVE=0
DRY_RUN=0
OXIPNG_LEVEL=4
STRIP_MODE="all"

processed=0
resized=0
skipped=0
failed=0

usage() {
  cat <<'EOF'
Usage: compress_pngs.sh [options] <file-or-dir>...

Compress PNG files in place with oxipng.
If a processed file is still >= max-bytes, resize it to the given geometry and run oxipng again.

Options:
  --min-bytes N     Only process files >= N bytes (default: 3000000)
  --max-bytes N     Resize when file is still >= N bytes after oxipng (default: 5000000)
  --resize VALUE    Resize geometry. "1080" becomes "1080x1080>" (default: 1080x1080>)
  --recursive       Walk directories recursively
  --dry-run         Print what would be processed without modifying files
  -h, --help        Show this help text
EOF
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

file_size() {
  wc -c <"$1" | tr -d ' '
}

normalize_geometry() {
  case "$1" in
    *x*)
      printf '%s' "$1"
      ;;
    *)
      printf '%sx%s>' "$1" "$1"
      ;;
  esac
}

preserve_metadata() {
  local src="$1"
  local dst="$2"
  local mode

  touch -r "$src" "$dst" 2>/dev/null || true

  mode="$(stat -f '%OLp' "$src" 2>/dev/null || stat -c '%a' "$src" 2>/dev/null || true)"
  if [ -n "$mode" ]; then
    chmod "$mode" "$dst" 2>/dev/null || true
  fi
}

resize_and_recompress() {
  local file="$1"
  local tmp

  tmp="$(mktemp /tmp/oxipng-compress-XXXXXX.png)"
  magick "$file" -resize "$RESIZE_GEOMETRY" "$tmp"
  preserve_metadata "$file" "$tmp"
  mv "$tmp" "$file"
  oxipng -o "$OXIPNG_LEVEL" --strip "$STRIP_MODE" --preserve "$file" >/dev/null
}

process_file() {
  local file="$1"
  local before after_oxipng after action dims

  before="$(file_size "$file")"
  if [ "$before" -lt "$MIN_BYTES" ]; then
    skipped=$((skipped + 1))
    printf 'SKIP\t%s\tbelow-min-bytes\t%s\n' "$file" "$before"
    return 0
  fi

  if [ "$DRY_RUN" -eq 1 ]; then
    printf 'DRYRUN\t%s\twould-run-oxipng\t%s\n' "$file" "$before"
    return 0
  fi

  if ! oxipng -o "$OXIPNG_LEVEL" --strip "$STRIP_MODE" --preserve "$file" >/dev/null; then
    failed=$((failed + 1))
    printf 'FAIL\t%s\toxipng\n' "$file" >&2
    return 1
  fi

  after_oxipng="$(file_size "$file")"
  action="oxipng"

  if [ "$after_oxipng" -ge "$MAX_BYTES" ]; then
    if ! resize_and_recompress "$file"; then
      failed=$((failed + 1))
      printf 'FAIL\t%s\tresize\n' "$file" >&2
      return 1
    fi
    after="$(file_size "$file")"
    action="oxipng+resize"
    resized=$((resized + 1))
  else
    after="$after_oxipng"
  fi

  dims="$(file "$file" | sed -E 's/.*PNG image data, ([0-9]+ x [0-9]+).*/\1/')"
  processed=$((processed + 1))
  printf 'DONE\t%s\t%s\t%s\t%s\t%s\n' "$file" "$before" "$after" "$action" "$dims"
}

walk_dir() {
  local dir="$1"
  if [ "$RECURSIVE" -eq 1 ]; then
    find "$dir" -type f \( -iname '*.png' \) -print0
  else
    find "$dir" -maxdepth 1 -type f \( -iname '*.png' \) -print0
  fi
}

main() {
  local inputs=()
  local arg

  while [ "$#" -gt 0 ]; do
    arg="$1"
    case "$arg" in
      --min-bytes)
        MIN_BYTES="$2"
        shift 2
        ;;
      --max-bytes)
        MAX_BYTES="$2"
        shift 2
        ;;
      --resize)
        RESIZE_GEOMETRY="$(normalize_geometry "$2")"
        shift 2
        ;;
      --recursive)
        RECURSIVE=1
        shift
        ;;
      --dry-run)
        DRY_RUN=1
        shift
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      --)
        shift
        while [ "$#" -gt 0 ]; do
          inputs+=("$1")
          shift
        done
        ;;
      -*)
        echo "Unknown option: $arg" >&2
        usage >&2
        exit 1
        ;;
      *)
        inputs+=("$arg")
        shift
        ;;
    esac
  done

  if [ "${#inputs[@]}" -eq 0 ]; then
    usage >&2
    exit 1
  fi

  require_cmd oxipng
  require_cmd magick

  for arg in "${inputs[@]}"; do
    if [ -d "$arg" ]; then
      while IFS= read -r -d '' file; do
        if ! process_file "$file"; then
          :
        fi
      done < <(walk_dir "$arg")
    elif [ -f "$arg" ]; then
      case "$arg" in
        *.png|*.PNG)
          if ! process_file "$arg"; then
            :
          fi
          ;;
        *)
          skipped=$((skipped + 1))
          printf 'SKIP\t%s\tnot-png\n' "$arg"
          ;;
      esac
    else
      failed=$((failed + 1))
      printf 'FAIL\t%s\tnot-found\n' "$arg" >&2
    fi
  done

  printf 'SUMMARY\tprocessed=%s\tresized=%s\tskipped=%s\tfailed=%s\n' \
    "$processed" "$resized" "$skipped" "$failed"

  if [ "$failed" -gt 0 ]; then
    exit 1
  fi
}

main "$@"
