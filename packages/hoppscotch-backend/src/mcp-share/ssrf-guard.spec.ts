import {
  assertUrlAllowed,
  assertHostAllowed,
  assertScheme,
  isBlockedAddress,
  SSRFBlockedError,
} from './ssrf-guard';

jest.mock('node:dns/promises', () => ({
  lookup: jest.fn(),
}));

import { lookup } from 'node:dns/promises';

const mockedLookup = lookup as jest.MockedFunction<typeof lookup>;

function lookupReturning(...addresses: string[]) {
  mockedLookup.mockResolvedValue(
    addresses.map((address) => ({ address, family: address.includes(':') ? 6 : 4 })) as any,
  );
}

async function expectBlocked(url: string): Promise<SSRFBlockedError> {
  let caught: unknown;
  try {
    await assertUrlAllowed(url);
  } catch (err) {
    caught = err;
  }
  expect(caught).toBeInstanceOf(SSRFBlockedError);
  return caught as SSRFBlockedError;
}

describe('ssrf-guard / isBlockedAddress (literal IP classifier)', () => {
  it('returns false for non-IP input', () => {
    expect(isBlockedAddress('example.com')).toBe(false);
    expect(isBlockedAddress('')).toBe(false);
    expect(isBlockedAddress('not-an-ip')).toBe(false);
  });

  describe('IPv4 ranges', () => {
    const blockedV4 = [
      ['0.0.0.0', '"this network"'],
      ['0.1.2.3', '0.0.0.0/8'],
      ['10.0.0.1', '10/8 private'],
      ['10.255.255.255', '10/8 boundary'],
      ['127.0.0.1', 'loopback'],
      ['127.255.255.254', '127/8 boundary'],
      ['169.254.169.254', 'AWS/GCE/Azure metadata'],
      ['169.254.0.1', 'link-local'],
      ['172.16.0.1', '172.16/12 private lower'],
      ['172.31.255.255', '172.16/12 private upper'],
      ['192.168.1.1', '192.168/16 private'],
      ['100.64.0.1', 'CGNAT lower'],
      ['100.127.255.255', 'CGNAT upper'],
      ['198.18.0.1', 'benchmarking'],
      ['198.19.255.255', 'benchmarking upper'],
      ['224.0.0.1', 'multicast'],
      ['239.255.255.250', 'multicast'],
      ['255.255.255.255', 'broadcast'],
    ];
    it.each(blockedV4)('blocks %s (%s)', (ip) => {
      expect(isBlockedAddress(ip)).toBe(true);
    });

    const allowedV4 = ['1.1.1.1', '8.8.8.8', '172.15.0.1', '172.32.0.1', '192.167.1.1', '100.63.255.255', '100.128.0.0', '198.17.0.1', '198.20.0.1', '223.255.255.255'];
    it.each(allowedV4)('allows %s', (ip) => {
      expect(isBlockedAddress(ip)).toBe(false);
    });
  });

  describe('IPv6 ranges', () => {
    const blockedV6 = [
      ['::', 'unspecified'],
      ['::1', 'loopback'],
      ['fc00::1', 'unique-local lower'],
      ['fd00::1', 'unique-local upper'],
      ['fe80::1', 'link-local'],
      ['febf::1', 'link-local upper'],
      ['ff00::1', 'multicast'],
      ['ff02::1', 'multicast'],
      ['::ffff:127.0.0.1', 'IPv4-mapped loopback'],
      ['::ffff:10.0.0.1', 'IPv4-mapped private'],
      ['::ffff:169.254.169.254', 'IPv4-mapped metadata'],
      ['::ffff:7f00:1', 'IPv4-mapped loopback (hex form)'],
      ['::127.0.0.1', 'IPv4-compatible loopback'],
      ['2002:7f00:1::', '6to4 wrapping 127.0.0.1'],
      ['2002:0a00:1::', '6to4 wrapping 10.0.0.1'],
      ['64:ff9b::7f00:1', 'NAT64 wrapping 127.0.0.1'],
      ['64:ff9b::a00:1', 'NAT64 wrapping 10.0.0.1'],
      ['2001::ffff:ffff:0:0', 'Teredo with private server'],
    ];
    it.each(blockedV6)('blocks %s (%s)', (ip) => {
      expect(isBlockedAddress(ip)).toBe(true);
    });

    it('blocks IPv6 with zone id (zone stripped, link-local detected)', () => {
      expect(isBlockedAddress('fe80::1%eth0')).toBe(true);
    });

    const allowedV6 = ['2606:4700:4700::1111', '2001:4860:4860::8888'];
    it.each(allowedV6)('allows %s', (ip) => {
      expect(isBlockedAddress(ip)).toBe(false);
    });
  });
});

describe('ssrf-guard / assertScheme', () => {
  it('allows http', () => {
    expect(() => assertScheme('http://example.com/')).not.toThrow();
  });
  it('allows https', () => {
    expect(() => assertScheme('https://example.com/')).not.toThrow();
  });
  it.each(['file:///etc/passwd', 'ftp://example.com', 'gopher://example.com', 'data:text/plain,foo', 'javascript:alert(1)'])(
    'rejects %s',
    (url) => {
      expect(() => assertScheme(url)).toThrow(SSRFBlockedError);
    },
  );
});

describe('ssrf-guard / assertHostAllowed (sync pre-flight)', () => {
  it('allows a public hostname', () => {
    expect(() => assertHostAllowed('https://example.com/path')).not.toThrow();
  });

  it('rejects localhost literal', () => {
    expect(() => assertHostAllowed('http://localhost/foo')).toThrow(SSRFBlockedError);
  });

  it('rejects metadata.google.internal', () => {
    expect(() => assertHostAllowed('http://metadata.google.internal/computeMetadata/v1/')).toThrow(SSRFBlockedError);
  });

  it('rejects metadata.goog', () => {
    expect(() => assertHostAllowed('http://metadata.goog/')).toThrow(SSRFBlockedError);
  });

  it('rejects literal loopback IPv4', () => {
    expect(() => assertHostAllowed('http://127.0.0.1:9119/')).toThrow(SSRFBlockedError);
  });

  it('rejects literal loopback IPv6 with brackets', () => {
    expect(() => assertHostAllowed('http://[::1]/')).toThrow(SSRFBlockedError);
  });

  it('rejects URL with embedded userinfo (username)', () => {
    expect(() => assertHostAllowed('https://attacker@example.com/')).toThrow(SSRFBlockedError);
  });

  it('rejects URL with embedded userinfo (user + pass)', () => {
    expect(() => assertHostAllowed('https://u:p@example.com/')).toThrow(SSRFBlockedError);
  });
});

describe('ssrf-guard / assertUrlAllowed (DNS-aware async)', () => {
  beforeEach(() => {
    mockedLookup.mockReset();
  });

  it('passes a public URL that resolves to public addresses', async () => {
    lookupReturning('93.184.216.34');
    await expect(assertUrlAllowed('https://example.com/')).resolves.toBeUndefined();
  });

  it('blocks when DNS resolves to loopback', async () => {
    lookupReturning('127.0.0.1');
    const err = await expectBlocked('https://attacker-controlled.example/');
    expect(err.message).toContain('attacker-controlled.example');
    expect(err.message).toContain('127.0.0.1');
  });

  it('blocks when ANY resolved address is private (mixed A records)', async () => {
    lookupReturning('1.1.1.1', '10.0.0.5');
    const err = await expectBlocked('https://mixed.example/');
    expect(err.message).toContain('10.0.0.5');
  });

  it('blocks when DNS resolves to an IPv6 loopback', async () => {
    lookupReturning('::1');
    await expectBlocked('https://v6loop.example/');
  });

  it('blocks when DNS resolves to IPv4-mapped IPv6 loopback', async () => {
    lookupReturning('::ffff:127.0.0.1');
    await expectBlocked('https://mapped.example/');
  });

  it('blocks when DNS resolves to CGNAT', async () => {
    lookupReturning('100.64.0.1');
    await expectBlocked('https://cgnat.example/');
  });

  it('blocks when DNS resolution fails (fail-closed)', async () => {
    mockedLookup.mockRejectedValue(Object.assign(new Error('ENOTFOUND'), { code: 'ENOTFOUND' }));
    const err = await expectBlocked('https://nx.example/');
    expect(err.message).toContain('nx.example');
  });

  it('blocks malformed URL without invoking DNS', async () => {
    await expectBlocked('not a url at all');
    expect(mockedLookup).not.toHaveBeenCalled();
  });

  it('blocks non-http(s) scheme without invoking DNS', async () => {
    await expectBlocked('file:///etc/passwd');
    expect(mockedLookup).not.toHaveBeenCalled();
  });

  it('blocks localhost literal without invoking DNS', async () => {
    await expectBlocked('http://localhost/');
    expect(mockedLookup).not.toHaveBeenCalled();
  });

  it('blocks literal private IPv4 without invoking DNS', async () => {
    await expectBlocked('http://10.0.0.1/');
    expect(mockedLookup).not.toHaveBeenCalled();
  });

  it('blocks literal IPv6 loopback without invoking DNS', async () => {
    await expectBlocked('http://[::1]/');
    expect(mockedLookup).not.toHaveBeenCalled();
  });

  it('blocks URL with userinfo even when host is otherwise public', async () => {
    await expectBlocked('https://attacker@public.example/');
    // userinfo check happens before DNS lookup
    expect(mockedLookup).not.toHaveBeenCalled();
  });

  it('blocks AWS metadata IP literal', async () => {
    await expectBlocked('http://169.254.169.254/latest/meta-data/');
    expect(mockedLookup).not.toHaveBeenCalled();
  });

  it('blocks GCE metadata FQDN', async () => {
    await expectBlocked('http://metadata.google.internal/computeMetadata/v1/');
    expect(mockedLookup).not.toHaveBeenCalled();
  });

  it('blocks decimal-encoded IPv4 loopback via DNS resolution', async () => {
    // 2130706433 === 0x7f000001 === 127.0.0.1
    // net.isIP() rejects this form, so we fall through to DNS; Node's resolver
    // canonicalises it to 127.0.0.1 (or fails — either path stays fail-closed).
    lookupReturning('127.0.0.1');
    await expectBlocked('http://2130706433/');
  });

  it('blocks hex-encoded IPv4 loopback via DNS resolution', async () => {
    lookupReturning('127.0.0.1');
    await expectBlocked('http://0x7f000001/');
  });

  it('blocks bracketed IPv4-mapped IPv6 loopback without DNS', async () => {
    // Bracketed v6 form is a literal — short-circuits before DNS.
    await expectBlocked('http://[::ffff:127.0.0.1]/');
    expect(mockedLookup).not.toHaveBeenCalled();
  });

  it('handles trailing-dot FQDN consistently (canonicalised before lookup)', async () => {
    // example.com. === example.com per DNS spec; the guard must not let the
    // trailing dot route around the canonicalisation that drives the lookup.
    lookupReturning('127.0.0.1');
    await expectBlocked('https://attacker.example./');
  });

  it('treats uppercase scheme as http(s) and applies the same guard', async () => {
    // URL parser lowercases scheme; this just pins the contract.
    lookupReturning('10.0.0.1');
    await expectBlocked('HTTPS://internal.example/');
  });
});
