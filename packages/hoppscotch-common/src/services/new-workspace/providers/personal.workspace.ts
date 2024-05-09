import {
  HoppCollection,
  HoppRESTAuth,
  HoppRESTHeaders,
  HoppRESTRequest,
  makeCollection,
} from "@hoppscotch/data"
import { Service } from "dioc"
import * as E from "fp-ts/Either"
import { isEqual, merge } from "lodash-es"
import path from "path"
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

import {
  Handle,
  HandleRef,
  WritableHandleRef,
} from "~/services/new-workspace/handle"
import { WorkspaceProvider } from "~/services/new-workspace/provider"
import {
  RESTCollectionChildrenView,
  RESTCollectionJSONView,
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

import {
  getFoldersByPath,
  resolveSaveContextOnCollectionReorder,
} from "~/helpers/collection/collection"
import {
  getRequestsByPath,
  resolveSaveContextOnRequestReorder,
} from "~/helpers/collection/request"
import { initializeDownloadFile } from "~/helpers/import-export/export"
import { HoppInheritedProperty } from "~/helpers/types/HoppInheritedProperties"
import IconUser from "~icons/lucide/user"
import { NewWorkspaceService } from ".."
import {
  isValidCollectionHandle,
  isValidRequestHandle,
  isValidWorkspaceHandle,
} from "../helpers"
import { lazy } from "~/helpers/utils/lazy"
import { getAffectedIndexes } from "~/helpers/collection/affectedIndex"
import { request } from "http"

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

  private issuedHandles: WritableHandleRef<
    WorkspaceCollection | WorkspaceRequest
  >[] = []

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

  // TODO: Move the below out of provider definitions as generic helper functions

  /**
   * Used to get the index of the request from the path
   * @param path The path of the request
   * @returns The index of the request
   */
  private pathToLastIndex(path: string) {
    const pathArr = path.split("/")
    return parseInt(pathArr[pathArr.length - 1])
  }

  /**
   * @param path The path of the collection or request
   * @returns The index of the collection or request
   */
  private pathToIndex(path: string) {
    const pathArr = path.split("/")
    return pathArr
  }

  /**
   * Checks if the collection is already in the root
   * @param id - path of the collection
   * @returns boolean - true if the collection is already in the root
   */
  private isAlreadyInRoot(id: string) {
    const indexPath = this.pathToIndex(id)
    return indexPath.length === 1
  }

  public createRESTRootCollection(
    workspaceHandle: Handle<Workspace>,
    newCollection: Partial<Exclude<HoppCollection, "id">> & { name: string }
  ): Promise<E.Either<unknown, Handle<WorkspaceCollection>>> {
    const workspaceHandleRef = workspaceHandle.get()

    if (
      !isValidWorkspaceHandle(workspaceHandleRef, this.providerID, "personal")
    ) {
      return Promise.resolve(E.left("INVALID_WORKSPACE_HANDLE" as const))
    }

    const newCollectionName = newCollection.name
    const newCollectionID =
      this.restCollectionState.value.state.length.toString()

    const newRootCollection = makeCollection({
      folders: [],
      requests: [],
      headers: [],
      auth: {
        authType: "inherit",
        authActive: false,
      },
      ...newCollection,
    })
    addRESTCollection(newRootCollection)

    platform.analytics?.logEvent({
      type: "HOPP_CREATE_COLLECTION",
      platform: "rest",
      workspaceType: "personal",
      isRootCollection: true,
    })

    return Promise.resolve(
      E.right({
        get: lazy(() =>
          computed(() => {
            if (
              !isValidWorkspaceHandle(
                workspaceHandleRef,
                this.providerID,
                "personal"
              )
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
                workspaceID: workspaceHandleRef.value.data.workspaceID,
                collectionID: newCollectionID,
                name: newCollectionName,
              },
            }
          })
        ),
      })
    )
  }

  public createRESTChildCollection(
    parentCollectionHandle: Handle<WorkspaceCollection>,
    newChildCollection: Partial<HoppCollection> & { name: string }
  ): Promise<E.Either<unknown, Handle<WorkspaceCollection>>> {
    const parentCollectionHandleRef = parentCollectionHandle.get()

    if (
      !isValidCollectionHandle(
        parentCollectionHandleRef,
        this.providerID,
        "personal"
      )
    ) {
      return Promise.resolve(E.left("INVALID_COLLECTION_HANDLE" as const))
    }

    const { collectionID, providerID, workspaceID } =
      parentCollectionHandleRef.value.data

    const newCollectionName = newChildCollection.name
    addRESTFolder(newCollectionName, collectionID)

    platform.analytics?.logEvent({
      type: "HOPP_CREATE_COLLECTION",
      workspaceType: "personal",
      isRootCollection: false,
      platform: "rest",
    })

    return Promise.resolve(
      E.right({
        get: lazy(() =>
          computed(() => {
            if (
              !isValidCollectionHandle(
                parentCollectionHandleRef,
                this.providerID,
                "personal"
              )
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
        ),
      })
    )
  }

  public updateRESTCollection(
    collectionHandle: Handle<WorkspaceCollection>,
    updatedCollection: Partial<HoppCollection>
  ): Promise<E.Either<unknown, void>> {
    const collectionHandleRef = collectionHandle.get()

    if (
      !isValidCollectionHandle(collectionHandleRef, this.providerID, "personal")
    ) {
      return Promise.resolve(E.left("INVALID_COLLECTION_HANDLE" as const))
    }

    const { collectionID } = collectionHandleRef.value.data

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
    collectionHandle: Handle<WorkspaceCollection>
  ): Promise<E.Either<unknown, void>> {
    const collectionHandleRef = collectionHandle.get()

    if (
      !isValidCollectionHandle(collectionHandleRef, this.providerID, "personal")
    ) {
      return Promise.resolve(E.left("INVALID_COLLECTION_HANDLE" as const))
    }

    const { collectionID } = collectionHandleRef.value.data

    const isRootCollection = collectionID.split("/").length === 1
    const collectionIndex = parseInt(collectionID)

    if (isRootCollection) {
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

    for (const [idx, handle] of this.issuedHandles.entries()) {
      if (handle.value.type === "invalid") continue

      if ("requestID" in handle.value.data) {
        if (handle.value.data.requestID.startsWith(collectionID)) {
          // @ts-expect-error - We're deleting the data to invalidate the handle
          delete this.issuedHandles[idx].value.data

          this.issuedHandles[idx].value.type = "invalid"

          // @ts-expect-error - Setting the handle invalidation reason
          this.issuedHandles[idx].value.reason = "REQUEST_INVALIDATED"
        }
      }
    }

    if (isRootCollection) {
      resolveSaveContextOnCollectionReorder({
        lastIndex: collectionIndex,
        newIndex: -1,
        folderPath: "", // root folder
        length: restCollectionStore.value.state.length,
      })
    } else {
      const parentCollectionID = collectionID.split("/").slice(0, -1).join("/") // remove last folder to get parent folder
      resolveSaveContextOnCollectionReorder({
        lastIndex: this.pathToLastIndex(collectionID),
        newIndex: -1,
        folderPath: parentCollectionID,
        length: getFoldersByPath(
          restCollectionStore.value.state,
          parentCollectionID
        ).length,
      })
    }

    return Promise.resolve(E.right(undefined))
  }

  public createRESTRequest(
    parentCollectionHandle: Handle<WorkspaceCollection>,
    newRequest: HoppRESTRequest
  ): Promise<E.Either<unknown, Handle<WorkspaceRequest>>> {
    const parentCollectionHandleRef = parentCollectionHandle.get()

    if (
      !isValidCollectionHandle(
        parentCollectionHandleRef,
        this.providerID,
        "personal"
      )
    ) {
      return Promise.resolve(E.left("INVALID_COLLECTION_HANDLE" as const))
    }

    const { collectionID, providerID, workspaceID } =
      parentCollectionHandleRef.value.data

    const insertionIndex = saveRESTRequestAs(collectionID, newRequest)

    const requestID = `${collectionID}/${insertionIndex}`

    platform.analytics?.logEvent({
      type: "HOPP_SAVE_REQUEST",
      workspaceType: "personal",
      createdNow: true,
      platform: "rest",
    })

    const handleRefData = ref({
      type: "ok" as const,
      data: {
        providerID,
        workspaceID,
        collectionID,
        requestID,
        request: newRequest,
      },
    })

    const handle: HandleRef<WorkspaceRequest> = computed(() => {
      if (
        !isValidCollectionHandle(
          parentCollectionHandleRef,
          this.providerID,
          "personal"
        )
      ) {
        return {
          type: "invalid" as const,
          reason: "COLLECTION_INVALIDATED" as const,
        }
      }

      return handleRefData.value
    })

    const writableHandle = computed({
      get() {
        return handleRefData.value
      },
      set(newValue) {
        handleRefData.value = newValue
      },
    })

    const handleIsAlreadyIssued = this.issuedHandles.some((handle) => {
      if (handle.value.type === "invalid") {
        return false
      }

      if (!("requestID" in handle.value.data)) {
        return false
      }

      const { request, ...dataProps } = handle.value.data

      if (
        isEqual(dataProps, {
          providerID,
          workspaceID,
          collectionID,
          requestID,
        })
      ) {
        return true
      }
    })

    if (!handleIsAlreadyIssued) {
      this.issuedHandles.push(writableHandle)
    }

    return Promise.resolve(E.right({ get: lazy(() => handle) }))
  }

  public removeRESTRequest(
    requestHandle: Handle<WorkspaceRequest>
  ): Promise<E.Either<unknown, void>> {
    const requestHandleRef = requestHandle.get()

    if (!isValidRequestHandle(requestHandleRef, this.providerID, "personal")) {
      return Promise.resolve(E.left("INVALID_REQUEST_HANDLE" as const))
    }

    const { collectionID, requestID } = requestHandleRef.value.data
    const requestIndex = parseInt(requestID.split("/").slice(-1)[0])

    const requestToRemove = navigateToFolderWithIndexPath(
      restCollectionStore.value.state,
      collectionID.split("/").map((id) => parseInt(id))
    )?.requests[requestIndex]

    removeRESTRequest(collectionID, requestIndex, requestToRemove?.id)

    for (const [idx, handle] of this.issuedHandles.entries()) {
      if (handle.value.type === "invalid") continue

      if ("requestID" in handle.value.data) {
        if (handle.value.data.requestID === requestID) {
          // @ts-expect-error - We're deleting the data to invalidate the handle
          delete this.issuedHandles[idx].value.data

          this.issuedHandles[idx].value.type = "invalid"

          // @ts-expect-error - Setting the handle invalidation reason
          this.issuedHandles[idx].value.reason = "REQUEST_INVALIDATED"
        }
      }
    }

    // The same function is used to reorder requests since after removing, it's basically doing reorder
    resolveSaveContextOnRequestReorder({
      lastIndex: requestIndex,
      newIndex: -1,
      folderPath: collectionID,
      length: getRequestsByPath(restCollectionStore.value.state, collectionID)
        .length,
    })

    return Promise.resolve(E.right(undefined))
  }

  public updateRESTRequest(
    requestHandle: Handle<WorkspaceRequest>,
    updatedRequest: Partial<HoppRESTRequest>
  ): Promise<E.Either<unknown, void>> {
    const requestHandleRef = requestHandle.get()

    if (!isValidRequestHandle(requestHandleRef, this.providerID, "personal")) {
      return Promise.resolve(E.left("INVALID_REQUEST_HANDLE" as const))
    }

    delete updatedRequest.id

    const { collectionID, requestID, request } = requestHandleRef.value.data

    const newRequest: HoppRESTRequest = merge(request, updatedRequest)
    const requestIndex = parseInt(requestID.split("/").slice(-1)[0])
    editRESTRequest(collectionID, requestIndex, newRequest)

    platform.analytics?.logEvent({
      type: "HOPP_SAVE_REQUEST",
      platform: "rest",
      createdNow: false,
      workspaceType: "personal",
    })

    for (const [idx, handle] of this.issuedHandles.entries()) {
      if (handle.value.type === "invalid") continue

      if ("requestID" in handle.value.data) {
        if (handle.value.data.requestID === requestID) {
          // @ts-expect-error - We're updating the request data
          this.issuedHandles[idx].value.data.request.name = newRequest.name
        }
      }
    }

    return Promise.resolve(E.right(undefined))
  }

  public importRESTCollections(
    workspaceHandle: Handle<Workspace>,
    collections: HoppCollection[]
  ): Promise<E.Either<unknown, Handle<WorkspaceCollection>>> {
    const workspaceHandleRef = workspaceHandle.get()
    if (
      !isValidWorkspaceHandle(workspaceHandleRef, this.providerID, "personal")
    ) {
      return Promise.resolve(E.left("INVALID_WORKSPACE_HANDLE" as const))
    }

    appendRESTCollections(collections)

    const newCollectionName = collections[0].name
    const newCollectionID =
      this.restCollectionState.value.state.length.toString()

    return Promise.resolve(
      E.right({
        get: lazy(() =>
          computed(() => {
            if (
              !isValidWorkspaceHandle(
                workspaceHandleRef,
                this.providerID,
                "personal"
              )
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
                workspaceID: workspaceHandleRef.value.data.workspaceID,
                collectionID: newCollectionID,
                name: newCollectionName,
              },
            }
          })
        ),
      })
    )
  }

  public exportRESTCollections(
    workspaceHandle: Handle<WorkspaceCollection>,
    collections: HoppCollection[]
  ): Promise<E.Either<unknown, void>> {
    const workspaceHandleRef = workspaceHandle.get()

    if (
      !isValidWorkspaceHandle(workspaceHandleRef, this.providerID, "personal")
    ) {
      return Promise.resolve(E.left("INVALID_COLLECTION_HANDLE" as const))
    }

    initializeDownloadFile(JSON.stringify(collections, null, 2), "Collections")

    return Promise.resolve(E.right(undefined))
  }

  public exportRESTCollection(
    collectionHandle: Handle<WorkspaceCollection>,
    collection: HoppCollection
  ): Promise<E.Either<unknown, void>> {
    const collectionHandleRef = collectionHandle.get()

    if (
      !isValidCollectionHandle(collectionHandleRef, this.providerID, "personal")
    ) {
      return Promise.resolve(E.left("INVALID_COLLECTION_HANDLE" as const))
    }

    initializeDownloadFile(JSON.stringify(collection, null, 2), collection.name)

    return Promise.resolve(E.right(undefined))
  }

  public reorderRESTCollection(
    collectionHandle: Handle<WorkspaceCollection>,
    destinationCollectionID: string | null
  ): Promise<E.Either<unknown, void>> {
    const collectionHandleRef = collectionHandle.get()

    if (
      !isValidCollectionHandle(collectionHandleRef, this.providerID, "personal")
    ) {
      return Promise.resolve(E.left("INVALID_COLLECTION_HANDLE" as const))
    }

    const draggedCollectionIndex = collectionHandleRef.value.data.collectionID

    updateRESTCollectionOrder(draggedCollectionIndex, destinationCollectionID)

    return Promise.resolve(E.right(undefined))
  }

  public moveRESTCollection(
    collectionHandle: Handle<WorkspaceCollection>,
    destinationCollectionID: string | null
  ): Promise<E.Either<unknown, void>> {
    const collectionHandleRef = collectionHandle.get()

    if (
      !isValidCollectionHandle(collectionHandleRef, this.providerID, "personal")
    ) {
      return Promise.resolve(E.left("INVALID_COLLECTION_HANDLE" as const))
    }
    const { collectionID: draggedCollectionID } = collectionHandleRef.value.data

    const draggedParentCollectionID = this.isAlreadyInRoot(draggedCollectionID)
      ? draggedCollectionID
      : draggedCollectionID.split("/").slice(0, -1).join("/")

    const isMoveToSiblingCollection = this.isAlreadyInRoot(draggedCollectionID)
      ? this.isAlreadyInRoot(
          destinationCollectionID === null
            ? // Move to root
              this.restCollectionState.value.state.length.toString()
            : destinationCollectionID
        )
      : !!destinationCollectionID?.startsWith(draggedParentCollectionID)

    const draggedCollectionIndexPos = this.pathToLastIndex(draggedCollectionID)

    let resolvedDestinationCollectionID = ""

    if (destinationCollectionID === null) {
      // destinationCollectionID` being `null` indicates moving to root
      // New ID will be the length of the root nodes at this point (before the store update)
      resolvedDestinationCollectionID =
        this.restCollectionState.value.state.length.toString()
    } else {
      // Move to an inner-level collection
      const destinationCollectionIndexPos = this.pathToLastIndex(
        destinationCollectionID
      )

      // The count of child collections within the destination collection will be the new index position
      // Appended to the `resolvedDestinationCollectionID`
      const resolvedDestinationCollectionIndexPos = getFoldersByPath(
        this.restCollectionState.value.state,
        destinationCollectionID
      ).length

      // Indicates a move from a collection at the top to a sibling collection below it
      if (
        isMoveToSiblingCollection &&
        destinationCollectionIndexPos > draggedCollectionIndexPos
      ) {
        const draggedCollectionIDStrLength =
          draggedCollectionID.split("/").length

        // Obtain a subset of the destination collection ID till the dragged collection ID string length
        // Only update the index position at the level of the dragged collection
        // This ensures moves to deeply any nested collections are accounted
        const destinationCollectionIDSubset = destinationCollectionID
          .split("/")
          .slice(0, draggedCollectionIDStrLength)
          .join("/")

        // Reduce `1` from the index position to account for the dragged collection
        // Dragged collection doesn't exist anymore at the previous level
        const collectionIDSubsetIndexPos = Number(
          this.pathToLastIndex(destinationCollectionIDSubset) - 1
        )

        // Replace the destination collection ID with `1` reduced from the index position
        const replacedDestinationCollectionID = destinationCollectionID.replace(
          destinationCollectionIDSubset,
          `${destinationCollectionIDSubset
            .split("/")
            .slice(0, -1)
            .join("/")}/${collectionIDSubsetIndexPos}`
        )

        const resolvedDestinationCollectionIDPrefix = this.isAlreadyInRoot(
          draggedCollectionID
        )
          ? collectionIDSubsetIndexPos
          : replacedDestinationCollectionID

        resolvedDestinationCollectionID = `${resolvedDestinationCollectionIDPrefix}/${resolvedDestinationCollectionIndexPos}`
      } else {
        resolvedDestinationCollectionID = `${destinationCollectionID}/${resolvedDestinationCollectionIndexPos}`
      }
    }

    const draggedParentCollectionSize = this.isAlreadyInRoot(
      draggedCollectionID
    )
      ? this.restCollectionState.value.state.length
      : getFoldersByPath(
          this.restCollectionState.value.state,
          draggedParentCollectionID
        ).length

    const affectedParentCollectionIDRange =
      draggedParentCollectionSize - 1 - draggedCollectionIndexPos

    moveRESTFolder(
      collectionHandleRef.value.data.collectionID,
      destinationCollectionID
    )

    this.issuedHandles.forEach((handle) => {
      if (handle.value.type === "invalid") {
        return
      }

      if (!("requestID" in handle.value.data)) {
        return
      }

      const { collectionID, requestID } = handle.value.data

      const reqIndexPos = requestID.slice(-1)[0]

      if (requestID.startsWith(draggedCollectionID)) {
        const newCollectionID = collectionID.replace(
          draggedCollectionID,
          resolvedDestinationCollectionID
        )

        handle.value.data.collectionID = newCollectionID
        handle.value.data.requestID = `${newCollectionID}/${reqIndexPos}`
      }
    })

    Array.from({ length: affectedParentCollectionIDRange }).forEach(
      (_, idx) => {
        // Adding `1` to dragged collection index position to get the affected collection index position
        const affectedCollectionIndexPos = draggedCollectionIndexPos + idx + 1

        const affectedCollectionID = `${draggedParentCollectionID}/${affectedCollectionIndexPos}`

        // The index position will be reduced by `1` for the affected collections
        const newAffectedCollectionID = `${draggedParentCollectionID}/${
          affectedCollectionIndexPos - 1
        }`

        // For each affected collection, we'll have to iterate over the `issuedHandles` to account for nested collections
        this.issuedHandles.forEach((handle) => {
          if (
            handle.value.type === "invalid" ||
            !("requestID" in handle.value.data)
          ) {
            return
          }

          if (handle.value.data.requestID.startsWith(affectedCollectionID)) {
            const { collectionID, requestID } = handle.value.data

            handle.value.data.collectionID = collectionID.replace(
              affectedCollectionID,
              newAffectedCollectionID
            )

            handle.value.data.requestID = requestID.replace(
              affectedCollectionID,
              newAffectedCollectionID
            )
          }
        })
      }
    )

    return Promise.resolve(E.right(undefined))
  }

  public reorderRESTRequest(
    requestHandle: Handle<WorkspaceRequest>,
    destinationCollectionID: string,
    destinationRequestID: string | null
  ): Promise<E.Either<unknown, void>> {
    const requestHandleRef = requestHandle.get()

    if (!isValidRequestHandle(requestHandleRef, this.providerID, "personal")) {
      return Promise.resolve(E.left("INVALID_REQUEST_HANDLE" as const))
    }

    const { collectionID, requestID: draggedRequestID } =
      requestHandleRef.value.data

    const collectionRequestCount = getRequestsByPath(
      restCollectionStore.value.state,
      collectionID
    ).length

    // Compute the affected request IDs
    // Maps the previous request ID to the new one affected by the reorder
    const affectedRequestIndices = getAffectedIndexes(
      this.pathToLastIndex(draggedRequestID),
      destinationRequestID === null
        ? collectionRequestCount - 1
        : this.pathToLastIndex(destinationRequestID)
    )

    // Compile the handle indices within `issuedHandles` along with the ID to update it based on the affected request indices
    // This is done in 2 steps since finding the corresponding handle and updating it straightaway would result in ambiguities
    // Updating the request ID for a certain handle and attempting to find the handle corresponding to the same ID would pick the former handle
    const affectedRequestHandleUpdateInfo = Array.from(
      affectedRequestIndices.entries()
    ).map(([oldRequestIndexPos, newRequestIndexPos]) => {
      const affectedRequestHandleIdx = this.issuedHandles.findIndex(
        (handle) => {
          if (handle.value.type === "invalid") {
            return
          }

          if (!("requestID" in handle.value.data)) {
            return
          }

          return (
            handle.value.data.requestID ===
            `${collectionID}/${oldRequestIndexPos}`
          )
        }
      )

      return { affectedRequestHandleIdx, newRequestIndexPos }
    })

    affectedRequestHandleUpdateInfo.forEach(
      ({ affectedRequestHandleIdx, newRequestIndexPos }) => {
        const handle = this.issuedHandles[affectedRequestHandleIdx]

        if (
          !handle ||
          handle.value.type === "invalid" ||
          !("requestID" in handle.value.data)
        ) {
          return
        }

        handle.value.data.requestID = `${collectionID}/${newRequestIndexPos}`
      }
    )

    updateRESTRequestOrder(
      this.pathToLastIndex(draggedRequestID),
      destinationRequestID ? this.pathToLastIndex(destinationRequestID) : null,
      destinationCollectionID
    )

    return Promise.resolve(E.right(undefined))
  }

  public moveRESTRequest(
    requestHandle: Handle<WorkspaceRequest>,
    destinationCollectionID: string
  ): Promise<E.Either<unknown, void>> {
    const requestHandleRef = requestHandle.get()

    if (!isValidRequestHandle(requestHandleRef, this.providerID, "personal")) {
      return Promise.resolve(E.left("INVALID_REQUEST_HANDLE" as const))
    }

    const { requestID: draggedRequestID } = requestHandleRef.value.data
    const sourceCollectionID = draggedRequestID
      .split("/")
      .slice(0, -1)
      .join("/")

    const draggedRequestIndexPos = this.pathToLastIndex(draggedRequestID)

    const movedRequestHandle = this.issuedHandles.find((handle) => {
      if (handle.value.type === "invalid") {
        return
      }

      if (!("requestID" in handle.value.data)) {
        return
      }

      return handle.value.data.requestID === draggedRequestID
    })

    if (
      !movedRequestHandle ||
      movedRequestHandle.value.type === "invalid" ||
      !("requestID" in movedRequestHandle.value.data)
    ) {
      return Promise.resolve(E.left("INVALID_REQUEST_HANDLE" as const))
    }

    const draggedCollectionReqCountBeforeMove = getRequestsByPath(
      restCollectionStore.value.state,
      sourceCollectionID
    ).length

    // Requests appearing below the request being moved will be affected by the action
    const affectedReqIndexRange =
      draggedCollectionReqCountBeforeMove - 1 - draggedRequestIndexPos

    const affectedRequestIDs = Array.from({
      length: affectedReqIndexRange,
    }).map((_, idx) => {
      // Affected request indices will start from the next position of the dragged request, hence adding `1`
      const resolvedRequestIndexPos = draggedRequestIndexPos + idx + 1
      return `${sourceCollectionID}/${resolvedRequestIndexPos}`
    })

    moveRESTRequest(
      sourceCollectionID,
      draggedRequestIndexPos,
      destinationCollectionID
    )

    const destinationCollectionReqCount = getRequestsByPath(
      restCollectionStore.value.state,
      destinationCollectionID
    ).length

    movedRequestHandle.value.data.collectionID = destinationCollectionID
    movedRequestHandle.value.data.requestID = `${destinationCollectionID}/${
      destinationCollectionReqCount - 1
    }`

    affectedRequestIDs.forEach((requestID) => {
      const handle = this.issuedHandles.find((handle) => {
        if (handle.value.type === "invalid") {
          return
        }

        if (!("requestID" in handle.value.data)) {
          return
        }

        return handle.value.data.requestID === requestID
      })

      if (
        !handle ||
        handle.value.type === "invalid" ||
        !("requestID" in handle.value.data)
      ) {
        return
      }

      // Decrement the index pos in affected requests due to move
      const reqIndexPos = Number(
        handle.value.data.requestID.split("/").slice(-1)[0]
      )

      handle.value.data.requestID = `${sourceCollectionID}/${reqIndexPos - 1}`
    })

    return Promise.resolve(E.right(undefined))
  }

  public getCollectionHandle(
    workspaceHandle: Handle<Workspace>,
    collectionID: string
  ): Promise<E.Either<unknown, Handle<WorkspaceCollection>>> {
    const workspaceHandleRef = workspaceHandle.get()

    if (
      !isValidWorkspaceHandle(workspaceHandleRef, this.providerID, "personal")
    ) {
      return Promise.resolve(E.left("INVALID_WORKSPACE_HANDLE" as const))
    }

    if (collectionID === "") {
      return Promise.resolve(E.left("INVALID_COLLECTION_ID" as const))
    }

    const collection = navigateToFolderWithIndexPath(
      this.restCollectionState.value.state,
      collectionID.split("/").map((x) => parseInt(x))
    )

    if (!collection) {
      return Promise.resolve(E.left("COLLECTION_NOT_FOUND"))
    }

    const { providerID, workspaceID } = workspaceHandleRef.value.data

    return Promise.resolve(
      E.right({
        get: lazy(() =>
          computed(() => {
            if (
              !isValidWorkspaceHandle(
                workspaceHandleRef,
                this.providerID,
                "personal"
              )
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
                name: collection.name,
              },
            }
          })
        ),
      })
    )
  }

  public getRequestHandle(
    workspaceHandle: Handle<Workspace>,
    requestID: string
  ): Promise<E.Either<unknown, Handle<WorkspaceRequest>>> {
    const workspaceHandleRef = workspaceHandle.get()

    if (
      !isValidWorkspaceHandle(workspaceHandleRef, this.providerID, "personal")
    ) {
      return Promise.resolve(E.left("INVALID_COLLECTION_HANDLE" as const))
    }

    if (requestID === "") {
      return Promise.resolve(E.left("INVALID_REQUEST_ID" as const))
    }

    const { providerID, workspaceID } = workspaceHandleRef.value.data

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
    const request = collection?.requests[requestIndex] as
      | HoppRESTRequest
      | undefined

    if (!request) {
      return Promise.resolve(E.left("REQUEST_NOT_FOUND" as const))
    }

    const handleRefData = ref({
      type: "ok" as const,
      data: {
        providerID,
        workspaceID,
        collectionID,
        requestID,
        request,
      },
    })

    const handle: HandleRef<WorkspaceRequest> = computed(() => {
      if (
        !isValidWorkspaceHandle(workspaceHandleRef, this.providerID, "personal")
      ) {
        return {
          type: "invalid" as const,
          reason: "WORKSPACE_INVALIDATED" as const,
        }
      }

      return handleRefData.value
    })

    const writableHandle = computed({
      get() {
        return handleRefData.value
      },
      set(newValue) {
        handleRefData.value = newValue
      },
    })

    const handleIsAlreadyIssued = this.issuedHandles.some((handle) => {
      if (handle.value.type === "invalid") {
        return false
      }

      if (!("requestID" in handle.value.data)) {
        return false
      }

      const { request, ...dataProps } = handle.value.data

      if (
        isEqual(dataProps, {
          providerID,
          workspaceID,
          collectionID,
          requestID,
        })
      ) {
        return true
      }
    })

    if (!handleIsAlreadyIssued) {
      this.issuedHandles.push(writableHandle)
    }

    return Promise.resolve(E.right({ get: lazy(() => handle) }))
  }

  public getRESTCollectionChildrenView(
    collectionHandle: Handle<WorkspaceCollection>
  ): Promise<E.Either<never, Handle<RESTCollectionChildrenView>>> {
    const collectionHandleRef = collectionHandle.get()

    return Promise.resolve(
      E.right({
        get: () =>
          computed(() => {
            if (
              !isValidCollectionHandle(
                collectionHandleRef,
                this.providerID,
                "personal"
              )
            ) {
              return {
                type: "invalid" as const,
                reason: "INVALID_COLLECTION_HANDLE" as const,
              }
            }

            const collectionID = collectionHandleRef.value.data.collectionID

            return markRaw({
              type: "ok" as const,
              data: {
                providerID: this.providerID,
                workspaceID: collectionHandleRef.value.data.workspaceID,
                collectionID: collectionHandleRef.value.data.collectionID,

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
          }),
      })
    )
  }

  public getRESTRootCollectionView(
    workspaceHandle: Handle<Workspace>
  ): Promise<E.Either<never, Handle<RootRESTCollectionView>>> {
    const workspaceHandleRef = workspaceHandle.get()

    return Promise.resolve(
      E.right({
        get: lazy(() =>
          computed(() => {
            if (
              !isValidWorkspaceHandle(
                workspaceHandleRef,
                this.providerID,
                "personal"
              )
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
                workspaceID: workspaceHandleRef.value.data.workspaceID,

                loading: ref(false),

                collections: computed(() => {
                  return this.restCollectionState.value.state.map(
                    (coll, id) => {
                      return {
                        collectionID: id.toString(),
                        isLastItem:
                          id ===
                          this.restCollectionState.value.state.length - 1,
                        name: coll.name,
                        parentCollectionID: null,
                      }
                    }
                  )
                }),
              },
            })
          })
        ),
      })
    )
  }

  public getRESTCollectionLevelAuthHeadersView(
    collectionHandle: Handle<WorkspaceCollection>
  ): Promise<E.Either<never, Handle<RESTCollectionLevelAuthHeadersView>>> {
    const collectionHandleRef = collectionHandle.get()

    return Promise.resolve(
      E.right({
        get: lazy(() =>
          computed(() => {
            if (
              !isValidCollectionHandle(
                collectionHandleRef,
                this.providerID,
                "personal"
              )
            ) {
              return {
                type: "invalid" as const,
                reason: "INVALID_COLLECTION_HANDLE" as const,
              }
            }

            const { collectionID } = collectionHandleRef.value.data

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

              const parentFolderAuth: HoppRESTAuth = parentFolder.auth
              const parentFolderHeaders: HoppRESTHeaders = parentFolder.headers

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
                const activeHeaders = parentFolderHeaders.filter(
                  (h) => h.active
                )
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
        ),
      })
    )
  }

  public getRESTSearchResultsView(
    workspaceHandle: Handle<Workspace>,
    searchQuery: Ref<string>
  ): Promise<E.Either<never, Handle<RESTSearchResultsView>>> {
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

    const workspaceHandleRef = workspaceHandle.get()

    return Promise.resolve(
      E.right({
        get: lazy(() =>
          computed(() => {
            if (
              !isValidWorkspaceHandle(
                workspaceHandleRef,
                this.providerID,
                "personal"
              )
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
                workspaceID: workspaceHandleRef.value.data.workspaceID,

                loading: ref(false),

                results,
                onSessionEnd,
              },
            })
          })
        ),
      })
    )
  }

  public getRESTCollectionJSONView(
    workspaceHandle: Handle<Workspace>
  ): Promise<E.Either<never, Handle<RESTCollectionJSONView>>> {
    const workspaceHandleRef = workspaceHandle.get()

    return Promise.resolve(
      E.right({
        get: lazy(() =>
          computed(() => {
            if (
              !isValidWorkspaceHandle(
                workspaceHandleRef,
                this.providerID,
                "personal"
              )
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
                workspaceID: workspaceHandleRef.value.data.workspaceID,
                content: JSON.stringify(
                  this.restCollectionState.value.state,
                  null,
                  2
                ),
              },
            })
          })
        ),
      })
    )
  }

  public getWorkspaceHandle(
    workspaceID: string
  ): Promise<E.Either<unknown, Handle<Workspace>>> {
    if (workspaceID !== "personal") {
      return Promise.resolve(E.left("INVALID_WORKSPACE_ID" as const))
    }

    return Promise.resolve(E.right(this.getPersonalWorkspaceHandle()))
  }

  public getPersonalWorkspaceHandle(): Handle<Workspace> {
    return {
      get: lazy(() =>
        shallowRef({
          type: "ok" as const,
          data: {
            providerID: this.providerID,
            workspaceID: "personal",

            name: "Personal Workspace",
          },
        })
      ),
    }
  }
}
