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

  if (url.protocol !== 'http:') return false;
  if (url.username || url.password) return false;

  return LOOPBACK_HOSTS.includes(url.hostname);
}

export function isValidRedirectUri(uri: string | undefined | null): boolean {
  return isValidLocalhostRedirectUri(uri);
}
