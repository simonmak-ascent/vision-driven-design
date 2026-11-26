/**
 * The coverage engine — the whole of VDD 2.0's automated validation.
 *
 * Three invariants over a parent→child matrix replace the 108-check catalogue:
 *   A  forward completeness — no parent row is empty
 *   B  backward soundness   — every child names a parent the prior artifact has
 *   C  dedicated chain      — every parent has a child no other parent shares
 *
 * Counts are separate by design. `checkCounts` compares what the caller
 * declared with what the text contains; `checkCrossKeyActual` compares two
 * counts the text yields against each other. They are different rules with
 * different inputs, and merging them is how a fixture gets specified that its
 * own engine cannot satisfy.
 *
 * The phase a `vdd_check` call names is a `CheckPhase`, not the legacy 17-name
 * `PhaseName` in `meta.ts` — one identifier per concept.
 */

import type { CheckResult, Coverage, ImpactedArtifact } from './types.js';

export const CHECK_PHASES = [
  'constitution',
  'vision',
  'strategy',
  'tactics',
  'specs',
  'plan',
  'tasks',
  'validate',
] as const;

export type CheckPhase = (typeof CHECK_PHASES)[number];

/** The ids a phase produces are counted under one key of `declaredCounts`. */
export type CountKey = 'goals' | 'pillars' | 'actions' | 'specs' | 'components' | 'tasks';

export interface PhaseConfig {
  /** The phase whose ids this one must serve. `null` where there is no junction. */
  readonly parentPhase: CheckPhase | null;
  /** Id prefix of the parent artifact. `null` where there is no junction. */
  readonly parentPrefix: string | null;
  /** Id prefix of this phase's own children. */
  readonly childPrefix: string;
  /** The field a child uses to name its parent. `null` where there is no junction. */
  readonly servesField: string | null;
  /**
   * Keeps only parent blocks carrying this priority — `specs` binds the MUST
   * actions only, so a filtered parent population is never the one
   * `declaredCounts.actions` describes and is never compared with it.
   */
  readonly filter?: string;
  /** `declaredCounts` key this phase's own ids are counted under. */
  readonly countKey: CountKey | null;
  /** How one of this phase's children reads in a failure reason. */
  readonly childLabel: string;
  /** Emit the cross-key diagnostic. Set on `tactics` only — see `checkCrossKeyActual`. */
  readonly crossKey?: boolean;
  /** A phase 2.0.0 cannot check at all: the call fails closed with this reason. */
  readonly notCheckable?: string;
}

export const PHASE_CONFIG: Record<CheckPhase, PhaseConfig> = {
  // Plan §8 dropped G0's six content checks to the skill checklist, and the
  // constitution's children are prose artifact names rather than ids, so this
  // phase has no automated check in 2.0.0: a PASS here means "nothing was
  // checked", and the template's eight sections are asserted by skills/vdd-constitution.
  constitution: { parentPhase: null, parentPrefix: null, childPrefix: 'ART', servesField: null, countKey: null, childLabel: 'artifact' },
  vision: { parentPhase: null, parentPrefix: null, childPrefix: 'V', servesField: null, countKey: 'goals', childLabel: 'goal' },
  strategy: { parentPhase: 'vision', parentPrefix: 'V', childPrefix: 'S', servesField: 'serves_goal', countKey: 'pillars', childLabel: 'pillar' },
  tactics: { parentPhase: 'strategy', parentPrefix: 'S', childPrefix: 'A', servesField: 'serves_pillar', countKey: 'actions', childLabel: 'action item', crossKey: true },
  specs: { parentPhase: 'tactics', parentPrefix: 'A', childPrefix: 'SP', servesField: 'serves_action', filter: 'MUST', countKey: 'specs', childLabel: 'spec' },
  plan: { parentPhase: 'specs', parentPrefix: 'SP', childPrefix: 'PL', servesField: 'serves_spec', countKey: 'components', childLabel: 'component' },
  tasks: { parentPhase: 'plan', parentPrefix: 'PL', childPrefix: 'TK', servesField: 'serves_component', countKey: 'tasks', childLabel: 'task' },
  // 2.0.0 takes no commit input (§8: G6/G7 are not retained), so there is no
  // junction to check. Failing closed beats a PASS over nothing.
  validate: {
    parentPhase: null,
    parentPrefix: null,
    childPrefix: 'TK',
    servesField: null,
    countKey: null,
    childLabel: 'commit',
    notCheckable: 'validate takes no commit input in 2.0.0 — run vdd_chain_validate over the artifacts instead',
  },
};

/**
 * The chain in order, and the only correct iteration set for `vdd_chain_validate`.
 * It excludes `validate`, which fails closed because 2.0.0 takes no commit input:
 * a chain walk over `CHECK_PHASES` would add that failure to every chain and make
 * a perfect chain impossible to pass. `amendImpact` walks forward through this.
 */
export const CHAIN: CheckPhase[] = ['vision', 'strategy', 'tactics', 'specs', 'plan', 'tasks'];

/** Parent id → the children that name it. A child serving two parents appears in both rows. */
export type Matrix = Record<string, string[]>;

export interface Child {
  id: string;
  serves: string[];
}

export interface InvariantResult {
  forward: string[];
  backward: string[];
  dedicated: string[];
  reasons: string[];
}

const escape = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const idPattern = (prefix: string): RegExp => new RegExp(`\\b${prefix}-\\d{3}\\b`, 'g');

/** Every id of the given prefix, in first-appearance order, de-duplicated. */
export function extractIds(content: string, prefix: string): string[] {
  return [...new Set(content.match(idPattern(prefix)) ?? [])];
}

/**
 * Where a child's block begins, or `null` when the id is named only *inside* a
 * line. An id is a block start when the line it opens carries nothing before it
 * but markdown furniture (`#`, `-`, `*`, `>`, `|`, digits, dots) — or a task
 * checkbox, which a tasks artifact puts before every item and which is spelled
 * out here rather than by admitting `[` and `]` generally, so a markdown link
 * (`- [V-001](vdd/vision.md)`) is a mention and not a block start. A chain header
 * — `> Impact Chain: V-001 → S-002 → T-003` — puts prose before every id on the
 * line, so none of them opens a block; the same rule keeps a mention inside a
 * sentence from starting one. This is what makes `amendImpact` see a removed
 * section even while a stale header still names its id.
 */
function blockStart(content: string, id: string): number | null {
  const re = new RegExp(`^(?:[ \\t]*[-*][ \\t]\\[[ xX]\\][ \\t]*)?[ \\t>*#|\\-.\\d]*${id}(?![\\d-])`, 'm');
  const match = re.exec(content);
  return match ? match.index + match[0].indexOf(id) : null;
}

/**
 * `auto` reads the ids that open a block and falls back to first appearance when
 * the artifact opens none (a one-line list of ids). `anchored` never falls back,
 * so a caller comparing two revisions does not read a stale chain header on the
 * side that lost its last heading while the other side still has one.
 */
type BlockMode = 'auto' | 'anchored';

/**
 * Every child id that opens a block, with the block it heads, in document order.
 * With `mode: 'auto'` an artifact that opens no blocks has its ids taken in
 * first-appearance order, the first one's block running to the end of the text.
 */
function childBlocks(
  content: string,
  phase: CheckPhase,
  mode: BlockMode = 'auto',
): Array<{ id: string; block: string }> {
  const ids = extractIds(content, PHASE_CONFIG[phase].childPrefix);
  const anchored = ids
    .map((id) => ({ id, start: blockStart(content, id) }))
    .filter((entry): entry is { id: string; start: number } => entry.start !== null);

  const chosen = anchored.length > 0 || mode === 'anchored'
    ? anchored
    : ids.map((id) => ({ id, start: content.indexOf(id) }));
  const positioned = [...chosen].sort((a, b) => a.start - b.start);

  return positioned.map((entry, i) => ({
    id: entry.id,
    block: content.slice(entry.start, i + 1 < positioned.length ? positioned[i + 1].start : content.length),
  }));
}

/** True when this revision opens at least one child block. */
export function opensBlocks(content: string, phase: CheckPhase): boolean {
  return extractIds(content, PHASE_CONFIG[phase].childPrefix).some((id) => blockStart(content, id) !== null);
}

/** The ids this phase's artifact actually declares, one per block. */
function childIds(content: string, phase: CheckPhase, mode: BlockMode = 'auto'): string[] {
  return childBlocks(content, phase, mode).map(({ id }) => id);
}

/** Split the artifact into child blocks and read the parent each one names. */
export function extractChildren(content: string, phase: CheckPhase): Child[] {
  const field = PHASE_CONFIG[phase].servesField;
  const blocks = childBlocks(content, phase);
  if (!field) return blocks.map(({ id }) => ({ id, serves: [] }));

  const fieldRe = new RegExp(`${escape(field)}\\**\\s*:\\s*([A-Z]{1,2}-\\d{3})`, 'g');
  return blocks.map(({ id, block }) => ({
    id,
    serves: [...new Set([...block.matchAll(fieldRe)].map((m) => m[1]))],
  }));
}

/**
 * The parent ids this phase must serve, read from the prior artifact.
 * `specs` binds to MUST actions only (§4.5), so a non-MUST action is not a
 * parent row and an SP serving one is an orphan.
 */
function extractParents(phase: CheckPhase, parentText: string): string[] {
  const cfg = PHASE_CONFIG[phase];
  if (!cfg.parentPrefix) return [];
  if (!cfg.filter || !cfg.parentPhase) return extractIds(parentText, cfg.parentPrefix);

  // Three shapes carry the same fact: `priority: MUST` (the spec's §8 fixture),
  // a `| MUST |` cell (the tactics template's Priority column) and `[MUST]`.
  // Matching only the field form leaves the parent set empty on an artifact the
  // template actually produces, and an empty parent set makes invariant A report
  // nothing at all — a PASS over no rows.
  //
  // The field form is a line inside the block. The cell and bracket forms are
  // positional: they count only on the block's first line, the one carrying the
  // id. `childBlocks` runs the last child's block to the end of the artifact, so
  // a cell matched anywhere would let the trailing Infrastructure Requirements
  // table's `| … | Infrastructure | MUST |` promote a COULD action to a MUST
  // parent — a false "A-004 has no spec", and a spec serving A-004 accepted as
  // if it served a MUST action. The cell form also requires the marker to be a
  // whole cell, so a description beginning "MUST support …" cannot match.
  const marker = escape(cfg.filter);
  const fieldForm = new RegExp(`priority\\s*:\\s*${marker}\\b`, 'i');
  const cellForm = new RegExp(`(?:\\|\\s*${marker}\\s*(?=\\||$)|\\[\\s*${marker}\\s*\\])`, 'i');

  return childBlocks(parentText, cfg.parentPhase)
    .filter(({ block }) => {
      const [firstLine = ''] = block.split('\n');
      return fieldForm.test(block) || cellForm.test(firstLine);
    })
    .map(({ id }) => id);
}

/** Build the parent→child matrix. An edge to an unknown parent is never created. */
export function buildMatrix(parents: string[], children: Child[]): Matrix {
  const matrix: Matrix = Object.fromEntries(parents.map((parent) => [parent, []]));
  for (const child of children) {
    for (const parent of child.serves) {
      if (matrix[parent] && !matrix[parent].includes(child.id)) matrix[parent].push(child.id);
    }
  }
  return matrix;
}

function columnSums(matrix: Matrix): Record<string, number> {
  const sums: Record<string, number> = {};
  for (const ids of Object.values(matrix)) {
    for (const id of ids) sums[id] = (sums[id] ?? 0) + 1;
  }
  return sums;
}

/**
 * Invariants A, B and C.
 *
 * `children` is required, not optional: invariant B is about a child that names
 * no known parent, and such a child has no column in the matrix at all — it is
 * invisible to a matrix-only pass. Checking B without the extracted children
 * would be a control that cannot fail.
 */
export function checkInvariants(matrix: Matrix, phase: CheckPhase, children: Child[]): InvariantResult {
  const cfg = PHASE_CONFIG[phase];
  const rows = Object.keys(matrix);
  const sums = columnSums(matrix);
  const served = new Set(Object.values(matrix).flat());

  const forward = rows.filter((parent) => matrix[parent].length > 0);
  const dedicated = rows.filter((parent) => matrix[parent].some((child) => sums[child] === 1));

  const reasons: string[] = [];

  for (const parent of rows) {
    if (matrix[parent].length === 0) reasons.push(`${parent} has no ${cfg.childLabel}`);
  }
  if (cfg.parentPrefix) {
    for (const child of children) {
      if (!served.has(child.id)) reasons.push(`${child.id} serves no known parent`);
    }
  }
  for (const parent of rows) {
    const covered = matrix[parent].length > 0;
    if (covered && !matrix[parent].some((child) => sums[child] === 1)) {
      reasons.push(`${parent} has no dedicated ${cfg.childLabel}`);
    }
  }

  return { forward, backward: [...served], dedicated, reasons };
}

/** The keys of `declaredCounts` this phase compares: its own count, and its
 *  parent's when that parent set is the whole population (`specs` filters to
 *  MUST actions, so `declaredCounts.actions` describes a different set). */
function consumedKeys(phase: CheckPhase): CountKey[] {
  const cfg = PHASE_CONFIG[phase];
  const parentKey = cfg.parentPhase ? PHASE_CONFIG[cfg.parentPhase].countKey : null;
  return [cfg.countKey, cfg.filter ? null : parentKey].filter((key): key is CountKey => key !== null);
}

/**
 * Rule (a): per key, what the caller declared against what the text contains.
 * Only the keys this phase consumes are compared, so a stray declaration cannot
 * fail a phase that never reads it, and an omitted key is not checked at all.
 */
export function checkCounts(
  declared: Record<string, number> | undefined,
  actual: Record<string, number>,
  phase: CheckPhase,
): string[] {
  if (!declared) return [];

  const reasons: string[] = [];
  for (const key of consumedKeys(phase)) {
    if (!(key in declared)) continue;
    const found = actual[key] ?? 0;
    if (found !== declared[key]) reasons.push(`declared ${key} ${declared[key]}, actual ${found}`);
  }
  return reasons;
}

/**
 * Rule (b): two counts taken from the text, compared with each other.
 *
 * Only `tactics` calls this, because `action_count`/`pillar_count` is the one
 * cross-key pair the specification prints a reason string for (§8). Writing
 * equivalent strings for the other junctions would invent output the spec does
 * not define; invariant C already forces every junction's children ≥ parents.
 */
export function checkCrossKeyActual(matrix: Matrix): string[] {
  const pillars = Object.keys(matrix).length;
  const actions = new Set(Object.values(matrix).flat()).size;
  return actions < pillars ? [`action_count=${actions} < pillar_count=${pillars}`] : [];
}

/** The counts this phase's artifact yields, under the keys it consumes. */
function actualCounts(phase: CheckPhase, parents: string[], childCount: number): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const key of consumedKeys(phase)) {
    counts[key] = key === PHASE_CONFIG[phase].countKey ? childCount : parents.length;
  }
  return counts;
}

/**
 * The phase that authored `content`. There is no `phase` on `vdd_amend`
 * (§2.5), so it is inferred from what the artifact carries: its junction field
 * first, because that is exact; then the child prefixes, deepest-first; then a
 * bare `V-` id. A downstream artifact whose `serves_*` line is missing is
 * exactly the artifact invariant B must flag, so it is inferred from its own
 * child prefix and never mistaken for the vision it names in its chain header.
 */
export function inferPhase(content: string): CheckPhase | null {
  const deepestFirst = ['tasks', 'plan', 'specs', 'tactics', 'strategy'] as CheckPhase[];
  for (const phase of deepestFirst) {
    const field = PHASE_CONFIG[phase].servesField;
    if (field && new RegExp(`\\b${field}\\b`).test(content)) return phase;
  }
  for (const phase of deepestFirst) {
    if (new RegExp(`\\b${PHASE_CONFIG[phase].childPrefix}-\\d{3}\\b`).test(content)) return phase;
  }
  if (/\bV-\d{3}\b/.test(content)) return 'vision';
  return null;
}

/**
 * Which downstream phases name an id the new content no longer has.
 * `priorArtifacts[phase]` must be the *old* text of the amended phase.
 *
 * Ids are read from the blocks the artifacts declare, not from every
 * occurrence: a stale `> Impact Chain:` header still names a removed id, and
 * counting mentions would report the removal as no change at all.
 */
export function amendImpact(
  phase: CheckPhase,
  content: string,
  priorArtifacts: Partial<Record<CheckPhase, string>>,
): ImpactedArtifact[] {
  // The mode is chosen once, for the pair: if either revision opens blocks, both
  // are read that way, so an edit that removes the last section cannot have its
  // removed id reappear from the stale header the other side still carries.
  const prior = priorArtifacts[phase] ?? '';
  const mode: BlockMode = opensBlocks(prior, phase) || opensBlocks(content, phase) ? 'anchored' : 'auto';
  const before = childIds(prior, phase, mode);
  const after = new Set(childIds(content, phase, mode));
  const removed = before.filter((id) => !after.has(id));
  if (removed.length === 0) return [];

  const start = CHAIN.indexOf(phase);
  if (start === -1) return [];

  const impacted: ImpactedArtifact[] = [];
  for (const downstream of CHAIN.slice(start + 1)) {
    const text = priorArtifacts[downstream];
    if (!text) continue;
    const hit = removed.filter((id) => new RegExp(`\\b${escape(id)}\\b`).test(text));
    if (hit.length > 0) impacted.push({ phase: downstream, reason: `references removed ${hit.join(', ')}` });
  }
  return impacted;
}

/**
 * The dispatch every surface calls. One implementation, so a hosted and a local
 * response cannot disagree about the same artifact.
 */
export function runPhaseCheck(
  phase: CheckPhase,
  content: string,
  declaredCounts?: Record<string, number>,
  priorArtifacts: Partial<Record<CheckPhase, string>> = {},
): CheckResult {
  const cfg = PHASE_CONFIG[phase];
  const empty: Coverage = { forward_covered: [], backward_sound: [], dedicated: [], matrix: {} };

  if (cfg.notCheckable) {
    return {
      status: 'FAIL',
      reasons: [cfg.notCheckable],
      declared_counts: declaredCounts ?? null,
      actual_counts: {},
      coverage: empty,
    };
  }

  const parentText = cfg.parentPhase ? priorArtifacts[cfg.parentPhase] ?? '' : '';
  const parents = parentText ? extractParents(phase, parentText) : [];
  const children = extractChildren(content, phase);
  const matrix = buildMatrix(parents, children);
  const invariants = checkInvariants(matrix, phase, children);

  const counts = actualCounts(phase, parents, childIds(content, phase).length);
  const reasons = [
    ...invariants.reasons,
    ...checkCounts(declaredCounts, counts, phase),
    ...(cfg.crossKey ? checkCrossKeyActual(matrix) : []),
  ];

  const coverage: Coverage = {
    forward_covered: invariants.forward,
    backward_sound: invariants.backward,
    dedicated: invariants.dedicated,
    matrix,
  };

  return {
    status: reasons.length === 0 ? 'PASS' : 'FAIL',
    reasons,
    declared_counts: declaredCounts ?? null,
    actual_counts: counts,
    coverage,
  };
}
