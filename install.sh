#!/usr/bin/env bash
# Copy the built worldcanon plugin into a vault's .obsidian/plugins folder.
# Usage: ./install.sh /path/to/Vault

set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: $0 /path/to/Vault" >&2
  exit 1
fi

VAULT="$1"
PLUGIN_DIR="$VAULT/.obsidian/plugins/worldcanon-canon"

if [ ! -d "$VAULT" ]; then
  echo "Vault not found: $VAULT" >&2
  exit 1
fi
if [ ! -f "main.js" ]; then
  echo "main.js not found. Run 'npm run build' first." >&2
  exit 1
fi

mkdir -p "$PLUGIN_DIR"
cp manifest.json "$PLUGIN_DIR/"
cp main.js "$PLUGIN_DIR/"
cp styles.css "$PLUGIN_DIR/"

echo "Installed worldcanon-canon into: $PLUGIN_DIR"
echo "Open the vault in Obsidian and enable 'Worldbuilder Canon' under Community plugins."
