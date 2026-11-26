#!/usr/bin/env node
import { Command } from 'commander';
import { PHASES, isProjectRootAllowed, projectRootError, type VddContext, type VddPhaseInput } from '@simonmak-ascent/engine';

const program = new Command();
program.name('vdd').description('Vision Driven Design CLI').version('1.10.1');

const PHASE_DESC: Record<string, { desc: string; args: string[] }> = {
  init:        { desc: 'Generate constitution.md', args: [] },
  vision:      { desc: 'Expand freeform vision → vision.md', args: ['statement'] },
  strategize:  { desc: 'Research and synthesize strategy.md', args: [] },
  tactics:     { desc: 'Audit repo → tactics.md', args: [] },
  specify:     { desc: 'Generate spec.md', args: ['idOrDesc'] },
  clarify:     { desc: 'Clarify ambiguities', args: ['feature'] },
  plan:        { desc: 'Generate plan.md + contracts/', args: ['feature'] },
  tasks:       { desc: 'Generate tasks.md', args: ['feature'] },
  'get-next-task': { desc: 'Next uncompleted task', args: ['feature'] },
  implement:   { desc: 'Execute a task', args: ['taskId'] },
  validate:    { desc: 'Full-chain traceability report', args: [] },
  trace:       { desc: 'Bidirectional traceability matrix', args: [] },
  analyze:     { desc: 'Cross-artifact analysis', args: ['feature'] },
  amend:       { desc: 'Cascade change through chain', args: ['description'] },
  e2e:         { desc: 'End-to-end: vision → validate in one command', args: ['statement'] },
  'detect-environment': { desc: 'Report per-phase tool/MCP requirements', args: [] },
};

let jsonMode = false;
program.option('--json', 'JSON output').hook('preAction', (cmd) => { jsonMode = cmd.opts().json; });

function collect(v: string, prev: string[]): string[] { return prev.concat([v]); }
program.option('--tool <name>', 'Available MCP/tool name (repeatable)', collect, [] as string[]);

for (const [name, { desc, args }] of Object.entries(PHASE_DESC)) {
  const cmd = program.command(name).description(desc);
  for (const arg of args) cmd.argument(`<${arg}>`, `${arg} for ${name}`);
  cmd.action(async (...argValues: string[]) => {
    const opts = program.opts<{ tool?: string[] }>();
    const availableTools = opts.tool ?? [];
    const ctx: VddContext = { projectRoot: process.cwd(), mode: 'auto' };
    if (!isProjectRootAllowed(ctx.projectRoot)) {
      console.error(projectRootError(ctx.projectRoot));
      process.exitCode = 1;
      return;
    }
    const input: VddPhaseInput = { json: jsonMode, availableTools, capabilities: availableTools };
    if (args[0] === 'statement') input.statement = argValues[0];
    else if (args[0] === 'idOrDesc') { input.description = argValues[0]; input.actionItemId = argValues[0]; }
    else if (args[0] === 'feature') input.feature = argValues[0];
    else if (args[0] === 'taskId') input.taskId = argValues[0];
    else if (args[0] === 'description') input.description = argValues[0];
    const result = await PHASES[name](input, ctx);
    console.log(jsonMode ? JSON.stringify(result) : result.success ? `✓ ${result.artifact || 'Done'}` : `✗ ${result.error}`);
  });
}

program.parse();
