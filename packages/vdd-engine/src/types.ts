import { z } from 'zod';

// The published schema surface of @simonmak-ascent/engine.
//
// 2.0.0 removed the generation model — no `VddOutput`, no delegation envelope, no
// `projectRoot`, no `feature`. A tool takes artifact text and returns a verdict;
// these three schemas are that verdict.

export const Coverage = z.object({
  forward_covered: z.array(z.string()).describe('Parents with at least one child (invariant A)'),
  backward_sound: z.array(z.string()).describe('Children whose serves value names a known parent (invariant B)'),
  dedicated: z.array(z.string()).describe('Parents with a child no other parent shares (invariant C)'),
  matrix: z.record(z.string(), z.array(z.string())).describe('Parent id → child ids that declare it'),
});
export type Coverage = z.infer<typeof Coverage>;

export const ImpactedArtifact = z.object({
  phase: z.string().describe('Downstream phase that still names a removed id'),
  reason: z.string().describe('Which ids it names'),
});
export type ImpactedArtifact = z.infer<typeof ImpactedArtifact>;

// The engine's judgement. The wire result adds `resultType` around it — see
// `checkResult` in packages/vdd-mcp/src/server.ts.
export const CheckResult = z.object({
  status: z.enum(['PASS', 'FAIL']),
  reasons: z.array(z.string()).describe('One line per failed check, naming the id to fix'),
  declared_counts: z.record(z.string(), z.number()).nullable(),
  actual_counts: z.record(z.string(), z.number()),
  coverage: Coverage,
});
export type CheckResult = z.infer<typeof CheckResult>;
