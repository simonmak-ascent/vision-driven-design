import { SKILLS } from './generated/skills.js';
import type { SkillManifestEntry } from './generated/skills.js';

export type { SkillManifestEntry } from './generated/skills.js';

/** What `skills/list` returns per skill: no body, so a host can pick before reading. */
export interface SkillSummary {
  readonly name: string;
  readonly description: string;
  readonly uri: string;
  readonly sha256: string;
  readonly size: number;
}

/**
 * The catalogue, compiled in by `scripts/gen-skill-manifest.mjs`. There is no
 * runtime filesystem read on either surface: the hosted function declares no
 * `includeFiles`, so a skill it could not import is a skill it could not serve.
 */
export function listSkills(): SkillSummary[] {
  return SKILLS.map(({ name, description, uri, sha256, size }) => ({ name, description, uri, sha256, size }));
}

/** One skill's frontmatter and body, or `null` for a name the catalogue does not hold. */
export function getSkill(name: string): SkillManifestEntry | null {
  return SKILLS.find((skill) => skill.name === name) ?? null;
}
