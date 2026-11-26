import { SkillCatalog, memorySkillFiles } from '@modelcontextprotocol/server/ext/skills';

import { SKILLS } from './generated/skills.js';
import type { SkillManifestEntry } from './generated/skills.js';

export type { SkillManifestEntry } from './generated/skills.js';

/** What `skills/list` returns per skill: no text, so a host can choose before reading. */
export interface SkillSummary {
  readonly name: string;
  readonly description: string;
  readonly uri: string;
  readonly sha256: string;
  readonly size: number;
}

/**
 * The catalogue, compiled in by `scripts/gen-skill-manifest.mjs`. There is no
 * runtime filesystem read on either surface: `vercel.json` includes the built
 * `dist/` trees but not `skills/`, so a skill the manifest does not carry is a
 * skill the hosted function could not serve.
 */
export function listSkills(): SkillSummary[] {
  return SKILLS.map(({ name, description, uri, sha256, size }) => ({ name, description, uri, sha256, size }));
}

/** One skill's manifest entry, or `null` for a name the catalogue does not hold. */
export function getSkill(name: string): SkillManifestEntry | null {
  return SKILLS.find((skill) => skill.name === name) ?? null;
}

let catalog: Promise<SkillCatalog> | null = null;

/**
 * The skills extension, built once from the manifest. `SkillCatalog.load` is
 * async, so the server factory that attaches it is async too — `createMcpHandler`
 * and `serveStdio` both accept an async factory.
 */
export function loadSkillCatalog(): Promise<SkillCatalog> {
  catalog ??= SkillCatalog.load(
    memorySkillFiles(Object.fromEntries(SKILLS.map((skill) => [`${skill.name}/SKILL.md`, skill.text]))),
  );
  return catalog;
}
