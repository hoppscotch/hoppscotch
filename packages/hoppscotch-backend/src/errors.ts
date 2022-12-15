export const INVALID_EMAIL = 'invalid/email' as const;

export const EMAIL_FAILED = 'email/failed' as const;

/**
 * Token Authorization failed (Check 'Authorization' Header)
 * (GqlAuthGuard)
 */
export const AUTH_FAIL = 'auth/fail';

/**
 * Tried to delete an user data document from fb firestore but failed.
 * (FirebaseService)
 */
export const USER_FB_DOCUMENT_DELETION_FAILED =
  'fb/firebase_document_deletion_failed' as const;

/**
 * Tried to do an action on a user where user is not found
 */
export const USER_NOT_FOUND = 'user/not_found' as const;

/**
 * User deletion failure
 * (UserService)
 */
export const USER_DELETION_FAILED = 'user/deletion_failed' as const;

/**
 * User deletion failure error due to user being a team owner
 * (UserService)
 */
export const USER_IS_OWNER = 'user/is_owner' as const;

/**
 * Tried to perform action on a team which they are not a member of
 * (GqlTeamMemberGuard)
 */
export const TEAM_MEMBER_NOT_FOUND = 'team/member_not_found' as const;

/**
 * Tried to perform action on a team that doesn't accept their member role level
 * (GqlTeamMemberGuard)
 */
export const TEAM_NOT_REQUIRED_ROLE = 'team/not_required_role' as const;

/**
 * Team name validation failure
 * (TeamService)
 */
export const TEAM_NAME_INVALID = 'team/name_invalid';

/**
 * Couldn't find the sync data from the user
 * (TeamCollectionService)
 */
export const TEAM_USER_NO_FB_SYNCDATA = 'team/user_no_fb_syncdata';

/**
 * There was a problem resolving the firebase collection path
 * (TeamCollectionService)
 */
export const TEAM_FB_COLL_PATH_RESOLVE_FAIL = 'team/fb_coll_path_resolve_fail';

/**
 * Tried to update the team to a state it doesn't have any owners
 * (TeamService)
 */
export const TEAM_ONLY_ONE_OWNER = 'team/only_one_owner';

/**
 * Invalid or non-existent Team ID
 * (TeamService)
 */
export const TEAM_INVALID_ID = 'team/invalid_id' as const;

/**
 * Invalid or non-existent collection id
 * (GqlCollectionTeamMemberGuard)
 */
export const TEAM_INVALID_COLL_ID = 'team/invalid_coll_id' as const;

/**
 * Invalid team id or user id
 * (TeamService)
 */
export const TEAM_INVALID_ID_OR_USER = 'team/invalid_id_or_user';

/**
 * The provided title for the team collection is short (less than 3 characters)
 * (TeamCollectionService)
 */
export const TEAM_COLL_SHORT_TITLE = 'team_coll/short_title';

/**
 * The JSON used is not valid
 * (TeamCollectionService)
 */
export const TEAM_COLL_INVALID_JSON = 'team_coll/invalid_json';

/**
 * Tried to perform action on a request that doesn't accept their member role level
 * (GqlRequestTeamMemberGuard)
 */
export const TEAM_REQ_NOT_REQUIRED_ROLE = 'team_req/not_required_role';

/**
 * Tried to operate on a request which does not exist
 * (TeamRequestService)
 */
export const TEAM_REQ_NOT_FOUND = 'team_req/not_found' as const;

/**
 * Invalid or non-existent collection id
 * (TeamRequestService)
 */
export const TEAM_REQ_INVALID_TARGET_COLL_ID =
  'team_req/invalid_target_id' as const;

/**
 * Tried to perform action on a request when the user is not even member of the team
 * (GqlRequestTeamMemberGuard, GqlCollectionTeamMemberGuard)
 */
export const TEAM_REQ_NOT_MEMBER = 'team_req/not_member';

export const TEAM_INVITE_MEMBER_HAS_INVITE =
  'team_invite/member_has_invite' as const;

export const TEAM_INVITE_NO_INVITE_FOUND =
  'team_invite/no_invite_found' as const;

export const TEAM_INVITE_ALREADY_MEMBER = 'team_invite/already_member' as const;

export const TEAM_INVITE_EMAIL_DO_NOT_MATCH =
  'team_invite/email_do_not_match' as const;

export const TEAM_INVITE_NOT_VALID_VIEWER =
  'team_invite/not_valid_viewer' as const;

export const SHORTCODE_NOT_FOUND = 'shortcode/not_found' as const;

export const SHORTCODE_INVALID_JSON = 'shortcode/invalid_json' as const;

/**
 * Invalid or non-existent TEAM ENVIRONMMENT ID
 * (TeamEnvironmentsService)
 */
export const TEAM_ENVIRONMMENT_NOT_FOUND =
  'team_environment/not_found' as const;

/**
 * The user is not a member of the team of the given environment
 * (GqlTeamEnvTeamGuard)
 */
export const TEAM_ENVIRONMENT_NOT_TEAM_MEMBER =
  'team_environment/not_team_member' as const;

/**
 * Global environment doesnt exists for the user
 * (UserEnvironmentsService)
 */
export const USER_ENVIRONMENT_GLOBAL_ENV_DOESNT_EXISTS =
  'user_environment/global_env_doesnt_exists' as const;
/*

/**
 * Global environment already exists for the user
 * (UserEnvironmentsService)
 */
export const USER_ENVIRONMENT_GLOBAL_ENV_EXISTS =
  'user_environment/global_env_already_exists' as const;
/*

/**
 * User environment doesn't exist for the user
 * (UserEnvironmentsService)
 */
export const USER_ENVIRONMENT_ENV_DOESNT_EXISTS =
  'user_environment/user_env_doesnt_exists' as const;
/*

/**
 * Cannot delete the global user environment
 * (UserEnvironmentsService)
 */
export const USER_ENVIRONMENT_GLOBAL_ENV_DELETION_FAILED =
  'user_environment/user_env_global_env_deletion_failed' as const;
/*

/**
 * User environment is not a global environment
 * (UserEnvironmentsService)
 */
export const USER_ENVIRONMENT_IS_NOT_GLOBAL =
  'user_environment/user_env_is_not_global' as const;
/*

/**
 * User environment update failed
 * (UserEnvironmentsService)
 */
export const USER_ENVIRONMENT_UPDATE_FAILED =
  'user_environment/user_env_update_failed' as const;
/*

 |------------------------------------|
 |Server errors that are actually bugs|
 |------------------------------------|

*/

/**
 * Couldn't find user data from the GraphQL context (Check if GqlAuthGuard is applied)
 * (GqlTeamMemberGuard, GqlCollectionTeamMemberGuard)
 */
export const BUG_AUTH_NO_USER_CTX = 'bug/auth/auth_no_user_ctx' as const;

/**
 * Couldn't find teamID parameter in the attached GraphQL operation. (Check if teamID is present)
 * (GqlTeamMemberGuard, GQLEAAdminGuard, GqlCollectionTeamMemberGuard)
 */
export const BUG_TEAM_NO_TEAM_ID = 'bug/team/no_team_id';

/**
 * Couldn't find RequireTeamRole decorator. (Check if it is applied)
 * (GqlTeamMemberGuard)
 */
export const BUG_TEAM_NO_REQUIRE_TEAM_ROLE = 'bug/team/no_require_team_role';

/**
 * Couldn't find 'collectionID' param to the attached GQL operation. (Check if exists)
 * (GqlCollectionTeamMemberGuard)
 */
export const BUG_TEAM_COLL_NO_COLL_ID = 'bug/team_coll/no_coll_id';

/**
 * Couldn't find 'requestID' param to the attached GQL operation. (Check if exists)
 * (GqlRequestTeamMemberGuard)
 */
export const BUG_TEAM_REQ_NO_REQ_ID = 'bug/team_req/no_req_id';

export const BUG_TEAM_INVITE_NO_INVITE_ID =
  'bug/team_invite/no_invite_id' as const;

/**
 * Couldn't find RequireTeamRole decorator. (Check if it is applied)
 * (GqlTeamEnvTeamGuard)
 */
export const BUG_TEAM_ENV_GUARD_NO_REQUIRE_ROLES =
  'bug/team_env/guard_no_require_roles' as const;

/**
 * Couldn't find 'id' param to the operation. (Check if it is applied)
 * (GqlTeamEnvTeamGuard)
 */
export const BUG_TEAM_ENV_GUARD_NO_ENV_ID =
  'bug/team_env/guard_no_env_id' as const;
