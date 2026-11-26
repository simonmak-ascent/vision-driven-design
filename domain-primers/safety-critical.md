# Safety-Critical Domain Primer

Loaded during Phase 2 (Strategy) when the vision involves aerospace, medical devices, automotive, industrial control, or any domain requiring formal safety analysis (DO-178C, IEC 62304, ISO 26262, IEC 61508).

## Research Patterns

### Safety Analysis Methods

- **FMEA (Failure Mode and Effects Analysis)**:
  - Identify failure modes per component/function
  - Rate severity (1–10), occurrence (1–10), detection (1–10)
  - Calculate RPN (Risk Priority Number) = S × O × D
  - Prioritize mitigations for RPN > threshold
- **FTA (Fault Tree Analysis)**:
  - Top-down deductive analysis from hazard event
  - AND/OR gates to model fault propagation
  - Calculate probability of top event from base event rates
  - Identify single points of failure and common-cause failures
- **HAZOP (Hazard and Operability Study)**:
  - Guide-word based deviation analysis
  - Systematic examination of process parameters (flow, pressure, temperature)
  - Applicable to data pipelines, ETL flows, API chains

### Safety Integrity Levels

| Domain | Standard | Levels | Key Requirement |
|--------|----------|--------|----------------|
| Aerospace | DO-178C | DAL A–E | MCDC coverage for DAL A/B |
| Medical | IEC 62304 | Class A–C | Risk control measures in requirements |
| Automotive | ISO 26262 | ASIL A–D | HARA (Hazard Analysis and Risk Assessment) |
| Industrial | IEC 61508 | SIL 1–4 | PFD (Probability of Failure on Demand) |

### VDD Integration Points

| VDD Phase | Safety Integration |
|-----------|-------------------|
| Phase 1 (Vision) | Identify safety-critical actors and hazard scenarios in §4 (5Ws) and §5 (possibility space) |
| Phase 4 (Specs) | Add `[SAFETY]` ACs alongside `[MUST]` ACs — every safety-critical behavior gets a verifiable AC |
| Phase 5 (Plan) | Safety architecture: redundancy, isolation, fail-safe defaults, watchdog timers |
| Phase 6 (Tasks) | Safety verification tasks precede functional tasks (test-first for safety) |
| Phase 7 (Implement) | Traceability: `feat(scope): TK-XXX → AC-SAFETY-YYY → HAZARD-ZZZ` |
| Phase 8 (Validate) | Safety coverage matrix: Hazard → Safety AC → Test → Evidence |

### Toolchain for Safety-Critical VDD

- **Pre-deployment**: Formal verification (TLA+, Alloy), static analysis (Polyspace, Astree), model checking
- **Testing**: MC/DC coverage tools, fault injection, robustness testing, boundary value analysis
- **Post-deployment**: Runtime monitoring, watchdog health checks, fail-safe state transitions
- **Evidence**: Auto-generated traceability matrices, test coverage reports, RPN registers

## Impact Verification

### Safety Impact Metrics

- **Leading**: RPN reduction per release, % of safety ACs covered by automated verification
- **Lagging**: Hazard incidents per release, mean time to detect safety violation, false-alarm rate
- **Regulatory**: % of DO-178C/CMMI/IEC 62304 criteria demonstrably met by VDD artifacts

### Safety Checklist (supplements the coverage invariants)

The coverage invariants judge structure, not safety. Each junction below is where a safety addition is
reviewed; the last two are review steps, not tool checks — 2.0.0 ships no implement or validate gate.

| Junction | Safety addition |
|---|---|
| A→SP | Every identified hazard has ≥1 `[SAFETY]` AC |
| SP→PL | Every safety AC has a verified safety mechanism in architecture |
| PL→TK | Safety tasks ordered before dependent functional tasks |
| TK→IM (review) | Safety tests pass before functional implementation proceeds |
| IM→VS (review) | Hazard→AC→Test→Evidence chain complete; residual risk accepted |
