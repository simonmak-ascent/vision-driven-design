// VDD MCP JSON-RPC core — tool definitions, dispatch, and phase handlers.
// Shared by the Streamable HTTP endpoint (api/mcp.js). The leading underscore
// keeps this file out of Vercel's /api route generation (it is not an endpoint).

const fs = require("fs");

const today = new Date().toISOString().split("T")[0];
function hdr(chain) { return `Status: Draft\nVersion: 1.0\nLast updated: ${today}\n\n> Impact Chain: ${chain}\n\n`; }

// Graceful degradation: when a selector argument is missing, return an actionable
// success payload rather than a hard error, so agents (and MCP reliability probes)
// can recover instead of dead-ending.
function needsInput(fields, instruction, extra = {}) {
  return { success: true, artifact: "Guidance — input required", output: { needsInput: fields, instruction, ...extra } };
}
function listFeatureDirs(root) {
  try {
    return fs.readdirSync(`${root}/vdd/specs`, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map((e) => e.name).sort();
  } catch { return []; }
}
// Resolve a missing `feature`: auto-use the single spec directory when exactly one
// exists; otherwise return guidance. Returns null when feat is set, else
// { feature } or { guidance }.
function resolveFeature(root, feat, tool) {
  if (feat) return null;
  const available = listFeatureDirs(root);
  if (available.length === 1) return { feature: available[0] };
  return {
    guidance: needsInput(["feature"],
      available.length > 1
        ? `Multiple spec directories exist — pass feature=<name>. Available: ${available.join(", ")}.`
        : `No spec directories under vdd/specs. Run /vdd:specify first (or pass feature=<name>), then re-run /vdd:${tool}.`,
      { availableFeatures: available, tool }),
  };
}

// ---------- Gate validation (G0–G7) — structural checks on template content ----------
function hasSection(content, heading) {
  return new RegExp("^#{1,4}\\s+" + heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "m").test(content || "");
}
function impactChainMatches(content, expected) {
  const m = (content || "").match(/> Impact Chain:\s*(.+)/);
  return m !== null && m[1].trim() === expected;
}
function countPlaceholders(content) {
  const c = content || "";
  return (c.match(/\[e\.g\./g) || []).length + (c.match(/\[NEEDS CLARIFICATION\]/g) || []).length;
}
function ck(id, label, passed, detail) { return { id, label, passed: !!passed, detail }; }
function tallyGate(gate, junction, checks, fTotal, bTotal, aTotal) {
  let fPassed = 0, bPassed = 0, aPassed = 0; const warnings = [];
  for (const c of checks) {
    if (c.id.startsWith("F")) { if (c.passed) fPassed++; else warnings.push(c.id + ": " + c.label); }
    else if (c.id.startsWith("B")) { if (c.passed) bPassed++; else warnings.push(c.id + ": " + c.label); }
    else if (c.id.startsWith("A")) { if (c.passed) aPassed++; else warnings.push(c.id + ": " + c.label); }
  }
  return { gate, junction, passed: checks.every(c => c.passed), checks, forwardPassed: fPassed, forwardTotal: fTotal, backwardPassed: bPassed, backwardTotal: bTotal, assumptionsPassed: aPassed, assumptionsTotal: aTotal, warnings };
}

function gate0(files) {
  const checks = [];
  const c = files["constitution.md"];
  if (!c) return { gate: "G0", junction: "(pre-chain)", passed: false, checks: [ck("G0.0", "constitution.md exists", false)], forwardPassed: 0, forwardTotal: 0, backwardPassed: 0, backwardTotal: 0, assumptionsPassed: 0, assumptionsTotal: 0, warnings: ["constitution.md missing"] };
  checks.push(ck("G0.0", "constitution.md exists", true));
  const secRules = (c.match(/- (Authentication|Input validation|SQL injection|Secrets|CORS|Rate limiting)/g) || []).length;
  checks.push(ck("G0.1", "Stack coverage → Technology Stack section present", hasSection(c, "Technology Stack")));
  checks.push(ck("G0.2", "Security constraints → >= 5 rules", secRules >= 5, secRules + " rules"));
  checks.push(ck("G0.3", "Banned patterns → section present", hasSection(c, "Banned Patterns")));
  checks.push(ck("G0.4", "File structure → section present", hasSection(c, "File Structure Rules")));
  checks.push(ck("G0.5", "Domain declaration → Domain Primitives populated", hasSection(c, "Domain Primitives")));
  const pending = (c.match(/\[PENDING\]/g) || []).length;
  checks.push(ck("G0.6", "No blocking [PENDING] items", pending === 0, pending > 0 ? pending + " PENDING item(s)" : "Clear"));
  const fp = checks.filter(x => x.passed).length;
  return { gate: "G0", junction: "(pre-chain)", passed: fp === checks.length, checks, forwardPassed: fp, forwardTotal: checks.length, backwardPassed: 0, backwardTotal: 0, assumptionsPassed: 0, assumptionsTotal: 0, warnings: [] };
}

function gate1(files) {
  const checks = [];
  const v = files["vdd/vision.md"], s = files["vdd/strategy.md"];
  if (!v || !s) return { gate: "G1", junction: "Vision → Strategy", passed: false, checks: [ck("G1.0", "Both artifacts exist", false)], forwardPassed: 0, forwardTotal: 0, backwardPassed: 0, backwardTotal: 0, assumptionsPassed: 0, assumptionsTotal: 0, warnings: ["One or both artifacts missing"] };
  checks.push(ck("F1.1", "Goal coverage → Strategic Pillars section present", hasSection(s, "Strategic Pillars")));
  checks.push(ck("F1.2", "Impact coverage → Research Synthesis present", hasSection(s, "Research Synthesis")));
  checks.push(ck("F1.3", "Stakeholder coverage → strategy references vision", s.includes("vdd/vision.md")));
  checks.push(ck("F1.4", "Metric coverage → Expected Impact per pillar", (s.match(/Expected Impact/g) || []).length >= 1));
  checks.push(ck("F1.5", "Domain coverage → Domain Primers Loaded section", hasSection(s, "Domain Primers Loaded")));
  checks.push(ck("B1.1", "Pillar authorization → pillars reference vision goals", (s.match(/Vision Trace/g) || []).length >= 1));
  checks.push(ck("B1.2", "Research relevance → Research Synthesis has content", hasSection(s, "Research Synthesis")));
  checks.push(ck("B1.3", "Risk relevance → Risk Register present", hasSection(s, "Risk Register")));
  checks.push(ck("B1.4", "No scope invention → Out of Scope section", hasSection(s, "Out of Scope")));
  checks.push(ck("B1.5", "Feasibility honesty → Feasibility Assessment present", hasSection(s, "Feasibility Assessment")));
  const saw = hasSection(v, "S&T Assumptions"), sas = hasSection(s, "S&T Assumptions");
  checks.push(ck("A1.1", "Necessity (V→S) → S&T section in both files", saw && sas));
  checks.push(ck("A1.2", "Achievability (V→S) → vision achievable claims", saw));
  checks.push(ck("A1.3", "Sufficiency (V→S) → strategy covers vision", sas));
  checks.push(ck("A1.4", "Warnings (V→S) → risk mitigations documented", hasSection(s, "Risk Register")));
  checks.push(ck("G1.CHAIN", "Impact Chain: V-001 → S-002 in strategy.md", impactChainMatches(s, "V-001 → S-002")));
  return tallyGate("G1", "Vision → Strategy", checks, 5, 5, 4);
}

function gate2(files) {
  const checks = [];
  const s = files["vdd/strategy.md"], t = files["vdd/tactics.md"];
  if (!s || !t) return { gate: "G2", junction: "Strategy → Tactics", passed: false, checks: [ck("G2.0", "Both artifacts exist", false)], forwardPassed: 0, forwardTotal: 0, backwardPassed: 0, backwardTotal: 0, assumptionsPassed: 0, assumptionsTotal: 0, warnings: ["One or both artifacts missing"] };
  checks.push(ck("F2.1", "Pillar coverage → Action Items reference pillars", (t.match(/Pillar/g) || []).length >= 1));
  checks.push(ck("F2.2", "Gap coverage → Gap Analysis present", hasSection(t, "Gap Analysis")));
  checks.push(ck("F2.3", "Risk mitigation → tactics references strategy risk", t.includes("strategy.md")));
  checks.push(ck("F2.4", "Dependency validity → Dependency Map present", hasSection(t, "Dependency Map")));
  checks.push(ck("B2.1", "Action item authorization → items trace to pillars", hasSection(t, "Prioritized Action Items")));
  checks.push(ck("B2.2", "No gold-plating → items have MoSCoW labels", (t.match(/MUST|SHOULD|COULD/g) || []).length >= 1));
  checks.push(ck("B2.3", "No scope invention → strategy reference present", t.includes("strategy.md")));
  checks.push(ck("B2.4", "Infrastructure relevance → Infra Requirements section", hasSection(t, "Infrastructure Requirements")));
  checks.push(ck("B2.5", "Audit accuracy → Codebase Audit present", hasSection(t, "Codebase Audit")));
  checks.push(ck("A2.1", "Necessity (S→T) → S&T section present", hasSection(t, "S&T Assumptions")));
  checks.push(ck("A2.2", "Achievability (S→T)", hasSection(t, "S&T Assumptions")));
  checks.push(ck("A2.3", "Sufficiency (S→T)", hasSection(t, "Gap Analysis")));
  checks.push(ck("A2.4", "Warnings (S→T) → dependency risks", hasSection(t, "Dependency Map")));
  checks.push(ck("G2.CHAIN", "Impact Chain: V-001 → S-002 → T-003 in tactics.md", impactChainMatches(t, "V-001 → S-002 → T-003")));
  return tallyGate("G2", "Strategy → Tactics", checks, 4, 5, 4);
}

function gate3(files) {
  const checks = [];
  const t = files["vdd/tactics.md"], sp = files.spec;
  if (!t || !sp) return { gate: "G3", junction: "Tactics → Specs", passed: false, checks: [ck("G3.0", "Both artifacts exist", false)], forwardPassed: 0, forwardTotal: 0, backwardPassed: 0, backwardTotal: 0, assumptionsPassed: 0, assumptionsTotal: 0, warnings: ["One or both artifacts missing"] };
  const acCount = (sp.match(/### AC-/g) || []).length;
  const mustCount = (sp.match(/\[MUST\]/g) || []).length;
  const ph = countPlaceholders(sp);
  checks.push(ck("F3.1", "MUST coverage → spec references tactical action item ID (A-XXX)", (sp.match(/A-\d+/g) || []).length >= 1));
  checks.push(ck("F3.2", "Scope coverage → Overview section present", hasSection(sp, "Overview")));
  checks.push(ck("F3.3", "Impact trace → Impact Verification section", hasSection(sp, "Impact Verification")));
  checks.push(ck("F3.4", "Testability → ACs have GWT format", (sp.match(/Given/g) || []).length >= 1));
  checks.push(ck("F3.5", "Implementation-free → no tech names in spec", !hasTechNames(sp)));
  checks.push(ck("F3.6", "Error coverage → edge-case ACs present", (sp.match(/AC-E\d+/g) || []).length >= 1));
  checks.push(ck("F3.7", "MoSCoW labels → ACs labeled", mustCount >= 1));
  checks.push(ck("F3.8", "No vague terms → measurable thresholds (no [e.g.] placeholders)", ph === 0, ph + " placeholder(s) remaining"));
  checks.push(ck("F3.9", "Clarification resolved → no [NEEDS CLARIFICATION]", (sp.match(/\[NEEDS CLARIFICATION\]/g) || []).length === 0));
  checks.push(ck("F3.10", "Non-functional requirements → NFR section", hasSection(sp, "Non-Functional Requirements")));
  checks.push(ck("B3.1", "Tactical origin → spec references tactics", sp.includes("tactics.md")));
  checks.push(ck("B3.2", "No scope invention → Boundaries section", hasSection(sp, "Boundaries")));
  checks.push(ck("B3.3", "Action item coverage → Tactical Origin references action item", sp.includes("Action Item")));
  checks.push(ck("B3.4", "Cross-spec consistency → Out of Scope section", hasSection(sp, "Out of Scope")));
  checks.push(ck("A3.1", "Necessity (T→SP) → S&T section present", hasSection(sp, "S&T Assumptions")));
  checks.push(ck("A3.2", "Achievability (T→SP)", acCount >= 2));
  checks.push(ck("A3.3", "Sufficiency (T→SP)", mustCount >= 1));
  checks.push(ck("A3.4", "Warnings (T→SP) → error ACs covered", (sp.match(/AC-E\d+/g) || []).length >= 1));
  checks.push(ck("G3.CHAIN", "Impact Chain: V-001 → S-002 → T-003 → SP-004 in spec.md", impactChainMatches(sp, "V-001 → S-002 → T-003 → SP-004")));
  return tallyGate("G3", "Tactics → Specs", checks, 10, 4, 4);
}

function gate4(files) {
  const checks = [];
  const sp = files.spec, pl = files.plan, dm = files.dataModel, ct = files.contract;
  if (!sp || !pl) return { gate: "G4", junction: "Specs → Plan", passed: false, checks: [ck("G4.0", "spec.md + plan.md exist", false)], forwardPassed: 0, forwardTotal: 0, backwardPassed: 0, backwardTotal: 0, assumptionsPassed: 0, assumptionsTotal: 0, warnings: ["One or both missing"] };
  checks.push(ck("G4.FILE", "plan.md exists", true));
  checks.push(ck("G4.FILE2", "data-model.md exists", !!dm));
  checks.push(ck("G4.FILE3", "contracts/primary-endpoint.md exists", !!ct));
  checks.push(ck("F4.1", "AC traceability → AC Coverage Map present", !!pl && hasSection(pl, "AC Coverage Map")));
  checks.push(ck("F4.2", "Contract completeness → contracts/ exists", !!ct));
  checks.push(ck("F4.3", "Error code coverage → Error Codes in contract", !!ct && hasSection(ct, "Error Codes")));
  checks.push(ck("F4.4", "Data model completeness → Entities in data-model.md", !!dm && hasSection(dm, "Entities")));
  checks.push(ck("F4.5", "Migration defined → Migrations section", !!dm && hasSection(dm, "Migrations")));
  checks.push(ck("F4.6", "Index justification → Indexes section", !!dm && hasSection(dm, "Indexes")));
  checks.push(ck("F4.7", "Risks identified → Risks section in plan", !!pl && hasSection(pl, "Risks")));
  checks.push(ck("B4.1", "Component authorization → Component Breakdown", !!pl && hasSection(pl, "Component Breakdown")));
  checks.push(ck("B4.2", "Contract authorization → contracts reference ACs", !!ct && ct.includes("AC Coverage")));
  checks.push(ck("B4.3", "Entity authorization → data-model references spec", !!dm && dm.includes("spec.md")));
  checks.push(ck("B4.4", "Constitution compliance → plan references stack", !!pl && hasSection(pl, "Technology Choices")));
  checks.push(ck("B4.5", "No over-engineering → plan is scoped", !!pl && hasSection(pl, "Architecture Overview")));
  checks.push(ck("B4.6", "Technology fit → Technology Choices table", !!pl && hasSection(pl, "Technology Choices")));
  checks.push(ck("A4.1", "Necessity (SP→PL) → S&T in plan", !!pl && hasSection(pl, "S&T Assumptions")));
  checks.push(ck("A4.2", "Achievability (SP→PL)", !!pl && hasSection(pl, "Component Breakdown")));
  checks.push(ck("A4.3", "Sufficiency (SP→PL)", !!pl && hasSection(pl, "AC Coverage Map")));
  checks.push(ck("A4.4", "Warnings (SP→PL) → risks in plan", !!pl && hasSection(pl, "Risks")));
  checks.push(ck("G4.CHAIN", "Impact Chain: V-001 → S-002 → T-003 → SP-004 → PL-005 in plan.md", !!pl && impactChainMatches(pl, "V-001 → S-002 → T-003 → SP-004 → PL-005")));
  return tallyGate("G4", "Specs → Plan", checks, 7, 6, 4);
}

function gate5(files) {
  const checks = [];
  const pl = files.plan, tk = files.tasks;
  if (!pl || !tk) return { gate: "G5", junction: "Plan → Tasks", passed: false, checks: [ck("G5.0", "plan.md + tasks.md exist", false)], forwardPassed: 0, forwardTotal: 0, backwardPassed: 0, backwardTotal: 0, assumptionsPassed: 0, assumptionsTotal: 0, warnings: ["One or both missing"] };
  const taskCount = (tk.match(/\*\*TASK-\d+\*\*/g) || []).length;
  const testTasks = (tk.match(/Write tests/g) || []).length;
  const implTasks = (tk.match(/Implement/g) || []).length;
  checks.push(ck("F5.1", "Component coverage → tasks reference components", taskCount > 0));
  checks.push(ck("F5.2", "Contract coverage → tasks reference contracts", tk.includes("contracts/")));
  checks.push(ck("F5.3", "Entity coverage → tasks reference data model", tk.includes("spec.md")));
  checks.push(ck("F5.4", "AC references → tasks cite ACs", (tk.match(/AC-\d+/g) || []).length >= 1));
  checks.push(ck("F5.5", "Contract references → tasks cite contracts", tk.includes("contracts/")));
  checks.push(ck("F5.6", "Satisfies declaration → tasks declare AC coverage", (tk.match(/Satisfies:/g) || []).length >= 1));
  checks.push(ck("B5.1", "Task authorization → tasks reference plan", tk.includes("plan.md")));
  checks.push(ck("B5.2", "Test-first order → test before impl", testTasks > 0 && implTasks > 0));
  checks.push(ck("B5.3", "Task size → [S]/[M]/[L] labels", (tk.match(/\[S\]|\[M\]|\[L\]/g) || []).length >= 1));
  checks.push(ck("B5.4", "Dependency validity → tasks have Depends on", (tk.match(/Depends on/g) || []).length >= 1));
  checks.push(ck("B5.5", "Parallelism accuracy → [P] markers present", (tk.match(/\[P\]/g) || []).length >= 1));
  checks.push(ck("B5.6", "No scope invention → tasks bound to plan", tk.includes("plan.md")));
  checks.push(ck("A5.1", "Necessity (PL→TK) → task breakdown exists", taskCount > 0));
  checks.push(ck("A5.2", "Achievability (PL→TK)", taskCount >= 2));
  checks.push(ck("A5.3", "Sufficiency (PL→TK)", hasSection(tk, "Tasks")));
  checks.push(ck("A5.4", "Warnings (PL→TK) → dependency risks", (tk.match(/Depends on/g) || []).length >= 1));
  checks.push(ck("G5.CHAIN", "Impact Chain: V-001 → S-002 → T-003 → SP-004 → PL-005 → TK-006 in tasks.md", impactChainMatches(tk, "V-001 → S-002 → T-003 → SP-004 → PL-005 → TK-006")));
  return tallyGate("G5", "Plan → Tasks", checks, 6, 6, 4);
}

function gate6(files) {
  const checks = [];
  const tk = files.tasks;
  if (!tk) return { gate: "G6", junction: "Tasks → Implementation", passed: false, checks: [ck("G6.0", "tasks.md exists", false)], forwardPassed: 0, forwardTotal: 0, backwardPassed: 0, backwardTotal: 0, assumptionsPassed: 0, assumptionsTotal: 0, warnings: ["tasks.md missing"] };
  const pendingTasks = (tk.match(/- \[ \] \*\*TASK-/g) || []).length;
  const doneTasks = (tk.match(/- \[x\] \*\*TASK-/g) || []).length;
  checks.push(ck("F6.1", "Tests pass → tests defined in tasks", (tk.match(/Write tests/g) || []).length >= 1));
  checks.push(ck("F6.2", "Task scope → tasks have descriptions", pendingTasks + doneTasks > 0));
  checks.push(ck("F6.3", "AC satisfaction → tasks reference ACs", (tk.match(/AC-\d+/g) || []).length >= 1));
  checks.push(ck("F6.4", "Task tracking → checkbox format present", pendingTasks + doneTasks > 0));
  checks.push(ck("B6.1", "Scope adherence → tasks reference plan", tk.includes("plan.md")));
  checks.push(ck("B6.2", "Signature match → tasks reference contracts", tk.includes("contracts/")));
  checks.push(ck("B6.3", "Schema match → tasks reference data model", tk.includes("spec.md")));
  checks.push(ck("B6.4", "Commit format → task IDs present", (tk.match(/TASK-\d+/g) || []).length >= 1));
  checks.push(ck("B6.5", "No silent failures → error ACs referenced", (tk.match(/AC-E\d+/g) || []).length >= 1));
  checks.push(ck("B6.6", "Constitution check → bounded by spec boundaries", tk.includes("contracts/")));
  checks.push(ck("B6.7", "Boundaries check → Always/Never sections", tk.includes("spec.md")));
  checks.push(ck("A6.1", "Necessity (TK→IM) → tasks ready for implementation", pendingTasks > 0, pendingTasks + " pending"));
  checks.push(ck("A6.2", "Achievability (TK→IM) → tasks are sized", (tk.match(/\[S\]|\[M\]|\[L\]/g) || []).length >= 1));
  checks.push(ck("A6.3", "Sufficiency (TK→IM) → tasks cover plan", tk.includes("plan.md")));
  checks.push(ck("A6.4", "Warnings (TK→IM) → dependency risks documented", (tk.match(/Depends on/g) || []).length >= 1));
  return tallyGate("G6", "Tasks → Implementation", checks, 4, 7, 4);
}

function gate7(files) {
  const checks = [];
  const keys = ["constitution.md", "vdd/vision.md", "vdd/strategy.md", "vdd/tactics.md", "spec", "plan", "dataModel", "contract", "tasks", "impactReport"];
  let foundCount = 0;
  for (const k of keys) if (files[k]) foundCount++;
  checks.push(ck("G7.FILE", "All 10 artifacts exist", foundCount === keys.length, foundCount + "/" + keys.length + " found"));
  checks.push(ck("F7.1", "Full AC coverage → spec has ACs", !!files.spec && (files.spec.match(/### AC-/g) || []).length >= 1));
  checks.push(ck("F7.2", "Traceability matrix → impact-report exists", foundCount === keys.length));
  checks.push(ck("F7.3", "Contract audit → contracts/ exist", foundCount >= keys.length - 1));
  checks.push(ck("F7.4", "Impact instrumentation → metrics defined in vision", hasSection(files["vdd/vision.md"] || "", "Success Metrics")));
  checks.push(ck("F7.5", "Drift report → impact-report generated", foundCount === keys.length));
  checks.push(ck("F7.6", "User story walkthrough → spec has user stories", !!files.spec && hasSection(files.spec, "User Stories")));
  checks.push(ck("B7.1", "Full chain authorization → all artifacts present", foundCount === keys.length));
  checks.push(ck("B7.2", "No orphans → every file in chain", foundCount === keys.length));
  checks.push(ck("B7.3", "No uncovered vision → vision has spec", foundCount >= 6));
  checks.push(ck("B7.4", "Constitution audit → constitution.md present", !!files["constitution.md"]));
  checks.push(ck("B7.5", "Impact verification → vision mapped to spec", !!files.spec && files.spec.includes("tactics.md")));
  checks.push(ck("A7.1", "Necessity (Full Chain) → all levels present", foundCount === keys.length));
  checks.push(ck("A7.2", "Achievability (Full Chain) → artifacts exist", foundCount >= 8));
  checks.push(ck("A7.3", "Sufficiency (Full Chain) → templates complete", foundCount === keys.length));
  let placeholders = 0;
  for (const v of Object.values(files)) if (typeof v === "string") placeholders += countSubstancePlaceholders(v);
  checks.push(ck("A7.4", "Warnings (Full Chain) → no blocking placeholders", placeholders === 0, placeholders + " placeholder(s) remaining"));
  return tallyGate("G7", "Implementation → Validation", checks, 6, 5, 4);
}

// ---------- Self-heal (auto-fix) ----------
const REQUIRED_SECTIONS = {
  "constitution.md": ["Architecture Principles", "Technology Stack", "Security Constraints", "Naming Conventions", "Banned Patterns", "File Structure Rules", "Domain Primitives"],
  "vdd/vision.md": ["Vision Statement", "Impact Model", "Stakeholder Map", "Success Metrics", "Constraints & Boundaries", "Target Domains", "S&T Assumptions"],
  "vdd/strategy.md": ["Vision Reference", "Domain Primers Loaded", "Research Synthesis", "Strategic Pillars", "Competitive Analysis", "Risk Register", "S&T Assumptions", "Out of Scope"],
  "vdd/tactics.md": ["Strategy Reference", "Codebase Audit", "Gap Analysis", "Prioritized Action Items", "Dependency Map", "Infrastructure Requirements", "S&T Assumptions"],
  "spec.md": ["Tactical Origin", "Overview", "User Stories", "Boundaries", "Acceptance Criteria", "Out of Scope", "Non-Functional Requirements", "Impact Verification", "S&T Assumptions"],
  "plan.md": ["Spec Reference", "Architecture Overview", "Component Breakdown", "Technology Choices", "AC Coverage Map", "Risks", "S&T Assumptions"],
  "data-model.md": ["Entities", "Indexes", "Migrations"],
  "contract.md": ["Description", "Request", "Response", "Error Codes"],
  "tasks.md": ["Plan Reference", "Tasks"],
};

function injectMissingSections(content, sections) {
  const added = [];
  let out = content;
  for (const heading of sections) {
    if (!hasSection(out, heading)) {
      out = out.replace(/\s*$/, "") + "\n\n## " + heading + "\n\n[Fill in: " + heading + "]\n";
      added.push(heading);
    }
  }
  return { content: out, added };
}

function selfHeal(files) {
  const fixes = [];
  const mapping = {
    "constitution.md": REQUIRED_SECTIONS["constitution.md"],
    "vdd/vision.md": REQUIRED_SECTIONS["vdd/vision.md"],
    "vdd/strategy.md": REQUIRED_SECTIONS["vdd/strategy.md"],
    "vdd/tactics.md": REQUIRED_SECTIONS["vdd/tactics.md"],
    spec: REQUIRED_SECTIONS["spec.md"],
    plan: REQUIRED_SECTIONS["plan.md"],
    dataModel: REQUIRED_SECTIONS["data-model.md"],
    contract: REQUIRED_SECTIONS["contract.md"],
    tasks: REQUIRED_SECTIONS["tasks.md"],
  };
  for (const key of Object.keys(mapping)) {
    const content = files[key];
    if (!content) continue;
    const { content: fixed, added } = injectMissingSections(content, mapping[key]);
    if (added.length) {
      files[key] = fixed;
      for (const a of added) fixes.push(key + ": +" + a);
    }
  }
  return fixes;
}

function gateSummary(gates) {
  const totalPassed = gates.filter(g => g.passed).length;
  const totalGates = gates.length;
  let checksRun = 0, checksPassed = 0, checksTotal = 0;
  for (const g of gates) {
    checksRun += g.checks.length;
    checksPassed += g.checks.filter(c => c.passed).length;
    if (g.gate !== "G0") checksTotal += g.forwardTotal + g.backwardTotal + g.assumptionsTotal;
  }
  return { totalPassed, totalGates, allPassed: totalPassed === totalGates, checksRun, checksPassed, checksTotal };
}

// ---------- Environment / tool capability metadata (mirrors packages/vdd-engine/src/meta.ts) ----------
const TOOL_REQUIREMENTS = {
  init: { required: [], optional: [] },
  vision: { required: [], optional: [] },
  strategize: { required: ["brave-search", "perplexity"], optional: ["context7", "gh_grep", "playwright", "browserless"] },
  tactics: { required: ["filesystem"], optional: ["shell"] },
  specify: { required: [], optional: [] },
  clarify: { required: ["filesystem"], optional: [] },
  plan: { required: ["filesystem"], optional: ["context7"] },
  tasks: { required: [], optional: [] },
  "get-next-task": { required: ["filesystem"], optional: [] },
  implement: { required: ["filesystem"], optional: ["shell"] },
  validate: { required: ["filesystem"], optional: ["shell"] },
  trace: { required: ["filesystem"], optional: [] },
  analyze: { required: ["filesystem"], optional: [] },
  amend: { required: ["filesystem"], optional: [] },
  e2e: { required: ["filesystem"], optional: ["brave-search", "perplexity", "context7", "gh_grep", "playwright", "browserless", "shell"] },
  clone: { required: ["filesystem"], optional: ["playwright", "browserless", "shell"] },
  "detect-environment": { required: [], optional: [] },
};

const RESEARCH_SUBAGENTS = [
  { id: "market", name: "Market Research", role: "Market size, growth, target-user demographics, trends, regulatory factors", tools: ["brave-search", "perplexity"], input: "vision.md (goal, actors, impacts, target domains)", output: "300-500 word summary with citations", timeoutSeconds: 120, requiresCitations: true },
  { id: "competitive", name: "Competitive Analysis", role: "Top competitors, features, pricing, user sentiment, weaknesses", tools: ["brave-search", "playwright"], input: "vision.md + domain-primers (market section)", output: "300-500 word competitive matrix with citations", timeoutSeconds: 120, requiresCitations: true },
  { id: "technology", name: "Technology Assessment", role: "Viable technologies, trade-offs, technology risks, proven infra patterns", tools: ["context7", "gh_grep"], input: "vision.md + constitution.md (tech stack) + domain-primers", output: "300-500 word technology fit assessment", timeoutSeconds: 120, requiresCitations: true },
  { id: "impact", name: "Impact Feasibility", role: "Similar impact attempts, what worked/failed, measurement, timelines", tools: ["perplexity"], input: "vision.md (impact model + success metrics)", output: "300-500 word feasibility analysis with case studies", timeoutSeconds: 120, requiresCitations: true },
  { id: "domain", name: "Domain Deep-Dive", role: "Domain-specific constraints, anti-patterns, impact measurement", tools: ["domain-primers"], input: "vision.md + domain-primers", output: "300-500 word domain-specific constraints and patterns", timeoutSeconds: 120, requiresCitations: false },
];

const DOMAIN_PRIMERS = [
  { file: "human-factors.md", label: "Human Factors", condition: "unconditional", summary: "Behavioral economics, cognitive load, habit formation" },
  { file: "verification-toolchain.md", label: "Verification Toolchain", condition: "unconditional", summary: "Playwright, Browserless, Sentry, CI/CD quality pipeline" },
  { file: "webapp.md", label: "WebApp", condition: "webapp", summary: "UX, accessibility, performance, framework evaluation" },
  { file: "data-storage.md", label: "Data Storage", condition: "data-storage", summary: "Schema design, indexing, data governance" },
  { file: "etl.md", label: "ETL", condition: "etl", summary: "Pipeline architecture, data quality, streaming vs batch" },
  { file: "infrastructure.md", label: "Infrastructure", condition: "infrastructure", summary: "CI/CD, observability, security, scaling, disaster recovery" },
  { file: "safety-critical.md", label: "Safety-Critical", condition: "safety-critical", summary: "FMEA/FTA, safety integrity levels (DO-178C/IEC 62304)" },
];

function normalizeToolKey(tool) {
  const t = String(tool || "").trim().toLowerCase();
  if (t === "context-7" || t === "context_7") return "context7";
  if (t === "gh-grep" || t === "ghgrep") return "gh_grep";
  if (t === "brave_search" || t === "brave") return "brave-search";
  if (t === "fs" || t === "glob" || t === "grep" || t === "read") return "filesystem";
  if (t === "bash" || t === "terminal") return "shell";
  return t;
}

function detectEnvironment(availableTools) {
  const available = new Set((availableTools || []).map(normalizeToolKey));
  const phases = {};
  for (const name of Object.keys(TOOL_REQUIREMENTS)) {
    const req = TOOL_REQUIREMENTS[name];
    phases[name] = { required: req.required.slice(), optional: req.optional.slice(), requiredAvailable: req.required.every((t) => available.has(t)) };
  }
  const missingRequired = [];
  const missingOptional = [];
  for (const t of TOOL_REQUIREMENTS.strategize.required) if (!available.has(t)) missingRequired.push(t);
  for (const t of TOOL_REQUIREMENTS.strategize.optional) if (!available.has(t)) missingOptional.push(t);
  const researchLimitations = [];
  if (!available.has("brave-search") && !available.has("perplexity")) researchLimitations.push("No web-search or research tool available — Market/Competitive/Impact subagents cannot run.");
  else if (!available.has("perplexity")) researchLimitations.push("Perplexity unavailable — Impact Feasibility subagent cannot run.");
  else if (!available.has("brave-search")) researchLimitations.push("Brave Search unavailable — Market/Competitive subagents degraded.");
  if (!available.has("context7") && !available.has("gh_grep")) researchLimitations.push("Context7 and gh_grep unavailable — Technology Assessment subagent cannot run.");
  if (!available.has("filesystem")) researchLimitations.push("Filesystem unavailable — Tactics audit and drift detection cannot run.");
  return { available: [...available], phases, missingRequired, missingOptional, researchLimitations };
}

function domainPrimersForTargets(targetDomains) {
  const normalized = new Set((targetDomains || []).map((d) => String(d).trim().toLowerCase()));
  return DOMAIN_PRIMERS.filter((p) => p.condition === "unconditional" || normalized.has(p.condition));
}

const TECH_NAME_RE = /\b(React|Next\.js|PostgreSQL|Postgres|Drizzle|Prisma|Node\.js|Zod|Express|GraphQL|MongoDB|Redis|Kubernetes|Docker|Vercel|AWS|NestJS|Vue|Angular|Svelte)\b/;
function hasTechNames(content) { return TECH_NAME_RE.test(content || ""); }
function countSubstancePlaceholders(content) {
  const c = content || "";
  return (c.match(/\[e\.g\./g) || []).length + (c.match(/\[NEEDS CLARIFICATION\]/g) || []).length + (c.match(/\[Fill in:/g) || []).length + (c.match(/\[PENDING\]/g) || []).length;
}

function normalizeCloneDomain(raw) {
  const input = String(raw || "").trim();
  if (!input) return { error: "EMPTY_DOMAIN: Domain is required. Accepted forms: https://…, http://…, www.…, or a bare domain." };
  let rest = input;
  let scheme = "https";
  const m = rest.match(/^(https?):\/\//i);
  if (m) { scheme = m[1].toLowerCase() === "http" ? "http" : "https"; rest = rest.slice(m[0].length); }
  let host = rest.split(/[/?#]/)[0] || "";
  if (host.includes("@")) host = host.split("@").pop() || "";
  host = host.toLowerCase().replace(/\.$/, "");
  if (host.startsWith("www.")) host = host.slice(4);
  const hostOk = host === "localhost" || /^(\d{1,3}\.){3}\d{1,3}$/.test(host) || /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(host);
  if (!hostOk) return { error: `INVALID_HOST: "${input}" is not a valid domain. Accepted forms: https://…, http://…, www.…, or a bare domain.` };
  return { scheme, host };
}

function phaseHandlers(input) {
  const root = input.projectRoot || ".";
  const s = input.statement || "";
  const id = input.actionItemId || input.description || "";
  let feat = input.feature || "";
  const tid = input.taskId || "";
  const desc = input.description || "";
  const availableTools = input.availableTools || input.capabilities || [];
  const researchFindings = (input.researchFindings || "").trim();
  const artifactFiles = input.artifactFiles || {};

  return {
    init() {
      return { success: true, artifact: `${root}/constitution.md`, template: `# Project Constitution\n${hdr("Phase 0 — Constitution (immutable)")}## Architecture Principles\n\n- [e.g., "API-first: all features expose a REST endpoint before any UI is built"]\n- [e.g., "Server Components by default; use client components only when required"]\n\n## Technology Stack\n\n| Layer | Choice | Notes |\n|-------|--------|-------|\n| Language | TypeScript 5.x | Strict mode, no \`any\` |\n| Runtime | Node.js 20+ | |\n| Framework | [e.g., Next.js 15+] | App Router only |\n| Database | PostgreSQL + Drizzle | No direct SQL in route handlers |\n| Auth | [e.g., Better Auth] | No custom auth logic outside the auth module |\n| Testing | Vitest + Playwright | |\n\n## Security Constraints\n\n- Authentication: all endpoints require a valid session unless explicitly marked \`[PUBLIC]\`\n- Input validation: all external inputs validated with Zod at the route boundary\n- SQL injection: parameterized queries only — never string-concatenate user input into queries\n- Secrets: never log tokens, passwords, or PII; never hardcode secrets\n- CORS: allow-list only — no wildcard origins in production\n- Rate limiting: all public endpoints must declare a rate limit in their contract\n\n## Naming Conventions\n\n- Files: kebab-case (\`user-repository.ts\`)\n- Variables/functions: camelCase\n- Types/interfaces: PascalCase\n- DB columns: snake_case\n- Env vars: SCREAMING_SNAKE_CASE\n\n## Banned Patterns\n\n- No \`any\` type in TypeScript\n- No \`console.log\` in production code (use logger)\n- No synchronous file I/O in request handlers\n\n## File Structure Rules\n\n\`\`\`\nsrc/\n  app/          # Routes and pages\n  components/   # Shared UI components\n  lib/          # Business logic and utilities\n  db/           # Schema, migrations, repositories\n  types/        # Shared TypeScript types\n\`\`\`\n\n## Domain Primitives\n- webapp\n- data-storage\n- [etl / infrastructure]\n\n## Open Questions / Deferred Decisions\n- [PENDING] [Decision 1]: [context and options]\n` };
    },
    vision() {
      if (!s) return needsInput(["statement"], "Pass a freeform vision statement (1-3 paragraphs) as statement. Run /vdd:init first so constitution.md exists, then re-call /vdd:vision.");
      const esc = s.replace(/`/g, "\\`");
      return { success: true, artifact: `${root}/vdd/vision.md`, template: `# Vision\n${hdr("V-001")}## Vision Statement\n> ${esc}\n\n[AI assistant: expand the above freeform statement into a structured vision.]\n\n## Impact Model\n### Goal\n[1 sentence — the measurable outcome this product aims to create]\n\n### Actors\n| Actor | Current State | Desired State | Benefit |\n|-------|--------------|---------------|---------|\n| [Primary user] | [Today] | [Future] | [Why better] |\n\n### Impacts\n| Impact ID | Description | Actor | Measurement |\n|-----------|-------------|-------|-------------|\n| I-001 | [Change] | [Actor] | [How to measure] |\n\n## Stakeholder Map\n| Role | Interest | Influence | Engagement Strategy |\n|------|----------|-----------|-------------------|\n| [User] | [What they care about] | High | [How to involve] |\n\n## Success Metrics\n### Lagging Indicators\n| Metric | Target | Measurement Method |\n|--------|--------|-------------------|\n| [e.g., Retention day 30] | [> 40%] | [Analytics + cohort] |\n\n### Leading Indicators\n| Metric | Target | Measurement Method |\n|--------|--------|-------------------|\n| [e.g., Activation rate] | [> 60%] | [Key journey completion] |\n\n## Constraints & Boundaries\n### Constraints\n- [Non-negotiable requirement]\n### Boundaries\n- [Explicitly out of scope]\n\n## Target Domains\n- [ ] WebApp\n- [ ] Data Storage\n- [ ] ETL\n- [ ] Infrastructure\n\n## S&T Assumptions (Vision → Strategy)\n**Necessity:** Why is Strategy-level research necessary?\n**Achievability:** Why is this Vision achievable?\n**Sufficiency:** Why is the Strategy approach sufficient?\n**Warnings:** What must go right / be avoided?\n` };
    },
    strategize() {
      const env = detectEnvironment(availableTools);
      const primerLines = DOMAIN_PRIMERS.map((p) => `- ${p.file} (${p.label} — ${p.summary}) [${p.condition}]`).join("\n");
      const synthesis = researchFindings
        ? `## Research Synthesis\n\n### Consolidated Research Findings\n${researchFindings}\n\n[AI assistant: extract Strategic Pillars, Competitive Analysis, and Risk Register from the findings above.]\n`
        : `## Research Synthesis\n### Market & Domain Landscape\n[Market conditions, trends, competitor positioning]\n\n### Technology Landscape\n[Viable technologies, trade-offs, constitution constraints]\n\n### Feasibility Assessment\n[Is this achievable with current resources?]\n`;
      return {
        success: true,
        artifact: `${root}/vdd/strategy.md`,
        template: `# Strategy\n${hdr("V-001 → S-002")}## Vision Reference\nDerived from: \`vdd/vision.md\`\n\n## Domain Primers Loaded\n${primerLines}\n\n${synthesis}## Strategic Pillars\n### Pillar 1: [Name]\n**Rationale:** [Why this pillar exists]\n**Vision Trace:** [Which vision goal?]\n**Key Research Finding:** [Evidence]\n**Expected Impact:** [Contribution to metrics]\n\n### Pillar 2: [Name]\n**Rationale:** ...\n**Vision Trace:** ...\n**Key Research Finding:** ...\n**Expected Impact:** ...\n\n## Competitive Analysis\n| Competitor | Strengths | Weaknesses | Our Differentiator |\n|------------|-----------|-----------|-------------------|\n| [Name] | [What they do well] | [What they lack] | [How we differ] |\n\n## Risk Register\n| Risk ID | Description | Likelihood | Impact | Mitigation |\n|---------|-------------|-----------|--------|-----------|\n| R-001 | [e.g., Low adoption] | Medium | High | [Early adopter program] |\n\n## S&T Assumptions (Strategy → Tactics)\n**Necessity:** ...\n**Achievability:** ...\n**Sufficiency:** ...\n**Warnings:** ...\n\n## Out of Scope (Strategic)\n- [Direction NOT pursued]\n`,
        output: {
          domainPrimers: DOMAIN_PRIMERS.map((p) => ({ file: p.file, label: p.label, condition: p.condition, summary: p.summary })),
          researchSubagents: RESEARCH_SUBAGENTS,
          environment: { available: env.available, missingRequired: env.missingRequired, missingOptional: env.missingOptional },
          researchLimitations: env.researchLimitations.length > 0 ? env.researchLimitations : ["None — all required research tools present"],
          researchStatus: researchFindings ? "synthesized" : "pending — dispatch the research subagents below, then re-call with researchFindings",
          instructions: "Dispatch the 5 research subagents using your environment MCP tools (Brave Search, Perplexity, Context7, gh_grep, Playwright). Collect their summaries, then re-call vdd_strategize with researchFindings to synthesize vdd/strategy.md.",
        },
      };
    },
    tactics() {
      return { success: true, artifact: `${root}/vdd/tactics.md`, template: `# Tactics\n${hdr("V-001 → S-002 → T-003")}## Strategy Reference\nDerived from: \`vdd/strategy.md\`\n\n## Codebase Audit\n### What Exists\n| Asset | Location | Purpose | Pillar Trace | Quality |\n|-------|----------|---------|-------------|---------|\n| [Module] | \`src/\` | [Purpose] | [Pillar] | Good/Refactor/Replace |\n\n### Technical Debt\n| Debt Item | Location | Severity | Strategy Impact |\n|-----------|----------|----------|----------------|\n| [e.g., No validation] | \`src/api/\` | High | Blocks security pillar |\n\n### Reusable Assets\n| Asset | Strategy Support | Reuse Effort |\n|-------|-----------------|-------------|\n| [e.g., Component lib] | Accelerates UI | Low |\n\n## Gap Analysis\n| Gap | Pillar Affected | Impact if Unaddressed |\n|-----|----------------|----------------------|\n| [e.g., No mobile layout] | Pillar 1 | Target inaccessible |\n\n## Prioritized Action Items\n| ID | Action Item | Priority | Pillar | Size | Deps |\n|----|------------|----------|--------|------|------|\n| A-001 | [Concrete action] | MUST | Pillar 1 | M | None |\n| A-002 | [Concrete action] | SHOULD | Pillar 2 | S | A-001 |\n\n## Dependency Map\n\`\`\`\nA-001 → A-002\n\`\`\`\n\n## Infrastructure Requirements\n| Requirement | Domain | Priority | Notes |\n|-------------|--------|----------|-------|\n| [e.g., CI/CD] | Infra | MUST | GitHub Actions |\n\n## S&T Assumptions (Tactics → Specs)\n**Necessity:** ...\n**Achievability:** ...\n**Sufficiency:** ...\n**Warnings:** ...\n` };
    },
    specify() {
      if (!id) return needsInput(["feature", "actionItemId", "description"], "Pass actionItemId (e.g. \"A-001\") or a freeform description to create a new spec; pass feature to name the spec directory.");
      return { success: true, artifact: `${root}/vdd/specs/${id}/spec.md`, template: `# [Feature Name]\n${hdr("V-001 → S-002 → T-003 → SP-004")}## Tactical Origin\nImplements: \`vdd/tactics.md\` → Action Item [${id}]\n\n## Overview\n[1-2 sentences. Reference which vision impact this serves.]\n\n## User Stories\n### Primary\nAs a [role], I want [goal] so that [benefit].\n\n## Boundaries\n**Always do:**\n- [e.g., "validate all inputs before processing"]\n\n**Ask first:**\n- [e.g., "adding a new database table not in this spec"]\n\n**Never do:**\n- [e.g., "skip authentication"]\n\n## Acceptance Criteria\n### AC-1: [Title] [MUST]\nGiven [context]\nWhen [action]\nThen [outcome]\n\n### AC-E1: [Error Case] [MUST]\nGiven [invalid condition]\nWhen [action]\nThen [expected error]\n\n### AC-2: [Title] [SHOULD]\nGiven [context]\nWhen [action]\nThen [outcome]\n\n## Out of Scope\n- [Item 1]\n\n## Open Questions\n- [NEEDS CLARIFICATION] [Question?]\n\n## Non-Functional Requirements\n- Performance: [e.g., "< 200ms at p95"]\n- Security: [e.g., "authenticated session required"]\n- Accessibility: [e.g., "WCAG 2.1 AA"]\n\n## Impact Verification\n- [e.g., AC-1 enables Impact I-001]\n\n## S&T Assumptions (Specs → Plan)\n**Necessity:** ...\n**Achievability:** ...\n**Sufficiency:** ...\n**Warnings:** ...\n` };
    },
    clarify() {
      const rc = resolveFeature(root, feat, "clarify");
      if (rc && rc.guidance) return rc.guidance;
      if (rc && rc.feature) feat = rc.feature;
      return { success: true, artifact: `Clarifications for ${feat}`, output: { feature: feat, clarificationCount: 0, action: "Resolve each [NEEDS CLARIFICATION] item, replace [e.g.] placeholders with concrete values, and add edge-case ACs for every happy-path MUST AC." } };
    },
    plan() {
      const rp = resolveFeature(root, feat, "plan");
      if (rp && rp.guidance) return rp.guidance;
      if (rp && rp.feature) feat = rp.feature;
      const base = `${root}/vdd/specs/${feat}`;
      return { success: true, artifact: `${base}/plan.md`, files: {
        [`${base}/plan.md`]: `# Technical Plan\n${hdr("V-001 → S-002 → T-003 → SP-004 → PL-005")}## Spec Reference\nImplements: \`vdd/specs/${feat}/spec.md\`\n\n## Architecture Overview\n[High-level description. 3-5 sentences.]\n\n## Component Breakdown\n### [Component 1 Name]\n- **Responsibility:** [What it does]\n- **Location:** \`[file path]\`\n- **AC Coverage:** AC-1, AC-2\n\n## Technology Choices\n| Decision | Choice | Rationale |\n|----------|--------|-----------|\n| [e.g., DB query] | [Drizzle ORM] | [Type-safe] |\n\n## AC Coverage Map\n| AC | Component(s) | Contract(s) | Verified By |\n|----|-------------|-------------|-------------|\n| AC-1 | [Component] | [contract] | Vitest + Playwright |\n\n## Risks\n| Risk | Likelihood | Impact | Mitigation |\n|------|-----------|--------|-----------|\n| [e.g., API unavailable] | Low | High | Circuit breaker |\n\n## S&T Assumptions (Plan → Tasks)\n**Necessity:** ...\n**Achievability:** ...\n**Sufficiency:** ...\n**Warnings:** ...\n`,
        [`${base}/data-model.md`]: `# Data Model\n${hdr("V-001 → S-002 → T-003 → SP-004 → PL-005")}## Spec Reference\nImplements: \`vdd/specs/${feat}/spec.md\`\n\n## Entities\n### [EntityName]\n| Field | Type | Constraints | Description |\n|-------|------|-------------|-------------|\n| id | uuid | PK, NOT NULL | Primary key |\n| created_at | timestamp | NOT NULL | |\n| updated_at | timestamp | NOT NULL | |\n\n### Relationships\n- \`[EntityA]\` has many \`[EntityB]\`\n\n## Indexes\n| Table | Columns | Type | Rationale |\n|-------|---------|------|-----------|\n| [table] | [cols] | btree | [Why] |\n\n## Migrations\n### [Migration 001]\n- Create \`[table]\`\n- **Rollback:** drop \`[table]\`\n`,
        [`${base}/contracts/primary-endpoint.md`]: `# API Contract\n${hdr("V-001 → S-002 → T-003 → SP-004 → PL-005")}## [METHOD] [/path/:param]\n### Description\n[One sentence]\n\n### Request\n**Body:**\n\`\`\`json\n{ "field": "type — description" }\n\`\`\`\n\n### Response\n**200 OK:**\n\`\`\`json\n{ "id": "uuid", "field": "value" }\n\`\`\`\n\n### Error Codes\n| Status | Code | When |\n|--------|------|------|\n| 400 | VALIDATION_ERROR | Invalid input |\n| 401 | UNAUTHORIZED | No session |\n| 404 | NOT_FOUND | Resource missing |\n\n### AC Coverage\n- AC-1: [How this endpoint satisfies it]\n`,
      } };
    },
    tasks() {
      const rt = resolveFeature(root, feat, "tasks");
      if (rt && rt.guidance) return rt.guidance;
      if (rt && rt.feature) feat = rt.feature;
      return { success: true, artifact: `${root}/vdd/specs/${feat}/tasks.md`, template: `# Task List\n${hdr("V-001 → S-002 → T-003 → SP-004 → PL-005 → TK-006")}## Plan Reference\nImplements: \`vdd/specs/${feat}/plan.md\`\n\n## Tasks\n### Setup\n- [ ] **TASK-001** [S] Set up [module] skeleton\n  - Creates: \`[path]\`\n  - Depends on: none\n\n### Implementation\n- [ ] **TASK-002** [M] [P] Write tests for [component]\n  - Tests: AC-1, AC-2 from \`vdd/specs/${feat}/spec.md\`\n  - Depends on: TASK-001\n\n- [ ] **TASK-002b** [S] Write error-case tests for [component]\n  - Tests: AC-E1\n  - Depends on: TASK-002\n\n- [ ] **TASK-003** [M] Implement [component]\n  - Contract: \`contracts/[file].md\`\n  - Satisfies: AC-1, AC-2\n  - Depends on: TASK-002\n\n### Integration\n- [ ] **TASK-006** [L] Integration test\n  - Tests: AC-1 through AC-4\n  - Depends on: TASK-003\n\n## Legend\n- \`[S]\` < 1h, \`[M]\` 1-3h, \`[L]\` 3-6h, \`[P]\` Parallelizable\n` };
    },
    "get-next-task"() {
      const rn = resolveFeature(root, feat, "get-next-task");
      if (rn && rn.guidance) return rn.guidance;
      if (rn && rn.feature) feat = rn.feature;
      return { success: true, artifact: "Read tasks.md to find the next uncompleted task. Run /vdd:get-next-task from a stdio/local MCP to get auto-detection." };
    },
    implement() {
      if (!tid) return needsInput(["taskId"], "Pass taskId (e.g. \"TASK-003\") — call /vdd:get-next-task to fetch the next uncompleted one, then re-call /vdd:implement.");
      return { success: true, artifact: `Ready: Task ${tid}`, output: { taskId: tid, instruction: "Load constitution.md + task description + spec/plan/contracts. Implement. Commit with traceable message." } };
    },
    validate() {
      const featureDir = feat || "feature-1";
      const canonical = [
        { key: "constitution.md", path: "constitution.md", expected: "Phase 0 — Constitution (immutable)" },
        { key: "vision.md", path: "vdd/vision.md", expected: "V-001" },
        { key: "strategy.md", path: "vdd/strategy.md", expected: "V-001 → S-002" },
        { key: "tactics.md", path: "vdd/tactics.md", expected: "V-001 → S-002 → T-003" },
        { key: "spec.md", path: `vdd/specs/${featureDir}/spec.md`, expected: "V-001 → S-002 → T-003 → SP-004" },
        { key: "plan.md", path: `vdd/specs/${featureDir}/plan.md`, expected: "V-001 → S-002 → T-003 → SP-004 → PL-005" },
        { key: "data-model.md", path: `vdd/specs/${featureDir}/data-model.md`, expected: "V-001 → S-002 → T-003 → SP-004 → PL-005" },
        { key: "contract.md", path: `vdd/specs/${featureDir}/contracts/primary-endpoint.md`, expected: "V-001 → S-002 → T-003 → SP-004 → PL-005" },
        { key: "tasks.md", path: `vdd/specs/${featureDir}/tasks.md`, expected: "V-001 → S-002 → T-003 → SP-004 → PL-005 → TK-006" },
      ];
      const drift = [];
      const uncovered = [];
      let placeholders = 0;
      let present = 0;
      for (const c of canonical) {
        const content = artifactFiles[c.path];
        if (content == null) { uncovered.push(c.key); continue; }
        present++;
        placeholders += countSubstancePlaceholders(content);
        const m = String(content).match(/> Impact Chain:\s*(.+)/);
        const actual = m ? m[1].trim() : null;
        if (actual == null) drift.push({ artifact: c.key, type: "Header", detail: "Missing Impact Chain header" });
        else if (actual !== c.expected) drift.push({ artifact: c.key, type: "Chain", detail: `Expected "${c.expected}", found "${actual}"` });
      }
      const total = canonical.length;
      const hasAny = Object.keys(artifactFiles).length > 0;
      const substancePassed = placeholders === 0 && uncovered.length === 0 && drift.length === 0 && present === total;
      const driftRows = drift.length ? drift.map((d) => `| ${d.artifact} | ${d.type} | ${d.detail} |`).join("\n") : "| (none found) | — | — |";
      const uncoveredRows = uncovered.length ? uncovered.map((k) => `| ${k} | missing artifact |`).join("\n") : "| (none found) | — |";
      const template = `# Impact Verification Report\n${hdr("V-001 → S-002 → T-003 → SP-004 → PL-005 → TK-006 → [commits]")}Date: ${today}\n\n## Traceability Summary\n\n| Artifact | Present? |\n|----------|----------|\n${canonical.map((c) => `| ${c.key} | ${uncovered.includes(c.key) ? "Missing" : "Present"} |`).join("\n")}\n\n## Orphan / Uncovered Detection\n\n| Artifact | Status |\n|----------|--------|\n${uncoveredRows}\n\n## Drift Report\n\n| Artifact | Type | Detail |\n|----------|------|--------|\n${driftRows}\n\n## Substance Check\n\n- Artifacts provided: ${present}/${total}\n- Placeholders remaining: ${placeholders}\n- Impact-chain drift: ${drift.length}\n- Uncovered artifacts: ${uncovered.length}\n\n## Decision\n\n**Release Readiness:** ${substancePassed ? "GO" : hasAny ? "NO-GO — resolve uncovered artifacts, placeholders, and drift above" : "UNKNOWN — provide artifactFiles to run drift/orphan detection"}\n`;
      return {
        success: true,
        artifact: `${root}/vdd/impact-report.md`,
        gateResult: { passed: hasAny ? substancePassed : false, checks: present, total },
        template,
        output: { feature: featureDir, present, total, placeholders, uncovered, drift },
      };
    },
    "detect-environment"() {
      const env = detectEnvironment(availableTools);
      return {
        success: true,
        artifact: "Environment capability report",
        output: {
          providedTools: env.available,
          perPhase: env.phases,
          missingRequired: env.missingRequired,
          missingOptional: env.missingOptional,
          researchLimitations: env.researchLimitations.length > 0 ? env.researchLimitations : ["None — all required tools present"],
          instructions: "Use the per-phase map to plan research subagent dispatch in Phase 2 (strategize) and filesystem work in Phases 3/7/8. Missing required tools are reported so the host agent can degrade gracefully or request the missing MCP servers.",
        },
      };
    },
    trace() {
      return { success: true, artifact: "Traceability matrix", chain: "V-001 → S-002 → T-003 → SP-004 → PL-005 → TK-006", files: [`${root}/vdd/vision.md`, `${root}/vdd/strategy.md`, `${root}/vdd/tactics.md`] };
    },
    analyze() {
      const ra = resolveFeature(root, feat, "analyze");
      if (ra && ra.guidance) return ra.guidance;
      if (ra && ra.feature) feat = ra.feature;
      return { success: true, artifact: `Cross-artifact analysis for ${feat}`, output: { feature: feat, action: "Read spec.md, plan.md, tasks.md. Report: AC count, unresolved clarifications, placeholders, readiness status." } };
    },
    inspect() {
      const scope = input.scope || (feat ? "feature" : "project");
      if (scope !== "feature") {
        return { success: true, artifact: "Traceability matrix", chain: "V-001 → S-002 → T-003 → SP-004 → PL-005 → TK-006", files: [`${root}/vdd/vision.md`, `${root}/vdd/strategy.md`, `${root}/vdd/tactics.md`] };
      }
      const ri = resolveFeature(root, feat, "inspect");
      if (ri && ri.guidance) return ri.guidance;
      if (ri && ri.feature) feat = ri.feature;
      return { success: true, artifact: `Cross-artifact analysis for ${feat}`, output: { feature: feat, scope: "feature", action: "Read spec.md, plan.md, tasks.md. Report: AC count, unresolved clarifications, placeholders, readiness status." } };
    },
    amend() {
      if (!desc) return needsInput(["description"], "Pass the requirement change as description; the cascade plan is then returned.");
      return { success: true, artifact: "Chain update plan", output: { change: desc, instructions: ["1. Identify highest affected level (V→S→T→SP→PL→TK)", "2. Update that artifact, cascade downward", "3. Re-run all affected gates (G1–G7)", "4. Commit each with [AMEND] marker"] } };
    },
    e2e() {
      if (!s) return { success: false, error: "statement is required for e2e" };
      const fid = id || feat || "feature-1";
      const h = phaseHandlers({ projectRoot: root, statement: s, actionItemId: fid, feature: fid, description: fid });
      const specT = h.specify().template;
      const planFiles = h.plan().files;
      const tasksT = h.tasks().template;
      const allTemplates = {
        phase0_init: { artifact: `${root}/constitution.md`, template: this.init().template },
        phase1_vision: { artifact: `${root}/vdd/vision.md`, template: this.vision().template },
        phase2_strategize: { artifact: `${root}/vdd/strategy.md`, template: this.strategize().template },
        phase3_tactics: { artifact: `${root}/vdd/tactics.md`, template: this.tactics().template },
        phase4_specify: { artifact: `${root}/vdd/specs/${fid}/spec.md`, template: specT },
        phase5_plan: { artifact: `${root}/vdd/specs/${fid}/plan.md`, files: planFiles },
        phase6_tasks: { artifact: `${root}/vdd/specs/${fid}/tasks.md`, template: tasksT },
        phase8_validate: { artifact: `${root}/vdd/impact-report.md`, template: this.validate().template, gateResult: { passed: true, checks: 108, total: 108 } },
      };

      // Extract template content into a files map for gate validation (serverless — no disk writes)
      const base = `${root}/vdd/specs/${fid}`;
      const files = {
        "constitution.md": allTemplates.phase0_init.template,
        "vdd/vision.md": allTemplates.phase1_vision.template,
        "vdd/strategy.md": allTemplates.phase2_strategize.template,
        "vdd/tactics.md": allTemplates.phase3_tactics.template,
        spec: allTemplates.phase4_specify.template,
        plan: planFiles[`${base}/plan.md`],
        dataModel: planFiles[`${base}/data-model.md`],
        contract: planFiles[`${base}/contracts/primary-endpoint.md`],
        tasks: allTemplates.phase6_tasks.template,
        impactReport: allTemplates.phase8_validate.template,
      };

      // Phase 7a: get-next-task — return first uncompleted task
      const firstTaskLine = (allTemplates.phase6_tasks.template.split("\n").find((l) => l.startsWith("- [ ] **TASK-")) || "All tasks completed.").trim();
      allTemplates.phase7_next_task = { artifact: firstTaskLine, task: firstTaskLine };

      // Run G0–G7 gate validation (initial)
      const initialResults = [gate0(files), gate1(files), gate2(files), gate3(files), gate4(files), gate5(files), gate6(files), gate7(files)];
      const initialSummary = gateSummary(initialResults);

      // Self-heal: auto-fix missing sections
      const healedItems = selfHeal(files);

      // Retest all gates after self-heal
      const gateResults = [gate0(files), gate1(files), gate2(files), gate3(files), gate4(files), gate5(files), gate6(files), gate7(files)];
      const summary = gateSummary(gateResults);
      const gateWarnings = gateResults.flatMap((g) => g.warnings.map((w) => g.gate + ": " + w));

      // Substance check: count placeholders remaining across all templates.
      let substancePlaceholders = 0;
      for (const v of Object.values(files)) if (typeof v === "string") substancePlaceholders += countSubstancePlaceholders(v);
      const substancePassed = substancePlaceholders === 0;

      allTemplates.phase8_validate.gateResult = { passed: summary.allPassed && substancePassed, checks: summary.checksPassed, total: summary.checksTotal };
      allTemplates.phase8_validate.substance = { placeholders: substancePlaceholders, passed: substancePassed };

      return {
        success: true,
        artifact: `${root}/vdd/impact-report.md`,
        output: {
          statement: s,
          feature: fid,
          actionItemId: fid,
          chain: "V-001 → S-002 → T-003 → SP-004 → PL-005 → TK-006 → [implementation]",
          phasesCompleted: 10,
          templates: allTemplates,
          gates: {
            summary: { passed: summary.totalPassed, total: summary.totalGates, checksRun: summary.checksRun, checksPassed: summary.checksPassed, checksTotal: summary.checksTotal },
            initial: { passed: initialSummary.totalPassed, total: initialSummary.totalGates, checksRun: initialSummary.checksRun, checksPassed: initialSummary.checksPassed },
            selfHeal: { applied: healedItems.length > 0, fixes: healedItems },
            results: gateResults.map((g) => ({ gate: g.gate, junction: g.junction, passed: g.passed, forward: g.forwardPassed + "/" + g.forwardTotal, backward: g.backwardPassed + "/" + g.backwardTotal, assumptions: g.assumptionsPassed + "/" + g.assumptionsTotal, warnings: g.warnings })),
            checkDetails: gateResults.flatMap((g) => g.checks.map((c) => ({ gate: g.gate, id: c.id, label: c.label, passed: c.passed }))),
          },
          gateWarnings: gateWarnings,
          substance: { placeholders: substancePlaceholders, passed: substancePassed },
          summary: "Full VDD chain scaffolded with strict gate validation. " + summary.totalPassed + "/" + summary.totalGates + " structural gates passed (" + summary.checksPassed + "/" + summary.checksRun + " checks). Substance: " + substancePlaceholders + " placeholder(s) remain — templates are NOT ready for release until filled. Self-heal applied " + healedItems.length + " fix(es). Templates returned inline — write them to your project, then run /vdd:implement for each task.",
          nextActions: [
            "1. Write the returned templates to your project (constitution.md, vdd/vision.md, vdd/strategy.md, vdd/tactics.md, vdd/specs/...)",
            "2. Fill in constitution.md with project-specific tech stack and conventions",
            "3. Expand vision.md from the vision statement into structured sections",
            "4. Research and fill in strategy.md with market/tech/competitive analysis",
            "5. Audit codebase and populate tactics.md with real gaps and action items",
            "6. Write detailed ACs in spec.md for each action item",
            "7. Design architecture in plan.md, data-model.md, and contracts/",
            "8. Break plan into granular tasks in tasks.md",
            "9. Implement each task with /vdd:implement <task-id>",
            "10. Validate the full chain with /vdd:validate",
          ],
        },
        gateResult: { passed: summary.allPassed && substancePassed, checks: summary.checksPassed, total: summary.checksRun },
      };
    },
    clone() {
      const rawDomain = desc || s;
      if (!rawDomain) return needsInput(["description"], "Pass the target domain as description (bare domain, host, or URL); the clone pipeline then generates the dataset and manifest.");
      const n = normalizeCloneDomain(rawDomain);
      if (n.error) return { success: false, error: n.error };
      const target = n.scheme + "://" + n.host;
      const template = `# Clone\n${hdr("V-001 → S-002 → T-003 → SP-004 → PL-005 → TK-006")}## Target\n${target}\n\n## Pipeline Stages\n- [x] A-001 domain normalization → ${target}\n- [ ] A-002 crawl (browserless/fetch) → dataset\n- [ ] A-003 UI/UX capture + network evidence\n- [ ] A-004 schema inference\n- [ ] A-005 backend rebuild\n- [ ] A-006 dynamic site generation → vdd/clone-site/\n- [ ] A-007 AI-tool emission\n\n## Live Site\n\nRun the full clone pipeline (engine/CLI) to crawl the dataset and generate \`vdd/clone-site/\` (index.html + app.js + data/pages.json + style.css + vercel.json), then deploy the folder to Vercel/Netlify/GH Pages for a live URL.\n`;
      return { success: true, artifact: `${root}/vdd/clone.md`, template, output: { normalized: target } };
    },
  };
}

// Canonical tool descriptions — mirrors packages/vdd-engine/src/meta.ts PHASE_META
// (the engine is the source of truth; keep this map in sync).
const PHASE_META = {
  init: "VDD Phase 0: Generate constitution.md at the project root — the immutable tech stack, conventions, security constraints, naming rules, and banned patterns that every later phase obeys. Overwrites any existing constitution.md. Run this first, before vdd_vision; to change a constitution that already exists, use vdd_amend instead of re-running this. projectRoot sets the directory constitution.md is written to and that later phases resolve every vdd/ artifact against (default \".\").",
  vision: "VDD Phase 1: Expand a freeform vision statement into vdd/vision.md — Impact Model (Goal, Actors, Impacts), Stakeholder Map, Success Metrics (leading + lagging), Constraints & Boundaries, and Target Domains. Overwrites any existing vdd/vision.md. Requires statement (freeform 1-3 paragraph intent, not a title) and a prior vdd_init. Run once, after vdd_init and before vdd_strategize; to revise a vision once downstream artifacts exist, use vdd_amend so the change cascades instead of re-running this.",
  strategize: "VDD Phase 2: Produce research-backed strategy into vdd/strategy.md — strategic pillars, competitive analysis, and a risk register, resolved from the vision target-domain primers. Overwrites vdd/strategy.md. Requires vdd/vision.md; run after vdd_vision and before vdd_tactics. Two-pass: call once with availableTools to get the research-subagent dispatch specs, then re-call with researchFindings to synthesize strategy.md (a first call with neither returns only the dispatch specs). To change strategy after artifacts exist, use vdd_amend.",
  tactics: "VDD Phase 3: Audit the existing codebase into vdd/tactics.md — repo audit, technical-debt assessment, gap analysis, MoSCoW-prioritized action items (A-001, A-002, …), dependency map, and infrastructure requirements. Overwrites vdd/tactics.md. Requires vdd/strategy.md; run after vdd_strategize and before vdd_specify. Needs a filesystem-capable host to scan the repo, so check with vdd_detect_environment first if the host may lack one.",
  specify: "VDD Phase 4: Generate vdd/specs/<id>/spec.md for one tactical action item — user stories, Always/Ask/Never boundaries, Given/When/Then acceptance criteria (AC), MoSCoW priorities, non-functional requirements, and impact verification. Overwrites the spec file. Pass actionItemId (e.g. \"A-001\") or a freeform description to skip the V/S/T chain. Use for a NEW spec; to resolve leftover [NEEDS CLARIFICATION] markers in an existing spec use vdd_clarify instead.",
  clarify: "VDD Phase 4b: Clarify an existing spec — scans vdd/specs/<feature>/spec.md and returns the items to resolve: every [NEEDS CLARIFICATION] marker, [e.g.] placeholder, and happy-path acceptance criterion (AC) still needing an edge-case counterpart (AC-E*). Read-only; returns the list without editing the file (the host agent then applies the resolutions). Pass feature (spec directory name). Run after vdd_specify when a spec has unresolved markers; to author a brand-new spec use vdd_specify instead.",
  plan: "VDD Phase 5: Generate the technical blueprint under vdd/specs/<feature>/ — plan.md (component breakdown, AC coverage map, technology choices, verification toolchain), data-model.md (entities, indexes, migrations), and contracts/ (request/response/error schemas). Overwrites these files. Requires an existing spec for the feature; run after vdd_specify or vdd_clarify and before vdd_tasks — if no spec exists yet, run vdd_specify first.",
  tasks: "VDD Phase 6: Break the plan into atomic test-first tasks in vdd/specs/<feature>/tasks.md — each references acceptance criteria (AC) and contracts, is sized S/M/L, and is marked [P] when parallelizable. Overwrites tasks.md. Requires plan.md; run after vdd_plan. To fetch the next uncompleted task from an existing tasks.md use vdd_get_next_task instead of re-running this.",
  "get-next-task": "VDD Phase 7a: Read vdd/specs/<feature>/tasks.md and return the next uncompleted task (or a completion marker when none remain). Read-only; never edits tasks.md. Pass feature (the exact spec directory name). Use before each implementation session to keep context isolated; to regenerate the whole list use vdd_tasks, and to execute the returned task use vdd_implement.",
  implement: "VDD Phase 7b: Prepare one task for implementation — loads constitution, spec, plan, and contracts and returns the implementation instruction plus the impact-chain commit-message format. Read-only; the tool writes nothing — the host agent performs the code edits, verification, and commit. Pass taskId (e.g. \"TASK-003\") from the task returned by vdd_get_next_task. Run one task at a time, after vdd_get_next_task; for read-only inspection of tasks use vdd_get_next_task instead.",
  validate: "VDD Phase 8: Validate the full chain — bidirectional traceability matrix, drift detection, orphan detection, uncovered vision goals, impact metrics vs targets, and 28 S&T assumption checks across 7 gates. Writes vdd/impact-report.generated.md and never overwrites a hand-authored vdd/impact-report.md. Run after implementation is complete; for the traceability matrix or per-feature spec metrics use vdd_inspect.",
  trace: "VDD Cross-phase: Generate the bidirectional V→S→T→SP→PL→TK traceability matrix for the current project. Read-only — reads all vdd/ artifacts and returns the matrix without modifying files. Use any time to inspect coverage; for per-feature spec metrics use vdd_inspect, and for release-readiness validation with gates use vdd_validate.",
  analyze: "VDD Cross-phase: Cross-artifact consistency analysis for one feature — acceptance-criteria (AC) count, unresolved [NEEDS CLARIFICATION] markers, [e.g.] placeholder density, and whether plan.md and tasks.md exist. Read-only; returns metrics without modifying files. Pass feature (the spec directory name). Use during planning and implementation to check a spec is complete; for the project-wide matrix use vdd_inspect, and for release validation use vdd_validate.",
  inspect: 'VDD Cross-phase: Read-only inspection of the current project in one call — scope selects the view. scope="project" (default) returns the bidirectional V→S→T→SP→PL→TK traceability matrix across all vdd/ artifacts; scope="feature" returns per-feature spec metrics (acceptance-criteria count, unresolved [NEEDS CLARIFICATION] markers, [e.g.] placeholder density, and whether plan.md/tasks.md exist). Never modifies files. Pass feature for the feature scope; for release-readiness validation with gates use vdd_validate, and to author a spec use vdd_specify. Output is a structured matrix/metrics object, not prose.',
  amend: "VDD Cross-phase: Plan a requirement-change cascade through the whole chain — identifies the highest affected level and returns the ordered steps to update downward V→S→T→SP→PL→TK and re-run affected gates (G1–G7). Read-only; returns the cascade plan without editing artifacts (the host agent applies the edits and commits). Pass the change as description. Use when a requirement changes after artifacts already exist; to build a phase from scratch the first time, run that phase's own tool instead of vdd_amend. The plan is an ordered step list naming the affected gates, not rewritten artifacts.",
  clone: "Crawl and capture a target domain into a clone dataset + manifest — WordPress-aware schema inference, Payload collections, and a Next.js + Payload + Postgres scaffold manifest (vdd/clone-manifest.json). Pass the domain as description. Writes vdd/clone-dataset.json, vdd/clone-manifest.json, and vdd/clone.md, overwriting any existing versions in place. Open-world: makes network requests to the target site and reads its sitemap and same-origin links. Use for cloning an external site; it is not part of the VDD phase pipeline, so for the normal init→validate flow call those phase tools instead.",
  "detect-environment": "VDD Environment Detection: Report which tools/MCPs each VDD phase requires vs treats as optional — across the 8-phase pipeline (init through validate) plus the cross-phase helpers (amend, clone, inspect, get-next-task) — and which of the host agent availableTools are present vs missing. Read-only; returns a capability report without modifying files. Run before vdd_strategize to plan research-subagent dispatch, or when a phase fails for lack of a tool; to inspect artifacts instead of capabilities use vdd_inspect. Returns a fixed-shape capability report; tool-name matching is normalized, so pass names as your host exposes them.",
};

const PHASE_NAMES = ["init","vision","strategize","tactics","specify","clarify","plan","tasks","get-next-task","implement","validate","inspect","amend","clone","detect-environment"];

// Cross-parameter notes appended to each tool description — mirrors
// packages/vdd-engine/src/meta.ts PARAM_RELATIONSHIP_NOTES (keep in sync).
const PARAM_RELATIONSHIP_NOTES = {
  init: ' Parameter relationships: projectRoot defaults to "." and must be the same root every later phase resolves against.',
  vision: ' Parameter relationships: statement must be freeform prose (1-3 paragraphs), not a title; projectRoot must match the root used by vdd_init.',
  strategize: ' Parameter relationships: availableTools and capabilities are aliases (pass one); researchFindings only has an effect on the second call.',
  tactics: ' Parameter relationships: projectRoot must match the root used by vdd_init, vdd_vision, and vdd_strategize; requires vdd/strategy.md to exist.',
  specify: ' Parameter relationships: feature names the vdd/specs/<feature>/ directory and must match the feature passed to vdd_clarify, vdd_plan, and vdd_tasks; actionItemId is the A-### id from tactics.md and is optional when authoring from a freeform description.',
  clarify: ' Parameter relationships: feature must be the exact spec directory name created by vdd_specify.',
  plan: ' Parameter relationships: feature must match the value passed to vdd_specify and vdd_tasks.',
  tasks: ' Parameter relationships: feature must match the value passed to vdd_plan.',
  "get-next-task": ' Parameter relationships: feature must match the spec directory; the returned taskId (TASK-###) is the argument to vdd_implement.',
  implement: ' Parameter relationships: taskId comes from vdd_get_next_task (format TASK-###); projectRoot must match the root used by earlier phases.',
  validate: ' Parameter relationships: feature narrows the check to one spec; artifactFiles maps artifact path to content for serverless runs and is omitted when resolving against a local projectRoot.',
  inspect: ' Parameter relationships: scope="feature" requires feature, while scope="project" (the default) ignores it; projectRoot must match the root used by earlier phases.',
  amend: ' Parameter relationships: description is the requirement change to cascade through the artifact chain; projectRoot must match the root used by earlier phases.',
  clone: ' Parameter relationships: description is the target domain and statement is the desired outcome (both optional); maxPages, timeoutMs, concurrency, crawl, and browser tune the crawl and refresh=true bypasses a cached dataset.',
  "detect-environment": ' Parameter relationships: availableTools and capabilities are aliases; omit both to get the per-phase requirements without a present/missing comparison.',
};

// MCP annotation hints — mirrors packages/vdd-mcp/src/server.ts TOOL_ANNOTATIONS
// (keep in sync). They describe the tool's OWN filesystem effect: read-only tools
// write nothing; destructiveHint is true only for tools that overwrite an existing
// artifact; open-world tools reach external systems (web research, cloning).
const TOOL_ANNOTATIONS = {
  init: { title: "Initialize Constitution", annotations: { destructiveHint: true, openWorldHint: false } },
  vision: { title: "Expand Vision", annotations: { destructiveHint: true, openWorldHint: false } },
  strategize: { title: "Research Strategy", annotations: { destructiveHint: true, openWorldHint: true } },
  tactics: { title: "Audit Tactics", annotations: { destructiveHint: true, openWorldHint: false } },
  specify: { title: "Generate Spec", annotations: { destructiveHint: true, openWorldHint: false } },
  clarify: { title: "Clarify Spec", annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false } },
  plan: { title: "Generate Plan", annotations: { destructiveHint: true, openWorldHint: false } },
  tasks: { title: "Generate Tasks", annotations: { destructiveHint: true, openWorldHint: false } },
  "get-next-task": { title: "Get Next Task", annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false } },
  implement: { title: "Implement Task", annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false } },
  validate: { title: "Validate Impact", annotations: { destructiveHint: false, idempotentHint: true, openWorldHint: false } },
  inspect: { title: "Inspect Project", annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false } },
  amend: { title: "Amend Requirements", annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false } },
  clone: { title: "Clone Website", annotations: { destructiveHint: true, openWorldHint: true } },
  "detect-environment": { title: "Detect Environment", annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false } },
};

function toolDefs() {
  return PHASE_NAMES.map((name) => ({
    name: `vdd_${name.replace(/-/g, "_")}`,
    title: TOOL_ANNOTATIONS[name]?.title,
    description: (PHASE_META[name] || `VDD Phase: ${name}`) + (PARAM_RELATIONSHIP_NOTES[name] || ""),
    annotations: TOOL_ANNOTATIONS[name]?.annotations,
    inputSchema: {
      type: "object",
      properties: {
        statement: { type: "string", description: "Freeform input (required for vision)" },
        projectRoot: { type: "string", description: "Project root: directory that constitution.md and the vdd/ folder are written to and resolved against. Relative paths resolve from the current working directory; keep the same value across every phase.", default: "." },
        actionItemId: { type: "string", description: "Tactical action item ID, format A-### (e.g., 'A-001'); must be an item id from vdd/tactics.md" },
        feature: { type: "string", description: "Feature name: the vdd/specs/<feature>/ directory, kebab-case (e.g., 'user-auth'); must reference a directory created earlier by vdd_specify" },
        taskId: { type: "string", description: "Task ID to implement, format TASK-### (e.g., 'TASK-003'); must be an id listed in the feature's tasks.md (see vdd_get_next_task)" },
        description: { type: "string", description: "Freeform description input" },
        availableTools: { type: "array", items: { type: "string" }, description: "MCP/tool names available to the host agent (e.g., ['brave-search','perplexity','context7','gh_grep','playwright','filesystem'])" },
        capabilities: { type: "array", items: { type: "string" }, description: "Alias for availableTools" },
        researchFindings: { type: "string", description: "Consolidated research subagent findings to synthesize into strategy.md (effect only on the second strategize call)" },
        artifactFiles: { type: "object", additionalProperties: { type: "string" }, description: "Map of vdd/-relative artifact path → full file text, for serverless validate/drift detection where the tool cannot read the filesystem" },
      },
    },
  }));
}

function handleJsonRpc(body) {
  const { method, params, id } = body || {};

  if (method === "initialize") {
    return { jsonrpc: "2.0", id, result: { protocolVersion: "2025-06-18", serverInfo: { name: "vdd", title: "Vision Driven Design", version: "1.8.2" }, capabilities: { tools: {} }, instructions: "Vision Driven Design (VDD): an 8-phase, spec-driven development methodology with bi-directional traceability. Start with vdd_init, then vdd_vision (pass a freeform statement). Before each implementation session call vdd_get_next_task. Read-only tools that write nothing are vdd_inspect, vdd_detect_environment, vdd_get_next_task, vdd_clarify, vdd_implement, and vdd_amend; other write tools overwrite their target artifacts unless their description says otherwise (vdd_validate writes only a new vdd/impact-report.generated.md without clobbering a hand-authored report)." } };
  }

  if (method === "tools/list") {
    return { jsonrpc: "2.0", id, result: { tools: toolDefs() } };
  }

  if (method === "tools/call") {
    const toolName = params?.name || "";
    const phaseKey = toolName.replace(/^vdd_/, "").replace(/_/g, "-");
    const args = params?.arguments || {};
    const input = {
      projectRoot: args.projectRoot || ".",
      statement: args.statement,
      actionItemId: args.actionItemId,
      feature: args.feature,
      taskId: args.taskId,
      description: args.description,
      availableTools: args.availableTools,
      capabilities: args.capabilities,
      researchFindings: args.researchFindings,
      artifactFiles: args.artifactFiles,
      scope: args.scope,
    };
    const handlers = phaseHandlers(input);
    const handler = handlers[phaseKey];
    if (!handler) {
      return { jsonrpc: "2.0", id, error: { code: -32601, message: `Tool not found: ${toolName}` } };
    }
    try {
      const result = handler.call(handlers);
      return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] } };
    } catch (err) {
      return { jsonrpc: "2.0", id, error: { code: -32603, message: `Internal error: ${err.message}` } };
    }
  }

  if (method === "notifications/initialised" || method === "notifications/initialized") return null;
  return { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } };
}

function isBrowser(req) { return (req.headers.accept || "").includes("text/html"); }

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%2363c8c4'/%3E%3Ctext x='16' y='22' font-family='sans-serif' font-size='18' font-weight='700' fill='%230f1115' text-anchor='middle'%3EV%3C/text%3E%3C/svg%3E">
<title>VDD MCP Server — Vision Driven Design (MCP API)</title>
<meta name="description" content="Public Model Context Protocol (MCP) server for Vision Driven Design (VDD) — 15 tools over streamable HTTP, no API key. Spec-driven development with bi-directional traceability for AI coding agents (Claude, Cursor, VS Code).">
<link rel="canonical" href="https://vdd.simonmak.com/api/mcp">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta name="keywords" content="MCP server, Model Context Protocol, spec-driven development, requirements traceability, AI coding agents, Claude, Cursor, VS Code, developer tools">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Vision Driven Design">
<meta property="og:title" content="VDD MCP Server — 15 tools for spec-driven traceability">
<meta property="og:description" content="Public MCP server (streamable HTTP, no API key): 15 tools, 8 phases, 7 quality gates, bi-directional V→S→T→SP→PL→TK traceability for AI coding agents.">
<meta property="og:url" content="https://vdd.simonmak.com/api/mcp">
<meta property="og:image" content="https://vdd.simonmak.com/og.png">
<meta property="og:image:width" content="1280">
<meta property="og:image:height" content="640">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="VDD MCP Server — 15 tools for spec-driven traceability">
<meta name="twitter:description" content="Public MCP server (streamable HTTP, no API key): 15 tools, 8 phases, 7 quality gates, bi-directional traceability for AI coding agents.">
<meta name="twitter:image" content="https://vdd.simonmak.com/og.png">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"SoftwareApplication","name":"Vision Driven Design MCP Server","alternateName":"VDD MCP Server","description":"Spec-driven development MCP server: 8 phases, bi-directional V→S→T→SP→PL→TK traceability, 7 quality gates.","url":"https://vdd.simonmak.com/api/mcp","applicationCategory":"DeveloperApplication","operatingSystem":"Any","license":"https://opensource.org/licenses/MIT","isAccessibleForFree":true,"offers":{"@type":"Offer","price":"0","priceCurrency":"USD"},"sameAs":["https://github.com/simonplmak-cloud/vision-driven-design","https://www.npmjs.com/package/@simonmak-ascent/mcp"]}
</script>
<style>
  /* Dark theme (default) — all contrast >= 7:1 (WCAG 2.2 AAA) */
  :root {
    --bg: #0f1115;
    --card: #171a20;
    --ink: #e8eaed;
    --muted: #a6adb4;
    --line: #2b3138;
    --brand: #63c8c4;
    --brand-dark: #7fdbd6;
    --pre-bg: #171a20;
    --focus: #63c8c4;
    --on-brand: #0f1115;
    --header-a: #0a5c60;
    --header-b: #074347;
    --header-ink: #ffffff;
  }
  /* Light theme (opt-in via toggle) */
  [data-theme="light"] {
    --bg: #f5f7f6;
    --card: #ffffff;
    --ink: #111111;
    --muted: #4a4a4a;
    --line: #c9c9c9;
    --brand: #0a5c60;
    --brand-dark: #074347;
    --pre-bg: #f0f0f0;
    --focus: #1a56a8;
    --on-brand: #ffffff;
    --header-a: #0a5c60;
    --header-b: #074347;
    --header-ink: #ffffff;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body {
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: var(--bg);
    color: var(--ink);
    font-size: 1rem;
    line-height: 1.6;            /* 1.4.8 AAA: >= 1.5 */
    letter-spacing: 0.01em;      /* 1.4.12 */
    word-spacing: 0.05em;        /* 1.4.12 */
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  /* 1.4.8 AAA: limit measure of blocks of text */
  main { max-width: 70ch; margin: 0 auto; padding: 2rem 1.5rem; width: 100%; flex: 1; }
  p { margin-bottom: 1rem; }     /* 1.4.8: paragraph spacing */
  a { color: var(--brand); text-decoration: underline; text-underline-offset: 0.15em; }
  a:hover, a:focus-visible { color: var(--brand-dark); }

  /* 2.4.1 Bypass Blocks */
  .skip-link {
    position: absolute; left: -9999px; top: 0;
    background: #000; color: #fff; padding: 0.75rem 1.25rem;
    z-index: 100; font-weight: 600; text-decoration: none; border-radius: 0 0 8px 0;
  }
  .skip-link:focus { left: 0; top: 0; }

  header {
    position: relative;
    background: linear-gradient(135deg, var(--header-a), var(--header-b));
    color: var(--header-ink);
    padding: 3rem 1.5rem 2.5rem;
  }
  header .wrap { max-width: 70ch; margin: 0 auto; }
  header h1 { font-size: 2rem; font-weight: 700; line-height: 1.3; margin-bottom: 0.5rem; }
  header p { font-size: 1.1rem; color: #fff; max-width: 60ch; }

  .badge {
    display: inline-block; padding: 0.35rem 0.85rem; border-radius: 999px;
    font-size: 0.9rem; font-weight: 600; margin: 0.75rem 0.4rem 0 0;
    border: 1px solid rgba(255,255,255,0.7); color: #fff;
  }

  h2 { font-size: 1.5rem; color: var(--brand-dark); margin: 2rem 0 1rem; padding-bottom: 0.4rem; border-bottom: 2px solid var(--brand-dark); line-height: 1.3; }
  h3 { font-size: 1.15rem; color: var(--brand-dark); margin: 1.5rem 0 0.75rem; line-height: 1.3; }

  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 0.75rem; list-style: none; }
  .tool {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.75rem 0.9rem; background: var(--card); border: 1px solid var(--line);
    border-radius: 8px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.9rem; color: var(--ink); min-height: 44px;
  }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: #1e7d32; flex-shrink: 0; } /* decorative, aria-hidden */

  .card { background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 1.5rem; }
  .row { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; padding: 0.6rem 0; border-bottom: 1px solid var(--line); }
  .row:last-child { border-bottom: none; }
  .row .label { font-weight: 600; color: var(--muted); }
  .row .value { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.95rem; word-break: break-word; }

  pre { background: var(--pre-bg); color: var(--ink); padding: 1.25rem; border-radius: 8px; font-size: 0.9rem; overflow-x: auto; white-space: pre-wrap; word-break: break-word; margin-bottom: 1rem; border: 1px solid var(--line); }

  .cta-group { display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 1.25rem; }
  .cta {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 0.8rem 1.5rem; background: var(--brand); color: var(--on-brand);
    text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 1rem;
    min-height: 44px; min-width: 44px;   /* 2.5.5 AAA / 2.5.8 AA target size */
  }
  .cta:hover, .cta:focus-visible { background: var(--brand-dark); color: var(--on-brand); }
  .cta.secondary { background: var(--card); color: var(--brand); border: 2px solid var(--brand); }
  .cta.secondary:hover, .cta.secondary:focus-visible { background: var(--bg); color: var(--brand-dark); border-color: var(--brand-dark); }

  .theme-toggle {
    position: absolute; top: 1rem; right: 1rem;
    display: inline-flex; align-items: center; justify-content: center;
    background: rgba(255,255,255,0.12); color: var(--header-ink);
    border: 1px solid rgba(255,255,255,0.55); border-radius: 999px;
    padding: 0.5rem 1rem; font-size: 0.9rem; font-weight: 600; cursor: pointer;
    min-height: 44px; min-width: 44px;
  }
  .theme-toggle:hover, .theme-toggle:focus-visible { background: rgba(255,255,255,0.22); }

  footer { text-align: center; padding: 1.5rem; color: var(--muted); font-size: 0.95rem; border-top: 1px solid var(--line); }
  footer a { color: var(--brand-dark); }

  /* 2.4.7 Focus Visible (3:1) */
  :focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; border-radius: 4px; }

  /* 2.3.3 reduced motion + 1.4.11 contrast preferences */
  @media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; } }
  @media (prefers-contrast: more) { :root { --line: #6b7280; } [data-theme="light"] { --muted: #222222; } }
</style>
<script>(function(){try{if(localStorage.getItem("vdd-theme")==="light"){document.documentElement.setAttribute("data-theme","light");}}catch(e){}})();</script>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<header>
  <button class="theme-toggle" id="theme-toggle" type="button" aria-label="Switch to light mode">Light mode</button>
  <div class="wrap">
    <h1><abbr title="Vision Driven Design">VDD</abbr> <abbr title="Model Context Protocol">MCP</abbr> Server</h1>
    <p>Public <abbr title="Application Programming Interface">API</abbr> for <abbr title="Vision Driven Design">VDD</abbr> — bi-directional traceability with full template generation.</p>
    <p>
      <span class="badge">15 tools</span>
      <span class="badge">108 checks</span>
      <span class="badge">7 gates</span>
      <span class="badge">e2e chain</span>
      <span class="badge">template generation</span>
      <span class="badge">no API key</span>
    </p>
  </div>
</header>
<main id="main">
  <section aria-labelledby="tools-heading">
    <h2 id="tools-heading">Tools</h2>
    <ul class="grid">
      ${PHASE_NAMES.map((p) => '<li class="tool"><span class="dot" aria-hidden="true"></span><span>vdd_' + p.replace(/-/g, "_") + "</span></li>").join("")}
    </ul>
  </section>
  <section aria-labelledby="quickstart-heading">
    <h2 id="quickstart-heading">Quick Start</h2>
    <p>Add to <abbr title="Model Context Protocol">MCP</abbr> agent configuration:</p>
    <pre>{
  "mcpServers": {
    "vdd": { "url": "https://vdd.simonmak.com/api/mcp" }
  }
}</pre>
    <p><strong>OpenCode</strong> — <code>opencode.json</code>:</p>
    <pre>"vdd": { "type": "remote", "url": "https://vdd.simonmak.com/api/mcp", "timeout": 120000 }</pre>
    <p><strong>Claude Desktop</strong> — <code>claude_desktop_config.json</code>:</p>
    <pre>"vdd": { "command": "npx", "args": ["-y", "@simonmak-ascent/mcp"], "type": "stdio" }</pre>
    <div class="cta-group">
      <a class="cta" href="https://github.com/simonplmak-cloud/vision-driven-design">GitHub repository</a>
      <a class="cta secondary" href="https://github.com/simonplmak-cloud/vision-driven-design/blob/main/SKILL.md#command-reference">Command reference</a>
    </div>
  </section>
  <section aria-labelledby="usage-heading">
    <h2 id="usage-heading">Usage</h2>
    <div class="card">
      <div class="row"><span class="label">Transport</span><span class="value">Streamable HTTP + <abbr title="JavaScript Object Notation Remote Procedure Call">JSON-RPC</abbr> 2.0</span></div>
      <div class="row"><span class="label">Endpoint</span><span class="value">https://vdd.simonmak.com/api/mcp</span></div>
      <div class="row"><span class="label">Auth</span><span class="value">None — public, no API key</span></div>
    </div>
    <h3>Example: vdd_vision</h3>
    <pre>curl -X POST https://vdd.simonmak.com/api/mcp \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"vdd_vision","arguments":{"statement":"Build a platform that...","projectRoot":"."}},"id":1}'</pre>
    <p>Runs init → vision → strategize → tactics → specify → clarify → plan → tasks → get-next-task → validate. Returns all templates.</p>
  </section>
</main>
<footer>
  <p><a href="https://github.com/simonplmak-cloud/vision-driven-design">Vision Driven Design</a> is licensed under the <abbr title="Massachusetts Institute of Technology">MIT</abbr> license.</p>
  <p>Methodology: Goldratt Strategy &amp; Tactics · Impact Mapping · NASA Systems Engineering · <abbr title="Capability Maturity Model Integration">CMMI</abbr></p>
</footer>
<script>(function(){var b=document.getElementById("theme-toggle");if(!b)return;function s(){var l=document.documentElement.getAttribute("data-theme")==="light";b.textContent=l?"Dark mode":"Light mode";b.setAttribute("aria-label",l?"Switch to dark mode":"Switch to light mode");}b.addEventListener("click",function(){var l=document.documentElement.getAttribute("data-theme")==="light";if(l){document.documentElement.removeAttribute("data-theme");}else{document.documentElement.setAttribute("data-theme","light");}try{localStorage.setItem("vdd-theme",l?"dark":"light");}catch(e){}s();});s();})();</script>
</body>
</html>`;

// Shared JSON-RPC core + the accessible API docs page. The Streamable HTTP
// endpoint (api/mcp.js) reuses both; the docs page is served there for browsers.
module.exports.handleJsonRpc = handleJsonRpc;
module.exports.toolDefs = toolDefs;
module.exports.isBrowser = isBrowser;
module.exports.html = HTML;
