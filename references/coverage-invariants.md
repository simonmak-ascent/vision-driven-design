# Coverage invariants

The authoritative statement of what `vdd_check`, `vdd_chain_validate` and `vdd_amend` verify. It
replaces the retired gate catalogue: the seven counted gates and their checks are gone, and what
remains is three invariants over a matrix plus a count rule.

## The matrix

Every artifact declares child ids and, on each child, the parent it serves. The check reads both and
builds `matrix[parent] = [children]`.

| Phase | Parent prefix | Child prefix | Junction field |
|---|---|---|---|
| constitution | — | `ART` | — (children are prose artifact names) |
| vision | — | `V` | — (the `## Chain projection` binds `V` to `OBJ`) |
| strategy | `V` | `S` | `serves_goal` |
| tactics | `S` | `A` | `serves_pillar` |
| specs | `A` (MUST only) | `SP` | `serves_action` |
| plan | `SP` | `PL` | `serves_spec` |
| tasks | `PL` | `TK` | `serves_component` |
| validate | — | `TK` | — (fails closed: 2.0.0 takes no commit input) |

A child id opens a block when its line begins with nothing but markdown furniture — `#`, `-`, `*`, `>`,
`|`, a task checkbox, digits or dots. A mention inside a line (a chain header, a sentence) is not a
block, which is why a stale `> Impact Chain:` line cannot count as content.

## The three invariants

- **A — forward completeness.** No parent row is empty: every parent has at least one child.
- **B — backward soundness.** No child names a parent the prior artifact does not declare.
- **C — dedicated chain.** Every parent has at least one child no other parent shares — a child whose
  column sum is exactly 1. This is the structural answer to the "A-001-only" artifact: one action
  serving one pillar while two other pillars have nothing.

`status` is `PASS` only when all three hold together.

## The count rules

Two rules, different inputs, stated separately because conflating them is how a fixture gets specified
that its own engine cannot satisfy.

**Per key, declared against actual.** A phase compares the `declaredCounts` keys it consumes with what
the text contains: `declared <key> <declared>, actual <actual>`. A key the caller omits is not checked.
`specs` compares only `specs` — its parent set is the MUST actions, which is not the population
`declaredCounts.actions` describes.

**Cross key, actual against actual.** `tactics` alone emits `action_count=<n> < pillar_count=<m>` when
the actions found in the text are fewer than the pillars the strategy declares. Invariant C already
implies it; it is printed because the reference fixture pins the string.

## The reference fixture

```markdown
# tactics.md

## A-001
- serves_pillar: S-001
- priority: MUST
```

With `priorArtifacts.strategy` declaring `S-001`, `S-002`, `S-003` and **no `declaredCounts`**:

```json
{
  "status": "FAIL",
  "reasons": ["S-002 has no action item", "S-003 has no action item", "action_count=1 < pillar_count=3"],
  "coverage": {
    "forward_covered": ["S-001"],
    "backward_sound": ["A-001"],
    "dedicated": ["S-001"],
    "matrix": { "S-001": ["A-001"], "S-002": [], "S-003": [] }
  }
}
```

Adding `A-002` (serves only `S-002`) and `A-003` (serves only `S-003`) makes it pass.

## What is not checked

The constitution phase returns PASS with an empty matrix: the six content checks the old engine ran are
prose in the `vdd-constitution` skill. The validate phase fails closed with one reason naming
`vdd_chain_validate`, because 2.0.0 takes no commit input. Neither is a gate, and a PASS from the first
means nothing was checked.
