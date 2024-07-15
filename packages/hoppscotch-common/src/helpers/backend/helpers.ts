import * as A from "fp-ts/Array"
import * as E from "fp-ts/Either"
import * as TE from "fp-ts/TaskEither"
import { pipe, flow } from "fp-ts/function"
import {
  HoppCollection,
  makeCollection,
  translateToNewRequest,
} from "@hoppscotch/data"
import { TeamCollection } from "../teams/TeamCollection"
import { TeamRequest } from "../teams/TeamRequest"
import { GQLError, runGQLQuery } from "./GQLClient"
import {
  ExportAsJsonDocument,
  GetCollectionChildrenDocument,
  GetCollectionChildrenIDsDocument,
  GetCollectionChildrenQuery,
  GetCollectionRequestsDocument,
  GetCollectionRequestsQuery,
  GetCollectionTitleAndDataDocument,
  RootCollectionsOfTeamDocument,
  RootCollectionsOfTeamQuery,
} from "./graphql"

export const BACKEND_PAGE_SIZE = 10

const getCollectionChildrenIDs = async (collID: string) => {
  const collsList: string[] = []

  while (true) {
    const data = await runGQLQuery({
      query: GetCollectionChildrenIDsDocument,
      variables: {
        collectionID: collID,
        cursor:
          collsList.length > 0 ? collsList[collsList.length - 1] : undefined,
      },
    })

    if (E.isLeft(data)) {
      return E.left(data.left)
    }

    collsList.push(...data.right.collection!.children.map((x) => x.id))

    if (data.right.collection!.children.length !== BACKEND_PAGE_SIZE) break
  }

  return E.right(collsList)
}

const getCollectionRequests = async (collID: string) => {
  const reqList: TeamRequest[] = []

  while (true) {
    const data = await runGQLQuery({
      query: GetCollectionRequestsDocument,
      variables: {
        collectionID: collID,
        cursor: reqList.length > 0 ? reqList[reqList.length - 1].id : undefined,
      },
    })

    if (E.isLeft(data)) {
      return E.left(data.left)
    }

    reqList.push(
      ...data.right.requestsInCollection.map(
        (x) =>
          <TeamRequest>{
            id: x.id,
            request: translateToNewRequest(JSON.parse(x.request)),
            collectionID: collID,
            title: x.title,
          }
      )
    )

    if (data.right.requestsInCollection.length !== BACKEND_PAGE_SIZE) break
  }

  return E.right(reqList)
}

export const getCompleteCollectionTree = (
  collID: string
): TE.TaskEither<GQLError<string>, TeamCollection> =>
  pipe(
    TE.Do,

    TE.bind("titleAndData", () =>
      pipe(
        () =>
          runGQLQuery({
            query: GetCollectionTitleAndDataDocument,
            variables: {
              collectionID: collID,
            },
          }),
        TE.map((result) => ({
          title: result.collection!.title,
          data: result.collection!.data,
        }))
      )
    ),
    TE.bind("children", () =>
      pipe(
        // TaskEither -> () => Promise<Either>
        () => getCollectionChildrenIDs(collID),
        TE.chain(flow(A.map(getCompleteCollectionTree), TE.sequenceArray))
      )
    ),

    TE.bind("requests", () => () => getCollectionRequests(collID)),

    TE.map(
      ({ titleAndData, children, requests }) =>
        <TeamCollection>{
          id: collID,
          children,
          requests,
          title: titleAndData.title,
          data: titleAndData.data,
        }
    )
  )

export const teamCollToHoppRESTColl = (
  coll: TeamCollection
): HoppCollection => {
  const data =
    coll.data && coll.data !== "null"
      ? JSON.parse(coll.data)
      : {
          auth: { authType: "inherit", authActive: true },
          headers: [],
        }

  return makeCollection({
    name: coll.title,
    folders: coll.children?.map(teamCollToHoppRESTColl) ?? [],
    requests: coll.requests?.map((x) => x.request) ?? [],
    auth: data.auth ?? { authType: "inherit", authActive: true },
    headers: data.headers ?? [],
  })
}

/**
 * Get the JSON string of all the collection of the specified team
 * @param teamID - ID of the team
 * @returns Either of the JSON string of the collection or the error
 */
export const getTeamCollectionJSON = async (teamID: string) =>
  await runGQLQuery({
    query: ExportAsJsonDocument,
    variables: {
      teamID,
    },
  })

async function* _getCollectionChildren(collectionID: string) {
  let cursor: string | undefined = undefined
  try {
    while (true) {
      const result: E.Either<
        GQLError<string>,
        GetCollectionChildrenQuery
      > = await runGQLQuery({
        query: GetCollectionChildrenDocument,
        variables: {
          collectionID,
          cursor,
        },
      })

      if (E.isRight(result)) {
        const childrenCount: number = result.right.collection!.children.length
        const isLastPage = childrenCount < BACKEND_PAGE_SIZE

        if (childrenCount > 0) {
          cursor = result.right.collection?.children[childrenCount - 1]?.id
        }

        if (isLastPage) {
          yield result
          break
        }
      }

      yield result
    }
  } catch (error) {
    yield E.left(error)
  }
}

export async function getCollectionChildren(collectionID: string) {
  let children: NonNullable<
    GetCollectionChildrenQuery["collection"]
  >["children"] = []
  let hasErrors = false

  for await (const result of _getCollectionChildren(collectionID)) {
    if (E.isLeft(result)) {
      hasErrors = true
      break
    }

    children = children.concat(result.right.collection?.children ?? [])
  }

  return hasErrors
    ? E.left("ERROR_FETCHING_COLLECTION_CHILDREN")
    : E.right(children)
}

async function* _getCollectionChildRequests(collectionID: string) {
  let cursor: string | undefined = undefined
  try {
    while (true) {
      const result: E.Either<
        GQLError<string>,
        GetCollectionRequestsQuery
      > = await runGQLQuery({
        query: GetCollectionRequestsDocument,
        variables: {
          collectionID,
          cursor,
        },
      })

      if (E.isRight(result)) {
        const requestCount: number = result.right.requestsInCollection.length
        const isLastPage = requestCount < BACKEND_PAGE_SIZE

        if (requestCount > 0) {
          cursor = result.right.requestsInCollection[requestCount - 1]?.id
        }

        if (isLastPage) {
          yield result
          break
        }
      }

      yield result
    }
  } catch (error) {
    yield E.left(error)
  }
}

export async function getCollectionChildRequests(collectionID: string) {
  let requests: GetCollectionRequestsQuery["requestsInCollection"] = []
  let hasErrors = false

  for await (const result of _getCollectionChildRequests(collectionID)) {
    if (E.isLeft(result)) {
      hasErrors = true
      break
    }

    const newRequests = result.right.requestsInCollection

    requests = requests.concat(newRequests)
  }

  return hasErrors
    ? E.left("ERROR_FETCHING_COLLECTION_REQUESTS")
    : E.right(requests)
}

async function* _getRootCollections(teamID: string) {
  let cursor: string | undefined = undefined
  try {
    while (true) {
      const result: E.Either<
        GQLError<string>,
        RootCollectionsOfTeamQuery
      > = await runGQLQuery({
        query: RootCollectionsOfTeamDocument,
        variables: {
          teamID,
          cursor,
        },
      })

      if (E.isRight(result)) {
        const collectionCount: number =
          result.right.rootCollectionsOfTeam.length

        const isLastPage = collectionCount < BACKEND_PAGE_SIZE
        cursor = result.right.rootCollectionsOfTeam[collectionCount - 1]?.id

        if (isLastPage) {
          yield result
          break
        }
      }

      yield result
    }
  } catch (error) {
    yield E.left(error)
  }
}

export async function getRootCollections(teamID: string) {
  let collections: RootCollectionsOfTeamQuery["rootCollectionsOfTeam"] = []

  let hasErrors = false

  for await (const result of _getRootCollections(teamID)) {
    if (E.isLeft(result)) {
      hasErrors = true
      break
    }

    collections = collections.concat(result.right.rootCollectionsOfTeam)
  }

  return hasErrors ? E.left("ERROR_FETCHING_COLLECTIONS") : E.right(collections)
}

// TODO: extract pagination logic to a common function
