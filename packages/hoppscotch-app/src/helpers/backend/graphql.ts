import { Resolver as GraphCacheResolver, UpdateResolver as GraphCacheUpdateResolver, OptimisticMutationResolver as GraphCacheOptimisticMutationResolver, StorageAdapter as GraphCacheStorageAdapter } from '@urql/exchange-graphcache';
import { IntrospectionData } from '@urql/exchange-graphcache/dist/types/ast';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  DateTime: any;
};

export type CreateTeamRequestInput = {
  /** JSON string representing the request data */
  request: Scalars['String'];
  /** ID of the team the collection belongs to */
  teamID: Scalars['ID'];
  /** Displayed title of the request */
  title: Scalars['String'];
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Accept an Invitation */
  acceptTeamInvitation: TeamMember;
  /**
   * Adds a team member to the team via email
   * @deprecated This is only present for backwards compatibility and will be removed soon use team invitations instead
   */
  addTeamMemberByEmail: TeamMember;
  /** Create a collection that has a parent collection */
  createChildCollection: TeamCollection;
  /** Create a duplicate of an existing environment */
  createDuplicateEnvironment: TeamEnvironment;
  /** Create a request in the given collection. */
  createRequestInCollection: TeamRequest;
  /** Creates a collection at the root of the team hierarchy (no parent collection) */
  createRootCollection: TeamCollection;
  /** Create a shortcode for the given request. */
  createShortcode: Shortcode;
  /** Creates a team owned by the executing user */
  createTeam: Team;
  /** Create a new Team Environment for given Team ID */
  createTeamEnvironment: TeamEnvironment;
  /** Creates a Team Invitation */
  createTeamInvitation: TeamInvitation;
  /** Delete all variables from a Team Environment */
  deleteAllVariablesFromTeamEnvironment: TeamEnvironment;
  /** Delete a collection */
  deleteCollection: Scalars['Boolean'];
  /** Delete a request with the given ID */
  deleteRequest: Scalars['Boolean'];
  /** Deletes the team */
  deleteTeam: Scalars['Boolean'];
  /** Delete a Team Environment for given Team ID */
  deleteTeamEnvironment: Scalars['Boolean'];
  /** Import collection from user firestore */
  importCollectionFromUserFirestore: TeamCollection;
  /** Import collections from JSON string to the specified Team */
  importCollectionsFromJSON: Scalars['Boolean'];
  /** Leaves a team the executing user is a part of */
  leaveTeam: Scalars['Boolean'];
  /** Move a request to the given collection */
  moveRequest: TeamRequest;
  /** Removes the team member from the team */
  removeTeamMember: Scalars['Boolean'];
  /** Rename a collection */
  renameCollection: TeamCollection;
  /** Renames a team */
  renameTeam: Team;
  /** Replace existing collections of a specific team with collections in JSON string */
  replaceCollectionsWithJSON: Scalars['Boolean'];
  /** Revoke a user generated shortcode */
  revokeShortcode: Scalars['Boolean'];
  /** Revokes an invitation and deletes it */
  revokeTeamInvitation: Scalars['Boolean'];
  /** Update a request with the given ID */
  updateRequest: TeamRequest;
  /** Add/Edit a single environment variable or variables to a Team Environment */
  updateTeamEnvironment: TeamEnvironment;
  /** Update role of a team member the executing user owns */
  updateTeamMemberRole: TeamMember;
};


export type MutationAcceptTeamInvitationArgs = {
  inviteID: Scalars['ID'];
};


export type MutationAddTeamMemberByEmailArgs = {
  teamID: Scalars['ID'];
  userEmail: Scalars['String'];
  userRole: TeamMemberRole;
};


export type MutationCreateChildCollectionArgs = {
  childTitle: Scalars['String'];
  collectionID: Scalars['ID'];
};


export type MutationCreateDuplicateEnvironmentArgs = {
  id: Scalars['ID'];
};


export type MutationCreateRequestInCollectionArgs = {
  collectionID: Scalars['ID'];
  data: CreateTeamRequestInput;
};


export type MutationCreateRootCollectionArgs = {
  teamID: Scalars['ID'];
  title: Scalars['String'];
};


export type MutationCreateShortcodeArgs = {
  request: Scalars['String'];
};


export type MutationCreateTeamArgs = {
  name: Scalars['String'];
};


export type MutationCreateTeamEnvironmentArgs = {
  name: Scalars['String'];
  teamID: Scalars['ID'];
  variables: Scalars['String'];
};


export type MutationCreateTeamInvitationArgs = {
  inviteeEmail: Scalars['String'];
  inviteeRole: TeamMemberRole;
  teamID: Scalars['ID'];
};


export type MutationDeleteAllVariablesFromTeamEnvironmentArgs = {
  id: Scalars['ID'];
};


export type MutationDeleteCollectionArgs = {
  collectionID: Scalars['ID'];
};


export type MutationDeleteRequestArgs = {
  requestID: Scalars['ID'];
};


export type MutationDeleteTeamArgs = {
  teamID: Scalars['ID'];
};


export type MutationDeleteTeamEnvironmentArgs = {
  id: Scalars['ID'];
};


export type MutationImportCollectionFromUserFirestoreArgs = {
  fbCollectionPath: Scalars['String'];
  parentCollectionID?: InputMaybe<Scalars['ID']>;
  teamID: Scalars['ID'];
};


export type MutationImportCollectionsFromJsonArgs = {
  jsonString: Scalars['String'];
  parentCollectionID?: InputMaybe<Scalars['ID']>;
  teamID: Scalars['ID'];
};


export type MutationLeaveTeamArgs = {
  teamID: Scalars['ID'];
};


export type MutationMoveRequestArgs = {
  destCollID: Scalars['ID'];
  requestID: Scalars['ID'];
};


export type MutationRemoveTeamMemberArgs = {
  teamID: Scalars['ID'];
  userUid: Scalars['ID'];
};


export type MutationRenameCollectionArgs = {
  collectionID: Scalars['ID'];
  newTitle: Scalars['String'];
};


export type MutationRenameTeamArgs = {
  newName: Scalars['String'];
  teamID: Scalars['ID'];
};


export type MutationReplaceCollectionsWithJsonArgs = {
  jsonString: Scalars['String'];
  parentCollectionID?: InputMaybe<Scalars['ID']>;
  teamID: Scalars['ID'];
};


export type MutationRevokeShortcodeArgs = {
  code: Scalars['ID'];
};


export type MutationRevokeTeamInvitationArgs = {
  inviteID: Scalars['ID'];
};


export type MutationUpdateRequestArgs = {
  data: UpdateTeamRequestInput;
  requestID: Scalars['ID'];
};


export type MutationUpdateTeamEnvironmentArgs = {
  id: Scalars['ID'];
  name: Scalars['String'];
  variables: Scalars['String'];
};


export type MutationUpdateTeamMemberRoleArgs = {
  newRole: TeamMemberRole;
  teamID: Scalars['ID'];
  userUid: Scalars['ID'];
};

export type Query = {
  __typename?: 'Query';
  /** Get a collection with the given ID or null (if not exists) */
  collection?: Maybe<TeamCollection>;
  /**
   * Returns the collections of the team
   * @deprecated Deprecated because of no practical use. Use `rootCollectionsOfTeam` instead.
   */
  collectionsOfTeam: Array<TeamCollection>;
  /** Returns the JSON string giving the collections and their contents of the team */
  exportCollectionsToJSON: Scalars['String'];
  /** Gives details of the user executing this query (pass Authorization 'Bearer' header) */
  me: User;
  /** List all shortcodes the current user has generated */
  myShortcodes: Array<Shortcode>;
  /** List of teams that the executing user belongs to. */
  myTeams: Array<Team>;
  /** Gives a request with the given ID or null (if not exists) */
  request?: Maybe<TeamRequest>;
  /** Gives a list of requests in the collection */
  requestsInCollection: Array<TeamRequest>;
  /** Returns the collections of the team */
  rootCollectionsOfTeam: Array<TeamCollection>;
  /** Search the team for a specific request with title */
  searchForRequest: Array<TeamRequest>;
  /** Resolves and returns a shortcode data */
  shortcode?: Maybe<Shortcode>;
  /** Returns the detail of the team with the given ID */
  team?: Maybe<Team>;
  /** Gets the Team Invitation with the given ID, or null if not exists */
  teamInvitation: TeamInvitation;
  /**
   * Finds a user by their UID or null if no match
   * @deprecated Deprecated due to privacy concerns. Try to get the user from the context-relevant queries
   */
  user?: Maybe<User>;
};


export type QueryCollectionArgs = {
  collectionID: Scalars['ID'];
};


export type QueryCollectionsOfTeamArgs = {
  cursor?: InputMaybe<Scalars['ID']>;
  teamID: Scalars['ID'];
};


export type QueryExportCollectionsToJsonArgs = {
  teamID: Scalars['ID'];
};


export type QueryMyShortcodesArgs = {
  cursor?: InputMaybe<Scalars['ID']>;
};


export type QueryMyTeamsArgs = {
  cursor?: InputMaybe<Scalars['ID']>;
};


export type QueryRequestArgs = {
  requestID: Scalars['ID'];
};


export type QueryRequestsInCollectionArgs = {
  collectionID: Scalars['ID'];
  cursor?: InputMaybe<Scalars['ID']>;
};


export type QueryRootCollectionsOfTeamArgs = {
  cursor?: InputMaybe<Scalars['ID']>;
  teamID: Scalars['ID'];
};


export type QuerySearchForRequestArgs = {
  cursor?: InputMaybe<Scalars['ID']>;
  searchTerm: Scalars['String'];
  teamID: Scalars['ID'];
};


export type QueryShortcodeArgs = {
  code: Scalars['ID'];
};


export type QueryTeamArgs = {
  teamID: Scalars['ID'];
};


export type QueryTeamInvitationArgs = {
  inviteID: Scalars['ID'];
};


export type QueryUserArgs = {
  uid: Scalars['ID'];
};

export type Shortcode = {
  __typename?: 'Shortcode';
  /** Timestamp of when the Shortcode was created */
  createdOn: Scalars['DateTime'];
  /** The shortcode. 12 digit alphanumeric. */
  id: Scalars['ID'];
  /** JSON string representing the request data */
  request: Scalars['String'];
};

export type Subscription = {
  __typename?: 'Subscription';
  /** Listen for shortcode creation */
  myShortcodesCreated: Shortcode;
  /** Listen for shortcode deletion */
  myShortcodesRevoked: Shortcode;
  /** Listen to when a collection has been added to a team. The emitted value is the team added */
  teamCollectionAdded: TeamCollection;
  /** Listen to when a collection has been removed */
  teamCollectionRemoved: Scalars['ID'];
  /** Listen to when a collection has been updated. */
  teamCollectionUpdated: TeamCollection;
  /** Listen for Team Environment Creation Messages */
  teamEnvironmentCreated: TeamEnvironment;
  /** Listen for Team Environment Deletion Messages */
  teamEnvironmentDeleted: TeamEnvironment;
  /** Listen for Team Environment Updates */
  teamEnvironmentUpdated: TeamEnvironment;
  /** Listens to when a Team Invitation is added */
  teamInvitationAdded: TeamInvitation;
  /** Listens to when a Team Invitation is removed */
  teamInvitationRemoved: Scalars['ID'];
  /** Listen to when a new team member being added to the team. The emitted value is the new team member added. */
  teamMemberAdded: TeamMember;
  /** Listen to when a team member has been removed. The emitted value is the uid of the user removed */
  teamMemberRemoved: Scalars['ID'];
  /** Listen to when a team member status has been updated. The emitted value is the new team member status */
  teamMemberUpdated: TeamMember;
  /** Emits when a new request is added to a team */
  teamRequestAdded: TeamRequest;
  /** Emitted when a request has been deleted. Only the id of the request is emitted. */
  teamRequestDeleted: Scalars['ID'];
  /** Emitted when a request has been updated */
  teamRequestUpdated: TeamRequest;
};


export type SubscriptionTeamCollectionAddedArgs = {
  teamID: Scalars['ID'];
};


export type SubscriptionTeamCollectionRemovedArgs = {
  teamID: Scalars['ID'];
};


export type SubscriptionTeamCollectionUpdatedArgs = {
  teamID: Scalars['ID'];
};


export type SubscriptionTeamEnvironmentCreatedArgs = {
  teamID: Scalars['ID'];
};


export type SubscriptionTeamEnvironmentDeletedArgs = {
  teamID: Scalars['ID'];
};


export type SubscriptionTeamEnvironmentUpdatedArgs = {
  teamID: Scalars['ID'];
};


export type SubscriptionTeamInvitationAddedArgs = {
  teamID: Scalars['ID'];
};


export type SubscriptionTeamInvitationRemovedArgs = {
  teamID: Scalars['ID'];
};


export type SubscriptionTeamMemberAddedArgs = {
  teamID: Scalars['ID'];
};


export type SubscriptionTeamMemberRemovedArgs = {
  teamID: Scalars['ID'];
};


export type SubscriptionTeamMemberUpdatedArgs = {
  teamID: Scalars['ID'];
};


export type SubscriptionTeamRequestAddedArgs = {
  teamID: Scalars['ID'];
};


export type SubscriptionTeamRequestDeletedArgs = {
  teamID: Scalars['ID'];
};


export type SubscriptionTeamRequestUpdatedArgs = {
  teamID: Scalars['ID'];
};

export type Team = {
  __typename?: 'Team';
  /** The number of users with the EDITOR role in the team */
  editorsCount: Scalars['Int'];
  /** ID of the team */
  id: Scalars['ID'];
  /** Returns the list of members of a team */
  members: Array<TeamMember>;
  /** The role of the current user in the team */
  myRole: TeamMemberRole;
  /** Displayed name of the team */
  name: Scalars['String'];
  /** The number of users with the OWNER role in the team */
  ownersCount: Scalars['Int'];
  /** Returns all Team Environments for the given Team */
  teamEnvironments: Array<TeamEnvironment>;
  /** Get all the active invites in the team */
  teamInvitations: Array<TeamInvitation>;
  /** Returns the list of members of a team */
  teamMembers: Array<TeamMember>;
  /** The number of users with the VIEWER role in the team */
  viewersCount: Scalars['Int'];
};


export type TeamMembersArgs = {
  cursor?: InputMaybe<Scalars['ID']>;
};

export type TeamCollection = {
  __typename?: 'TeamCollection';
  /** List of children collection */
  children: Array<TeamCollection>;
  /** ID of the collection */
  id: Scalars['ID'];
  /** The collection whom is the parent of this collection (null if this is root collection) */
  parent?: Maybe<TeamCollection>;
  /** Team the collection belongs to */
  team: Team;
  /** Displayed title of the collection */
  title: Scalars['String'];
};


export type TeamCollectionChildrenArgs = {
  cursor?: InputMaybe<Scalars['String']>;
};

export type TeamEnvironment = {
  __typename?: 'TeamEnvironment';
  /** ID of the Team Environment */
  id: Scalars['ID'];
  /** Name of the environment */
  name: Scalars['String'];
  /** ID of the team this environment belongs to */
  teamID: Scalars['ID'];
  /** All variables present in the environment */
  variables: Scalars['String'];
};

export type TeamInvitation = {
  __typename?: 'TeamInvitation';
  /** Get the creator of the invite */
  creator: User;
  /** UID of the creator of the invite */
  creatorUid: Scalars['ID'];
  /** ID of the invite */
  id: Scalars['ID'];
  /** Email of the invitee */
  inviteeEmail: Scalars['ID'];
  /** The role that will be given to the invitee */
  inviteeRole: TeamMemberRole;
  /** Get the team associated to the invite */
  team: Team;
  /** ID of the team the invite is to */
  teamID: Scalars['ID'];
};

export type TeamMember = {
  __typename?: 'TeamMember';
  /** Membership ID of the Team Member */
  membershipID: Scalars['ID'];
  /** Role of the given team member in the given team */
  role: TeamMemberRole;
  user: User;
};

export enum TeamMemberRole {
  Editor = 'EDITOR',
  Owner = 'OWNER',
  Viewer = 'VIEWER'
}

export type TeamRequest = {
  __typename?: 'TeamRequest';
  /** Collection the request belongs to */
  collection: TeamCollection;
  /** ID of the collection the request belongs to. */
  collectionID: Scalars['ID'];
  /** ID of the request */
  id: Scalars['ID'];
  /** JSON string representing the request data */
  request: Scalars['String'];
  /** Team the request belongs to */
  team: Team;
  /** ID of the team the request belongs to. */
  teamID: Scalars['ID'];
  /** Displayed title of the request */
  title: Scalars['String'];
};

export type UpdateTeamRequestInput = {
  /** JSON string representing the request data */
  request?: InputMaybe<Scalars['String']>;
  /** Displayed title of the request */
  title?: InputMaybe<Scalars['String']>;
};

export type User = {
  __typename?: 'User';
  /** Displayed name of the user (if given) */
  displayName?: Maybe<Scalars['String']>;
  /** Email of the user (if given) */
  email?: Maybe<Scalars['String']>;
  /** URL to the profile photo of the user (if given) */
  photoURL?: Maybe<Scalars['String']>;
  /** Firebase UID of the user */
  uid: Scalars['ID'];
};

export type AcceptTeamInvitationMutationVariables = Exact<{
  inviteID: Scalars['ID'];
}>;


export type AcceptTeamInvitationMutation = { __typename?: 'Mutation', acceptTeamInvitation: { __typename?: 'TeamMember', membershipID: string, role: TeamMemberRole, user: { __typename?: 'User', uid: string, displayName?: string | null, photoURL?: string | null, email?: string | null } } };

export type CreateChildCollectionMutationVariables = Exact<{
  childTitle: Scalars['String'];
  collectionID: Scalars['ID'];
}>;


export type CreateChildCollectionMutation = { __typename?: 'Mutation', createChildCollection: { __typename?: 'TeamCollection', id: string } };

export type CreateNewRootCollectionMutationVariables = Exact<{
  title: Scalars['String'];
  teamID: Scalars['ID'];
}>;


export type CreateNewRootCollectionMutation = { __typename?: 'Mutation', createRootCollection: { __typename?: 'TeamCollection', id: string } };

export type CreateRequestInCollectionMutationVariables = Exact<{
  data: CreateTeamRequestInput;
  collectionID: Scalars['ID'];
}>;


export type CreateRequestInCollectionMutation = { __typename?: 'Mutation', createRequestInCollection: { __typename?: 'TeamRequest', id: string, collection: { __typename?: 'TeamCollection', id: string, team: { __typename?: 'Team', id: string, name: string } } } };

export type CreateShortcodeMutationVariables = Exact<{
  request: Scalars['String'];
}>;


export type CreateShortcodeMutation = { __typename?: 'Mutation', createShortcode: { __typename?: 'Shortcode', id: string, request: string } };

export type CreateTeamMutationVariables = Exact<{
  name: Scalars['String'];
}>;


export type CreateTeamMutation = { __typename?: 'Mutation', createTeam: { __typename?: 'Team', id: string, name: string, myRole: TeamMemberRole, ownersCount: number, editorsCount: number, viewersCount: number, members: Array<{ __typename?: 'TeamMember', membershipID: string, role: TeamMemberRole, user: { __typename?: 'User', uid: string, displayName?: string | null, email?: string | null, photoURL?: string | null } }> } };

export type CreateTeamInvitationMutationVariables = Exact<{
  inviteeEmail: Scalars['String'];
  inviteeRole: TeamMemberRole;
  teamID: Scalars['ID'];
}>;


export type CreateTeamInvitationMutation = { __typename?: 'Mutation', createTeamInvitation: { __typename?: 'TeamInvitation', id: string, teamID: string, creatorUid: string, inviteeEmail: string, inviteeRole: TeamMemberRole } };

export type DeleteCollectionMutationVariables = Exact<{
  collectionID: Scalars['ID'];
}>;


export type DeleteCollectionMutation = { __typename?: 'Mutation', deleteCollection: boolean };

export type DeleteRequestMutationVariables = Exact<{
  requestID: Scalars['ID'];
}>;


export type DeleteRequestMutation = { __typename?: 'Mutation', deleteRequest: boolean };

export type DeleteShortcodeMutationVariables = Exact<{
  code: Scalars['ID'];
}>;


export type DeleteShortcodeMutation = { __typename?: 'Mutation', revokeShortcode: boolean };

export type DeleteTeamMutationVariables = Exact<{
  teamID: Scalars['ID'];
}>;


export type DeleteTeamMutation = { __typename?: 'Mutation', deleteTeam: boolean };

export type ImportFromJsonMutationVariables = Exact<{
  jsonString: Scalars['String'];
  teamID: Scalars['ID'];
}>;


export type ImportFromJsonMutation = { __typename?: 'Mutation', importCollectionsFromJSON: boolean };

export type LeaveTeamMutationVariables = Exact<{
  teamID: Scalars['ID'];
}>;


export type LeaveTeamMutation = { __typename?: 'Mutation', leaveTeam: boolean };

export type MoveRestTeamRequestMutationVariables = Exact<{
  requestID: Scalars['ID'];
  collectionID: Scalars['ID'];
}>;


export type MoveRestTeamRequestMutation = { __typename?: 'Mutation', moveRequest: { __typename?: 'TeamRequest', id: string } };

export type RemoveTeamMemberMutationVariables = Exact<{
  userUid: Scalars['ID'];
  teamID: Scalars['ID'];
}>;


export type RemoveTeamMemberMutation = { __typename?: 'Mutation', removeTeamMember: boolean };

export type RenameCollectionMutationVariables = Exact<{
  newTitle: Scalars['String'];
  collectionID: Scalars['ID'];
}>;


export type RenameCollectionMutation = { __typename?: 'Mutation', renameCollection: { __typename?: 'TeamCollection', id: string } };

export type RenameTeamMutationVariables = Exact<{
  newName: Scalars['String'];
  teamID: Scalars['ID'];
}>;


export type RenameTeamMutation = { __typename?: 'Mutation', renameTeam: { __typename?: 'Team', id: string, name: string, teamMembers: Array<{ __typename?: 'TeamMember', membershipID: string, role: TeamMemberRole, user: { __typename?: 'User', uid: string } }> } };

export type RevokeTeamInvitationMutationVariables = Exact<{
  inviteID: Scalars['ID'];
}>;


export type RevokeTeamInvitationMutation = { __typename?: 'Mutation', revokeTeamInvitation: boolean };

export type UpdateRequestMutationVariables = Exact<{
  data: UpdateTeamRequestInput;
  requestID: Scalars['ID'];
}>;


export type UpdateRequestMutation = { __typename?: 'Mutation', updateRequest: { __typename?: 'TeamRequest', id: string, title: string } };

export type UpdateTeamMemberRoleMutationVariables = Exact<{
  newRole: TeamMemberRole;
  userUid: Scalars['ID'];
  teamID: Scalars['ID'];
}>;


export type UpdateTeamMemberRoleMutation = { __typename?: 'Mutation', updateTeamMemberRole: { __typename?: 'TeamMember', membershipID: string, role: TeamMemberRole } };

export type ExportAsJsonQueryVariables = Exact<{
  teamID: Scalars['ID'];
}>;


export type ExportAsJsonQuery = { __typename?: 'Query', exportCollectionsToJSON: string };

export type GetCollectionChildrenQueryVariables = Exact<{
  collectionID: Scalars['ID'];
  cursor?: InputMaybe<Scalars['String']>;
}>;


export type GetCollectionChildrenQuery = { __typename?: 'Query', collection?: { __typename?: 'TeamCollection', children: Array<{ __typename?: 'TeamCollection', id: string, title: string }> } | null };

export type GetCollectionChildrenIDsQueryVariables = Exact<{
  collectionID: Scalars['ID'];
  cursor?: InputMaybe<Scalars['String']>;
}>;


export type GetCollectionChildrenIDsQuery = { __typename?: 'Query', collection?: { __typename?: 'TeamCollection', children: Array<{ __typename?: 'TeamCollection', id: string }> } | null };

export type GetCollectionRequestsQueryVariables = Exact<{
  collectionID: Scalars['ID'];
  cursor?: InputMaybe<Scalars['ID']>;
}>;


export type GetCollectionRequestsQuery = { __typename?: 'Query', requestsInCollection: Array<{ __typename?: 'TeamRequest', id: string, title: string, request: string }> };

export type GetCollectionTitleQueryVariables = Exact<{
  collectionID: Scalars['ID'];
}>;


export type GetCollectionTitleQuery = { __typename?: 'Query', collection?: { __typename?: 'TeamCollection', title: string } | null };

export type GetInviteDetailsQueryVariables = Exact<{
  inviteID: Scalars['ID'];
}>;


export type GetInviteDetailsQuery = { __typename?: 'Query', teamInvitation: { __typename?: 'TeamInvitation', id: string, inviteeEmail: string, inviteeRole: TeamMemberRole, team: { __typename?: 'Team', id: string, name: string }, creator: { __typename?: 'User', uid: string, displayName?: string | null } } };

export type GetUserShortcodesQueryVariables = Exact<{
  cursor?: InputMaybe<Scalars['ID']>;
}>;


export type GetUserShortcodesQuery = { __typename?: 'Query', myShortcodes: Array<{ __typename?: 'Shortcode', id: string, request: string, createdOn: any }> };

export type GetMyTeamsQueryVariables = Exact<{
  cursor?: InputMaybe<Scalars['ID']>;
}>;


export type GetMyTeamsQuery = { __typename?: 'Query', myTeams: Array<{ __typename?: 'Team', id: string, name: string, myRole: TeamMemberRole, ownersCount: number, teamMembers: Array<{ __typename?: 'TeamMember', membershipID: string, role: TeamMemberRole, user: { __typename?: 'User', photoURL?: string | null, displayName?: string | null, email?: string | null, uid: string } }> }> };

export type GetTeamQueryVariables = Exact<{
  teamID: Scalars['ID'];
}>;


export type GetTeamQuery = { __typename?: 'Query', team?: { __typename?: 'Team', id: string, name: string, teamMembers: Array<{ __typename?: 'TeamMember', membershipID: string, role: TeamMemberRole, user: { __typename?: 'User', uid: string, email?: string | null } }> } | null };

export type GetTeamMembersQueryVariables = Exact<{
  teamID: Scalars['ID'];
  cursor?: InputMaybe<Scalars['ID']>;
}>;


export type GetTeamMembersQuery = { __typename?: 'Query', team?: { __typename?: 'Team', members: Array<{ __typename?: 'TeamMember', membershipID: string, role: TeamMemberRole, user: { __typename?: 'User', uid: string, email?: string | null } }> } | null };

export type GetUserInfoQueryVariables = Exact<{ [key: string]: never; }>;


export type GetUserInfoQuery = { __typename?: 'Query', me: { __typename?: 'User', uid: string, displayName?: string | null, email?: string | null, photoURL?: string | null } };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { __typename?: 'Query', me: { __typename?: 'User', uid: string, displayName?: string | null, photoURL?: string | null } };

export type ResolveShortcodeQueryVariables = Exact<{
  code: Scalars['ID'];
}>;


export type ResolveShortcodeQuery = { __typename?: 'Query', shortcode?: { __typename?: 'Shortcode', id: string, request: string } | null };

export type RootCollectionsOfTeamQueryVariables = Exact<{
  teamID: Scalars['ID'];
  cursor?: InputMaybe<Scalars['ID']>;
}>;


export type RootCollectionsOfTeamQuery = { __typename?: 'Query', rootCollectionsOfTeam: Array<{ __typename?: 'TeamCollection', id: string, title: string }> };

export type GetPendingInvitesQueryVariables = Exact<{
  teamID: Scalars['ID'];
}>;


export type GetPendingInvitesQuery = { __typename?: 'Query', team?: { __typename?: 'Team', id: string, teamInvitations: Array<{ __typename?: 'TeamInvitation', inviteeRole: TeamMemberRole, inviteeEmail: string, id: string }> } | null };

export type ShortcodeCreatedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type ShortcodeCreatedSubscription = { __typename?: 'Subscription', myShortcodesCreated: { __typename?: 'Shortcode', id: string, request: string, createdOn: any } };

export type ShortcodeDeletedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type ShortcodeDeletedSubscription = { __typename?: 'Subscription', myShortcodesRevoked: { __typename?: 'Shortcode', id: string } };

export type TeamCollectionAddedSubscriptionVariables = Exact<{
  teamID: Scalars['ID'];
}>;


export type TeamCollectionAddedSubscription = { __typename?: 'Subscription', teamCollectionAdded: { __typename?: 'TeamCollection', id: string, title: string, parent?: { __typename?: 'TeamCollection', id: string } | null } };

export type TeamCollectionRemovedSubscriptionVariables = Exact<{
  teamID: Scalars['ID'];
}>;


export type TeamCollectionRemovedSubscription = { __typename?: 'Subscription', teamCollectionRemoved: string };

export type TeamCollectionUpdatedSubscriptionVariables = Exact<{
  teamID: Scalars['ID'];
}>;


export type TeamCollectionUpdatedSubscription = { __typename?: 'Subscription', teamCollectionUpdated: { __typename?: 'TeamCollection', id: string, title: string, parent?: { __typename?: 'TeamCollection', id: string } | null } };

export type TeamInvitationAddedSubscriptionVariables = Exact<{
  teamID: Scalars['ID'];
}>;


export type TeamInvitationAddedSubscription = { __typename?: 'Subscription', teamInvitationAdded: { __typename?: 'TeamInvitation', id: string } };

export type TeamInvitationRemovedSubscriptionVariables = Exact<{
  teamID: Scalars['ID'];
}>;


export type TeamInvitationRemovedSubscription = { __typename?: 'Subscription', teamInvitationRemoved: string };

export type TeamMemberAddedSubscriptionVariables = Exact<{
  teamID: Scalars['ID'];
}>;


export type TeamMemberAddedSubscription = { __typename?: 'Subscription', teamMemberAdded: { __typename?: 'TeamMember', membershipID: string, role: TeamMemberRole, user: { __typename?: 'User', uid: string, email?: string | null } } };

export type TeamMemberRemovedSubscriptionVariables = Exact<{
  teamID: Scalars['ID'];
}>;


export type TeamMemberRemovedSubscription = { __typename?: 'Subscription', teamMemberRemoved: string };

export type TeamMemberUpdatedSubscriptionVariables = Exact<{
  teamID: Scalars['ID'];
}>;


export type TeamMemberUpdatedSubscription = { __typename?: 'Subscription', teamMemberUpdated: { __typename?: 'TeamMember', membershipID: string, role: TeamMemberRole, user: { __typename?: 'User', uid: string, email?: string | null } } };

export type TeamRequestAddedSubscriptionVariables = Exact<{
  teamID: Scalars['ID'];
}>;


export type TeamRequestAddedSubscription = { __typename?: 'Subscription', teamRequestAdded: { __typename?: 'TeamRequest', id: string, collectionID: string, request: string, title: string } };

export type TeamRequestDeletedSubscriptionVariables = Exact<{
  teamID: Scalars['ID'];
}>;


export type TeamRequestDeletedSubscription = { __typename?: 'Subscription', teamRequestDeleted: string };

export type TeamRequestUpdatedSubscriptionVariables = Exact<{
  teamID: Scalars['ID'];
}>;


export type TeamRequestUpdatedSubscription = { __typename?: 'Subscription', teamRequestUpdated: { __typename?: 'TeamRequest', id: string, collectionID: string, request: string, title: string } };


export const AcceptTeamInvitationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AcceptTeamInvitation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"inviteID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"acceptTeamInvitation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"inviteID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"inviteID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"membershipID"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"uid"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"photoURL"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}}]}}]}}]} as unknown as DocumentNode<AcceptTeamInvitationMutation, AcceptTeamInvitationMutationVariables>;
export const CreateChildCollectionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateChildCollection"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"childTitle"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"collectionID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createChildCollection"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"childTitle"},"value":{"kind":"Variable","name":{"kind":"Name","value":"childTitle"}}},{"kind":"Argument","name":{"kind":"Name","value":"collectionID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"collectionID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<CreateChildCollectionMutation, CreateChildCollectionMutationVariables>;
export const CreateNewRootCollectionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateNewRootCollection"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"title"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createRootCollection"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"title"},"value":{"kind":"Variable","name":{"kind":"Name","value":"title"}}},{"kind":"Argument","name":{"kind":"Name","value":"teamID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<CreateNewRootCollectionMutation, CreateNewRootCollectionMutationVariables>;
export const CreateRequestInCollectionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateRequestInCollection"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateTeamRequestInput"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"collectionID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createRequestInCollection"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}},{"kind":"Argument","name":{"kind":"Name","value":"collectionID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"collectionID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"collection"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"team"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]}}]} as unknown as DocumentNode<CreateRequestInCollectionMutation, CreateRequestInCollectionMutationVariables>;
export const CreateShortcodeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateShortcode"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"request"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createShortcode"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"request"},"value":{"kind":"Variable","name":{"kind":"Name","value":"request"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"request"}}]}}]}}]} as unknown as DocumentNode<CreateShortcodeMutation, CreateShortcodeMutationVariables>;
export const CreateTeamDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateTeam"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createTeam"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"members"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"membershipID"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"uid"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"photoURL"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"myRole"}},{"kind":"Field","name":{"kind":"Name","value":"ownersCount"}},{"kind":"Field","name":{"kind":"Name","value":"editorsCount"}},{"kind":"Field","name":{"kind":"Name","value":"viewersCount"}}]}}]}}]} as unknown as DocumentNode<CreateTeamMutation, CreateTeamMutationVariables>;
export const CreateTeamInvitationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateTeamInvitation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"inviteeEmail"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"inviteeRole"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"TeamMemberRole"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createTeamInvitation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"inviteeRole"},"value":{"kind":"Variable","name":{"kind":"Name","value":"inviteeRole"}}},{"kind":"Argument","name":{"kind":"Name","value":"inviteeEmail"},"value":{"kind":"Variable","name":{"kind":"Name","value":"inviteeEmail"}}},{"kind":"Argument","name":{"kind":"Name","value":"teamID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"teamID"}},{"kind":"Field","name":{"kind":"Name","value":"creatorUid"}},{"kind":"Field","name":{"kind":"Name","value":"inviteeEmail"}},{"kind":"Field","name":{"kind":"Name","value":"inviteeRole"}}]}}]}}]} as unknown as DocumentNode<CreateTeamInvitationMutation, CreateTeamInvitationMutationVariables>;
export const DeleteCollectionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteCollection"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"collectionID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteCollection"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"collectionID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"collectionID"}}}]}]}}]} as unknown as DocumentNode<DeleteCollectionMutation, DeleteCollectionMutationVariables>;
export const DeleteRequestDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteRequest"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"requestID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteRequest"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"requestID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"requestID"}}}]}]}}]} as unknown as DocumentNode<DeleteRequestMutation, DeleteRequestMutationVariables>;
export const DeleteShortcodeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteShortcode"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"code"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"revokeShortcode"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"code"},"value":{"kind":"Variable","name":{"kind":"Name","value":"code"}}}]}]}}]} as unknown as DocumentNode<DeleteShortcodeMutation, DeleteShortcodeMutationVariables>;
export const DeleteTeamDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteTeam"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteTeam"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"teamID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}}}]}]}}]} as unknown as DocumentNode<DeleteTeamMutation, DeleteTeamMutationVariables>;
export const ImportFromJsonDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"importFromJSON"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"jsonString"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"importCollectionsFromJSON"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"jsonString"},"value":{"kind":"Variable","name":{"kind":"Name","value":"jsonString"}}},{"kind":"Argument","name":{"kind":"Name","value":"teamID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}}}]}]}}]} as unknown as DocumentNode<ImportFromJsonMutation, ImportFromJsonMutationVariables>;
export const LeaveTeamDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"LeaveTeam"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"leaveTeam"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"teamID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}}}]}]}}]} as unknown as DocumentNode<LeaveTeamMutation, LeaveTeamMutationVariables>;
export const MoveRestTeamRequestDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MoveRESTTeamRequest"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"requestID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"collectionID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"moveRequest"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"requestID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"requestID"}}},{"kind":"Argument","name":{"kind":"Name","value":"destCollID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"collectionID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<MoveRestTeamRequestMutation, MoveRestTeamRequestMutationVariables>;
export const RemoveTeamMemberDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveTeamMember"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userUid"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeTeamMember"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"userUid"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userUid"}}},{"kind":"Argument","name":{"kind":"Name","value":"teamID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}}}]}]}}]} as unknown as DocumentNode<RemoveTeamMemberMutation, RemoveTeamMemberMutationVariables>;
export const RenameCollectionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RenameCollection"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"newTitle"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"collectionID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"renameCollection"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"newTitle"},"value":{"kind":"Variable","name":{"kind":"Name","value":"newTitle"}}},{"kind":"Argument","name":{"kind":"Name","value":"collectionID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"collectionID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<RenameCollectionMutation, RenameCollectionMutationVariables>;
export const RenameTeamDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RenameTeam"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"newName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"renameTeam"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"newName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"newName"}}},{"kind":"Argument","name":{"kind":"Name","value":"teamID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"teamMembers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"membershipID"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"uid"}}]}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}}]}}]}}]} as unknown as DocumentNode<RenameTeamMutation, RenameTeamMutationVariables>;
export const RevokeTeamInvitationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RevokeTeamInvitation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"inviteID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"revokeTeamInvitation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"inviteID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"inviteID"}}}]}]}}]} as unknown as DocumentNode<RevokeTeamInvitationMutation, RevokeTeamInvitationMutationVariables>;
export const UpdateRequestDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateRequest"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateTeamRequestInput"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"requestID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateRequest"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}},{"kind":"Argument","name":{"kind":"Name","value":"requestID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"requestID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}}]}}]}}]} as unknown as DocumentNode<UpdateRequestMutation, UpdateRequestMutationVariables>;
export const UpdateTeamMemberRoleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateTeamMemberRole"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"newRole"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"TeamMemberRole"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userUid"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateTeamMemberRole"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"newRole"},"value":{"kind":"Variable","name":{"kind":"Name","value":"newRole"}}},{"kind":"Argument","name":{"kind":"Name","value":"userUid"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userUid"}}},{"kind":"Argument","name":{"kind":"Name","value":"teamID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"membershipID"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}}]}}]} as unknown as DocumentNode<UpdateTeamMemberRoleMutation, UpdateTeamMemberRoleMutationVariables>;
export const ExportAsJsonDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ExportAsJSON"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"exportCollectionsToJSON"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"teamID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}}}]}]}}]} as unknown as DocumentNode<ExportAsJsonQuery, ExportAsJsonQueryVariables>;
export const GetCollectionChildrenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCollectionChildren"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"collectionID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"cursor"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"collection"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"collectionID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"collectionID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"children"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"cursor"},"value":{"kind":"Variable","name":{"kind":"Name","value":"cursor"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}}]}}]}}]}}]} as unknown as DocumentNode<GetCollectionChildrenQuery, GetCollectionChildrenQueryVariables>;
export const GetCollectionChildrenIDsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCollectionChildrenIDs"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"collectionID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"cursor"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"collection"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"collectionID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"collectionID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"children"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"cursor"},"value":{"kind":"Variable","name":{"kind":"Name","value":"cursor"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]}}]} as unknown as DocumentNode<GetCollectionChildrenIDsQuery, GetCollectionChildrenIDsQueryVariables>;
export const GetCollectionRequestsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCollectionRequests"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"collectionID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"cursor"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"requestsInCollection"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"collectionID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"collectionID"}}},{"kind":"Argument","name":{"kind":"Name","value":"cursor"},"value":{"kind":"Variable","name":{"kind":"Name","value":"cursor"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"request"}}]}}]}}]} as unknown as DocumentNode<GetCollectionRequestsQuery, GetCollectionRequestsQueryVariables>;
export const GetCollectionTitleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCollectionTitle"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"collectionID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"collection"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"collectionID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"collectionID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}}]}}]}}]} as unknown as DocumentNode<GetCollectionTitleQuery, GetCollectionTitleQueryVariables>;
export const GetInviteDetailsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetInviteDetails"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"inviteID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"teamInvitation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"inviteID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"inviteID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"inviteeEmail"}},{"kind":"Field","name":{"kind":"Name","value":"inviteeRole"}},{"kind":"Field","name":{"kind":"Name","value":"team"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"creator"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"uid"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}}]}}]}}]}}]} as unknown as DocumentNode<GetInviteDetailsQuery, GetInviteDetailsQueryVariables>;
export const GetUserShortcodesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetUserShortcodes"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"cursor"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"myShortcodes"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"cursor"},"value":{"kind":"Variable","name":{"kind":"Name","value":"cursor"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"request"}},{"kind":"Field","name":{"kind":"Name","value":"createdOn"}}]}}]}}]} as unknown as DocumentNode<GetUserShortcodesQuery, GetUserShortcodesQueryVariables>;
export const GetMyTeamsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetMyTeams"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"cursor"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"myTeams"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"cursor"},"value":{"kind":"Variable","name":{"kind":"Name","value":"cursor"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"myRole"}},{"kind":"Field","name":{"kind":"Name","value":"ownersCount"}},{"kind":"Field","name":{"kind":"Name","value":"teamMembers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"membershipID"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"photoURL"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"uid"}}]}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}}]}}]}}]} as unknown as DocumentNode<GetMyTeamsQuery, GetMyTeamsQueryVariables>;
export const GetTeamDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetTeam"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"team"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"teamID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"teamMembers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"membershipID"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"uid"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}}]}}]}}]} as unknown as DocumentNode<GetTeamQuery, GetTeamQueryVariables>;
export const GetTeamMembersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetTeamMembers"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"cursor"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"team"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"teamID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"members"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"cursor"},"value":{"kind":"Variable","name":{"kind":"Name","value":"cursor"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"membershipID"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"uid"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}}]}}]}}]} as unknown as DocumentNode<GetTeamMembersQuery, GetTeamMembersQueryVariables>;
export const GetUserInfoDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetUserInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"uid"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"photoURL"}}]}}]}}]} as unknown as DocumentNode<GetUserInfoQuery, GetUserInfoQueryVariables>;
export const MeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"uid"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"photoURL"}}]}}]}}]} as unknown as DocumentNode<MeQuery, MeQueryVariables>;
export const ResolveShortcodeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ResolveShortcode"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"code"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"shortcode"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"code"},"value":{"kind":"Variable","name":{"kind":"Name","value":"code"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"request"}}]}}]}}]} as unknown as DocumentNode<ResolveShortcodeQuery, ResolveShortcodeQueryVariables>;
export const RootCollectionsOfTeamDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"RootCollectionsOfTeam"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"cursor"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rootCollectionsOfTeam"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"teamID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}}},{"kind":"Argument","name":{"kind":"Name","value":"cursor"},"value":{"kind":"Variable","name":{"kind":"Name","value":"cursor"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}}]}}]}}]} as unknown as DocumentNode<RootCollectionsOfTeamQuery, RootCollectionsOfTeamQueryVariables>;
export const GetPendingInvitesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetPendingInvites"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"team"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"teamID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"teamInvitations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"inviteeRole"}},{"kind":"Field","name":{"kind":"Name","value":"inviteeEmail"}},{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]}}]} as unknown as DocumentNode<GetPendingInvitesQuery, GetPendingInvitesQueryVariables>;
export const ShortcodeCreatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"ShortcodeCreated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"myShortcodesCreated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"request"}},{"kind":"Field","name":{"kind":"Name","value":"createdOn"}}]}}]}}]} as unknown as DocumentNode<ShortcodeCreatedSubscription, ShortcodeCreatedSubscriptionVariables>;
export const ShortcodeDeletedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"ShortcodeDeleted"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"myShortcodesRevoked"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<ShortcodeDeletedSubscription, ShortcodeDeletedSubscriptionVariables>;
export const TeamCollectionAddedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"TeamCollectionAdded"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"teamCollectionAdded"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"teamID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"parent"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]}}]} as unknown as DocumentNode<TeamCollectionAddedSubscription, TeamCollectionAddedSubscriptionVariables>;
export const TeamCollectionRemovedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"TeamCollectionRemoved"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"teamCollectionRemoved"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"teamID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}}}]}]}}]} as unknown as DocumentNode<TeamCollectionRemovedSubscription, TeamCollectionRemovedSubscriptionVariables>;
export const TeamCollectionUpdatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"TeamCollectionUpdated"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"teamCollectionUpdated"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"teamID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"parent"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]}}]} as unknown as DocumentNode<TeamCollectionUpdatedSubscription, TeamCollectionUpdatedSubscriptionVariables>;
export const TeamInvitationAddedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"TeamInvitationAdded"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"teamInvitationAdded"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"teamID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<TeamInvitationAddedSubscription, TeamInvitationAddedSubscriptionVariables>;
export const TeamInvitationRemovedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"TeamInvitationRemoved"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"teamInvitationRemoved"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"teamID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}}}]}]}}]} as unknown as DocumentNode<TeamInvitationRemovedSubscription, TeamInvitationRemovedSubscriptionVariables>;
export const TeamMemberAddedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"TeamMemberAdded"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"teamMemberAdded"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"teamID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"membershipID"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"uid"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}}]}}]} as unknown as DocumentNode<TeamMemberAddedSubscription, TeamMemberAddedSubscriptionVariables>;
export const TeamMemberRemovedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"TeamMemberRemoved"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"teamMemberRemoved"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"teamID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}}}]}]}}]} as unknown as DocumentNode<TeamMemberRemovedSubscription, TeamMemberRemovedSubscriptionVariables>;
export const TeamMemberUpdatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"TeamMemberUpdated"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"teamMemberUpdated"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"teamID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"membershipID"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"uid"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}}]}}]} as unknown as DocumentNode<TeamMemberUpdatedSubscription, TeamMemberUpdatedSubscriptionVariables>;
export const TeamRequestAddedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"TeamRequestAdded"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"teamRequestAdded"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"teamID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"collectionID"}},{"kind":"Field","name":{"kind":"Name","value":"request"}},{"kind":"Field","name":{"kind":"Name","value":"title"}}]}}]}}]} as unknown as DocumentNode<TeamRequestAddedSubscription, TeamRequestAddedSubscriptionVariables>;
export const TeamRequestDeletedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"TeamRequestDeleted"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"teamRequestDeleted"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"teamID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}}}]}]}}]} as unknown as DocumentNode<TeamRequestDeletedSubscription, TeamRequestDeletedSubscriptionVariables>;
export const TeamRequestUpdatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"TeamRequestUpdated"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"teamRequestUpdated"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"teamID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"collectionID"}},{"kind":"Field","name":{"kind":"Name","value":"request"}},{"kind":"Field","name":{"kind":"Name","value":"title"}}]}}]}}]} as unknown as DocumentNode<TeamRequestUpdatedSubscription, TeamRequestUpdatedSubscriptionVariables>;
export type WithTypename<T extends { __typename?: any }> = Partial<T> & { __typename: NonNullable<T['__typename']> };

export type GraphCacheKeysConfig = {
  Shortcode?: (data: WithTypename<Shortcode>) => null | string,
  Team?: (data: WithTypename<Team>) => null | string,
  TeamCollection?: (data: WithTypename<TeamCollection>) => null | string,
  TeamEnvironment?: (data: WithTypename<TeamEnvironment>) => null | string,
  TeamInvitation?: (data: WithTypename<TeamInvitation>) => null | string,
  TeamMember?: (data: WithTypename<TeamMember>) => null | string,
  TeamRequest?: (data: WithTypename<TeamRequest>) => null | string,
  User?: (data: WithTypename<User>) => null | string
}

export type GraphCacheResolvers = {
  Query?: {
    collection?: GraphCacheResolver<WithTypename<Query>, QueryCollectionArgs, WithTypename<TeamCollection> | string>,
    collectionsOfTeam?: GraphCacheResolver<WithTypename<Query>, QueryCollectionsOfTeamArgs, Array<WithTypename<TeamCollection> | string>>,
    exportCollectionsToJSON?: GraphCacheResolver<WithTypename<Query>, QueryExportCollectionsToJsonArgs, Scalars['String'] | string>,
    me?: GraphCacheResolver<WithTypename<Query>, Record<string, never>, WithTypename<User> | string>,
    myShortcodes?: GraphCacheResolver<WithTypename<Query>, QueryMyShortcodesArgs, Array<WithTypename<Shortcode> | string>>,
    myTeams?: GraphCacheResolver<WithTypename<Query>, QueryMyTeamsArgs, Array<WithTypename<Team> | string>>,
    request?: GraphCacheResolver<WithTypename<Query>, QueryRequestArgs, WithTypename<TeamRequest> | string>,
    requestsInCollection?: GraphCacheResolver<WithTypename<Query>, QueryRequestsInCollectionArgs, Array<WithTypename<TeamRequest> | string>>,
    rootCollectionsOfTeam?: GraphCacheResolver<WithTypename<Query>, QueryRootCollectionsOfTeamArgs, Array<WithTypename<TeamCollection> | string>>,
    searchForRequest?: GraphCacheResolver<WithTypename<Query>, QuerySearchForRequestArgs, Array<WithTypename<TeamRequest> | string>>,
    shortcode?: GraphCacheResolver<WithTypename<Query>, QueryShortcodeArgs, WithTypename<Shortcode> | string>,
    team?: GraphCacheResolver<WithTypename<Query>, QueryTeamArgs, WithTypename<Team> | string>,
    teamInvitation?: GraphCacheResolver<WithTypename<Query>, QueryTeamInvitationArgs, WithTypename<TeamInvitation> | string>,
    user?: GraphCacheResolver<WithTypename<Query>, QueryUserArgs, WithTypename<User> | string>
  },
  Shortcode?: {
    createdOn?: GraphCacheResolver<WithTypename<Shortcode>, Record<string, never>, Scalars['DateTime'] | string>,
    id?: GraphCacheResolver<WithTypename<Shortcode>, Record<string, never>, Scalars['ID'] | string>,
    request?: GraphCacheResolver<WithTypename<Shortcode>, Record<string, never>, Scalars['String'] | string>
  },
  Team?: {
    editorsCount?: GraphCacheResolver<WithTypename<Team>, Record<string, never>, Scalars['Int'] | string>,
    id?: GraphCacheResolver<WithTypename<Team>, Record<string, never>, Scalars['ID'] | string>,
    members?: GraphCacheResolver<WithTypename<Team>, TeamMembersArgs, Array<WithTypename<TeamMember> | string>>,
    myRole?: GraphCacheResolver<WithTypename<Team>, Record<string, never>, TeamMemberRole | string>,
    name?: GraphCacheResolver<WithTypename<Team>, Record<string, never>, Scalars['String'] | string>,
    ownersCount?: GraphCacheResolver<WithTypename<Team>, Record<string, never>, Scalars['Int'] | string>,
    teamEnvironments?: GraphCacheResolver<WithTypename<Team>, Record<string, never>, Array<WithTypename<TeamEnvironment> | string>>,
    teamInvitations?: GraphCacheResolver<WithTypename<Team>, Record<string, never>, Array<WithTypename<TeamInvitation> | string>>,
    teamMembers?: GraphCacheResolver<WithTypename<Team>, Record<string, never>, Array<WithTypename<TeamMember> | string>>,
    viewersCount?: GraphCacheResolver<WithTypename<Team>, Record<string, never>, Scalars['Int'] | string>
  },
  TeamCollection?: {
    children?: GraphCacheResolver<WithTypename<TeamCollection>, TeamCollectionChildrenArgs, Array<WithTypename<TeamCollection> | string>>,
    id?: GraphCacheResolver<WithTypename<TeamCollection>, Record<string, never>, Scalars['ID'] | string>,
    parent?: GraphCacheResolver<WithTypename<TeamCollection>, Record<string, never>, WithTypename<TeamCollection> | string>,
    team?: GraphCacheResolver<WithTypename<TeamCollection>, Record<string, never>, WithTypename<Team> | string>,
    title?: GraphCacheResolver<WithTypename<TeamCollection>, Record<string, never>, Scalars['String'] | string>
  },
  TeamEnvironment?: {
    id?: GraphCacheResolver<WithTypename<TeamEnvironment>, Record<string, never>, Scalars['ID'] | string>,
    name?: GraphCacheResolver<WithTypename<TeamEnvironment>, Record<string, never>, Scalars['String'] | string>,
    teamID?: GraphCacheResolver<WithTypename<TeamEnvironment>, Record<string, never>, Scalars['ID'] | string>,
    variables?: GraphCacheResolver<WithTypename<TeamEnvironment>, Record<string, never>, Scalars['String'] | string>
  },
  TeamInvitation?: {
    creator?: GraphCacheResolver<WithTypename<TeamInvitation>, Record<string, never>, WithTypename<User> | string>,
    creatorUid?: GraphCacheResolver<WithTypename<TeamInvitation>, Record<string, never>, Scalars['ID'] | string>,
    id?: GraphCacheResolver<WithTypename<TeamInvitation>, Record<string, never>, Scalars['ID'] | string>,
    inviteeEmail?: GraphCacheResolver<WithTypename<TeamInvitation>, Record<string, never>, Scalars['ID'] | string>,
    inviteeRole?: GraphCacheResolver<WithTypename<TeamInvitation>, Record<string, never>, TeamMemberRole | string>,
    team?: GraphCacheResolver<WithTypename<TeamInvitation>, Record<string, never>, WithTypename<Team> | string>,
    teamID?: GraphCacheResolver<WithTypename<TeamInvitation>, Record<string, never>, Scalars['ID'] | string>
  },
  TeamMember?: {
    membershipID?: GraphCacheResolver<WithTypename<TeamMember>, Record<string, never>, Scalars['ID'] | string>,
    role?: GraphCacheResolver<WithTypename<TeamMember>, Record<string, never>, TeamMemberRole | string>,
    user?: GraphCacheResolver<WithTypename<TeamMember>, Record<string, never>, WithTypename<User> | string>
  },
  TeamRequest?: {
    collection?: GraphCacheResolver<WithTypename<TeamRequest>, Record<string, never>, WithTypename<TeamCollection> | string>,
    collectionID?: GraphCacheResolver<WithTypename<TeamRequest>, Record<string, never>, Scalars['ID'] | string>,
    id?: GraphCacheResolver<WithTypename<TeamRequest>, Record<string, never>, Scalars['ID'] | string>,
    request?: GraphCacheResolver<WithTypename<TeamRequest>, Record<string, never>, Scalars['String'] | string>,
    team?: GraphCacheResolver<WithTypename<TeamRequest>, Record<string, never>, WithTypename<Team> | string>,
    teamID?: GraphCacheResolver<WithTypename<TeamRequest>, Record<string, never>, Scalars['ID'] | string>,
    title?: GraphCacheResolver<WithTypename<TeamRequest>, Record<string, never>, Scalars['String'] | string>
  },
  User?: {
    displayName?: GraphCacheResolver<WithTypename<User>, Record<string, never>, Scalars['String'] | string>,
    email?: GraphCacheResolver<WithTypename<User>, Record<string, never>, Scalars['String'] | string>,
    photoURL?: GraphCacheResolver<WithTypename<User>, Record<string, never>, Scalars['String'] | string>,
    uid?: GraphCacheResolver<WithTypename<User>, Record<string, never>, Scalars['ID'] | string>
  }
};

export type GraphCacheOptimisticUpdaters = {
  acceptTeamInvitation?: GraphCacheOptimisticMutationResolver<MutationAcceptTeamInvitationArgs, WithTypename<TeamMember>>,
  addTeamMemberByEmail?: GraphCacheOptimisticMutationResolver<MutationAddTeamMemberByEmailArgs, WithTypename<TeamMember>>,
  createChildCollection?: GraphCacheOptimisticMutationResolver<MutationCreateChildCollectionArgs, WithTypename<TeamCollection>>,
  createDuplicateEnvironment?: GraphCacheOptimisticMutationResolver<MutationCreateDuplicateEnvironmentArgs, WithTypename<TeamEnvironment>>,
  createRequestInCollection?: GraphCacheOptimisticMutationResolver<MutationCreateRequestInCollectionArgs, WithTypename<TeamRequest>>,
  createRootCollection?: GraphCacheOptimisticMutationResolver<MutationCreateRootCollectionArgs, WithTypename<TeamCollection>>,
  createShortcode?: GraphCacheOptimisticMutationResolver<MutationCreateShortcodeArgs, WithTypename<Shortcode>>,
  createTeam?: GraphCacheOptimisticMutationResolver<MutationCreateTeamArgs, WithTypename<Team>>,
  createTeamEnvironment?: GraphCacheOptimisticMutationResolver<MutationCreateTeamEnvironmentArgs, WithTypename<TeamEnvironment>>,
  createTeamInvitation?: GraphCacheOptimisticMutationResolver<MutationCreateTeamInvitationArgs, WithTypename<TeamInvitation>>,
  deleteAllVariablesFromTeamEnvironment?: GraphCacheOptimisticMutationResolver<MutationDeleteAllVariablesFromTeamEnvironmentArgs, WithTypename<TeamEnvironment>>,
  deleteCollection?: GraphCacheOptimisticMutationResolver<MutationDeleteCollectionArgs, Scalars['Boolean']>,
  deleteRequest?: GraphCacheOptimisticMutationResolver<MutationDeleteRequestArgs, Scalars['Boolean']>,
  deleteTeam?: GraphCacheOptimisticMutationResolver<MutationDeleteTeamArgs, Scalars['Boolean']>,
  deleteTeamEnvironment?: GraphCacheOptimisticMutationResolver<MutationDeleteTeamEnvironmentArgs, Scalars['Boolean']>,
  importCollectionFromUserFirestore?: GraphCacheOptimisticMutationResolver<MutationImportCollectionFromUserFirestoreArgs, WithTypename<TeamCollection>>,
  importCollectionsFromJSON?: GraphCacheOptimisticMutationResolver<MutationImportCollectionsFromJsonArgs, Scalars['Boolean']>,
  leaveTeam?: GraphCacheOptimisticMutationResolver<MutationLeaveTeamArgs, Scalars['Boolean']>,
  moveRequest?: GraphCacheOptimisticMutationResolver<MutationMoveRequestArgs, WithTypename<TeamRequest>>,
  removeTeamMember?: GraphCacheOptimisticMutationResolver<MutationRemoveTeamMemberArgs, Scalars['Boolean']>,
  renameCollection?: GraphCacheOptimisticMutationResolver<MutationRenameCollectionArgs, WithTypename<TeamCollection>>,
  renameTeam?: GraphCacheOptimisticMutationResolver<MutationRenameTeamArgs, WithTypename<Team>>,
  replaceCollectionsWithJSON?: GraphCacheOptimisticMutationResolver<MutationReplaceCollectionsWithJsonArgs, Scalars['Boolean']>,
  revokeShortcode?: GraphCacheOptimisticMutationResolver<MutationRevokeShortcodeArgs, Scalars['Boolean']>,
  revokeTeamInvitation?: GraphCacheOptimisticMutationResolver<MutationRevokeTeamInvitationArgs, Scalars['Boolean']>,
  updateRequest?: GraphCacheOptimisticMutationResolver<MutationUpdateRequestArgs, WithTypename<TeamRequest>>,
  updateTeamEnvironment?: GraphCacheOptimisticMutationResolver<MutationUpdateTeamEnvironmentArgs, WithTypename<TeamEnvironment>>,
  updateTeamMemberRole?: GraphCacheOptimisticMutationResolver<MutationUpdateTeamMemberRoleArgs, WithTypename<TeamMember>>
};

export type GraphCacheUpdaters = {
  Mutation?: {
    acceptTeamInvitation?: GraphCacheUpdateResolver<{ acceptTeamInvitation: WithTypename<TeamMember> }, MutationAcceptTeamInvitationArgs>,
    addTeamMemberByEmail?: GraphCacheUpdateResolver<{ addTeamMemberByEmail: WithTypename<TeamMember> }, MutationAddTeamMemberByEmailArgs>,
    createChildCollection?: GraphCacheUpdateResolver<{ createChildCollection: WithTypename<TeamCollection> }, MutationCreateChildCollectionArgs>,
    createDuplicateEnvironment?: GraphCacheUpdateResolver<{ createDuplicateEnvironment: WithTypename<TeamEnvironment> }, MutationCreateDuplicateEnvironmentArgs>,
    createRequestInCollection?: GraphCacheUpdateResolver<{ createRequestInCollection: WithTypename<TeamRequest> }, MutationCreateRequestInCollectionArgs>,
    createRootCollection?: GraphCacheUpdateResolver<{ createRootCollection: WithTypename<TeamCollection> }, MutationCreateRootCollectionArgs>,
    createShortcode?: GraphCacheUpdateResolver<{ createShortcode: WithTypename<Shortcode> }, MutationCreateShortcodeArgs>,
    createTeam?: GraphCacheUpdateResolver<{ createTeam: WithTypename<Team> }, MutationCreateTeamArgs>,
    createTeamEnvironment?: GraphCacheUpdateResolver<{ createTeamEnvironment: WithTypename<TeamEnvironment> }, MutationCreateTeamEnvironmentArgs>,
    createTeamInvitation?: GraphCacheUpdateResolver<{ createTeamInvitation: WithTypename<TeamInvitation> }, MutationCreateTeamInvitationArgs>,
    deleteAllVariablesFromTeamEnvironment?: GraphCacheUpdateResolver<{ deleteAllVariablesFromTeamEnvironment: WithTypename<TeamEnvironment> }, MutationDeleteAllVariablesFromTeamEnvironmentArgs>,
    deleteCollection?: GraphCacheUpdateResolver<{ deleteCollection: Scalars['Boolean'] }, MutationDeleteCollectionArgs>,
    deleteRequest?: GraphCacheUpdateResolver<{ deleteRequest: Scalars['Boolean'] }, MutationDeleteRequestArgs>,
    deleteTeam?: GraphCacheUpdateResolver<{ deleteTeam: Scalars['Boolean'] }, MutationDeleteTeamArgs>,
    deleteTeamEnvironment?: GraphCacheUpdateResolver<{ deleteTeamEnvironment: Scalars['Boolean'] }, MutationDeleteTeamEnvironmentArgs>,
    importCollectionFromUserFirestore?: GraphCacheUpdateResolver<{ importCollectionFromUserFirestore: WithTypename<TeamCollection> }, MutationImportCollectionFromUserFirestoreArgs>,
    importCollectionsFromJSON?: GraphCacheUpdateResolver<{ importCollectionsFromJSON: Scalars['Boolean'] }, MutationImportCollectionsFromJsonArgs>,
    leaveTeam?: GraphCacheUpdateResolver<{ leaveTeam: Scalars['Boolean'] }, MutationLeaveTeamArgs>,
    moveRequest?: GraphCacheUpdateResolver<{ moveRequest: WithTypename<TeamRequest> }, MutationMoveRequestArgs>,
    removeTeamMember?: GraphCacheUpdateResolver<{ removeTeamMember: Scalars['Boolean'] }, MutationRemoveTeamMemberArgs>,
    renameCollection?: GraphCacheUpdateResolver<{ renameCollection: WithTypename<TeamCollection> }, MutationRenameCollectionArgs>,
    renameTeam?: GraphCacheUpdateResolver<{ renameTeam: WithTypename<Team> }, MutationRenameTeamArgs>,
    replaceCollectionsWithJSON?: GraphCacheUpdateResolver<{ replaceCollectionsWithJSON: Scalars['Boolean'] }, MutationReplaceCollectionsWithJsonArgs>,
    revokeShortcode?: GraphCacheUpdateResolver<{ revokeShortcode: Scalars['Boolean'] }, MutationRevokeShortcodeArgs>,
    revokeTeamInvitation?: GraphCacheUpdateResolver<{ revokeTeamInvitation: Scalars['Boolean'] }, MutationRevokeTeamInvitationArgs>,
    updateRequest?: GraphCacheUpdateResolver<{ updateRequest: WithTypename<TeamRequest> }, MutationUpdateRequestArgs>,
    updateTeamEnvironment?: GraphCacheUpdateResolver<{ updateTeamEnvironment: WithTypename<TeamEnvironment> }, MutationUpdateTeamEnvironmentArgs>,
    updateTeamMemberRole?: GraphCacheUpdateResolver<{ updateTeamMemberRole: WithTypename<TeamMember> }, MutationUpdateTeamMemberRoleArgs>
  },
  Subscription?: {
    myShortcodesCreated?: GraphCacheUpdateResolver<{ myShortcodesCreated: WithTypename<Shortcode> }, Record<string, never>>,
    myShortcodesRevoked?: GraphCacheUpdateResolver<{ myShortcodesRevoked: WithTypename<Shortcode> }, Record<string, never>>,
    teamCollectionAdded?: GraphCacheUpdateResolver<{ teamCollectionAdded: WithTypename<TeamCollection> }, SubscriptionTeamCollectionAddedArgs>,
    teamCollectionRemoved?: GraphCacheUpdateResolver<{ teamCollectionRemoved: Scalars['ID'] }, SubscriptionTeamCollectionRemovedArgs>,
    teamCollectionUpdated?: GraphCacheUpdateResolver<{ teamCollectionUpdated: WithTypename<TeamCollection> }, SubscriptionTeamCollectionUpdatedArgs>,
    teamEnvironmentCreated?: GraphCacheUpdateResolver<{ teamEnvironmentCreated: WithTypename<TeamEnvironment> }, SubscriptionTeamEnvironmentCreatedArgs>,
    teamEnvironmentDeleted?: GraphCacheUpdateResolver<{ teamEnvironmentDeleted: WithTypename<TeamEnvironment> }, SubscriptionTeamEnvironmentDeletedArgs>,
    teamEnvironmentUpdated?: GraphCacheUpdateResolver<{ teamEnvironmentUpdated: WithTypename<TeamEnvironment> }, SubscriptionTeamEnvironmentUpdatedArgs>,
    teamInvitationAdded?: GraphCacheUpdateResolver<{ teamInvitationAdded: WithTypename<TeamInvitation> }, SubscriptionTeamInvitationAddedArgs>,
    teamInvitationRemoved?: GraphCacheUpdateResolver<{ teamInvitationRemoved: Scalars['ID'] }, SubscriptionTeamInvitationRemovedArgs>,
    teamMemberAdded?: GraphCacheUpdateResolver<{ teamMemberAdded: WithTypename<TeamMember> }, SubscriptionTeamMemberAddedArgs>,
    teamMemberRemoved?: GraphCacheUpdateResolver<{ teamMemberRemoved: Scalars['ID'] }, SubscriptionTeamMemberRemovedArgs>,
    teamMemberUpdated?: GraphCacheUpdateResolver<{ teamMemberUpdated: WithTypename<TeamMember> }, SubscriptionTeamMemberUpdatedArgs>,
    teamRequestAdded?: GraphCacheUpdateResolver<{ teamRequestAdded: WithTypename<TeamRequest> }, SubscriptionTeamRequestAddedArgs>,
    teamRequestDeleted?: GraphCacheUpdateResolver<{ teamRequestDeleted: Scalars['ID'] }, SubscriptionTeamRequestDeletedArgs>,
    teamRequestUpdated?: GraphCacheUpdateResolver<{ teamRequestUpdated: WithTypename<TeamRequest> }, SubscriptionTeamRequestUpdatedArgs>
  },
};

export type GraphCacheConfig = {
  schema?: IntrospectionData,
  updates?: GraphCacheUpdaters,
  keys?: GraphCacheKeysConfig,
  optimistic?: GraphCacheOptimisticUpdaters,
  resolvers?: GraphCacheResolvers,
  storage?: GraphCacheStorageAdapter
};