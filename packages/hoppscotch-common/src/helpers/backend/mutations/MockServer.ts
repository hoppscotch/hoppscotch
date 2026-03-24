import * as TE from "fp-ts/TaskEither"
import { client } from "../GQLClient"
import { GQLError } from "../GQLClient"
import { getI18n } from "~/modules/i18n"
import {
  CreateMockServerDocument,
  UpdateMockServerDocument,
  DeleteMockServerDocument,
  WorkspaceType,
} from "../graphql"

import type { MockServer } from "../types/MockServer"

type CreateMockServerError =
  | "mock_server/invalid_collection"
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
  workspaceType: WorkspaceType = WorkspaceType.User,
  workspaceID?: string,
  delayInMs: number = 0,
  isPublic: boolean = true,
  collectionID?: string,
  autoCreateCollection?: boolean,
  autoCreateRequestExample?: boolean
) =>
  TE.tryCatch(
    async () => {
      const result = await client
        .value!.mutation(CreateMockServerDocument, {
          input: {
            name,
            collectionID,
            autoCreateCollection,
            autoCreateRequestExample,
            workspaceType,
            workspaceID,
            delayInMs,
            isPublic,
          },
        })
        .toPromise()

      if (result.error) {
        // Try to extract a useful error message from the GraphQL error
        const err: any = result.error
        let message = err.message

        // urql exposes GraphQL errors in graphQLErrors array
        const gqlErr = (err.graphQLErrors && err.graphQLErrors[0]) || null
        if (gqlErr) {
          // Prefer originalError.message from backend if present (it may be an array of messages)
          const orig =
            gqlErr.extensions &&
            gqlErr.extensions.originalError &&
            gqlErr.extensions.originalError.message
          if (orig) {
            message = Array.isArray(orig) ? orig.join(", ") : String(orig)
          } else if (gqlErr.message) {
            message = gqlErr.message
          }
        }

        throw new Error(message)
      }

      if (!result.data) {
        throw new Error("No data returned from create mock server mutation")
      }

      const data = result.data.createMockServer
      // Map the GraphQL response to frontend format
      return {
        ...data,
        userUid: data.creator?.uid || "", // Legacy field
        collectionID: data.collection?.id || collectionID || "", // Legacy field - use response collection ID if available
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

// Centralized mapper for backend GraphQL error tokens to user-facing messages.
export const getErrorMessage = (err: GQLError<string> | string | Error) => {
  const t = getI18n()

  // Normalize to GQLError-like shape
  let gErr: GQLError<string> | null = null

  if (typeof err === "string") {
    gErr = { type: "gql_error", error: err }
  } else if (err instanceof Error) {
    gErr = { type: "network_error", error: err }
  } else if ((err as any)?.type) {
    gErr = err as GQLError<string>
  }

  if (!gErr) return t("error.something_went_wrong")

  if (gErr.type === "network_error") {
    return t("error.network_error")
  }

  const code = String(gErr.error)

  switch (code) {
    case "mock_server/invalid_collection":
    case "mock_server/invalid_collection_id":
      return t("mock_server.invalid_collection_error")
    default:
      return t("error.something_went_wrong")
  }
}
