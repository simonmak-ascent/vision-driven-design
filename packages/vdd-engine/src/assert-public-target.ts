import { lookup as dnsLookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export interface LookupAddress {
  address: string;
  family: number;
}

export type Lookup = (
  host: string,
  options: { all: true },
) => Promise<LookupAddress[]>;

export interface TargetCheck {
  ok: boolean;
  reason?: string;
  /**
   * Resolved addresses, returned for optional pinning. The crawl path re-resolves at fetch time,
   * so DNS rebinding is a recorded residual (`docs/plan.md` A3) — not a property this returns.
   */
  addresses?: string[];
}

const BLOCKED_SUFFIXES = ['.localhost', '.local', '.internal'];

function normalizeHost(host: string): string {
  return host
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '');
}

function isBlockedHostname(host: string): boolean {
  if (host === '') return true;
  if (host === 'localhost') return true;
  return BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

function ipv4Octets(ip: string): number[] | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  const octets = parts.map((p) => Number(p));
  if (octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return octets;
}

/** RFC 1918, loopback, link-local, CGNAT, metadata, documentation, multicast, reserved. */
function isPrivateIPv4(ip: string): boolean {
  const o = ipv4Octets(ip);
  if (!o) return true; // an unparseable address is refused, not allowed
  const [a, b, c] = o;
  return (
    a === 0 || // 0.0.0.0/8
    a === 10 || // 10.0.0.0/8
    (a === 100 && b >= 64 && b <= 127) || // 100.64.0.0/10 (CGNAT)
    a === 127 || // 127.0.0.0/8
    (a === 169 && b === 254) || // 169.254.0.0/16 (link-local, metadata)
    (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
    (a === 192 && b === 168) || // 192.168.0.0/16
    (a === 192 && b === 0 && c === 0) || // 192.0.0.0/24
    (a === 198 && (b === 18 || b === 19)) || // 198.18.0.0/15
    (a === 192 && b === 0 && c === 2) || // 192.0.2.0/24 (documentation)
    (a === 198 && b === 51 && c === 100) || // 198.51.100.0/24
    (a === 203 && b === 0 && c === 113) || // 203.0.113.0/24
    a >= 224 // 224.0.0.0/4 multicast, 240.0.0.0/4 reserved
  );
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  // IPv4-mapped (::ffff:127.0.0.1) and IPv4-compatible forms.
  const mapped = lower.match(/^::(?:ffff:)?(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  // The same addresses as the WHATWG URL parser serialises them (`::ffff:7f00:1`), which is what
  // `new URL('http://[::ffff:127.0.0.1]/').hostname` yields — the dotted form above misses it.
  const mappedHex = lower.match(/^::(?:ffff:)?([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedHex) {
    const hi = parseInt(mappedHex[1], 16);
    const lo = parseInt(mappedHex[2], 16);
    return isPrivateIPv4(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
  }

  if (lower === '::' || lower === '::1') return true; // unspecified, loopback
  // Unique local fc00::/7
  if (/^f[cd][0-9a-f]{2}:/.test(lower)) return true;
  // Link-local fe80::/10
  if (/^fe[89ab][0-9a-f]:/.test(lower)) return true;
  // Multicast ff00::/8
  if (/^ff[0-9a-f]{2}:/.test(lower)) return true;
  return false;
}

export function isPrivateAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return isPrivateIPv4(ip);
  if (family === 6) return isPrivateIPv6(ip);
  return true; // not an IP: refuse
}

/**
 * Refuse a caller-supplied host that is, or resolves to, anything but a public address.
 * Every DNS answer is checked — one private answer is enough to refuse — and the accepted
 * addresses are returned so the caller can pin them against a later rebind.
 */
export async function assertPublicTarget(
  host: string,
  lookup: Lookup = dnsLookup as unknown as Lookup,
): Promise<TargetCheck> {
  const name = normalizeHost(host);

  if (isBlockedHostname(name)) {
    return { ok: false, reason: `refused: ${JSON.stringify(host)} is a local or internal name` };
  }

  if (isIP(name) !== 0) {
    return isPrivateAddress(name)
      ? { ok: false, reason: `refused: ${name} is not a public address` }
      : { ok: true, addresses: [name] };
  }

  let answers: LookupAddress[];
  try {
    answers = await lookup(name, { all: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: `refused: DNS resolution failed for ${name} (${message})` };
  }

  if (!Array.isArray(answers) || answers.length === 0) {
    return { ok: false, reason: `refused: ${name} resolved to no addresses` };
  }

  const privateAnswer = answers.find((a) => isPrivateAddress(a.address));
  if (privateAnswer) {
    return {
      ok: false,
      reason: `refused: ${name} resolves to a non-public address (${privateAnswer.address})`,
    };
  }

  return { ok: true, addresses: answers.map((a) => a.address) };
}
