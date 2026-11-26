#!/usr/bin/env node
import { Command } from 'commander';
import { readFile } from 'node:fs/promises';

import { CHECK_PHASES, runAmend, runChainCheck, runPhaseCheck, type CheckPhase } from '@simonmak-ascent/engine';

// Three subcommands, because there are three tools. Each prints the JSON result
// the tool returns — the CLI adds no judgement of its own.

const program = new Command();
program.name('vdd').description('Vision Driven Design — judge a chain, do not generate one').version('1.10.1');

async function readArtifact(path: string): Promise<string> {
  return readFile(path, 'utf8');
}

program
  .command('check')
  .description('Judge one artifact: vdd_check')
  .argument('<phase>', 'constitution | vision | strategy | tactics | specs | plan | tasks | validate')
  .argument('<file>', 'the artifact text')
  .option('--prior <phase=file...>', 'parent artifact, e.g. --prior strategy=vdd/strategy.md')
  .option('--counts <json>', 'declaredCounts, as JSON')
  .action(async (phase: string, file: string, opts: { prior?: string[]; counts?: string }) => {
    // Validated here rather than cast: a wrong phase would otherwise reach the
    // engine's phase table and throw a TypeError instead of a usage error.
    if (!(CHECK_PHASES as readonly string[]).includes(phase)) {
      program.error(`unknown phase "${phase}" — expected one of ${CHECK_PHASES.join(', ')}`, { exitCode: 2 });
    }
    const priorArtifacts: Record<string, string> = {};
    for (const pair of opts.prior ?? []) {
      const [name, path] = pair.split('=');
      priorArtifacts[name] = await readArtifact(path);
    }
    const result = runPhaseCheck(
      phase as CheckPhase,
      await readArtifact(file),
      opts.counts ? JSON.parse(opts.counts) : undefined,
      priorArtifacts,
    );
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = result.status === 'PASS' ? 0 : 1;
  });

program
  .command('chain')
  .description('Judge a whole chain: vdd_chain_validate')
  .argument('<vision>', 'vision artifact')
  .argument('<strategy>', 'strategy artifact')
  .argument('<tactics>', 'tactics artifact')
  .argument('<specs>', 'spec or specs artifact')
  .argument('<plan>', 'plan artifact')
  .argument('<tasks>', 'tasks artifact')
  .option('--counts <json>', 'declaredCounts, as JSON')
  .action(async (vision: string, strategy: string, tactics: string, specs: string, plan: string, tasks: string, opts: { counts?: string }) => {
    const artifacts: Record<string, string> = {};
    for (const [phase, path] of Object.entries({ vision, strategy, tactics, specs, plan, tasks })) {
      artifacts[phase] = await readArtifact(path);
    }
    const result = runChainCheck(artifacts, opts.counts ? JSON.parse(opts.counts) : undefined);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = result.status === 'PASS' ? 0 : 1;
  });

program
  .command('amend')
  .description('Judge an amendment and its impact: vdd_amend')
  .argument('<file>', 'the amended artifact')
  .option('--prior <phase=file...>', 'prior artifact text, including the amended phase')
  .option('--counts <json>', 'declaredCounts, as JSON')
  .action(async (file: string, opts: { prior?: string[]; counts?: string }) => {
    const priorArtifacts: Record<string, string> = {};
    for (const pair of opts.prior ?? []) {
      const [name, path] = pair.split('=');
      priorArtifacts[name] = await readArtifact(path);
    }
    const result = runAmend(await readArtifact(file), opts.counts ? JSON.parse(opts.counts) : undefined, priorArtifacts);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = result.status === 'PASS' ? 0 : 1;
  });

program.parseAsync(process.argv);
