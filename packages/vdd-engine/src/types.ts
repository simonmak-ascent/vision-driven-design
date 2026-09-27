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

export const VddOutput = z.object({
  success: z.boolean(),
  artifact: z.string().optional(),
  gateResult: z.object({ passed: z.boolean(), checks: z.number(), total: z.number() }).optional(),
  output: z.record(z.string(), z.unknown()).optional(),
  error: z.string().optional(),
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
  maxPages: z.number().int().positive().optional(),
  timeoutMs: z.number().int().positive().optional(),
  concurrency: z.number().int().positive().optional(),
  crawl: z.boolean().optional(),
  browser: z.boolean().optional(),
  refresh: z.boolean().optional(),
});
export type VddPhaseInput = z.infer<typeof VddPhaseInput>;

export type VddPhaseFn = (input: VddPhaseInput, context: VddContext) => Promise<VddOutput>;
