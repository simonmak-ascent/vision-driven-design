import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';
import { PHASES, PHASE_NAMES, PHASE_META, type VddContext, type VddPhaseInput } from '@simonmak-ascent/engine';

// Shared field definitions, then a per-phase input schema so each tool advertises
// only the parameters it actually reads (feeds Glama's "Parameter Semantics" score).
const projectRoot = z.string().default('.').describe('Project root: directory that constitution.md and the vdd/ folder are written to and resolved against (default ".")');
const statement = z.string().optional().describe('Freeform vision statement (required for vision)');
const statementReq = z.string().describe('Freeform vision statement');
const actionItemId = z.string().optional().describe('Tactical action item ID (e.g., "A-001")');
const feature = z.string().optional().describe('Feature name (spec directory name)');
const featureReq = z.string().describe('Feature name (spec directory name)');
const scope = z.enum(['project', 'feature']).optional().describe('Inspect scope: "project" (default) returns the traceability matrix; "feature" returns per-feature spec metrics (requires feature)');
const taskId = z.string().describe('Task ID to implement (e.g., "TASK-003")');
const description = z.string().optional().describe('Freeform description input');
const descriptionReq = z.string().describe('Description of the requirement change');
const availableTools = z.array(z.string()).optional().describe('MCP/tool names available to the host agent (e.g., ["brave-search","perplexity","context7","gh_grep","playwright","filesystem"])');
const capabilities = z.array(z.string()).optional().describe('Alias for availableTools');
const researchFindings = z.string().optional().describe('Consolidated research subagent findings to synthesize into strategy.md');
const artifactFiles = z.record(z.string(), z.string()).optional().describe('Map of artifact path → content for serverless validate/drift detection');
const maxPages = z.number().int().positive().optional().describe('Clone: max pages to crawl (default 200)');
const timeoutMs = z.number().int().positive().optional().describe('Clone: per-request timeout in ms');
const concurrency = z.number().int().positive().optional().describe('Clone: concurrent crawl workers (default 8)');
const crawl = z.boolean().optional().describe('Clone: run the crawl (default true)');
const browser = z.boolean().optional().describe('Clone: run browser/static capture (default true)');
const refresh = z.boolean().optional().describe('Clone: force re-crawl, ignore a fresh cached dataset');

const PHASE_INPUT_SCHEMAS: Record<string, Record<string, z.ZodType>> = {
  init: { projectRoot },
  vision: { statement: statementReq, projectRoot },
  strategize: { availableTools, capabilities, researchFindings, projectRoot },
  tactics: { projectRoot },
  specify: { feature, actionItemId, description, projectRoot },
  clarify: { feature: featureReq, projectRoot },
  plan: { feature: featureReq, projectRoot },
  tasks: { feature: featureReq, projectRoot },
  'get-next-task': { feature: featureReq, projectRoot },
  implement: { taskId, projectRoot },
  validate: { feature, artifactFiles, projectRoot },
  inspect: { scope, feature, projectRoot },
  amend: { description: descriptionReq, projectRoot },
  clone: { description, statement, maxPages, timeoutMs, concurrency, crawl, browser, refresh, projectRoot },
  'detect-environment': { availableTools, capabilities, projectRoot },
};

// MCP annotation hints feed Glama's Tool Definition Quality Score (Behavioral
// Transparency dimension). Annotations describe the tool's OWN effect on the
// filesystem, not the follow-on work the host agent performs from its output:
//   - readOnlyHint: the tool writes nothing (it reads or returns instructions).
//   - destructiveHint: true only when the tool overwrites an existing artifact;
//     false when it is additive (writes a new generated file). The MCP default
//     is true, so a non-read-only tool must set false to be shown as additive.
//   - openWorldHint: the tool reaches external systems (web research, cloning).
// `clarify`, `implement`, and `amend` return questions/instructions without
// touching disk, so they are read-only; `validate` writes only a new generated
// report and never clobbers a hand-authored one.
export const TOOL_ANNOTATIONS: Record<string, {
  title: string;
  annotations: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
}> = {
  init: { title: 'Initialize Constitution', annotations: { destructiveHint: true, openWorldHint: false } },
  vision: { title: 'Expand Vision', annotations: { destructiveHint: true, openWorldHint: false } },
  strategize: { title: 'Research Strategy', annotations: { destructiveHint: true, openWorldHint: true } },
  tactics: { title: 'Audit Tactics', annotations: { destructiveHint: true, openWorldHint: false } },
  specify: { title: 'Generate Spec', annotations: { destructiveHint: true, openWorldHint: false } },
  clarify: { title: 'Clarify Spec', annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false } },
  plan: { title: 'Generate Plan', annotations: { destructiveHint: true, openWorldHint: false } },
  tasks: { title: 'Generate Tasks', annotations: { destructiveHint: true, openWorldHint: false } },
  'get-next-task': { title: 'Get Next Task', annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false } },
  implement: { title: 'Implement Task', annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false } },
  validate: { title: 'Validate Impact', annotations: { destructiveHint: false, idempotentHint: true, openWorldHint: false } },
  inspect: { title: 'Inspect Project', annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false } },
  amend: { title: 'Amend Requirements', annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false } },
  clone: { title: 'Clone Website', annotations: { destructiveHint: true, openWorldHint: true } },
  'detect-environment': { title: 'Detect Environment', annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false } },
};

// Documented output shape so clients and evaluators know what each tool returns
// without the description having to restate it.
const OUTPUT_SCHEMA = {
  success: z.boolean().describe('Whether the phase completed successfully'),
  artifact: z.string().optional().describe('Primary artifact produced or returned'),
  gateResult: z.object({
    passed: z.boolean().describe('Whether the quality gate passed'),
    checks: z.number().describe('Number of checks run'),
    total: z.number().describe('Total number of checks'),
  }).optional().describe('Quality-gate result, when the phase runs a gate'),
  output: z.record(z.string(), z.unknown()).optional().describe('Additional structured phase output'),
  error: z.string().optional().describe('Error message when the phase fails'),
  _phase: z.string().describe('VDD phase that produced this result'),
  _sdt: z.string().describe('Strategy-and-Tactic instructions for the next step'),
};

// The `e2e` phase is intentionally NOT exposed as an MCP tool: it is a one-call
// convenience that duplicates the phase sequence (the coherence dimension flags
// it as redundant). It stays available via the CLI (`vdd e2e`).
export const MCP_TOOL_PHASES = PHASE_NAMES.filter(
  (name) => !['e2e', 'trace', 'analyze'].includes(name),
);

export function createVddMcpServer(): McpServer {
    const server = new McpServer({ name: 'vdd', version: '1.8.1' });

  for (const name of MCP_TOOL_PHASES) {
    const toolName = `vdd_${name.replace(/-/g, '_')}`;
    const meta = PHASE_META[name];
    const toolMeta = TOOL_ANNOTATIONS[name];
    server.registerTool(
      toolName,
      {
        title: toolMeta?.title,
        description: meta?.description ?? `VDD Phase: ${name}`,
        inputSchema: PHASE_INPUT_SCHEMAS[name],
        outputSchema: OUTPUT_SCHEMA,
        annotations: toolMeta?.annotations,
      },
      async (params: Record<string, unknown>) => {
        const ctx: VddContext = { projectRoot: String(params.projectRoot || '.'), mode: 'auto' };
        const input: VddPhaseInput = {
          statement: params.statement as string | undefined,
          actionItemId: params.actionItemId as string | undefined,
          feature: params.feature as string | undefined,
          taskId: params.taskId as string | undefined,
          description: params.description as string | undefined,
          availableTools: params.availableTools as string[] | undefined,
          capabilities: params.capabilities as string[] | undefined,
          researchFindings: params.researchFindings as string | undefined,
          artifactFiles: params.artifactFiles as Record<string, string> | undefined,
          maxPages: params.maxPages as number | undefined,
          timeoutMs: params.timeoutMs as number | undefined,
          concurrency: params.concurrency as number | undefined,
          crawl: params.crawl as boolean | undefined,
          browser: params.browser as boolean | undefined,
          refresh: params.refresh as boolean | undefined,
          json: false,
        };
        const result = await PHASES[name](input, ctx);
        const structured = {
          ...result,
          _phase: name,
          _sdt: meta?.instructions ?? '',
        };
        const responseText = JSON.stringify(structured, null, 2);
        return {
          content: [{ type: 'text' as const, text: responseText }],
          structuredContent: structured as Record<string, unknown>,
        };
      }
    );
  }

  return server;
}

export async function startStdioServer() {
  const server = createVddMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
