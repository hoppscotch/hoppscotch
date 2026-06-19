import { HttpException, HttpStatus } from '@nestjs/common';
import { AuthTokens } from 'src/types/AuthTokens';
import { Response } from 'express';
import * as cookie from 'cookie';
import {
  AUTH_HEADER_NOT_FOUND,
  AUTH_PROVIDER_NOT_SPECIFIED,
  COOKIES_NOT_FOUND,
  INVALID_AUTH_HEADER,
} from 'src/errors';
import { throwErr } from 'src/utils';
import { ConfigService } from '@nestjs/config';
import { IncomingHttpHeaders } from 'http';

enum AuthTokenType {
  ACCESS_TOKEN = 'access_token',
  REFRESH_TOKEN = 'refresh_token',
}

export enum Origin {
  ADMIN = 'admin',
  APP = 'app',
}

export enum AuthProvider {
  GOOGLE = 'GOOGLE',
  GITHUB = 'GITHUB',
  MICROSOFT = 'MICROSOFT',
  EMAIL = 'EMAIL',
}

/**
 * Sets and returns the cookies in the response object on successful authentication
 * @param res Express Response Object
 * @param authTokens Object containing the access and refresh tokens
 * @param redirect if true will redirect to provided URL else just send a 200 status code
 */
export const authCookieHandler = (
  res: Response,
  authTokens: AuthTokens,
  redirect: boolean,
  redirectUrl: string | null,
  configService: ConfigService,
) => {
  // Calculate token validity periods in milliseconds
  let accessTokenValidityInMs = parseInt(
    configService.get('INFRA.ACCESS_TOKEN_VALIDITY'),
  );
  let refreshTokenValidityInMs = parseInt(
    configService.get('INFRA.REFRESH_TOKEN_VALIDITY'),
  );

  // Set default values if parsing results in NaN
  if (isNaN(accessTokenValidityInMs)) accessTokenValidityInMs = 86400000; // Default: 1 day
  if (isNaN(refreshTokenValidityInMs)) refreshTokenValidityInMs = 604800000; // Default: 7 days

  const setAuthCookies = () => {
    res.cookie(AuthTokenType.ACCESS_TOKEN, authTokens.access_token, {
      httpOnly: true,
      secure: configService.get('INFRA.ALLOW_SECURE_COOKIES') === 'true',
      sameSite: 'lax',
      maxAge: accessTokenValidityInMs,
    });
    res.cookie(AuthTokenType.REFRESH_TOKEN, authTokens.refresh_token, {
      httpOnly: true,
      secure: configService.get('INFRA.ALLOW_SECURE_COOKIES') === 'true',
      sameSite: 'lax',
      maxAge: refreshTokenValidityInMs,
    });
  };

  if (!redirect) {
    setAuthCookies();
    return res.status(HttpStatus.OK).send();
  }

  const whitelistedOrigins = normalizeWhitelistedOrigins(
    configService.get('WHITELISTED_ORIGINS'),
  );

  // Validate redirect target BEFORE issuing session cookies. If the target is
  // not on a whitelisted origin, refuse the session (defense-in-depth against
  // forged OAuth state) and bounce the user to VITE_BASE_URL.
  if (!isAllowedRedirect(redirectUrl, whitelistedOrigins)) {
    return res.status(HttpStatus.OK).redirect(configService.get('VITE_BASE_URL'));
  }

  setAuthCookies();
  return res.status(HttpStatus.OK).redirect(redirectUrl);
};

/**
 * Path on a whitelisted origin that may carry an inner `?redirect_uri=...`
 * for the device-login round-trip. Inner redirect_uri is validated FE-side
 * (see redirect-uri.validator) — backend only authorises the page load.
 */
const DEVICE_LOGIN_PATH = '/device-login';

/**
 * Parse `WHITELISTED_ORIGINS` and normalize each entry so operator-visible
 * forms collapse to the same string that `URL#origin` emits.
 *
 * - `http://localhost:80` → `http://localhost` (default port stripped)
 * - `https://app.hoppscotch.io/` → `https://app.hoppscotch.io` (trailing slash off)
 * - Mixed-case scheme/host → lowercased
 * - Non-special schemes (e.g. `app://hoppscotch`, whose `URL#origin` is `"null"`)
 *   are kept verbatim so the exact-match branch can still pin them.
 */
export const normalizeWhitelistedOrigins = (raw: string | undefined): string[] =>
  (raw ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      try {
        const origin = new URL(entry).origin;
        return origin === 'null' ? entry : origin;
      } catch {
        return entry;
      }
    });

/**
 * A redirect target is allowed when either:
 *   1. The full string matches a whitelisted entry exactly (legacy callbacks,
 *      including non-special schemes like `app://hoppscotch` whose `URL#origin`
 *      is spec'd to be `"null"`), OR
 *   2. The URL parses, carries no userinfo, lands on `DEVICE_LOGIN_PATH` (with
 *      or without a trailing slash), and its origin matches a whitelisted entry.
 */
export const isAllowedRedirect = (
  redirectUrl: string | null,
  whitelistedOrigins: string[],
): boolean => {
  if (!redirectUrl) return false;
  if (whitelistedOrigins.includes(redirectUrl)) return true;

  let parsed: URL;
  try {
    parsed = new URL(redirectUrl);
  } catch {
    return false;
  }

  if (parsed.username || parsed.password) return false;

  // Strip a single trailing slash so `/device-login/` matches `/device-login`.
  // Multiple trailing slashes (`/device-login//`) remain rejected — that shape
  // is not produced by any legitimate FE link.
  const path = parsed.pathname.replace(/\/$/, '');
  if (path !== DEVICE_LOGIN_PATH) return false;

  return whitelistedOrigins.includes(parsed.origin);
};

/**
 * Decode the cookie header from incoming websocket connects and returns a auth token pair
 * @param rawCookies cookies from the websocket connection
 * @returns AuthTokens for JWT strategy to use
 */
export const subscriptionContextCookieParser = (rawCookies: string) => {
  const cookies = cookie.parse(rawCookies);

  if (
    !cookies[AuthTokenType.ACCESS_TOKEN] &&
    !cookies[AuthTokenType.REFRESH_TOKEN]
  ) {
    throw new HttpException(COOKIES_NOT_FOUND, 400, {
      cause: new Error(COOKIES_NOT_FOUND),
    });
  }

  return <AuthTokens>{
    access_token: cookies[AuthTokenType.ACCESS_TOKEN],
    refresh_token: cookies[AuthTokenType.REFRESH_TOKEN],
  };
};

/**
 * Check to see if given auth provider is present in the VITE_ALLOWED_AUTH_PROVIDERS env variable
 *
 * @param provider Provider we want to check the presence of
 * @returns Boolean if provider specified is present or not
 */
export function authProviderCheck(
  provider: string,
  VITE_ALLOWED_AUTH_PROVIDERS: string,
) {
  if (!provider) {
    throwErr(AUTH_PROVIDER_NOT_SPECIFIED);
  }

  const envVariables = VITE_ALLOWED_AUTH_PROVIDERS?.split(',') ?? [];

  if (!envVariables.includes(provider.toUpperCase())) return false;

  return true;
}

/**
 * Extract cookie as key-value pairs from headers of a request
 * @param headers HTTP request headers containing auth tokens
 * @returns Cookie's key-value pairs
 */
export const extractCookieAsKeyValuesFromHeaders = (
  headers: IncomingHttpHeaders,
) => {
  const cookieHeader =
    headers['cookie'] || headers['Cookie'] || headers['COOKIE'];

  if (!cookieHeader) {
    throw new HttpException(COOKIES_NOT_FOUND, 400, {
      cause: new Error(COOKIES_NOT_FOUND),
    });
  }

  const cookieStr = Array.isArray(cookieHeader)
    ? cookieHeader[0]
    : cookieHeader;

  const kv = cookieStr
    .split(';')
    .map((cookie) => cookie.trim())
    .reduce(
      (acc, curr) => {
        const [key, value] = curr.split('=');
        acc[key] = value;
        return acc;
      },
      {} as Record<string, string>,
    );

  return kv;
};

/**
 * Extract auth tokens from cookie headers of a request
 * @param headers HTTP request headers containing auth tokens
 * @returns AuthTokens for JWT strategy to use
 */
export const extractAuthTokensFromCookieHeaders = (
  headers: IncomingHttpHeaders,
) => {
  const cookieKV = extractCookieAsKeyValuesFromHeaders(headers);

  if (
    !cookieKV[AuthTokenType.ACCESS_TOKEN] ||
    !cookieKV[AuthTokenType.REFRESH_TOKEN]
  ) {
    throw new HttpException(COOKIES_NOT_FOUND, 400, {
      cause: new Error(COOKIES_NOT_FOUND),
    });
  }

  return <AuthTokens>{
    access_token: cookieKV[AuthTokenType.ACCESS_TOKEN],
    refresh_token: cookieKV[AuthTokenType.REFRESH_TOKEN],
  };
};

/**
 * Extract access tokens from cookie headers of a request
 * @param headers HTTP request headers containing access tokens
 * @returns AccessTokens for JWT strategy to use
 */
export const extractAccessTokensFromCookieHeaders = (
  headers: IncomingHttpHeaders,
) => {
  const cookieKV = extractCookieAsKeyValuesFromHeaders(headers);

  if (!cookieKV[AuthTokenType.ACCESS_TOKEN]) {
    throw new HttpException(COOKIES_NOT_FOUND, 400, {
      cause: new Error(COOKIES_NOT_FOUND),
    });
  }

  return {
    access_token: cookieKV[AuthTokenType.ACCESS_TOKEN],
  };
};

/**
 * Extract access token from authorization header
 * @param headers HTTP request headers containing bearer token
 * @returns AccessTokens for JWT strategy
 */
export const extractAccessTokenFromAuthRecords = (
  headers: IncomingHttpHeaders,
) => {
  const authHeader = headers['authorization'] || headers['Authorization'];
  if (!authHeader) {
    throw new HttpException(AUTH_HEADER_NOT_FOUND, 400, {
      cause: new Error(AUTH_HEADER_NOT_FOUND),
    });
  }

  const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  const [bearer, access_token] = headerValue.split(' ');

  if (bearer !== 'Bearer' || !access_token) {
    throw new HttpException(INVALID_AUTH_HEADER, 400, {
      cause: new Error(INVALID_AUTH_HEADER),
    });
  }

  return access_token;
};
