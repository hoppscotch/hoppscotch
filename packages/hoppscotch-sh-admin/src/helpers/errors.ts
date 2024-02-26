/* No cookies were found in the auth request
 * (AuthService)
 */
export const COOKIES_NOT_FOUND = 'auth/cookies_not_found' as const;

export const UNAUTHORIZED = 'Unauthorized' as const;

// Sometimes the backend returns Unauthorized error message as follows:
export const GRAPHQL_UNAUTHORIZED = '[GraphQL] Unauthorized' as const;
