import { z } from 'zod';

export const VddMode = z.enum(['auto', 'gated']);
export type VddMode = z.infer<typeof VddMode>;

export const Constitution = z.object({
  version: z.string().optional(),
  mode: VddMode.optional().default('auto'),
  stack: z.record(z.string(), z.string()).optional(),
  conventions: z.record(z.string(), z.string()).optional(),
});
export type Constitution = z.infer<typeof Constitution>;

export const VddContext = z.object({
  projectRoot: z.string().describe('Path to project root'),
  constitution: Constitution.optional(),
  mode: VddMode.default('auto'),
});
export type VddContext = z.infer<typeof VddContext>;

// How a phase result was produced:
//   - "local": the server read/wrote the project filesystem (stdio/HTTP/CLI).
//   - "hosted-delegated": the stateless hosted endpoint returned a delegation
//     envelope for the calling agent to execute; it performed no filesystem I/O.
export const VddModeReport = z.enum(['local', 'hosted-delegated']);
export type VddModeReport = z.infer<typeof VddModeReport>;

// A delegation envelope returned by the hosted endpoint when a phase needs the
// filesystem it does not have. The host agent executes the job locally and calls
// the nextTool again with the expected inputs (see artifactFiles/codebaseAudit).
export const Delegation = z.object({
  id: z.string().describe('Stable identifier the agent echoes back on the next call'),
  goal: z.string().describe('What the agent must accomplish locally'),
  kind: z.enum(['read', 'audit', 'write', 'research', 'implement']),
  promptTemplate: z.string().describe('Server-controlled, versioned prompt template for the job'),
  requiredTools: z.array(z.string()).describe('Host tools the job needs (from vdd_detect_environment)'),
  expectedReturn: z.record(z.string(), z.unknown()).describe('Inputs to send back on the next call'),
  writeTargets: z.array(z.string()).optional().describe('Repo-relative paths the agent must create/overwrite'),
  nextTool: z.string().describe('Tool to call with the executed result (same tool for two-pass phases)'),
});
export type Delegation = z.infer<typeof Delegation>;

export const VddOutput = z.object({
  success: z.boolean(),
  artifact: z.string().optional(),
  gateResult: z.object({ passed: z.boolean(), checks: z.number(), total: z.number() }).optional(),
  output: z.record(z.string(), z.unknown()).optional(),
  error: z.string().optional(),
  mode: VddModeReport.optional(),
  persisted: z.boolean().optional().describe('True when the server wrote artifacts to the project filesystem'),
  delegation: Delegation.optional(),
});
export type VddOutput = z.infer<typeof VddOutput>;

export const VddPhaseInput = z.object({
  statement: z.string().optional(),
  actionItemId: z.string().optional(),
  feature: z.string().optional(),
  taskId: z.string().optional(),
  description: z.string().optional(),
  scope: z.enum(['project', 'feature']).optional(),
  json: z.boolean().default(false),
  availableTools: z.array(z.string()).optional(),
  capabilities: z.array(z.string()).optional(),
  researchFindings: z.string().optional(),
  artifactFiles: z.record(z.string(), z.string()).optional(),
  codebaseAudit: z.string().optional(),
  maxPages: z.number().int().positive().optional(),
  timeoutMs: z.number().int().positive().optional(),
  concurrency: z.number().int().positive().optional(),
  crawl: z.boolean().optional(),
  browser: z.boolean().optional(),
  refresh: z.boolean().optional(),
});
export type VddPhaseInput = z.infer<typeof VddPhaseInput>;

export type VddPhaseFn = (input: VddPhaseInput, context: VddContext) => Promise<VddOutput>;
