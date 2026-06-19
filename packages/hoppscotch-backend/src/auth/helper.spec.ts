import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { mockDeep } from 'jest-mock-extended';
import {
  authCookieHandler,
  isAllowedRedirect,
  normalizeWhitelistedOrigins,
} from './helper';
import { AuthTokens } from 'src/types/AuthTokens';

const tokens: AuthTokens = {
  access_token: 'access-token-value',
  refresh_token: 'refresh-token-value',
};

const makeRes = () => {
  const res = mockDeep<Response>();
  res.status.mockReturnValue(res as unknown as Response);
  return res;
};

const makeConfig = (overrides: Record<string, string | undefined> = {}) => {
  const defaults: Record<string, string | undefined> = {
    'INFRA.ACCESS_TOKEN_VALIDITY': '86400000',
    'INFRA.REFRESH_TOKEN_VALIDITY': '604800000',
    'INFRA.ALLOW_SECURE_COOKIES': 'false',
    WHITELISTED_ORIGINS:
      'http://localhost:3170,app://hoppscotch,https://app.hoppscotch.io',
    VITE_BASE_URL: 'http://localhost:3000',
    ...overrides,
  };
  const config = mockDeep<ConfigService>();
  config.get.mockImplementation(((key: string) => defaults[key]) as any);
  return config;
};

describe('normalizeWhitelistedOrigins', () => {
  it('returns [] for undefined / empty / all-whitespace input', () => {
    expect(normalizeWhitelistedOrigins(undefined)).toEqual([]);
    expect(normalizeWhitelistedOrigins('')).toEqual([]);
    expect(normalizeWhitelistedOrigins(' , , ')).toEqual([]);
  });

  it('trims entries and drops empties', () => {
    expect(
      normalizeWhitelistedOrigins(
        ' http://localhost:3170 , , https://app.hoppscotch.io ',
      ),
    ).toEqual(['http://localhost:3170', 'https://app.hoppscotch.io']);
  });

  it('strips explicit default ports (http :80, https :443)', () => {
    expect(
      normalizeWhitelistedOrigins('http://localhost:80,https://app.example:443'),
    ).toEqual(['http://localhost', 'https://app.example']);
  });

  it('strips trailing slash on http(s) origins', () => {
    expect(
      normalizeWhitelistedOrigins('https://app.hoppscotch.io/'),
    ).toEqual(['https://app.hoppscotch.io']);
  });

  it('lowercases scheme and host on http(s) origins', () => {
    expect(
      normalizeWhitelistedOrigins('HTTPS://APP.HOPPSCOTCH.IO'),
    ).toEqual(['https://app.hoppscotch.io']);
  });

  it('keeps non-special schemes with authority verbatim (URL#origin is "null")', () => {
    // `new URL("app://hoppscotch").origin === "null"` per WHATWG. The exact
    // string is preserved so the exact-match branch in isAllowedRedirect
    // can still pin desktop auth.
    expect(normalizeWhitelistedOrigins('app://hoppscotch')).toEqual([
      'app://hoppscotch',
    ]);
  });

  it('drops malformed and pseudo-URL entries (operator config cannot smuggle them into the whitelist)', () => {
    // Protocol-relative / relative paths / scheme-less authority — all parse
    // failures or shapes that must NOT exact-match a forged redirect.
    expect(normalizeWhitelistedOrigins('//app.example')).toEqual([]);
    expect(normalizeWhitelistedOrigins('/relative')).toEqual([]);
    expect(normalizeWhitelistedOrigins('not a url')).toEqual([]);
    expect(normalizeWhitelistedOrigins('localhost:3000')).toEqual([]);
    // Non-special schemes without an authority (`javascript:`, `data:`, etc.)
    // must be dropped even though they parse successfully — exact-string
    // matching them in a forged redirect would be catastrophic.
    expect(normalizeWhitelistedOrigins('javascript:alert(1)')).toEqual([]);
    expect(normalizeWhitelistedOrigins('data:text/plain;base64,Zm9v')).toEqual(
      [],
    );
    // Valid entries alongside malformed ones still come through.
    expect(
      normalizeWhitelistedOrigins('not a url,http://localhost:3170'),
    ).toEqual(['http://localhost:3170']);
  });
});

describe('isAllowedRedirect', () => {
  const wl = [
    'http://localhost:3170',
    'app://hoppscotch',
    'https://app.hoppscotch.io',
  ];

  it('allows exact-string match (legacy callback origins)', () => {
    expect(isAllowedRedirect('http://localhost:3170', wl)).toBe(true);
    expect(isAllowedRedirect('https://app.hoppscotch.io', wl)).toBe(true);
  });

  it('allows app:// exact match (desktop auth — opaque origin)', () => {
    expect(isAllowedRedirect('app://hoppscotch', wl)).toBe(true);
  });

  it('allows device-login round-trip with inner redirect_uri query', () => {
    expect(
      isAllowedRedirect(
        'http://localhost:3170/device-login?redirect_uri=http://localhost:5555/cb/abc',
        wl,
      ),
    ).toBe(true);
  });

  it('allows /device-login/ with a single trailing slash (S2)', () => {
    expect(
      isAllowedRedirect(
        'http://localhost:3170/device-login/?redirect_uri=x',
        wl,
      ),
    ).toBe(true);
  });

  it('rejects /device-login// with multiple trailing slashes (no legitimate FE link produces this)', () => {
    expect(
      isAllowedRedirect('http://localhost:3170/device-login//?x=1', wl),
    ).toBe(false);
  });

  it('rejects device-login on non-whitelisted origin', () => {
    expect(
      isAllowedRedirect('https://evil.com/device-login?redirect_uri=x', wl),
    ).toBe(false);
  });

  it('rejects /device-login prefix-bypass shapes (S3.a)', () => {
    // None of these are exact pathname === '/device-login' after stripping one
    // trailing slash. Each guards against a specific refactor risk.
    expect(isAllowedRedirect('http://localhost:3170/device-loginx', wl)).toBe(false);
    expect(isAllowedRedirect('http://localhost:3170/device-login/evil', wl)).toBe(false);
    expect(isAllowedRedirect('http://localhost:3170/device-login/../admin', wl)).toBe(false);
    expect(isAllowedRedirect('http://localhost:3170/Device-Login', wl)).toBe(false);
  });

  it('rejects arbitrary path on whitelisted origin (open-redirect surface)', () => {
    expect(isAllowedRedirect('http://localhost:3170/admin', wl)).toBe(false);
    expect(isAllowedRedirect('http://localhost:3170/proxy?to=evil', wl)).toBe(false);
  });

  it('rejects scheme mismatch on otherwise-matching host (S3.b)', () => {
    // `wl` has http://localhost:3170 — https variant should not be accepted.
    expect(
      isAllowedRedirect('https://localhost:3170/device-login?x=1', wl),
    ).toBe(false);
  });

  it('rejects userinfo-bearing URLs in every shape (S3.c)', () => {
    expect(
      isAllowedRedirect('https://attacker@localhost:3170/device-login', wl),
    ).toBe(false);
    expect(
      isAllowedRedirect('https://u:p@app.hoppscotch.io/device-login', wl),
    ).toBe(false);
    expect(
      isAllowedRedirect('https://user@app.hoppscotch.io/device-login', wl),
    ).toBe(false);
    expect(
      isAllowedRedirect('https://:password@app.hoppscotch.io/device-login', wl),
    ).toBe(false);
  });

  it('rejects null and empty redirectUrl', () => {
    expect(isAllowedRedirect(null, wl)).toBe(false);
    expect(isAllowedRedirect('', wl)).toBe(false);
  });

  it('rejects malformed URLs without throwing', () => {
    expect(isAllowedRedirect('not a url', wl)).toBe(false);
    expect(isAllowedRedirect('http://', wl)).toBe(false);
    expect(isAllowedRedirect('://', wl)).toBe(false);
  });

  it('rejects when the whitelist is empty', () => {
    expect(isAllowedRedirect('http://localhost:3170/device-login', [])).toBe(false);
  });

  it('handles IPv6 origin parity (URL parser requires brackets)', () => {
    const wl6 = ['http://[::1]:3170'];
    expect(isAllowedRedirect('http://[::1]:3170', wl6)).toBe(true);
    expect(
      isAllowedRedirect('http://[::1]:3170/device-login?redirect_uri=x', wl6),
    ).toBe(true);
    // The parser rejects bracketless IPv6 — this test pins the URL-parser
    // contract, not the IPv6 logic itself.
    expect(isAllowedRedirect('http://::1:3170/device-login', wl6)).toBe(false);
  });

  it('rejects port mismatch on otherwise-matching host', () => {
    expect(
      isAllowedRedirect('http://localhost:9999/device-login?x=1', wl),
    ).toBe(false);
  });

  it('accepts case-variant scheme/host via the parsed branch (URL#origin lowercases)', () => {
    // The exact-match branch is case-sensitive; the parsed branch normalises
    // scheme + host through URL#origin. Pin both contracts.
    expect(
      isAllowedRedirect('HTTP://LOCALHOST:3170/device-login?x=1', wl),
    ).toBe(true);
    // Exact-match with uppercase is NOT accepted — `URL#origin` would lowercase,
    // but the bare-origin redirect goes through the case-sensitive includes branch.
    expect(isAllowedRedirect('HTTP://LOCALHOST:3170', wl)).toBe(false);
  });
});

describe('authCookieHandler', () => {
  it('M1/M2 — does NOT set cookies when redirect target is invalid (defense-in-depth)', () => {
    const res = makeRes();
    const config = makeConfig();

    authCookieHandler(
      res as unknown as Response,
      tokens,
      true,
      'https://evil.com/device-login?redirect_uri=x',
      config,
    );

    expect(res.cookie).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('http://localhost:3000');
  });

  it('M1 regression — DOES set cookies when redirectUrl is null (regular web SSO without device-login context)', () => {
    const res = makeRes();
    const config = makeConfig();

    authCookieHandler(
      res as unknown as Response,
      tokens,
      true,
      null,
      config,
    );

    expect(res.cookie).toHaveBeenCalledTimes(2);
    expect(res.redirect).toHaveBeenCalledWith('http://localhost:3000');
  });

  it('M1 regression — DOES set cookies when redirectUrl is empty string', () => {
    const res = makeRes();
    const config = makeConfig();

    authCookieHandler(
      res as unknown as Response,
      tokens,
      true,
      '',
      config,
    );

    expect(res.cookie).toHaveBeenCalledTimes(2);
    expect(res.redirect).toHaveBeenCalledWith('http://localhost:3000');
  });

  it('M2 — sets cookies and redirects to a valid /device-login target, preserving the query string', () => {
    const res = makeRes();
    const config = makeConfig();
    const target =
      'http://localhost:3170/device-login?redirect_uri=http://localhost:5555/cb/abc';

    authCookieHandler(res as unknown as Response, tokens, true, target, config);

    expect(res.cookie).toHaveBeenCalledWith(
      'access_token',
      'access-token-value',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax' }),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'refresh-token-value',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax' }),
    );
    expect(res.redirect).toHaveBeenCalledWith(target);
  });

  it('M2 — sets cookies and returns 200 on the redirect=false early-return path', () => {
    const res = makeRes();
    const config = makeConfig();

    authCookieHandler(res as unknown as Response, tokens, false, null, config);

    expect(res.cookie).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(res.send).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('M2 — preserves exact-match whitelisted entries for legacy SSO callbacks', () => {
    const res = makeRes();
    const config = makeConfig();

    authCookieHandler(
      res as unknown as Response,
      tokens,
      true,
      'http://localhost:3170',
      config,
    );

    expect(res.cookie).toHaveBeenCalledTimes(2);
    expect(res.redirect).toHaveBeenCalledWith('http://localhost:3170');
  });

  it('M2 — preserves app://hoppscotch exact match (desktop auth)', () => {
    const res = makeRes();
    const config = makeConfig();

    authCookieHandler(
      res as unknown as Response,
      tokens,
      true,
      'app://hoppscotch',
      config,
    );

    expect(res.cookie).toHaveBeenCalledTimes(2);
    expect(res.redirect).toHaveBeenCalledWith('app://hoppscotch');
  });

  it('M2 — falls back to VITE_BASE_URL without setting cookies when redirectUrl is malformed', () => {
    const res = makeRes();
    const config = makeConfig();

    expect(() =>
      authCookieHandler(
        res as unknown as Response,
        tokens,
        true,
        'http://',
        config,
      ),
    ).not.toThrow();

    expect(res.cookie).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('http://localhost:3000');
  });

  it('S1 — accepts the default-port form when operator wrote :80 (config normalization)', () => {
    const res = makeRes();
    const config = makeConfig({
      // Operator wrote :80 explicitly; should still match a default-port
      // redirect after normalization.
      WHITELISTED_ORIGINS: 'http://localhost:80',
      VITE_BASE_URL: 'http://fallback.example',
    });

    authCookieHandler(
      res as unknown as Response,
      tokens,
      true,
      'http://localhost/device-login?redirect_uri=x',
      config,
    );

    expect(res.redirect).toHaveBeenCalledWith(
      'http://localhost/device-login?redirect_uri=x',
    );
  });

  it('S1 — accepts trailing-slash whitelist entry (config normalization)', () => {
    const res = makeRes();
    const config = makeConfig({
      WHITELISTED_ORIGINS: 'https://app.hoppscotch.io/',
      VITE_BASE_URL: 'http://fallback.example',
    });

    authCookieHandler(
      res as unknown as Response,
      tokens,
      true,
      'https://app.hoppscotch.io/device-login?redirect_uri=x',
      config,
    );

    expect(res.redirect).toHaveBeenCalledWith(
      'https://app.hoppscotch.io/device-login?redirect_uri=x',
    );
  });

  it('uses configured cookie max-ages when valid', () => {
    const res = makeRes();
    const config = makeConfig({
      'INFRA.ACCESS_TOKEN_VALIDITY': '60000',
      'INFRA.REFRESH_TOKEN_VALIDITY': '120000',
      'INFRA.ALLOW_SECURE_COOKIES': 'true',
    });

    authCookieHandler(res as unknown as Response, tokens, false, null, config);

    expect(res.cookie).toHaveBeenCalledWith(
      'access_token',
      'access-token-value',
      expect.objectContaining({ secure: true, maxAge: 60000 }),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'refresh-token-value',
      expect.objectContaining({ secure: true, maxAge: 120000 }),
    );
  });

  it('falls back to default cookie max-ages when the config values fail to parse', () => {
    const res = makeRes();
    const config = makeConfig({
      'INFRA.ACCESS_TOKEN_VALIDITY': 'not-a-number',
      'INFRA.REFRESH_TOKEN_VALIDITY': undefined,
    });

    authCookieHandler(res as unknown as Response, tokens, false, null, config);

    expect(res.cookie).toHaveBeenCalledWith(
      'access_token',
      expect.any(String),
      expect.objectContaining({ maxAge: 86400000 }),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      'refresh_token',
      expect.any(String),
      expect.objectContaining({ maxAge: 604800000 }),
    );
  });

  it('handles IPv6 origin end-to-end (whitelist + device-login)', () => {
    const res = makeRes();
    const config = makeConfig({ WHITELISTED_ORIGINS: 'http://[::1]:3170' });

    authCookieHandler(
      res as unknown as Response,
      tokens,
      true,
      'http://[::1]:3170/device-login?redirect_uri=x',
      config,
    );

    expect(res.cookie).toHaveBeenCalledTimes(2);
    expect(res.redirect).toHaveBeenCalledWith(
      'http://[::1]:3170/device-login?redirect_uri=x',
    );
  });
});
