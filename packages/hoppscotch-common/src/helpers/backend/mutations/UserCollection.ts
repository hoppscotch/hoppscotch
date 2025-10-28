import { runMutation } from "../GQLClient"
import { runGQLQuery } from "../GQLClient"
import {
  ImportUserCollectionsFromJsonDocument,
  ImportUserCollectionsFromJsonMutation,
  ImportUserCollectionsFromJsonMutationVariables,
  ReqType,
  UserCollection,
} from "../graphql"
import { HoppCollection, makeCollection } from "@hoppscotch/data"
import * as E from "fp-ts/Either"
import { gql } from "graphql-tag"

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

// Temporary GraphQL queries until code generation runs
const GET_USER_ROOT_COLLECTIONS = gql`
  query GetUserRootCollections($cursor: ID, $take: Int) {
    rootRESTUserCollections(cursor: $cursor, take: $take) {
      id
      title
      data
      type
      parent {
        id
      }
      childrenREST {
        id
        title
        data
        type
        parent {
          id
        }
      }
    }
  }
`

const GET_GQL_ROOT_USER_COLLECTIONS = gql`
  query GetGQLRootUserCollections($cursor: ID, $take: Int) {
    rootGQLUserCollections(cursor: $cursor, take: $take) {
      id
      title
      data
      type
      parent {
        id
      }
      childrenGQL {
        id
        title
        data
        type
        parent {
          id
        }
      }
    }
  }
`

export const getUserRootCollections = (cursor?: string, take?: number) =>
  runGQLQuery<any, any, "">({
    query: GET_USER_ROOT_COLLECTIONS,
    variables: {
      cursor,
      take,
    },
  })

export const getGQLRootUserCollections = (cursor?: string, take?: number) =>
  runGQLQuery<any, any, "">({
    query: GET_GQL_ROOT_USER_COLLECTIONS,
    variables: {
      cursor,
      take,
    },
  })

/**
 * Converts a UserCollection from backend format to HoppCollection format
 */
export function convertUserCollectionToHoppCollection(userCollection: UserCollection, reqType: ReqType): HoppCollection {
  let parsedData: any = {
    auth: { authType: "inherit", authActive: true },
    headers: [],
    variables: [],
  }

  if (userCollection.data) {
    try {
      parsedData = JSON.parse(userCollection.data)
    } catch (error) {
      console.warn("Failed to parse user collection data:", error)
    }
  }

  // Get the appropriate children based on request type
  const children = reqType === ReqType.Rest ? userCollection.childrenREST : userCollection.childrenGQL

  const collection = makeCollection({
    name: userCollection.title,
    folders: children ? children.map(child => convertUserCollectionToHoppCollection(child, reqType)) : [],
    requests: [], // User collections from backend don't include requests in the root query
    auth: parsedData.auth || { authType: "inherit", authActive: true },
    headers: parsedData.headers || [],
    variables: parsedData.variables || [],
  })

  // Add the backend ID to the collection
  collection.id = userCollection.id

  return collection
}

/**
 * Fetches user collections from backend and converts them to HoppCollection format
 */
export const fetchAndConvertUserCollections = async (reqType: ReqType) => {
  const fetchFunction = reqType === ReqType.Rest ? getUserRootCollections : getGQLRootUserCollections

  const result = await fetchFunction()

  if (E.isLeft(result)) {
    return E.left(result.left)
  }

  const collections = reqType === ReqType.Rest
    ? result.right.rootRESTUserCollections
    : result.right.rootGQLUserCollections

  const convertedCollections = collections.map((collection: UserCollection) => convertUserCollectionToHoppCollection(collection, reqType))

  return E.right(convertedCollections)
}