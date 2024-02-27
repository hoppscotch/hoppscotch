import {
  HoppCollection,
  HoppGQLAuth,
  HoppRESTAuth,
  HoppRESTHeaders,
  makeCollection,
} from "@hoppscotch/data"
import { Service } from "dioc"
import * as E from "fp-ts/Either"
import {
  Ref,
  computed,
  effectScope,
  markRaw,
  ref,
  shallowRef,
  watch,
} from "vue"

import PersonalWorkspaceSelector from "~/components/workspace/PersonalWorkspaceSelector.vue"
import { useStreamStatic } from "~/composables/stream"

import {
  addRESTCollection,
  addRESTFolder,
  appendRESTCollections,
  editRESTCollection,
  editRESTFolder,
  editRESTRequest,
  moveRESTFolder,
  moveRESTRequest,
  navigateToFolderWithIndexPath,
  removeRESTCollection,
  removeRESTFolder,
  removeRESTRequest,
  restCollectionStore,
  saveRESTRequestAs,
  updateRESTCollectionOrder,
  updateRESTRequestOrder,
} from "~/newstore/collections"
import { platform } from "~/platform"

import { HandleRef } from "~/services/new-workspace/handle"
import { WorkspaceProvider } from "~/services/new-workspace/provider"
import {
  RESTCollectionChildrenView,
  RESTCollectionLevelAuthHeadersView,
  RESTCollectionViewItem,
  RESTSearchResultsView,
  RootRESTCollectionView,
} from "~/services/new-workspace/view"
import {
  Workspace,
  WorkspaceCollection,
  WorkspaceDecor,
  WorkspaceRequest,
} from "~/services/new-workspace/workspace"

import { HoppRESTRequest } from "@hoppscotch/data"
import { merge } from "lodash-es"
import path from "path"
import { HoppGQLHeader } from "~/helpers/graphql"
import { initializeDownloadFile } from "~/helpers/import-export/export"
import { HoppInheritedProperty } from "~/helpers/types/HoppInheritedProperties"
import IconUser from "~icons/lucide/user"
import { NewWorkspaceService } from ".."

export class PersonalWorkspaceProviderService
  extends Service
  implements WorkspaceProvider
{
  public static readonly ID = "PERSONAL_WORKSPACE_PROVIDER_SERVICE"

  public readonly providerID = "PERSONAL_WORKSPACE_PROVIDER"

  private workspaceService = this.bind(NewWorkspaceService)

  public workspaceDecor: Ref<WorkspaceDecor> = ref({
    headerCurrentIcon: IconUser,
    workspaceSelectorComponent: PersonalWorkspaceSelector,
    workspaceSelectorPriority: 100,
  })

  private restCollectionState: Ref<{ state: HoppCollection[] }>

  public constructor() {
    super()

    this.restCollectionState = useStreamStatic(
      restCollectionStore.subject$,
      { state: [] },
      () => {
        /* noop */
      }
    )[0]

    this.workspaceService.registerWorkspaceProvider(this)
  }

  /**
   * Used to get the index of the request from the path
   * @param path The path of the request
   * @returns The index of the request
   */
  private pathToLastIndex(path: string) {
    const pathArr = path.split("/")
    return parseInt(pathArr[pathArr.length - 1])
  }

  public createRESTRootCollection(
    workspaceHandle: HandleRef<Workspace>,
    newCollection: Partial<HoppCollection>
  ): Promise<E.Either<unknown, HandleRef<WorkspaceCollection>>> {
    if (
      workspaceHandle.value.type !== "ok" ||
      workspaceHandle.value.data.providerID !== this.providerID ||
      workspaceHandle.value.data.workspaceID !== "personal"
    ) {
      return Promise.resolve(E.left("INVALID_WORKSPACE_HANDLE" as const))
    }

    const newCollectionName = newCollection.name as string
    const newCollectionID =
      this.restCollectionState.value.state.length.toString()

    const newRootCollection = makeCollection({
      name: newCollectionName,
      folders: [],
      requests: [],
      headers: [],
      auth: {
        authType: "inherit",
        authActive: false,
      },
    })
    addRESTCollection(newRootCollection)

    platform.analytics?.logEvent({
      type: "HOPP_CREATE_COLLECTION",
      platform: "rest",
      workspaceType: "personal",
      isRootCollection: true,
    })

    return Promise.resolve(
      E.right(
        computed(() => {
          if (
            workspaceHandle.value.type !== "ok" ||
            workspaceHandle.value.data.providerID !== this.providerID ||
            workspaceHandle.value.data.workspaceID !== "personal"
          ) {
            return {
              type: "invalid" as const,
              reason: "WORKSPACE_INVALIDATED" as const,
            }
          }

          return {
            type: "ok",
            data: {
              providerID: this.providerID,
              workspaceID: workspaceHandle.value.data.workspaceID,
              collectionID: newCollectionID,
              name: newCollectionName,
            },
          }
        })
      )
    )
  }

  public createRESTChildCollection(
    parentCollectionHandle: HandleRef<WorkspaceCollection>,
    newChildCollection: Partial<HoppCollection>
  ): Promise<E.Either<unknown, HandleRef<WorkspaceCollection>>> {
    if (
      parentCollectionHandle.value.type !== "ok" ||
      parentCollectionHandle.value.data.providerID !== this.providerID ||
      parentCollectionHandle.value.data.workspaceID !== "personal"
    ) {
      return Promise.resolve(E.left("INVALID_COLLECTION_HANDLE" as const))
    }

    const { collectionID, providerID, workspaceID } =
      parentCollectionHandle.value.data

    const newCollectionName = newChildCollection.name as string
    addRESTFolder(newCollectionName, collectionID)

    platform.analytics?.logEvent({
      type: "HOPP_CREATE_COLLECTION",
      workspaceType: "personal",
      isRootCollection: false,
      platform: "rest",
    })

    return Promise.resolve(
      E.right(
        computed(() => {
          if (
            parentCollectionHandle.value.type !== "ok" ||
            parentCollectionHandle.value.data.providerID !== this.providerID ||
            parentCollectionHandle.value.data.workspaceID !== "personal"
          ) {
            return {
              type: "invalid" as const,
              reason: "COLLECTION_INVALIDATED" as const,
            }
          }

          return {
            type: "ok",
            data: {
              providerID,
              workspaceID,
              collectionID,
              name: newCollectionName,
            },
          }
        })
      )
    )
  }

  public updateRESTCollection(
    collectionHandle: HandleRef<WorkspaceCollection>,
    updatedCollection: Partial<HoppCollection>
  ): Promise<E.Either<unknown, void>> {
    if (
      collectionHandle.value.type !== "ok" ||
      collectionHandle.value.data.providerID !== this.providerID ||
      collectionHandle.value.data.workspaceID !== "personal"
    ) {
      return Promise.resolve(E.left("INVALID_COLLECTION_HANDLE" as const))
    }

    const { collectionID } = collectionHandle.value.data

    const collection = navigateToFolderWithIndexPath(
      this.restCollectionState.value.state,
      collectionID.split("/").map((id) => parseInt(id))
    )

    const newCollection = { ...collection, ...updatedCollection }

    const isRootCollection = collectionID.split("/").length === 1

    if (isRootCollection) {
      editRESTCollection(parseInt(collectionID), newCollection)
    } else {
      editRESTFolder(collectionID, newCollection)
    }

    return Promise.resolve(E.right(undefined))
  }

  public removeRESTCollection(
    collectionHandle: HandleRef<WorkspaceCollection>
  ): Promise<E.Either<unknown, void>> {
    if (
      collectionHandle.value.type !== "ok" ||
      collectionHandle.value.data.providerID !== this.providerID ||
      collectionHandle.value.data.workspaceID !== "personal"
    ) {
      return Promise.resolve(E.left("INVALID_COLLECTION_HANDLE" as const))
    }

    const { collectionID } = collectionHandle.value.data

    const isRootCollection = collectionID.split("/").length === 1

    if (isRootCollection) {
      const collectionIndex = parseInt(collectionID)

      const collectionToRemove = navigateToFolderWithIndexPath(
        restCollectionStore.value.state,
        [collectionIndex]
      )

      removeRESTCollection(
        collectionIndex,
        collectionToRemove ? collectionToRemove.id : undefined
      )
    } else {
      const folderToRemove = path
        ? navigateToFolderWithIndexPath(
            restCollectionStore.value.state,
            collectionID.split("/").map((id) => parseInt(id))
          )
        : undefined

      removeRESTFolder(
        collectionID,
        folderToRemove ? folderToRemove.id : undefined
      )
    }

    return Promise.resolve(E.right(undefined))
  }

  public createRESTRequest(
    parentCollectionHandle: HandleRef<WorkspaceCollection>,
    newRequest: HoppRESTRequest
  ): Promise<E.Either<unknown, HandleRef<WorkspaceRequest>>> {
    if (
      parentCollectionHandle.value.type !== "ok" ||
      parentCollectionHandle.value.data.providerID !== this.providerID ||
      parentCollectionHandle.value.data.workspaceID !== "personal"
    ) {
      return Promise.resolve(E.left("INVALID_COLLECTION_HANDLE" as const))
    }

    const { collectionID, providerID, workspaceID } =
      parentCollectionHandle.value.data

    const insertionIndex = saveRESTRequestAs(collectionID, newRequest)

    const requestID = `${collectionID}/${insertionIndex}`

    platform.analytics?.logEvent({
      type: "HOPP_SAVE_REQUEST",
      workspaceType: "personal",
      createdNow: true,
      platform: "rest",
    })

    return Promise.resolve(
      E.right(
        computed(() => {
          if (
            parentCollectionHandle.value.type !== "ok" ||
            parentCollectionHandle.value.data.providerID !== this.providerID ||
            parentCollectionHandle.value.data.workspaceID !== "personal"
          ) {
            return {
              type: "invalid" as const,
              reason: "COLLECTION_INVALIDATED" as const,
            }
          }

          return {
            type: "ok",
            data: {
              providerID,
              workspaceID,
              collectionID,
              requestID,
              request: newRequest,
            },
          }
        })
      )
    )
  }

  public removeRESTRequest(
    requestHandle: HandleRef<WorkspaceRequest>
  ): Promise<E.Either<unknown, void>> {
    if (
      requestHandle.value.type !== "ok" ||
      requestHandle.value.data.providerID !== this.providerID ||
      requestHandle.value.data.workspaceID !== "personal"
    ) {
      return Promise.resolve(E.left("INVALID_REQUEST_HANDLE" as const))
    }

    const { collectionID, requestID } = requestHandle.value.data
    const requestIndex = parseInt(requestID.split("/").slice(-1)[0])

    const requestToRemove = navigateToFolderWithIndexPath(
      restCollectionStore.value.state,
      collectionID.split("/").map((id) => parseInt(id))
    )?.requests[requestIndex]

    removeRESTRequest(collectionID, requestIndex, requestToRemove?.id)

    return Promise.resolve(E.right(undefined))
  }

  public updateRESTRequest(
    requestHandle: HandleRef<WorkspaceRequest>,
    updatedRequest: Partial<HoppRESTRequest>
  ): Promise<E.Either<unknown, void>> {
    if (
      requestHandle.value.type !== "ok" ||
      requestHandle.value.data.providerID !== this.providerID ||
      requestHandle.value.data.workspaceID !== "personal"
    ) {
      return Promise.resolve(E.left("INVALID_REQUEST_HANDLE" as const))
    }

    delete updatedRequest.id

    const { collectionID, requestID, request } = requestHandle.value.data

    const newRequest: HoppRESTRequest = merge(request, updatedRequest)
    const requestIndex = parseInt(requestID.split("/").slice(-1)[0])
    editRESTRequest(collectionID, requestIndex, newRequest)

    platform.analytics?.logEvent({
      type: "HOPP_SAVE_REQUEST",
      platform: "rest",
      createdNow: false,
      workspaceType: "personal",
    })

    return Promise.resolve(E.right(undefined))
  }

  public importRESTCollections(
    workspaceHandle: HandleRef<Workspace>,
    collections: HoppCollection[]
  ): Promise<E.Either<unknown, HandleRef<WorkspaceCollection>>> {
    if (
      workspaceHandle.value.type !== "ok" ||
      workspaceHandle.value.data.providerID !== this.providerID ||
      workspaceHandle.value.data.workspaceID !== "personal"
    ) {
      return Promise.resolve(E.left("INVALID_WORKSPACE_HANDLE" as const))
    }

    appendRESTCollections(collections)

    const newCollectionName = collections[0].name
    const newCollectionID =
      this.restCollectionState.value.state.length.toString()

    return Promise.resolve(
      E.right(
        computed(() => {
          if (
            workspaceHandle.value.type !== "ok" ||
            workspaceHandle.value.data.providerID !== this.providerID ||
            workspaceHandle.value.data.workspaceID !== "personal"
          ) {
            return {
              type: "invalid" as const,
              reason: "WORKSPACE_INVALIDATED" as const,
            }
          }

          return {
            type: "ok",
            data: {
              providerID: this.providerID,
              workspaceID: workspaceHandle.value.data.workspaceID,
              collectionID: newCollectionID,
              name: newCollectionName,
            },
          }
        })
      )
    )
  }

  public exportRESTCollections(
    workspaceHandle: HandleRef<WorkspaceCollection>,
    collections: HoppCollection[]
  ): Promise<E.Either<unknown, void>> {
    if (
      workspaceHandle.value.type !== "ok" ||
      workspaceHandle.value.data.providerID !== this.providerID ||
      workspaceHandle.value.data.workspaceID !== "personal"
    ) {
      return Promise.resolve(E.left("INVALID_COLLECTION_HANDLE" as const))
    }

    initializeDownloadFile(JSON.stringify(collections, null, 2), "Collections")

    return Promise.resolve(E.right(undefined))
  }

  public exportRESTCollection(
    collectionHandle: HandleRef<WorkspaceCollection>,
    collection: HoppCollection
  ): Promise<E.Either<unknown, void>> {
    if (
      collectionHandle.value.type !== "ok" ||
      collectionHandle.value.data.providerID !== this.providerID ||
      collectionHandle.value.data.workspaceID !== "personal"
    ) {
      return Promise.resolve(E.left("INVALID_COLLECTION_HANDLE" as const))
    }

    initializeDownloadFile(JSON.stringify(collection, null, 2), collection.name)

    return Promise.resolve(E.right(undefined))
  }

  public reorderRESTCollection(
    collectionHandle: HandleRef<WorkspaceCollection>,
    destinationCollectionID: string | null
  ): Promise<E.Either<unknown, void>> {
    if (
      collectionHandle.value.type !== "ok" ||
      collectionHandle.value.data.providerID !== this.providerID ||
      collectionHandle.value.data.workspaceID !== "personal"
    ) {
      return Promise.resolve(E.left("INVALID_COLLECTION_HANDLE" as const))
    }

    const draggedCollectionIndex = collectionHandle.value.data.collectionID

    updateRESTCollectionOrder(draggedCollectionIndex, destinationCollectionID)

    return Promise.resolve(E.right(undefined))
  }

  public moveRESTCollection(
    collectionHandle: HandleRef<WorkspaceCollection>,
    destinationCollectionID: string | null
  ): Promise<E.Either<unknown, void>> {
    if (
      collectionHandle.value.type !== "ok" ||
      collectionHandle.value.data.providerID !== this.providerID ||
      collectionHandle.value.data.workspaceID !== "personal"
    ) {
      return Promise.resolve(E.left("INVALID_COLLECTION_HANDLE" as const))
    }

    moveRESTFolder(
      collectionHandle.value.data.collectionID,
      destinationCollectionID
    )

    return Promise.resolve(E.right(undefined))
  }

  public reorderRESTRequest(
    requestHandle: HandleRef<WorkspaceRequest>,
    destinationCollectionID: string,
    destinationRequestID: string | null
  ): Promise<E.Either<unknown, void>> {
    if (
      requestHandle.value.type !== "ok" ||
      requestHandle.value.data.providerID !== this.providerID ||
      requestHandle.value.data.workspaceID !== "personal"
    ) {
      return Promise.resolve(E.left("INVALID_REQUEST_HANDLE" as const))
    }

    const draggedRequestIndex = requestHandle.value.data.requestID

    updateRESTRequestOrder(
      this.pathToLastIndex(draggedRequestIndex),
      destinationRequestID ? this.pathToLastIndex(destinationRequestID) : null,
      destinationCollectionID
    )

    return Promise.resolve(E.right(undefined))
  }

  public moveRESTRequest(
    requestHandle: HandleRef<WorkspaceRequest>,
    destinationCollectionID: string
  ): Promise<E.Either<unknown, void>> {
    if (
      requestHandle.value.type !== "ok" ||
      requestHandle.value.data.providerID !== this.providerID ||
      requestHandle.value.data.workspaceID !== "personal"
    ) {
      return Promise.resolve(E.left("INVALID_REQUEST_HANDLE" as const))
    }

    const requestIndex = requestHandle.value.data.requestID
    const parentCollectionIndexPath = requestIndex
      .split("/")
      .slice(0, -1)
      .join("/")

    moveRESTRequest(
      parentCollectionIndexPath,
      this.pathToLastIndex(requestIndex),
      destinationCollectionID
    )

    return Promise.resolve(E.right(undefined))
  }

  public getCollectionHandle(
    workspaceHandle: HandleRef<Workspace>,
    collectionID: string
  ): Promise<E.Either<unknown, HandleRef<WorkspaceCollection>>> {
    if (
      workspaceHandle.value.type !== "ok" ||
      workspaceHandle.value.data.providerID !== this.providerID ||
      workspaceHandle.value.data.workspaceID !== "personal"
    ) {
      return Promise.resolve(E.left("INVALID_WORKSPACE_HANDLE" as const))
    }

    if (!collectionID) {
      return Promise.resolve(E.left("INVALID_COLLECTION_ID" as const))
    }

    const collection = navigateToFolderWithIndexPath(
      this.restCollectionState.value.state,
      collectionID.split("/").map((x) => parseInt(x))
    )

    if (!collection) {
      const parentCollectionIndexPath = collectionID
        .split("/")
        .slice(0, -1)
        .join("/")
      const requestIndex = this.pathToLastIndex(collectionID)

      const parentCollection = navigateToFolderWithIndexPath(
        this.restCollectionState.value.state,
        parentCollectionIndexPath.split("/").map((x) => parseInt(x))
      )

      if (!parentCollection || !parentCollection.requests[requestIndex]) {
        return Promise.resolve(E.left("INVALID_PATH"))
      }
    }

    const { providerID, workspaceID } = workspaceHandle.value.data

    return Promise.resolve(
      E.right(
        computed(() => {
          if (
            workspaceHandle.value.type !== "ok" ||
            workspaceHandle.value.data.providerID !== this.providerID ||
            workspaceHandle.value.data.workspaceID !== "personal"
          ) {
            return {
              type: "invalid" as const,
              reason: "WORKSPACE_INVALIDATED" as const,
            }
          }

          return {
            type: "ok",
            data: {
              providerID,
              workspaceID,
              collectionID,
              name: collection?.name ?? "",
            },
          }
        })
      )
    )
  }

  public getRequestHandle(
    workspaceHandle: HandleRef<Workspace>,
    requestID: string
  ): Promise<E.Either<unknown, HandleRef<WorkspaceRequest>>> {
    if (
      workspaceHandle.value.type !== "ok" ||
      workspaceHandle.value.data.providerID !== this.providerID ||
      workspaceHandle.value.data.workspaceID !== "personal"
    ) {
      return Promise.resolve(E.left("INVALID_COLLECTION_HANDLE" as const))
    }

    if (!requestID) {
      return Promise.resolve(E.left("INVALID_REQUEST_ID" as const))
    }

    const { providerID, workspaceID } = workspaceHandle.value.data

    const collectionID = requestID.split("/").slice(0, -1).join("/")
    const requestIndexPath = requestID.split("/").slice(-1)[0]

    if (!requestIndexPath) {
      return Promise.resolve(E.left("INVALID_REQUEST_ID" as const))
    }

    const requestIndex = parseInt(requestIndexPath)

    // Navigate to the collection containing the request
    const collection = navigateToFolderWithIndexPath(
      this.restCollectionState.value.state,
      collectionID.split("/").map((x) => parseInt(x))
    )

    // Grab the request with it's index
    const request = collection?.requests[requestIndex] as HoppRESTRequest

    if (!request) {
      return Promise.resolve(E.left("REQUEST_NOT_FOUND" as const))
    }

    return Promise.resolve(
      E.right(
        computed(() => {
          if (
            workspaceHandle.value.type !== "ok" ||
            workspaceHandle.value.data.providerID !== this.providerID ||
            workspaceHandle.value.data.workspaceID !== "personal"
          ) {
            return {
              type: "invalid" as const,
              reason: "COLLECTION_INVALIDATED" as const,
            }
          }

          return {
            type: "ok",
            data: {
              providerID,
              workspaceID,
              collectionID,
              requestID,
              request,
            },
          }
        })
      )
    )
  }

  public getRESTCollectionChildrenView(
    collectionHandle: HandleRef<WorkspaceCollection>
  ): Promise<E.Either<never, HandleRef<RESTCollectionChildrenView>>> {
    return Promise.resolve(
      E.right(
        computed(() => {
          if (
            collectionHandle.value.type === "invalid" ||
            collectionHandle.value.data.providerID !== this.providerID ||
            collectionHandle.value.data.workspaceID !== "personal"
          ) {
            return {
              type: "invalid" as const,
              reason: "INVALID_COLLECTION_HANDLE" as const,
            }
          }

          const collectionID = collectionHandle.value.data.collectionID

          return markRaw({
            type: "ok" as const,
            data: {
              providerID: this.providerID,
              workspaceID: collectionHandle.value.data.workspaceID,
              collectionID: collectionHandle.value.data.collectionID,

              loading: ref(false),

              content: computed(() => {
                const indexPath = collectionID
                  .split("/")
                  .map((x) => parseInt(x))

                const item = navigateToFolderWithIndexPath(
                  this.restCollectionState.value.state,
                  indexPath
                )

                if (item) {
                  const collections = item.folders.map((childColl, id) => {
                    return <RESTCollectionViewItem>{
                      type: "collection",
                      value: {
                        collectionID: `${collectionID}/${id}`,
                        isLastItem:
                          item.folders?.length > 1
                            ? id === item.folders.length - 1
                            : false,
                        name: childColl.name,
                        parentCollectionID: collectionID,
                      },
                    }
                  })

                  const requests = item.requests.map((req, id) => {
                    // TODO: Replace `parentCollectionID` with `collectionID`
                    return <RESTCollectionViewItem>{
                      type: "request",
                      value: {
                        isLastItem:
                          item.requests?.length > 1
                            ? id === item.requests.length - 1
                            : false,
                        collectionID,
                        requestID: `${collectionID}/${id}`,
                        request: req,
                      },
                    }
                  })

                  return [...collections, ...requests]
                }
                return []
              }),
            },
          })
        })
      )
    )
  }

  public getRESTRootCollectionView(
    workspaceHandle: HandleRef<Workspace>
  ): Promise<E.Either<never, HandleRef<RootRESTCollectionView>>> {
    return Promise.resolve(
      E.right(
        computed(() => {
          if (
            workspaceHandle.value.type === "invalid" ||
            workspaceHandle.value.data.providerID !== this.providerID ||
            workspaceHandle.value.data.workspaceID !== "personal"
          ) {
            return {
              type: "invalid" as const,
              reason: "INVALID_WORKSPACE_HANDLE" as const,
            }
          }

          return markRaw({
            type: "ok" as const,
            data: {
              providerID: this.providerID,
              workspaceID: workspaceHandle.value.data.workspaceID,

              loading: ref(false),

              collections: computed(() => {
                return this.restCollectionState.value.state.map((coll, id) => {
                  return {
                    collectionID: id.toString(),
                    isLastItem:
                      id === this.restCollectionState.value.state.length - 1,
                    name: coll.name,
                    parentCollectionID: null,
                  }
                })
              }),
            },
          })
        })
      )
    )
  }

  public getRESTCollectionLevelAuthHeadersView(
    collectionHandle: HandleRef<WorkspaceCollection>
  ): Promise<E.Either<never, HandleRef<RESTCollectionLevelAuthHeadersView>>> {
    return Promise.resolve(
      E.right(
        computed(() => {
          if (
            collectionHandle.value.type === "invalid" ||
            collectionHandle.value.data.providerID !== this.providerID ||
            collectionHandle.value.data.workspaceID !== "personal"
          ) {
            return {
              type: "invalid" as const,
              reason: "INVALID_COLLECTION_HANDLE" as const,
            }
          }

          const { collectionID } = collectionHandle.value.data

          let auth: HoppInheritedProperty["auth"] = {
            parentID: collectionID ?? "",
            parentName: "",
            inheritedAuth: {
              authType: "none",
              authActive: true,
            },
          }
          const headers: HoppInheritedProperty["headers"] = []

          if (!collectionID) return { type: "ok", data: { auth, headers } }

          const path = collectionID.split("/").map((i) => parseInt(i))

          // Check if the path is empty or invalid
          if (!path || path.length === 0) {
            console.error("Invalid path:", collectionID)
            return { type: "ok", data: { auth, headers } }
          }

          // Loop through the path and get the last parent folder with authType other than 'inherit'
          for (let i = 0; i < path.length; i++) {
            const parentFolder = navigateToFolderWithIndexPath(
              this.restCollectionState.value.state,
              [...path.slice(0, i + 1)] // Create a copy of the path array
            )

            // Check if parentFolder is undefined or null
            if (!parentFolder) {
              console.error("Parent folder not found for path:", path)
              return { type: "ok", data: { auth, headers } }
            }

            const parentFolderAuth = parentFolder.auth as
              | HoppRESTAuth
              | HoppGQLAuth
            const parentFolderHeaders = parentFolder.headers as
              | HoppRESTHeaders
              | HoppGQLHeader[]

            // check if the parent folder has authType 'inherit' and if it is the root folder
            if (
              parentFolderAuth?.authType === "inherit" &&
              [...path.slice(0, i + 1)].length === 1
            ) {
              auth = {
                parentID: [...path.slice(0, i + 1)].join("/"),
                parentName: parentFolder.name,
                inheritedAuth: auth.inheritedAuth,
              }
            }

            if (parentFolderAuth?.authType !== "inherit") {
              auth = {
                parentID: [...path.slice(0, i + 1)].join("/"),
                parentName: parentFolder.name,
                inheritedAuth: parentFolderAuth,
              }
            }

            // Update headers, overwriting duplicates by key
            if (parentFolderHeaders) {
              const activeHeaders = parentFolderHeaders.filter((h) => h.active)
              activeHeaders.forEach((header) => {
                const index = headers.findIndex(
                  (h) => h.inheritedHeader?.key === header.key
                )
                const currentPath = [...path.slice(0, i + 1)].join("/")
                if (index !== -1) {
                  // Replace the existing header with the same key
                  headers[index] = {
                    parentID: currentPath,
                    parentName: parentFolder.name,
                    inheritedHeader: header,
                  }
                } else {
                  headers.push({
                    parentID: currentPath,
                    parentName: parentFolder.name,
                    inheritedHeader: header,
                  })
                }
              })
            }
          }

          return { type: "ok", data: { auth, headers } }
        })
      )
    )
  }

  public getRESTSearchResultsView(
    workspaceHandle: HandleRef<Workspace>,
    searchQuery: Ref<string>
  ): Promise<E.Either<never, HandleRef<RESTSearchResultsView>>> {
    const results = ref<HoppCollection[]>([])

    const isMatch = (inputText: string, textToMatch: string) =>
      inputText.toLowerCase().includes(textToMatch.toLowerCase())

    const filterRequests = (requests: HoppRESTRequest[]) => {
      return requests.filter((request) =>
        isMatch(request.name, searchQuery.value)
      )
    }

    const filterChildCollections = (
      childCollections: HoppCollection[]
    ): HoppCollection[] => {
      return childCollections
        .map((childCollection) => {
          // Render the entire collection tree if the search query matches a collection name
          if (isMatch(childCollection.name, searchQuery.value)) {
            return childCollection
          }

          const requests = filterRequests(
            childCollection.requests as HoppRESTRequest[]
          )
          const folders = filterChildCollections(childCollection.folders)

          return {
            ...childCollection,
            requests,
            folders,
          }
        })
        .filter(
          (childCollection) =>
            childCollection.requests.length > 0 ||
            childCollection.folders.length > 0 ||
            isMatch(childCollection.name, searchQuery.value)
        )
    }

    const scopeHandle = effectScope()

    scopeHandle.run(() => {
      watch(
        searchQuery,
        (newSearchQuery) => {
          if (!newSearchQuery) {
            results.value = this.restCollectionState.value.state
            return
          }

          const filteredCollections = this.restCollectionState.value.state
            .map((collection) => {
              // Render the entire collection tree if the search query matches a collection name
              if (isMatch(collection.name, searchQuery.value)) {
                return collection
              }

              const requests = filterRequests(
                collection.requests as HoppRESTRequest[]
              )
              const folders = filterChildCollections(collection.folders)

              return {
                ...collection,
                requests,
                folders,
              }
            })
            .filter(
              (collection) =>
                collection.requests.length > 0 ||
                collection.folders.length > 0 ||
                isMatch(collection.name, searchQuery.value)
            )

          results.value = filteredCollections
        },
        { immediate: true }
      )
    })

    const onSessionEnd = () => {
      scopeHandle.stop()
    }

    return Promise.resolve(
      E.right(
        computed(() => {
          if (
            workspaceHandle.value.type === "invalid" ||
            workspaceHandle.value.data.providerID !== this.providerID ||
            workspaceHandle.value.data.workspaceID !== "personal"
          ) {
            return {
              type: "invalid" as const,
              reason: "INVALID_WORKSPACE_HANDLE" as const,
            }
          }

          return markRaw({
            type: "ok" as const,
            data: {
              providerID: this.providerID,
              workspaceID: workspaceHandle.value.data.workspaceID,

              loading: ref(false),

              results,
              onSessionEnd,
            },
          })
        })
      )
    )
  }

  public getWorkspaceHandle(
    workspaceID: string
  ): Promise<E.Either<unknown, HandleRef<Workspace>>> {
    if (workspaceID !== "personal") {
      return Promise.resolve(E.left("INVALID_WORKSPACE_ID" as const))
    }

    return Promise.resolve(E.right(this.getPersonalWorkspaceHandle()))
  }

  public getPersonalWorkspaceHandle(): HandleRef<Workspace> {
    return shallowRef({
      type: "ok" as const,
      data: {
        providerID: this.providerID,
        workspaceID: "personal",

        name: "Personal Workspace",
      },
    })
  }
}
