import { HttpException } from '@nestjs/common';
import { IncomingHttpHeaders } from 'http';
import { COOKIES_NOT_FOUND } from 'src/errors';
import { extractCookieAsKeyValuesFromHeaders } from './helper';

// RFC 6265 §5.2 says the first '=' in a cookie-pair separates the name from
// the value, and everything after that first '=' is part of the value.
// These tests pin down that contract — especially that '=' padding inside
// JWT and base64-encoded tokens survives a round trip through the parser.
describe('extractCookieAsKeyValuesFromHeaders', () => {
  const asHeaders = (cookie: string): IncomingHttpHeaders => ({ cookie });

  describe('basic parsing', () => {
    it('parses a single cookie', () => {
      expect(extractCookieAsKeyValuesFromHeaders(asHeaders('a=1'))).toEqual({
        a: '1',
      });
    });

    it('parses multiple cookies separated by "; "', () => {
      expect(
        extractCookieAsKeyValuesFromHeaders(asHeaders('a=1; b=2; c=3')),
      ).toEqual({ a: '1', b: '2', c: '3' });
    });

    it('trims whitespace around each cookie pair', () => {
      expect(
        extractCookieAsKeyValuesFromHeaders(asHeaders('  a=1 ;   b=2  ')),
      ).toEqual({ a: '1', b: '2' });
    });

    it('returns an empty value when the cookie ends with "="', () => {
      // `a=` is legal per RFC 6265 — represents an empty value, not a bare name
      expect(extractCookieAsKeyValuesFromHeaders(asHeaders('a='))).toEqual({
        a: '',
      });
    });
  });

  describe('header casing and shape', () => {
    it('accepts the lowercase "cookie" header', () => {
      expect(
        extractCookieAsKeyValuesFromHeaders({ cookie: 'a=1' }),
      ).toEqual({ a: '1' });
    });

    it('accepts a capitalized "Cookie" header', () => {
      expect(
        extractCookieAsKeyValuesFromHeaders({ Cookie: 'a=1' } as any),
      ).toEqual({ a: '1' });
    });

    it('picks the first entry when the cookie header arrives as an array', () => {
      expect(
        extractCookieAsKeyValuesFromHeaders({
          cookie: ['a=1', 'b=2'],
        }),
      ).toEqual({ a: '1' });
    });

    it('throws COOKIES_NOT_FOUND when no cookie header is present', () => {
      expect(() =>
        extractCookieAsKeyValuesFromHeaders({} as IncomingHttpHeaders),
      ).toThrow(HttpException);
      expect(() =>
        extractCookieAsKeyValuesFromHeaders({} as IncomingHttpHeaders),
      ).toThrow(COOKIES_NOT_FOUND);
    });
  });

  describe("preserves '=' characters inside cookie values", () => {
    // This is the bug reported in #6135 — the previous implementation used
    // `curr.split('=')` with destructuring, which silently dropped everything
    // after the first '=' inside the value. These cases all contain '='
    // padding that strict parsers used to mangle.

    it('keeps the trailing "==" on a base64-padded value', () => {
      const cookieStr = 'token=abc==';
      expect(
        extractCookieAsKeyValuesFromHeaders(asHeaders(cookieStr)),
      ).toEqual({ token: 'abc==' });
    });

    it('keeps embedded "=" characters inside a JWT-shaped value', () => {
      // A realistic JWT body — three base64url segments separated by '.',
      // with padding that includes '=' characters.
      const jwt =
        'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0==.sig==';
      const cookieStr = `access_token=${jwt}`;
      expect(
        extractCookieAsKeyValuesFromHeaders(asHeaders(cookieStr)),
      ).toEqual({ access_token: jwt });
    });

    it('keeps "=" inside each value when multiple cookies are present', () => {
      const cookieStr =
        'session=abc=; refresh_token=xyz==; csrf=plain';
      expect(
        extractCookieAsKeyValuesFromHeaders(asHeaders(cookieStr)),
      ).toEqual({
        session: 'abc=',
        refresh_token: 'xyz==',
        csrf: 'plain',
      });
    });

    it('handles consecutive "=" characters inside a single value', () => {
      expect(
        extractCookieAsKeyValuesFromHeaders(asHeaders('token====')),
      ).toEqual({ token: '===' });
    });
  });

  describe('defensive handling of malformed cookie strings', () => {
    it('ignores empty segments produced by trailing or duplicate semicolons', () => {
      // Real-world clients occasionally emit `a=1;; b=2` or trailing `;`.
      // Empty segments used to produce a stray `{ "": undefined }` entry.
      expect(
        extractCookieAsKeyValuesFromHeaders(asHeaders('a=1;; b=2;')),
      ).toEqual({ a: '1', b: '2' });
    });

    it('drops nameless cookie segments instead of using an empty key', () => {
      // A segment that starts with `=` has no name, so there is nothing
      // useful to index it under. Skip it rather than clobbering the map
      // with a `""` key.
      expect(
        extractCookieAsKeyValuesFromHeaders(asHeaders('=orphan; a=1')),
      ).toEqual({ a: '1' });
    });

    it('stores a bare flag cookie with an empty value', () => {
      // Cookies like `HttpOnly` occasionally appear without an `=value`.
      // Treat them as present-but-empty so downstream code can detect them.
      expect(
        extractCookieAsKeyValuesFromHeaders(asHeaders('flag; a=1')),
      ).toEqual({ flag: '', a: '1' });
    });
  });
});
