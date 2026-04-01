// Only true loopback addresses are safe for native app redirects
const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

export function isValidLocalhostRedirectUri(
  uri: string | undefined | null,
): boolean {
  if (!uri) return false;

  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    return false;
  }

  // no https — desktop loopback listeners don't serve TLS
  if (url.protocol !== 'http:') return false;

  // block credential-stuffed URIs like http://user:pass@localhost
  if (url.username || url.password) return false;

  // exact match only
  return LOOPBACK_HOSTS.indexOf(url.hostname) !== -1;
}
