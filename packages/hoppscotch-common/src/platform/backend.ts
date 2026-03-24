import { HoppRESTRequest } from "@hoppscotch/data"
import * as TE from "fp-ts/TaskEither"
import * as E from "fp-ts/lib/Either"

import { GQLError } from "~/helpers/backend/GQLClient"
import {
  AcceptTeamInvitationMutation,
  CreatePublishedDocMutation,
  CreatePublishedDocsArgs,
  CreateShortcodeMutation,
  CreateTeamInvitationMutation,
  CreateTeamMutation,
  DeletePublishedDocMutation,
  GetInviteDetailsQuery,
  GetInviteDetailsQueryVariables,
  GetMockServerLogsQuery,
  GetMyTeamsQuery,
  PublishedDocQuery,
  GetUserShortcodesQuery,
  TeamAccessRole,
  TeamPublishedDocsListQuery,
  UpdatePublishedDocMutation,
  UpdatePublishedDocsArgs,
  UserPublishedDocsListQuery,
  WorkspaceType,
} from "~/helpers/backend/graphql"

import { useGQLQuery } from "~/composables/graphql"
import { Email } from "~/helpers/backend/types/Email"
import type { MockServer } from "~/helpers/backend/types/MockServer"
import { TeamName } from "~/helpers/backend/types/TeamName"

export type BackendPlatformDef = {
  // Read actions via GQL queries
  getInviteDetails: <GetInviteDetailsError extends string>(
    inviteID: string
  ) => ReturnType<
    typeof useGQLQuery<
      GetInviteDetailsQuery,
      GetInviteDetailsQueryVariables,
      GetInviteDetailsError
    >
  >

  getUserShortcodes: (
    cursor?: string
  ) => Promise<E.Either<GQLError<"">, GetUserShortcodesQuery>>

  // Sample use case for `matchAllTeams` would be at the cloud platform level where the list of teams across instances is fetched
  // and not limited to a single instance.
  getUserTeams: (
    cursor?: string,
    matchAllTeams?: boolean
  ) => Promise<E.Either<GQLError<"">, GetMyTeamsQuery>>

  // Write actions via GQL mutations
  createTeam: <CreateTeamErrors extends string>(
    name: TeamName
  ) => TE.TaskEither<GQLError<CreateTeamErrors>, CreateTeamMutation>

  createTeamInvitation: <CreateTeamInvitationErrors extends string>(
    inviteeEmail: Email,
    inviteeRole: TeamAccessRole,
    teamID: string
  ) => TE.TaskEither<
    GQLError<CreateTeamInvitationErrors>,
    CreateTeamInvitationMutation
  >

  acceptTeamInvitation: <AcceptTeamInvitationErrors extends string>(
    inviteID: string
  ) => TE.TaskEither<
    GQLError<AcceptTeamInvitationErrors>,
    AcceptTeamInvitationMutation
  >

  createShortcode: (
    request: HoppRESTRequest,
    properties?: string
  ) => TE.TaskEither<GQLError<string>, CreateShortcodeMutation>

  // Mock server operations
  createMockServer: (
    name: string,
    workspaceType?: WorkspaceType,
    workspaceID?: string,
    delayInMs?: number,
    isPublic?: boolean,
    collectionID?: string,
    autoCreateCollection?: boolean,
    autoCreateRequestExample?: boolean
  ) => TE.TaskEither<string, MockServer>

  updateMockServer: (
    id: string,
    input: {
      name?: string
      isActive?: boolean
      delayInMs?: number
      isPublic?: boolean
    }
  ) => TE.TaskEither<string, MockServer>

  deleteMockServer: (id: string) => TE.TaskEither<string, boolean>

  getMockServer: (id: string) => TE.TaskEither<string, MockServer>

  getMyMockServers: (
    skip?: number,
    take?: number
  ) => TE.TaskEither<string, MockServer[]>

  getTeamMockServers: (
    teamID: string,
    skip?: number,
    take?: number
  ) => TE.TaskEither<string, MockServer[]>

  getMockServerLogs: (
    mockServerID: string,
    skip?: number,
    take?: number
  ) => TE.TaskEither<string, GetMockServerLogsQuery["mockServerLogs"]>

  deleteMockServerLog: (logID: string) => TE.TaskEither<string, boolean>

  // Published docs operations
  createPublishedDoc: (
    doc: CreatePublishedDocsArgs
  ) => TE.TaskEither<GQLError<string>, CreatePublishedDocMutation>

  updatePublishedDoc: (
    id: string,
    doc: UpdatePublishedDocsArgs
  ) => TE.TaskEither<GQLError<string>, UpdatePublishedDocMutation>

  deletePublishedDoc: (
    id: string
  ) => TE.TaskEither<GQLError<string>, DeletePublishedDocMutation>

  getPublishedDocByID: (
    id: string
  ) => TE.TaskEither<string, PublishedDocQuery["publishedDoc"]>

  getUserPublishedDocs: (
    skip?: number,
    take?: number
  ) => TE.TaskEither<
    string,
    UserPublishedDocsListQuery["userPublishedDocsList"]
  >

  getTeamPublishedDocs: (
    teamID: string,
    collectionID?: string,
    skip?: number,
    take?: number
  ) => TE.TaskEither<
    string,
    TeamPublishedDocsListQuery["teamPublishedDocsList"]
  >
}
