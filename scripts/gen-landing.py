#!/usr/bin/env python3
"""Generate the localized APG-style landing pages for vision-driven-design.

Emits index.html (en), zh/index.html, hk/index.html using the vendored
@simonmak-ascent/shared tokens and the /tools/<slug> anatomy
(apg-website specs/tools-presentation.md §4). Run from the repo root:
    python3 scripts/gen-landing.py
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

SLUG = "vision-driven-design"
SITE = "https://vdd.simonmak.com"
CLIENT_KEY = "vdd"
ENDPOINT = "https://vdd.simonmak.com/api/mcp"
DOCS = "https://vdd.simonmak.com"
REPO = "https://github.com/simonmak-ascent/vision-driven-design"
NPM = "https://www.npmjs.com/package/@simonmak-ascent/mcp"
REGISTRY = "com.ascent-partners/vision-driven-design"
VERSION = "1.9.2"

TECH = "https://www.ascent-partners.com/services/technology-advisory"
CONTACT = "https://www.ascent-partners.com/about#contact"
TOOLS = "https://www.ascent-partners.com/tools"

L = {
    "en": {
        "html_lang": "en-GB",
        "base": "",
        "nav": "Open Tooling",
        "name": "Vision Driven Design",
        "type": "MCP server",
        "value": "Give AI coding agents a spec-driven methodology — 8 phases with bi-directional traceability and 7 quality gates.",
        "thesis": "A methodology for AI coding agents: eight phases, seven gates — so “done” means traceable, not just working.",
        "stats": [
            ("15", "tools"),
            ("8", "phases"),
            ("108", "gate checks"),
            ("MIT", "open source"),
        ],
        "caps_h": "Capabilities",
        "caps": [
            "15 tools over Streamable HTTP",
            "Vision → strategy → tactics → specs → plan → tasks → implement → validate",
            "7 bi-directional gates (108 checks); DO-178C / IEC 62304 / CMMI alignment",
        ],
        "standards_h": "Standards",
        "standards": ["DO-178C", "IEC 62304", "CMMI"],
        "connect_h": "Connect",
        "connect_intro": "Point an MCP client at the hosted endpoint. Open access, no API key.",
        "facts_h": "Facts",
        "facts": [
            ("Endpoint", ENDPOINT, True),
            ("Transport", "Streamable HTTP", False),
            ("Auth", "Open — no API key", False),
            ("Licence", "MIT", False),
            ("Registry", REGISTRY, True),
        ],
        "origin_h": "Where it comes from",
        "origin_body": "A methodology from the Ascent Partners technology practice — spec-driven development with bi-directional traceability, developed against VDD itself.",
        "tech": "Technology Advisory",
        "contact": "Contact us",
        "docs": "Documentation",
        "source": "Source",
        "back": "All tools",
        "copy": "Copy",
        "crumb_home": "Home",
        "footer_note": f"MIT © Simon Mak / Ascent Partners Group Limited · v{VERSION}",
    },
    "zh": {
        "html_lang": "zh-Hans",
        "base": "../",
        "nav": "开放工具",
        "name": "Vision Driven Design",
        "type": "MCP 服务器",
        "value": "为 AI 编码代理提供规格驱动的方法论——8 个阶段、双向可追溯性及 7 个质量门。",
        "thesis": "面向 AI 编码代理的方法论：八个阶段、七道质量门——让「完成」意味着可追溯，而非仅仅能跑。",
        "stats": [
            ("15", "个工具"),
            ("8", "个阶段"),
            ("108", "项质量检查"),
            ("MIT", "开源"),
        ],
        "caps_h": "能力",
        "caps": [
            "通过 Streamable HTTP 提供 15 个工具",
            "愿景 → 策略 → 战术 → 规格 → 计划 → 任务 → 实施 → 验证",
            "7 个双向质量门（108 项检查）；对齐 DO-178C / IEC 62304 / CMMI",
        ],
        "standards_h": "准则",
        "standards": ["DO-178C", "IEC 62304", "CMMI"],
        "connect_h": "连接",
        "connect_intro": "将 MCP 客户端指向托管端点。开放访问，无需 API 密钥。",
        "facts_h": "信息",
        "facts": [
            ("端点", ENDPOINT, True),
            ("传输", "Streamable HTTP", False),
            ("认证", "开放——无需密钥", False),
            ("许可", "MIT", False),
            ("注册表", REGISTRY, True),
        ],
        "origin_h": "来源",
        "origin_body": "来自艾升集团技术咨询团队的方法论——具备双向可追溯性的规格驱动开发，并以 VDD 自身开发验证。",
        "tech": "技术咨询",
        "contact": "联系我们",
        "docs": "文档",
        "source": "源代码",
        "back": "全部工具",
        "copy": "复制",
        "crumb_home": "首页",
        "footer_note": f"MIT © Simon Mak / Ascent Partners Group Limited · v{VERSION}",
    },
    "hk": {
        "html_lang": "zh-Hant-HK",
        "base": "../",
        "nav": "開放工具",
        "name": "Vision Driven Design",
        "type": "MCP 伺服器",
        "value": "為 AI 編碼代理提供規格驅動的方法論——8 個階段、雙向可追溯性及 7 個質量門。",
        "thesis": "面向 AI 編碼代理的方法論：八個階段、七道質量門——讓「完成」意味著可追溯，而非僅僅能跑。",
        "stats": [
            ("15", "個工具"),
            ("8", "個階段"),
            ("108", "項質量檢查"),
            ("MIT", "開源"),
        ],
        "caps_h": "能力",
        "caps": [
            "透過 Streamable HTTP 提供 15 個工具",
            "願景 → 策略 → 戰術 → 規格 → 計劃 → 任務 → 實施 → 驗證",
            "7 個雙向質量門（108 項檢查）；對齊 DO-178C / IEC 62304 / CMMI",
        ],
        "standards_h": "準則",
        "standards": ["DO-178C", "IEC 62304", "CMMI"],
        "connect_h": "連接",
        "connect_intro": "將 MCP 客戶端指向託管端點。開放存取，無需 API 密鑰。",
        "facts_h": "資訊",
        "facts": [
            ("端點", ENDPOINT, True),
            ("傳輸", "Streamable HTTP", False),
            ("認證", "開放——無需密鑰", False),
            ("授權", "MIT", False),
            ("註冊表", REGISTRY, True),
        ],
        "origin_h": "來源",
        "origin_body": "來自艾升集團技術諮詢團隊的方法論——具備雙向可追溯性的規格驅動開發，並以 VDD 自身開發驗證。",
        "tech": "技術諮詢",
        "contact": "聯絡我們",
        "docs": "文件",
        "source": "原始碼",
        "back": "全部工具",
        "copy": "複製",
        "crumb_home": "首頁",
        "footer_note": f"MIT © Simon Mak / Ascent Partners Group Limited · v{VERSION}",
    },
}

LANGS = {"en": "English", "zh": "中文", "hk": "繁體"}

CLIENTS = [
    (
        "opencode",
        "OpenCode",
        "json",
        '{\n  "$schema": "https://opencode.ai/config.json",\n  "mcp": {\n    "%s": { "type": "remote", "url": "%s" }\n  }\n}',
    ),
    ("claude-code", "Claude Code", "bash", "claude mcp add --transport http %s %s"),
    (
        "claude-desktop",
        "Claude Desktop",
        "json",
        '{\n  "mcpServers": {\n    "%s": { "url": "%s" }\n  }\n}',
    ),
    (
        "cursor",
        "Cursor",
        "json",
        '{\n  "mcpServers": {\n    "%s": { "url": "%s" }\n  }\n}',
    ),
    (
        "vscode",
        "VS Code",
        "json",
        '{\n  "servers": {\n    "%s": { "type": "http", "url": "%s" }\n  }\n}',
    ),
    (
        "generic",
        "Any MCP client",
        "json",
        '{\n  "mcpServers": {\n    "%s": { "url": "%s" }\n  }\n}',
    ),
]


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def client_code(kind, tmpl):
    return tmpl % (CLIENT_KEY, ENDPOINT)


def lang_links(loc):
    base = L[loc]["base"]
    out = []
    for k in ("en", "zh", "hk"):
        href = base + ("" if k == "en" else k + "/")
        cur = ' aria-current="true"' if k == loc else ""
        out.append(
            f'<a class="apg-lang" href="{href}" hreflang="{L[k]["html_lang"]}"{cur}>{LANGS[k]}</a>'
        )
    return "".join(out)


def facts_html(c):
    return "".join(
        f'<div class="apg-fact"><dt>{esc(l)}</dt><dd>{(f"<code>{esc(v)}</code>" if code else esc(v))}</dd></div>'
        for l, v, code in c["facts"]
    )


def tabs_html(c):
    tabs, panes = [], []
    for i, (key, label, kind, tmpl) in enumerate(CLIENTS):
        pid = f"pane-{key}"
        tabs.append(
            f'<button class="apg-tab" role="tab" aria-selected="{"true" if i == 0 else "false"}" data-target="{pid}">{esc(label)}</button>'
        )
        panes.append(
            f'<div class="apg-pane" id="{pid}" role="tabpanel"{" hidden" if i else ""}><button class="apg-copy" type="button">{esc(c["copy"])}</button><pre>{esc(client_code(kind, tmpl))}</pre></div>'
        )
    return "".join(tabs) + "".join(panes)


def page(loc):
    c = L[loc]
    base = c["base"]
    stats = "".join(
        f'<div class="apg-stat"><dt>{esc(l)}</dt><dd>{esc(v)}</dd></div>'
        for v, l in c["stats"]
    )
    caps = "".join(f"<li>{esc(x)}</li>" for x in c["caps"])
    chips = "".join(f"<li>{esc(x)}</li>" for x in c["standards"])
    alts = "\n".join(
        f'    <link rel="alternate" hreflang="{("x-default" if k == "en" else L[k]["html_lang"])}" href="/{"" if k == "en" else k + "/"}">'
        for k in ("en", "zh", "hk")
    )
    og_locale = {"en": "en_GB", "zh": "zh_CN", "hk": "zh_HK"}[loc]
    og_url = f"{SITE}/{'' if loc == 'en' else loc + '/'}"
    return f"""<!doctype html>
<html lang="{c["html_lang"]}" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{esc(c["name"])} — Ascent Partners</title>
  <meta name="description" content="{esc(c["value"])}">
  <link rel="canonical" href="/{"" if loc == "en" else loc + "/"}">
{alts}
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="{esc(c["name"])}">
  <meta property="og:title" content="{esc(c["name"])}">
  <meta property="og:description" content="{esc(c["value"])}">
  <meta property="og:url" content="{og_url}">
  <meta property="og:locale" content="{og_locale}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{esc(c["name"])}">
  <meta name="twitter:description" content="{esc(c["value"])}">
  <link rel="icon" href="{base}favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&family=Titillium+Web:wght@400;600;700&family=Raleway:wght@600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="{base}apg-tokens.css">
  <link rel="stylesheet" href="{base}apg-tool.css">
  <script>(function(){{try{{var v=localStorage.getItem("apg-theme");document.documentElement.setAttribute("data-theme",v==="light"||v==="dark"?v:"dark");}}catch(e){{document.documentElement.setAttribute("data-theme","dark");}}}})();</script>
</head>
<body>
  <div class="apg-topbar"><div class="apg-container apg-topbar-inner">
    <a class="apg-brand" href="{TOOLS}"><span class="apg-mark">AP</span> Ascent&nbsp;Partners · <span style="font-family:var(--ap-font-body);font-weight:400">{esc(c["nav"])}</span></a>
    <div class="apg-controls"><span class="apg-langs">{lang_links(loc)}</span><button class="apg-theme-toggle" type="button" aria-label="Toggle theme">☾</button></div>
  </div></div>

  <header class="apg-hero">
    <img src="{base}hero.jpg" alt="" width="1440" height="750">
    <div class="apg-scrim"></div>
    <nav class="apg-crumbs" aria-label="Breadcrumb"><div class="apg-container"><ol>
      <li><a href="https://www.ascent-partners.com/">{esc(c["crumb_home"])}</a></li>
      <li><a href="{TOOLS}">{esc(c["nav"])}</a></li>
      <li aria-current="page">{esc(c["name"])}</li>
    </ol></div></nav>
    <h1 class="apg-container">{esc(c["name"])}</h1>
  </header>

  <main class="apg-container apg-main">
    <div class="apg-header">
      <span class="apg-badge">{esc(c["type"])}</span>
      <p class="apg-value">{esc(c["value"])}</p>
      <p class="apg-thesis">{esc(c["thesis"])}</p>
    </div>
    <dl class="apg-stats">{stats}</dl>
    <div class="apg-sections">
      <section class="apg-section-h"><h2>{esc(c["caps_h"])}</h2><ul class="apg-caps">{caps}</ul></section>
      <section class="apg-section-h"><h2>{esc(c["standards_h"])}</h2><ul class="apg-chips">{chips}</ul></section>
      <section class="apg-section-h"><h2>{esc(c["connect_h"])}</h2><p>{esc(c["connect_intro"])}</p><div class="apg-tabs" role="tablist">{tabs_html(c)}</div></section>
      <section class="apg-section-h"><h2>{esc(c["facts_h"])}</h2><dl class="apg-facts">{facts_html(c)}</dl></section>
      <section class="apg-card"><h2>{esc(c["origin_h"])}</h2><p>{esc(c["origin_body"])}</p><div class="apg-inline-links"><a href="{TECH}">{esc(c["tech"])}</a><a href="{CONTACT}">{esc(c["contact"])}</a></div></section>
      <div class="apg-actions">
        <a class="apg-btn apg-btn-primary" href="{DOCS}" rel="noopener">{esc(c["docs"])}</a>
        <a class="apg-btn apg-btn-secondary" href="{REPO}" rel="noopener">{esc(c["source"])}</a>
      </div>
      <a class="apg-back" href="{TOOLS}">← {esc(c["back"])}</a>
    </div>
  </main>

  <footer class="apg-footer"><div class="apg-container">
    <p>{esc(c["footer_note"])} · <a href="{REPO}" rel="noopener">GitHub</a> · <a href="{NPM}" rel="noopener">npm</a></p>
  </div></footer>
  <script src="{base}apg-tool.js"></script>
</body>
</html>
"""


def main():
    (ROOT / "index.html").write_text(page("en"), encoding="utf-8")
    (ROOT / "zh").mkdir(exist_ok=True)
    (ROOT / "zh" / "index.html").write_text(page("zh"), encoding="utf-8")
    (ROOT / "hk").mkdir(exist_ok=True)
    (ROOT / "hk" / "index.html").write_text(page("hk"), encoding="utf-8")
    print("wrote index.html, zh/index.html, hk/index.html")


if __name__ == "__main__":
    main()
