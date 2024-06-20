import { Service } from "dioc"
import { WorkspaceProvider } from "../provider"
import { NewWorkspaceService } from ".."
import { Handle, HandleRef } from "../handle"
import {
  Workspace,
  WorkspaceCollection,
  WorkspaceDecor,
  WorkspaceRequest,
} from "../workspace"
import {
  HoppCollection,
  HoppRESTAuth,
  HoppRESTHeader,
  HoppRESTHeaders,
} from "@hoppscotch/data"

import * as E from "fp-ts/Either"
import { platform } from "~/platform"
import {
  createNewRootCollection,
  createChildCollection,
  updateTeamCollection,
  deleteCollection,
  moveRESTTeamCollection,
} from "~/helpers/backend/mutations/TeamCollection"
import {
  createRequestInCollection,
  updateTeamRequest,
  deleteTeamRequest,
} from "~/helpers/backend/mutations/TeamRequest"
import { createTeam } from "~/helpers/backend/mutations/Team"
import { Ref, computed, ref, watch } from "vue"
import {
  RESTCollectionChildrenView,
  RESTCollectionJSONView,
  RESTCollectionLevelAuthHeadersView,
  RESTCollectionViewItem,
  RESTSearchResultsView,
  RootRESTCollectionView,
} from "../view"
import {
  GQLError,
  runGQLQuery,
  runGQLSubscription,
  runMutation,
} from "~/helpers/backend/GQLClient"
import {
  GetCollectionChildrenDocument,
  GetMyTeamsDocument,
  ImportFromJsonDocument,
  ImportFromJsonMutation,
  ImportFromJsonMutationVariables,
  RootCollectionsOfTeamDocument,
  TeamCollectionAddedDocument,
  TeamCollectionMovedDocument,
  TeamCollectionRemovedDocument,
  TeamCollectionUpdatedDocument,
  TeamRequestAddedDocument,
  TeamRequestDeletedDocument,
  TeamRequestMovedDocument,
  TeamRequestOrderUpdatedDocument,
  TeamRequestUpdatedDocument,
} from "~/helpers/backend/graphql"
import { Subscription } from "wonka"

import { generateKeyBetween } from "fractional-indexing"

import IconUser from "~icons/lucide/user"
import TeamsWorkspaceSelector from "~/components/workspace/TeamsWorkspaceSelector.vue"
import { lazy } from "~/helpers/utils/lazy"
import { HoppInheritedProperty } from "~/helpers/types/HoppInheritedProperties"
import { initializeDownloadFile } from "~/helpers/import-export/export"
import { TeamSearchService } from "~/helpers/teams/TeamsSearch.service"
import { fetchAllTeams } from "~/helpers/teams/TeamListAdapter"
import { HoppRESTRequest } from "@hoppscotch/data"
import {
  getCollectionChildren,
  getCollectionChildRequests,
  getRootCollections,
} from "~/helpers/backend/helpers"

type TeamsWorkspaceCollection = WorkspaceCollection & {
  parentCollectionID?: string
  order: string
  auth: HoppRESTAuth
  headers: HoppRESTHeader[]
}

type TeamsWorkspaceRequest = WorkspaceRequest & {
  order: string
}

export class TeamsWorkspaceProviderService
  extends Service
  implements WorkspaceProvider
{
  public static readonly ID = "TEAMS_WORKSPACE_PROVIDER_SERVICE"

  public readonly providerID = "TEAMS_WORKSPACE_PROVIDER"

  private workspaceService = this.bind(NewWorkspaceService)

  private workspaces: Ref<Workspace[]> = ref([])

  private collections: Ref<TeamsWorkspaceCollection[]> = ref([])

  private requests: Ref<TeamsWorkspaceRequest[]> = ref([])

  private orderedRequests = computed(() => {
    return sortByOrder(this.requests.value)
  })

  private orderedCollections = computed(() => {
    return sortByOrder(this.collections.value)
  })

  private subscriptions: Subscription[] = []

  private fetchingWorkspaces = ref(false)

  private teamSearchService = this.bind(TeamSearchService)

  constructor() {
    super()

    this.workspaceService.registerWorkspaceProvider(this)
  }

  public async init() {
    this.fetchingWorkspaces = ref(true)

    const res = await fetchAllTeams()

    if (E.isLeft(res)) {
      this.fetchingWorkspaces.value = false

      return
    }

    this.workspaces.value = res.right.myTeams.map((team) => {
      return {
        name: team.name,
        workspaceID: team.id,
        providerID: this.providerID,
      }
    })

    this.fetchingWorkspaces.value = false
  }

  public workspaceDecor: Ref<WorkspaceDecor> = ref({
    headerCurrentIcon: IconUser,
    workspaceSelectorComponent: TeamsWorkspaceSelector,
    workspaceSelectorPriority: 99,
  })

  // this is temporary, i need this to create workspaces
  async createWorkspace(
    workspaceName: string
  ): Promise<E.Either<unknown, Handle<Workspace>>> {
    const res = await createTeam(workspaceName)()

    if (E.isLeft(res)) {
      return res
    }

    const workspaceID = res.right.id

    const workspace = {
      name: workspaceName,
      workspaceID,
      providerID: this.providerID,
    }

    this.workspaces.value.push(workspace)

    return E.right({
      get: () =>
        computed(() => {
          return {
            data: workspace,
            type: "ok" as const,
          }
        }),
    })
  }

  // this is temporary, i need this to populate root collections
  async selectWorkspace(
    workspaceHandle: HandleRef<Workspace>
  ): Promise<E.Either<unknown, void>> {
    if (!isValidWorkspaceHandle(workspaceHandle, this.providerID)) {
      return E.left("INVALID_WORKSPACE_HANDLE" as const)
    }

    // set this as activeWorkspaceHandle in workspaceService
    this.workspaceService.activeWorkspaceHandle.value = {
      get: () => workspaceHandle,
    }

    // unsubscribe previous subscriptions
    this.subscriptions.forEach((sub) => sub.unsubscribe())

    // setup new subscriptions
    this.setupTeamsCollectionAddedSubscription(
      workspaceHandle.value.data.workspaceID
    )
    this.setupTeamsCollectionUpdatedSubscription(
      workspaceHandle.value.data.workspaceID
    )
    this.setupTeamsCollectionRemovedSubscription(
      workspaceHandle.value.data.workspaceID
    )
    this.setupTeamsRequestAddedSubscription(
      workspaceHandle.value.data.workspaceID
    )
    this.setupTeamsRequestUpdatedSubscription(
      workspaceHandle.value.data.workspaceID
    )
    this.setupTeamsRequestRemovedSubscription(
      workspaceHandle.value.data.workspaceID
    )
    this.setupTeamsRequestMovedSubscription(
      workspaceHandle.value.data.workspaceID
    )
    this.setupTeamsCollectionMovedSubscription(
      workspaceHandle.value.data.workspaceID
    )
    this.setupTeamRequestOrderUpdatedSubscription(
      workspaceHandle.value.data.workspaceID
    )

    // start fetching root collections
    const res = await fetchRootCollections(
      workspaceHandle.value.data.workspaceID
    )

    if (E.isLeft(res)) {
      return res
    }

    let previousOrder: string | null = null

    this.collections.value = res.right.rootCollectionsOfTeam.map(
      (collection) => {
        const order = generateKeyBetween(previousOrder, null)

        previousOrder = order

        return {
          collectionID: collection.id,
          providerID: this.providerID,
          workspaceID: workspaceHandle.value.data.workspaceID,
          name: collection.title,
          order,
        }
      }
    )

    return E.right(undefined)
  }

  async createRESTRootCollection(
    workspaceHandle: Handle<Workspace>,
    newCollection: Partial<HoppCollection> & { name: string }
  ): Promise<E.Either<unknown, Handle<WorkspaceCollection>>> {
    const workspaceHandleRef = workspaceHandle.get()

    if (!isValidWorkspaceHandle(workspaceHandleRef, this.providerID)) {
      return E.left("INVALID_WORKSPACE_HANDLE" as const)
    }

    const { name } = newCollection

    const res = await createNewRootCollection(
      name,
      workspaceHandleRef.value.data.workspaceID
    )()

    if (E.isLeft(res)) {
      return res
    }

    platform.analytics?.logEvent({
      type: "HOPP_CREATE_COLLECTION",
      platform: "rest",
      workspaceType: "team",
      isRootCollection: true,
    })

    const collectionID = res.right.createRootCollection.id
    const providerID = workspaceHandleRef.value.data.providerID

    // add the new collection to the collections
    const siblingCollections = this.collections.value
      .filter((collection) => collection.parentCollectionID === null)
      .at(-1)

    const order = generateKeyBetween(siblingCollections?.order, null)

    this.collections.value.push({
      collectionID,
      providerID,
      workspaceID: workspaceHandleRef.value.data.workspaceID,
      name,
      order,
      auth: {
        authType: "none",
        authActive: true,
      },
      headers: [],
    })

    const createdCollectionHandle = await this.getCollectionHandle(
      workspaceHandle,
      collectionID
    )

    return createdCollectionHandle
  }

  // for testing purposes
  _setWorkspaces(workspaces: Workspace[]) {
    this.workspaces.value = workspaces
  }

  // for testing purposes
  _setCollections(collections: TeamsWorkspaceCollection[]) {
    this.collections.value = collections
  }

  async createRESTChildCollection(
    parentCollectionHandle: Handle<WorkspaceCollection>,
    newChildCollection: Partial<HoppCollection> & { name: string }
  ): Promise<E.Either<unknown, Handle<WorkspaceCollection>>> {
    const parentCollectionHandleRef = parentCollectionHandle.get()

    if (parentCollectionHandleRef.value.type === "invalid") {
      return E.left("INVALID_COLLECTION_HANDLE" as const)
    }

    const { name } = newChildCollection

    const parentCollectionID = parentCollectionHandleRef.value.data.collectionID

    const res = await createChildCollection(name, parentCollectionID)()

    if (E.isLeft(res)) {
      return res
    }

    platform.analytics?.logEvent({
      type: "HOPP_CREATE_COLLECTION",
      platform: "rest",
      workspaceType: "team",
      isRootCollection: false,
    })

    const collectionID = res.right.createChildCollection.id
    const providerID = parentCollectionHandleRef.value.data.providerID
    const workspaceID = parentCollectionHandleRef.value.data.workspaceID

    const lastSibling = this.collections.value
      .filter(
        (collection) => collection.parentCollectionID === parentCollectionID
      )
      .at(-1)

    const order = generateKeyBetween(lastSibling?.order, null)

    this.collections.value.push({
      collectionID,
      providerID,
      workspaceID,
      name,
      parentCollectionID: parentCollectionHandleRef.value.data.collectionID,
      order,
      auth: {
        authType: "none",
        authActive: true,
      },
      headers: [],
    })

    const createdCollectionHandle = await this.getCollectionHandle(
      parentCollectionHandle,
      collectionID
    )

    return createdCollectionHandle
  }

  async updateRESTCollection(
    collectionHandle: Handle<WorkspaceCollection>,
    updatedCollection: Partial<HoppCollection>
  ): Promise<E.Either<unknown, void>> {
    const collectionHandleRef = collectionHandle.get()

    if (!isValidCollectionHandle(collectionHandleRef, this.providerID)) {
      return E.left("INVALID_COLLECTION_HANDLE" as const)
    }

    const existingCollection = this.collections.value.find(
      (collection) =>
        collection.collectionID === collectionHandleRef.value.data.collectionID
    )

    if (!existingCollection) {
      return E.left("INVALID_COLLECTION_HANDLE" as const)
    }

    const name = updatedCollection.name ?? existingCollection.name
    const headers = updatedCollection.headers ?? existingCollection.headers
    const auth = updatedCollection.auth ?? existingCollection.auth

    const res = await updateTeamCollection(
      collectionHandleRef.value.data.collectionID,
      JSON.stringify({
        headers,
        auth,
      }),
      name
    )()

    if (E.isLeft(res)) {
      return res
    }

    // update the existing collection
    this.collections.value = this.collections.value.map((collection) => {
      if (
        collection.collectionID === collectionHandleRef.value.data.collectionID
      ) {
        return {
          ...collection,
          name,
          headers,
          auth,
        }
      }

      return collection
    })

    return E.right(undefined)
  }

  async createRESTRequest(
    parentCollectionHandle: Handle<WorkspaceCollection>,
    newRequest: HoppRESTRequest
  ): Promise<E.Either<unknown, Handle<WorkspaceRequest>>> {
    const parentCollectionHandleRef = parentCollectionHandle.get()

    if (!isValidCollectionHandle(parentCollectionHandleRef, this.providerID)) {
      return E.left("INVALID_COLLECTION_HANDLE" as const)
    }

    const collectionID = parentCollectionHandleRef.value.data.collectionID

    const res = await createRequestInCollection(collectionID, {
      request: JSON.stringify(newRequest),
      teamID: parentCollectionHandleRef.value.data.workspaceID,
      title: newRequest.name,
    })()

    if (E.isLeft(res)) {
      return res
    }

    const requestID = res.right.createRequestInCollection.id
    const providerID = parentCollectionHandleRef.value.data.providerID
    const workspaceID = parentCollectionHandleRef.value.data.workspaceID

    const siblingRequests = this.requests.value.filter(
      (request) => request.collectionID === collectionID
    )

    const lastSibling = siblingRequests.at(-1)

    const order = generateKeyBetween(lastSibling?.order, null)

    this.requests.value.push({
      requestID,
      providerID,
      workspaceID,
      collectionID,
      request: newRequest,
      order,
    })

    const createdRequestHandle = await this.getRequestHandle(
      parentCollectionHandle,
      requestID
    )

    return createdRequestHandle
  }

  async updateRESTRequest(
    requestHandle: Handle<WorkspaceRequest>,
    updatedRequest: Partial<HoppRESTRequest> & { name: string }
  ): Promise<
    E.Either<
      "INVALID_REQUEST_HANDLE" | "REQUEST_DOES_NOT_EXIST" | GQLError<any>,
      void
    >
  > {
    const requestHandleRef = requestHandle.get()

    if (!isValidRequestHandle(requestHandleRef, this.providerID)) {
      return E.left("INVALID_REQUEST_HANDLE" as const)
    }

    const request = this.requests.value.find(
      (request) => request.requestID === requestHandleRef.value.data.requestID
    )

    if (!request) {
      return E.left("REQUEST_DOES_NOT_EXIST" as const)
    }

    const res = await updateTeamRequest(requestHandleRef.value.data.requestID, {
      request: JSON.stringify(updatedRequest),
      title: updatedRequest.name,
    })()

    if (E.isLeft(res)) {
      return res
    }

    this.requests.value = this.requests.value.map((req) => {
      if (req.requestID === requestHandleRef.value.data.requestID) {
        return {
          ...req,
          request: {
            ...request.request,
            ...updatedRequest,
          },
        }
      }

      return req
    })

    if (E.isLeft(res)) {
      return res
    }

    return E.right(undefined)
  }

  async removeRESTCollection(
    collectionHandle: Handle<WorkspaceCollection>
  ): Promise<
    E.Either<
      "INVALID_COLLECTION_HANDLE" | GQLError<"team/invalid_coll_id">,
      void
    >
  > {
    const collectionHandleRef = collectionHandle.get()

    if (!isValidCollectionHandle(collectionHandleRef, this.providerID)) {
      return E.left("INVALID_COLLECTION_HANDLE" as const)
    }

    const res = await deleteCollection(
      collectionHandleRef.value.data.collectionID
    )()

    if (E.isLeft(res)) {
      return res
    }

    // remove the collection from the collections
    // the subscriptions will also take care of this
    this.collections.value = this.collections.value.filter(
      (collection) =>
        collection.collectionID !== collectionHandleRef.value.data.collectionID
    )

    return E.right(undefined)
  }

  async removeRESTRequest(
    requestHandle: Handle<WorkspaceRequest>
  ): Promise<
    E.Either<"INVALID_REQUEST_HANDLE" | GQLError<"team_req/not_found">, void>
  > {
    const requestHandleRef = requestHandle.get()

    if (!isValidRequestHandle(requestHandleRef, this.providerID)) {
      return E.left("INVALID_REQUEST_HANDLE" as const)
    }

    const res = await deleteTeamRequest(requestHandleRef.value.data.requestID)()

    if (E.isLeft(res)) {
      return res
    }

    // remove the request from the requests
    // the subscriptions will also take care of this
    this.requests.value = this.requests.value.filter(
      (request) => request.requestID !== requestHandleRef.value.data.requestID
    )

    return E.right(undefined)
  }

  getWorkspaces(): HandleRef<HandleRef<Workspace>[], "LOADING_WORKSPACES"> {
    return computed(() => {
      if (this.fetchingWorkspaces.value) {
        return {
          type: "invalid" as const,
          reason: "LOADING_WORKSPACES" as const,
        }
      }

      return {
        data: this.workspaces.value.map((workspace) => {
          return computed(() => {
            const existsStill = this.workspaces.value.includes(workspace)

            if (!existsStill) {
              return {
                type: "invalid" as const,
                reason: "WORKSPACE_DOES_NOT_EXIST",
              }
            }

            return {
              data: workspace,
              type: "ok" as const,
            }
          })
        }),
        type: "ok" as const,
      }
    })

    // return this.workspaces.value.map((workspace) => {
    //   return computed(() => {
    //     const existsStill = this.workspaces.value.includes(workspace)

    //     if (!existsStill) {
    //       return {
    //         type: "invalid" as const,
    //         reason: "WORKSPACE_DOES_NOT_EXIST",
    //       }
    //     }

    //     return {
    //       data: workspace,
    //       type: "ok" as const,
    //     }
    //   })
    // })
  }

  async getCollectionHandle(
    workspaceHandle: Handle<Workspace>,
    collectionID: string
  ): Promise<E.Either<unknown, Handle<WorkspaceCollection>>> {
    return E.right({
      get: lazy(() =>
        computed(() => {
          const workspaceHandleRef = workspaceHandle.get()

          const collection = this.collections.value.find(
            (collection) => collection.collectionID === collectionID
          )

          if (!isValidWorkspaceHandle(workspaceHandleRef, this.providerID)) {
            return {
              type: "invalid" as const,
              reason: "INVALID_WORKSPACE_HANDLE",
            }
          }

          if (!collection) {
            return {
              type: "invalid" as const,
              reason: "COLLECTION_DOES_NOT_EXIST",
            }
          }

          return {
            data: {
              collectionID: collection.collectionID,
              providerID: collection.providerID,
              workspaceID: collection.workspaceID,
              name: collection.name,
            },
            type: "ok" as const,
          }
        })
      ),
    })
  }

  async getRESTCollectionChildrenView(
    collectionHandle: Handle<WorkspaceCollection>
  ): Promise<E.Either<never, Handle<RESTCollectionChildrenView>>> {
    const collectionHandleRef = collectionHandle.get()

    const isFetchingCollection = ref(false)
    const isFetchingRequests = ref(false)

    const isFetchingChildren = computed(() => {
      return isFetchingCollection.value || isFetchingRequests.value
    })

    if (isValidCollectionHandle(collectionHandleRef, this.providerID)) {
      isFetchingCollection.value = true
      // fetch the child collections
      getCollectionChildren(collectionHandleRef.value.data.collectionID)
        .then((children) => {
          if (E.isLeft(children) || !children.right.collection?.children) {
            return
          }

          // remove the existing children
          this.collections.value = this.collections.value.filter(
            (collection) =>
              collection.parentCollectionID !==
              collectionHandleRef.value.data.collectionID
          )

          let previousOrder: string | null = null

          // now push the new children
          this.collections.value.push(
            ...children.right.collection?.children.map((collection) => {
              const collectionProperties = collection.data
                ? JSON.parse(collection.data)
                : null

              let auth: HoppRESTAuth = {
                authType: "inherit",
                authActive: true,
              }

              let headers: HoppRESTHeader[] = []

              const authParsingRes = HoppRESTAuth.safeParse(
                collectionProperties?.auth
              )

              const headersParsingRes = HoppRESTHeaders.safeParse(
                collectionProperties?.headers
              )

              if (authParsingRes.success) {
                auth = authParsingRes.data
              }

              if (headersParsingRes.success) {
                headers = headersParsingRes.data
              }

              const order = generateKeyBetween(previousOrder, null)
              previousOrder = order

              return {
                collectionID: collection.id,
                providerID: this.providerID,
                workspaceID: collectionHandleRef.value.data.workspaceID,
                name: collection.title,
                parentCollectionID: collectionHandleRef.value.data.collectionID,
                order,
                auth: auth,
                headers: headers,
              }
            })
          )
        })
        .finally(() => {
          isFetchingCollection.value = false
        })

      // fetch the child requests
      getCollectionChildRequests(collectionHandleRef.value.data.collectionID)
        .then((requests) => {
          if (E.isLeft(requests)) {
            return
          }

          // remove the existing requests
          this.requests.value = this.requests.value.filter(
            (request) =>
              request.collectionID !==
              collectionHandleRef.value.data.collectionID
          )

          let previousOrder: string | null = null

          // now push the new requests
          this.requests.value.push(
            ...requests.right.requestsInCollection.map((request) => {
              const order = generateKeyBetween(previousOrder, null)
              previousOrder = order

              return {
                requestID: request.id,
                providerID: this.providerID,
                workspaceID: collectionHandleRef.value.data.workspaceID,
                collectionID: collectionHandleRef.value.data.collectionID,
                request: JSON.parse(request.request), // TODO: validation
                order,
              }
            })
          )
        })
        .finally(() => {
          isFetchingRequests.value = false
        })
    }

    return E.right({
      get: lazy(() =>
        computed(() => {
          if (!isValidCollectionHandle(collectionHandleRef, this.providerID)) {
            return {
              type: "invalid" as const,
              reason: "INVALID_COLLECTION_HANDLE",
            }
          }

          // TODO: Why computed in a computed ? doing this to make typescript happy here, check later
          const collectionChildren = computed(() => {
            const sortedAndFilteredCollections = sortByOrder(
              this.collections.value.filter(
                (collection) =>
                  collection.parentCollectionID ===
                  collectionHandleRef.value.data.collectionID
              )
            )

            const collections = sortedAndFilteredCollections.map(
              (collection, index) =>
                <RESTCollectionViewItem>{
                  type: "collection" as const,
                  value: {
                    collectionID: collection.collectionID,
                    name: collection.name,
                    parentCollectionID: collection.parentCollectionID ?? null,
                    isLastItem:
                      index === sortedAndFilteredCollections.length - 1,
                  },
                }
            )

            const sortedAndFilteredRequests = sortByOrder(
              this.requests.value.filter(
                (request) =>
                  request.collectionID ===
                  collectionHandleRef.value.data.collectionID
              )
            )

            const requests = sortedAndFilteredRequests.map(
              (request, index) =>
                <RESTCollectionViewItem>{
                  type: "request",
                  value: {
                    request: request.request,
                    collectionID: request.collectionID,
                    isLastItem: index === sortedAndFilteredRequests.length - 1,
                    requestID: request.requestID,
                  },
                }
            )

            return [...collections, ...requests]
          })

          if (!isValidCollectionHandle(collectionHandleRef, this.providerID)) {
            return {
              type: "invalid" as const,
              reason: "INVALID_COLLECTION_HANDLE",
            }
          }

          return {
            data: {
              collectionID: collectionHandleRef.value.data.collectionID,
              providerID: collectionHandleRef.value.data.providerID,
              workspaceID: collectionHandleRef.value.data.workspaceID,
              content: collectionChildren,
              loading: isFetchingChildren,
            },
            type: "ok" as const,
          }
        })
      ),
    })
  }

  async getRESTRootCollectionView(
    workspaceHandle: Handle<Workspace>
  ): Promise<E.Either<never, Handle<RootRESTCollectionView>>> {
    const workspaceHandleRef = workspaceHandle.get()

    const isFetchingRootCollections = ref(false)

    if (isValidWorkspaceHandle(workspaceHandleRef, this.providerID)) {
      isFetchingRootCollections.value = true

      // fetch the root collections
      getRootCollections(workspaceHandleRef.value.data.workspaceID)
        .then((collections) => {
          if (E.isLeft(collections)) {
            return
          }

          // remove the existing collections
          this.collections.value = this.collections.value.filter(
            (collection) => !collection.parentCollectionID
          )

          let previousOrder: string | null = null

          this.collections.value.push(
            ...collections.right.rootCollectionsOfTeam.map((collection) => {
              const collectionProperties = collection.data
                ? JSON.parse(collection.data)
                : null

              let auth: HoppRESTAuth = {
                authType: "none",
                authActive: true,
              }

              let headers: HoppRESTHeader[] = []

              const authParsingRes = HoppRESTAuth.safeParse(
                collectionProperties?.auth
              )

              const headersParsingRes = HoppRESTHeaders.safeParse(
                collectionProperties?.headers
              )

              if (authParsingRes.success) {
                auth = authParsingRes.data
              }

              if (headersParsingRes.success) {
                headers = headersParsingRes.data
              }

              const order = generateKeyBetween(previousOrder, null)
              previousOrder = order

              return {
                collectionID: collection.id,
                providerID: this.providerID,
                workspaceID: workspaceHandleRef.value.data.workspaceID,
                name: collection.title,
                order,
                auth: auth,
                headers: headers,
              }
            })
          )
        })
        .finally(() => {
          isFetchingRootCollections.value = false
        })
    }

    return E.right({
      get: lazy(() =>
        computed(() => {
          if (!isValidWorkspaceHandle(workspaceHandleRef, this.providerID)) {
            return {
              type: "invalid" as const,
              reason: "INVALID_WORKSPACE_HANDLE",
            }
          }

          const rootCollections = computed(() => {
            const filteredAndSorted = sortByOrder(
              this.collections.value.filter(
                (collection) => !collection.parentCollectionID
              )
            )

            return filteredAndSorted.map((collection, index) => {
              return {
                collectionID: collection.collectionID,
                name: collection.name,
                isLastItem: index === filteredAndSorted.length - 1,
                parentCollectionID: null,
              }
            })
          })

          return {
            data: {
              workspaceID: workspaceHandleRef.value.data.workspaceID,
              providerID: this.providerID,
              // this won't be triggered
              collections: rootCollections,
              loading: isFetchingRootCollections,
            },
            type: "ok" as const,
          }
        })
      ),
    })
  }

  async getRequestHandle(
    workspaceHandle: Handle<Workspace>,
    requestID: string
  ): Promise<E.Either<unknown, Handle<WorkspaceRequest>>> {
    const workspaceHandleRef = workspaceHandle.get()

    return E.right({
      get: lazy(() =>
        computed(() => {
          if (!isValidWorkspaceHandle(workspaceHandleRef, this.providerID)) {
            return {
              type: "invalid" as const,
              reason: "INVALID_WORKSPACE_HANDLE",
            }
          }

          const request = this.requests.value.find(
            (request) => request.requestID === requestID
          )

          if (!request) {
            return {
              type: "invalid" as const,
              reason: "REQUEST_DOES_NOT_EXIST",
            }
          }

          return {
            data: {
              requestID: request.requestID,
              providerID: request.providerID,
              workspaceID: request.workspaceID,
              collectionID: request.collectionID,
              request: request.request,
            },
            type: "ok" as const,
          }
        })
      ),
    })
  }

  async getRESTCollectionLevelAuthHeadersView(
    collectionHandle: Handle<WorkspaceCollection>
  ): Promise<E.Either<never, Handle<RESTCollectionLevelAuthHeadersView>>> {
    return E.right({
      get: () =>
        computed(() => {
          const collectionHandleRef = collectionHandle.get()

          if (!isValidCollectionHandle(collectionHandleRef, this.providerID)) {
            return {
              type: "invalid" as const,
              reason: "INVALID_COLLECTION_HANDLE",
            }
          }

          const { collectionID } = collectionHandleRef.value.data

          const collection = this.collections.value.find(
            (collection) => collection.collectionID === collectionID
          )

          if (!collection) {
            return {
              type: "invalid" as const,
              reason: "COLLECTION_DOES_NOT_EXIST",
            }
          }

          let inheritedAuth: HoppInheritedProperty["auth"] = {
            parentID: "",
            parentName: "",
            inheritedAuth: {
              authType: "none",
              authActive: true,
            },
          }

          let collectionToProcess: typeof collection | undefined = collection

          // TODO: move this into a function
          while (collectionToProcess) {
            if (collectionToProcess.auth.authType !== "inherit") {
              inheritedAuth = {
                parentID: collectionToProcess.collectionID,
                parentName: collectionToProcess.name,
                inheritedAuth: collectionToProcess.auth,
              }

              break
            }

            const parentCollectionID: string | undefined =
              collectionToProcess.parentCollectionID

            if (!parentCollectionID) {
              break
            }

            collectionToProcess = this.collections.value.find(
              (collection) => collection.collectionID === parentCollectionID
            )
          }

          let collectionToProcessHeaders: typeof collection | undefined =
            collection

          const inheritedHeaders: HoppInheritedProperty["headers"] = []

          const headerKeys = new Set<string>()

          // TODO: move this into a function
          while (collectionToProcessHeaders) {
            collectionToProcessHeaders.headers
              .filter((header) => header.active)
              .forEach((header) => {
                if (!headerKeys.has(header.key) && collectionToProcessHeaders) {
                  inheritedHeaders.push({
                    parentID: collectionToProcessHeaders.collectionID,
                    parentName: collectionToProcessHeaders.name,
                    inheritedHeader: header,
                  })

                  headerKeys.add(header.key)
                }
              })

            const parentCollectionID: string | undefined =
              collectionToProcessHeaders.parentCollectionID

            if (!parentCollectionID) {
              break
            }

            collectionToProcessHeaders = this.collections.value.find(
              (collection) => collection.collectionID === parentCollectionID
            )
          }

          return {
            data: {
              auth: inheritedAuth,
              headers: inheritedHeaders,
            },
            type: "ok" as const,
          }
        }),
    })
  }

  public async exportRESTCollections(
    workspaceHandle: Handle<Workspace>
  ): Promise<E.Either<unknown, void>> {
    const workspaceHandleRef = workspaceHandle.get()

    if (!isValidWorkspaceHandle(workspaceHandleRef, this.providerID)) {
      return E.left("INVALID_WORKSPACE_HANDLE" as const)
    }

    const workspaceID = workspaceHandleRef.value.data.workspaceID

    const collectionsInWorkspace = this.collections.value.filter(
      (collection) => {
        return collection.workspaceID === workspaceID
      }
    )

    const requestsInWorkspace = this.requests.value.filter((request) => {
      return request.workspaceID === workspaceID
    })

    const tree = makeCollectionTree(collectionsInWorkspace, requestsInWorkspace)

    const downloadRes = await initializeDownloadFile(
      JSON.stringify(tree, null, 2),
      "Collections"
    )

    if (E.isLeft(downloadRes)) {
      return downloadRes
    }

    return E.right(undefined)
  }

  // not tested
  public async getRESTCollectionJSONView(
    workspaceHandle: Handle<Workspace>
  ): Promise<E.Either<never, Handle<RESTCollectionJSONView>>> {
    const workspaceHandleRef = workspaceHandle.get()

    return E.right({
      get: () =>
        computed(() => {
          if (!isValidWorkspaceHandle(workspaceHandleRef, this.providerID)) {
            return {
              type: "invalid" as const,
              reason: "INVALID_WORKSPACE_HANDLE",
            }
          }

          const workspaceID = workspaceHandleRef.value.data.workspaceID

          const collectionsInWorkspace = this.collections.value.filter(
            (collection) => {
              return collection.workspaceID === workspaceID
            }
          )

          const requestsInWorkspace = this.requests.value.filter((request) => {
            return request.workspaceID === workspaceID
          })

          const tree = makeCollectionTree(
            collectionsInWorkspace,
            requestsInWorkspace
          )

          const view: RESTCollectionJSONView = {
            providerID: this.providerID,
            workspaceID,
            content: JSON.stringify(tree, null, 2),
          }

          return {
            type: "ok" as const,
            data: view,
          }
        }),
    })
  }

  // not tested
  public async exportRESTCollection(
    collectionHandle: Handle<WorkspaceCollection>
  ): Promise<E.Either<unknown, void>> {
    const collectionHandleRef = collectionHandle.get()

    if (!isValidCollectionHandle(collectionHandleRef, this.providerID)) {
      return E.left("INVALID_COLLECTION_HANDLE" as const)
    }

    const collectionID = collectionHandleRef.value.data.collectionID

    const collection = this.collections.value.find(
      (collection) => collection.collectionID === collectionID
    )

    if (!collection) {
      return E.left("COLLECTION_DOES_NOT_EXIST" as const)
    }

    const collectionTree = buildTreeForSingleCollection(
      collection,
      this.collections.value,
      this.requests.value
    )

    const downloadRes = await initializeDownloadFile(
      JSON.stringify(collectionTree, null, 2),
      collection.name
    )

    if (E.isLeft(downloadRes)) {
      return downloadRes
    }

    return E.right(undefined)
  }

  // not tested
  public async importRESTCollections(
    workspaceHandle: Handle<Workspace>,
    collections: HoppCollection[]
  ): Promise<E.Either<unknown, void>> {
    const workspaceHandleRef = workspaceHandle.get()

    if (!isValidWorkspaceHandle(workspaceHandleRef, this.providerID)) {
      return E.left("INVALID_WORKSPACE_HANDLE")
    }

    const workspaceID = workspaceHandleRef.value.data.workspaceID

    const teamCollectionsFormat = collections.map(
      translateToTeamCollectionFormat
    )

    const res = await importJSONToTeam(
      JSON.stringify(teamCollectionsFormat),
      workspaceID
    )()

    if (E.isLeft(res)) {
      return res
    }

    // here we can't replace the collections from this function because the ID is not returned by the importJSONToTeam
    // we'll rely on the subscriptions to update the collections

    return E.right(undefined)
  }

  // not tested
  async getRESTSearchResultsView(
    workspaceHandle: Handle<Workspace>,
    searchQuery: Ref<string>
  ): Promise<E.Either<never, Handle<RESTSearchResultsView>>> {
    return E.right({
      get: () =>
        computed(() => {
          const workspaceHandleRef = workspaceHandle.get()

          if (!isValidWorkspaceHandle(workspaceHandleRef, this.providerID)) {
            return {
              type: "invalid" as const,
              reason: "INVALID_WORKSPACE_HANDLE",
            }
          }

          const teamsSearchResults = this.teamSearchService.searchTeams(
            searchQuery.value,
            workspaceHandleRef.value.data.workspaceID
          )

          return {
            type: "ok" as const,
            data: teamsSearchResults,
          }
        }),
    })
  }

  // TODO: right now you're not calling the BE for this akash, include it later
  async moveRESTCollection(
    collectionHandle: Handle<WorkspaceCollection>,
    destinationCollectionID: string | null
  ): Promise<E.Either<unknown, void>> {
    const collectionHandleRef = collectionHandle.get()

    if (!isValidCollectionHandle(collectionHandleRef, this.providerID)) {
      return Promise.resolve(E.left("INVALID_COLLECTION_HANDLE" as const))
    }

    const collection = this.collections.value.find(
      (collection) =>
        collection.collectionID === collectionHandleRef.value.data.collectionID
    )

    if (!collection) {
      return Promise.resolve(E.left("COLLECTION_DOES_NOT_EXIST" as const))
    }

    const moveRES = await moveRESTTeamCollection(
      collectionHandleRef.value.data.collectionID,
      destinationCollectionID
    )()

    if (E.isLeft(moveRES)) {
      return E.left(moveRES.left)
    }

    // find the sibling collections, and move the collection to the end of that collection
    // also consider the destinationCollectionID being null, in that case, move it to the root
    const siblingCollections = this.collections.value.filter(
      (collection) => collection.parentCollectionID === destinationCollectionID
    )

    const lastSibling = siblingCollections.at(-1)

    const order = generateKeyBetween(lastSibling?.order, null)

    // TODO: check this type error
    this.collections.value = this.collections.value.map((col) => {
      if (col.collectionID === collection.collectionID) {
        return {
          ...col,
          parentCollectionID: destinationCollectionID ?? undefined,
          order,
        }
      }

      return col
    })

    return Promise.resolve(E.right(undefined))
  }

  moveRESTRequest(
    requestHandle: Handle<WorkspaceRequest>,
    destinationCollectionID: string
  ): Promise<E.Either<unknown, void>> {
    const requestHandleRef = requestHandle.get()

    if (!isValidRequestHandle(requestHandleRef, this.providerID)) {
      return Promise.resolve(E.left("INVALID_REQUEST_HANDLE" as const))
    }

    const request = this.requests.value.find(
      (request) => request.requestID === requestHandleRef.value.data.requestID
    )

    if (!request) {
      return Promise.resolve(E.left("REQUEST_DOES_NOT_EXIST" as const))
    }

    // get the destination collection, and move the request to the end of that collection
    const destinationCollection = this.collections.value.find(
      (collection) => collection.collectionID === destinationCollectionID
    )

    if (!destinationCollection) {
      return Promise.resolve(E.left("DESTINATION_COLLECTION_DOES_NOT_EXIST"))
    }

    const siblingRequests = this.requests.value.filter(
      (request) => request.collectionID === destinationCollectionID
    )

    const lastSibling = siblingRequests.at(-1)

    const order = generateKeyBetween(lastSibling?.order, null)

    this.requests.value = this.requests.value.map((req) => {
      if (req.requestID === request.requestID) {
        return {
          ...req,
          collectionID: destinationCollectionID,
          order,
        }
      }

      return req
    })

    return Promise.resolve(E.right(undefined))
  }

  reorderRESTCollection(
    collectionHandle: Handle<WorkspaceCollection>,
    destinationCollectionID: string | null
  ): Promise<E.Either<unknown, void>> {
    const collectionHandleRef = collectionHandle.get()

    if (!isValidCollectionHandle(collectionHandleRef, this.providerID)) {
      return Promise.resolve(E.left("INVALID_COLLECTION_HANDLE" as const))
    }

    const collection = this.collections.value.find(
      (collection) =>
        collection.collectionID === collectionHandleRef.value.data.collectionID
    )

    if (!collection) {
      return Promise.resolve(E.left("COLLECTION_DOES_NOT_EXIST" as const))
    }

    const nextCollection = this.collections.value.find(
      (collection) => collection.collectionID === destinationCollectionID
    )

    const reorderOperation = reorderItemsWithoutChangingParent(
      collection.collectionID,
      nextCollection?.collectionID ?? null,

      // TODO: undefined v/s null thing, fix later
      this.orderedCollections.value,
      "collectionID",
      "parentCollectionID"
    )

    if (E.isLeft(reorderOperation)) {
      return Promise.resolve(reorderOperation)
    }

    // TODO: might be due to figuring out the return type. fix later
    this.collections.value = reorderOperation.right

    return Promise.resolve(E.right(undefined))
  }

  reorderRESTRequest(
    requestHandle: Handle<WorkspaceRequest>,
    destinationCollectionID: string,
    destinationRequestID: string | null
  ): Promise<E.Either<unknown, void>> {
    const requestHandleRef = requestHandle.get()

    if (!isValidRequestHandle(requestHandleRef, this.providerID)) {
      return Promise.resolve(E.left("INVALID_REQUEST_HANDLE" as const))
    }

    const request = this.requests.value.find(
      (request) => request.requestID === requestHandleRef.value.data.requestID
    )

    if (!request) {
      return Promise.resolve(E.left("REQUEST_DOES_NOT_EXIST" as const))
    }

    const nextRequest = this.requests.value.find(
      (request) => request.requestID === destinationRequestID
    )

    const reorderOperation = reorderItemsWithoutChangingParent(
      request.requestID,
      nextRequest?.requestID ?? null,
      this.orderedRequests.value,
      "requestID",
      "collectionID"
    )

    if (E.isLeft(reorderOperation)) {
      return Promise.resolve(reorderOperation)
    }

    this.requests.value = reorderOperation.right

    return Promise.resolve(E.right(undefined))
  }

  // this might be temporary, might move this to decor
  async getWorkspaceHandle(
    workspaceID: string
  ): Promise<E.Either<unknown, Handle<Workspace>>> {
    return Promise.resolve(
      E.right({
        get: lazy(() => {
          return computed(() => {
            const workspace = this.workspaces.value.find(
              (workspace) => workspace.workspaceID === workspaceID
            )

            if (!workspace) {
              return {
                type: "invalid" as const,
                reason: "WORKSPACE_DOES_NOT_EXIST",
              }
            }

            return {
              data: workspace,
              type: "ok" as const,
            }
          })
        }),
      })
    )
  }

  private async setupTeamsCollectionAddedSubscription(workspaceID: string) {
    const [teamCollAdded$, teamCollAddedSub] =
      runTeamCollectionAddedSubscription(workspaceID)

    this.subscriptions.push(teamCollAddedSub)

    teamCollAdded$.subscribe((result) => {
      console.log(result)
      if (E.isLeft(result)) {
        console.error(result.left)
        return
      }

      const parentCollectionID = result.right.teamCollectionAdded.parent?.id

      const siblingCollections = this.collections.value.filter(
        (collection) => collection.parentCollectionID === parentCollectionID
      )
      const lastChild = siblingCollections.at(-1)
      const order = generateKeyBetween(lastChild?.order, null)

      const collection: WorkspaceCollection & {
        parentCollectionID?: string
        order: string
      } = {
        name: result.right.teamCollectionAdded.title,
        collectionID: result.right.teamCollectionAdded.id,
        providerID: this.providerID,
        workspaceID: workspaceID,
        parentCollectionID: result.right.teamCollectionAdded.parent?.id,
        order,
      }

      this.collections.value.push(collection)
    })
  }

  private async setupTeamsCollectionUpdatedSubscription(workspaceID: string) {
    const [teamCollUpdated$, teamCollUpdatedSub] =
      runTeamCollectionUpdatedSubscription(workspaceID)

    this.subscriptions.push(teamCollUpdatedSub)

    teamCollUpdated$.subscribe((result) => {
      if (E.isLeft(result)) {
        console.error(result.left)
        return
      }

      console.group("Team Collection Updated")
      console.log(result)
      console.groupEnd()

      this.collections.value = this.collections.value.map((collection) => {
        if (collection.collectionID === result.right.teamCollectionUpdated.id) {
          return {
            ...collection,
            name: result.right.teamCollectionUpdated.title,
            // TODO: add result.right.teamCollectinUpdated.data
          }
        }

        return collection
      })
    })
  }

  private async setupTeamsCollectionRemovedSubscription(workspaceID: string) {
    const [teamCollRemoved$, teamCollRemovedSub] =
      runTeamCollectionRemovedSubscription(workspaceID)

    this.subscriptions.push(teamCollRemovedSub)

    teamCollRemoved$.subscribe((result) => {
      if (E.isLeft(result)) {
        console.error(result.left)
        return
      }

      console.group("Team Collection Removed")
      console.log(result)
      console.groupEnd()

      this.collections.value = this.collections.value.filter(
        (collection) =>
          collection.collectionID !== result.right.teamCollectionRemoved
      )
    })
  }

  private async setupTeamsCollectionMovedSubscription(workspaceID: string) {
    const [teamCollMoved$, teamCollMovedSub] =
      runTeamCollectionMovedSubscription(workspaceID)

    this.subscriptions.push(teamCollMovedSub)

    teamCollMoved$.subscribe((result) => {
      if (E.isLeft(result)) {
        console.error(result.left)
        return
      }

      const siblingCollections = this.collections.value.filter(
        (collection) =>
          collection.parentCollectionID ===
          result.right.teamCollectionMoved.parent?.id
      )

      const lastChild = siblingCollections.at(-1)

      const order = generateKeyBetween(lastChild?.order, null)

      this.collections.value = this.collections.value.map((collection) => {
        if (collection.collectionID === result.right.teamCollectionMoved.id) {
          return {
            ...collection,
            parentCollectionID: result.right.teamCollectionMoved.parent?.id,
            order,
          }
        }

        return collection
      })
    })
  }

  private async setupTeamsRequestAddedSubscription(workspaceID: string) {
    const [teamRequestAdded$, teamRequestAddedSub] =
      runTeamRequestAddedSubscription(workspaceID)

    this.subscriptions.push(teamRequestAddedSub)

    teamRequestAdded$.subscribe((result) => {
      if (E.isLeft(result)) {
        console.error(result.left)
        return
      }

      console.group("Team Request Added")
      console.log(result)
      console.groupEnd()

      const siblingRequests = this.requests.value.filter(
        (request) =>
          request.collectionID === result.right.teamRequestAdded.collectionID
      )

      const lastSibling = siblingRequests.at(-1)

      const order = generateKeyBetween(lastSibling?.order, null)

      const request: WorkspaceRequest & {
        order: string
      } = {
        requestID: result.right.teamRequestAdded.id,
        providerID: this.providerID,
        workspaceID: workspaceID,
        collectionID: result.right.teamRequestAdded.collectionID,
        request: JSON.parse(result.right.teamRequestAdded.request),
        order,
      }

      this.requests.value.push(request)
    })
  }

  private async setupTeamsRequestUpdatedSubscription(workspaceID: string) {
    const [teamRequestUpdated$, teamRequestUpdatedSub] =
      runTeamRequestUpdatedSubscription(workspaceID)

    this.subscriptions.push(teamRequestUpdatedSub)

    teamRequestUpdated$.subscribe((result) => {
      if (E.isLeft(result)) {
        console.error(result.left)
        return
      }

      console.group("Team Request Updated")
      console.log(result)
      console.groupEnd()

      const updatedRequest: WorkspaceRequest = {
        collectionID: result.right.teamRequestUpdated.collectionID,
        providerID: this.providerID,
        requestID: result.right.teamRequestUpdated.id,
        workspaceID: workspaceID,
        request: JSON.parse(result.right.teamRequestUpdated.request),
      }

      this.requests.value = this.requests.value.map((request) => {
        if (request.requestID === result.right.teamRequestUpdated.id) {
          return {
            ...request,
            ...updatedRequest,
          }
        }

        return request
      })
    })
  }

  private async setupTeamsRequestRemovedSubscription(workspaceID: string) {
    const [teamRequestRemoved$, teamRequestRemovedSub] =
      runTeamRequestRemovedSubscription(workspaceID)

    this.subscriptions.push(teamRequestRemovedSub)

    teamRequestRemoved$.subscribe((result) => {
      if (E.isLeft(result)) {
        console.error(result.left)
        return
      }

      console.group("Team Request Removed")
      console.log(result)
      console.groupEnd()

      this.requests.value = this.requests.value.filter(
        (request) => request.requestID !== result.right.teamRequestDeleted
      )
    })
  }

  private async setupTeamsRequestMovedSubscription(workspaceID: string) {
    const [teamRequestMoved$, teamRequestMovedSub] =
      runTeamRequestMovedSubscription(workspaceID)

    this.subscriptions.push(teamRequestMovedSub)

    teamRequestMoved$.subscribe((result) => {
      if (E.isLeft(result)) {
        console.error(result.left)
        return
      }

      const siblingRequests = this.requests.value.filter(
        (request) =>
          request.collectionID === result.right.requestMoved.collectionID
      )

      const lastSibling = siblingRequests.at(-1)

      const order = generateKeyBetween(lastSibling?.order, null)

      this.requests.value = this.requests.value.map((request) => {
        if (request.requestID === result.right.requestMoved.id) {
          return {
            ...request,
            collectionID: result.right.requestMoved.collectionID,
            order,
          }
        }

        return request
      })
    })
  }

  private async setupTeamRequestOrderUpdatedSubscription(workspaceID: string) {
    const [teamRequestOrderUpdated$, teamRequestOrderUpdatedSub] =
      runTeamRequestOrderUpdatedSubscription(workspaceID)

    this.subscriptions.push(teamRequestOrderUpdatedSub)

    teamRequestOrderUpdated$.subscribe((result) => {
      if (E.isLeft(result)) {
        console.error(result.left)
        return
      }

      const { request, nextRequest } = result.right.requestOrderUpdated

      const reorderOperation = reorderItemsWithoutChangingParent(
        request.id,
        nextRequest?.id ?? null,
        this.orderedRequests.value,
        "requestID",
        "collectionID"
      )

      if (E.isLeft(reorderOperation)) {
        console.error(reorderOperation.left)
        return
      }

      this.requests.value = reorderOperation.right
    })
  }
}

const isValidWorkspaceHandle = (
  workspace: HandleRef<Workspace>,
  providerID: string
): workspace is Ref<{
  data: Workspace
  type: "ok"
}> => {
  return (
    workspace.value.type === "ok" &&
    workspace.value.data.providerID === providerID
  )
}

const isValidCollectionHandle = (
  collection: HandleRef<WorkspaceCollection>,
  providerID: string
): collection is Ref<{
  data: WorkspaceCollection
  type: "ok"
}> => {
  return (
    collection.value.type === "ok" &&
    collection.value.data.providerID === providerID
  )
}

const isValidRequestHandle = (
  request: HandleRef<WorkspaceRequest>,
  providerID: string
): request is Ref<{
  data: WorkspaceRequest
  type: "ok"
}> => {
  return (
    request.value.type === "ok" && request.value.data.providerID === providerID
  )
}

const fetchRootCollections = async (teamID: string, cursor?: string) => {
  const result = await runGQLQuery({
    query: RootCollectionsOfTeamDocument,
    variables: {
      teamID,
      cursor,
    },
  })

  return result
}

const runTeamCollectionAddedSubscription = (teamID: string) =>
  runGQLSubscription({
    query: TeamCollectionAddedDocument,
    variables: {
      teamID: teamID,
    },
  })

const runTeamCollectionUpdatedSubscription = (teamID: string) =>
  runGQLSubscription({
    query: TeamCollectionUpdatedDocument,
    variables: {
      teamID,
    },
  })

const runTeamCollectionRemovedSubscription = (teamID: string) =>
  runGQLSubscription({
    query: TeamCollectionRemovedDocument,
    variables: {
      teamID,
    },
  })

const runTeamCollectionMovedSubscription = (teamID: string) =>
  runGQLSubscription({
    query: TeamCollectionMovedDocument,
    variables: {
      teamID,
    },
  })

const runTeamRequestAddedSubscription = (teamID: string) =>
  runGQLSubscription({
    query: TeamRequestAddedDocument,
    variables: {
      teamID,
    },
  })

const runTeamRequestUpdatedSubscription = (teamID: string) =>
  runGQLSubscription({
    query: TeamRequestUpdatedDocument,
    variables: {
      teamID,
    },
  })

const runTeamRequestRemovedSubscription = (teamID: string) =>
  runGQLSubscription({
    query: TeamRequestDeletedDocument,
    variables: {
      teamID,
    },
  })

const runTeamRequestMovedSubscription = (teamID: string) =>
  runGQLSubscription({
    query: TeamRequestMovedDocument,
    variables: {
      teamID,
    },
  })

const runTeamRequestOrderUpdatedSubscription = (teamID: string) =>
  runGQLSubscription({
    query: TeamRequestOrderUpdatedDocument,
    variables: {
      teamID,
    },
  })

const importJSONToTeam = (collectionJSON: string, teamID: string) =>
  runMutation<ImportFromJsonMutation, ImportFromJsonMutationVariables, "">(
    ImportFromJsonDocument,
    {
      jsonString: collectionJSON,
      teamID,
    }
  )

window.TeamsWorkspaceProviderService = TeamsWorkspaceProviderService

// createWorkspace + selectWorkspace situation
// cache the children of a collection
// cursors
// setup subscriptions for the change
// take care of last item when returning the children

// another drawback of the approch we're taking
// not keeping one way for the source of truth -> i could update a collection & return a handle that does not exist
// also every place we're issuing a collection/request handle, we need to test if its proper and works as expected when it comes to reactivity

const testProvider = async () => {
  const provider = new TeamsWorkspaceProviderService()

  window.testProvider = provider

  const workspace = await provider.createWorkspace("Teams Workspace 1")

  if (E.isLeft(workspace)) {
    return
  }

  const res = await provider.selectWorkspace(workspace.right)

  if (E.isLeft(res)) {
    console.log("Workspace Selection Failed")
    return
  }

  if (workspace.right.value.type === "invalid") {
    return
  }

  const workspaceID = workspace.right.value.data.workspaceID

  const teamCollection = await provider.createRESTRootCollection(
    workspace.right,
    {
      name: "Team Collection 1",
    }
  )

  if (E.isLeft(teamCollection)) {
    return
  }

  if (!isValidCollectionHandle(teamCollection.right, provider.providerID)) {
    console.log("Invalid Collection Handle")
    return
  }

  const childCollection = await provider.createRESTChildCollection(
    teamCollection.right,
    {
      name: "Team Child Collection 1",
    }
  )

  if (E.isLeft(childCollection)) {
    return
  }

  if (!isValidCollectionHandle(childCollection.right, provider.providerID)) {
    console.log("Invalid Collection Handle")
    return
  }

  window.currentProvider = provider
}

window.testProvider = testProvider

const reorderItemsWithoutChangingParent = <
  ParentIDKey extends keyof Reorderable,
  IDKey extends keyof Reorderable,
  Reorderable extends { order: string } & {
    [key in ParentIDKey]: string | null
  } & {
    [key in IDKey]: string
  },
>(
  sourceItemID: string,
  destinationItemID: string | null,
  items: Reorderable[],
  idKey: IDKey,
  parentIDKey: ParentIDKey
) => {
  const sourceItem = items.find((item) => item[idKey] === sourceItemID)

  if (!sourceItem) {
    return E.left("SOURCE_ITEM_NOT_FOUND_WHILE_REORDERING")
  }

  let destinationItem: Reorderable | undefined
  let destinationOrder: string | null = null

  if (destinationItemID) {
    destinationItem = items.find((item) => item[idKey] === destinationItemID)

    if (!destinationItem) {
      return E.left("DESTINATION_ITEM_NOT_FOUND_WHILE_REORDERING")
    }

    destinationOrder = destinationItem.order
  }

  const siblingItems = items.filter(
    (item) => item[parentIDKey] === sourceItem[parentIDKey]
  )

  const previousItem = (() => {
    // if the destination order is null, we're moving the collection to the end of the list
    if (destinationOrder === null) {
      return E.right(siblingItems.at(-1))
    }

    const destinationCollection = siblingItems.find(
      (collection) => collection[idKey] === destinationItemID
    )

    if (!destinationCollection) {
      return E.left("DESTINATION_ITEM_NOT_FOUND")
    }

    return E.right(destinationCollection)
  })()

  if (E.isLeft(previousItem)) {
    return previousItem
  }

  const newOrder = generateKeyBetween(
    previousItem.right?.order ?? null,
    destinationItem?.order ?? null
  )

  return E.right(
    items.map((item) =>
      item[idKey] === sourceItemID
        ? {
            ...item,
            order: newOrder,
          }
        : item
    )
  )
}

const sortByOrder = <OrderedItem extends { order: string }>(
  items: OrderedItem[]
) => {
  return items.sort((item1, item2) => {
    if (item1.order < item2.order) {
      return -1
    }

    if (item1.order > item2.order) {
      return 1
    }

    return 0
  })
}

function buildTreeForSingleCollection(
  collection: TeamsWorkspaceCollection,
  collections: TeamsWorkspaceCollection[],
  requests: TeamsWorkspaceRequest[]
): HoppCollection {
  const childCollections = collections.filter(
    (childCollection) =>
      childCollection.parentCollectionID === collection.collectionID
  )

  const childRequests = requests.filter(
    (request) => request.collectionID === collection.collectionID
  )

  return {
    v: 2,
    ...collection,
    folders: childCollections.map((childCollection) =>
      buildTreeForSingleCollection(childCollection, collections, requests)
    ),
    requests: childRequests.map((request) => request.request),
  }
}

function translateToTeamCollectionFormat(collection: HoppCollection) {
  const folders: HoppCollection[] = (collection.folders ?? []).map(
    translateToTeamCollectionFormat
  )

  const data = {
    auth: collection.auth,
    headers: collection.headers,
  }

  const teamCollectionObj = {
    ...collection,
    folders,
    data,
  }

  if (collection.id) teamCollectionObj.id = collection.id

  return teamCollectionObj
}

// converts the flat collections structure to the HoppCollection tree format
function makeCollectionTree(
  collections: TeamsWorkspaceCollection[],
  requests: TeamsWorkspaceRequest[]
) {
  const collectionsTree: HoppCollection[] = []
  const collectionsMap = new Map<
    string,
    HoppCollection & { parentCollectionID?: string; id: string; order: string }
  >()

  // build a copy of the collections array with empty folders & requests
  // so we don't mutate the original argument array
  const hoppCollections = collections.map(
    (
      collection
    ): HoppCollection & {
      parentCollectionID?: string
      id: string
      order: string
    } => ({
      parentCollectionID: collection.parentCollectionID,
      order: collection.order,
      id: collection.collectionID,
      name: collection.name,
      auth: collection.auth,
      headers: collection.headers,
      // we'll populate the child collections and child requests in the next steps
      folders: [],
      requests: [],
      v: 2,
    })
  )

  const uniqueParentCollectionIDs = new Set<string>()

  hoppCollections.forEach((collection) => {
    if (collection.parentCollectionID) {
      uniqueParentCollectionIDs.add(collection.parentCollectionID)
    } else {
      collectionsTree.push(collection)
      uniqueParentCollectionIDs.add(collection.id)
    }

    collectionsMap.set(collection.id, collection)
  })

  const collectionsMapArray = Array.from(collectionsMap)

  uniqueParentCollectionIDs.forEach((parentCollectionID) => {
    const childCollections = collectionsMapArray
      .filter(([, collection]) => {
        return collection.parentCollectionID === parentCollectionID
      })
      .map(([, collection]) => collection)
      .sort((a, b) => a.order.localeCompare(b.order))

    const childRequests = requests
      .filter((request) => request.collectionID === parentCollectionID)
      .sort((a, b) => a.order.localeCompare(b.order))

    const parentCollection = collectionsMap.get(parentCollectionID)
    parentCollection?.folders.push(...childCollections)
    parentCollection?.requests.push(
      ...childRequests.map((request): HoppRESTRequest => request.request)
    )
  })

  return collectionsTree
}

// TODO
// where to put the getChildren api call
// cursor + pagination stuff
// decor stuff
// inherited auth + headers stuff

// you're working on the TeamsWorkspaceSelector.vue
// implementing the displaying of workspaces
// right now, workspaceService.getWorkspaces is stuck in the loading state
// you're debugging this issue
