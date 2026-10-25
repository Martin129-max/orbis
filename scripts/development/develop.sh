#!/usr/bin/env bash

set -euo pipefail

cd "$(dirname "$0")/../.."

options=("Web" "Mobile" "Web and mobile" "Server only")
choice="${1:-}"

if [ -z "$choice" ]; then
  if [ ! -t 0 ]; then
    echo "❌ Choose what to start: pnpm run develop web|mobile|all|server, or pnpm run develop:web, develop:mobile, develop:all, or develop:server." >&2
    exit 1
  fi

  echo "🚀 What do you want to start? (the database and server always start)"
  PS3="Choose 1-${#options[@]}: "
  select option in "${options[@]}"; do
    if [ -n "$option" ]; then
      choice=$REPLY
      break
    fi
  done
  [ -n "$choice" ] || exit 1
fi

case "$choice" in
  1 | web) script="develop:web" ;;
  2 | mobile) script="develop:mobile" ;;
  3 | all) script="develop:all" ;;
  4 | server) script="develop:server" ;;
  *)
    echo "❌ Unknown choice \"$choice\". Use web, mobile, all, or server." >&2
    exit 1
    ;;
esac

exec pnpm run "$script"
