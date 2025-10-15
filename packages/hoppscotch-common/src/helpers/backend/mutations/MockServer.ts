import * as TE from "fp-ts/TaskEither"
import { client } from "../GQLClient"
import {
  CreateMockServerDocument,
  UpdateMockServerDocument,
  DeleteMockServerDocument,
  GetTeamMockServersDocument,
  WorkspaceType,
} from "../graphql"

// Types for mock server
export type MockServer = {
  id: string
  name: string
  subdomain: string
  workspaceType: WorkspaceType
  workspaceID: string
  delayInMs: number
  isPublic: boolean
  isActive: boolean
  createdOn: Date
  updatedOn: Date
  creator?: {
    uid: string
  }
  collection?: {
    id: string
    title: string
    requests?: any[]
  }
  // Legacy fields for backward compatibility
  userUid?: string
  collectionID?: string
}

type CreateMockServerError =
  | "mock_server/invalid_collection_id"
  | "mock_server/name_too_short"
  | "mock_server/limit_exceeded"
  | "mock_server/already_exists"

type UpdateMockServerError =
  | "mock_server/not_found"
  | "mock_server/access_denied"

type DeleteMockServerError =
  | "mock_server/not_found"
  | "mock_server/access_denied"

export const createMockServer = (
  name: string,
  collectionID: string,
  workspaceType: WorkspaceType = WorkspaceType.User,
  workspaceID?: string,
  delayInMs: number = 0,
  isPublic: boolean = true
) =>
  TE.tryCatch(
    async () => {
      const result = await client
        .value!.mutation(CreateMockServerDocument, {
          input: {
            name,
            collectionID,
            workspaceType,
            workspaceID,
            delayInMs,
            isPublic,
          },
        })
        .toPromise()

      if (result.error) {
        throw new Error(result.error.message || "Failed to create mock server")
      }

      if (!result.data) {
        throw new Error("No data returned from create mock server mutation")
      }

      const data = result.data.createMockServer
      // Map the GraphQL response to frontend format
      return {
        ...data,
        userUid: data.creator?.uid || "", // Legacy field
        collectionID: data.collection?.id || collectionID, // Legacy field
      } as MockServer
    },
    (error) => (error as Error).message as CreateMockServerError
  )

export const updateMockServer = (
  id: string,
  input: {
    name?: string
    isActive?: boolean
    delayInMs?: number
    isPublic?: boolean
  }
) =>
  TE.tryCatch(
    async () => {
      const result = await client
        .value!.mutation(UpdateMockServerDocument, {
          id,
          input,
        })
        .toPromise()

      if (result.error) {
        throw new Error(result.error.message || "Failed to update mock server")
      }

      if (!result.data) {
        throw new Error("No data returned from update mock server mutation")
      }

      const data = result.data.updateMockServer
      // Map the GraphQL response to frontend format
      return {
        ...data,
        userUid: data.creator?.uid || "", // Legacy field
        collectionID: data.collection?.id || "", // Legacy field
      } as MockServer
    },
    (error) => (error as Error).message as UpdateMockServerError
  )

export const deleteMockServer = (id: string) =>
  TE.tryCatch(
    async () => {
      const result = await client
        .value!.mutation(DeleteMockServerDocument, { id })
        .toPromise()

      if (result.error) {
        throw new Error(result.error.message || "Failed to delete mock server")
      }

      if (!result.data) {
        throw new Error("No data returned from delete mock server mutation")
      }

      return result.data.deleteMockServer as boolean
    },
    (error) => (error as Error).message as DeleteMockServerError
  )

export const getTeamMockServers = (
  teamID: string,
  skip?: number,
  take?: number
) =>
  TE.tryCatch(
    async () => {
      const result = await client
        .value!.query(GetTeamMockServersDocument, {
          teamID,
          skip,
          take,
        })
        .toPromise()

      if (result.error) {
        throw new Error(
          result.error.message || "Failed to get team mock servers"
        )
      }

      if (!result.data) {
        throw new Error("No data returned from get team mock servers query")
      }

      const data = result.data.teamMockServers
      // Map the GraphQL response to frontend format
      return data.map((mockServer: any) => ({
        ...mockServer,
        userUid: mockServer.creator?.uid || "", // Legacy field
        collectionID: mockServer.collection?.id || "", // Legacy field
      })) as MockServer[]
    },
    (error) => (error as Error).message as CreateMockServerError
  )
