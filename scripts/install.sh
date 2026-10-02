#!/bin/bash
# VDD One-Line Installer
# Usage: curl -sSL https://raw.githubusercontent.com/simonmak-ascent/vision-driven-design/main/scripts/install.sh | bash

set -euo pipefail

echo "╔══════════════════════════════════════╗"
echo "║  Vision Driven Design — Installer   ║"
echo "╚══════════════════════════════════════╝"
echo ""

REPO="https://github.com/simonmak-ascent/vision-driven-design.git"
SKILL_DIR="$HOME/.config/opencode/skills/vision-driven-design"

# Clone VDD skill
if [ -d "$SKILL_DIR" ]; then
  echo "[✓] VDD skill already installed at $SKILL_DIR"
  cd "$SKILL_DIR" && git pull --quiet
else
  echo "[→] Installing VDD skill..."
  git clone --depth 1 "$REPO" "$SKILL_DIR"
fi

# Auto-detect agent and wire it up
echo "[→] Detecting AI coding agents..."
bash "$SKILL_DIR/scripts/vdd-agent-setup.sh" all

# Run auto-detect for current project
if [ -n "${PWD:-}" ]; then
  echo "[→] Detecting project conventions..."
  bash "$SKILL_DIR/scripts/vdd-detect.sh"
fi

echo ""
echo "╔══════════════════════════════════════╗"
echo "║  VDD Installation Complete           ║"
echo "║                                      ║"
echo "║  Next: /vdd:init                     ║"
echo "║  Then: /vdd:vision \"your vision\"    ║"
echo "╚══════════════════════════════════════╝"
