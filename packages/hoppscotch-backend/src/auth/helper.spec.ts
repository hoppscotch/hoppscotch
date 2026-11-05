import { ConfigService } from '@nestjs/config';
import { AuthTokens } from 'src/types/AuthTokens';
import { authCookieHandler } from './helper';

const tokens: AuthTokens = {
  access_token: 'access.jwt',
  refresh_token: 'refresh.jwt',
};

type Res = {
  cookie: jest.Mock;
  status: jest.Mock;
  send: jest.Mock;
  redirect: jest.Mock;
};

const makeRes = (): Res => ({
  cookie: jest.fn(),
  status: jest.fn().mockReturnThis(),
  send: jest.fn(),
  redirect: jest.fn(),
});

const configService = (values: Record<string, string | undefined>) =>
  ({ get: (key: string) => values[key] }) as unknown as ConfigService;

const secureOff = { 'INFRA.ALLOW_SECURE_COOKIES': 'false' };

const maxAgeOf = (res: Res, cookieName: string): number => {
  const call = res.cookie.mock.calls.find((c) => c[0] === cookieName);
  if (!call) throw new Error(`cookie ${cookieName} was never set`);
  return (call[2] as { maxAge: number }).maxAge;
};

describe('authCookieHandler cookie lifetimes', () => {
  it('does not let the access cookie expire before the refresh cookie', () => {
    const res = makeRes();
    authCookieHandler(
      res as never,
      tokens,
      false,
      null,
      configService({
        ...secureOff,
        'INFRA.ACCESS_TOKEN_VALIDITY': '86400000', // 1 day (shipped default)
        'INFRA.REFRESH_TOKEN_VALIDITY': '604800000', // 7 days (shipped default)
      }),
    );

    const access = maxAgeOf(res, 'access_token');
    const refresh = maxAgeOf(res, 'refresh_token');

    expect(access).toBeGreaterThanOrEqual(refresh);
    // With the shipped defaults the access cookie must therefore live 7 days.
    expect(access).toBe(604800000);
    expect(refresh).toBe(604800000);
  });

  it('keeps the refresh cookie on its own configured lifetime', () => {
    const res = makeRes();
    authCookieHandler(
      res as never,
      tokens,
      false,
      null,
      configService({
        ...secureOff,
        'INFRA.ACCESS_TOKEN_VALIDITY': '86400000',
        'INFRA.REFRESH_TOKEN_VALIDITY': '604800000',
      }),
    );

    expect(maxAgeOf(res, 'refresh_token')).toBe(604800000);
  });

  it('does not shrink the access cookie when an operator sets it longer than the refresh token', () => {
    const res = makeRes();
    authCookieHandler(
      res as never,
      tokens,
      false,
      null,
      configService({
        ...secureOff,
        'INFRA.ACCESS_TOKEN_VALIDITY': '604800000',
        'INFRA.REFRESH_TOKEN_VALIDITY': '86400000',
      }),
    );

    expect(maxAgeOf(res, 'access_token')).toBe(604800000);
    expect(maxAgeOf(res, 'refresh_token')).toBe(86400000);
  });

  it('falls back to the shipped defaults when the config values are missing', () => {
    const res = makeRes();
    authCookieHandler(
      res as never,
      tokens,
      false,
      null,
      configService(secureOff),
    );

    const access = maxAgeOf(res, 'access_token');
    const refresh = maxAgeOf(res, 'refresh_token');

    expect(refresh).toBe(604800000);
    expect(access).toBeGreaterThanOrEqual(refresh);
    expect(access).toBe(604800000);
  });

  it('sends both cookies with the same hardening flags', () => {
    const res = makeRes();
    authCookieHandler(
      res as never,
      tokens,
      false,
      null,
      configService(secureOff),
    );

    for (const name of ['access_token', 'refresh_token']) {
      const call = res.cookie.mock.calls.find((c) => c[0] === name);
      expect(call[2]).toMatchObject({
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
      });
    }
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalled();
  });
});
