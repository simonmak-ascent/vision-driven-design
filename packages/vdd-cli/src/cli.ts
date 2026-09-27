#!/usr/bin/env node
import { Command } from 'commander';
import { PHASES, type VddContext, type VddPhaseInput } from '@simonmak-ascent/engine';

const program = new Command();
program.name('vdd').description('Vision Driven Design CLI').version('1.7.1');

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
program.option('-c, --clone <domain>', 'Clone a website from a domain (https/http/www/bare)');

async function runClone(domain: string, availableTools: string[]): Promise<void> {
  const ctx: VddContext = { projectRoot: process.cwd(), mode: 'auto' };
  const input: VddPhaseInput = { json: jsonMode, availableTools, capabilities: availableTools, description: domain };
  const result = await PHASES['clone'](input, ctx);
  console.log(jsonMode ? JSON.stringify(result) : result.success ? `✓ ${result.artifact || 'Done'}` : `✗ ${result.error}`);
}

for (const [name, { desc, args }] of Object.entries(PHASE_DESC)) {
  const cmd = program.command(name).description(desc);
  if (name === 'e2e') {
    // `-clone` is a global option inherited by `e2e`; make the positional
    // statement optional so `vdd e2e -clone <domain>` routes to clone.
    cmd.argument('[statement]', 'statement for e2e (optional when -clone is set)');
  } else {
    for (const arg of args) cmd.argument(`<${arg}>`, `${arg} for ${name}`);
  }
  cmd.action(async (...argValues: string[]) => {
    const opts = program.opts<{ tool?: string[]; clone?: string }>();
    const availableTools = opts.tool ?? [];
    if (name === 'e2e' && opts.clone) { await runClone(opts.clone, availableTools); return; }
    const ctx: VddContext = { projectRoot: process.cwd(), mode: 'auto' };
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

// Bare `vdd -clone <domain>` (no subcommand) — clone a target website.
program.action(async () => {
  const opts = program.opts<{ tool?: string[]; clone?: string; json?: boolean }>();
  if (!opts.clone) { program.outputHelp(); return; }
  jsonMode = opts.json ?? jsonMode;
  await runClone(opts.clone, opts.tool ?? []);
});

// commander only accepts short (`-c`) or long (`--clone`) flags — the
// single-dash multi-char `-clone` is not a valid flag and is silently dropped.
// Normalize it so the documented `vdd -clone <domain>` form works.
process.argv = process.argv.map((a) => (a === '-clone' ? '--clone' : a));

program.parse();
