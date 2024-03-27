/* No cookies were found in the auth request
 * (AuthService)
 */
export const COOKIES_NOT_FOUND = 'auth/cookies_not_found' as const;

export const UNAUTHORIZED = 'Unauthorized' as const;

// Sometimes the backend returns Unauthorized error message as follows:
export const GRAPHQL_UNAUTHORIZED = '[GraphQL] Unauthorized' as const;

export const ONLY_ONE_ADMIN_ACCOUNT_FOUND =
  '[GraphQL] admin/only_one_admin_account_found' as const;

export const ADMIN_CANNOT_BE_DELETED =
  'admin/admin_can_not_be_deleted' as const;

// When trying to invite a user that is already invited
export const USER_ALREADY_INVITED =
  '[GraphQL] admin/user_already_invited' as const;

// When attempting to delete a user who is an owner of a team
export const USER_IS_OWNER = 'user/is_owner' as const;
