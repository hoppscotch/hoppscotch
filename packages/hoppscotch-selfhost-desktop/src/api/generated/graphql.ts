/* eslint-disable */ // Auto-generated file (DO NOT EDIT!!!), refer gql-codegen.yml

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

export type Admin = {
  __typename?: 'Admin';
  admins: Array<User>;
  allTeams: Array<Team>;
  allUsers: Array<User>;
  collectionCountInTeam: Scalars['Int'];
  environmentCountInTeam: Scalars['Int'];
  invitedUsers: Array<InvitedUser>;
  membersCountInTeam: Scalars['Int'];
  pendingInvitationCountInTeam: Array<TeamInvitation>;
  requestCountInTeam: Scalars['Int'];
  teamCollectionsCount: Scalars['Int'];
  teamInfo: Team;
  teamRequestsCount: Scalars['Int'];
  teamsCount: Scalars['Int'];
  userInfo: User;
  usersCount: Scalars['Int'];
};


export type AdminAllTeamsArgs = {
  cursor?: InputMaybe<Scalars['ID']>;
  take?: InputMaybe<Scalars['Int']>;
};


export type AdminAllUsersArgs = {
  cursor?: InputMaybe<Scalars['ID']>;
  take?: InputMaybe<Scalars['Int']>;
};


export type AdminCollectionCountInTeamArgs = {
  teamID: Scalars['ID'];
};


export type AdminEnvironmentCountInTeamArgs = {
  teamID: Scalars['ID'];
};


export type AdminMembersCountInTeamArgs = {
  teamID: Scalars['ID'];
};


export type AdminPendingInvitationCountInTeamArgs = {
  teamID: Scalars['ID'];
};


export type AdminRequestCountInTeamArgs = {
  teamID: Scalars['ID'];
};


export type AdminTeamInfoArgs = {
  teamID: Scalars['ID'];
};


export type AdminUserInfoArgs = {
  userUid: Scalars['ID'];
};

export type CollectionReorderData = {
  __typename?: 'CollectionReorderData';
  collection: TeamCollection;
  nextCollection?: Maybe<TeamCollection>;
};

export type CreateTeamRequestInput = {
  request: Scalars['String'];
  teamID: Scalars['ID'];
  title: Scalars['String'];
};

export type InvitedUser = {
  __typename?: 'InvitedUser';
  adminEmail: Scalars['String'];
  adminUid: Scalars['ID'];
  invitedOn: Scalars['DateTime'];
  inviteeEmail: Scalars['String'];
};

export type Mutation = {
  __typename?: 'Mutation';
  acceptTeamInvitation: TeamMember;
  addUserToTeamByAdmin: TeamMember;
  changeUserRoleInTeamByAdmin: TeamMember;
  clearGlobalEnvironments: UserEnvironment;
  createChildCollection: TeamCollection;
  createDuplicateEnvironment: TeamEnvironment;
  createGQLChildUserCollection: UserCollection;
  createGQLRootUserCollection: UserCollection;
  createGQLUserRequest: UserRequest;
  createRESTChildUserCollection: UserCollection;
  createRESTRootUserCollection: UserCollection;
  createRESTUserRequest: UserRequest;
  createRequestInCollection: TeamRequest;
  createRootCollection: TeamCollection;
  createShortcode: Shortcode;
  createTeam: Team;
  createTeamByAdmin: Team;
  createTeamEnvironment: TeamEnvironment;
  createTeamInvitation: TeamInvitation;
  createUserEnvironment: UserEnvironment;
  createUserGlobalEnvironment: UserEnvironment;
  createUserHistory: UserHistory;
  createUserSettings: UserSettings;
  deleteAllUserHistory: UserHistoryDeletedManyData;
  deleteAllVariablesFromTeamEnvironment: TeamEnvironment;
  deleteCollection: Scalars['Boolean'];
  deleteRequest: Scalars['Boolean'];
  deleteTeam: Scalars['Boolean'];
  deleteTeamByAdmin: Scalars['Boolean'];
  deleteTeamEnvironment: Scalars['Boolean'];
  deleteUser: Scalars['Boolean'];
  deleteUserCollection: Scalars['Boolean'];
  deleteUserEnvironment: Scalars['Boolean'];
  deleteUserEnvironments: Scalars['Int'];
  deleteUserRequest: Scalars['Boolean'];
  importCollectionsFromJSON: Scalars['Boolean'];
  importUserCollectionsFromJSON: Scalars['Boolean'];
  inviteNewUser: InvitedUser;
  leaveTeam: Scalars['Boolean'];
  makeUserAdmin: Scalars['Boolean'];
  moveCollection: TeamCollection;
  moveRequest: TeamRequest;
  moveUserCollection: UserCollection;
  moveUserRequest: UserRequest;
  removeRequestFromHistory: UserHistory;
  removeTeamMember: Scalars['Boolean'];
  removeUserAsAdmin: Scalars['Boolean'];
  removeUserByAdmin: Scalars['Boolean'];
  removeUserFromTeamByAdmin: Scalars['Boolean'];
  renameCollection: TeamCollection;
  renameTeam: Team;
  renameTeamByAdmin: Team;
  renameUserCollection: UserCollection;
  replaceCollectionsWithJSON: Scalars['Boolean'];
  revokeShortcode: Scalars['Boolean'];
  revokeTeamInvitation: Scalars['Boolean'];
  toggleHistoryStarStatus: UserHistory;
  updateCollectionOrder: Scalars['Boolean'];
  updateGQLUserRequest: UserRequest;
  updateLookUpRequestOrder: Scalars['Boolean'];
  updateRESTUserRequest: UserRequest;
  updateRequest: TeamRequest;
  updateTeamEnvironment: TeamEnvironment;
  updateTeamMemberRole: TeamMember;
  updateUserCollectionOrder: Scalars['Boolean'];
  updateUserEnvironment: UserEnvironment;
  updateUserSessions: User;
  updateUserSettings: UserSettings;
};


export type MutationAcceptTeamInvitationArgs = {
  inviteID: Scalars['ID'];
};


export type MutationAddUserToTeamByAdminArgs = {
  role: TeamMemberRole;
  teamID: Scalars['ID'];
  userEmail: Scalars['String'];
};


export type MutationChangeUserRoleInTeamByAdminArgs = {
  newRole: TeamMemberRole;
  teamID: Scalars['ID'];
  userUID: Scalars['ID'];
};


export type MutationClearGlobalEnvironmentsArgs = {
  id: Scalars['ID'];
};


export type MutationCreateChildCollectionArgs = {
  childTitle: Scalars['String'];
  collectionID: Scalars['ID'];
};


export type MutationCreateDuplicateEnvironmentArgs = {
  id: Scalars['ID'];
};


export type MutationCreateGqlChildUserCollectionArgs = {
  parentUserCollectionID: Scalars['ID'];
  title: Scalars['String'];
};


export type MutationCreateGqlRootUserCollectionArgs = {
  title: Scalars['String'];
};


export type MutationCreateGqlUserRequestArgs = {
  collectionID: Scalars['ID'];
  request: Scalars['String'];
  title: Scalars['String'];
};


export type MutationCreateRestChildUserCollectionArgs = {
  parentUserCollectionID: Scalars['ID'];
  title: Scalars['String'];
};


export type MutationCreateRestRootUserCollectionArgs = {
  title: Scalars['String'];
};


export type MutationCreateRestUserRequestArgs = {
  collectionID: Scalars['ID'];
  request: Scalars['String'];
  title: Scalars['String'];
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


export type MutationCreateTeamByAdminArgs = {
  name: Scalars['String'];
  userUid: Scalars['ID'];
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


export type MutationCreateUserEnvironmentArgs = {
  name: Scalars['String'];
  variables: Scalars['String'];
};


export type MutationCreateUserGlobalEnvironmentArgs = {
  variables: Scalars['String'];
};


export type MutationCreateUserHistoryArgs = {
  reqData: Scalars['String'];
  reqType: ReqType;
  resMetadata: Scalars['String'];
};


export type MutationCreateUserSettingsArgs = {
  properties: Scalars['String'];
};


export type MutationDeleteAllUserHistoryArgs = {
  reqType: ReqType;
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


export type MutationDeleteTeamByAdminArgs = {
  teamID: Scalars['ID'];
};


export type MutationDeleteTeamEnvironmentArgs = {
  id: Scalars['ID'];
};


export type MutationDeleteUserCollectionArgs = {
  userCollectionID: Scalars['ID'];
};


export type MutationDeleteUserEnvironmentArgs = {
  id: Scalars['ID'];
};


export type MutationDeleteUserRequestArgs = {
  id: Scalars['ID'];
};


export type MutationImportCollectionsFromJsonArgs = {
  jsonString: Scalars['String'];
  parentCollectionID?: InputMaybe<Scalars['ID']>;
  teamID: Scalars['ID'];
};


export type MutationImportUserCollectionsFromJsonArgs = {
  jsonString: Scalars['String'];
  parentCollectionID?: InputMaybe<Scalars['ID']>;
  reqType: ReqType;
};


export type MutationInviteNewUserArgs = {
  inviteeEmail: Scalars['String'];
};


export type MutationLeaveTeamArgs = {
  teamID: Scalars['ID'];
};


export type MutationMakeUserAdminArgs = {
  userUID: Scalars['ID'];
};


export type MutationMoveCollectionArgs = {
  collectionID: Scalars['ID'];
  parentCollectionID?: InputMaybe<Scalars['ID']>;
};


export type MutationMoveRequestArgs = {
  destCollID: Scalars['ID'];
  nextRequestID?: InputMaybe<Scalars['ID']>;
  requestID: Scalars['ID'];
  srcCollID?: InputMaybe<Scalars['ID']>;
};


export type MutationMoveUserCollectionArgs = {
  destCollectionID?: InputMaybe<Scalars['ID']>;
  userCollectionID: Scalars['ID'];
};


export type MutationMoveUserRequestArgs = {
  destinationCollectionID: Scalars['ID'];
  nextRequestID?: InputMaybe<Scalars['ID']>;
  requestID: Scalars['ID'];
  sourceCollectionID: Scalars['ID'];
};


export type MutationRemoveRequestFromHistoryArgs = {
  id: Scalars['ID'];
};


export type MutationRemoveTeamMemberArgs = {
  teamID: Scalars['ID'];
  userUid: Scalars['ID'];
};


export type MutationRemoveUserAsAdminArgs = {
  userUID: Scalars['ID'];
};


export type MutationRemoveUserByAdminArgs = {
  userUID: Scalars['ID'];
};


export type MutationRemoveUserFromTeamByAdminArgs = {
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


export type MutationRenameTeamByAdminArgs = {
  newName: Scalars['String'];
  teamID: Scalars['ID'];
};


export type MutationRenameUserCollectionArgs = {
  newTitle: Scalars['String'];
  userCollectionID: Scalars['ID'];
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


export type MutationToggleHistoryStarStatusArgs = {
  id: Scalars['ID'];
};


export type MutationUpdateCollectionOrderArgs = {
  collectionID: Scalars['ID'];
  destCollID?: InputMaybe<Scalars['ID']>;
};


export type MutationUpdateGqlUserRequestArgs = {
  id: Scalars['ID'];
  request?: InputMaybe<Scalars['String']>;
  title?: InputMaybe<Scalars['String']>;
};


export type MutationUpdateLookUpRequestOrderArgs = {
  collectionID: Scalars['ID'];
  nextRequestID?: InputMaybe<Scalars['ID']>;
  requestID: Scalars['ID'];
};


export type MutationUpdateRestUserRequestArgs = {
  id: Scalars['ID'];
  request?: InputMaybe<Scalars['String']>;
  title?: InputMaybe<Scalars['String']>;
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


export type MutationUpdateUserCollectionOrderArgs = {
  collectionID: Scalars['ID'];
  nextCollectionID?: InputMaybe<Scalars['ID']>;
};


export type MutationUpdateUserEnvironmentArgs = {
  id: Scalars['ID'];
  name: Scalars['String'];
  variables: Scalars['String'];
};


export type MutationUpdateUserSessionsArgs = {
  currentSession: Scalars['String'];
  sessionType: SessionType;
};


export type MutationUpdateUserSettingsArgs = {
  properties: Scalars['String'];
};

export type Query = {
  __typename?: 'Query';
  admin: Admin;
  collection?: Maybe<TeamCollection>;
  exportCollectionsToJSON: Scalars['String'];
  exportUserCollectionsToJSON: UserCollectionExportJsonData;
  me: User;
  myShortcodes: Array<Shortcode>;
  myTeams: Array<Team>;
  request?: Maybe<TeamRequest>;
  requestsInCollection: Array<TeamRequest>;
  rootCollectionsOfTeam: Array<TeamCollection>;
  rootGQLUserCollections: Array<UserCollection>;
  rootRESTUserCollections: Array<UserCollection>;
  searchForRequest: Array<TeamRequest>;
  shortcode?: Maybe<Shortcode>;
  team?: Maybe<Team>;
  teamInvitation: TeamInvitation;
  userCollection: UserCollection;
  userGQLRequests: Array<UserRequest>;
  userRESTRequests: Array<UserRequest>;
  userRequest: UserRequest;
};


export type QueryCollectionArgs = {
  collectionID: Scalars['ID'];
};


export type QueryExportCollectionsToJsonArgs = {
  teamID: Scalars['ID'];
};


export type QueryExportUserCollectionsToJsonArgs = {
  collectionID?: InputMaybe<Scalars['ID']>;
  collectionType: ReqType;
};


export type QueryMyShortcodesArgs = {
  cursor?: InputMaybe<Scalars['ID']>;
  take?: InputMaybe<Scalars['Int']>;
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
  take?: InputMaybe<Scalars['Int']>;
};


export type QueryRootCollectionsOfTeamArgs = {
  cursor?: InputMaybe<Scalars['ID']>;
  take?: InputMaybe<Scalars['Int']>;
  teamID: Scalars['ID'];
};


export type QueryRootGqlUserCollectionsArgs = {
  cursor?: InputMaybe<Scalars['ID']>;
  take?: InputMaybe<Scalars['Int']>;
};


export type QueryRootRestUserCollectionsArgs = {
  cursor?: InputMaybe<Scalars['ID']>;
  take?: InputMaybe<Scalars['Int']>;
};


export type QuerySearchForRequestArgs = {
  cursor?: InputMaybe<Scalars['ID']>;
  searchTerm: Scalars['String'];
  take?: InputMaybe<Scalars['Int']>;
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


export type QueryUserCollectionArgs = {
  userCollectionID: Scalars['ID'];
};


export type QueryUserGqlRequestsArgs = {
  collectionID?: InputMaybe<Scalars['ID']>;
  cursor?: InputMaybe<Scalars['ID']>;
  take?: InputMaybe<Scalars['Int']>;
};


export type QueryUserRestRequestsArgs = {
  collectionID?: InputMaybe<Scalars['ID']>;
  cursor?: InputMaybe<Scalars['ID']>;
  take?: InputMaybe<Scalars['Int']>;
};


export type QueryUserRequestArgs = {
  id: Scalars['ID'];
};

export enum ReqType {
  Gql = 'GQL',
  Rest = 'REST'
}

export type RequestReorderData = {
  __typename?: 'RequestReorderData';
  nextRequest?: Maybe<TeamRequest>;
  request: TeamRequest;
};

export enum SessionType {
  Gql = 'GQL',
  Rest = 'REST'
}

export type Shortcode = {
  __typename?: 'Shortcode';
  createdOn: Scalars['DateTime'];
  id: Scalars['ID'];
  request: Scalars['String'];
};

export type Subscription = {
  __typename?: 'Subscription';
  collectionOrderUpdated: CollectionReorderData;
  myShortcodesCreated: Shortcode;
  myShortcodesRevoked: Shortcode;
  requestMoved: TeamRequest;
  requestOrderUpdated: RequestReorderData;
  teamCollectionAdded: TeamCollection;
  teamCollectionMoved: TeamCollection;
  teamCollectionRemoved: Scalars['ID'];
  teamCollectionUpdated: TeamCollection;
  teamEnvironmentCreated: TeamEnvironment;
  teamEnvironmentDeleted: TeamEnvironment;
  teamEnvironmentUpdated: TeamEnvironment;
  teamInvitationAdded: TeamInvitation;
  teamInvitationRemoved: Scalars['ID'];
  teamMemberAdded: TeamMember;
  teamMemberRemoved: Scalars['ID'];
  teamMemberUpdated: TeamMember;
  teamRequestAdded: TeamRequest;
  teamRequestDeleted: Scalars['ID'];
  teamRequestUpdated: TeamRequest;
  userCollectionCreated: UserCollection;
  userCollectionMoved: UserCollection;
  userCollectionOrderUpdated: UserCollectionReorderData;
  userCollectionRemoved: UserCollectionRemovedData;
  userCollectionUpdated: UserCollection;
  userDeleted: User;
  userEnvironmentCreated: UserEnvironment;
  userEnvironmentDeleteMany: Scalars['Int'];
  userEnvironmentDeleted: UserEnvironment;
  userEnvironmentUpdated: UserEnvironment;
  userHistoryCreated: UserHistory;
  userHistoryDeleted: UserHistory;
  userHistoryDeletedMany: UserHistoryDeletedManyData;
  userHistoryUpdated: UserHistory;
  userInvited: InvitedUser;
  userRequestCreated: UserRequest;
  userRequestDeleted: UserRequest;
  userRequestMoved: UserRequestReorderData;
  userRequestUpdated: UserRequest;
  userSettingsCreated: UserSettings;
  userSettingsUpdated: UserSettings;
  userUpdated: User;
};


export type SubscriptionCollectionOrderUpdatedArgs = {
  teamID: Scalars['ID'];
};


export type SubscriptionRequestMovedArgs = {
  teamID: Scalars['ID'];
};


export type SubscriptionRequestOrderUpdatedArgs = {
  teamID: Scalars['ID'];
};


export type SubscriptionTeamCollectionAddedArgs = {
  teamID: Scalars['ID'];
};


export type SubscriptionTeamCollectionMovedArgs = {
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
  editorsCount: Scalars['Int'];
  id: Scalars['ID'];
  members: Array<TeamMember>;
  myRole?: Maybe<TeamMemberRole>;
  name: Scalars['String'];
  ownersCount: Scalars['Int'];
  teamEnvironments: Array<TeamEnvironment>;
  teamInvitations: Array<TeamInvitation>;
  teamMembers: Array<TeamMember>;
  viewersCount: Scalars['Int'];
};


export type TeamMembersArgs = {
  cursor?: InputMaybe<Scalars['ID']>;
};

export type TeamCollection = {
  __typename?: 'TeamCollection';
  children: Array<TeamCollection>;
  id: Scalars['ID'];
  parent?: Maybe<TeamCollection>;
  parentID?: Maybe<Scalars['ID']>;
  team: Team;
  title: Scalars['String'];
};


export type TeamCollectionChildrenArgs = {
  cursor?: InputMaybe<Scalars['ID']>;
  take?: InputMaybe<Scalars['Int']>;
};

export type TeamEnvironment = {
  __typename?: 'TeamEnvironment';
  id: Scalars['ID'];
  name: Scalars['String'];
  teamID: Scalars['ID'];
  variables: Scalars['String'];
};

export type TeamInvitation = {
  __typename?: 'TeamInvitation';
  creator: User;
  creatorUid: Scalars['ID'];
  id: Scalars['ID'];
  inviteeEmail: Scalars['String'];
  inviteeRole: TeamMemberRole;
  team: Team;
  teamID: Scalars['ID'];
};

export type TeamMember = {
  __typename?: 'TeamMember';
  membershipID: Scalars['ID'];
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
  collection: TeamCollection;
  collectionID: Scalars['ID'];
  id: Scalars['ID'];
  request: Scalars['String'];
  team: Team;
  teamID: Scalars['ID'];
  title: Scalars['String'];
};

export type UpdateTeamRequestInput = {
  request?: InputMaybe<Scalars['String']>;
  title?: InputMaybe<Scalars['String']>;
};

export type User = {
  __typename?: 'User';
  GQLHistory: Array<UserHistory>;
  RESTHistory: Array<UserHistory>;
  createdOn: Scalars['DateTime'];
  currentGQLSession?: Maybe<Scalars['String']>;
  currentRESTSession?: Maybe<Scalars['String']>;
  displayName?: Maybe<Scalars['String']>;
  email?: Maybe<Scalars['String']>;
  environments: Array<UserEnvironment>;
  globalEnvironments: UserEnvironment;
  isAdmin: Scalars['Boolean'];
  photoURL?: Maybe<Scalars['String']>;
  settings: UserSettings;
  uid: Scalars['ID'];
};


export type UserGqlHistoryArgs = {
  cursor?: InputMaybe<Scalars['ID']>;
  take?: InputMaybe<Scalars['Int']>;
};


export type UserRestHistoryArgs = {
  cursor?: InputMaybe<Scalars['ID']>;
  take?: InputMaybe<Scalars['Int']>;
};

export type UserCollection = {
  __typename?: 'UserCollection';
  childrenGQL: Array<UserCollection>;
  childrenREST: Array<UserCollection>;
  id: Scalars['ID'];
  parent?: Maybe<UserCollection>;
  requests: Array<UserRequest>;
  title: Scalars['String'];
  type: ReqType;
  user: User;
};


export type UserCollectionChildrenGqlArgs = {
  cursor?: InputMaybe<Scalars['ID']>;
  take?: InputMaybe<Scalars['Int']>;
};


export type UserCollectionChildrenRestArgs = {
  cursor?: InputMaybe<Scalars['ID']>;
  take?: InputMaybe<Scalars['Int']>;
};


export type UserCollectionRequestsArgs = {
  cursor?: InputMaybe<Scalars['ID']>;
  take?: InputMaybe<Scalars['Int']>;
};

export type UserCollectionExportJsonData = {
  __typename?: 'UserCollectionExportJSONData';
  collectionType: ReqType;
  exportedCollection: Scalars['ID'];
};

export type UserCollectionRemovedData = {
  __typename?: 'UserCollectionRemovedData';
  id: Scalars['ID'];
  type: ReqType;
};

export type UserCollectionReorderData = {
  __typename?: 'UserCollectionReorderData';
  nextUserCollection?: Maybe<UserCollection>;
  userCollection: UserCollection;
};

export type UserEnvironment = {
  __typename?: 'UserEnvironment';
  id: Scalars['ID'];
  isGlobal: Scalars['Boolean'];
  name?: Maybe<Scalars['String']>;
  userUid: Scalars['ID'];
  variables: Scalars['String'];
};

export type UserHistory = {
  __typename?: 'UserHistory';
  executedOn: Scalars['DateTime'];
  id: Scalars['ID'];
  isStarred: Scalars['Boolean'];
  reqType: ReqType;
  request: Scalars['String'];
  responseMetadata: Scalars['String'];
  userUid: Scalars['ID'];
};

export type UserHistoryDeletedManyData = {
  __typename?: 'UserHistoryDeletedManyData';
  count: Scalars['Int'];
  reqType: ReqType;
};

export type UserRequest = {
  __typename?: 'UserRequest';
  collectionID: Scalars['ID'];
  createdOn: Scalars['DateTime'];
  id: Scalars['ID'];
  request: Scalars['String'];
  title: Scalars['String'];
  type: ReqType;
  user: User;
};

export type UserRequestReorderData = {
  __typename?: 'UserRequestReorderData';
  nextRequest?: Maybe<UserRequest>;
  request: UserRequest;
};

export type UserSettings = {
  __typename?: 'UserSettings';
  id: Scalars['ID'];
  properties: Scalars['String'];
  updatedOn: Scalars['DateTime'];
  userUid: Scalars['ID'];
};

export type ClearGlobalEnvironmentsMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type ClearGlobalEnvironmentsMutation = { __typename?: 'Mutation', clearGlobalEnvironments: { __typename?: 'UserEnvironment', id: string } };

export type CreateGqlChildUserCollectionMutationVariables = Exact<{
  title: Scalars['String'];
  parentUserCollectionID: Scalars['ID'];
}>;


export type CreateGqlChildUserCollectionMutation = { __typename?: 'Mutation', createGQLChildUserCollection: { __typename?: 'UserCollection', id: string } };

export type CreateGqlRootUserCollectionMutationVariables = Exact<{
  title: Scalars['String'];
}>;


export type CreateGqlRootUserCollectionMutation = { __typename?: 'Mutation', createGQLRootUserCollection: { __typename?: 'UserCollection', id: string } };

export type CreateGqlUserRequestMutationVariables = Exact<{
  title: Scalars['String'];
  request: Scalars['String'];
  collectionID: Scalars['ID'];
}>;


export type CreateGqlUserRequestMutation = { __typename?: 'Mutation', createGQLUserRequest: { __typename?: 'UserRequest', id: string } };

export type CreateRestChildUserCollectionMutationVariables = Exact<{
  title: Scalars['String'];
  parentUserCollectionID: Scalars['ID'];
}>;


export type CreateRestChildUserCollectionMutation = { __typename?: 'Mutation', createRESTChildUserCollection: { __typename?: 'UserCollection', id: string } };

export type CreateRestRootUserCollectionMutationVariables = Exact<{
  title: Scalars['String'];
}>;


export type CreateRestRootUserCollectionMutation = { __typename?: 'Mutation', createRESTRootUserCollection: { __typename?: 'UserCollection', id: string } };

export type CreateRestUserRequestMutationVariables = Exact<{
  collectionID: Scalars['ID'];
  title: Scalars['String'];
  request: Scalars['String'];
}>;


export type CreateRestUserRequestMutation = { __typename?: 'Mutation', createRESTUserRequest: { __typename?: 'UserRequest', id: string } };

export type CreateUserEnvironmentMutationVariables = Exact<{
  name: Scalars['String'];
  variables: Scalars['String'];
}>;


export type CreateUserEnvironmentMutation = { __typename?: 'Mutation', createUserEnvironment: { __typename?: 'UserEnvironment', id: string, userUid: string, name?: string | null, variables: string, isGlobal: boolean } };

export type CreateUserGlobalEnvironmentMutationVariables = Exact<{
  variables: Scalars['String'];
}>;


export type CreateUserGlobalEnvironmentMutation = { __typename?: 'Mutation', createUserGlobalEnvironment: { __typename?: 'UserEnvironment', id: string } };

export type CreateUserHistoryMutationVariables = Exact<{
  reqData: Scalars['String'];
  resMetadata: Scalars['String'];
  reqType: ReqType;
}>;


export type CreateUserHistoryMutation = { __typename?: 'Mutation', createUserHistory: { __typename?: 'UserHistory', id: string } };

export type CreateUserSettingsMutationVariables = Exact<{
  properties: Scalars['String'];
}>;


export type CreateUserSettingsMutation = { __typename?: 'Mutation', createUserSettings: { __typename?: 'UserSettings', id: string } };

export type DeleteAllUserHistoryMutationVariables = Exact<{
  reqType: ReqType;
}>;


export type DeleteAllUserHistoryMutation = { __typename?: 'Mutation', deleteAllUserHistory: { __typename?: 'UserHistoryDeletedManyData', count: number, reqType: ReqType } };

export type DeleteUserCollectionMutationVariables = Exact<{
  userCollectionID: Scalars['ID'];
}>;


export type DeleteUserCollectionMutation = { __typename?: 'Mutation', deleteUserCollection: boolean };

export type DeleteUserEnvironmentMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DeleteUserEnvironmentMutation = { __typename?: 'Mutation', deleteUserEnvironment: boolean };

export type DeleteUserRequestMutationVariables = Exact<{
  requestID: Scalars['ID'];
}>;


export type DeleteUserRequestMutation = { __typename?: 'Mutation', deleteUserRequest: boolean };

export type MoveUserCollectionMutationVariables = Exact<{
  destCollectionID?: InputMaybe<Scalars['ID']>;
  userCollectionID: Scalars['ID'];
}>;


export type MoveUserCollectionMutation = { __typename?: 'Mutation', moveUserCollection: { __typename?: 'UserCollection', id: string } };

export type MoveUserRequestMutationVariables = Exact<{
  sourceCollectionID: Scalars['ID'];
  requestID: Scalars['ID'];
  destinationCollectionID: Scalars['ID'];
  nextRequestID?: InputMaybe<Scalars['ID']>;
}>;


export type MoveUserRequestMutation = { __typename?: 'Mutation', moveUserRequest: { __typename?: 'UserRequest', id: string } };

export type RemoveRequestFromHistoryMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type RemoveRequestFromHistoryMutation = { __typename?: 'Mutation', removeRequestFromHistory: { __typename?: 'UserHistory', id: string } };

export type RenameUserCollectionMutationVariables = Exact<{
  userCollectionID: Scalars['ID'];
  newTitle: Scalars['String'];
}>;


export type RenameUserCollectionMutation = { __typename?: 'Mutation', renameUserCollection: { __typename?: 'UserCollection', id: string } };

export type ToggleHistoryStarStatusMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type ToggleHistoryStarStatusMutation = { __typename?: 'Mutation', toggleHistoryStarStatus: { __typename?: 'UserHistory', id: string } };

export type UpdateGqlUserRequestMutationVariables = Exact<{
  id: Scalars['ID'];
  request: Scalars['String'];
  title?: InputMaybe<Scalars['String']>;
}>;


export type UpdateGqlUserRequestMutation = { __typename?: 'Mutation', updateGQLUserRequest: { __typename?: 'UserRequest', id: string } };

export type UpdateRestUserRequestMutationVariables = Exact<{
  id: Scalars['ID'];
  title: Scalars['String'];
  request: Scalars['String'];
}>;


export type UpdateRestUserRequestMutation = { __typename?: 'Mutation', updateRESTUserRequest: { __typename?: 'UserRequest', id: string, collectionID: string, request: string } };

export type UpdateUserCollectionOrderMutationVariables = Exact<{
  collectionID: Scalars['ID'];
  nextCollectionID?: InputMaybe<Scalars['ID']>;
}>;


export type UpdateUserCollectionOrderMutation = { __typename?: 'Mutation', updateUserCollectionOrder: boolean };

export type UpdateUserEnvironmentMutationVariables = Exact<{
  id: Scalars['ID'];
  name: Scalars['String'];
  variables: Scalars['String'];
}>;


export type UpdateUserEnvironmentMutation = { __typename?: 'Mutation', updateUserEnvironment: { __typename?: 'UserEnvironment', id: string, userUid: string, name?: string | null, variables: string, isGlobal: boolean } };

export type UpdateUserSessionMutationVariables = Exact<{
  currentSession: Scalars['String'];
  sessionType: SessionType;
}>;


export type UpdateUserSessionMutation = { __typename?: 'Mutation', updateUserSessions: { __typename?: 'User', currentRESTSession?: string | null } };

export type UpdateUserSettingsMutationVariables = Exact<{
  properties: Scalars['String'];
}>;


export type UpdateUserSettingsMutation = { __typename?: 'Mutation', updateUserSettings: { __typename?: 'UserSettings', id: string } };

export type ExportUserCollectionsToJsonQueryVariables = Exact<{
  collectionID?: InputMaybe<Scalars['ID']>;
  collectionType: ReqType;
}>;


export type ExportUserCollectionsToJsonQuery = { __typename?: 'Query', exportUserCollectionsToJSON: { __typename?: 'UserCollectionExportJSONData', collectionType: ReqType, exportedCollection: string } };

export type GetCurrentRestSessionQueryVariables = Exact<{ [key: string]: never; }>;


export type GetCurrentRestSessionQuery = { __typename?: 'Query', me: { __typename?: 'User', currentRESTSession?: string | null } };

export type GetGlobalEnvironmentsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetGlobalEnvironmentsQuery = { __typename?: 'Query', me: { __typename?: 'User', globalEnvironments: { __typename?: 'UserEnvironment', id: string, isGlobal: boolean, name?: string | null, userUid: string, variables: string } } };

export type GetRestUserHistoryQueryVariables = Exact<{ [key: string]: never; }>;


export type GetRestUserHistoryQuery = { __typename?: 'Query', me: { __typename?: 'User', RESTHistory: Array<{ __typename?: 'UserHistory', id: string, userUid: string, reqType: ReqType, request: string, responseMetadata: string, isStarred: boolean, executedOn: any }>, GQLHistory: Array<{ __typename?: 'UserHistory', id: string, userUid: string, reqType: ReqType, request: string, responseMetadata: string, isStarred: boolean, executedOn: any }> } };

export type GetGqlRootUserCollectionsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetGqlRootUserCollectionsQuery = { __typename?: 'Query', rootGQLUserCollections: Array<{ __typename?: 'UserCollection', id: string, title: string, type: ReqType, childrenGQL: Array<{ __typename?: 'UserCollection', id: string, title: string, type: ReqType }> }> };

export type GetUserEnvironmentsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetUserEnvironmentsQuery = { __typename?: 'Query', me: { __typename?: 'User', environments: Array<{ __typename?: 'UserEnvironment', id: string, isGlobal: boolean, name?: string | null, userUid: string, variables: string }> } };

export type GetUserRootCollectionsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetUserRootCollectionsQuery = { __typename?: 'Query', rootRESTUserCollections: Array<{ __typename?: 'UserCollection', id: string, title: string, type: ReqType, childrenREST: Array<{ __typename?: 'UserCollection', id: string, title: string, type: ReqType }> }> };

export type GetUserSettingsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetUserSettingsQuery = { __typename?: 'Query', me: { __typename?: 'User', settings: { __typename?: 'UserSettings', id: string, properties: string } } };

export type UserCollectionCreatedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type UserCollectionCreatedSubscription = { __typename?: 'Subscription', userCollectionCreated: { __typename?: 'UserCollection', id: string, title: string, type: ReqType, parent?: { __typename?: 'UserCollection', id: string } | null } };

export type UserCollectionMovedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type UserCollectionMovedSubscription = { __typename?: 'Subscription', userCollectionMoved: { __typename?: 'UserCollection', id: string, type: ReqType, parent?: { __typename?: 'UserCollection', id: string } | null } };

export type UserCollectionOrderUpdatedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type UserCollectionOrderUpdatedSubscription = { __typename?: 'Subscription', userCollectionOrderUpdated: { __typename?: 'UserCollectionReorderData', userCollection: { __typename?: 'UserCollection', id: string, parent?: { __typename?: 'UserCollection', id: string } | null }, nextUserCollection?: { __typename?: 'UserCollection', id: string, parent?: { __typename?: 'UserCollection', id: string } | null } | null } };

export type UserCollectionRemovedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type UserCollectionRemovedSubscription = { __typename?: 'Subscription', userCollectionRemoved: { __typename?: 'UserCollectionRemovedData', id: string, type: ReqType } };

export type UserCollectionUpdatedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type UserCollectionUpdatedSubscription = { __typename?: 'Subscription', userCollectionUpdated: { __typename?: 'UserCollection', id: string, title: string, type: ReqType, parent?: { __typename?: 'UserCollection', id: string } | null } };

export type UserEnvironmentCreatedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type UserEnvironmentCreatedSubscription = { __typename?: 'Subscription', userEnvironmentCreated: { __typename?: 'UserEnvironment', id: string, isGlobal: boolean, name?: string | null, userUid: string, variables: string } };

export type UserEnvironmentDeletedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type UserEnvironmentDeletedSubscription = { __typename?: 'Subscription', userEnvironmentDeleted: { __typename?: 'UserEnvironment', id: string } };

export type UserEnvironmentUpdatedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type UserEnvironmentUpdatedSubscription = { __typename?: 'Subscription', userEnvironmentUpdated: { __typename?: 'UserEnvironment', id: string, userUid: string, name?: string | null, variables: string, isGlobal: boolean } };

export type UserHistoryCreatedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type UserHistoryCreatedSubscription = { __typename?: 'Subscription', userHistoryCreated: { __typename?: 'UserHistory', id: string, reqType: ReqType, request: string, responseMetadata: string, isStarred: boolean, executedOn: any } };

export type UserHistoryDeletedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type UserHistoryDeletedSubscription = { __typename?: 'Subscription', userHistoryDeleted: { __typename?: 'UserHistory', id: string, reqType: ReqType } };

export type UserHistoryDeletedManySubscriptionVariables = Exact<{ [key: string]: never; }>;


export type UserHistoryDeletedManySubscription = { __typename?: 'Subscription', userHistoryDeletedMany: { __typename?: 'UserHistoryDeletedManyData', count: number, reqType: ReqType } };

export type UserHistoryUpdatedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type UserHistoryUpdatedSubscription = { __typename?: 'Subscription', userHistoryUpdated: { __typename?: 'UserHistory', id: string, reqType: ReqType, request: string, responseMetadata: string, isStarred: boolean, executedOn: any } };

export type UserRequestCreatedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type UserRequestCreatedSubscription = { __typename?: 'Subscription', userRequestCreated: { __typename?: 'UserRequest', id: string, collectionID: string, title: string, request: string, type: ReqType } };

export type UserRequestDeletedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type UserRequestDeletedSubscription = { __typename?: 'Subscription', userRequestDeleted: { __typename?: 'UserRequest', id: string, collectionID: string, title: string, request: string, type: ReqType } };

export type UserRequestMovedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type UserRequestMovedSubscription = { __typename?: 'Subscription', userRequestMoved: { __typename?: 'UserRequestReorderData', request: { __typename?: 'UserRequest', id: string, collectionID: string, type: ReqType }, nextRequest?: { __typename?: 'UserRequest', id: string, collectionID: string } | null } };

export type UserRequestUpdatedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type UserRequestUpdatedSubscription = { __typename?: 'Subscription', userRequestUpdated: { __typename?: 'UserRequest', id: string, collectionID: string, title: string, request: string, type: ReqType } };

export type UserSettingsUpdatedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type UserSettingsUpdatedSubscription = { __typename?: 'Subscription', userSettingsUpdated: { __typename?: 'UserSettings', id: string, properties: string } };


export const ClearGlobalEnvironmentsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ClearGlobalEnvironments"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"clearGlobalEnvironments"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<ClearGlobalEnvironmentsMutation, ClearGlobalEnvironmentsMutationVariables>;
export const CreateGqlChildUserCollectionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateGQLChildUserCollection"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"title"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"parentUserCollectionID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createGQLChildUserCollection"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"title"},"value":{"kind":"Variable","name":{"kind":"Name","value":"title"}}},{"kind":"Argument","name":{"kind":"Name","value":"parentUserCollectionID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"parentUserCollectionID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<CreateGqlChildUserCollectionMutation, CreateGqlChildUserCollectionMutationVariables>;
export const CreateGqlRootUserCollectionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateGQLRootUserCollection"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"title"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createGQLRootUserCollection"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"title"},"value":{"kind":"Variable","name":{"kind":"Name","value":"title"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<CreateGqlRootUserCollectionMutation, CreateGqlRootUserCollectionMutationVariables>;
export const CreateGqlUserRequestDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateGQLUserRequest"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"title"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"request"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"collectionID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createGQLUserRequest"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"title"},"value":{"kind":"Variable","name":{"kind":"Name","value":"title"}}},{"kind":"Argument","name":{"kind":"Name","value":"request"},"value":{"kind":"Variable","name":{"kind":"Name","value":"request"}}},{"kind":"Argument","name":{"kind":"Name","value":"collectionID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"collectionID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<CreateGqlUserRequestMutation, CreateGqlUserRequestMutationVariables>;
export const CreateRestChildUserCollectionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateRESTChildUserCollection"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"title"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"parentUserCollectionID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createRESTChildUserCollection"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"title"},"value":{"kind":"Variable","name":{"kind":"Name","value":"title"}}},{"kind":"Argument","name":{"kind":"Name","value":"parentUserCollectionID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"parentUserCollectionID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<CreateRestChildUserCollectionMutation, CreateRestChildUserCollectionMutationVariables>;
export const CreateRestRootUserCollectionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateRESTRootUserCollection"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"title"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createRESTRootUserCollection"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"title"},"value":{"kind":"Variable","name":{"kind":"Name","value":"title"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<CreateRestRootUserCollectionMutation, CreateRestRootUserCollectionMutationVariables>;
export const CreateRestUserRequestDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateRESTUserRequest"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"collectionID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"title"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"request"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createRESTUserRequest"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"collectionID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"collectionID"}}},{"kind":"Argument","name":{"kind":"Name","value":"title"},"value":{"kind":"Variable","name":{"kind":"Name","value":"title"}}},{"kind":"Argument","name":{"kind":"Name","value":"request"},"value":{"kind":"Variable","name":{"kind":"Name","value":"request"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<CreateRestUserRequestMutation, CreateRestUserRequestMutationVariables>;
export const CreateUserEnvironmentDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateUserEnvironment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"variables"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createUserEnvironment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}},{"kind":"Argument","name":{"kind":"Name","value":"variables"},"value":{"kind":"Variable","name":{"kind":"Name","value":"variables"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userUid"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"variables"}},{"kind":"Field","name":{"kind":"Name","value":"isGlobal"}}]}}]}}]} as unknown as DocumentNode<CreateUserEnvironmentMutation, CreateUserEnvironmentMutationVariables>;
export const CreateUserGlobalEnvironmentDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateUserGlobalEnvironment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"variables"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createUserGlobalEnvironment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"variables"},"value":{"kind":"Variable","name":{"kind":"Name","value":"variables"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<CreateUserGlobalEnvironmentMutation, CreateUserGlobalEnvironmentMutationVariables>;
export const CreateUserHistoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateUserHistory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"reqData"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"resMetadata"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"reqType"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ReqType"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createUserHistory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"reqData"},"value":{"kind":"Variable","name":{"kind":"Name","value":"reqData"}}},{"kind":"Argument","name":{"kind":"Name","value":"resMetadata"},"value":{"kind":"Variable","name":{"kind":"Name","value":"resMetadata"}}},{"kind":"Argument","name":{"kind":"Name","value":"reqType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"reqType"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<CreateUserHistoryMutation, CreateUserHistoryMutationVariables>;
export const CreateUserSettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateUserSettings"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"properties"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createUserSettings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"properties"},"value":{"kind":"Variable","name":{"kind":"Name","value":"properties"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<CreateUserSettingsMutation, CreateUserSettingsMutationVariables>;
export const DeleteAllUserHistoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteAllUserHistory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"reqType"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ReqType"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteAllUserHistory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"reqType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"reqType"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"count"}},{"kind":"Field","name":{"kind":"Name","value":"reqType"}}]}}]}}]} as unknown as DocumentNode<DeleteAllUserHistoryMutation, DeleteAllUserHistoryMutationVariables>;
export const DeleteUserCollectionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteUserCollection"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userCollectionID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteUserCollection"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"userCollectionID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userCollectionID"}}}]}]}}]} as unknown as DocumentNode<DeleteUserCollectionMutation, DeleteUserCollectionMutationVariables>;
export const DeleteUserEnvironmentDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteUserEnvironment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteUserEnvironment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteUserEnvironmentMutation, DeleteUserEnvironmentMutationVariables>;
export const DeleteUserRequestDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteUserRequest"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"requestID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteUserRequest"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"requestID"}}}]}]}}]} as unknown as DocumentNode<DeleteUserRequestMutation, DeleteUserRequestMutationVariables>;
export const MoveUserCollectionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MoveUserCollection"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"destCollectionID"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userCollectionID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"moveUserCollection"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"destCollectionID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"destCollectionID"}}},{"kind":"Argument","name":{"kind":"Name","value":"userCollectionID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userCollectionID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<MoveUserCollectionMutation, MoveUserCollectionMutationVariables>;
export const MoveUserRequestDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MoveUserRequest"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sourceCollectionID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"requestID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"destinationCollectionID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"nextRequestID"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"moveUserRequest"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"sourceCollectionID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sourceCollectionID"}}},{"kind":"Argument","name":{"kind":"Name","value":"requestID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"requestID"}}},{"kind":"Argument","name":{"kind":"Name","value":"destinationCollectionID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"destinationCollectionID"}}},{"kind":"Argument","name":{"kind":"Name","value":"nextRequestID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"nextRequestID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<MoveUserRequestMutation, MoveUserRequestMutationVariables>;
export const RemoveRequestFromHistoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveRequestFromHistory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeRequestFromHistory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<RemoveRequestFromHistoryMutation, RemoveRequestFromHistoryMutationVariables>;
export const RenameUserCollectionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RenameUserCollection"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userCollectionID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"newTitle"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"renameUserCollection"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"userCollectionID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userCollectionID"}}},{"kind":"Argument","name":{"kind":"Name","value":"newTitle"},"value":{"kind":"Variable","name":{"kind":"Name","value":"newTitle"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<RenameUserCollectionMutation, RenameUserCollectionMutationVariables>;
export const ToggleHistoryStarStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ToggleHistoryStarStatus"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"toggleHistoryStarStatus"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<ToggleHistoryStarStatusMutation, ToggleHistoryStarStatusMutationVariables>;
export const UpdateGqlUserRequestDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateGQLUserRequest"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"request"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"title"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateGQLUserRequest"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"request"},"value":{"kind":"Variable","name":{"kind":"Name","value":"request"}}},{"kind":"Argument","name":{"kind":"Name","value":"title"},"value":{"kind":"Variable","name":{"kind":"Name","value":"title"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<UpdateGqlUserRequestMutation, UpdateGqlUserRequestMutationVariables>;
export const UpdateRestUserRequestDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateRESTUserRequest"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"title"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"request"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateRESTUserRequest"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"title"},"value":{"kind":"Variable","name":{"kind":"Name","value":"title"}}},{"kind":"Argument","name":{"kind":"Name","value":"request"},"value":{"kind":"Variable","name":{"kind":"Name","value":"request"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"collectionID"}},{"kind":"Field","name":{"kind":"Name","value":"request"}}]}}]}}]} as unknown as DocumentNode<UpdateRestUserRequestMutation, UpdateRestUserRequestMutationVariables>;
export const UpdateUserCollectionOrderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateUserCollectionOrder"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"collectionID"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"nextCollectionID"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateUserCollectionOrder"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"collectionID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"collectionID"}}},{"kind":"Argument","name":{"kind":"Name","value":"nextCollectionID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"nextCollectionID"}}}]}]}}]} as unknown as DocumentNode<UpdateUserCollectionOrderMutation, UpdateUserCollectionOrderMutationVariables>;
export const UpdateUserEnvironmentDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateUserEnvironment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"variables"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateUserEnvironment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}},{"kind":"Argument","name":{"kind":"Name","value":"variables"},"value":{"kind":"Variable","name":{"kind":"Name","value":"variables"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userUid"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"variables"}},{"kind":"Field","name":{"kind":"Name","value":"isGlobal"}}]}}]}}]} as unknown as DocumentNode<UpdateUserEnvironmentMutation, UpdateUserEnvironmentMutationVariables>;
export const UpdateUserSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateUserSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"currentSession"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sessionType"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SessionType"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateUserSessions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"currentSession"},"value":{"kind":"Variable","name":{"kind":"Name","value":"currentSession"}}},{"kind":"Argument","name":{"kind":"Name","value":"sessionType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sessionType"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"currentRESTSession"}}]}}]}}]} as unknown as DocumentNode<UpdateUserSessionMutation, UpdateUserSessionMutationVariables>;
export const UpdateUserSettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateUserSettings"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"properties"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateUserSettings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"properties"},"value":{"kind":"Variable","name":{"kind":"Name","value":"properties"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<UpdateUserSettingsMutation, UpdateUserSettingsMutationVariables>;
export const ExportUserCollectionsToJsonDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ExportUserCollectionsToJSON"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"collectionID"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"collectionType"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ReqType"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"exportUserCollectionsToJSON"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"collectionID"},"value":{"kind":"Variable","name":{"kind":"Name","value":"collectionID"}}},{"kind":"Argument","name":{"kind":"Name","value":"collectionType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"collectionType"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"collectionType"}},{"kind":"Field","name":{"kind":"Name","value":"exportedCollection"}}]}}]}}]} as unknown as DocumentNode<ExportUserCollectionsToJsonQuery, ExportUserCollectionsToJsonQueryVariables>;
export const GetCurrentRestSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCurrentRESTSession"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"currentRESTSession"}}]}}]}}]} as unknown as DocumentNode<GetCurrentRestSessionQuery, GetCurrentRestSessionQueryVariables>;
export const GetGlobalEnvironmentsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetGlobalEnvironments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"globalEnvironments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"isGlobal"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"userUid"}},{"kind":"Field","name":{"kind":"Name","value":"variables"}}]}}]}}]}}]} as unknown as DocumentNode<GetGlobalEnvironmentsQuery, GetGlobalEnvironmentsQueryVariables>;
export const GetRestUserHistoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetRESTUserHistory"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"RESTHistory"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userUid"}},{"kind":"Field","name":{"kind":"Name","value":"reqType"}},{"kind":"Field","name":{"kind":"Name","value":"request"}},{"kind":"Field","name":{"kind":"Name","value":"responseMetadata"}},{"kind":"Field","name":{"kind":"Name","value":"isStarred"}},{"kind":"Field","name":{"kind":"Name","value":"executedOn"}}]}},{"kind":"Field","name":{"kind":"Name","value":"GQLHistory"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userUid"}},{"kind":"Field","name":{"kind":"Name","value":"reqType"}},{"kind":"Field","name":{"kind":"Name","value":"request"}},{"kind":"Field","name":{"kind":"Name","value":"responseMetadata"}},{"kind":"Field","name":{"kind":"Name","value":"isStarred"}},{"kind":"Field","name":{"kind":"Name","value":"executedOn"}}]}}]}}]}}]} as unknown as DocumentNode<GetRestUserHistoryQuery, GetRestUserHistoryQueryVariables>;
export const GetGqlRootUserCollectionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetGQLRootUserCollections"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rootGQLUserCollections"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"take"},"value":{"kind":"IntValue","value":"99999"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"childrenGQL"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"type"}}]}}]}}]}}]} as unknown as DocumentNode<GetGqlRootUserCollectionsQuery, GetGqlRootUserCollectionsQueryVariables>;
export const GetUserEnvironmentsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetUserEnvironments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"environments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"isGlobal"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"userUid"}},{"kind":"Field","name":{"kind":"Name","value":"variables"}}]}}]}}]}}]} as unknown as DocumentNode<GetUserEnvironmentsQuery, GetUserEnvironmentsQueryVariables>;
export const GetUserRootCollectionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetUserRootCollections"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rootRESTUserCollections"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"take"},"value":{"kind":"IntValue","value":"99999"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"childrenREST"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"type"}}]}}]}}]}}]} as unknown as DocumentNode<GetUserRootCollectionsQuery, GetUserRootCollectionsQueryVariables>;
export const GetUserSettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetUserSettings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"settings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"properties"}}]}}]}}]}}]} as unknown as DocumentNode<GetUserSettingsQuery, GetUserSettingsQueryVariables>;
export const UserCollectionCreatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"UserCollectionCreated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userCollectionCreated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"parent"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"type"}}]}}]}}]} as unknown as DocumentNode<UserCollectionCreatedSubscription, UserCollectionCreatedSubscriptionVariables>;
export const UserCollectionMovedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"UserCollectionMoved"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userCollectionMoved"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"parent"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}},{"kind":"Field","name":{"kind":"Name","value":"type"}}]}}]}}]} as unknown as DocumentNode<UserCollectionMovedSubscription, UserCollectionMovedSubscriptionVariables>;
export const UserCollectionOrderUpdatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"UserCollectionOrderUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userCollectionOrderUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userCollection"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"parent"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"nextUserCollection"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"parent"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]}}]}}]} as unknown as DocumentNode<UserCollectionOrderUpdatedSubscription, UserCollectionOrderUpdatedSubscriptionVariables>;
export const UserCollectionRemovedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"UserCollectionRemoved"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userCollectionRemoved"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}}]}}]}}]} as unknown as DocumentNode<UserCollectionRemovedSubscription, UserCollectionRemovedSubscriptionVariables>;
export const UserCollectionUpdatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"userCollectionUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userCollectionUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"parent"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]}}]} as unknown as DocumentNode<UserCollectionUpdatedSubscription, UserCollectionUpdatedSubscriptionVariables>;
export const UserEnvironmentCreatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"UserEnvironmentCreated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userEnvironmentCreated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"isGlobal"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"userUid"}},{"kind":"Field","name":{"kind":"Name","value":"variables"}}]}}]}}]} as unknown as DocumentNode<UserEnvironmentCreatedSubscription, UserEnvironmentCreatedSubscriptionVariables>;
export const UserEnvironmentDeletedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"UserEnvironmentDeleted"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userEnvironmentDeleted"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<UserEnvironmentDeletedSubscription, UserEnvironmentDeletedSubscriptionVariables>;
export const UserEnvironmentUpdatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"UserEnvironmentUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userEnvironmentUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"userUid"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"variables"}},{"kind":"Field","name":{"kind":"Name","value":"isGlobal"}}]}}]}}]} as unknown as DocumentNode<UserEnvironmentUpdatedSubscription, UserEnvironmentUpdatedSubscriptionVariables>;
export const UserHistoryCreatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"UserHistoryCreated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userHistoryCreated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"reqType"}},{"kind":"Field","name":{"kind":"Name","value":"request"}},{"kind":"Field","name":{"kind":"Name","value":"responseMetadata"}},{"kind":"Field","name":{"kind":"Name","value":"isStarred"}},{"kind":"Field","name":{"kind":"Name","value":"executedOn"}}]}}]}}]} as unknown as DocumentNode<UserHistoryCreatedSubscription, UserHistoryCreatedSubscriptionVariables>;
export const UserHistoryDeletedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"userHistoryDeleted"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userHistoryDeleted"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"reqType"}}]}}]}}]} as unknown as DocumentNode<UserHistoryDeletedSubscription, UserHistoryDeletedSubscriptionVariables>;
export const UserHistoryDeletedManyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"UserHistoryDeletedMany"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userHistoryDeletedMany"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"count"}},{"kind":"Field","name":{"kind":"Name","value":"reqType"}}]}}]}}]} as unknown as DocumentNode<UserHistoryDeletedManySubscription, UserHistoryDeletedManySubscriptionVariables>;
export const UserHistoryUpdatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"UserHistoryUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userHistoryUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"reqType"}},{"kind":"Field","name":{"kind":"Name","value":"request"}},{"kind":"Field","name":{"kind":"Name","value":"responseMetadata"}},{"kind":"Field","name":{"kind":"Name","value":"isStarred"}},{"kind":"Field","name":{"kind":"Name","value":"executedOn"}}]}}]}}]} as unknown as DocumentNode<UserHistoryUpdatedSubscription, UserHistoryUpdatedSubscriptionVariables>;
export const UserRequestCreatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"UserRequestCreated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userRequestCreated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"collectionID"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"request"}},{"kind":"Field","name":{"kind":"Name","value":"type"}}]}}]}}]} as unknown as DocumentNode<UserRequestCreatedSubscription, UserRequestCreatedSubscriptionVariables>;
export const UserRequestDeletedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"UserRequestDeleted"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userRequestDeleted"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"collectionID"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"request"}},{"kind":"Field","name":{"kind":"Name","value":"type"}}]}}]}}]} as unknown as DocumentNode<UserRequestDeletedSubscription, UserRequestDeletedSubscriptionVariables>;
export const UserRequestMovedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"UserRequestMoved"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userRequestMoved"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"request"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"collectionID"}},{"kind":"Field","name":{"kind":"Name","value":"type"}}]}},{"kind":"Field","name":{"kind":"Name","value":"nextRequest"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"collectionID"}}]}}]}}]}}]} as unknown as DocumentNode<UserRequestMovedSubscription, UserRequestMovedSubscriptionVariables>;
export const UserRequestUpdatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"UserRequestUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userRequestUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"collectionID"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"request"}},{"kind":"Field","name":{"kind":"Name","value":"type"}}]}}]}}]} as unknown as DocumentNode<UserRequestUpdatedSubscription, UserRequestUpdatedSubscriptionVariables>;
export const UserSettingsUpdatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"UserSettingsUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userSettingsUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"properties"}}]}}]}}]} as unknown as DocumentNode<UserSettingsUpdatedSubscription, UserSettingsUpdatedSubscriptionVariables>;
export type WithTypename<T extends { __typename?: any }> = Partial<T> & { __typename: NonNullable<T['__typename']> };

export type GraphCacheKeysConfig = {
  Admin?: (data: WithTypename<Admin>) => null | string,
  CollectionReorderData?: (data: WithTypename<CollectionReorderData>) => null | string,
  InvitedUser?: (data: WithTypename<InvitedUser>) => null | string,
  RequestReorderData?: (data: WithTypename<RequestReorderData>) => null | string,
  Shortcode?: (data: WithTypename<Shortcode>) => null | string,
  Team?: (data: WithTypename<Team>) => null | string,
  TeamCollection?: (data: WithTypename<TeamCollection>) => null | string,
  TeamEnvironment?: (data: WithTypename<TeamEnvironment>) => null | string,
  TeamInvitation?: (data: WithTypename<TeamInvitation>) => null | string,
  TeamMember?: (data: WithTypename<TeamMember>) => null | string,
  TeamRequest?: (data: WithTypename<TeamRequest>) => null | string,
  User?: (data: WithTypename<User>) => null | string,
  UserCollection?: (data: WithTypename<UserCollection>) => null | string,
  UserCollectionExportJSONData?: (data: WithTypename<UserCollectionExportJsonData>) => null | string,
  UserCollectionRemovedData?: (data: WithTypename<UserCollectionRemovedData>) => null | string,
  UserCollectionReorderData?: (data: WithTypename<UserCollectionReorderData>) => null | string,
  UserEnvironment?: (data: WithTypename<UserEnvironment>) => null | string,
  UserHistory?: (data: WithTypename<UserHistory>) => null | string,
  UserHistoryDeletedManyData?: (data: WithTypename<UserHistoryDeletedManyData>) => null | string,
  UserRequest?: (data: WithTypename<UserRequest>) => null | string,
  UserRequestReorderData?: (data: WithTypename<UserRequestReorderData>) => null | string,
  UserSettings?: (data: WithTypename<UserSettings>) => null | string
}

export type GraphCacheResolvers = {
  Query?: {
    admin?: GraphCacheResolver<WithTypename<Query>, Record<string, never>, WithTypename<Admin> | string>,
    collection?: GraphCacheResolver<WithTypename<Query>, QueryCollectionArgs, WithTypename<TeamCollection> | string>,
    exportCollectionsToJSON?: GraphCacheResolver<WithTypename<Query>, QueryExportCollectionsToJsonArgs, Scalars['String'] | string>,
    exportUserCollectionsToJSON?: GraphCacheResolver<WithTypename<Query>, QueryExportUserCollectionsToJsonArgs, WithTypename<UserCollectionExportJsonData> | string>,
    me?: GraphCacheResolver<WithTypename<Query>, Record<string, never>, WithTypename<User> | string>,
    myShortcodes?: GraphCacheResolver<WithTypename<Query>, QueryMyShortcodesArgs, Array<WithTypename<Shortcode> | string>>,
    myTeams?: GraphCacheResolver<WithTypename<Query>, QueryMyTeamsArgs, Array<WithTypename<Team> | string>>,
    request?: GraphCacheResolver<WithTypename<Query>, QueryRequestArgs, WithTypename<TeamRequest> | string>,
    requestsInCollection?: GraphCacheResolver<WithTypename<Query>, QueryRequestsInCollectionArgs, Array<WithTypename<TeamRequest> | string>>,
    rootCollectionsOfTeam?: GraphCacheResolver<WithTypename<Query>, QueryRootCollectionsOfTeamArgs, Array<WithTypename<TeamCollection> | string>>,
    rootGQLUserCollections?: GraphCacheResolver<WithTypename<Query>, QueryRootGqlUserCollectionsArgs, Array<WithTypename<UserCollection> | string>>,
    rootRESTUserCollections?: GraphCacheResolver<WithTypename<Query>, QueryRootRestUserCollectionsArgs, Array<WithTypename<UserCollection> | string>>,
    searchForRequest?: GraphCacheResolver<WithTypename<Query>, QuerySearchForRequestArgs, Array<WithTypename<TeamRequest> | string>>,
    shortcode?: GraphCacheResolver<WithTypename<Query>, QueryShortcodeArgs, WithTypename<Shortcode> | string>,
    team?: GraphCacheResolver<WithTypename<Query>, QueryTeamArgs, WithTypename<Team> | string>,
    teamInvitation?: GraphCacheResolver<WithTypename<Query>, QueryTeamInvitationArgs, WithTypename<TeamInvitation> | string>,
    userCollection?: GraphCacheResolver<WithTypename<Query>, QueryUserCollectionArgs, WithTypename<UserCollection> | string>,
    userGQLRequests?: GraphCacheResolver<WithTypename<Query>, QueryUserGqlRequestsArgs, Array<WithTypename<UserRequest> | string>>,
    userRESTRequests?: GraphCacheResolver<WithTypename<Query>, QueryUserRestRequestsArgs, Array<WithTypename<UserRequest> | string>>,
    userRequest?: GraphCacheResolver<WithTypename<Query>, QueryUserRequestArgs, WithTypename<UserRequest> | string>
  },
  Admin?: {
    admins?: GraphCacheResolver<WithTypename<Admin>, Record<string, never>, Array<WithTypename<User> | string>>,
    allTeams?: GraphCacheResolver<WithTypename<Admin>, AdminAllTeamsArgs, Array<WithTypename<Team> | string>>,
    allUsers?: GraphCacheResolver<WithTypename<Admin>, AdminAllUsersArgs, Array<WithTypename<User> | string>>,
    collectionCountInTeam?: GraphCacheResolver<WithTypename<Admin>, AdminCollectionCountInTeamArgs, Scalars['Int'] | string>,
    environmentCountInTeam?: GraphCacheResolver<WithTypename<Admin>, AdminEnvironmentCountInTeamArgs, Scalars['Int'] | string>,
    invitedUsers?: GraphCacheResolver<WithTypename<Admin>, Record<string, never>, Array<WithTypename<InvitedUser> | string>>,
    membersCountInTeam?: GraphCacheResolver<WithTypename<Admin>, AdminMembersCountInTeamArgs, Scalars['Int'] | string>,
    pendingInvitationCountInTeam?: GraphCacheResolver<WithTypename<Admin>, AdminPendingInvitationCountInTeamArgs, Array<WithTypename<TeamInvitation> | string>>,
    requestCountInTeam?: GraphCacheResolver<WithTypename<Admin>, AdminRequestCountInTeamArgs, Scalars['Int'] | string>,
    teamCollectionsCount?: GraphCacheResolver<WithTypename<Admin>, Record<string, never>, Scalars['Int'] | string>,
    teamInfo?: GraphCacheResolver<WithTypename<Admin>, AdminTeamInfoArgs, WithTypename<Team> | string>,
    teamRequestsCount?: GraphCacheResolver<WithTypename<Admin>, Record<string, never>, Scalars['Int'] | string>,
    teamsCount?: GraphCacheResolver<WithTypename<Admin>, Record<string, never>, Scalars['Int'] | string>,
    userInfo?: GraphCacheResolver<WithTypename<Admin>, AdminUserInfoArgs, WithTypename<User> | string>,
    usersCount?: GraphCacheResolver<WithTypename<Admin>, Record<string, never>, Scalars['Int'] | string>
  },
  CollectionReorderData?: {
    collection?: GraphCacheResolver<WithTypename<CollectionReorderData>, Record<string, never>, WithTypename<TeamCollection> | string>,
    nextCollection?: GraphCacheResolver<WithTypename<CollectionReorderData>, Record<string, never>, WithTypename<TeamCollection> | string>
  },
  InvitedUser?: {
    adminEmail?: GraphCacheResolver<WithTypename<InvitedUser>, Record<string, never>, Scalars['String'] | string>,
    adminUid?: GraphCacheResolver<WithTypename<InvitedUser>, Record<string, never>, Scalars['ID'] | string>,
    invitedOn?: GraphCacheResolver<WithTypename<InvitedUser>, Record<string, never>, Scalars['DateTime'] | string>,
    inviteeEmail?: GraphCacheResolver<WithTypename<InvitedUser>, Record<string, never>, Scalars['String'] | string>
  },
  RequestReorderData?: {
    nextRequest?: GraphCacheResolver<WithTypename<RequestReorderData>, Record<string, never>, WithTypename<TeamRequest> | string>,
    request?: GraphCacheResolver<WithTypename<RequestReorderData>, Record<string, never>, WithTypename<TeamRequest> | string>
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
    parentID?: GraphCacheResolver<WithTypename<TeamCollection>, Record<string, never>, Scalars['ID'] | string>,
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
    inviteeEmail?: GraphCacheResolver<WithTypename<TeamInvitation>, Record<string, never>, Scalars['String'] | string>,
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
    GQLHistory?: GraphCacheResolver<WithTypename<User>, UserGqlHistoryArgs, Array<WithTypename<UserHistory> | string>>,
    RESTHistory?: GraphCacheResolver<WithTypename<User>, UserRestHistoryArgs, Array<WithTypename<UserHistory> | string>>,
    createdOn?: GraphCacheResolver<WithTypename<User>, Record<string, never>, Scalars['DateTime'] | string>,
    currentGQLSession?: GraphCacheResolver<WithTypename<User>, Record<string, never>, Scalars['String'] | string>,
    currentRESTSession?: GraphCacheResolver<WithTypename<User>, Record<string, never>, Scalars['String'] | string>,
    displayName?: GraphCacheResolver<WithTypename<User>, Record<string, never>, Scalars['String'] | string>,
    email?: GraphCacheResolver<WithTypename<User>, Record<string, never>, Scalars['String'] | string>,
    environments?: GraphCacheResolver<WithTypename<User>, Record<string, never>, Array<WithTypename<UserEnvironment> | string>>,
    globalEnvironments?: GraphCacheResolver<WithTypename<User>, Record<string, never>, WithTypename<UserEnvironment> | string>,
    isAdmin?: GraphCacheResolver<WithTypename<User>, Record<string, never>, Scalars['Boolean'] | string>,
    photoURL?: GraphCacheResolver<WithTypename<User>, Record<string, never>, Scalars['String'] | string>,
    settings?: GraphCacheResolver<WithTypename<User>, Record<string, never>, WithTypename<UserSettings> | string>,
    uid?: GraphCacheResolver<WithTypename<User>, Record<string, never>, Scalars['ID'] | string>
  },
  UserCollection?: {
    childrenGQL?: GraphCacheResolver<WithTypename<UserCollection>, UserCollectionChildrenGqlArgs, Array<WithTypename<UserCollection> | string>>,
    childrenREST?: GraphCacheResolver<WithTypename<UserCollection>, UserCollectionChildrenRestArgs, Array<WithTypename<UserCollection> | string>>,
    id?: GraphCacheResolver<WithTypename<UserCollection>, Record<string, never>, Scalars['ID'] | string>,
    parent?: GraphCacheResolver<WithTypename<UserCollection>, Record<string, never>, WithTypename<UserCollection> | string>,
    requests?: GraphCacheResolver<WithTypename<UserCollection>, UserCollectionRequestsArgs, Array<WithTypename<UserRequest> | string>>,
    title?: GraphCacheResolver<WithTypename<UserCollection>, Record<string, never>, Scalars['String'] | string>,
    type?: GraphCacheResolver<WithTypename<UserCollection>, Record<string, never>, ReqType | string>,
    user?: GraphCacheResolver<WithTypename<UserCollection>, Record<string, never>, WithTypename<User> | string>
  },
  UserCollectionExportJSONData?: {
    collectionType?: GraphCacheResolver<WithTypename<UserCollectionExportJsonData>, Record<string, never>, ReqType | string>,
    exportedCollection?: GraphCacheResolver<WithTypename<UserCollectionExportJsonData>, Record<string, never>, Scalars['ID'] | string>
  },
  UserCollectionRemovedData?: {
    id?: GraphCacheResolver<WithTypename<UserCollectionRemovedData>, Record<string, never>, Scalars['ID'] | string>,
    type?: GraphCacheResolver<WithTypename<UserCollectionRemovedData>, Record<string, never>, ReqType | string>
  },
  UserCollectionReorderData?: {
    nextUserCollection?: GraphCacheResolver<WithTypename<UserCollectionReorderData>, Record<string, never>, WithTypename<UserCollection> | string>,
    userCollection?: GraphCacheResolver<WithTypename<UserCollectionReorderData>, Record<string, never>, WithTypename<UserCollection> | string>
  },
  UserEnvironment?: {
    id?: GraphCacheResolver<WithTypename<UserEnvironment>, Record<string, never>, Scalars['ID'] | string>,
    isGlobal?: GraphCacheResolver<WithTypename<UserEnvironment>, Record<string, never>, Scalars['Boolean'] | string>,
    name?: GraphCacheResolver<WithTypename<UserEnvironment>, Record<string, never>, Scalars['String'] | string>,
    userUid?: GraphCacheResolver<WithTypename<UserEnvironment>, Record<string, never>, Scalars['ID'] | string>,
    variables?: GraphCacheResolver<WithTypename<UserEnvironment>, Record<string, never>, Scalars['String'] | string>
  },
  UserHistory?: {
    executedOn?: GraphCacheResolver<WithTypename<UserHistory>, Record<string, never>, Scalars['DateTime'] | string>,
    id?: GraphCacheResolver<WithTypename<UserHistory>, Record<string, never>, Scalars['ID'] | string>,
    isStarred?: GraphCacheResolver<WithTypename<UserHistory>, Record<string, never>, Scalars['Boolean'] | string>,
    reqType?: GraphCacheResolver<WithTypename<UserHistory>, Record<string, never>, ReqType | string>,
    request?: GraphCacheResolver<WithTypename<UserHistory>, Record<string, never>, Scalars['String'] | string>,
    responseMetadata?: GraphCacheResolver<WithTypename<UserHistory>, Record<string, never>, Scalars['String'] | string>,
    userUid?: GraphCacheResolver<WithTypename<UserHistory>, Record<string, never>, Scalars['ID'] | string>
  },
  UserHistoryDeletedManyData?: {
    count?: GraphCacheResolver<WithTypename<UserHistoryDeletedManyData>, Record<string, never>, Scalars['Int'] | string>,
    reqType?: GraphCacheResolver<WithTypename<UserHistoryDeletedManyData>, Record<string, never>, ReqType | string>
  },
  UserRequest?: {
    collectionID?: GraphCacheResolver<WithTypename<UserRequest>, Record<string, never>, Scalars['ID'] | string>,
    createdOn?: GraphCacheResolver<WithTypename<UserRequest>, Record<string, never>, Scalars['DateTime'] | string>,
    id?: GraphCacheResolver<WithTypename<UserRequest>, Record<string, never>, Scalars['ID'] | string>,
    request?: GraphCacheResolver<WithTypename<UserRequest>, Record<string, never>, Scalars['String'] | string>,
    title?: GraphCacheResolver<WithTypename<UserRequest>, Record<string, never>, Scalars['String'] | string>,
    type?: GraphCacheResolver<WithTypename<UserRequest>, Record<string, never>, ReqType | string>,
    user?: GraphCacheResolver<WithTypename<UserRequest>, Record<string, never>, WithTypename<User> | string>
  },
  UserRequestReorderData?: {
    nextRequest?: GraphCacheResolver<WithTypename<UserRequestReorderData>, Record<string, never>, WithTypename<UserRequest> | string>,
    request?: GraphCacheResolver<WithTypename<UserRequestReorderData>, Record<string, never>, WithTypename<UserRequest> | string>
  },
  UserSettings?: {
    id?: GraphCacheResolver<WithTypename<UserSettings>, Record<string, never>, Scalars['ID'] | string>,
    properties?: GraphCacheResolver<WithTypename<UserSettings>, Record<string, never>, Scalars['String'] | string>,
    updatedOn?: GraphCacheResolver<WithTypename<UserSettings>, Record<string, never>, Scalars['DateTime'] | string>,
    userUid?: GraphCacheResolver<WithTypename<UserSettings>, Record<string, never>, Scalars['ID'] | string>
  }
};

export type GraphCacheOptimisticUpdaters = {
  acceptTeamInvitation?: GraphCacheOptimisticMutationResolver<MutationAcceptTeamInvitationArgs, WithTypename<TeamMember>>,
  addUserToTeamByAdmin?: GraphCacheOptimisticMutationResolver<MutationAddUserToTeamByAdminArgs, WithTypename<TeamMember>>,
  changeUserRoleInTeamByAdmin?: GraphCacheOptimisticMutationResolver<MutationChangeUserRoleInTeamByAdminArgs, WithTypename<TeamMember>>,
  clearGlobalEnvironments?: GraphCacheOptimisticMutationResolver<MutationClearGlobalEnvironmentsArgs, WithTypename<UserEnvironment>>,
  createChildCollection?: GraphCacheOptimisticMutationResolver<MutationCreateChildCollectionArgs, WithTypename<TeamCollection>>,
  createDuplicateEnvironment?: GraphCacheOptimisticMutationResolver<MutationCreateDuplicateEnvironmentArgs, WithTypename<TeamEnvironment>>,
  createGQLChildUserCollection?: GraphCacheOptimisticMutationResolver<MutationCreateGqlChildUserCollectionArgs, WithTypename<UserCollection>>,
  createGQLRootUserCollection?: GraphCacheOptimisticMutationResolver<MutationCreateGqlRootUserCollectionArgs, WithTypename<UserCollection>>,
  createGQLUserRequest?: GraphCacheOptimisticMutationResolver<MutationCreateGqlUserRequestArgs, WithTypename<UserRequest>>,
  createRESTChildUserCollection?: GraphCacheOptimisticMutationResolver<MutationCreateRestChildUserCollectionArgs, WithTypename<UserCollection>>,
  createRESTRootUserCollection?: GraphCacheOptimisticMutationResolver<MutationCreateRestRootUserCollectionArgs, WithTypename<UserCollection>>,
  createRESTUserRequest?: GraphCacheOptimisticMutationResolver<MutationCreateRestUserRequestArgs, WithTypename<UserRequest>>,
  createRequestInCollection?: GraphCacheOptimisticMutationResolver<MutationCreateRequestInCollectionArgs, WithTypename<TeamRequest>>,
  createRootCollection?: GraphCacheOptimisticMutationResolver<MutationCreateRootCollectionArgs, WithTypename<TeamCollection>>,
  createShortcode?: GraphCacheOptimisticMutationResolver<MutationCreateShortcodeArgs, WithTypename<Shortcode>>,
  createTeam?: GraphCacheOptimisticMutationResolver<MutationCreateTeamArgs, WithTypename<Team>>,
  createTeamByAdmin?: GraphCacheOptimisticMutationResolver<MutationCreateTeamByAdminArgs, WithTypename<Team>>,
  createTeamEnvironment?: GraphCacheOptimisticMutationResolver<MutationCreateTeamEnvironmentArgs, WithTypename<TeamEnvironment>>,
  createTeamInvitation?: GraphCacheOptimisticMutationResolver<MutationCreateTeamInvitationArgs, WithTypename<TeamInvitation>>,
  createUserEnvironment?: GraphCacheOptimisticMutationResolver<MutationCreateUserEnvironmentArgs, WithTypename<UserEnvironment>>,
  createUserGlobalEnvironment?: GraphCacheOptimisticMutationResolver<MutationCreateUserGlobalEnvironmentArgs, WithTypename<UserEnvironment>>,
  createUserHistory?: GraphCacheOptimisticMutationResolver<MutationCreateUserHistoryArgs, WithTypename<UserHistory>>,
  createUserSettings?: GraphCacheOptimisticMutationResolver<MutationCreateUserSettingsArgs, WithTypename<UserSettings>>,
  deleteAllUserHistory?: GraphCacheOptimisticMutationResolver<MutationDeleteAllUserHistoryArgs, WithTypename<UserHistoryDeletedManyData>>,
  deleteAllVariablesFromTeamEnvironment?: GraphCacheOptimisticMutationResolver<MutationDeleteAllVariablesFromTeamEnvironmentArgs, WithTypename<TeamEnvironment>>,
  deleteCollection?: GraphCacheOptimisticMutationResolver<MutationDeleteCollectionArgs, Scalars['Boolean']>,
  deleteRequest?: GraphCacheOptimisticMutationResolver<MutationDeleteRequestArgs, Scalars['Boolean']>,
  deleteTeam?: GraphCacheOptimisticMutationResolver<MutationDeleteTeamArgs, Scalars['Boolean']>,
  deleteTeamByAdmin?: GraphCacheOptimisticMutationResolver<MutationDeleteTeamByAdminArgs, Scalars['Boolean']>,
  deleteTeamEnvironment?: GraphCacheOptimisticMutationResolver<MutationDeleteTeamEnvironmentArgs, Scalars['Boolean']>,
  deleteUser?: GraphCacheOptimisticMutationResolver<Record<string, never>, Scalars['Boolean']>,
  deleteUserCollection?: GraphCacheOptimisticMutationResolver<MutationDeleteUserCollectionArgs, Scalars['Boolean']>,
  deleteUserEnvironment?: GraphCacheOptimisticMutationResolver<MutationDeleteUserEnvironmentArgs, Scalars['Boolean']>,
  deleteUserEnvironments?: GraphCacheOptimisticMutationResolver<Record<string, never>, Scalars['Int']>,
  deleteUserRequest?: GraphCacheOptimisticMutationResolver<MutationDeleteUserRequestArgs, Scalars['Boolean']>,
  importCollectionsFromJSON?: GraphCacheOptimisticMutationResolver<MutationImportCollectionsFromJsonArgs, Scalars['Boolean']>,
  importUserCollectionsFromJSON?: GraphCacheOptimisticMutationResolver<MutationImportUserCollectionsFromJsonArgs, Scalars['Boolean']>,
  inviteNewUser?: GraphCacheOptimisticMutationResolver<MutationInviteNewUserArgs, WithTypename<InvitedUser>>,
  leaveTeam?: GraphCacheOptimisticMutationResolver<MutationLeaveTeamArgs, Scalars['Boolean']>,
  makeUserAdmin?: GraphCacheOptimisticMutationResolver<MutationMakeUserAdminArgs, Scalars['Boolean']>,
  moveCollection?: GraphCacheOptimisticMutationResolver<MutationMoveCollectionArgs, WithTypename<TeamCollection>>,
  moveRequest?: GraphCacheOptimisticMutationResolver<MutationMoveRequestArgs, WithTypename<TeamRequest>>,
  moveUserCollection?: GraphCacheOptimisticMutationResolver<MutationMoveUserCollectionArgs, WithTypename<UserCollection>>,
  moveUserRequest?: GraphCacheOptimisticMutationResolver<MutationMoveUserRequestArgs, WithTypename<UserRequest>>,
  removeRequestFromHistory?: GraphCacheOptimisticMutationResolver<MutationRemoveRequestFromHistoryArgs, WithTypename<UserHistory>>,
  removeTeamMember?: GraphCacheOptimisticMutationResolver<MutationRemoveTeamMemberArgs, Scalars['Boolean']>,
  removeUserAsAdmin?: GraphCacheOptimisticMutationResolver<MutationRemoveUserAsAdminArgs, Scalars['Boolean']>,
  removeUserByAdmin?: GraphCacheOptimisticMutationResolver<MutationRemoveUserByAdminArgs, Scalars['Boolean']>,
  removeUserFromTeamByAdmin?: GraphCacheOptimisticMutationResolver<MutationRemoveUserFromTeamByAdminArgs, Scalars['Boolean']>,
  renameCollection?: GraphCacheOptimisticMutationResolver<MutationRenameCollectionArgs, WithTypename<TeamCollection>>,
  renameTeam?: GraphCacheOptimisticMutationResolver<MutationRenameTeamArgs, WithTypename<Team>>,
  renameTeamByAdmin?: GraphCacheOptimisticMutationResolver<MutationRenameTeamByAdminArgs, WithTypename<Team>>,
  renameUserCollection?: GraphCacheOptimisticMutationResolver<MutationRenameUserCollectionArgs, WithTypename<UserCollection>>,
  replaceCollectionsWithJSON?: GraphCacheOptimisticMutationResolver<MutationReplaceCollectionsWithJsonArgs, Scalars['Boolean']>,
  revokeShortcode?: GraphCacheOptimisticMutationResolver<MutationRevokeShortcodeArgs, Scalars['Boolean']>,
  revokeTeamInvitation?: GraphCacheOptimisticMutationResolver<MutationRevokeTeamInvitationArgs, Scalars['Boolean']>,
  toggleHistoryStarStatus?: GraphCacheOptimisticMutationResolver<MutationToggleHistoryStarStatusArgs, WithTypename<UserHistory>>,
  updateCollectionOrder?: GraphCacheOptimisticMutationResolver<MutationUpdateCollectionOrderArgs, Scalars['Boolean']>,
  updateGQLUserRequest?: GraphCacheOptimisticMutationResolver<MutationUpdateGqlUserRequestArgs, WithTypename<UserRequest>>,
  updateLookUpRequestOrder?: GraphCacheOptimisticMutationResolver<MutationUpdateLookUpRequestOrderArgs, Scalars['Boolean']>,
  updateRESTUserRequest?: GraphCacheOptimisticMutationResolver<MutationUpdateRestUserRequestArgs, WithTypename<UserRequest>>,
  updateRequest?: GraphCacheOptimisticMutationResolver<MutationUpdateRequestArgs, WithTypename<TeamRequest>>,
  updateTeamEnvironment?: GraphCacheOptimisticMutationResolver<MutationUpdateTeamEnvironmentArgs, WithTypename<TeamEnvironment>>,
  updateTeamMemberRole?: GraphCacheOptimisticMutationResolver<MutationUpdateTeamMemberRoleArgs, WithTypename<TeamMember>>,
  updateUserCollectionOrder?: GraphCacheOptimisticMutationResolver<MutationUpdateUserCollectionOrderArgs, Scalars['Boolean']>,
  updateUserEnvironment?: GraphCacheOptimisticMutationResolver<MutationUpdateUserEnvironmentArgs, WithTypename<UserEnvironment>>,
  updateUserSessions?: GraphCacheOptimisticMutationResolver<MutationUpdateUserSessionsArgs, WithTypename<User>>,
  updateUserSettings?: GraphCacheOptimisticMutationResolver<MutationUpdateUserSettingsArgs, WithTypename<UserSettings>>
};

export type GraphCacheUpdaters = {
  Mutation?: {
    acceptTeamInvitation?: GraphCacheUpdateResolver<{ acceptTeamInvitation: WithTypename<TeamMember> }, MutationAcceptTeamInvitationArgs>,
    addUserToTeamByAdmin?: GraphCacheUpdateResolver<{ addUserToTeamByAdmin: WithTypename<TeamMember> }, MutationAddUserToTeamByAdminArgs>,
    changeUserRoleInTeamByAdmin?: GraphCacheUpdateResolver<{ changeUserRoleInTeamByAdmin: WithTypename<TeamMember> }, MutationChangeUserRoleInTeamByAdminArgs>,
    clearGlobalEnvironments?: GraphCacheUpdateResolver<{ clearGlobalEnvironments: WithTypename<UserEnvironment> }, MutationClearGlobalEnvironmentsArgs>,
    createChildCollection?: GraphCacheUpdateResolver<{ createChildCollection: WithTypename<TeamCollection> }, MutationCreateChildCollectionArgs>,
    createDuplicateEnvironment?: GraphCacheUpdateResolver<{ createDuplicateEnvironment: WithTypename<TeamEnvironment> }, MutationCreateDuplicateEnvironmentArgs>,
    createGQLChildUserCollection?: GraphCacheUpdateResolver<{ createGQLChildUserCollection: WithTypename<UserCollection> }, MutationCreateGqlChildUserCollectionArgs>,
    createGQLRootUserCollection?: GraphCacheUpdateResolver<{ createGQLRootUserCollection: WithTypename<UserCollection> }, MutationCreateGqlRootUserCollectionArgs>,
    createGQLUserRequest?: GraphCacheUpdateResolver<{ createGQLUserRequest: WithTypename<UserRequest> }, MutationCreateGqlUserRequestArgs>,
    createRESTChildUserCollection?: GraphCacheUpdateResolver<{ createRESTChildUserCollection: WithTypename<UserCollection> }, MutationCreateRestChildUserCollectionArgs>,
    createRESTRootUserCollection?: GraphCacheUpdateResolver<{ createRESTRootUserCollection: WithTypename<UserCollection> }, MutationCreateRestRootUserCollectionArgs>,
    createRESTUserRequest?: GraphCacheUpdateResolver<{ createRESTUserRequest: WithTypename<UserRequest> }, MutationCreateRestUserRequestArgs>,
    createRequestInCollection?: GraphCacheUpdateResolver<{ createRequestInCollection: WithTypename<TeamRequest> }, MutationCreateRequestInCollectionArgs>,
    createRootCollection?: GraphCacheUpdateResolver<{ createRootCollection: WithTypename<TeamCollection> }, MutationCreateRootCollectionArgs>,
    createShortcode?: GraphCacheUpdateResolver<{ createShortcode: WithTypename<Shortcode> }, MutationCreateShortcodeArgs>,
    createTeam?: GraphCacheUpdateResolver<{ createTeam: WithTypename<Team> }, MutationCreateTeamArgs>,
    createTeamByAdmin?: GraphCacheUpdateResolver<{ createTeamByAdmin: WithTypename<Team> }, MutationCreateTeamByAdminArgs>,
    createTeamEnvironment?: GraphCacheUpdateResolver<{ createTeamEnvironment: WithTypename<TeamEnvironment> }, MutationCreateTeamEnvironmentArgs>,
    createTeamInvitation?: GraphCacheUpdateResolver<{ createTeamInvitation: WithTypename<TeamInvitation> }, MutationCreateTeamInvitationArgs>,
    createUserEnvironment?: GraphCacheUpdateResolver<{ createUserEnvironment: WithTypename<UserEnvironment> }, MutationCreateUserEnvironmentArgs>,
    createUserGlobalEnvironment?: GraphCacheUpdateResolver<{ createUserGlobalEnvironment: WithTypename<UserEnvironment> }, MutationCreateUserGlobalEnvironmentArgs>,
    createUserHistory?: GraphCacheUpdateResolver<{ createUserHistory: WithTypename<UserHistory> }, MutationCreateUserHistoryArgs>,
    createUserSettings?: GraphCacheUpdateResolver<{ createUserSettings: WithTypename<UserSettings> }, MutationCreateUserSettingsArgs>,
    deleteAllUserHistory?: GraphCacheUpdateResolver<{ deleteAllUserHistory: WithTypename<UserHistoryDeletedManyData> }, MutationDeleteAllUserHistoryArgs>,
    deleteAllVariablesFromTeamEnvironment?: GraphCacheUpdateResolver<{ deleteAllVariablesFromTeamEnvironment: WithTypename<TeamEnvironment> }, MutationDeleteAllVariablesFromTeamEnvironmentArgs>,
    deleteCollection?: GraphCacheUpdateResolver<{ deleteCollection: Scalars['Boolean'] }, MutationDeleteCollectionArgs>,
    deleteRequest?: GraphCacheUpdateResolver<{ deleteRequest: Scalars['Boolean'] }, MutationDeleteRequestArgs>,
    deleteTeam?: GraphCacheUpdateResolver<{ deleteTeam: Scalars['Boolean'] }, MutationDeleteTeamArgs>,
    deleteTeamByAdmin?: GraphCacheUpdateResolver<{ deleteTeamByAdmin: Scalars['Boolean'] }, MutationDeleteTeamByAdminArgs>,
    deleteTeamEnvironment?: GraphCacheUpdateResolver<{ deleteTeamEnvironment: Scalars['Boolean'] }, MutationDeleteTeamEnvironmentArgs>,
    deleteUser?: GraphCacheUpdateResolver<{ deleteUser: Scalars['Boolean'] }, Record<string, never>>,
    deleteUserCollection?: GraphCacheUpdateResolver<{ deleteUserCollection: Scalars['Boolean'] }, MutationDeleteUserCollectionArgs>,
    deleteUserEnvironment?: GraphCacheUpdateResolver<{ deleteUserEnvironment: Scalars['Boolean'] }, MutationDeleteUserEnvironmentArgs>,
    deleteUserEnvironments?: GraphCacheUpdateResolver<{ deleteUserEnvironments: Scalars['Int'] }, Record<string, never>>,
    deleteUserRequest?: GraphCacheUpdateResolver<{ deleteUserRequest: Scalars['Boolean'] }, MutationDeleteUserRequestArgs>,
    importCollectionsFromJSON?: GraphCacheUpdateResolver<{ importCollectionsFromJSON: Scalars['Boolean'] }, MutationImportCollectionsFromJsonArgs>,
    importUserCollectionsFromJSON?: GraphCacheUpdateResolver<{ importUserCollectionsFromJSON: Scalars['Boolean'] }, MutationImportUserCollectionsFromJsonArgs>,
    inviteNewUser?: GraphCacheUpdateResolver<{ inviteNewUser: WithTypename<InvitedUser> }, MutationInviteNewUserArgs>,
    leaveTeam?: GraphCacheUpdateResolver<{ leaveTeam: Scalars['Boolean'] }, MutationLeaveTeamArgs>,
    makeUserAdmin?: GraphCacheUpdateResolver<{ makeUserAdmin: Scalars['Boolean'] }, MutationMakeUserAdminArgs>,
    moveCollection?: GraphCacheUpdateResolver<{ moveCollection: WithTypename<TeamCollection> }, MutationMoveCollectionArgs>,
    moveRequest?: GraphCacheUpdateResolver<{ moveRequest: WithTypename<TeamRequest> }, MutationMoveRequestArgs>,
    moveUserCollection?: GraphCacheUpdateResolver<{ moveUserCollection: WithTypename<UserCollection> }, MutationMoveUserCollectionArgs>,
    moveUserRequest?: GraphCacheUpdateResolver<{ moveUserRequest: WithTypename<UserRequest> }, MutationMoveUserRequestArgs>,
    removeRequestFromHistory?: GraphCacheUpdateResolver<{ removeRequestFromHistory: WithTypename<UserHistory> }, MutationRemoveRequestFromHistoryArgs>,
    removeTeamMember?: GraphCacheUpdateResolver<{ removeTeamMember: Scalars['Boolean'] }, MutationRemoveTeamMemberArgs>,
    removeUserAsAdmin?: GraphCacheUpdateResolver<{ removeUserAsAdmin: Scalars['Boolean'] }, MutationRemoveUserAsAdminArgs>,
    removeUserByAdmin?: GraphCacheUpdateResolver<{ removeUserByAdmin: Scalars['Boolean'] }, MutationRemoveUserByAdminArgs>,
    removeUserFromTeamByAdmin?: GraphCacheUpdateResolver<{ removeUserFromTeamByAdmin: Scalars['Boolean'] }, MutationRemoveUserFromTeamByAdminArgs>,
    renameCollection?: GraphCacheUpdateResolver<{ renameCollection: WithTypename<TeamCollection> }, MutationRenameCollectionArgs>,
    renameTeam?: GraphCacheUpdateResolver<{ renameTeam: WithTypename<Team> }, MutationRenameTeamArgs>,
    renameTeamByAdmin?: GraphCacheUpdateResolver<{ renameTeamByAdmin: WithTypename<Team> }, MutationRenameTeamByAdminArgs>,
    renameUserCollection?: GraphCacheUpdateResolver<{ renameUserCollection: WithTypename<UserCollection> }, MutationRenameUserCollectionArgs>,
    replaceCollectionsWithJSON?: GraphCacheUpdateResolver<{ replaceCollectionsWithJSON: Scalars['Boolean'] }, MutationReplaceCollectionsWithJsonArgs>,
    revokeShortcode?: GraphCacheUpdateResolver<{ revokeShortcode: Scalars['Boolean'] }, MutationRevokeShortcodeArgs>,
    revokeTeamInvitation?: GraphCacheUpdateResolver<{ revokeTeamInvitation: Scalars['Boolean'] }, MutationRevokeTeamInvitationArgs>,
    toggleHistoryStarStatus?: GraphCacheUpdateResolver<{ toggleHistoryStarStatus: WithTypename<UserHistory> }, MutationToggleHistoryStarStatusArgs>,
    updateCollectionOrder?: GraphCacheUpdateResolver<{ updateCollectionOrder: Scalars['Boolean'] }, MutationUpdateCollectionOrderArgs>,
    updateGQLUserRequest?: GraphCacheUpdateResolver<{ updateGQLUserRequest: WithTypename<UserRequest> }, MutationUpdateGqlUserRequestArgs>,
    updateLookUpRequestOrder?: GraphCacheUpdateResolver<{ updateLookUpRequestOrder: Scalars['Boolean'] }, MutationUpdateLookUpRequestOrderArgs>,
    updateRESTUserRequest?: GraphCacheUpdateResolver<{ updateRESTUserRequest: WithTypename<UserRequest> }, MutationUpdateRestUserRequestArgs>,
    updateRequest?: GraphCacheUpdateResolver<{ updateRequest: WithTypename<TeamRequest> }, MutationUpdateRequestArgs>,
    updateTeamEnvironment?: GraphCacheUpdateResolver<{ updateTeamEnvironment: WithTypename<TeamEnvironment> }, MutationUpdateTeamEnvironmentArgs>,
    updateTeamMemberRole?: GraphCacheUpdateResolver<{ updateTeamMemberRole: WithTypename<TeamMember> }, MutationUpdateTeamMemberRoleArgs>,
    updateUserCollectionOrder?: GraphCacheUpdateResolver<{ updateUserCollectionOrder: Scalars['Boolean'] }, MutationUpdateUserCollectionOrderArgs>,
    updateUserEnvironment?: GraphCacheUpdateResolver<{ updateUserEnvironment: WithTypename<UserEnvironment> }, MutationUpdateUserEnvironmentArgs>,
    updateUserSessions?: GraphCacheUpdateResolver<{ updateUserSessions: WithTypename<User> }, MutationUpdateUserSessionsArgs>,
    updateUserSettings?: GraphCacheUpdateResolver<{ updateUserSettings: WithTypename<UserSettings> }, MutationUpdateUserSettingsArgs>
  },
  Subscription?: {
    collectionOrderUpdated?: GraphCacheUpdateResolver<{ collectionOrderUpdated: WithTypename<CollectionReorderData> }, SubscriptionCollectionOrderUpdatedArgs>,
    myShortcodesCreated?: GraphCacheUpdateResolver<{ myShortcodesCreated: WithTypename<Shortcode> }, Record<string, never>>,
    myShortcodesRevoked?: GraphCacheUpdateResolver<{ myShortcodesRevoked: WithTypename<Shortcode> }, Record<string, never>>,
    requestMoved?: GraphCacheUpdateResolver<{ requestMoved: WithTypename<TeamRequest> }, SubscriptionRequestMovedArgs>,
    requestOrderUpdated?: GraphCacheUpdateResolver<{ requestOrderUpdated: WithTypename<RequestReorderData> }, SubscriptionRequestOrderUpdatedArgs>,
    teamCollectionAdded?: GraphCacheUpdateResolver<{ teamCollectionAdded: WithTypename<TeamCollection> }, SubscriptionTeamCollectionAddedArgs>,
    teamCollectionMoved?: GraphCacheUpdateResolver<{ teamCollectionMoved: WithTypename<TeamCollection> }, SubscriptionTeamCollectionMovedArgs>,
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
    teamRequestUpdated?: GraphCacheUpdateResolver<{ teamRequestUpdated: WithTypename<TeamRequest> }, SubscriptionTeamRequestUpdatedArgs>,
    userCollectionCreated?: GraphCacheUpdateResolver<{ userCollectionCreated: WithTypename<UserCollection> }, Record<string, never>>,
    userCollectionMoved?: GraphCacheUpdateResolver<{ userCollectionMoved: WithTypename<UserCollection> }, Record<string, never>>,
    userCollectionOrderUpdated?: GraphCacheUpdateResolver<{ userCollectionOrderUpdated: WithTypename<UserCollectionReorderData> }, Record<string, never>>,
    userCollectionRemoved?: GraphCacheUpdateResolver<{ userCollectionRemoved: WithTypename<UserCollectionRemovedData> }, Record<string, never>>,
    userCollectionUpdated?: GraphCacheUpdateResolver<{ userCollectionUpdated: WithTypename<UserCollection> }, Record<string, never>>,
    userDeleted?: GraphCacheUpdateResolver<{ userDeleted: WithTypename<User> }, Record<string, never>>,
    userEnvironmentCreated?: GraphCacheUpdateResolver<{ userEnvironmentCreated: WithTypename<UserEnvironment> }, Record<string, never>>,
    userEnvironmentDeleteMany?: GraphCacheUpdateResolver<{ userEnvironmentDeleteMany: Scalars['Int'] }, Record<string, never>>,
    userEnvironmentDeleted?: GraphCacheUpdateResolver<{ userEnvironmentDeleted: WithTypename<UserEnvironment> }, Record<string, never>>,
    userEnvironmentUpdated?: GraphCacheUpdateResolver<{ userEnvironmentUpdated: WithTypename<UserEnvironment> }, Record<string, never>>,
    userHistoryCreated?: GraphCacheUpdateResolver<{ userHistoryCreated: WithTypename<UserHistory> }, Record<string, never>>,
    userHistoryDeleted?: GraphCacheUpdateResolver<{ userHistoryDeleted: WithTypename<UserHistory> }, Record<string, never>>,
    userHistoryDeletedMany?: GraphCacheUpdateResolver<{ userHistoryDeletedMany: WithTypename<UserHistoryDeletedManyData> }, Record<string, never>>,
    userHistoryUpdated?: GraphCacheUpdateResolver<{ userHistoryUpdated: WithTypename<UserHistory> }, Record<string, never>>,
    userInvited?: GraphCacheUpdateResolver<{ userInvited: WithTypename<InvitedUser> }, Record<string, never>>,
    userRequestCreated?: GraphCacheUpdateResolver<{ userRequestCreated: WithTypename<UserRequest> }, Record<string, never>>,
    userRequestDeleted?: GraphCacheUpdateResolver<{ userRequestDeleted: WithTypename<UserRequest> }, Record<string, never>>,
    userRequestMoved?: GraphCacheUpdateResolver<{ userRequestMoved: WithTypename<UserRequestReorderData> }, Record<string, never>>,
    userRequestUpdated?: GraphCacheUpdateResolver<{ userRequestUpdated: WithTypename<UserRequest> }, Record<string, never>>,
    userSettingsCreated?: GraphCacheUpdateResolver<{ userSettingsCreated: WithTypename<UserSettings> }, Record<string, never>>,
    userSettingsUpdated?: GraphCacheUpdateResolver<{ userSettingsUpdated: WithTypename<UserSettings> }, Record<string, never>>,
    userUpdated?: GraphCacheUpdateResolver<{ userUpdated: WithTypename<User> }, Record<string, never>>
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