import * as TE from "fp-ts/TaskEither"
import * as E from "fp-ts/Either"
import { runGQLQuery } from "../GQLClient"
import {
  GetMyMockServersDocument,
  GetTeamMockServersDocument,
  GetMockServerDocument,
  type GetMyMockServersQuery,
  type GetTeamMockServersQuery,
  type GetMockServerQuery,
} from "../graphql"

type GetMyMockServersError = "user/not_authenticated"

type GetTeamMockServersError = "team/not_found" | "team/access_denied"

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
        creator: mockServer.creator
          ? { uid: mockServer.creator.uid }
          : undefined,
        userUid: mockServer.creator?.uid || "", // Legacy field
        collectionID: mockServer.collection?.id || "", // Legacy field
      }))
    },
    (error) => error as GetMyMockServersError
  )

export const getTeamMockServers = (
  teamID: string,
  skip?: number,
  take?: number
) =>
  TE.tryCatch(
    async () => {
      const result = await runGQLQuery({
        query: GetTeamMockServersDocument,
        variables: { teamID, skip, take },
      })

      if (E.isLeft(result)) {
        throw result.left
      }

      const data = result.right as GetTeamMockServersQuery
      // Map the GraphQL response to frontend format
      return data.teamMockServers.map((mockServer) => ({
        ...mockServer,
        creator: mockServer.creator
          ? { uid: mockServer.creator.uid }
          : undefined,
        userUid: mockServer.creator?.uid || "", // Legacy field
        collectionID: mockServer.collection?.id || "", // Legacy field
      }))
    },
    (error) => error as GetTeamMockServersError
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
