import { describe, expect, it } from 'vitest';

import { assertPublicTarget, type Lookup } from '../src/assert-public-target.js';

const lookupTo = (...addresses: string[]): Lookup => async () =>
  addresses.map((address) => ({ address, family: address.includes(':') ? 6 : 4 }));

const lookupFails: Lookup = async () => {
  throw new Error('ENOTFOUND');
};

/**
 * The clone path is the only feature that makes outbound requests to a caller-supplied host.
 * These cases pin the SSRF gate: a hostname or a DNS answer that lands on loopback, a private
 * range, link-local metadata or an IPv6 equivalent must be refused, and the accepted addresses
 * are returned so the caller can pin them against rebinding.
 */
describe('assertPublicTarget', () => {
  const blockedHostnames = [
    'localhost',
    'foo.localhost',
    'service.local',
    'svc.internal',
    '',
  ];

  const blockedAddresses = [
    '0.0.0.0',
    '10.0.0.1',
    '100.64.0.1',
    '100.100.100.200', // Alibaba Cloud metadata
    '127.0.0.1',
    '169.254.169.254',
    '172.16.0.1',
    '192.0.0.1',
    '192.168.1.1',
    '198.18.0.1',
    '224.0.0.1',
    '240.0.0.1',
    '::1',
    '::ffff:127.0.0.1',
    '::ffff:7f00:1',
    '::ffff:a9fe:a9fe',
    'fe80::1',
    'fc00::1',
    '::ffff:127.0.0.1',
  ];

  it.each(blockedHostnames)('rejects the hostname %j', async (host) => {
    const result = await assertPublicTarget(host, lookupTo('93.184.216.34'));
    expect(result.ok).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  it.each(blockedAddresses)('rejects the literal address %s', async (ip) => {
    const result = await assertPublicTarget(ip, lookupTo('93.184.216.34'));
    expect(result.ok).toBe(false);
  });

  it('rejects a public name that resolves to a private address (rebinding)', async () => {
    const result = await assertPublicTarget('rebind.example', lookupTo('127.0.0.1'));
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('127.0.0.1');
  });

  it('rejects when any one DNS answer is private', async () => {
    const result = await assertPublicTarget('mixed.example', lookupTo('93.184.216.34', '10.0.0.7'));
    expect(result.ok).toBe(false);
  });

  it('rejects when DNS cannot resolve the name', async () => {
    const result = await assertPublicTarget('nope.example', lookupFails);
    expect(result.ok).toBe(false);
  });

  it('accepts a public literal and returns it', async () => {
    const result = await assertPublicTarget('8.8.8.8', lookupTo('93.184.216.34'));
    expect(result.ok).toBe(true);
    expect(result.addresses).toEqual(['8.8.8.8']);
  });

  it('accepts a public name and returns its addresses', async () => {
    const result = await assertPublicTarget('example.com', lookupTo('93.184.216.34'));
    expect(result.ok).toBe(true);
    expect(result.addresses).toEqual(['93.184.216.34']);
  });

  it('accepts a public IPv6 literal', async () => {
    const result = await assertPublicTarget('2001:4860:4860::8888', lookupTo('93.184.216.34'));
    expect(result.ok).toBe(true);
  });
});
