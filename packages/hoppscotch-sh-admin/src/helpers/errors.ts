/*
 * Type used to send error data to the Fallback catch-all component
 */
export type ErrorPageData = {
  message: string;
  statusCode?: number;
};

/* No cookies were found in the auth request
 * (AuthService)
 */
export const COOKIES_NOT_FOUND = '[GraphQL] auth/cookies_not_found' as const;

export const UNAUTHORIZED = 'Unauthorized' as const;

// Sometimes the backend returns Unauthorized error message as follows:
export const GRAPHQL_UNAUTHORIZED = '[GraphQL] Unauthorized' as const;

// When the email is invalid
export const INVALID_EMAIL = '[GraphQL] invalid/email' as const;

// When trying to remove the only admin account
export const ONLY_ONE_ADMIN_ACCOUNT_FOUND =
  '[GraphQL] admin/only_one_admin_account_found' as const;

// When trying to delete an admin account
export const ADMIN_CANNOT_BE_DELETED =
  'admin/admin_can_not_be_deleted' as const;

// When trying to invite a user that is already invited
export const USER_ALREADY_INVITED =
  '[GraphQL] admin/user_already_invited' as const;

// When attempting to delete a user who is an owner of a team
export const USER_IS_OWNER = 'user/is_owner';

// When attempting to delete a user who is the only owner of a team
export const TEAM_ONLY_ONE_OWNER = '[GraphQL] team/only_one_owner';

// Even one auth provider is not specified
export const AUTH_PROVIDER_NOT_SPECIFIED =
  '[GraphQL] auth/provider_not_specified' as const;

export const BOTH_EMAILS_CANNOT_BE_SAME =
  '[GraphQL] email/both_emails_cannot_be_same' as const;

export const INFRA_TOKEN_LABEL_SHORT =
  '[GraphQL] infra_token/label_too_short' as const;

// AI provider connection rejections, all raised by AIProviderService
export const AI_PROVIDER_NOT_FOUND = '[GraphQL] ai_provider/not_found' as const;

export const AI_PROVIDER_LABEL_SHORT =
  '[GraphQL] ai_provider/label_short' as const;

export const AI_PROVIDER_INVALID_PRESET =
  '[GraphQL] ai_provider/invalid_preset' as const;

export const AI_PROVIDER_MODELS_INVALID =
  '[GraphQL] ai_provider/models_invalid' as const;

export const AI_PROVIDER_BASE_URL_REQUIRED =
  '[GraphQL] ai_provider/base_url_required' as const;

export const AI_PROVIDER_MODEL_REJECTED =
  '[GraphQL] ai_provider/model_rejected' as const;

export const AI_PROVIDER_KEY_REQUIRED =
  '[GraphQL] ai_provider/key_required' as const;

export const AI_PROVIDER_KEY_UNREADABLE =
  '[GraphQL] ai_provider/key_unreadable' as const;

export const AI_PROVIDER_LABEL_TAKEN =
  '[GraphQL] ai_provider/label_taken' as const;

// Skill rejections, raised by AISkillService
export const AI_SKILL_NOT_FOUND = '[GraphQL] ai_skill/not_found' as const;

export const AI_SKILL_INVALID_SLUG = '[GraphQL] ai_skill/invalid_slug' as const;

export const AI_SKILL_SLUG_TAKEN = '[GraphQL] ai_skill/slug_taken' as const;

export const AI_SKILL_INCOMPLETE = '[GraphQL] ai_skill/incomplete' as const;

type ErrorMessages = {
  message: string;
  alternateMessage?: string;
};

const ERROR_MESSAGES: Record<string, ErrorMessages> = {
  [INVALID_EMAIL]: {
    message: 'state.invalid_email',
  },
  [ONLY_ONE_ADMIN_ACCOUNT_FOUND]: {
    message: 'state.remove_admin_failure_only_one_admin',
  },
  [ADMIN_CANNOT_BE_DELETED]: {
    message: 'state.remove_admin_to_delete_user',
    alternateMessage: 'state.remove_admin_for_deletion',
  },
  [USER_ALREADY_INVITED]: {
    message: 'state.user_already_invited',
  },
  [USER_IS_OWNER]: {
    message: 'state.remove_owner_to_delete_user',
    alternateMessage: 'state.remove_owner_for_deletion',
  },
  [TEAM_ONLY_ONE_OWNER]: {
    message: 'state.remove_owner_failure_only_one_owner',
  },
  [AUTH_PROVIDER_NOT_SPECIFIED]: {
    message: 'configs.auth_providers.provider_not_specified',
  },
  [BOTH_EMAILS_CANNOT_BE_SAME]: {
    message: 'state.emails_cannot_be_same',
  },
  [INFRA_TOKEN_LABEL_SHORT]: {
    message: 'state.infra_token_label_short',
  },
  [AI_PROVIDER_NOT_FOUND]: {
    message: 'state.ai_provider_not_found',
  },
  [AI_PROVIDER_LABEL_SHORT]: {
    message: 'state.ai_provider_label_short',
  },
  [AI_PROVIDER_INVALID_PRESET]: {
    message: 'state.ai_provider_invalid_preset',
  },
  [AI_PROVIDER_MODELS_INVALID]: {
    message: 'state.ai_provider_models_invalid',
  },
  [AI_PROVIDER_BASE_URL_REQUIRED]: {
    message: 'state.ai_provider_base_url_required',
  },
  [AI_PROVIDER_MODEL_REJECTED]: {
    message: 'state.ai_provider_model_rejected',
  },
  [AI_PROVIDER_KEY_REQUIRED]: {
    message: 'state.ai_provider_key_required',
  },
  [AI_PROVIDER_KEY_UNREADABLE]: {
    message: 'state.ai_provider_key_unreadable',
  },
  [AI_PROVIDER_LABEL_TAKEN]: {
    message: 'state.ai_provider_label_taken',
  },
  [AI_SKILL_NOT_FOUND]: {
    message: 'state.ai_skill_not_found',
  },
  [AI_SKILL_INVALID_SLUG]: {
    message: 'state.ai_skill_invalid_slug',
  },
  [AI_SKILL_SLUG_TAKEN]: {
    message: 'state.ai_skill_slug_taken',
  },
  [AI_SKILL_INCOMPLETE]: {
    message: 'state.ai_skill_incomplete',
  },
};

export const getCompiledErrorMessage = (name: string, altMessage = false) => {
  const error = ERROR_MESSAGES[name];
  return altMessage ? (error?.alternateMessage ?? '') : (error?.message ?? '');
};
