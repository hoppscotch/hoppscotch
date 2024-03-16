import { ref } from "vue"
import { runGQLQuery } from "../backend/GQLClient"
import {
  GetSingleCollectionDocument,
  GetSingleRequestDocument,
} from "../backend/graphql"
import { TeamCollection } from "./TeamCollection"
import { HoppRESTAuth, HoppRESTHeader } from "@hoppscotch/data"

import * as E from "fp-ts/Either"
import { HoppInheritedProperty } from "../types/HoppInheritedProperties"
import { TeamRequest } from "./TeamRequest"
import { Service } from "dioc"
import axios from "axios"

type CollectionSearchNode =
  | {
      type: "request"
      title: string
      method: string
      id: string
      // parent collections
      path: CollectionSearchNode[]
    }
  | {
      type: "collection"
      title: string
      id: string
      // parent collections
      path: CollectionSearchNode[]
    }

function convertToTeamCollection(
  node: CollectionSearchNode,
  existingCollections: Record<
    string,
    TeamCollection & { parentID: string | null }
  >,
  existingRequests: Record<
    string,
    {
      id: string
      collectionID: string
      title: string
      request: {
        name: string
        method: string
      }
    }
  >
) {
  if (node.type === "request") {
    existingRequests[node.id] = {
      id: node.id,
      collectionID: node.path[0].id,
      title: node.title,
      request: {
        name: node.title,
        method: node.method,
      },
    }

    if (node.path[0]) {
      // add parent collections to the collections array recursively
      convertToTeamCollection(
        node.path[0],
        existingCollections,
        existingRequests
      )
    }
  } else {
    existingCollections[node.id] = {
      id: node.id,
      title: node.title,
      children: [],
      requests: [],
      data: null,
      parentID: node.path[0]?.id,
    }

    if (node.path[0]) {
      // add parent collections to the collections array recursively
      convertToTeamCollection(
        node.path[0],
        existingCollections,
        existingRequests
      )
    }
  }

  return {
    existingCollections,
    existingRequests,
  }
}

function convertToTeamTree(
  collections: (TeamCollection & { parentID: string | null })[],
  requests: TeamRequest[]
) {
  const collectionTree: TeamCollection[] = []

  collections.forEach((collection) => {
    const parentCollection = collection.parentID
      ? collections.find((c) => c.id === collection.parentID)
      : null

    if (parentCollection) {
      parentCollection.children = parentCollection.children || []
      parentCollection.children.push(collection)
    } else {
      collectionTree.push(collection)
    }
  })

  requests.forEach((request) => {
    const parentCollection = collections.find(
      (c) => c.id === request.collectionID
    )

    if (parentCollection) {
      parentCollection.requests = parentCollection.requests || []
      parentCollection.requests.push({
        id: request.id,
        collectionID: request.collectionID,
        title: request.title,
        request: request.request,
      })
    }
  })

  return collectionTree
}

export class TeamSearchService extends Service {
  public static readonly ID = "TeamSearchService"

  public endpoint = import.meta.env.VITE_BACKEND_API_URL

  public teamsSearchResultsLoading = ref(false)
  public teamsSearchResults = ref<TeamCollection[]>([])
  public teamsSearchResultsFormattedForSpotlight = ref<
    {
      collectionTitles: string[]
      request: {
        id: string
        name: string
        method: string
      }
    }[]
  >([])

  searchResultsCollections: Record<
    string,
    TeamCollection & { parentID: string | null }
  > = {}

  searchResultsRequests: Record<
    string,
    {
      id: string
      collectionID: string
      title: string
      request: {
        name: string
        method: string
      }
    }
  > = {}

  // FUTURE-TODO: ideally this should return the search results / formatted results instead of directly manipulating the result set
  // eg: do the spotlight formatting in the spotlight searcher and not here
  searchTeams = async (query: string, teamID: string) => {
    if (!query.length) {
      return
    }

    this.teamsSearchResultsLoading.value = true

    this.searchResultsCollections = {}
    this.searchResultsRequests = {}

    try {
      const searchResponse = await axios.get(
        `${this.endpoint}/team-collection/search/${teamID}/${query}`,
        {
          withCredentials: true,
        }
      )

      if (searchResponse.status !== 200) {
        return
      }

      const searchResults = searchResponse.data.data as CollectionSearchNode[]

      searchResults
        .map((node) => {
          const { existingCollections, existingRequests } =
            convertToTeamCollection(node, {}, {})

          return {
            collections: existingCollections,
            requests: existingRequests,
          }
        })
        .forEach(({ collections, requests }) => {
          this.searchResultsCollections = {
            ...this.searchResultsCollections,
            ...collections,
          }
          this.searchResultsRequests = {
            ...this.searchResultsRequests,
            ...requests,
          }
        })

      const collectionFetchingPromises = Object.values(
        this.searchResultsCollections
      ).map((col) => {
        return getSingleCollection(col.id)
      })

      const requestFetchingPromises = Object.values(
        this.searchResultsRequests
      ).map((req) => {
        return getSingleRequest(req.id)
      })

      const collectionResponses = await Promise.all(collectionFetchingPromises)
      const requestResponses = await Promise.all(requestFetchingPromises)

      requestResponses.map((res) => {
        if (E.isLeft(res)) {
          return
        }

        const request = res.right.request

        if (!request) return

        this.searchResultsRequests[request.id] = {
          id: request.id,
          title: request.title,
          request: JSON.parse(request.request) as TeamRequest["request"],
          collectionID: request.collectionID,
        }
      })

      collectionResponses.map((res) => {
        if (E.isLeft(res)) {
          return
        }

        const collection = res.right.collection

        if (!collection) return

        this.searchResultsCollections[collection.id].data =
          collection.data ?? null
      })

      const collectionTree = convertToTeamTree(
        Object.values(this.searchResultsCollections),
        // asserting because we've already added the missing properties after fetching the full details
        Object.values(this.searchResultsRequests) as TeamRequest[]
      )

      this.teamsSearchResults.value = collectionTree

      this.teamsSearchResultsFormattedForSpotlight.value = Object.values(
        this.searchResultsRequests
      ).map((request) => {
        return formatTeamsSearchResultsForSpotlight(
          {
            collectionID: request.collectionID,
            name: request.title,
            method: request.request.method,
            id: request.id,
          },
          Object.values(this.searchResultsCollections)
        )
      })
    } catch (error) {
      console.error(error)
    }

    this.teamsSearchResultsLoading.value = false
  }

  cascadeParentCollectionForHeaderAuthForSearchResults = (
    collectionID: string
  ): HoppInheritedProperty => {
    const defaultInheritedAuth: HoppInheritedProperty["auth"] = {
      parentID: "",
      parentName: "",
      inheritedAuth: {
        authType: "none",
        authActive: true,
      },
    }

    const defaultInheritedHeaders: HoppInheritedProperty["headers"] = []

    const collection = Object.values(this.searchResultsCollections).find(
      (col) => col.id === collectionID
    )

    if (!collection)
      return { auth: defaultInheritedAuth, headers: defaultInheritedHeaders }

    const inheritedAuthData = this.findInheritableParentAuth(collectionID)
    const inheritedHeadersData = this.findInheritableParentHeaders(collectionID)

    return {
      auth: E.isRight(inheritedAuthData)
        ? inheritedAuthData.right
        : defaultInheritedAuth,
      headers: E.isRight(inheritedHeadersData)
        ? Object.values(inheritedHeadersData.right)
        : defaultInheritedHeaders,
    }
  }

  findInheritableParentAuth = (
    collectionID: string
  ): E.Either<
    string,
    {
      parentID: string
      parentName: string
      inheritedAuth: HoppRESTAuth
    }
  > => {
    const collection = Object.values(this.searchResultsCollections).find(
      (col) => col.id === collectionID
    )

    if (!collection) {
      return E.left("PARENT_NOT_FOUND" as const)
    }

    // has inherited data
    if (collection.data) {
      const parentInheritedData = JSON.parse(collection.data) as {
        auth: HoppRESTAuth
        headers: HoppRESTHeader[]
      }

      const inheritedAuth = parentInheritedData.auth

      if (inheritedAuth.authType !== "inherit") {
        return E.right({
          parentID: collectionID,
          parentName: collection.title,
          inheritedAuth: inheritedAuth,
        })
      }
    }

    if (!collection.parentID) {
      return E.left("PARENT_INHERITED_DATA_NOT_FOUND")
    }

    return this.findInheritableParentAuth(collection.parentID)
  }

  findInheritableParentHeaders = (
    collectionID: string,
    existingHeaders: Record<
      string,
      HoppInheritedProperty["headers"][number]
    > = {}
  ): E.Either<
    string,
    Record<string, HoppInheritedProperty["headers"][number]>
  > => {
    const collection = Object.values(this.searchResultsCollections).find(
      (col) => col.id === collectionID
    )

    if (!collection) {
      return E.left("PARENT_NOT_FOUND" as const)
    }

    // see if it has headers to inherit, if yes, add it to the existing headers
    if (collection.data) {
      const parentInheritedData = JSON.parse(collection.data) as {
        auth: HoppRESTAuth
        headers: HoppRESTHeader[]
      }

      const inheritedHeaders = parentInheritedData.headers

      if (inheritedHeaders) {
        inheritedHeaders.forEach((header) => {
          if (!existingHeaders[header.key]) {
            existingHeaders[header.key] = {
              parentID: collection.id,
              parentName: collection.title,
              inheritedHeader: header,
            }
          }
        })
      }
    }

    if (collection.parentID) {
      return this.findInheritableParentHeaders(
        collection.parentID,
        existingHeaders
      )
    }

    return E.right(existingHeaders)
  }

  expandCollection = async (collectionID: string) => {
    const childCollectionsPromise = getCollectionChildCollections(collectionID)
    const childRequestsPromise = getCollectionChildRequests(collectionID)

    const [childCollections, childRequests] = await Promise.all([
      childCollectionsPromise,
      childRequestsPromise,
    ])

    if (E.isLeft(childCollections)) {
      return
    }

    if (E.isLeft(childRequests)) {
      return
    }

    childCollections.right.collection?.children
      .map((child) => ({
        id: child.id,
        title: child.title,
        data: child.data ?? null,
        children: [],
        requests: [],
      }))
      .forEach((child) => {
        this.searchResultsCollections[child.id] = {
          ...child,
          parentID: collectionID,
        }
      })

    childRequests.right.requestsInCollection
      .map((request) => ({
        id: request.id,
        collectionID: collectionID,
        title: request.title,
        request: JSON.parse(request.request) as TeamRequest["request"],
      }))
      .forEach((request) => {
        this.searchResultsRequests[request.id] = request
      })

    this.teamsSearchResults.value = convertToTeamTree(
      Object.values(this.searchResultsCollections),
      // asserting because we've already added the missing properties after fetching the full details
      Object.values(this.searchResultsRequests) as TeamRequest[]
    )
  }
}

const getSingleCollection = (collectionID: string) =>
  runGQLQuery({
    query: GetSingleCollectionDocument,
    variables: {
      collectionID,
    },
  })

const getSingleRequest = (requestID: string) =>
  runGQLQuery({
    query: GetSingleRequestDocument,
    variables: {
      requestID,
    },
  })

const formatTeamsSearchResultsForSpotlight = (
  request: {
    collectionID: string
    name: string
    method: string
    id: string
  },
  parentCollections: (TeamCollection & { parentID: string | null })[]
) => {
  let collectionTitles: string[] = []

  let parentCollectionID: string | null = request.collectionID

  while (true) {
    if (!parentCollectionID) {
      break
    }

    const parentCollection = parentCollections.find(
      (col) => col.id === parentCollectionID
    )

    if (!parentCollection) {
      break
    }

    collectionTitles = [parentCollection.title, ...collectionTitles]
    parentCollectionID = parentCollection.parentID
  }

  return {
    collectionTitles,
    request: {
      name: request.name,
      method: request.method,
      id: request.id,
    },
  }
}
