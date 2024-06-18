import {
  Environment,
  HoppCollection,
  HoppGQLRequest,
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
  addGraphqlCollection,
  addGraphqlFolder,
  addRESTCollection,
  addRESTFolder,
  appendGraphqlCollections,
  appendRESTCollections,
  editGraphqlCollection,
  editGraphqlFolder,
  editGraphqlRequest,
  editRESTCollection,
  editRESTFolder,
  editRESTRequest,
  graphqlCollectionStore,
  moveGraphqlRequest,
  moveRESTFolder,
  moveRESTRequest,
  navigateToFolderWithIndexPath,
  removeGraphqlCollection,
  removeGraphqlFolder,
  removeGraphqlRequest,
  removeRESTCollection,
  removeRESTFolder,
  removeRESTRequest,
  restCollectionStore,
  saveGraphqlRequestAs,
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
  CollectionJSONView,
  CollectionLevelAuthHeadersView,
  RESTCollectionChildrenView,
  RESTCollectionViewItem,
  RESTEnvironmentsView,
  RootRESTCollectionView,
  SearchResultsView,
} from "~/services/new-workspace/view"
import {
  Workspace,
  WorkspaceCollection,
  WorkspaceDecor,
  WorkspaceEnvironment,
  WorkspaceRequest,
} from "~/services/new-workspace/workspace"

import { getAffectedIndexes } from "~/helpers/collection/affectedIndex"
import { getFoldersByPath } from "~/helpers/collection/collection"
import { getRequestsByPath } from "~/helpers/collection/request"
import { initializeDownloadFile } from "~/helpers/import-export/export"
import { HoppInheritedProperty } from "~/helpers/types/HoppInheritedProperties"
import { lazy } from "~/helpers/utils/lazy"
import {
  appendEnvironments,
  createEnvironment,
  deleteEnvironment,
  duplicateEnvironment,
  environments$,
  updateEnvironment,
} from "~/newstore/environments"
import IconUser from "~icons/lucide/user"
import { NewWorkspaceService } from ".."
import {
  isValidCollectionHandle,
  isValidEnvironmentHandle,
  isValidRequestHandle,
  isValidWorkspaceHandle,
} from "../helpers"

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

  public restCollectionState: Ref<{ state: HoppCollection[] }> = ref({
    state: [],
  })

  public gqlCollectionState: Ref<{ state: HoppCollection[] }> = ref({
    state: [],
  })

  public restEnvironmentState: Ref<Environment[]> = ref([])

  // Issued handles can have collection handles when the collection runner is introduced
  public issuedHandles: WritableHandleRef<
    WorkspaceRequest | WorkspaceCollection
  >[] = []

  override onServiceInit() {
    this.restCollectionState = useStreamStatic(
      restCollectionStore.subject$,
      { state: [] },
      () => {
        /* noop */
      }
    )[0]

    this.gqlCollectionState = useStreamStatic(
      graphqlCollectionStore.subject$,
      { state: [] },
      () => {
        /* noop */
      }
    )[0]

    this.restEnvironmentState = useStreamStatic(environments$, [], () => {
      /* noop */
    })[0]

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

  public async createRESTRootCollection(
    workspaceHandle: Handle<Workspace>,
    newCollection: Partial<Exclude<HoppCollection, "id">> & { name: string }
  ): Promise<E.Either<unknown, Handle<WorkspaceCollection>>> {
    const workspaceHandleRef = workspaceHandle.get()

    if (
      !isValidWorkspaceHandle(workspaceHandleRef, this.providerID, "personal")
    ) {
      return Promise.resolve(E.left("INVALID_WORKSPACE_HANDLE" as const))
    }

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

    // TODO: Verify whether a collection update action is reflected correctly in the handle being returned below

    const createdCollectionHandle = await this.getRESTCollectionHandle(
      workspaceHandle,
      newCollectionID
    )

    return createdCollectionHandle
  }

  public async createRESTChildCollection(
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

    const { collectionID } = parentCollectionHandleRef.value.data

    const newCollectionName = newChildCollection.name
    addRESTFolder(newCollectionName, collectionID)

    platform.analytics?.logEvent({
      type: "HOPP_CREATE_COLLECTION",
      workspaceType: "personal",
      isRootCollection: false,
      platform: "rest",
    })

    const newChildCollectionID = `${collectionID}/${
      getFoldersByPath(this.restCollectionState.value.state, collectionID)
        .length - 1
    }`

    // TODO: Verify whether a collection update action is reflected correctly in the handle being returned below

    const createdCollectionHandle = await this.getRESTCollectionHandle(
      parentCollectionHandle,
      newChildCollectionID
    )

    return createdCollectionHandle
  }

  public async updateRESTCollection(
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

    const newCollection = {
      ...collection,
      ...updatedCollection,
    }

    const isRootCollection = collectionID.split("/").length === 1

    if (isRootCollection) {
      editRESTCollection(parseInt(collectionID), newCollection)
    } else {
      editRESTFolder(collectionID, newCollection)
    }

    const updatedCollectionHandle = await this.getRESTCollectionHandle(
      this.getPersonalWorkspaceHandle(),
      collectionID
    )

    if (E.isRight(updatedCollectionHandle)) {
      const updatedCollectionHandleRef = updatedCollectionHandle.right.get()

      if (updatedCollectionHandleRef.value.type === "ok") {
        // Name is guaranteed to be present for a collection
        updatedCollectionHandleRef.value.data.name = newCollection.name!
      }
    }

    return Promise.resolve(E.right(undefined))
  }

  public async removeRESTCollection(
    collectionHandle: Handle<WorkspaceCollection>
  ): Promise<E.Either<unknown, void>> {
    const collectionHandleRef = collectionHandle.get()

    if (
      !isValidCollectionHandle(collectionHandleRef, this.providerID, "personal")
    ) {
      return Promise.resolve(E.left("INVALID_COLLECTION_HANDLE" as const))
    }

    const { collectionID: removedCollectionID } = collectionHandleRef.value.data

    const isRootCollection = this.isAlreadyInRoot(removedCollectionID)

    const collectionIndexPos = isRootCollection
      ? parseInt(removedCollectionID)
      : this.pathToLastIndex(removedCollectionID)

    const removedCollectionHandle = await this.getRESTCollectionHandle(
      this.getPersonalWorkspaceHandle(),
      removedCollectionID
    )

    if (E.isRight(removedCollectionHandle)) {
      const removedCollectionHandleRef = removedCollectionHandle.right.get()

      if (removedCollectionHandleRef.value.type === "ok") {
        removedCollectionHandleRef.value = {
          type: "invalid",
          reason: "COLLECTION_INVALIDATED",
        }
      }
    }

    this.issuedHandles.forEach((handle) => {
      if (
        handle.value.type === "invalid" ||
        !("requestID" in handle.value.data)
      ) {
        return
      }

      const { requestID } = handle.value.data

      if (requestID.startsWith(removedCollectionID)) {
        handle.value = {
          type: "invalid",
          reason: "REQUEST_INVALIDATED",
        }

        return
      }

      const removedCollectionIDStrLen = removedCollectionID.split("/").length

      // Obtain the subset of the request ID till the removed collection ID string length
      const requestIDSubset = requestID
        .split("/")
        .slice(0, removedCollectionIDStrLen)
        .join("/")

      const parentRequestIDSubset = requestIDSubset
        .split("/")
        .slice(0, -1)
        .join("/")

      // Obtain the index position of the matching collection ID
      const matchingCollectionIndexPos = this.pathToLastIndex(requestIDSubset)

      // If the collection lies below the removed collection, reduce the index position for child request handles by `1`
      if (matchingCollectionIndexPos > collectionIndexPos) {
        const newCollectionIndexPos = matchingCollectionIndexPos - 1
        const newMatchingCollectionID = `${parentRequestIDSubset}${newCollectionIndexPos}`

        const newRequestID = requestID.replace(
          requestIDSubset,
          newMatchingCollectionID
        )

        handle.value.data.collectionID = newRequestID
          .split("/")
          .slice(0, -1)
          .join("/")

        handle.value.data.requestID = newRequestID
      }
    })

    if (isRootCollection) {
      const collectionToRemove = navigateToFolderWithIndexPath(
        this.restCollectionState.value.state,
        [collectionIndexPos]
      )

      removeRESTCollection(
        collectionIndexPos,
        collectionToRemove ? collectionToRemove.id : undefined
      )
    } else {
      const folderToRemove = path
        ? navigateToFolderWithIndexPath(
            this.restCollectionState.value.state,
            removedCollectionID.split("/").map((id) => parseInt(id))
          )
        : undefined

      removeRESTFolder(
        removedCollectionID,
        folderToRemove ? folderToRemove.id : undefined
      )
    }

    return Promise.resolve(E.right(undefined))
  }

  public async createRESTRequest(
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

    const { collectionID } = parentCollectionHandleRef.value.data

    const insertionIndex = saveRESTRequestAs(collectionID, newRequest)

    const requestID = `${collectionID}/${insertionIndex}`

    platform.analytics?.logEvent({
      type: "HOPP_SAVE_REQUEST",
      workspaceType: "personal",
      createdNow: true,
      platform: "rest",
    })

    // TODO: Verify whether a request update action is reflected correctly in the handle being returned below

    const personalWorkspaceHandle = this.getPersonalWorkspaceHandle()
    const createdRequestHandle = await this.getRESTRequestHandle(
      personalWorkspaceHandle,
      requestID
    )

    return createdRequestHandle
  }

  public removeRESTRequest(
    requestHandle: Handle<WorkspaceRequest>
  ): Promise<E.Either<unknown, void>> {
    const requestHandleRef = requestHandle.get()

    if (!isValidRequestHandle(requestHandleRef, this.providerID, "personal")) {
      return Promise.resolve(E.left("INVALID_REQUEST_HANDLE" as const))
    }

    const { collectionID, requestID: removedRequestID } =
      requestHandleRef.value.data

    const removedRequestIndexPos = parseInt(
      removedRequestID.split("/").slice(-1)[0]
    )

    const requestToRemove = navigateToFolderWithIndexPath(
      this.restCollectionState.value.state,
      collectionID.split("/").map((id: string) => parseInt(id))
    )?.requests[removedRequestIndexPos]

    // Iterate over issued handles and update affected requests
    this.issuedHandles.forEach((handle) => {
      if (
        handle.value.type === "invalid" ||
        !("requestID" in handle.value.data)
      ) {
        return
      }

      const { requestID } = handle.value.data

      // Invalidate the handle for the request being removed
      if (requestID === removedRequestID) {
        handle.value = {
          type: "invalid",
          reason: "REQUEST_INVALIDATED",
        }
        return
      }

      const resolvedRequestIndexPos = Number(requestID.split("/").slice(-1)[0])

      // Affected requests appear below the request being removed
      if (resolvedRequestIndexPos > removedRequestIndexPos) {
        handle.value.data.requestID = `${collectionID}/${
          resolvedRequestIndexPos - 1
        }`
      }
    })

    removeRESTRequest(collectionID, removedRequestIndexPos, requestToRemove?.id)

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
    const requestIndexPos = parseInt(requestID.split("/").slice(-1)[0])

    editRESTRequest(collectionID, requestIndexPos, newRequest)

    platform.analytics?.logEvent({
      type: "HOPP_SAVE_REQUEST",
      platform: "rest",
      createdNow: false,
      workspaceType: "personal",
    })

    const handleToUpdate = this.issuedHandles.find((handle) => {
      return (
        handle.value.type === "ok" &&
        "requestID" in handle.value.data &&
        handle.value.data.requestID === requestID
      )
    })

    if (
      handleToUpdate &&
      handleToUpdate.value.type === "ok" &&
      "requestID" in handleToUpdate.value.data
    ) {
      handleToUpdate.value.data.request.name = newRequest.name
    }

    return Promise.resolve(E.right(undefined))
  }

  public importRESTCollections(
    workspaceHandle: Handle<Workspace>,
    collections: HoppCollection[]
  ): Promise<E.Either<unknown, void>> {
    const workspaceHandleRef = workspaceHandle.get()
    if (
      !isValidWorkspaceHandle(workspaceHandleRef, this.providerID, "personal")
    ) {
      return Promise.resolve(E.left("INVALID_WORKSPACE_HANDLE" as const))
    }

    appendRESTCollections(collections)

    return Promise.resolve(E.right(undefined))
  }

  public async exportRESTCollections(
    workspaceHandle: Handle<Workspace>
  ): Promise<E.Either<unknown, void>> {
    const workspaceHandleRef = workspaceHandle.get()

    if (
      !isValidWorkspaceHandle(workspaceHandleRef, this.providerID, "personal")
    ) {
      return Promise.resolve(E.left("INVALID_WORKSPACE_HANDLE" as const))
    }

    const collectionsToExport = this.restCollectionState.value.state

    if (collectionsToExport.length === 0) {
      return Promise.resolve(E.left("NO_COLLECTIONS_TO_EXPORT" as const))
    }

    const result = await initializeDownloadFile(
      JSON.stringify(collectionsToExport, null, 2),
      `${workspaceHandleRef.value.data.workspaceID}-collections`
    )

    if (E.isLeft(result)) {
      return Promise.resolve(E.left("EXPORT_FAILED" as const))
    }

    platform.analytics?.logEvent({
      type: "HOPP_EXPORT_COLLECTION",
      exporter: "json",
      platform: "rest",
    })

    return Promise.resolve(E.right(undefined))
  }

  public async exportRESTCollection(
    collectionHandle: Handle<WorkspaceCollection>
  ): Promise<E.Either<unknown, void>> {
    const collectionHandleRef = collectionHandle.get()

    if (
      !isValidCollectionHandle(collectionHandleRef, this.providerID, "personal")
    ) {
      return Promise.resolve(E.left("INVALID_COLLECTION_HANDLE" as const))
    }

    const collection = navigateToFolderWithIndexPath(
      this.restCollectionState.value.state,
      collectionHandleRef.value.data.collectionID
        .split("/")
        .map((id) => parseInt(id))
    )

    if (!collection) {
      return Promise.resolve(E.left("COLLECTION_DOES_NOT_EXIST" as const))
    }

    const result = await initializeDownloadFile(
      JSON.stringify(collection, null, 2),
      collection.name
    )

    if (E.isLeft(result)) {
      return Promise.resolve(E.left("EXPORT_FAILED" as const))
    }

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

    const { collectionID: draggedCollectionID } = collectionHandleRef.value.data

    const draggedCollectionIsInRoot = this.isAlreadyInRoot(draggedCollectionID)

    // Reorder happens under the same parent collection
    const parentCollectionID = draggedCollectionIsInRoot
      ? null
      : draggedCollectionID.split("/").slice(0, -1).join("/")

    const parentCollectionSize = draggedCollectionIsInRoot
      ? this.restCollectionState.value.state.length
      : getFoldersByPath(
          this.restCollectionState.value.state,
          parentCollectionID as string
        ).length

    const draggedCollectionIndexPos = this.pathToLastIndex(draggedCollectionID)
    const destinationCollectionIndexPos =
      destinationCollectionID === null
        ? parentCollectionSize - 1
        : this.pathToLastIndex(destinationCollectionID)

    // Reordering a collection from top to bottom will require reducing `1` from the index position to arrive at the resultant ID
    // This is to account for the collection being moved
    // This is not required for the case where the destination is the last position where the index position is computed here and not supplied from the component
    const resolvedDestinationCollectionIDPostfix =
      destinationCollectionID === null
        ? destinationCollectionIndexPos
        : destinationCollectionIndexPos - 1

    const resolvedDestinationCollectionID =
      destinationCollectionIndexPos > draggedCollectionIndexPos
        ? `${destinationCollectionID}/${resolvedDestinationCollectionIDPostfix}`
        : destinationCollectionID

    const resolvedDestinationCollectionIndexPos =
      resolvedDestinationCollectionID === null
        ? parentCollectionSize - 1
        : this.pathToLastIndex(resolvedDestinationCollectionID)

    const affectedCollectionIndices = getAffectedIndexes(
      draggedCollectionIndexPos,
      resolvedDestinationCollectionIndexPos
    )

    // Compile the handle indices within `issuedHandles` along with the ID to update it based on the affected collection indices
    // This is done in multiple steps since finding the corresponding handle and updating it straightaway would result in ambiguities
    // Updating the request ID for a certain handle and attempting to find the handle corresponding to the same ID in the next iteration would pick the former handle

    // Compile update information
    const handleUpdateMap: Map<
      string,
      { oldCollectionID: string; newCollectionID: string }
    > = new Map()

    this.issuedHandles.forEach((handle) => {
      if (handle.value.type === "ok" && "requestID" in handle.value.data) {
        Array.from(affectedCollectionIndices).forEach(
          ([oldCollectionIndexPos, newCollectionIndexPos]) => {
            const resolvedParentCollectionID =
              parentCollectionID === null ? "" : `${parentCollectionID}/`

            const oldCollectionID = `${resolvedParentCollectionID}${oldCollectionIndexPos}`
            const newCollectionID = `${resolvedParentCollectionID}${newCollectionIndexPos}`

            if (
              handle.value.type === "ok" &&
              "requestID" in handle.value.data &&
              handle.value.data.requestID.startsWith(oldCollectionID)
            ) {
              handleUpdateMap.set(handle.value.data.requestID, {
                oldCollectionID,
                newCollectionID,
              })
            }
          }
        )
      }
    })

    // Apply collected updates
    this.issuedHandles.forEach((handle) => {
      if (handle.value.type === "ok" && "requestID" in handle.value.data) {
        const { collectionID, requestID } = handle.value.data

        const updateInfo = handleUpdateMap.get(requestID)

        if (updateInfo) {
          const { oldCollectionID, newCollectionID } = updateInfo

          handle.value.data.collectionID = collectionID.replace(
            oldCollectionID,
            newCollectionID
          )

          handle.value.data.requestID = requestID.replace(
            oldCollectionID,
            newCollectionID
          )
        }
      }
    })

    updateRESTCollectionOrder(draggedCollectionID, destinationCollectionID)

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

    const draggedCollectionIsInRoot = this.isAlreadyInRoot(draggedCollectionID)

    const draggedParentCollectionID = draggedCollectionIsInRoot
      ? draggedCollectionID
      : draggedCollectionID.split("/").slice(0, -1).join("/")

    const isMoveToSiblingCollection = draggedCollectionIsInRoot
      ? destinationCollectionID === null
        ? // Move to root
          this.restCollectionState.value.state.length.toString()
        : this.isAlreadyInRoot(destinationCollectionID)
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

      // The count of child collections within the destination collection will be the new index position
      // Appended to the `resolvedDestinationCollectionID`
      const resolvedDestinationCollectionIndexPos = getFoldersByPath(
        this.restCollectionState.value.state,
        destinationCollectionID
      ).length

      const draggedCollectionIDStrLength = draggedCollectionID.split("/").length

      // Obtain a subset of the destination collection ID till the dragged collection ID string length
      const destinationCollectionIDSubset = destinationCollectionID
        .split("/")
        .slice(0, draggedCollectionIDStrLength)
        .join("/")

      const destinationCollectionIDSubsetIndexPos = this.pathToLastIndex(
        destinationCollectionIDSubset
      )

      // Indicates a move from a collection at the top to a sibling collection below it
      if (
        isMoveToSiblingCollection &&
        destinationCollectionIDSubsetIndexPos > draggedCollectionIndexPos
      ) {
        // Only update the index position at the level of the dragged collection
        // This ensures moves to deeply any nested collections are accounted

        const destinationParentCollectionIDSubset =
          destinationCollectionIDSubset.split("/").slice(0, -1).join("/")

        // Reduce `1` from the index position to account for the dragged collection
        // Dragged collection doesn't exist anymore at the previous level
        const collectionIDSubsetIndexPos =
          destinationCollectionIDSubsetIndexPos - 1

        // Replace the destination collection ID with `1` reduced from the index position
        const replacedDestinationCollectionID = destinationCollectionID.replace(
          destinationCollectionIDSubset,
          `${destinationParentCollectionIDSubset}/${collectionIDSubsetIndexPos}`
        )

        const resolvedDestinationCollectionIDPrefix = draggedCollectionIsInRoot
          ? collectionIDSubsetIndexPos
          : replacedDestinationCollectionID

        resolvedDestinationCollectionID = `${resolvedDestinationCollectionIDPrefix}/${resolvedDestinationCollectionIndexPos}`
      } else {
        resolvedDestinationCollectionID = `${destinationCollectionID}/${resolvedDestinationCollectionIndexPos}`
      }
    }

    const draggedParentCollectionSize = draggedCollectionIsInRoot
      ? this.restCollectionState.value.state.length
      : getFoldersByPath(
          this.restCollectionState.value.state,
          draggedParentCollectionID
        ).length

    const affectedParentCollectionIDRange =
      draggedParentCollectionSize - 1 - draggedCollectionIndexPos

    const affectedIDsMap = new Map<
      string,
      { collectionID: string; requestID: string }
    >()

    // Compile the new collection and request IDs for the requests under the dragged collection
    this.issuedHandles.forEach((handle) => {
      if (
        handle.value.type === "invalid" ||
        !("requestID" in handle.value.data)
      ) {
        return
      }

      const { collectionID, requestID } = handle.value.data

      if (requestID.startsWith(draggedCollectionID)) {
        const newCollectionID = collectionID.replace(
          draggedCollectionID,
          resolvedDestinationCollectionID
        )
        const affectedRequestIndexPos = requestID.split("/").slice(-1)[0]
        affectedIDsMap.set(requestID, {
          collectionID: newCollectionID,
          requestID: `${newCollectionID}/${affectedRequestIndexPos}`,
        })
      }
    })

    // Compile the new collection and request IDs for the requests under the affected collections due to the move
    for (let idx = 1; idx <= affectedParentCollectionIDRange; idx++) {
      const affectedCollectionIndexPos = draggedCollectionIndexPos + idx

      const affectedCollectionID = `${draggedParentCollectionID}/${affectedCollectionIndexPos}`
      const newAffectedCollectionID = `${draggedParentCollectionID}/${
        affectedCollectionIndexPos - 1
      }`

      this.issuedHandles.forEach((handle) => {
        if (
          handle.value.type === "invalid" ||
          !("requestID" in handle.value.data)
        ) {
          return
        }

        if (handle.value.data.requestID.startsWith(affectedCollectionID)) {
          const { collectionID, requestID } = handle.value.data

          affectedIDsMap.set(requestID, {
            collectionID: collectionID.replace(
              affectedCollectionID,
              newAffectedCollectionID
            ),

            requestID: requestID.replace(
              affectedCollectionID,
              newAffectedCollectionID
            ),
          })
        }
      })
    }

    // Apply updates at the last phase to avoid ambiguities based on the compiled affected IDs
    this.issuedHandles.forEach((handle) => {
      if (
        handle.value.type === "invalid" ||
        !("requestID" in handle.value.data)
      ) {
        return
      }

      const affectedIDs = affectedIDsMap.get(handle.value.data.requestID)

      if (affectedIDs) {
        handle.value.data.collectionID = affectedIDs.collectionID
        handle.value.data.requestID = affectedIDs.requestID
      }
    })

    moveRESTFolder(
      collectionHandleRef.value.data.collectionID,
      destinationCollectionID
    )

    return Promise.resolve(E.right(undefined))
  }

  public reorderRESTRequest(
    requestHandle: Handle<WorkspaceRequest>,
    destinationRequestID: string | null
  ): Promise<E.Either<unknown, void>> {
    const requestHandleRef = requestHandle.get()

    if (!isValidRequestHandle(requestHandleRef, this.providerID, "personal")) {
      return Promise.resolve(E.left("INVALID_REQUEST_HANDLE" as const))
    }

    const { collectionID, requestID: draggedRequestID } =
      requestHandleRef.value.data

    const collectionRequestCount = getRequestsByPath(
      this.restCollectionState.value.state,
      collectionID
    ).length

    const draggedRequestIndexPos = this.pathToLastIndex(draggedRequestID)
    const destinationRequestIndexPos =
      destinationRequestID === null
        ? collectionRequestCount - 1
        : this.pathToLastIndex(destinationRequestID)

    // Reordering a request from top to bottom will require reducing `1` from the index position to arrive at the resultant ID
    // This is to account for the request being moved
    // This is not required for the case where the destination is the last position where the index position is computed here and not supplied from the component
    const resolvedDestinationRequestIDPostfix =
      destinationRequestID === null
        ? destinationRequestIndexPos
        : destinationRequestIndexPos - 1

    const resolvedDestinationRequestID =
      destinationRequestIndexPos > draggedRequestIndexPos
        ? `${collectionID}/${resolvedDestinationRequestIDPostfix}`
        : destinationRequestID

    const resolvedDestinationRequestIndexPos =
      resolvedDestinationRequestID === null
        ? collectionRequestCount - 1
        : this.pathToLastIndex(resolvedDestinationRequestID)

    // Compute the affected request IDs
    // Maps the previous request ID to the new one affected by the reorder
    const affectedRequestIndices = getAffectedIndexes(
      draggedRequestIndexPos,
      resolvedDestinationRequestIndexPos
    )

    // Compile the handle indices within `issuedHandles` along with the ID to update it based on the affected request indices
    // This is done in 2 steps since finding the corresponding handle and updating it straightaway would result in ambiguities
    // Updating the request ID for a certain handle and attempting to find the handle corresponding to the same ID would pick the former handle

    // Construct a map with the handle index positions from the `issuedHandles`array  mapped to the respective request IDs
    const handleIdxMap = new Map()

    this.issuedHandles.forEach((handle, idx) => {
      if (handle.value.type === "ok" && "requestID" in handle.value.data) {
        const { requestID } = handle.value.data
        handleIdxMap.set(requestID, idx)
      }
    })

    const affectedRequestHandleIndices: {
      affectedRequestHandleIdx: number
      newRequestIndexPos: number
    }[] = []

    // Compile a list with the affected request handle index positions from the `issuedHandles` array and the new request index position
    Array.from(affectedRequestIndices).forEach(
      ([oldRequestIndexPos, newRequestIndexPos]) => {
        const requestID = `${collectionID}/${oldRequestIndexPos}`
        const affectedRequestHandleIdx = handleIdxMap.get(requestID)

        if (Number.isFinite(affectedRequestHandleIdx)) {
          affectedRequestHandleIndices.push({
            affectedRequestHandleIdx,
            newRequestIndexPos,
          })
        }
      }
    )

    // Update the request IDs for the affected handles
    affectedRequestHandleIndices.forEach(
      ({ affectedRequestHandleIdx, newRequestIndexPos }) => {
        const handle = this.issuedHandles[affectedRequestHandleIdx]
        if (
          handle &&
          handle.value.type === "ok" &&
          "requestID" in handle.value.data
        ) {
          handle.value.data.requestID = `${collectionID}/${newRequestIndexPos}`
        }
      }
    )

    updateRESTRequestOrder(
      this.pathToLastIndex(draggedRequestID),
      destinationRequestID ? destinationRequestIndexPos : null,
      collectionID
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

    const {
      collectionID: draggedRequestCollectionID,
      requestID: draggedRequestID,
    } = requestHandleRef.value.data

    const draggedRequestIndexPos = this.pathToLastIndex(draggedRequestID)

    // Iterate over issued handles to find the dragged request handle
    const draggedRequestHandle = this.issuedHandles.find((handle) => {
      return (
        handle.value.type === "ok" &&
        "requestID" in handle.value.data &&
        handle.value.data?.requestID === draggedRequestID
      )
    })

    if (!draggedRequestHandle) {
      return Promise.resolve(E.left("INVALID_REQUEST_HANDLE" as const))
    }

    const destinationCollectionReqCount = getRequestsByPath(
      this.restCollectionState.value.state,
      destinationCollectionID
    ).length

    // Iterate over issued handles and update affected requests
    this.issuedHandles.forEach((handle) => {
      if (
        handle.value.type === "invalid" ||
        !("requestID" in handle.value.data)
      ) {
        return
      }

      const { requestID } = handle.value.data

      // Update the dragged request handle to the new collection
      if (requestID === draggedRequestID) {
        handle.value.data.collectionID = destinationCollectionID
        handle.value.data.requestID = `${destinationCollectionID}/${destinationCollectionReqCount}`
        return
      }

      // Check if this request is in the same collection as the dragged request
      if (requestID.startsWith(draggedRequestCollectionID)) {
        const resolvedRequestIndexPos = Number(
          requestID.split("/").slice(-1)[0]
        )

        // If the request is below the dragged request, it needs to be updated
        if (resolvedRequestIndexPos > draggedRequestIndexPos) {
          handle.value.data.requestID = `${draggedRequestCollectionID}/${
            resolvedRequestIndexPos - 1
          }`
        }
      }
    })

    moveRESTRequest(
      draggedRequestCollectionID,
      draggedRequestIndexPos,
      destinationCollectionID
    )

    return Promise.resolve(E.right(undefined))
  }

  public getRESTCollectionHandle(
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
      return Promise.resolve(E.left("COLLECTION_DOES_NOT_EXIST"))
    }

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

            const { providerID, workspaceID } = workspaceHandleRef.value.data

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

  public getRESTRequestHandle(
    workspaceHandle: Handle<Workspace>,
    requestID: string
  ): Promise<E.Either<unknown, Handle<WorkspaceRequest>>> {
    const workspaceHandleRef = workspaceHandle.get()

    if (
      !isValidWorkspaceHandle(workspaceHandleRef, this.providerID, "personal")
    ) {
      return Promise.resolve(E.left("INVALID_WORKSPACE_HANDLE" as const))
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
          reason: "INVALID_WORKSPACE_HANDLE" as const,
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

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  public getRESTEnvironmentHandle(
    workspaceHandle: Handle<Workspace>,
    environmentID: number
  ): Promise<E.Either<unknown, Handle<WorkspaceEnvironment>>> {
    const workspaceHandleRef = workspaceHandle.get()

    if (
      !isValidWorkspaceHandle(workspaceHandleRef, this.providerID, "personal")
    ) {
      return Promise.resolve(E.left("INVALID_WORKSPACE_HANDLE" as const))
    }

    const environment = this.restEnvironmentState.value[environmentID]

    // Out of bounds check
    if (!environment) {
      return Promise.resolve(E.left("ENVIRONMENT_DOES_NOT_EXIST"))
    }

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

            const { providerID, workspaceID } = workspaceHandleRef.value.data

            return {
              type: "ok",
              data: {
                providerID,
                workspaceID,
                environmentID,
                name: environment.name,
              },
            }
          })
        ),
      })
    )
  }

  public getRESTCollectionLevelAuthHeadersView(
    collectionHandle: Handle<WorkspaceCollection>
  ): Promise<E.Either<never, Handle<CollectionLevelAuthHeadersView>>> {
    const collectionHandleRef = collectionHandle.get()

    const collectionStore = this.restCollectionState.value.state

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
                collectionStore,
                [...path.slice(0, i + 1)] // Create a copy of the path array
              )

              // Check if parentFolder is undefined or null
              if (!parentFolder) {
                console.error("Parent folder not found for path:", path)
                return { type: "ok", data: { auth, headers } }
              }

              const { auth: parentFolderAuth, headers: parentFolderHeaders } =
                parentFolder

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

  public getRESTSearchResultsView(
    workspaceHandle: Handle<Workspace>,
    searchQuery: Ref<string>
  ): Promise<E.Either<never, Handle<SearchResultsView>>> {
    const results = ref<HoppCollection[]>([])

    const collectionStore = this.restCollectionState.value.state

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
            results.value = collectionStore
            return
          }

          const filteredCollections = collectionStore
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
  ): Promise<E.Either<never, Handle<CollectionJSONView>>> {
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

  public getRESTEnvironmentsView(
    workspaceHandle: Handle<Workspace>
  ): Promise<E.Either<never, Handle<RESTEnvironmentsView>>> {
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
                environments: this.restEnvironmentState,
              },
            })
          })
        ),
      })
    )
  }

  // GQL methods
  public getGQLCollectionHandle(
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
      this.gqlCollectionState.value.state,
      collectionID.split("/").map((x) => parseInt(x))
    )

    if (!collection) {
      return Promise.resolve(E.left("COLLECTION_DOES_NOT_EXIST"))
    }

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

            const { providerID, workspaceID } = workspaceHandleRef.value.data

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

  public getGQLRequestHandle(
    workspaceHandle: Handle<Workspace>,
    requestID: string
  ): Promise<E.Either<unknown, Handle<WorkspaceRequest>>> {
    const workspaceHandleRef = workspaceHandle.get()

    if (
      !isValidWorkspaceHandle(workspaceHandleRef, this.providerID, "personal")
    ) {
      return Promise.resolve(E.left("INVALID_WORKSPACE_HANDLE" as const))
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
      this.gqlCollectionState.value.state,
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
          reason: "INVALID_WORKSPACE_HANDLE" as const,
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

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  public getGQLCollectionLevelAuthHeadersView(
    collectionHandle: Handle<WorkspaceCollection>
  ): Promise<E.Either<never, Handle<CollectionLevelAuthHeadersView>>> {
    const collectionHandleRef = collectionHandle.get()

    const collectionStore = this.gqlCollectionState.value.state

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
                collectionStore,
                [...path.slice(0, i + 1)] // Create a copy of the path array
              )

              // Check if parentFolder is undefined or null
              if (!parentFolder) {
                console.error("Parent folder not found for path:", path)
                return { type: "ok", data: { auth, headers } }
              }

              const { auth: parentFolderAuth, headers: parentFolderHeaders } =
                parentFolder

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

  public getGQLSearchResultsView(
    workspaceHandle: Handle<Workspace>,
    searchQuery: Ref<string>
  ): Promise<E.Either<never, Handle<SearchResultsView>>> {
    const results = ref<HoppCollection[]>([])

    const collectionStore = this.gqlCollectionState.value.state

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
            results.value = collectionStore
            return
          }

          const filteredCollections = collectionStore
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

  public async createGQLRootCollection(
    workspaceHandle: Handle<Workspace>,
    newCollection: Partial<Exclude<HoppCollection, "id">> & { name: string }
  ): Promise<E.Either<unknown, Handle<WorkspaceCollection>>> {
    const workspaceHandleRef = workspaceHandle.get()

    if (
      !isValidWorkspaceHandle(workspaceHandleRef, this.providerID, "personal")
    ) {
      return Promise.resolve(E.left("INVALID_WORKSPACE_HANDLE" as const))
    }

    const newCollectionID =
      this.gqlCollectionState.value.state.length.toString()

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

    addGraphqlCollection(newRootCollection)

    platform.analytics?.logEvent({
      type: "HOPP_CREATE_COLLECTION",
      isRootCollection: true,
      platform: "gql",
      workspaceType: "personal",
    })

    // TODO: Verify whether a collection update action is reflected correctly in the handle being returned below

    const createdCollectionHandle = await this.getRESTCollectionHandle(
      workspaceHandle,
      newCollectionID
    )

    return createdCollectionHandle
  }

  public async createGQLChildCollection(
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

    const { collectionID } = parentCollectionHandleRef.value.data

    const newCollectionName = newChildCollection.name

    addGraphqlFolder(newCollectionName, collectionID)

    platform.analytics?.logEvent({
      type: "HOPP_CREATE_COLLECTION",
      isRootCollection: false,
      platform: "gql",
      workspaceType: "personal",
    })

    const newChildCollectionID = `${collectionID}/${
      getFoldersByPath(this.gqlCollectionState.value.state, collectionID)
        .length - 1
    }`

    // TODO: Verify whether a collection update action is reflected correctly in the handle being returned below

    const createdCollectionHandle = await this.getRESTCollectionHandle(
      parentCollectionHandle,
      newChildCollectionID
    )

    return createdCollectionHandle
  }

  public async createGQLRequest(
    parentCollectionHandle: Handle<WorkspaceCollection>,
    newRequest: HoppGQLRequest
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

    const { collectionID } = parentCollectionHandleRef.value.data

    saveGraphqlRequestAs(collectionID, newRequest)

    const requestIndexPos =
      getRequestsByPath(this.gqlCollectionState.value.state, collectionID)
        .length - 1
    const requestID = `${collectionID}/${requestIndexPos}`

    platform.analytics?.logEvent({
      type: "HOPP_SAVE_REQUEST",
      platform: "gql",
      createdNow: true,
      workspaceType: "personal",
    })

    // TODO: Verify whether a request update action is reflected correctly in the handle being returned below

    const personalWorkspaceHandle = this.getPersonalWorkspaceHandle()
    const createdRequestHandle = await this.getRESTRequestHandle(
      personalWorkspaceHandle,
      requestID
    )

    return createdRequestHandle
  }

  public updateGQLRequest(
    requestHandle: Handle<WorkspaceRequest>,
    updatedRequest: Partial<HoppGQLRequest>
  ): Promise<E.Either<unknown, void>> {
    const requestHandleRef = requestHandle.get()

    if (!isValidRequestHandle(requestHandleRef, this.providerID, "personal")) {
      return Promise.resolve(E.left("INVALID_REQUEST_HANDLE" as const))
    }

    delete updatedRequest.id

    const { collectionID, requestID, request } = requestHandleRef.value.data

    const newRequest: HoppGQLRequest = merge(request, updatedRequest)
    const requestIndexPos = parseInt(requestID.split("/").slice(-1)[0])

    editGraphqlRequest(collectionID, requestIndexPos, newRequest)

    platform.analytics?.logEvent({
      type: "HOPP_SAVE_REQUEST",
      platform: "gql",
      createdNow: false,
      workspaceType: "personal",
    })

    const handleToUpdate = this.issuedHandles.find((handle) => {
      return (
        handle.value.type === "ok" &&
        "requestID" in handle.value.data &&
        handle.value.data.requestID === requestID
      )
    })

    if (
      handleToUpdate &&
      handleToUpdate.value.type === "ok" &&
      "requestID" in handleToUpdate.value.data
    ) {
      handleToUpdate.value.data.request.name = newRequest.name
    }

    return Promise.resolve(E.right(undefined))
  }

  public moveGQLRequest(
    requestHandle: Handle<WorkspaceRequest>,
    destinationCollectionID: string
  ): Promise<E.Either<unknown, void>> {
    const requestHandleRef = requestHandle.get()

    if (!isValidRequestHandle(requestHandleRef, this.providerID, "personal")) {
      return Promise.resolve(E.left("INVALID_REQUEST_HANDLE" as const))
    }

    const {
      collectionID: draggedRequestCollectionID,
      requestID: draggedRequestID,
    } = requestHandleRef.value.data

    const draggedRequestIndexPos = this.pathToLastIndex(draggedRequestID)

    // Iterate over issued handles to find the dragged request handle
    const draggedRequestHandle = this.issuedHandles.find((handle) => {
      return (
        handle.value.type === "ok" &&
        "requestID" in handle.value.data &&
        handle.value.data?.requestID === draggedRequestID
      )
    })

    if (!draggedRequestHandle) {
      return Promise.resolve(E.left("INVALID_REQUEST_HANDLE" as const))
    }

    const destinationCollectionReqCount = getRequestsByPath(
      this.gqlCollectionState.value.state,
      destinationCollectionID
    ).length

    // Iterate over issued handles and update affected requests
    this.issuedHandles.forEach((handle) => {
      if (
        handle.value.type === "invalid" ||
        !("requestID" in handle.value.data)
      ) {
        return
      }

      const { requestID } = handle.value.data

      // Update the dragged request handle to the new collection
      if (requestID === draggedRequestID) {
        handle.value.data.collectionID = destinationCollectionID
        handle.value.data.requestID = `${destinationCollectionID}/${destinationCollectionReqCount}`
        return
      }

      // Check if this request is in the same collection as the dragged request
      if (requestID.startsWith(draggedRequestCollectionID)) {
        const resolvedRequestIndexPos = Number(
          requestID.split("/").slice(-1)[0]
        )

        // If the request is below the dragged request, it needs to be updated
        if (resolvedRequestIndexPos > draggedRequestIndexPos) {
          handle.value.data.requestID = `${draggedRequestCollectionID}/${
            resolvedRequestIndexPos - 1
          }`
        }
      }
    })

    moveGraphqlRequest(
      draggedRequestCollectionID,
      draggedRequestIndexPos,
      destinationCollectionID
    )

    return Promise.resolve(E.right(undefined))
  }

  public async updateGQLCollection(
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
      this.gqlCollectionState.value.state,
      collectionID.split("/").map((id) => parseInt(id))
    )

    const newCollection = { ...collection, ...updatedCollection }

    const isRootCollection = collectionID.split("/").length === 1

    if (isRootCollection) {
      editGraphqlCollection(parseInt(collectionID), newCollection)
    } else {
      editGraphqlFolder(collectionID, newCollection)
    }

    const updatedCollectionHandle = await this.getRESTCollectionHandle(
      this.getPersonalWorkspaceHandle(),
      collectionID
    )

    if (E.isRight(updatedCollectionHandle)) {
      const updatedCollectionHandleRef = updatedCollectionHandle.right.get()

      if (updatedCollectionHandleRef.value.type === "ok") {
        // Name is guaranteed to be present for a collection
        updatedCollectionHandleRef.value.data.name = newCollection.name!
      }
    }

    return Promise.resolve(E.right(undefined))
  }

  public async removeGQLCollection(
    collectionHandle: Handle<WorkspaceCollection>
  ): Promise<E.Either<unknown, void>> {
    const collectionHandleRef = collectionHandle.get()

    if (
      !isValidCollectionHandle(collectionHandleRef, this.providerID, "personal")
    ) {
      return Promise.resolve(E.left("INVALID_COLLECTION_HANDLE" as const))
    }

    const { collectionID: removedCollectionID } = collectionHandleRef.value.data

    const isRootCollection = this.isAlreadyInRoot(removedCollectionID)

    const collectionIndexPos = isRootCollection
      ? parseInt(removedCollectionID)
      : this.pathToLastIndex(removedCollectionID)

    const removedCollectionHandle = await this.getRESTCollectionHandle(
      this.getPersonalWorkspaceHandle(),
      removedCollectionID
    )

    if (E.isRight(removedCollectionHandle)) {
      const removedCollectionHandleRef = removedCollectionHandle.right.get()

      if (removedCollectionHandleRef.value.type === "ok") {
        removedCollectionHandleRef.value = {
          type: "invalid",
          reason: "COLLECTION_INVALIDATED",
        }
      }
    }

    this.issuedHandles.forEach((handle) => {
      if (
        handle.value.type === "invalid" ||
        !("requestID" in handle.value.data)
      ) {
        return
      }

      const { requestID } = handle.value.data

      if (requestID.startsWith(removedCollectionID)) {
        handle.value = {
          type: "invalid",
          reason: "REQUEST_INVALIDATED",
        }

        return
      }

      const removedCollectionIDStrLen = removedCollectionID.split("/").length

      // Obtain the subset of the request ID till the removed collection ID string length
      const requestIDSubset = requestID
        .split("/")
        .slice(0, removedCollectionIDStrLen)
        .join("/")

      const parentRequestIDSubset = requestIDSubset
        .split("/")
        .slice(0, -1)
        .join("/")

      // Obtain the index position of the matching collection ID
      const matchingCollectionIndexPos = this.pathToLastIndex(requestIDSubset)

      // If the collection lies below the removed collection, reduce the index position for child request handles by `1`
      if (matchingCollectionIndexPos > collectionIndexPos) {
        const newCollectionIndexPos = matchingCollectionIndexPos - 1
        const newMatchingCollectionID = `${parentRequestIDSubset}${newCollectionIndexPos}`

        const newRequestID = requestID.replace(
          requestIDSubset,
          newMatchingCollectionID
        )

        handle.value.data.collectionID = newRequestID
          .split("/")
          .slice(0, -1)
          .join("/")

        handle.value.data.requestID = newRequestID
      }
    })

    if (isRootCollection) {
      const collectionToRemove = navigateToFolderWithIndexPath(
        this.gqlCollectionState.value.state,
        [collectionIndexPos]
      )

      removeGraphqlCollection(
        collectionIndexPos,
        collectionToRemove ? collectionToRemove.id : undefined
      )
    } else {
      const folderToRemove = path
        ? navigateToFolderWithIndexPath(
            this.gqlCollectionState.value.state,
            removedCollectionID.split("/").map((id) => parseInt(id))
          )
        : undefined

      removeRESTFolder(
        removedCollectionID,
        folderToRemove ? folderToRemove.id : undefined
      )

      removeGraphqlFolder(
        removedCollectionID,
        folderToRemove ? folderToRemove.id : undefined
      )
    }

    return Promise.resolve(E.right(undefined))
  }

  public removeGQLRequest(
    requestHandle: Handle<WorkspaceRequest>
  ): Promise<E.Either<unknown, void>> {
    const requestHandleRef = requestHandle.get()

    if (!isValidRequestHandle(requestHandleRef, this.providerID, "personal")) {
      return Promise.resolve(E.left("INVALID_REQUEST_HANDLE" as const))
    }

    const { collectionID, requestID: removedRequestID } =
      requestHandleRef.value.data

    const removedRequestIndexPos = parseInt(
      removedRequestID.split("/").slice(-1)[0]
    )

    const requestToRemove = navigateToFolderWithIndexPath(
      this.gqlCollectionState.value.state,
      collectionID.split("/").map((id: string) => parseInt(id))
    )?.requests[removedRequestIndexPos]

    // Iterate over issued handles and update affected requests
    this.issuedHandles.forEach((handle) => {
      if (
        handle.value.type === "invalid" ||
        !("requestID" in handle.value.data)
      ) {
        return
      }

      const { requestID } = handle.value.data

      // Invalidate the handle for the request being removed
      if (requestID === removedRequestID) {
        handle.value = {
          type: "invalid",
          reason: "REQUEST_INVALIDATED",
        }
        return
      }

      const resolvedRequestIndexPos = Number(requestID.split("/").slice(-1)[0])

      // Affected requests appear below the request being removed
      if (resolvedRequestIndexPos > removedRequestIndexPos) {
        handle.value.data.requestID = `${collectionID}/${
          resolvedRequestIndexPos - 1
        }`
      }
    })

    removeGraphqlRequest(
      collectionID,
      removedRequestIndexPos,
      requestToRemove?.id
    )

    return Promise.resolve(E.right(undefined))
  }

  public importGQLCollections(
    workspaceHandle: Handle<Workspace>,
    collections: HoppCollection[]
  ): Promise<E.Either<unknown, void>> {
    const workspaceHandleRef = workspaceHandle.get()
    if (
      !isValidWorkspaceHandle(workspaceHandleRef, this.providerID, "personal")
    ) {
      return Promise.resolve(E.left("INVALID_WORKSPACE_HANDLE" as const))
    }

    appendGraphqlCollections(collections)

    return Promise.resolve(E.right(undefined))
  }

  public async exportGQLCollections(
    workspaceHandle: Handle<Workspace>
  ): Promise<E.Either<unknown, void>> {
    const workspaceHandleRef = workspaceHandle.get()

    if (
      !isValidWorkspaceHandle(workspaceHandleRef, this.providerID, "personal")
    ) {
      return Promise.resolve(E.left("INVALID_WORKSPACE_HANDLE" as const))
    }

    const collectionsToExport = this.gqlCollectionState.value.state

    if (collectionsToExport.length === 0) {
      return Promise.resolve(E.left("NO_COLLECTIONS_TO_EXPORT" as const))
    }

    const result = await initializeDownloadFile(
      JSON.stringify(collectionsToExport, null, 2),
      `${workspaceHandleRef.value.data.workspaceID}-collections`
    )

    if (E.isLeft(result)) {
      return Promise.resolve(E.left("EXPORT_FAILED" as const))
    }

    platform.analytics?.logEvent({
      type: "HOPP_EXPORT_COLLECTION",
      exporter: "json",
      platform: "gql",
    })

    return Promise.resolve(E.right(undefined))
  }

  public async createRESTEnvironment(
    workspaceHandle: Handle<Workspace>,
    newEnvironment: Partial<Environment> & { name: string }
  ): Promise<E.Either<unknown, Handle<WorkspaceEnvironment>>> {
    const workspaceHandleRef = workspaceHandle.get()

    if (
      !isValidWorkspaceHandle(workspaceHandleRef, this.providerID, "personal")
    ) {
      return Promise.resolve(E.left("INVALID_WORKSPACE_HANDLE" as const))
    }

    createEnvironment(
      newEnvironment.name,
      newEnvironment.variables,
      newEnvironment.id
    )

    platform.analytics?.logEvent({
      type: "HOPP_CREATE_ENVIRONMENT",
      workspaceType: "personal",
    })

    const createdEnvironmentHandle = await this.getRESTEnvironmentHandle(
      workspaceHandle,
      this.restEnvironmentState.value.length - 1
    )

    return createdEnvironmentHandle
  }

  public async duplicateRESTEnvironment(
    environmentHandle: Handle<WorkspaceEnvironment>
  ): Promise<E.Either<unknown, Handle<WorkspaceEnvironment>>> {
    const environmentHandleRef = environmentHandle.get()

    if (
      !isValidEnvironmentHandle(
        environmentHandleRef,
        this.providerID,
        "personal"
      )
    ) {
      return Promise.resolve(E.left("INVALID_ENVIRONMENT_HANDLE" as const))
    }

    duplicateEnvironment(environmentHandleRef.value.data.environmentID)

    const createdEnvironmentHandle = await this.getRESTEnvironmentHandle(
      this.getPersonalWorkspaceHandle(),
      this.restEnvironmentState.value.length - 1
    )

    return createdEnvironmentHandle
  }

  public async updateRESTEnvironment(
    environmentHandle: Handle<WorkspaceEnvironment>,
    updatedEnvironment: Partial<Environment>
  ): Promise<E.Either<unknown, void>> {
    const environmentHandleRef = environmentHandle.get()

    if (
      !isValidEnvironmentHandle(
        environmentHandleRef,
        this.providerID,
        "personal"
      )
    ) {
      return Promise.resolve(E.left("INVALID_ENVIRONMENT_HANDLE" as const))
    }

    const { environmentID } = environmentHandleRef.value.data

    const existingEnvironment =
      this.restEnvironmentState.value[
        environmentHandleRef.value.data.environmentID
      ]

    const { id: environmentSyncID } = existingEnvironment

    const newEnvironment = {
      ...existingEnvironment,
      ...updatedEnvironment,
    }

    updateEnvironment(
      environmentID,
      environmentSyncID
        ? {
            ...newEnvironment,
            id: environmentSyncID,
          }
        : {
            ...newEnvironment,
          }
    )

    const updatedEnvironmentHandle = await this.getRESTEnvironmentHandle(
      this.getPersonalWorkspaceHandle(),
      environmentID
    )

    if (E.isRight(updatedEnvironmentHandle)) {
      const updatedEnvironmentHandleRef = updatedEnvironmentHandle.right.get()

      if (updatedEnvironmentHandleRef.value.type === "ok") {
        updatedEnvironmentHandleRef.value.data.name = newEnvironment.name
      }
    }

    return Promise.resolve(E.right(undefined))
  }

  public async removeRESTEnvironment(
    environmentHandle: Handle<WorkspaceEnvironment>
  ): Promise<E.Either<unknown, void>> {
    const environmentHandleRef = environmentHandle.get()

    if (
      !isValidEnvironmentHandle(
        environmentHandleRef,
        this.providerID,
        "personal"
      )
    ) {
      return Promise.resolve(E.left("INVALID_ENVIRONMENT_HANDLE" as const))
    }

    const { environmentID } = environmentHandleRef.value.data

    const removedEnvironmentHandle = await this.getRESTEnvironmentHandle(
      this.getPersonalWorkspaceHandle(),
      environmentID
    )

    if (E.isRight(removedEnvironmentHandle)) {
      const removedEnvironmentHandleRef = removedEnvironmentHandle.right.get()

      if (removedEnvironmentHandleRef.value.type === "ok") {
        removedEnvironmentHandleRef.value = {
          type: "invalid",
          reason: "ENVIRONMENT_INVALIDATED",
        }
      }
    }

    const { id: environmentSyncID } =
      this.restEnvironmentState.value[environmentID]

    deleteEnvironment(environmentID, environmentSyncID)

    return Promise.resolve(E.right(undefined))
  }

  public importRESTEnvironments(
    workspaceHandle: Handle<Workspace>,
    environments: Environment[]
  ): Promise<E.Either<unknown, void>> {
    const workspaceHandleRef = workspaceHandle.get()
    if (
      !isValidWorkspaceHandle(workspaceHandleRef, this.providerID, "personal")
    ) {
      return Promise.resolve(E.left("INVALID_WORKSPACE_HANDLE" as const))
    }

    appendEnvironments(environments)

    return Promise.resolve(E.right(undefined))
  }

  public async exportRESTEnvironments(
    workspaceHandle: Handle<Workspace>
  ): Promise<E.Either<unknown, void>> {
    const workspaceHandleRef = workspaceHandle.get()

    if (
      !isValidWorkspaceHandle(workspaceHandleRef, this.providerID, "personal")
    ) {
      return Promise.resolve(E.left("INVALID_WORKSPACE_HANDLE" as const))
    }

    const environmentsToExport = this.restEnvironmentState.value

    if (environmentsToExport.length === 0) {
      return Promise.resolve(E.left("NO_ENVIRONMENTS_TO_EXPORT" as const))
    }

    const result = await initializeDownloadFile(
      JSON.stringify(environmentsToExport, null, 2),
      `${workspaceHandleRef.value.data.workspaceID}-environments`
    )

    if (E.isLeft(result)) {
      return Promise.resolve(E.left("EXPORT_FAILED" as const))
    }

    platform.analytics?.logEvent({
      type: "HOPP_EXPORT_ENVIRONMENT",
      platform: "rest",
    })

    return Promise.resolve(E.right(undefined))
  }

  public async exportRESTEnvironment(
    environmentHandle: Handle<WorkspaceEnvironment>
  ): Promise<E.Either<unknown, void>> {
    const environmentHandleRef = environmentHandle.get()

    if (
      !isValidEnvironmentHandle(
        environmentHandleRef,
        this.providerID,
        "personal"
      )
    ) {
      return Promise.resolve(E.left("INVALID_ENVIRONMENT_HANDLE" as const))
    }

    const environment =
      this.restEnvironmentState.value[
        environmentHandleRef.value.data.environmentID
      ]

    if (!environment) {
      return Promise.resolve(E.left("ENVIRONMENT_DOES_NOT_EXIST" as const))
    }

    const result = await initializeDownloadFile(
      JSON.stringify(environment, null, 2),
      environment.name
    )

    if (E.isLeft(result)) {
      return Promise.resolve(E.left("EXPORT_FAILED" as const))
    }

    return Promise.resolve(E.right(undefined))
  }

  public getWorkspaceHandle(
    workspaceID: string
  ): Promise<E.Either<unknown, Handle<Workspace>>> {
    const handle =
      workspaceID === "personal"
        ? E.right(this.getPersonalWorkspaceHandle())
        : E.left("INVALID_WORKSPACE_ID" as const)

    return Promise.resolve(handle)
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
