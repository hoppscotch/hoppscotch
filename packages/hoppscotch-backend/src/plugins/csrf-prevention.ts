import type { Plugin } from 'graphql-yoga';

// Content types a browser can send cross-site without a CORS preflight.
const SIMPLE_CONTENT_TYPES = [
  'text/plain',
  'application/x-www-form-urlencoded',
  'multipart/form-data',
];

const PREFLIGHT_HEADERS = ['x-apollo-operation-name', 'apollo-require-preflight'];

/**
 * CSRF prevention with the same rule Apollo Server applied by default:
 * reject requests a browser could send cross-site without a preflight (no or
 * "simple" content type) unless they carry a header that forces a preflight.
 * Our clients always POST `application/json`, so they are unaffected.
 *
 * @param allowGraphiQL let browsers load the GraphiQL page (non-production)
 */
export const useCsrfPrevention = (allowGraphiQL: boolean): Plugin => ({
  onRequest({ request, fetchAPI, endResponse }) {
    if (
      allowGraphiQL &&
      request.method === 'GET' &&
      request.headers.get('accept')?.includes('text/html')
    ) {
      return;
    }

    const contentType = (request.headers.get('content-type') ?? '')
      .split(';')[0]
      .trim()
      .toLowerCase();
    const isSimple =
      contentType === '' || SIMPLE_CONTENT_TYPES.includes(contentType);

    if (isSimple && !PREFLIGHT_HEADERS.some((h) => request.headers.has(h))) {
      endResponse(
        new fetchAPI.Response(
          'This operation has been blocked as a potential Cross-Site Request Forgery (CSRF). ' +
            "Send it with 'Content-Type: application/json' or an 'apollo-require-preflight' header.",
          { status: 400, headers: { 'content-type': 'text/plain' } },
        ),
      );
    }
  },
});
