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
      userUid
      collectionID
      isActive
      createdOn
      updatedOn
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
      userUid
      collectionID
      isActive
      createdOn
      updatedOn
      collection {
        id
        title
      }
    }
  }
`

export const getMyMockServers = () =>
  runGQLQuery<any, any, GetMyMockServersError>({
    query: GetMyMockServersDocument as any,
    variables: {},
  })

export const getMockServer = (id: string) =>
  runGQLQuery<any, any, GetMockServerError>({
    query: GetMockServerDocument as any,
    variables: { id },
  })
