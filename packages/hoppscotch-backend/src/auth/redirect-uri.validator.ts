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

  return LOOPBACK_HOSTS.indexOf(url.hostname) !== -1;
}

export function isValidRedirectUri(uri?: string): boolean {
  if (!uri) return false;

  try {
    const url = new URL(uri);

    const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

    // Block credentials
    if (url.username || url.password) return false;

    // Only allow loopback hosts
    if (!LOOPBACK_HOSTS.includes(url.hostname)) return false;

    // Only allow http (desktop apps don't use TLS on loopback)
    return url.protocol === 'http:';
  } catch {
    return false;
  }
}