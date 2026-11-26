import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';
import { CHECK_PHASES, CheckResult, runAmend, runChainCheck, runPhaseCheck } from '@simonmak-ascent/engine';

import { loadSkillCatalog } from './skills.js';

// 2.0.0's whole tool surface: three tools that judge an artifact, and nine
// skills that tell the agent what to write. No tool generates content, calls a
// model, or touches a filesystem — `content` is passed in, and the answer is a
// matrix. Both surfaces (stdio here, the hosted handler in api/) build this same
// server, so a local and a remote call cannot disagree.

const declaredCounts = z
  .record(z.string(), z.number())
  .optional()
  .describe(
    'Counts you declared before generating, keyed goals / pillars / actions / specs / components / tasks. Each phase compares only the keys it consumes; omit it and no count is checked.',
  );

const priorArtifacts = z
  .record(z.string(), z.string())
  .optional()
  .describe('Phase name → artifact text. The parent artifact supplies the parent ids this phase must serve.');

// The wire contract is the engine's published schema plus the protocol's result
// marker — not a second copy of it, so the two cannot drift.
const checkResult = CheckResult.extend({ resultType: z.literal('complete') });

const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

function text(result: object) {
  const structured = { resultType: 'complete' as const, ...result };
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(structured, null, 2) }],
    structuredContent: structured as Record<string, unknown>,
  };
}

// The number the release carries. 4.7 bumps all eight version values together;
// until then this one must stay equal to the packages, or the pin below fails.
export const VDD_VERSION = '2.0.0';

export async function createVddMcpServer(): Promise<McpServer> {
  // `prompts` is declared and empty on purpose: 2.0.0 ships no prompts, and a
  // client asking must be told "none" rather than "method not found", which is
  // what the SDK answers when the capability is absent.
  const server = new McpServer(
    { name: 'vdd', title: 'Vision Driven Design', version: VDD_VERSION },
    { capabilities: { prompts: {} } },
  );

  server.registerTool(
    'vdd_check',
    {
      title: 'Check one VDD artifact',
      description:
        'Judge one VDD artifact against the coverage invariants: A every parent has a child, B every child names a known parent, C every parent has a dedicated child. Pass the artifact text and, for any phase with a parent, the parent artifact. Returns PASS or FAIL with one reason per failure and the coverage matrix. The procedure for writing the artifact is the skill of the same phase — see skill://vdd-<phase>/SKILL.md.',
      inputSchema: {
        phase: z.enum(CHECK_PHASES).describe('Phase of the artifact you are submitting'),
        content: z.string().describe('The whole artifact text'),
        declaredCounts,
        priorArtifacts,
      },
      outputSchema: checkResult,
      annotations,
    },
    async ({ phase, content, declaredCounts: counts, priorArtifacts: prior }) =>
      text(runPhaseCheck(phase, content, counts, prior)),
  );

  server.registerTool(
    'vdd_chain_validate',
    {
      title: 'Validate a whole VDD chain',
      description:
        'Judge every artifact of a chain at once and add the cross-phase check: every vision goal must reach a task. Returns the same shape as vdd_check plus a per-phase breakdown. Use it at the end of a cycle, or whenever a change touches more than one artifact.',
      inputSchema: {
        artifacts: z
          .record(z.string(), z.string())
          .describe('Phase name → artifact text: vision, strategy, tactics, specs, plan, tasks'),
        declaredCounts,
      },
      outputSchema: checkResult.extend({
        phases: z.array(z.object({ phase: z.string(), status: z.enum(['PASS', 'FAIL']), reasons: z.array(z.string()) })),
      }),
      annotations,
    },
    async ({ artifacts, declaredCounts: counts }) => text(runChainCheck(artifacts, counts)),
  );

  server.registerTool(
    'vdd_amend',
    {
      title: 'Analyse an amendment',
      description:
        'Judge the amended artifact, then list the downstream artifacts that still reference an id it no longer declares. The phase is inferred from the artifact itself. Use it before editing a vision, strategy, tactics, spec, plan or tasks file that other artifacts already depend on.',
      inputSchema: {
        content: z.string().describe('The amended artifact text'),
        priorArtifacts: z
          .record(z.string(), z.string())
          .describe('Phase name → the text that phase had before the change, including the amended phase itself'),
        declaredCounts,
        changeDescription: z.string().optional().describe('What changed, for the human reading the impact list'),
      },
      outputSchema: checkResult.extend({
        changeDescription: z.string().nullable(),
        phase: z.string().nullable(),
        impactedArtifacts: z.array(z.object({ phase: z.string(), reason: z.string() })),
      }),
      annotations,
    },
    async ({ content, priorArtifacts: prior, declaredCounts: counts, changeDescription }) =>
      text(runAmend(content, counts, prior, changeDescription)),
  );

  // The skills are served as resources through SEP-2640's extension; attaching it
  // is what makes `skills/list`, `skills/get` and the `skill://` resources exist
  // on both surfaces. It must run before the server connects.
  (await loadSkillCatalog()).attach(server);

  return server;
}

export async function startStdioServer(): Promise<void> {
  const server = await createVddMcpServer();
  await server.connect(new StdioServerTransport());
}
