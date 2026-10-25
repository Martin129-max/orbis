#!/usr/bin/env bash

set -euo pipefail

cd "$(dirname "$0")/../.."

if ! command -v gh >/dev/null 2>&1; then
  echo "📦 Installing the GitHub CLI..."
  if command -v brew >/dev/null 2>&1; then
    brew install gh
  elif command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update
    sudo apt-get install -y gh
  elif command -v winget >/dev/null 2>&1; then
    winget install --id GitHub.cli -e
  fi
  if ! command -v gh >/dev/null 2>&1; then
    echo "❌ Couldn't find the GitHub CLI. Install it from https://cli.github.com (or restart your terminal if it was just installed), then rerun pnpm run review:start." >&2
    exit 1
  fi
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "🔑 Logging in to GitHub..."
  gh auth login
fi

ask_pr() {
  local number
  read -rp "$1 PR number (leave empty to skip): " number
  if [ -n "$number" ] && ! [[ $number =~ ^[0-9]+$ ]]; then
    echo "❌ \"$number\" is not a PR number." >&2
    exit 1
  fi
  echo "$number"
}

web_pr=$(ask_pr "Web")
server_pr=$(ask_pr "Server")

if [ -z "$web_pr" ] && [ -z "$server_pr" ]; then
  echo "Nothing to review."
  exit 0
fi

for entry in "web:$web_pr" "server:$server_pr"; do
  path=${entry%%:*}
  number=${entry#*:}
  [ -z "$number" ] && continue
  if [ -n "$(git -C "$path" status --porcelain)" ]; then
    echo "❌ $path has uncommitted changes. Commit or stash them first." >&2
    exit 1
  fi
  if ! title=$(cd "$path" && gh pr view "$number" --json title -q .title 2>/dev/null); then
    echo "❌ $path has no PR #$number." >&2
    exit 1
  fi
  echo "🔎 $path PR #$number: $title"
done

for entry in "web:$web_pr" "server:$server_pr"; do
  path=${entry%%:*}
  number=${entry#*:}
  [ -z "$number" ] && continue
  echo "⬇️ Checking out $path PR #$number..."
  (cd "$path" && gh pr checkout "$number" --branch "pr/$number" >/dev/null)
  echo "✅ $path is on pr/$number at $(git -C "$path" rev-parse --short HEAD)"
done

echo "📦 Installing dependencies..."
pnpm install

echo "⚙️ Generating Prisma client..."
pnpm --filter orbis-server run prisma:generate

echo "🎉 Ready to review. Run pnpm run develop to start the app, and pnpm run review:end when you're done."
