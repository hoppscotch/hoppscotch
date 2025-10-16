// Shared validation helpers across packages
// Keep patterns here to avoid duplication between frontend packages
export const COOKIE_NAME_REGEX = /^[A-Za-z0-9_-]+$/;
export const COOKIE_NAME_REGEX_STRING = '^[A-Za-z0-9_-]+$';

export function isValidCookieName(name: string): boolean {
  if (!name) return false;
  return COOKIE_NAME_REGEX.test(name);
}
