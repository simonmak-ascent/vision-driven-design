# Anti-Patterns

The most common VDD failure modes, their symptoms, and how to fix them.

---

## Anti-Pattern 1: Vision Without Metrics

**Symptoms:**
- vision.md has a beautiful vision statement but no measurable success metrics
- "Improve the world" / "democratize access" / "empower users" — with no way to know if it happened
- Strategy can't determine if it's working
- Validation phase has nothing to validate against

**Fix:** Every vision must have at least 3 success metrics (2 leading + 1 lagging). Every metric must have a target value and a measurement method. If you can't measure it, you can't verify impact.

---

## Anti-Pattern 2: Strategy Without Research

**Symptoms:**
- strategy.md strategic pillars sound reasonable but are backed by no evidence
- "We should build X because it feels right"
- Competitive analysis says "no direct competitors" (didn't look hard enough)
- Research section contains only AI-generated generic statements

**Fix:** The Strategy phase MUST spawn parallel research subagents. Every strategic pillar must cite at least one research finding. If a pillar has no evidence, it's an opinion, not a strategy.

---

## Anti-Pattern 3: Tactics Without Codebase Audit

**Symptoms:**
- tactics.md action items are generated without looking at the codebase
- "Build user authentication" when the codebase already has a working auth module
- "Add analytics dashboard" when the required data pipeline doesn't exist and isn't in the action items
- Developer reads tactics and says "half of this already exists"

**Fix:** Phase 3 MUST perform a full repository audit. AI reads key files, maps existing assets, and identifies what genuinely needs building vs what can be reused. Every action item that duplicates existing functionality is flagged.

---

## Anti-Pattern 4: Skipping the Coverage Check

**Symptoms:**
- Gates are treated as optional formalities
- Forward verification passes because "looks good enough"
- Backward verification is never run — no one checks if children trace to approved parents
- Orphans accumulate (code with no spec, specs with no tactical origin)

**Fix:** In full-auto mode the check is self-imposed, but it IS run. The agent must call `vdd_check` and read the matrix at every junction. In gated mode, the human must review the matrix before proceeding. A check that is skipped produces untraceable work.

---

## Anti-Pattern 5: Vision Scope Creep in Strategy

**Symptoms:**
- vision.md says "help small farmers"
- strategy.md has pillars for "enterprise supply chain", "commodities trading desk", "agricultural insurance"
- Strategy invents scope the vision never asked for

**Fix:** Backward verification (invariant B): every strategic pillar must trace to a specific vision goal. If a pillar can't trace back, it's out of scope. AI must remove or justify it.

---

## Anti-Pattern 6: Tactical Action Items Too Vague for Specs

**Symptoms:**
- Action item: "Improve user experience"
- AI at Spec phase: "What does that mean?"
- Spec generated with made-up ACs that the human never intended

**Fix:** Every action item must be concrete enough that an AI with no context can generate a spec from it. Format: `<verb> <object> for <audience> to achieve <outcome>`. "Implement responsive checkout flow for mobile users to reduce cart abandonment" — not "Improve UX".

---

## Anti-Pattern 7: Impact Chain Breaks Mid-Chain

**Symptoms:**
- vision.md has `> Impact Chain: V-001`
- strategy.md has `> Impact Chain: V-001 → S-001`
- tactics.md has `> Impact Chain: V-001 → S-001 → A-001`
- spec.md is missing the Impact Chain header entirely
- Traceability matrix can't traverse past Tactics

**Fix:** Every artifact template includes the Impact Chain header. CI/CD should check for its presence. The `vdd_chain_validate` command will flag broken chains.

---

## Anti-Pattern 8: Contracts Modified During Implementation

**Symptoms:**
- contracts/user-api.md was "improved" after Phase 7 started
- Frontend and backend have different API shape assumptions
- Tests written against old contract, implementation matches new one

**Fix:** Lock contracts/ after Phase 5 approval. If a contract needs to change:
1. Stop Phase 7
2. Run `vdd_amend` to cascade the change
3. Update spec, plan, contracts, tasks
4. Resume Phase 7 from affected task

---

## Anti-Pattern 9: One Context for All Tasks

**Symptoms:**
- AI "remembers" a wrong architectural decision from TK-002 and applies it to TK-008
- Accumulated hallucinations contaminate later tasks
- The agent gets confused between what was specified vs what was implemented differently

**Fix:** Start a fresh AI context for each task. Include only what's relevant. More context ≠ better output.

---

## Anti-Pattern 10: Adjusting the Spec to Match the Code

**Symptoms:**
- "The AI implemented it differently, so I updated spec.md to match"
- spec.md now describes what was built, not what was wanted
- Future features are planned against a spec that documents past drift

**Fix:** Code must conform to spec. Never the reverse. If the spec is genuinely wrong, run `vdd_amend` to update the full chain — don't patch spec.md in isolation.

---

## Anti-Pattern 11: Validation Without Impact Verification

**Symptoms:**
- Phase 8 validates that every AC has tests and every contract matches
- But nobody checks whether the built product actually creates the vision's intended impact
- "All gates passed" — but the vision's success metrics are not tracked, instrumented, or even checkable

**Fix:** Phase 8 MUST include impact verification. AI must compare the built features against the vision's impact model. Leading indicators must have instrumentation deployed. Lagging indicators must have a measurement plan. If impact can't be verified, the chain is incomplete.

---

## Anti-Pattern 12: Domain Primers Ignored

**Symptoms:**
- vision.md declares target domain "webapp"
- Strategy phase skips loading domain-primers/webapp.md
- Strategy lacks UX considerations, accessibility requirements, browser support matrix
- Implementation discovers missing patterns weeks later

**Fix:** Phase 2 Step 2.1 is mandatory: AI must load domain-primers matching the vision's target domains. The AI must cite domain-primer research in strategy.md. This one has no automated check: the coverage invariants judge ids and serves links, not whether the
research was done, so an un-researched domain passes the tool and fails in review. The skill's
checklist is the only place it is caught — which is why it is a checklist item and not a gate.

---

## Anti-Pattern 13: VDD for Trivial Work

**Symptoms:**
- Full 8-phase VDD chain for "fix typo in footer"
- spec.md created for a CSS color change
- Team resents VDD because overhead exceeds benefit

**Fix:** VDD applies where the payoff exceeds the cost:
- Changes that advance a vision goal: use VDD
- Features touching auth, DB schema, or public API: always use VDD
- Bug fixes under 30 minutes: skip VDD, fix directly
- Configuration changes: skip VDD, commit directly

---

## Anti-Pattern 14: Skipping the Constitution

**Symptoms:**
- First spec invents a new database, a different auth pattern, an unapproved framework
- Security constraints are reinvented per phase instead of inherited from a single source
- Constitution.md exists as a template but was never filled in

**Fix:** Phase 0 is not optional. Before any vision is written, constitution.md must be approved. It is the single source of truth for all technology, security, and convention decisions. Every AI context in every phase includes it.

---

## Anti-Pattern 15: Over-Specifying in Vision

**Symptoms:**
- vision.md contains: "Use React with Next.js App Router, PostgreSQL via Drizzle, deployed on Vercel with GitHub Actions CI/CD"
- Vision describes HOW, not WHY
- Strategy has no decisions left to make
- Changing the framework requires rewriting the vision

**Fix:** Vision describes WHAT impact and WHY it matters. Strategy evaluates HOW to achieve it (including technology). If a vision contains implementation details, move them to strategy or constitution.

---

## Anti-Pattern 16: Critic Agents in the Generating Context

**Symptoms:**
- Gate critic agents run in the same conversation that generated the artifact
- Critic finds only minor issues or "no issues found"
- Critic reads like a summary, not a challenge
- Structural issues surface only in Phase 8

**Fix:** Every critic agent runs in a fresh context with no memory of the generating session. It receives only: the artifact being reviewed + the critic prompt. A critic that knows the reasoning behind decisions cannot challenge them.

---

## Anti-Pattern 17: Spec with Implementation Details

**Symptoms:**
- spec.md mentions specific tables, functions, libraries, or frameworks
- "The /api/users endpoint should query the `users` table using a JOIN with `user_profiles`"
- Changing the database engine requires rewriting the spec
- Plan has no architectural decisions left to make because the spec already made them

**Example (wrong):**
```markdown
## AC-1
The `/api/users` endpoint should query the `users` table using a JOIN
with the `user_profiles` table and return the result as JSON.
```

**Example (correct):**
```markdown
## AC-1
Given a valid session, when the user requests their profile,
then their full profile information is returned within 200ms.
```

**Fix:** Remove all technology references from spec.md. Move them to plan.md.
The spec describes WHAT and WHY. The plan describes HOW.

---

## Anti-Pattern 18: Vague Acceptance Criteria

**Symptoms:**
- "The feature works correctly" — no test can be written for this
- "The API is fast" — 10ms or 10s?
- "Users can manage their settings" — create, read, update, delete, or just read?
- Gate checks pass because nobody can prove the AC failed

**Fix:** Every AC must pass the testability test:
- Can you write an automated test that returns pass or fail? If no → rewrite.
- Can two developers independently write the same test? If no → rewrite.
- Does it include a measurable threshold for performance/security criteria? If no → add one.

Use the Reframe Vague Requirements key practice table in SKILL.md as reference.

---

## Anti-Pattern 19: Missing Error Cases in Contracts

**Symptoms:**
- Frontend shows a generic 500 error because the contract didn't define 409 CONFLICT
- Auth errors not handled because the contract said "returns 200"
- Duplicate submission creates two records because idempotency behavior wasn't specified
- Contracts only document the happy path success response

**Fix:** For every contract, explicitly define:
- All success responses (200, 201, 204)
- All client error responses (400, 401, 403, 404, 409, 422)
- Idempotency behavior (is this endpoint safe to call twice?)
- Rate limiting behavior if applicable
- For every happy-path AC, there must be a paired error AC

---

## Anti-Pattern 20: Treating AI Like a Mind Reader

**Symptoms:**
- Prompt: "Add user authentication" → AI builds OAuth when you wanted sessions
- Prompt: "Make it faster" → AI rewrites working code, introduces bugs
- Prompt: "Add the missing validation" → AI adds it in the wrong layer
- Developer skips spec because "the AI should figure it out"

**The root cause:** Without a spec, AI makes thousands of micro-decisions silently.
It's not wrong — it's guessing. And some guesses will be wrong.

**Fix:** Never prompt an AI coding agent for feature work without a spec (or at minimum,
a tactical action item that is concrete enough). VDD's chain exists precisely to prevent
this — every level constrains the level below so the AI never has to guess.

> "You wouldn't hire a junior dev without giving them specs. Why let an AI code without one?"

---

## Anti-Pattern 21: Skipping the Clarify Step

**Symptoms:**
- spec.md has `[NEEDS CLARIFICATION]` items that were never resolved
- Plan was written with assumed answers that turned out to be wrong
- "The spec says X but we actually meant Y" — discovered during Phase 7
- AI picks an answer for the ambiguity, it's wrong, drift propagates

**The trap:** Spec looks complete enough. You move to Plan. Then in Phase 7 the AI asks
"what should happen when the user is not found?" and you realize there's no AC for it.
The AI picks an answer. It's wrong. Now you have drift baked into the implementation.

**Fix:** The Clarify step is mandatory before Plan generation:
1. Resolve every `[NEEDS CLARIFICATION]` item — no assumptions
2. Run spec validation (vague terms check)
3. Add ACs for every error and edge case surfaced during clarification

30 minutes on Clarify saves 3 hours of wrong implementation.

---

## Anti-Pattern 22: Tasks Without AC References

**Symptoms:**
- tasks.md has entries like "Implement UserRepository" with no AC citation
- During Phase 7, AI asks "what should happen when the user isn't found?"
- the goal→task path check cannot be verified — unknown which ACs each task was supposed to cover
- Test tasks pass but the wrong behavior is tested
- Two tasks implement overlapping behavior; one AC is never covered

**Fix:** Every task must declare:
- **Test tasks:** the specific ACs being tested, including error ACs
- **Implementation tasks:** the contract it implements + the ACs it satisfies

Example:
```markdown
- [ ] **TK-003** [M] Write tests for UserRepository.create()
  - Tests: AC-1 (success path), AC-E1 (duplicate email), AC-E2 (invalid input)
  - Depends on: TK-001

- [ ] **TK-004** [M] Implement UserRepository.create()
  - Contract: `vdd/specs/[feature]/contracts/user-api.md → POST /users`
  - Satisfies: AC-1, AC-E1, AC-E2
  - Depends on: TK-003
```

---

## Anti-Pattern 23: Oversized Tasks

**Symptoms:**
- TK-007 touches 8 files and takes 4 hours
- AI loses context mid-task and asks what the endpoint signature should be
- Multiple unrelated changes in one commit make rollback difficult
- "This is all one logical unit" — but it's actually several units

**Fix:** Split any task that:
- Touches more than 3 files
- Has more than one acceptance criterion
- Would produce a commit diff over 200 lines
- Is estimated at [L] without a written justification

A task that can be described in one sentence is the right size.

---

## Anti-Pattern 24: Ceremony Without Substance

**Symptoms:**
- VDD artifacts are generated and approved but nothing actually changes
- A spec has 10 COULD ACs and zero MUST ACs — all optional, nothing required
- A strategy pillar says "Improve UX" with no research citation, no measurable target
- A commit message says "feat: update" but the diff only changes comments or whitespace
- Gates pass because traceability is technically correct but the artifacts are empty calories
- "All phases complete" but the product's behavior hasn't changed

**The trap:** VDD's chain produces artifacts automatically. If the gates only check traceability (does X trace to Y?) but don't check substance (did X actually change anything?), the methodology becomes a ceremony factory — producing process artifacts that look complete but deliver zero impact.

**Fix:** the check must run over the artifact text, not over the claim that it was written:
- A strategy pillar must cite the research that produced it — "improve UX" with no source is not a pillar.
- A spec must carry at least one MUST acceptance criterion. Zero MUSTs means nothing is required.
- An action item must change behaviour. A comment-only change has no task behind it.
- The chain check reports the matrix it built: a goal with no path to a task is visible as an unreached goal.

The substance principle: **"What did this actually change?"** If the answer is "nothing" or "added a comment," the artifact fails regardless of how neatly it traces.

Run `scripts/vdd-substance-audit.sh` to automatically detect low-substance artifacts.
