#!/usr/bin/env bash
# VDD Auto-Detect: Scans current project and pre-populates constitution.md
# Usage: ./scripts/vdd-detect.sh

echo "# Auto-Detected Project Configuration"
echo ""

# Detect language and framework
if [ -f "package.json" ]; then
  echo "## Technology Stack"
  echo ""
  echo "| Layer | Detected |"
  echo "|-------|----------|"
  node_type=$(grep -oP '"typescript"' package.json 2>/dev/null && echo "TypeScript" || echo "Node.js")
  echo "| Language | $node_type |"
  
  if grep -q '"next"' package.json 2>/dev/null; then
    echo "| Framework | Next.js |"
  elif grep -q '"react"' package.json 2>/dev/null; then
    echo "| Framework | React |"
  fi
  
  if grep -q '"drizzle-orm"' package.json 2>/dev/null; then
    echo "| ORM | Drizzle |"
  elif grep -q '"prisma"' package.json 2>/dev/null; then
    echo "| ORM | Prisma |"
  fi
  
  if grep -q '"vitest"' package.json 2>/dev/null; then
    echo "| Testing | Vitest |"
  elif grep -q '"jest"' package.json 2>/dev/null; then
    echo "| Testing | Jest |"
  fi
fi

# Detect database
if [ -f "docker-compose.yml" ]; then
  if grep -q 'postgres' docker-compose.yml 2>/dev/null; then
    echo "| Database | PostgreSQL (detected in docker-compose) |"
  elif grep -q 'mysql' docker-compose.yml 2>/dev/null; then
    echo "| Database | MySQL (detected in docker-compose) |"
  fi
elif [ -f ".env" ]; then
  if grep -q 'DATABASE_URL' .env 2>/dev/null; then
    db_url=$(grep 'DATABASE_URL' .env | head -1)
    if echo "$db_url" | grep -q 'postgres'; then
      echo "| Database | PostgreSQL (detected in .env) |"
    fi
  fi
fi

echo ""

# Detect existing config files
echo "## Existing Configuration Files"
[ -f "tsconfig.json" ] && echo "- `tsconfig.json` found"
[ -f ".eslintrc.*" ] 2>/dev/null && echo "- ESLint config found"
[ -f ".prettierrc*" ] 2>/dev/null && echo "- Prettier config found"
[ -f "AGENTS.md" ] && echo "- AGENTS.md found (will be incorporated)"
[ -f "CLAUDE.md" ] && echo "- CLAUDE.md found (will be incorporated)"
[ -f ".cursorrules" ] 2>/dev/null && echo "- .cursorrules found (will be incorporated)"
echo ""

# Suggest domains
echo "## Suggested Domain Primitives"
[ -d "src/app" ] && echo "- webapp (Next.js App Router detected)"
[ -d "src/db" ] && echo "- data-storage (database directory detected)"
[ -f "docker-compose.yml" ] && echo "- infrastructure (Docker detected)"
echo ""

# Detect agent environment / available MCP tools (feeds vdd_detect_environment)
echo "## Agent Environment / MCP Tools"
detected=0
if [ -f "$HOME/.config/opencode/opencode.json" ]; then
  echo "- opencode config found: $HOME/.config/opencode/opencode.json"
  grep -oE '"(brave-search|perplexity|context7|gh_grep|playwright|github|sentry|postgres)"' "$HOME/.config/opencode/opencode.json" 2>/dev/null | sort -u | sed 's/^/-   /'
  detected=1
fi
if [ -f "$HOME/.claude.json" ]; then
  echo "- claude config found: $HOME/.claude.json"
  detected=1
fi
if [ -f "opencode.json" ]; then
  echo "- project opencode.json found"
  grep -oE '"(brave-search|perplexity|context7|gh_grep|playwright|github|sentry|postgres)"' opencode.json 2>/dev/null | sort -u | sed 's/^/-   /'
  detected=1
fi
if [ -f ".mcp.json" ]; then
  echo "- project .mcp.json found"
  grep -oE '"(brave-search|perplexity|context7|gh_grep|playwright|github|sentry|postgres)"' .mcp.json 2>/dev/null | sort -u | sed 's/^/-   /'
  detected=1
fi
[ "$detected" -eq 0 ] && echo "- (no agent/MCP config detected — pass availableTools manually to /vdd:detect-environment)"
echo ""

echo "---"
echo "Run /vdd:init to generate constitution.md with these auto-detected values."
echo "Run /vdd:detect-environment to plan Phase 2 research subagent dispatch."
echo "Or manually edit and customize before running."
