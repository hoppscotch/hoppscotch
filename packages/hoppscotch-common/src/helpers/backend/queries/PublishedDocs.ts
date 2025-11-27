import * as TE from "fp-ts/TaskEither"
import * as E from "fp-ts/Either"
import { runGQLQuery } from "../GQLClient"
import {
  UserPublishedDocsListDocument,
  TeamPublishedDocsListDocument,
  type UserPublishedDocsListQuery,
  type TeamPublishedDocsListQuery,
  PublishedDocDocument,
  PublishedDocs,
} from "../graphql"
import {
  HoppCollection,
  makeCollection,
  translateToNewRequest,
} from "@hoppscotch/data"
import type { CollectionDataProps } from "../helpers"

type GetUserPublishedDocsError = "user/not_authenticated"

type GetTeamPublishedDocsError = "team/not_found" | "team/access_denied"

// Type for a published doc item returned from list queries
export type PublishedDocListItem = {
  id: string
  title: string
  version: string
  autoSync: boolean
  url: string
  collection: {
    id: string
  }
  createdOn: string
  updatedOn: string
}

// Type for a full published doc returned from single doc query
export type PublishedDoc = PublishedDocListItem & {
  metadata?: string
  creator?: {
    uid: string
    displayName: string
    email: string
    photoURL: string
  }
  collection: {
    id: string
    title: string
  }
}

// Type for the GraphQL query response
export type PublishedDocQuery = {
  publishedDoc: PublishedDoc
}

type CollectionFolder = {
  id?: string
  folders: CollectionFolder[]
  // Backend stores this as any, we translate it to HoppRESTRequest via translateToNewRequest
  requests: any[]
  name: string
  data?: string
}

/**
 * Parses the data field (stringified JSON) to extract auth, headers, variables, and description
 * @param data The stringified JSON data from CollectionFolder
 * @returns Parsed CollectionDataProps with defaults if parsing fails
 */
function parseCollectionDataFromString(data?: string): CollectionDataProps {
  const defaultDataProps: CollectionDataProps = {
    auth: { authType: "inherit", authActive: true },
    headers: [],
    variables: [],
    description: null,
  }

  if (!data) {
    return defaultDataProps
  }

  try {
    const parsed = JSON.parse(data) as Partial<CollectionDataProps>
    return {
      auth: parsed.auth || defaultDataProps.auth,
      headers: parsed.headers || defaultDataProps.headers,
      variables: parsed.variables || defaultDataProps.variables,
      description: parsed.description || defaultDataProps.description,
    }
  } catch (error) {
    console.error("Failed to parse collection data:", error)
    return defaultDataProps
  }
}

/**
 * Converts a CollectionFolder (from backend REST API) to HoppCollection format
 * @param folder The CollectionFolder to convert
 * @returns HoppCollection in the proper format
 */
export function collectionFolderToHoppCollection(
  folder: CollectionFolder
): HoppCollection {
  // Parse the data field to extract auth, headers, variables, and description
  const { auth, headers, variables, description } =
    parseCollectionDataFromString(folder.data)

  return makeCollection({
    name: folder.name,
    folders: folder.folders.map(collectionFolderToHoppCollection),
    requests: (folder.requests || []).map(translateToNewRequest),
    auth,
    headers,
    variables,
    description,
    id: folder.id,
  })
}

export const getUserPublishedDocs = (skip: number = 0, take: number = 100) =>
  TE.tryCatch(
    async () => {
      const result = await runGQLQuery({
        query: UserPublishedDocsListDocument,
        variables: { skip, take },
      })

      if (E.isLeft(result)) {
        throw result.left
      }

      const data = result.right as UserPublishedDocsListQuery
      return data.userPublishedDocsList
    },
    (error) => error as GetUserPublishedDocsError
  )

export const getTeamPublishedDocs = (
  teamID: string,
  collectionID?: string,
  skip: number = 0,
  take: number = 100
) =>
  TE.tryCatch(
    async () => {
      const result = await runGQLQuery({
        query: TeamPublishedDocsListDocument,
        variables: { teamID, collectionID, skip, take },
      })

      if (E.isLeft(result)) {
        throw result.left
      }

      const data = result.right as TeamPublishedDocsListQuery
      return data.teamPublishedDocsList
    },
    (error) => error as GetTeamPublishedDocsError
  )

// Helper to find published doc for a specific collection
export const findPublishedDocForCollection = (
  collectionID: string,
  isTeam: boolean,
  teamID?: string
): TE.TaskEither<
  | GetUserPublishedDocsError
  | GetTeamPublishedDocsError
  | "published_docs/not_found",
  PublishedDocListItem
> => {
  const query: TE.TaskEither<
    GetUserPublishedDocsError | GetTeamPublishedDocsError,
    PublishedDocListItem[]
  > = (
    isTeam && teamID
      ? getTeamPublishedDocs(teamID, collectionID)
      : getUserPublishedDocs()
  ) as TE.TaskEither<
    GetUserPublishedDocsError | GetTeamPublishedDocsError,
    PublishedDocListItem[]
  >

  return TE.chain(
    (
      docs: PublishedDocListItem[]
    ): TE.TaskEither<
      | GetUserPublishedDocsError
      | GetTeamPublishedDocsError
      | "published_docs/not_found",
      PublishedDocListItem
    > => {
      const publishedDoc = docs.find(
        (doc) => doc.collection.id === collectionID
      )
      return publishedDoc
        ? TE.right(publishedDoc)
        : TE.left("published_docs/not_found" as const)
    }
  )(query)
}

type GetPublishedDocError =
  | "published_docs/not_found"
  | "published_docs/unauthorized"

// Get a single published doc by ID (GraphQL)
export const getPublishedDocByID = (id: string) =>
  TE.tryCatch(
    async () => {
      const result = await runGQLQuery({
        query: PublishedDocDocument,
        variables: { id },
      })

      if (E.isLeft(result)) {
        throw result.left
      }

      const data = result.right as PublishedDocQuery
      return data.publishedDoc
    },
    (error) => {
      console.error("Error fetching published doc:", error)
      return "published_docs/not_found" as GetPublishedDocError
    }
  )

/**
 *
 * @param id - The ID of the published doc to fetch
 * @param tree - The tree level to fetch (FULL or MINIMAL) Default is FULL so we can skip it, keeping it for future use
 * @returns The published doc with the specified ID
 */
export const getPublishedDocByIDREST = (
  id: string
  //tree: "FULL" | "MINIMAL" = "FULL"
): TE.TaskEither<GetPublishedDocError, PublishedDocs> =>
  TE.tryCatch(
    async () => {
      const backendUrl = import.meta.env.VITE_BACKEND_API_URL || ""
      const response = await fetch(`${backendUrl}/published-docs/${id}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    },
    (error) => {
      console.error("Error fetching published doc via REST:", error)
      return "published_docs/not_found" as GetPublishedDocError
    }
  )
