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
  GetCollectionChildrenIDsDocument,
  GetCollectionRequestsDocument,
  GetCollectionTitleAndDataDocument,
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
