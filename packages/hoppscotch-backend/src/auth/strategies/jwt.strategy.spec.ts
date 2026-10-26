import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mockDeep } from 'jest-mock-extended';
import { Request } from 'express';
import { COOKIES_NOT_FOUND } from 'src/errors';
import { UserService } from 'src/user/user.service';
import { JwtStrategy } from './jwt.strategy';

const mockUserService = mockDeep<UserService>();
const mockConfigService = mockDeep<ConfigService>();
// secretOrKey must be non-empty or passport-jwt refuses to construct.
mockConfigService.get.mockReturnValue('unit-test-secret');

const strategy = new JwtStrategy(mockUserService, mockConfigService);

/**
 * The extractor passport actually runs: `jwtFromRequest` as handed to
 * passport-jwt by the JwtStrategy constructor. Asking for the token through
 * this function exercises the real production path — cookie extraction,
 * header fallback, and the error the client ends up seeing.
 */
const requestToken = (request: Partial<Request>): unknown =>
  (
    strategy as unknown as { _jwtFromRequest: (r: unknown) => string }
  )._jwtFromRequest(request);

const req = (
  cookies?: Record<string, unknown>,
  headers?: Record<string, string>,
) => ({ cookies, headers: headers ?? {} }) as unknown as Request;

const body = (e: unknown): Record<string, unknown> =>
  (e as { getResponse(): Record<string, unknown> }).getResponse();

describe('JwtStrategy token extraction policy', () => {
  describe('when only a refresh_token cookie is present (access cookie expired)', () => {
    it('throws UnauthorizedException so the client attempts a token refresh', () => {
      expect(() => requestToken(req({ refresh_token: 'refresh.jwt' }))).toThrow(
        UnauthorizedException,
      );
    });

    it('answers 401 with the message clients match on to trigger the refresh', () => {
      try {
        requestToken(req({ refresh_token: 'refresh.jwt' }));
        throw new Error('extractToken did not throw');
      } catch (e) {
        expect(e).toBeInstanceOf(UnauthorizedException);
        expect((e as UnauthorizedException).getStatus()).toBe(401);
        expect(body(e).statusCode).toBe(401);
        expect(body(e).message).toBe('Unauthorized');
      }
    });

    it('still throws 401 when the access cookie exists but is blank', () => {
      // A blank cookie is treated as absent (see extractFromCookie), so this
      // is still "no usable credentials, but a refresh cookie exists".
      expect(() =>
        requestToken(
          req({ access_token: '   ', refresh_token: 'refresh.jwt' }),
        ),
      ).toThrow(UnauthorizedException);
    });

    it('throws 401 when the access cookie is an empty string', () => {
      expect(() =>
        requestToken(req({ access_token: '', refresh_token: 'refresh.jwt' })),
      ).toThrow(UnauthorizedException);
    });
  });

  describe('when no cookies and no Authorization header are present', () => {
    it('keeps the historical ForbiddenException(COOKIES_NOT_FOUND) 403', () => {
      try {
        requestToken(req(undefined));
        throw new Error('extractToken did not throw');
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenException);
        expect((e as ForbiddenException).getStatus()).toBe(403);
        expect(body(e).statusCode).toBe(403);
        expect(body(e).message).toBe(COOKIES_NOT_FOUND);
      }
    });

    it('does not answer 401 for a request that never had credentials', () => {
      expect(() => requestToken(req({}))).toThrow(ForbiddenException);
    });
  });

  describe('when the refresh cookie is blank or not a string', () => {
    it('still answers 403 when the refresh cookie is blank', () => {
      expect(() => requestToken(req({ refresh_token: '   ' }))).toThrow(
        ForbiddenException,
      );
    });

    it('still answers 403 when the refresh cookie is a j:-prefixed object', () => {
      expect(() => requestToken(req({ refresh_token: { a: 1 } }))).toThrow(
        ForbiddenException,
      );
    });
  });

  describe('when the access cookie is present but not a string', () => {
    it('falls back to a Bearer header', () => {
      expect(
        requestToken(
          req({ access_token: { a: 1 } }, { authorization: 'Bearer hdr.jwt' }),
        ),
      ).toBe('hdr.jwt');
    });

    it('treats it as absent and answers 401 for a refresh-only request', () => {
      expect(() =>
        requestToken(
          req({ access_token: { a: 1 }, refresh_token: 'refresh.jwt' }),
        ),
      ).toThrow(UnauthorizedException);
    });
  });

  describe('when usable credentials are present', () => {
    it('returns the access cookie untouched', () => {
      expect(requestToken(req({ access_token: 'access.jwt' }))).toBe(
        'access.jwt',
      );
    });

    it('prefers a Bearer header over cookie presence entirely', () => {
      expect(
        requestToken(
          req(
            { refresh_token: 'refresh.jwt' },
            { authorization: 'Bearer hdr.jwt' },
          ),
        ),
      ).toBe('hdr.jwt');
    });

    it('falls back to a Bearer header when no cookies exist at all', () => {
      expect(
        requestToken(req(undefined, { authorization: 'Bearer hdr.jwt' })),
      ).toBe('hdr.jwt');
    });
  });
});
