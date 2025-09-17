import * as TE from "fp-ts/TaskEither"
import * as E from "fp-ts/Either"
import { runGQLQuery } from "../GQLClient"

// Placeholder types until GraphQL codegen is updated
type GetMyMockServersError = "user/not_authenticated"

type GetMockServerError = "mock_server/not_found" | "mock_server/access_denied"

// Since GraphQL types aren't generated yet, we'll create placeholders
const GetMyMockServersDocument = `
  query GetMyMockServers {
    myMockServers {
      id
      name
      subdomain
      isActive
      createdOn
      updatedOn
      user {
        uid
      }
      collection {
        id
        title
      }
    }
  }
`

const GetMockServerDocument = `
  query GetMockServer($id: ID!) {
    mockServer(id: $id) {
      id
      name
      subdomain
      isActive
      createdOn
      updatedOn
      user {
        uid
      }
      collection {
        id
        title
      }
    }
  }
`

export const getMyMockServers = () =>
  TE.tryCatch(
    async () => {
      const result = await runGQLQuery({
        query: GetMyMockServersDocument as any,
        variables: {},
      })

      if (E.isLeft(result)) {
        throw result.left
      }

      const mockServers = (result.right as any).myMockServers
      // Map the GraphQL response to frontend format
      return mockServers.map((mockServer: any) => ({
        ...mockServer,
        userUid: mockServer.user?.uid || "",
        collectionID: mockServer.collection?.id || "",
      }))
    },
    (error) => error as GetMyMockServersError
  )

export const getMockServer = (id: string) =>
  TE.tryCatch(
    async () => {
      const result = await runGQLQuery({
        query: GetMockServerDocument as any,
        variables: { id },
      })

      if (E.isLeft(result)) {
        throw result.left
      }

      const data = (result.right as any).mockServer
      // Map the GraphQL response to frontend format
      return {
        ...data,
        userUid: data.user?.uid || "",
        collectionID: data.collection?.id || "",
      }
    },
    (error) => error as GetMockServerError
  )
