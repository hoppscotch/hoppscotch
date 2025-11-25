import * as E from "fp-ts/Either"
import { ReqType } from "@api/generated/graphql"
import { CollectionSchemaVersion, HoppCollection } from "@hoppscotch/data"
import { getUserRootCollections, getGQLRootUserCollections } from "./api"
import {
  GetUserRootCollectionsQuery,
  GetGqlRootUserCollectionsQuery,
} from "@api/generated/graphql"

// Platform-specific types for selfhost-desktop
type UserCollection = {
  id: string
  title: string
  data: string | null
  type: ReqType
  parent: { id: string } | null
  requests: Array<{
    id: string
    title: string
    request: string
    type: ReqType
    collectionID: string
  }>
  childrenREST?: UserCollection[]
  childrenGQL?: UserCollection[]
}

/**
 * Converts a UserCollection from backend to HoppCollection format
 * This is a platform-specific version for selfhost-desktop that handles nested collections properly
 */
function convertUserCollectionToHoppCollection(
  userCollection: UserCollection,
  reqType: ReqType
): HoppCollection {
  const childrenKey = reqType === ReqType.Rest ? "childrenREST" : "childrenGQL"
  const children = userCollection[childrenKey] || []

  const collection: HoppCollection = {
    v: CollectionSchemaVersion,
    id: userCollection.id,
    name: userCollection.title,
    description: "",
    headers: [],
    variables: [],
    auth: { authType: "none", authActive: true },
    folders: children.map((child) =>
      convertUserCollectionToHoppCollection(child, reqType)
    ),
    requests: userCollection.requests.map((request) => {
      try {
        return JSON.parse(request.request)
      } catch {
        // Fallback for invalid JSON
        return {
          v: CollectionSchemaVersion,
          id: request.id,
          name: request.title,
          method: "GET",
          endpoint: "",
          params: [],
          headers: [],
          preRequestScript: "",
          testScript: "",
          auth: { authType: "none", authActive: true },
          body: { contentType: null, body: null },
        }
      }
    }),
  }

  // Parse collection data if available
  if (userCollection.data) {
    try {
      const data = JSON.parse(userCollection.data)
      if (data.auth) collection.auth = data.auth
      if (data.headers) collection.headers = data.headers
      if (data.variables) collection.variables = data.variables
    } catch {
      // Ignore invalid JSON data
    }
  }

  return collection
}

/**
 * Fetches user collections from backend and converts them to HoppCollection format
 * Platform-specific version for selfhost-desktop that uses the correct nested queries
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
