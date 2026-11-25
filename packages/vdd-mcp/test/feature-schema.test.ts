import { describe, expect, it } from 'vitest';

import { isValidFeatureName } from '../../vdd-engine/src/engine.js';
import { FEATURE_PATTERN, PHASE_INPUT_SCHEMAS } from '../src/server.js';

const SAMPLES = [
  'alpha',
  'user-auth',
  'a',
  'a.b_c-9',
  'A-001',
  'x'.repeat(64),
  '',
  '..',
  '.',
  '../../other',
  'a/b',
  'a\\b',
  'A B',
  '-leading',
  '.hidden',
  'x'.repeat(65),
];

describe('feature schema agrees with the engine validator', () => {
  const schema = PHASE_INPUT_SCHEMAS.clarify.feature;

  it('uses the same pattern as the engine', () => {
    expect(FEATURE_PATTERN.source).toBe('^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$');
  });

  it.each(SAMPLES)('accepts %j only when the engine does', (name) => {
    const schemaAccepts = schema.safeParse(name).success;
    expect(schemaAccepts).toBe(isValidFeatureName(name));
  });
});
