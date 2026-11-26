# Verification Toolchain Domain Primer

Loaded during Phase 5 (Plan) and Phase 7 (Implement) — ensures every VDD project ships with a comprehensive verification tool pipeline spanning pre-deployment and post-deployment.

## Pre-Deployment Verification Tools

### Playwright — Browser E2E Testing

**When to use**: Every webapp project. Required when ACs involve user interaction (form submissions, navigation, visual feedback).

**Integration with VDD**:
- **Phase 5 (Plan)**: For every AC that involves browser behavior, specify the Playwright test file: `contracts/` → "Verified by: tests/e2e/task-crud.spec.ts"
- **Phase 6 (Tasks)**: Every implementation task that produces UI must have a paired Playwright test task.
- **Phase 7 (Implement)**: Generate Playwright test alongside implementation:
```typescript
// tests/e2e/task-crud.spec.ts — traces to AC-1, AC-2, AC-E1
import { test, expect } from '@playwright/test';

test('AC-1: Create a task', async ({ page }) => {
  await page.goto('/');
  await page.fill('[placeholder="Add a task..."]', 'Buy groceries');
  await page.click('button:has-text("Add")');
  await expect(page.locator('text=Buy groceries')).toBeVisible();
});

test('AC-E1: Empty title rejected', async ({ page }) => {
  await page.goto('/');
  await page.click('button:has-text("Add")');
  await expect(page.locator('text=Title must be between')).toBeVisible();
});
```
- **Phase 8 (Validate)**: the review confirms that every UI MUST acceptance criterion has a passing Playwright test; the tool checks the chain, not the test runner.

### Browserless — Headless Automation & Visual Regression

**When to use**: Performance audits (Lighthouse), visual regression testing, PDF generation, content scraping, anti-bot-detection testing.

**Integration with VDD**:
- **Performance budgets**: `Browserless → run_performance_audit` must be called for every page with a performance AC in spec.
- **Visual regression**: Every UI component that changes must generate a before/after screenshot comparison. Trace the visual diff back to the AC that authorized the change.
- **PDF/export verification**: If the spec includes export-to-PDF ACs, Browserless `generate_pdf` must be part of the test suite.
- **Screenshot comparison**: `take_screenshot` with `fullPage: true` for visual baseline. Compare against previous build.

```typescript
// Phase 7: Browserless verification task
// Traces to AC-5 (performance budget: LCP < 1.5s)
await browserless.run_performance_audit({
  url: process.env.DEPLOY_URL,
  config: { extends: 'lighthouse:default' }
});
```

### Unit & Integration Tests (Vitest / Jest)

- Every non-UI MUST AC must have a Vitest test.
- Test task must appear BEFORE implementation task (test-first).
- Test file must name the AC it covers in the describe block.

### Linting & Type-Checking (ESLint, TypeScript strict mode)

- Must be in CI pipeline. VDD's constitution declares the lint/typecheck rules.
- The implement-phase checklist: no lint violations in committed code.

### Accessibility Audit (axe-core / Lighthouse a11y)

- Every webapp spec with accessibility ACs (WCAG 2.2 AA) must have axe-core audit in CI.
- `playwright_browser_evaluate` with axe-core or automated a11y scan.

### Security Scan (npm audit / Snyk / OWASP ZAP)

- Constitution's security constraints define minimum scan requirements.
- CI must run dependency vulnerability scan.
- For auth/payment ACs: OWASP ZAP baseline scan on deployed preview.

## Post-Deployment Verification Tools

### Sentry — Error Tracking & Performance Monitoring

**When to use**: Every deployed project. Required when vision includes reliability or uptime metrics.

**Integration with VDD**:
- **Phase 5 (Plan)**: Plan.md must specify Sentry initialization location and which ACs it monitors.
- **Phase 7 (Implement)**: Generate Sentry initialization at app entry point:
```typescript
// src/instrumentation.ts — traces to I-002 (task completion reliability)
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});
```
- **Phase 8 (Validate)**: Impact report must include Sentry error rate and p95 latency compared to vision success metrics. Drift is a review judgement: if the production error rate exceeds the vision threshold, the report says so — no automated check compares them.

### Monitoring & Alerting (Prometheus + Grafana / Datadog / New Relic)

- Server-side metrics: response time, error rate, DB query latency, connection pool saturation.
- Must trace to specific ACs: "AC-2 (list tasks < 200ms at p95)" → verified by API metrics dashboard.
- Alerting rules derived from vision: if vision says "99.9% uptime," alert on < 99.9%.

### Production Telemetry (Custom Analytics)

- Every vision success metric that isn't verifiable in CI must have production telemetry.
- Leading indicators (activation rate, task completion rate) → analytics events in code.
- Lagging indicators (30-day retention, NPS) → analytics dashboards + survey triggers.
- All telemetry must be opt-in and privacy-respecting (see telemetry.md).

### CI/CD Pipeline — Complete Quality Gate

```yaml
# .github/workflows/vdd-quality.yml
jobs:
  lint:        # ESLint + Prettier — constitution compliance
  typecheck:   # TypeScript strict mode — type safety
  unit-test:   # Vitest — all ACs with non-UI behavior
  e2e-test:    # Playwright — all UI MUST ACs
  visual-diff: # Browserless — screenshot comparison
  a11y:        # axe-core — WCAG 2.2 AA compliance
  security:    # npm audit / Snyk — dependency vulnerabilities
  perf:        # Lighthouse via Browserless — performance ACs
  deploy-prev: # Deploy to staging for manual verification
  sentry-init: # Confirm Sentry DSN configured and receiving events
```

## Tool Verification Checklist (per phase)

| Phase | Tools Involved | What to Verify |
|-------|---------------|---------------|
| 0 — Constitution | (none) | Linting rules declared; CI pipeline defined |
| 1 — Vision | (none) | Success metrics include production monitoring targets |
| 4 — Specs | (none) | Every MUST AC specifies how it's verified (unit/Playwright/Browserless/Sentry) |
| 5 — Plan | (none) | plan.md specifies which tools verify each component |
| 6 — Tasks | (none) | Test tasks specify tool + AC coverage |
| 7 — Implement | Playwright, Browserless, Sentry, Vitest | Code + quality config generated together |
| 8 — Validate | All tools | All MUST ACs verified by tool pipeline; Sentry shows production health |

## Impact Verification (Toolchain)

- **Tool coverage**: % of MUST ACs that have an automated verification tool assigned
- **Pre-deploy quality**: % of CI pipeline stages passing before deployment
- **Post-deploy quality**: Sentry error rate, p95 latency, uptime (vs. vision targets)
- **Visual regression pass rate**: % of screenshots matching baseline (visual drift = audit failure)

## Anti-Patterns Specific to Verification

- Running Playwright tests only locally, never in CI
- Setting up Sentry but never checking the dashboard
- Having performance ACs but no Lighthouse budget enforcement
- Accessibility ACs without axe-core in CI
- "We'll add tests later" — test tasks must precede implementation tasks in Phase 6
- Manual verification only — every AC must have automated verification where possible
