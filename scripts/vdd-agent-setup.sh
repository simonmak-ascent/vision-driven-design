#!/usr/bin/env bash
# VDD Agent Auto-Integrator
# Generates agent-specific VDD config files for the current project.
# Usage: ./scripts/vdd-agent-setup.sh [opencode|claude|cursor|copilot|all]

set -euo pipefail
AGENT="${1:-all}"

generate_opencode() {
  local dest="$HOME/.config/opencode/skills/vision-driven-design"
  if [ -d "$dest" ]; then
    echo "[SKIP] OpenCode: VDD skill already installed at $dest"
    return
  fi
  echo "[INSTALL] OpenCode: Cloning VDD skill..."
  git clone https://github.com/simonmak-ascent/vision-driven-design.git "$dest"
}

generate_claude() {
  local dest=".claude/skills/vision-driven-design"
  if [ -d "$dest" ]; then
    echo "[SKIP] Claude Code: VDD skill already at $dest"
    return
  fi
  mkdir -p "$(dirname "$dest")"
  echo "[INSTALL] Claude Code: Creating VDD skill symlink..."
  if [ -d "$HOME/.config/opencode/skills/vision-driven-design" ]; then
    ln -sf "$HOME/.config/opencode/skills/vision-driven-design" "$dest"
  else
    git clone https://github.com/simonmak-ascent/vision-driven-design.git "$dest"
  fi
}

generate_cursor() {
  local dest=".cursor/rules/vdd.md"
  if [ -f "$dest" ]; then
    echo "[SKIP] Cursor: VDD rules already at $dest"
    return
  fi
  mkdir -p "$(dirname "$dest")"
  echo "[INSTALL] Cursor: Generating VDD rules file..."
  cat > "$dest" << 'RULES'
---
description: Vision Driven Design — 8-phase bidirectional development methodology
globs: ["**/*"]
alwaysApply: false
---
# Vision Driven Design (VDD)
You are operating under the Vision Driven Design methodology.
Reference the project constitution at `constitution.md` for immutable constraints.
All VDD artifacts live under `vdd/`.
Follow the 8-phase chain: Vision → Strategy → Tactics → Specs → Plan → Tasks → Implement → Validate.
For full documentation, see: https://github.com/simonmak-ascent/vision-driven-design
RULES
}

generate_copilot() {
  local dest=".github/copilot-instructions.md"
  if grep -q "Vision Driven Design" "$dest" 2>/dev/null; then
    echo "[SKIP] Copilot: VDD instructions already in $dest"
    return
  fi
  echo "[INSTALL] Copilot: Appending VDD instructions..."
  cat >> "$dest" << 'INSTRUCTIONS'

## Vision Driven Design (VDD)
This project follows VDD methodology. All AI-generated code must:
1. Reference the project constitution (constitution.md)
2. Include Impact Chain headers in VDD artifacts
3. Follow the 8-phase chain
4. Pass bidirectional gate verification
INSTRUCTIONS
}

case "$AGENT" in
  opencode) generate_opencode ;;
  claude)   generate_claude ;;
  cursor)   generate_cursor ;;
  copilot)  generate_copilot ;;
  all)
    generate_opencode
    generate_claude
    generate_cursor
    generate_copilot
    ;;
  *)
    echo "Usage: $0 [opencode|claude|cursor|copilot|all]"
    exit 1
    ;;
esac

echo ""
echo "VDD agent integration complete."
echo "Restart your agent to load VDD, then run: /vdd:init"
