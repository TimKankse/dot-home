import { isIP } from 'node:net';

const parseIpv4 = (address: string): number[] | null => {
  if (isIP(address) !== 4) return null;
  return address.split('.').map(Number);
};

const isNonPublicIpv4 = (address: string): boolean => {
  const octets = parseIpv4(address);
  if (!octets) return false;

  const [a, b] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 2) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51) ||
    (a === 203 && b === 0) ||
    a >= 224
  );
};

const expandIpv6 = (address: string): number[] | null => {
  const withoutZone = address.toLowerCase().split('%')[0];
  if (isIP(withoutZone) !== 6) return null;

  let normalized = withoutZone;
  const ipv4Suffix = normalized.match(/(?:^|:)(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (ipv4Suffix) {
    const octets = parseIpv4(ipv4Suffix);
    if (!octets) return null;
    const high = ((octets[0] << 8) | octets[1]).toString(16);
    const low = ((octets[2] << 8) | octets[3]).toString(16);
    normalized = normalized.slice(0, -ipv4Suffix.length) + `${high}:${low}`;
  }

  const halves = normalized.split('::');
  if (halves.length > 2) return null;

  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves[1] ? halves[1].split(':') : [];
  const omitted = 8 - left.length - right.length;
  const groups = halves.length === 2
    ? [...left, ...Array(Math.max(0, omitted)).fill('0'), ...right]
    : left;

  if (groups.length !== 8) return null;
  return groups.map((group) => Number.parseInt(group || '0', 16));
};

export const isNonPublicIpAddress = (address: string): boolean => {
  if (isIP(address) === 4) return isNonPublicIpv4(address);

  const groups = expandIpv6(address);
  if (!groups) return true;

  const [first, second, third, fourth, fifth, sixth] = groups;
  const isUnspecified = groups.every((group) => group === 0);
  const isLoopback = groups.slice(0, 7).every((group) => group === 0) && groups[7] === 1;
  const isIpv4Mapped = first === 0 && second === 0 && third === 0 && fourth === 0 && fifth === 0 && sixth === 0xffff;

  if (isIpv4Mapped) {
    const mapped = `${groups[6] >> 8}.${groups[6] & 255}.${groups[7] >> 8}.${groups[7] & 255}`;
    return isNonPublicIpv4(mapped);
  }

  return (
    isUnspecified ||
    isLoopback ||
    (first & 0xfe00) === 0xfc00 ||
    (first & 0xffc0) === 0xfe80 ||
    (first & 0xff00) === 0xff00 ||
    (first === 0x2001 && second === 0x0db8) ||
    first < 0x2000 ||
    first > 0x3fff
  );
};
