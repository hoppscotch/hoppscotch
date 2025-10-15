import * as TE from "fp-ts/TaskEither"
import * as E from "fp-ts/Either"
import { runGQLQuery } from "../GQLClient"
import {
  GetMyMockServersDocument,
  GetMockServerDocument,
  type GetMyMockServersQuery,
  type GetMockServerQuery,
} from "../graphql"

type GetMyMockServersError = "user/not_authenticated"

type GetMockServerError = "mock_server/not_found" | "mock_server/access_denied"

export const getMyMockServers = (skip?: number, take?: number) =>
  TE.tryCatch(
    async () => {
      const result = await runGQLQuery({
        query: GetMyMockServersDocument,
        variables: { skip, take },
      })

      if (E.isLeft(result)) {
        throw result.left
      }

      const data = result.right as GetMyMockServersQuery
      // Map the GraphQL response to frontend format
      return data.myMockServers.map((mockServer) => ({
        ...mockServer,
        userUid: mockServer.creator?.uid || "", // Legacy field
        collectionID: mockServer.collection?.id || "", // Legacy field
      }))
    },
    (error) => error as GetMyMockServersError
  )

export const getMockServer = (id: string) =>
  TE.tryCatch(
    async () => {
      const result = await runGQLQuery({
        query: GetMockServerDocument,
        variables: { id },
      })

      if (E.isLeft(result)) {
        throw result.left
      }

      const data = result.right as GetMockServerQuery
      // Map the GraphQL response to frontend format
      return {
        ...data.mockServer,
        userUid: data.mockServer.creator?.uid || "", // Legacy field
        collectionID: data.mockServer.collection?.id || "", // Legacy field
      }
    },
    (error) => error as GetMockServerError
  )
