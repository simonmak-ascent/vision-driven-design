# Prompt Patterns

Prompts for every phase of the VDD workflow. Each phase has three prompt types: Generation, Forward Verification, and Backward Verification. Plus cross-phase prompts for analysis, amending, and full-chain validation.

---

## Phase 0 — Constitution Prompts

### Initial Constitution Generation Prompt

```
Generate a constitution.md for this project.

Project context:
- Name: [project name]
- Purpose: [1-2 sentences]
- Tech stack: [list languages, frameworks, databases, auth]
- Team size: [1 dev / small team / larger org]
- Domain: [e.g., fintech, e-commerce, internal tooling]
- Special constraints: [security requirements, compliance, performance SLAs]

The constitution must:
1. Lock the technology stack with versions
2. Define architecture principles
3. Define security constraints (at least 5 specific, verifiable rules)
4. Define naming conventions
5. Define banned patterns (specific, not vague)
6. Define file structure rules
7. Declare applicable domain primitives

Format as constitution.md using the template in references/artifact-templates.md.
Mark anything uncertain as [PENDING] for human review.
```

---

## Phase 1 — Vision Prompts

### Vision Expansion Prompt

*AI reads the human's freeform vision statement and expands it into structured vision.md.*

```
A human has provided this vision statement for a product:

---
[Paste human's freeform vision]
---

Expand this into a complete vision.md using the template in references/artifact-templates.md.

Steps:

1. FORMALIZE the vision statement (1-3 polished paragraphs — preserve the human's intent, add clarity)

2. BUILD the Impact Model using Impact Mapping format:
   - GOAL: 1 sentence — the measurable outcome this product aims to create
   - ACTORS: who must behave differently? (table: Actor, Current State, Desired State, Benefit)
   - IMPACTS: what behavioral changes produce the goal? (table: ID, Description, Actor, Measurement)

3. MAP stakeholders (role, interest, influence, engagement strategy)

4. DEFINE success metrics:
   - Lagging indicators (outcomes — measured months after launch)
   - Leading indicators (early signals — measurable during build and launch)
   Every metric must have a target value and measurement method.

5. DECLARE constraints (non-negotiable boundaries) and boundaries (explicitly out of vision scope)

6. CHECK target domains: based on the vision content, which of [webapp, data-storage, etl, infrastructure] apply?

Do NOT invent scope the human didn't intend. Do NOT add features. Do NOT make assumptions about implementation.
If the human's vision is incomplete, ask targeted clarification questions — do not fill gaps with guesses.
```

### Vision Completeness Self-Check Prompt

```
Review vdd/vision.md for completeness. Check:

1. IMPACT MODEL: does every actor have a desired state? Does every impact have a measurement?
2. SUCCESS METRICS: does every metric have a target AND a measurement method?
3. STAKEHOLDERS: are primary, secondary, tertiary users identified?
4. CONSTRAINTS: are boundaries explicit and specific? (not "good UX" — "WCAG 2.2 AA")
5. TARGET DOMAINS: are domains checked? Do they match the vision's scope?

Flag any gaps. Return only issues — do not rewrite the vision.
```

---

## Phase 2 — Strategy Prompts

### Domain Primer Loading Prompt

```
Read vdd/vision.md → Target Domains section.
For each checked domain, load the corresponding domain-primer from domain-primers/:
- domain-primers/webapp.md
- domain-primers/data-storage.md
- domain-primers/etl.md
- domain-primers/infrastructure.md

Summarize the key research patterns and impact verification patterns from each loaded primer.
These will feed into the parallel research subagents in the next step.
```

### Parallel Research Dispatch Prompt

```
You are orchestrating parallel research to inform the Strategy phase.

Vision context (from vdd/vision.md):
- Goal: [paste vision goal]
- Actors: [paste actor table]
- Impacts: [paste impact table]
- Target domains: [list]

Domain primer summaries (from previous step):
[Summarize key research patterns from each loaded primer]

SPAWN 5 PARALLEL RESEARCH SUBAGENTS:

AGENT 1 — Market Research:
Use Brave Search and Perplexity research to answer:
- What is the market size and growth rate for this domain?
- Who are the target users? Demographics, behaviors, pain points?
- What are the key trends shaping this market in 2025-2026?
- What regulatory or compliance factors apply?

AGENT 2 — Competitive Analysis:
Use Brave Search and browserless/playwright to answer:
- Who are the top 3-5 direct competitors?
- What are their key features, pricing models, and user sentiment?
- What are their weaknesses? Where do users complain?
- What adjacent products serve the same user need differently?

AGENT 3 — Technology Assessment:
Use Context7 and gh_grep to answer:
- What technologies are viable for this vision? (filtered through constitution.md tech stack)
- What are the trade-offs between competing technology choices?
- Are there any technology risks (deprecation, licensing, community health)?
- What infrastructure patterns are proven for this domain?

AGENT 4 — Impact Feasibility:
Use Perplexity research to answer:
- Have similar products attempted similar impact goals?
- What worked? What failed? Why?
- How was impact measured in comparable initiatives?
- What are the realistic timelines for measurable impact?

AGENT 5 — Domain Deep-Dive:
Use the loaded domain-primers to answer:
- Domain-specific constraints and requirements
- Domain-specific anti-patterns to avoid
- Domain-specific impact measurement best practices
- Technology patterns specific to this domain

Each agent: return 300-500 word summary with citations.
After all agents complete, consolidate into vdd/strategy.md using the template.
```

### Research Synthesis Prompt

```
Read the output of all 5 parallel research subagents.
Synthesize into vdd/strategy.md using the template in references/artifact-templates.md.

STRUCTURE:

1. Domain & Market Landscape: synthesize Agents 1 + 2. What is the playing field?

2. Technology Landscape: synthesize Agent 3. What is feasible? What are the constraints?

3. Feasibility Assessment: synthesize Agent 4. Is this vision achievable with available resources?
   Be honest — if the research suggests the vision is unrealistic, say so and propose realistic scope.

4. Strategic Pillars (3-5):
   Each pillar must have:
   - Name and rationale (why this pillar?)
   - Vision trace (which vision goal/impact does it serve?)
   - Key research finding (evidence from subagents)
   - Expected impact (how it contributes to success metrics)

5. Competitive Analysis: from Agent 2

6. Risk Register: from all agents — threats to the strategy, not just technical risks.
   Each risk: ID, Description, Likelihood (Low/Medium/High), Impact (Low/Medium/High), Mitigation.

Do NOT invent pillars unsupported by research.
Do NOT propose technology choices that violate constitution.md.
```

### Bi-Directional Gate G1 Prompt (Vision → Strategy)

```
You are verifying the bidirectional traceability between Vision (L1 Strategy) and Strategy (L1 Tactic → L2 Strategy).

Read: vdd/vision.md and vdd/strategy.md

FORWARD VERIFICATION (Vision → Strategy):
1. Every vision goal has at least 1 strategy pillar that addresses it
2. Every vision impact has a strategic approach documented
3. Every stakeholder has a strategic consideration
4. Every success metric has a strategic mechanism to measure it

BACKWARD VERIFICATION (Strategy → Vision):
1. Every strategy pillar traces to at least 1 vision goal
2. Every research finding serves a vision purpose (not curiosity research)
3. Every risk in the risk register threatens a vision goal
4. Nothing in the strategy invents scope not in the vision

Report failures in this format:
[FAIL-FWD] [Vision element] → No strategy coverage
[FAIL-BWD] [Strategy element] → No vision authorization

If no failures: "Gate G1 PASS. Forward: [N] vision goals covered. Backward: [N] strategy elements authorized."

Now document the 4 S&T Assumptions (V→S):

Necessity: Why was Strategy-level research necessary to achieve this Vision?
Achievability: Why is this Vision achievable given the planned Strategy approach?
Sufficiency: Why is the planned Strategy approach sufficient to realize this Vision?
Warnings: What must go right / be avoided for the Strategy to succeed?

Return verification results + S&T assumptions.
```

---

## Phase 3 — Tactics Prompts

### Repository Audit Prompt

```
Perform a full repository audit to inform the Tactics phase.

Read:
- Package manifest (package.json, go.mod, Cargo.toml, etc.)
- Directory structure (recursive listing)
- Key source files (read representative files from each major directory)
- Configuration files (.env.example, docker-compose.yml, CI configs)
- Test files (find all test files, assess coverage patterns)
- Lint/formatter configs

AUDIT OUTPUT:

1. WHAT EXISTS:
   For each major module/component:
   - Name, location, purpose
   - Quality assessment (Good / Needs Refactor / Replace)
   - Which strategic pillar(s) does it serve? (if any)

2. TECHNICAL DEBT:
   - Lint violations and warnings
   - Missing tests
   - Outdated dependencies
   - Architectural violations (e.g., business logic in routes)
   - Missing error handling, input validation, auth checks

3. REUSABLE ASSETS:
   - Modules/components that can directly serve strategic pillars
   - Patterns and conventions to follow
   - Existing infrastructure that accelerates delivery

4. GAP ANALYSIS:
   - What strategic pillars have NO existing code support?
   - What must be built from scratch vs refactored?
   - What infrastructure is missing?

Return a structured audit report — do NOT write tactics.md yet.
```

### Tactics Generation Prompt

```
Using the repository audit report and vdd/strategy.md, generate vdd/tactics.md.

STRUCTURE:

1. Codebase Audit (from audit report — summarized tables)

2. Gap Analysis:
   For each strategic pillar, state:
   - What exists that serves it
   - What is missing
   - What needs refactoring
   - Impact if unaddressed

3. Prioritized Action Items (the core output):
   Each action item:
   - ID: A-XXX (sequential)
   - Description: concrete enough to feed directly into /vdd:specify
   - Priority: [MUST] / [SHOULD] / [COULD]
   - Strategy Pillar: which pillar does this serve?
   - Vision Trace: which vision impact does this ultimately enable?
   - Estimated Spec Size: S / M / L
   - Dependencies: which other action items must come first?

4. Dependency Map (ASCII diagram)

5. Infrastructure Requirements (if applicable)

RULES:
- Every [MUST] action item must trace to a strategy pillar
- Every strategy pillar must have at least 1 [MUST] action item
- No action item should be larger than 1 spec (L items should be split)
- Dependencies must form a valid DAG (no cycles)
```

### Bi-Directional Gate G2 Prompt (Strategy → Tactics)

```
You are verifying bidirectional traceability between Strategy (L2) and Tactics (L3).

Read: vdd/strategy.md and vdd/tactics.md

FORWARD VERIFICATION (Strategy → Tactics):
1. Every strategic pillar has >= 1 tactical action item
2. Every identified gap has a corresponding action item
3. Every risk in the strategy risk register has a tactical mitigation item

BACKWARD VERIFICATION (Tactics → Strategy):
1. Every action item traces to at least 1 strategy pillar
2. Every action item is necessary (not gold-plating or scope creep)
3. No action item invents work outside the strategy's scope
4. Every infrastructure requirement serves a strategy pillar

Report failures + 4 S&T Assumptions (S→T).

Necessity: Why is Tactical-level action-item breakdown necessary to execute this Strategy?
Achievability: Why is this Strategy achievable given the planned Tactical approach?
Sufficiency: Why is the planned Tactical approach sufficient to implement this Strategy?
Warnings: What must go right / be avoided for Tactics to succeed?
```

---

## Phase 4 — Specs Prompts

### Assumptions Surface Prompt

```
I am about to generate a spec.md for this tactical action item:

Action Item: [paste from tactics.md]
Strategy Context: [relevant strategic pillar]
Vision Context: [relevant vision goal]

Before generating the spec, surface your assumptions about:

1. User roles and permissions — who can trigger this feature?
2. Data ownership — whose data, who can read/modify?
3. Error behavior — what happens when inputs are invalid or dependencies fail?
4. Integration — what other parts of the system does this touch?
5. Scope boundaries — what does "done" mean for this action item?
6. Performance — any implicit thresholds (latency, rate limits, data volume)?

Do NOT write the spec yet. Return only the assumption list.
Human will review and correct assumptions before the spec is written.
```

### Initial Specification Prompt

```
Generate a spec.md for this tactical action item:

Action Item: [paste from tactics.md]
[A-XXX]: [description]
Strategy: [relevant pillar name]
Vision Impact: [relevant impact ID and description]

Use the template in references/artifact-templates.md.

REQUIREMENTS:
- Include full Impact Chain header
- Include Tactical Origin reference
- Include Impact Verification section (how this spec contributes to vision metrics)
- No implementation details (no technology names, no function names)
- Each AC independently testable (Given/When/Then)
- MoSCoW priority on every AC: [MUST] / [SHOULD] / [COULD] / [WONT]
- Include error/edge case ACs — not just happy path
- Mark ambiguities with [NEEDS CLARIFICATION]
- Explicitly list OUT OF SCOPE

Target users: [from vision stakeholders]
Constraints: [from constitution.md + vision.md constraints]
```

### Freeform Specification Prompt (SDD Backward-Compatibility)

*When `/vdd:specify "freeform description"` is used without V/S/T chain — operates identically to SDD Phase 1.*

```
Generate a spec.md for this feature description:

[Freeform description]

Use the template in references/artifact-templates.md.

REQUIREMENTS:
- No implementation details (no technology names, no function names)
- Each AC independently testable (Given/When/Then)
- MoSCoW priority on every AC: [MUST] / [SHOULD] / [COULD] / [WONT]
- Include error/edge case ACs — not just happy path
- Mark ambiguities with [NEEDS CLARIFICATION]
- Explicitly list OUT OF SCOPE
- Include Boundaries section (Always do / Ask first / Never do)
- Include Impact Chain header if a vision exists; otherwise mark as [STANDALONE]

Target users: [from stakeholder context if available]
Constraints: [from constitution.md]
```

### Clarify Phase Prompt

```
Read vdd/specs/[feature]/spec.md. Perform a full clarification pass.

Step 1 — Resolve open questions:
List every [NEEDS CLARIFICATION] item and propose a resolution.

Step 2 — Find missing edge cases:
For each [MUST] AC, identify edge cases:
- Empty/null inputs
- Concurrent requests
- Dependent service unavailability
- Permission boundary cases

Step 3 — Automated validation:
Flag vague terms:
- "fast", "slow", "quickly" → needs numeric threshold
- "works correctly", "functions properly" → needs specific testable outcome
- "secure", "safe" → needs specific constraint

Return: proposed resolutions + new ACs to add. Do NOT rewrite spec.md.
```

### Standalone Clarify Prompt (`/vdd:clarify <feature>`)

*Use when running clarification independently — outside the generation flow. Same logic,
invoked directly. Can be run at any time to re-examine an existing spec.*

```
You are a spec reviewer. Read vdd/specs/[feature]/spec.md and perform a full clarification pass.

Step 1 — Resolve open questions:
List every [NEEDS CLARIFICATION] item and propose a resolution for human approval.
Do not resolve them unilaterally.

Step 2 — Find missing edge cases:
For each [MUST] AC, identify edge cases not yet covered:
- What happens with empty/null inputs?
- What happens with concurrent requests?
- What happens when dependent services are unavailable?
- What are the permission boundary cases?

Step 3 — Automated validation:
Flag any AC that contains vague terms:
- "fast", "slow", "quickly", "efficiently" → needs a numeric threshold
- "works correctly", "functions properly" → needs a specific testable outcome
- "secure", "safe" → needs a specific constraint
- "simple", "easy" → not a requirement

Return: a list of proposed resolutions + a list of new ACs to add.
Do NOT write a new spec.md. Return only the delta.
```

### Bi-Directional Gate G3 Prompt (Tactics → Specs)

```
You are verifying bidirectional traceability between Tactics (L3) and Specs (L4).

Read: vdd/tactics.md and vdd/specs/[feature]/spec.md

FORWARD VERIFICATION (Tactics → Specs):
1. Every [MUST] action item has a spec.md
2. Every spec's ACs cover the action item's scope
3. No action item is "split" across multiple specs in a way that loses coverage

BACKWARD VERIFICATION (Specs → Tactics):
1. Every AC traces to the tactical action item this spec implements
2. Nothing in the spec invents scope not in tactics
3. Every spec has an explicit Tactical Origin reference
4. The spec's Impact Verification section correctly references vision metrics

Report failures + 4 S&T Assumptions (T→SP).

Necessity: Why are Spec-level requirements necessary to execute these Tactical action items?
Achievability: Why are these Tactical items achievable given the planned Spec approach?
Sufficiency: Why is the planned Spec approach sufficient to implement these Tactical items?
Warnings: What must go right / be avoided for Specs to succeed?
```

---

## Phase 5 — Plan Prompts

### Technical Plan Generation Prompt

```
Read vdd/specs/[feature]/spec.md and constitution.md. Generate:

1. plan.md — technical architecture, component breakdown, risks
2. data-model.md — entities, fields, relationships, indexes
3. contracts/[name].md — API endpoints (one file per domain)

Include the full Impact Chain header in every generated file.

CONSTRAINTS:
- Use existing stack from constitution.md
- Do not introduce new dependencies unless justified in plan.md
- Use framework features directly — avoid unnecessary wrapper layers
- Every AC in spec.md must map to at least one component in plan.md
- Every component must have AC coverage documented
- Risks section with mitigations for every High-impact risk
- S&T Assumptions (SP→PL) documented

If vdd/specs/[feature]/research.md exists, read it first as additional context.
```

### Bi-Directional Gate G4 Prompt (Specs → Plan)

```
You are verifying bidirectional traceability between Specs (L4) and Plan (L5).

Read: vdd/specs/[feature]/spec.md, plan.md, data-model.md, and contracts/

FORWARD VERIFICATION (Specs → Plan):
1. Every [MUST] AC has >= 1 component in plan.md
2. Every [MUST] AC has >= 1 contract coverage
3. All entities in spec.md appear in data-model.md
4. All error codes from spec error ACs appear in contracts

BACKWARD VERIFICATION (Plan → Specs):
1. Every component in plan.md traces to at least 1 AC
2. Every contract traces to at least 1 AC
3. Every entity in data-model.md references a spec requirement
4. No over-engineering (no abstractions that could be direct framework usage)
5. Plan respects all constitution.md constraints

Report failures + 4 S&T Assumptions (SP→PL).

Necessity: Why is a technical Plan necessary to implement these Specs?
Achievability: Why are these Specs achievable given the planned technical approach?
Sufficiency: Why is the planned technical approach sufficient to satisfy these Specs?
Warnings: What must go right / be avoided for the Plan to succeed?
```

---

## Phase 6 — Tasks Prompts

### Task Breakdown Prompt

```
Read vdd/specs/[feature]/plan.md and vdd/specs/[feature]/contracts/*.md

Generate vdd/specs/[feature]/tasks.md with:

- Atomic tasks (one task = one PR or commit)
- Test task before each implementation task (test-first)
- [P] marker for parallelizable tasks
- S/M/L size estimates
- Explicit dependencies by task ID
- Full impact chain header

RULES:
- No task modifies more than 3 files
- L tasks must be split unless justified
- Test tasks reference specific ACs
- Implementation tasks reference specific contracts and plan sections
- Every task declares which ACs it satisfies
```

### Bi-Directional Gate G5 Prompt (Plan → Tasks)

```
You are verifying bidirectional traceability between Plan (L5) and Tasks (L6).

Read: vdd/specs/[feature]/plan.md and vdd/specs/[feature]/tasks.md

FORWARD VERIFICATION (Plan → Tasks):
1. Every plan component has >= 1 task
2. Every contract has implementation task coverage
3. Every entity in data-model.md has migration and repository tasks

BACKWARD VERIFICATION (Tasks → Plan):
1. Every task references a plan component or contract
2. No task invents work outside the plan
3. Test tasks precede their implementation counterparts
4. Dependencies form a valid DAG (no cycles)
5. No task touches > 3 files

Report failures + 4 S&T Assumptions (PL→TK).

Necessity: Why is a Task breakdown necessary to execute this Plan?
Achievability: Why is this Plan achievable given the planned task decomposition?
Sufficiency: Why is the planned task decomposition sufficient to implement this Plan?
Warnings: What must go right / be avoided for Tasks to succeed?
```

---

---

## Phase 7 — Implement Prompts

### Task Extraction Prompt (`/vdd:get-next-task`)

```
Read vdd/specs/[feature]/tasks.md.

Find the next task where the checkbox is `- [ ]` (not `- [x]`).
Extract and display:
- Task ID, title, size, dependencies
- The specific ACs it covers (from the task's Tests/Satisfies declarations)
- The specific contract and plan section references

Only extract ONE task — the first uncompleted one.
Provide the task in the exact format for a single implementation session.
Do NOT display other tasks.
```

### Single Task Implementation Prompt

```
Implement TASK-[N]: [task title]

Impact Chain: [full chain from vision through tasks]

READ AND FOLLOW:
- constitution.md (project-level rules — never violate)
- Acceptance criteria: vdd/specs/[feature]/spec.md → [section heading]
- Boundaries: vdd/specs/[feature]/spec.md → Boundaries (if present)
- Technical design: vdd/specs/[feature]/plan.md → [section heading]
- API contract: vdd/specs/[feature]/contracts/[file].md
- Data model: vdd/specs/[feature]/data-model.md → [EntityName]

DO NOT:
- Add functionality outside the acceptance criteria
- Deviate from the API signatures in contracts/
- Introduce abstractions not in plan.md
- Violate any rule in constitution.md
- Violate any rule in the spec's Boundaries section
- Modify files outside this task's stated scope

COMMIT FORMAT (after completing):
git commit -m "feat(scope): [TASK-XXX] → [AC-ID] → [Tactical-Action-Item-ID]"

AFTER IMPLEMENTATION — verify:
- [ ] All referenced ACs have test coverage
- [ ] API signatures match contracts exactly
- [ ] No new dependencies introduced
- [ ] Tests pass
```

### Bi-Directional Gate G6 Prompt (Tasks → Implement)

```
You are verifying bidirectional traceability between Tasks (L6) and Implementation (L7).

FORWARD VERIFICATION (Tasks → Implementation):
1. Does the task produce code that passes its tests?
2. Does the commit reference the task ID?
3. Is the task marked complete in tasks.md?

BACKWARD VERIFICATION (Implementation → Tasks):
1. Does every file modified belong to the task's stated scope?
2. Does the commit message follow the format: feat(scope): [TASK-XXX] → [AC-ID] → [Tactical-ID]
3. Has the AC referenced in the commit been satisfied?
4. Are there any files modified outside the task scope?

Report failures + 4 S&T Assumptions (TK→IM).

Necessity: Why was implementation of this Task necessary?
Achievability: Why was this Task achievable?
Sufficiency: Why is this implementation sufficient to satisfy the Task?
Warnings: What risks were encountered or avoided during implementation?
```

---

## Phase 8 — Validate Prompts

### Full-Chain Traceability Matrix Prompt

```
Generate a full-chain traceability matrix for this VDD project.

Read:
- vdd/vision.md
- vdd/strategy.md
- vdd/tactics.md
- vdd/specs/*/spec.md (all specs)
- vdd/specs/*/plan.md (all plans)
- vdd/specs/*/contracts/*.md (all contracts)
- vdd/specs/*/tasks.md (all tasks)
- Git log for implemented tasks

PRODUCE:

1. Forward Coverage Table:
   For each level, list parents and their child coverage:
   V-001 → S-001 → A-001 → SP-001 → PL-001 → TK-001 → [commits]

2. Backward Authorization Table:
   For each child, verify authorized parent exists.

3. Orphan Detection:
   Artifacts with no upward trace. Mark as [ORPHAN].

4. Uncovered Detection:
   Parent artifacts with no children. Mark as [UNCOVERED].

5. AC Coverage:
   Every [MUST] AC → test → implementation file → pass/fail.

Use the Impact Verification Report template in references/artifact-templates.md.
```

### Drift Detection Prompt

```
Detect spec drift across the full VDD chain.

CHECK:
1. API signatures: do implemented endpoints match contracts/ exactly?
2. Database schema: do implemented tables/columns match data-model.md?
3. Behavior: do error responses match contract-defined error codes?
4. Scope: is there functionality in code not covered by any spec.md?
5. Constitution: are there any constitution.md violations in new code?
6. Boundaries: are any spec Boundaries rules violated?

For each drift found:
[DRIFT] [Type: Signature/Schema/Behavior/Scope/Constitution/Boundary] [Description]

If no drift: "Zero drift detected across full chain."
```

### Impact Verification Prompt

```
Verify the built product against the original vision's impact model.

Read:
- vdd/vision.md → Impact Model and Success Metrics
- All spec.md files → Impact Verification sections
- All implemented features and their ACs

ASSESS:

1. IMPACT COVERAGE:
   For each vision impact (I-XXX):
   - Which specs/features address it?
   - Is the coverage sufficient to create the intended behavioral change?

2. METRIC ALIGNMENT:
   For each success metric in vision.md:
   - Is there instrumentation or analytics to measure it?
   - Can we collect data yet? (leading indicators: yes, lagging: post-launch)

3. IMPACT GAPS:
   - Are there vision impacts with NO implementation coverage?
   - Are there success metrics with NO measurement mechanism?
   - Are there stakeholders whose needs are unaddressed?

4. REALISTIC ASSESSMENT:
   - Given what was built, is the vision's intended impact realistically achievable?
   - If no: what is the gap? What additional work would close it?

Report honestly. Do not inflate success. Unmet impact goals are actionable — undocumented gaps are not.
```

### S&T Assumption Validation Prompt

```
Validate the 4 S&T assumptions for every gate in the chain.

For each of the 7 gates (G1 through G7), evaluate:

G1 (V→S):
  Necessity: Was Strategy research actually necessary? [Yes/No — evidence]
  Achievability: Was the Vision achievable with this Strategy? [Yes/No — evidence]
  Sufficiency: Was the Strategy sufficient to realize the Vision? [Yes/No — evidence]
  Warnings: Did documented risks materialize? Were warnings heeded? [Yes/No — evidence]

G2 (S→T):
  [Same 4 questions for Strategy→Tactics transition]

... (repeat for all 7 gates)

For any FAIL:
  Document what should have been different.
  Feed into the Amend workflow for future iterations.
```

---

## Cross-Phase Prompts

### Analyze Prompt (`/vdd:analyze`)

```
Run cross-artifact consistency analysis on the current spec chain.

Read:
- vdd/specs/[feature]/spec.md
- All other active spec.md files in vdd/specs/
- vdd/strategy.md
- vdd/tactics.md

CHECK:

1. SPEC CONFLICTS: does this spec's behavior contradict another spec?
   - Endpoint overlap (same path, different behavior)
   - Entity conflicts (same entity modified by multiple specs)
   - Behavioral contradictions (one spec requires auth, another says public)

2. SCOPE CONSISTENCY: does this spec's scope match its tactical action item?
   - Are there ACs that exceed the action item's described scope?
   - Is the action item's scope fully covered?

3. STRATEGY ALIGNMENT: does this spec serve the intended strategy pillar?
   - Are there ACs that serve a different (or no) pillar?

4. METRIC ALIGNMENT: does the spec's Impact Verification section address vision metrics?

Return issues only. Format: [ISSUE] [Section] [Type: Conflict/Scope/Strategy/Metric] [Description]
```

### Amend Prompt (`/vdd:amend`)

```
A requirement has changed: [describe what changed and why]

Current phase: [Phase N — specific artifact affected]

STEP 1 — IMPACT ASSESSMENT (do NOT modify files yet):
List every artifact affected and how:
- vision.md: [changes needed or "no change"]
- strategy.md: [changes needed or "no change"]
- tactics.md: [changes needed or "no change"]
- spec.md: [which ACs change?]
- plan.md: [which components affected?]
- contracts/: [which endpoints change?]
- data-model.md: [which entities/fields change?]
- tasks.md: [regenerate from which task ID forward?]

Present impact assessment. Await approval before Step 2.

STEP 2 — CASCADE UPDATE (after approval):
Update affected artifacts in order from highest level downward.
Annotate all changes with <!-- AMENDED [YYYY-MM-DD]: [reason] -->
Re-run all affected gates.
Commit each updated artifact separately.
```

---

## Multi-Agent Review Pattern

*Use separate critic subagents at each gate. Critics find problems the generating agent can't see.*

```
You are a [ROLE] critic reviewing the [PHASE] artifact.

Read: [artifact path]

Role-specific checks:
[ROLE-SPECIFIC INSTRUCTIONS]

Return issues in this format:
[ISSUE] [Element] [Role] [Type: SpecificIssueType] [Description]

If no issues: "No issues found for [ROLE]."
Do NOT approve, summarize, or compliment — issues only.
```

### Critic Roles by Phase

| Phase | Critic Roles |
|-------|-------------|
| Vision | Product Critic (scope gaps), Impact Critic (unmeasurable goals), Stakeholder Critic (missing actors) |
| Strategy | Market Critic (research gaps), Feasibility Critic (unrealistic assumptions), Risk Critic (unmitigated risks) |
| Tactics | Audit Critic (missed assets), Gap Critic (uncovered pillars), Dependency Critic (invalid ordering) |
| Specs | QA Critic (untestable ACs), Security Critic (missing auth), Product Critic (scope consistency) |
| Plan | Architecture Critic (over-engineering), Constitution Critic (violations), Contract Critic (incomplete APIs) |
| Tasks | Size Critic (oversized tasks), Order Critic (test after implementation), Dependency Critic (cycles) |
| Implement | Gate G6 per-task checks (see Phase 7 prompt) |
| Validate | Full-chain traceability, drift, impact verification (see Phase 8 prompts) |
