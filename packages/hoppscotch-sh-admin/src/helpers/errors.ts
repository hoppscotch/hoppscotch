/* No cookies were found in the auth request
 * (AuthService)
 */
export const COOKIES_NOT_FOUND = 'auth/cookies_not_found' as const;

export const UNAUTHORIZED = 'Unauthorized' as const;

// Sometimes the backend returns Unauthorized error message as follows:
export const GRAPHQL_UNAUTHORIZED = '[GraphQL] Unauthorized' as const;

/**
 * Email not found
 */
export const EMAIL_NOT_FOUND = 'email/not_found';

/**
 * Request Failed
 */
export const REQ_FAILED = 'request/failed';

export const INVALID_EMAIL = 'invalid/email' as const;

/**
 * Subscriber already exists
 * (NewsletterService)
 */
export const SUBSCRIBER_ALREADY_EXISTS = 'newsletter/subscriber_already_exists';
