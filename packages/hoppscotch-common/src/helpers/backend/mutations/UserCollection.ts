import { runMutation } from "../GQLClient"
import { runGQLQuery } from "../GQLClient"
import {
  GetGqlRootUserCollectionsDocument,
  GetGqlRootUserCollectionsQuery,
  GetGqlRootUserCollectionsQueryVariables,
  GetUserRootCollectionsDocument,
  GetUserRootCollectionsQuery,
  GetUserRootCollectionsQueryVariables,
  ImportUserCollectionsFromJsonDocument,
  ImportUserCollectionsFromJsonMutation,
  ImportUserCollectionsFromJsonMutationVariables,
  ReqType,
  UserCollection,
  UserRequest,
} from "../graphql"
import {
  HoppCollection,
  makeCollection,
  HoppRESTRequest,
  HoppGQLRequest,
  getDefaultRESTRequest,
  getDefaultGQLRequest,
} from "@hoppscotch/data"
import * as E from "fp-ts/Either"

export const importUserCollectionsFromJSON = (
  collectionJSON: string,
  reqType: ReqType,
  parentCollectionID?: string
) =>
  runMutation<
    ImportUserCollectionsFromJsonMutation,
    ImportUserCollectionsFromJsonMutationVariables,
    ""
  >(ImportUserCollectionsFromJsonDocument, {
    jsonString: collectionJSON,
    reqType,
    parentCollectionID,
  })

// Use generated GraphQL documents instead of inline gql tags
export const getUserRootCollections = () =>
  runGQLQuery<
    GetUserRootCollectionsQuery,
    GetUserRootCollectionsQueryVariables,
    ""
  >({
    query: GetUserRootCollectionsDocument,
    variables: {},
  })

export const getGQLRootUserCollections = () =>
  runGQLQuery<
    GetGqlRootUserCollectionsQuery,
    GetGqlRootUserCollectionsQueryVariables,
    ""
  >({
    query: GetGqlRootUserCollectionsDocument,
    variables: {},
  })

/**
 * Converts a UserRequest from backend format to HoppRequest format
 */
function convertUserRequestToHoppRequest(
  userRequest: UserRequest
): HoppRESTRequest | HoppGQLRequest {
  try {
    const parsedRequest = JSON.parse(userRequest.request)

    // Add the backend ID and title to the request
    const request = {
      ...parsedRequest,
      id: userRequest.id,
      name: userRequest.title,
    }

    return request
  } catch {
    // Return a default request if parsing fails
    if (userRequest.type === ReqType.Rest) {
      const defaultRequest = getDefaultRESTRequest()
      defaultRequest.id = userRequest.id
      defaultRequest.name = userRequest.title
      return defaultRequest
    }
    const defaultRequest = getDefaultGQLRequest()
    defaultRequest.id = userRequest.id
    defaultRequest.name = userRequest.title
    return defaultRequest
  }
}

/**
 * Parse collection data similar to the existing parseCollectionData function in helpers.ts
 */
function parseUserCollectionData(data: string | null | undefined) {
  const defaultDataProps = {
    auth: { authType: "inherit", authActive: true },
    headers: [],
    variables: [],
  }

  if (!data) {
    return defaultDataProps
  }

  try {
    const parsedData = JSON.parse(data)
    return {
      auth: parsedData?.auth || defaultDataProps.auth,
      headers: parsedData?.headers || defaultDataProps.headers,
      variables: parsedData?.variables || defaultDataProps.variables,
    }
  } catch {
    return defaultDataProps
  }
}

/**
 * Converts a UserCollection from backend format to HoppCollection format
 * Following the same pattern as teamCollectionJSONToHoppRESTColl in helpers.ts
 */
export function convertUserCollectionToHoppCollection(
  userCollection: UserCollection,
  reqType: ReqType
): HoppCollection {
  const { auth, headers, variables } = parseUserCollectionData(
    userCollection.data
  )

  // Get the appropriate children based on request type
  const children =
    reqType === ReqType.Rest
      ? userCollection.childrenREST
      : userCollection.childrenGQL

  // Convert requests - filter by type and convert
  const requests = userCollection.requests
    ? userCollection.requests
        .filter((req) => req.type === reqType)
        .map(convertUserRequestToHoppRequest)
    : []

  const collection = makeCollection({
    name: userCollection.title,
    folders: children
      ? children.map((child) =>
          convertUserCollectionToHoppCollection(child, reqType)
        )
      : [],
    requests: requests,
    auth,
    headers,
    variables,
  })

  // Add the backend ID to the collection
  collection.id = userCollection.id

  return collection
}

/**
 * Fetches user collections from backend and converts them to HoppCollection format
 */
export const fetchAndConvertUserCollections = async (reqType: ReqType) => {
  const fetchFunction =
    reqType === ReqType.Rest
      ? getUserRootCollections
      : getGQLRootUserCollections

  const result = await fetchFunction()

  if (E.isLeft(result)) {
    return E.left(result.left)
  }

  if (reqType === ReqType.Rest) {
    const right = result.right as GetUserRootCollectionsQuery
    const collections = right.rootRESTUserCollections
    const convertedCollections = collections.map((collection) =>
      convertUserCollectionToHoppCollection(
        collection as unknown as UserCollection,
        reqType
      )
    )
    return E.right(convertedCollections)
  }
  const right = result.right as GetGqlRootUserCollectionsQuery
  const collections = right.rootGQLUserCollections
  const convertedCollections = collections.map((collection) =>
    convertUserCollectionToHoppCollection(
      collection as unknown as UserCollection,
      reqType
    )
  )
  return E.right(convertedCollections)
}
