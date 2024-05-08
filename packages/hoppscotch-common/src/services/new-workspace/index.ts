import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import { Service } from "dioc"
import * as E from "fp-ts/Either"
import {
  Component,
  Ref,
  computed,
  markRaw,
  shallowReactive,
  shallowRef,
  watch,
} from "vue"
import { Handle } from "./handle"
import { WorkspaceProvider } from "./provider"
import {
  RESTCollectionChildrenView,
  RESTCollectionJSONView,
  RESTCollectionLevelAuthHeadersView,
  RESTSearchResultsView,
  RootRESTCollectionView,
} from "./view"
import { Workspace, WorkspaceCollection, WorkspaceRequest } from "./workspace"

export type WorkspaceError<ServiceErr> =
  | { type: "SERVICE_ERROR"; error: ServiceErr }
  | { type: "PROVIDER_ERROR"; error: unknown }

export class NewWorkspaceService extends Service {
  public static readonly ID = "NEW_WORKSPACE_SERVICE"

  private registeredProviders = shallowReactive(
    new Map<string, WorkspaceProvider>()
  )

  public activeWorkspaceHandle: Ref<Handle<Workspace> | undefined> =
    shallowRef()

  public activeWorkspaceDecor = computed(() => {
    const activeWorkspaceHandleRef = this.activeWorkspaceHandle.value?.get()

    if (activeWorkspaceHandleRef?.value.type !== "ok") {
      return undefined
    }

    return this.registeredProviders.get(
      activeWorkspaceHandleRef.value.data.providerID
    )!.workspaceDecor
  })

  public workspaceSelectorComponents = computed(() => {
    const items: Component[] = []

    const sortedProviders = Array.from(this.registeredProviders.values()).sort(
      (a, b) =>
        (b.workspaceDecor?.value.workspaceSelectorPriority ?? 0) -
        (a.workspaceDecor?.value.workspaceSelectorPriority ?? 0)
    )

    for (const workspace of sortedProviders) {
      if (workspace.workspaceDecor?.value?.workspaceSelectorComponent) {
        items.push(workspace.workspaceDecor.value.workspaceSelectorComponent)
      }
    }

    return items
  })

  constructor() {
    super()

    // Watch for situations where the handle is invalidated
    // so the active workspace handle definition can be invalidated
    watch(
      () => {
        return this.activeWorkspaceHandle.value
          ? [
              this.activeWorkspaceHandle.value,
              this.activeWorkspaceHandle.value?.get(),
            ]
          : [this.activeWorkspaceHandle.value]
      },
      () => {
        if (!this.activeWorkspaceHandle.value) return

        const activeWorkspaceHandleRef = this.activeWorkspaceHandle.value.get()

        if (activeWorkspaceHandleRef.value.type === "invalid") {
          this.activeWorkspaceHandle.value = undefined
        }
      },
      { deep: true }
    )
  }

  public async getWorkspaceHandle(
    providerID: string,
    workspaceID: string
  ): Promise<E.Either<WorkspaceError<"INVALID_PROVIDER">, Handle<Workspace>>> {
    const provider = this.registeredProviders.get(providerID)

    if (!provider) {
      return Promise.resolve(
        E.left({ type: "SERVICE_ERROR", error: "INVALID_PROVIDER" as const })
      )
    }

    const handleResult = await provider.getWorkspaceHandle(workspaceID)

    if (E.isLeft(handleResult)) {
      return E.left({ type: "PROVIDER_ERROR", error: handleResult.left })
    }

    return E.right(handleResult.right)
  }

  public async getCollectionHandle(
    workspaceHandle: Handle<Workspace>,
    collectionID: string
  ): Promise<
    E.Either<
      WorkspaceError<"INVALID_HANDLE" | "INVALID_PROVIDER">,
      Handle<WorkspaceCollection>
    >
  > {
    const workspaceHandleRef = workspaceHandle.get()

    if (workspaceHandleRef.value.type === "invalid") {
      return E.left({ type: "SERVICE_ERROR", error: "INVALID_HANDLE" })
    }

    const provider = this.registeredProviders.get(
      workspaceHandleRef.value.data.providerID
    )

    if (!provider) {
      return E.left({ type: "SERVICE_ERROR", error: "INVALID_PROVIDER" })
    }

    const result = await provider.getCollectionHandle(
      workspaceHandle,
      collectionID
    )

    if (E.isLeft(result)) {
      return E.left({ type: "PROVIDER_ERROR", error: result.left })
    }

    return E.right(result.right)
  }

  public async getRequestHandle(
    workspaceHandle: Handle<Workspace>,
    requestID: string
  ): Promise<
    E.Either<
      WorkspaceError<"INVALID_HANDLE" | "INVALID_PROVIDER">,
      Handle<WorkspaceRequest>
    >
  > {
    const workspaceHandleRef = workspaceHandle.get()

    if (workspaceHandleRef.value.type === "invalid") {
      return E.left({ type: "SERVICE_ERROR", error: "INVALID_HANDLE" })
    }

    const provider = this.registeredProviders.get(
      workspaceHandleRef.value.data.providerID
    )

    if (!provider) {
      return E.left({ type: "SERVICE_ERROR", error: "INVALID_PROVIDER" })
    }

    const result = await provider.getRequestHandle(workspaceHandle, requestID)

    if (E.isLeft(result)) {
      return E.left({ type: "PROVIDER_ERROR", error: result.left })
    }

    return E.right(result.right)
  }

  public async createRESTRootCollection(
    workspaceHandle: Handle<Workspace>,
    newCollection: Partial<Exclude<HoppCollection, "id">> & { name: string }
  ): Promise<
    E.Either<
      WorkspaceError<"INVALID_HANDLE" | "INVALID_PROVIDER">,
      Handle<WorkspaceCollection>
    >
  > {
    const workspaceHandleRef = workspaceHandle.get()

    if (workspaceHandleRef.value.type === "invalid") {
      return E.left({ type: "SERVICE_ERROR", error: "INVALID_HANDLE" })
    }

    const provider = this.registeredProviders.get(
      workspaceHandleRef.value.data.providerID
    )

    if (!provider) {
      return E.left({ type: "SERVICE_ERROR", error: "INVALID_PROVIDER" })
    }

    const result = await provider.createRESTRootCollection(
      workspaceHandle,
      newCollection
    )

    if (E.isLeft(result)) {
      return E.left({ type: "PROVIDER_ERROR", error: result.left })
    }

    return E.right(result.right)
  }

  public async createRESTChildCollection(
    parentCollectionHandle: Handle<WorkspaceCollection>,
    newChildCollection: Partial<HoppCollection> & { name: string }
  ): Promise<
    E.Either<
      WorkspaceError<"INVALID_HANDLE" | "INVALID_PROVIDER">,
      Handle<WorkspaceCollection>
    >
  > {
    const parentCollectionHandleRef = parentCollectionHandle.get()

    if (parentCollectionHandleRef.value.type === "invalid") {
      return E.left({ type: "SERVICE_ERROR", error: "INVALID_HANDLE" })
    }

    const provider = this.registeredProviders.get(
      parentCollectionHandleRef.value.data.providerID
    )

    if (!provider) {
      return E.left({ type: "SERVICE_ERROR", error: "INVALID_PROVIDER" })
    }

    const result = await provider.createRESTChildCollection(
      parentCollectionHandle,
      newChildCollection
    )

    if (E.isLeft(result)) {
      return E.left({ type: "PROVIDER_ERROR", error: result.left })
    }

    return E.right(result.right)
  }

  public async updateRESTCollection(
    collectionHandle: Handle<WorkspaceCollection>,
    updatedCollection: Partial<HoppCollection>
  ): Promise<
    E.Either<WorkspaceError<"INVALID_HANDLE" | "INVALID_PROVIDER">, void>
  > {
    const collectionHandleRef = collectionHandle.get()

    if (collectionHandleRef.value.type === "invalid") {
      return E.left({ type: "SERVICE_ERROR", error: "INVALID_HANDLE" })
    }

    const provider = this.registeredProviders.get(
      collectionHandleRef.value.data.providerID
    )

    if (!provider) {
      return E.left({ type: "SERVICE_ERROR", error: "INVALID_PROVIDER" })
    }

    const result = await provider.updateRESTCollection(
      collectionHandle,
      updatedCollection
    )

    if (E.isLeft(result)) {
      return E.left({ type: "PROVIDER_ERROR", error: result.left })
    }

    return E.right(undefined)
  }

  public async removeRESTCollection(
    collectionHandle: Handle<WorkspaceCollection>
  ): Promise<
    E.Either<WorkspaceError<"INVALID_HANDLE" | "INVALID_PROVIDER">, void>
  > {
    const collectionHandleRef = collectionHandle.get()

    if (collectionHandleRef.value.type === "invalid") {
      return E.left({ type: "SERVICE_ERROR", error: "INVALID_HANDLE" })
    }

    const provider = this.registeredProviders.get(
      collectionHandleRef.value.data.providerID
    )

    if (!provider) {
      return E.left({ type: "SERVICE_ERROR", error: "INVALID_PROVIDER" })
    }

    const result = await provider.removeRESTCollection(collectionHandle)

    if (E.isLeft(result)) {
      return E.left({ type: "PROVIDER_ERROR", error: result.left })
    }

    return E.right(undefined)
  }

  public async createRESTRequest(
    parentCollectionHandle: Handle<WorkspaceCollection>,
    newRequest: HoppRESTRequest
  ): Promise<
    E.Either<
      WorkspaceError<"INVALID_HANDLE" | "INVALID_PROVIDER">,
      Handle<WorkspaceRequest>
    >
  > {
    const parentCollectionHandleRef = parentCollectionHandle.get()

    if (parentCollectionHandleRef.value.type === "invalid") {
      return E.left({ type: "SERVICE_ERROR", error: "INVALID_HANDLE" })
    }

    const provider = this.registeredProviders.get(
      parentCollectionHandleRef.value.data.providerID
    )

    if (!provider) {
      return E.left({ type: "SERVICE_ERROR", error: "INVALID_PROVIDER" })
    }

    const result = await provider.createRESTRequest(
      parentCollectionHandle,
      newRequest
    )

    if (E.isLeft(result)) {
      return E.left({ type: "PROVIDER_ERROR", error: result.left })
    }

    return E.right(result.right)
  }

  public async removeRESTRequest(
    requestHandle: Handle<WorkspaceRequest>
  ): Promise<
    E.Either<WorkspaceError<"INVALID_HANDLE" | "INVALID_PROVIDER">, void>
  > {
    const requestHandleRef = requestHandle.get()

    if (requestHandleRef.value.type === "invalid") {
      return E.left({ type: "SERVICE_ERROR", error: "INVALID_HANDLE" })
    }

    const provider = this.registeredProviders.get(
      requestHandleRef.value.data.providerID
    )

    if (!provider) {
      return E.left({ type: "SERVICE_ERROR", error: "INVALID_PROVIDER" })
    }

    const result = await provider.removeRESTRequest(requestHandle)

    if (E.isLeft(result)) {
      return E.left({ type: "PROVIDER_ERROR", error: result.left })
    }

    return E.right(undefined)
  }

  public async updateRESTRequest(
    requestHandle: Handle<WorkspaceRequest>,
    updatedRequest: Partial<HoppRESTRequest>
  ): Promise<
    E.Either<WorkspaceError<"INVALID_HANDLE" | "INVALID_PROVIDER">, void>
  > {
    const requestHandleRef = requestHandle.get()

    if (requestHandleRef.value.type === "invalid") {
      return E.left({ type: "SERVICE_ERROR", error: "INVALID_HANDLE" })
    }

    const provider = this.registeredProviders.get(
      requestHandleRef.value.data.providerID
    )

    if (!provider) {
      return E.left({ type: "SERVICE_ERROR", error: "INVALID_PROVIDER" })
    }

    const result = await provider.updateRESTRequest(
      requestHandle,
      updatedRequest
    )

    if (E.isLeft(result)) {
      return E.left({ type: "PROVIDER_ERROR", error: result.left })
    }

    return E.right(result.right)
  }

  public async importRESTCollections(
    workspaceHandle: Handle<Workspace>,
    collections: HoppCollection[]
  ): Promise<
    E.Either<
      WorkspaceError<"INVALID_HANDLE" | "INVALID_PROVIDER">,
      Handle<WorkspaceCollection>
    >
  > {
    const workspaceHandleRef = workspaceHandle.get()

    if (workspaceHandleRef.value.type === "invalid") {
      return E.left({ type: "SERVICE_ERROR", error: "INVALID_HANDLE" })
    }

    const provider = this.registeredProviders.get(
      workspaceHandleRef.value.data.providerID
    )

    if (!provider) {
      return E.left({ type: "SERVICE_ERROR", error: "INVALID_PROVIDER" })
    }

    const result = await provider.importRESTCollections(
      workspaceHandle,
      collections
    )

    if (E.isLeft(result)) {
      return E.left({ type: "PROVIDER_ERROR", error: result.left })
    }

    return E.right(result.right)
  }

  public async exportRESTCollections(
    workspaceHandle: Handle<Workspace>,
    collections: HoppCollection[]
  ): Promise<
    E.Either<WorkspaceError<"INVALID_HANDLE" | "INVALID_PROVIDER">, void>
  > {
    const workspaceHandleRef = workspaceHandle.get()

    if (workspaceHandleRef.value.type === "invalid") {
      return E.left({ type: "SERVICE_ERROR", error: "INVALID_HANDLE" })
    }

    const provider = this.registeredProviders.get(
      workspaceHandleRef.value.data.providerID
    )

    if (!provider) {
      return E.left({ type: "SERVICE_ERROR", error: "INVALID_PROVIDER" })
    }

    const result = await provider.exportRESTCollections(
      workspaceHandle,
      collections
    )

    if (E.isLeft(result)) {
      return E.left({ type: "PROVIDER_ERROR", error: result.left })
    }

    return E.right(result.right)
  }

  public async exportRESTCollection(
    collectionHandle: Handle<WorkspaceCollection>,
    collection: HoppCollection
  ): Promise<
    E.Either<WorkspaceError<"INVALID_HANDLE" | "INVALID_PROVIDER">, void>
  > {
    const collectionHandleRef = collectionHandle.get()

    if (collectionHandleRef.value.type === "invalid") {
      return E.left({ type: "SERVICE_ERROR", error: "INVALID_HANDLE" })
    }

    const provider = this.registeredProviders.get(
      collectionHandleRef.value.data.providerID
    )

    if (!provider) {
      return E.left({ type: "SERVICE_ERROR", error: "INVALID_PROVIDER" })
    }

    const result = await provider.exportRESTCollection(
      collectionHandle,
      collection
    )

    if (E.isLeft(result)) {
      return E.left({ type: "PROVIDER_ERROR", error: result.left })
    }

    return E.right(result.right)
  }

  public async reorderRESTCollection(
    collectionHandle: Handle<WorkspaceCollection>,
    destinationCollectionID: string | null
  ): Promise<
    E.Either<WorkspaceError<"INVALID_HANDLE" | "INVALID_PROVIDER">, void>
  > {
    const collectionHandleRef = collectionHandle.get()

    if (collectionHandleRef.value.type === "invalid") {
      return E.left({ type: "SERVICE_ERROR", error: "INVALID_HANDLE" })
    }

    const provider = this.registeredProviders.get(
      collectionHandleRef.value.data.providerID
    )

    if (!provider) {
      return E.left({ type: "SERVICE_ERROR", error: "INVALID_PROVIDER" })
    }

    const result = await provider.reorderRESTCollection(
      collectionHandle,
      destinationCollectionID
    )

    if (E.isLeft(result)) {
      return E.left({ type: "PROVIDER_ERROR", error: result.left })
    }

    return E.right(result.right)
  }

  public async moveRESTCollection(
    collectionHandle: Handle<WorkspaceCollection>,
    destinationCollectionID: string | null
  ): Promise<
    E.Either<WorkspaceError<"INVALID_HANDLE" | "INVALID_PROVIDER">, void>
  > {
    const collectionHandleRef = collectionHandle.get()

    if (collectionHandleRef.value.type === "invalid") {
      return E.left({ type: "SERVICE_ERROR", error: "INVALID_HANDLE" })
    }

    const provider = this.registeredProviders.get(
      collectionHandleRef.value.data.providerID
    )

    if (!provider) {
      return E.left({ type: "SERVICE_ERROR", error: "INVALID_PROVIDER" })
    }

    const result = await provider.moveRESTCollection(
      collectionHandle,
      destinationCollectionID
    )

    if (E.isLeft(result)) {
      return E.left({ type: "PROVIDER_ERROR", error: result.left })
    }

    return E.right(result.right)
  }

  public async reorderRESTRequest(
    requestHandle: Handle<WorkspaceRequest>,
    destinationCollectionID: string,
    destinationRequestID: string | null
  ): Promise<
    E.Either<WorkspaceError<"INVALID_HANDLE" | "INVALID_PROVIDER">, void>
  > {
    const requestHandleRef = requestHandle.get()

    if (requestHandleRef.value.type === "invalid") {
      return E.left({ type: "SERVICE_ERROR", error: "INVALID_HANDLE" })
    }

    const provider = this.registeredProviders.get(
      requestHandleRef.value.data.providerID
    )

    if (!provider) {
      return E.left({ type: "SERVICE_ERROR", error: "INVALID_PROVIDER" })
    }

    const result = await provider.reorderRESTRequest(
      requestHandle,
      destinationCollectionID,
      destinationRequestID
    )

    if (E.isLeft(result)) {
      return E.left({ type: "PROVIDER_ERROR", error: result.left })
    }

    return E.right(result.right)
  }

  public async moveRESTRequest(
    requestHandle: Handle<WorkspaceRequest>,
    destinationCollectionID: string
  ): Promise<
    E.Either<WorkspaceError<"INVALID_HANDLE" | "INVALID_PROVIDER">, void>
  > {
    const requestHandleRef = requestHandle.get()

    if (requestHandleRef.value.type === "invalid") {
      return E.left({ type: "SERVICE_ERROR", error: "INVALID_HANDLE" })
    }

    const provider = this.registeredProviders.get(
      requestHandleRef.value.data.providerID
    )

    if (!provider) {
      return E.left({ type: "SERVICE_ERROR", error: "INVALID_PROVIDER" })
    }

    const result = await provider.moveRESTRequest(
      requestHandle,
      destinationCollectionID
    )

    if (E.isLeft(result)) {
      return E.left({ type: "PROVIDER_ERROR", error: result.left })
    }

    return E.right(result.right)
  }

  public async getRESTCollectionChildrenView(
    collectionHandle: Handle<WorkspaceCollection>
  ): Promise<
    E.Either<
      WorkspaceError<"INVALID_HANDLE" | "INVALID_PROVIDER">,
      Handle<RESTCollectionChildrenView>
    >
  > {
    const collectionHandleRef = collectionHandle.get()

    if (collectionHandleRef.value.type === "invalid") {
      return E.left({ type: "SERVICE_ERROR", error: "INVALID_HANDLE" })
    }

    const provider = this.registeredProviders.get(
      collectionHandleRef.value.data.providerID
    )

    if (!provider) {
      return E.left({ type: "SERVICE_ERROR", error: "INVALID_PROVIDER" })
    }

    const result =
      await provider.getRESTCollectionChildrenView(collectionHandle)

    if (E.isLeft(result)) {
      return E.left({ type: "PROVIDER_ERROR", error: result.left })
    }

    return E.right(result.right)
  }

  public async getRESTRootCollectionView(
    workspaceHandle: Handle<Workspace>
  ): Promise<
    E.Either<
      WorkspaceError<"INVALID_HANDLE" | "INVALID_PROVIDER">,
      Handle<RootRESTCollectionView>
    >
  > {
    const workspaceHandleRef = workspaceHandle.get()

    if (workspaceHandleRef.value.type === "invalid") {
      return E.left({ type: "SERVICE_ERROR", error: "INVALID_HANDLE" })
    }

    const provider = this.registeredProviders.get(
      workspaceHandleRef.value.data.providerID
    )

    if (!provider) {
      return E.left({ type: "SERVICE_ERROR", error: "INVALID_PROVIDER" })
    }

    const result = await provider.getRESTRootCollectionView(workspaceHandle)

    if (E.isLeft(result)) {
      return E.left({ type: "PROVIDER_ERROR", error: result.left })
    }

    return E.right(result.right)
  }

  public async getRESTCollectionLevelAuthHeadersView(
    collectionHandle: Handle<WorkspaceCollection>
  ): Promise<
    E.Either<
      WorkspaceError<"INVALID_HANDLE" | "INVALID_PROVIDER">,
      Handle<RESTCollectionLevelAuthHeadersView>
    >
  > {
    const collectionHandleRef = collectionHandle.get()

    if (collectionHandleRef.value.type === "invalid") {
      return E.left({ type: "SERVICE_ERROR", error: "INVALID_HANDLE" })
    }

    const provider = this.registeredProviders.get(
      collectionHandleRef.value.data.providerID
    )

    if (!provider) {
      return E.left({ type: "SERVICE_ERROR", error: "INVALID_PROVIDER" })
    }

    const result =
      await provider.getRESTCollectionLevelAuthHeadersView(collectionHandle)

    if (E.isLeft(result)) {
      return E.left({ type: "PROVIDER_ERROR", error: result.left })
    }

    return E.right(result.right)
  }

  public async getRESTSearchResultsView(
    workspaceHandle: Handle<Workspace>,
    searchQuery: Ref<string>
  ): Promise<
    E.Either<
      WorkspaceError<"INVALID_HANDLE" | "INVALID_PROVIDER">,
      Handle<RESTSearchResultsView>
    >
  > {
    const workspaceHandleRef = workspaceHandle.get()

    if (workspaceHandleRef.value.type === "invalid") {
      return E.left({ type: "SERVICE_ERROR", error: "INVALID_HANDLE" })
    }

    const provider = this.registeredProviders.get(
      workspaceHandleRef.value.data.providerID
    )

    if (!provider) {
      return E.left({ type: "SERVICE_ERROR", error: "INVALID_PROVIDER" })
    }

    const result = await provider.getRESTSearchResultsView(
      workspaceHandle,
      searchQuery
    )

    if (E.isLeft(result)) {
      return E.left({ type: "PROVIDER_ERROR", error: result.left })
    }

    return E.right(result.right)
  }

  public async getRESTCollectionJSONView(
    workspaceHandle: Handle<Workspace>
  ): Promise<
    E.Either<
      WorkspaceError<"INVALID_HANDLE" | "INVALID_PROVIDER">,
      Handle<RESTCollectionJSONView>
    >
  > {
    const workspaceHandleRef = workspaceHandle.get()

    if (workspaceHandleRef.value.type === "invalid") {
      return E.left({ type: "SERVICE_ERROR", error: "INVALID_HANDLE" })
    }

    const provider = this.registeredProviders.get(
      workspaceHandleRef.value.data.providerID
    )

    if (!provider) {
      return E.left({ type: "SERVICE_ERROR", error: "INVALID_PROVIDER" })
    }

    const result = await provider.getRESTCollectionJSONView(workspaceHandle)

    if (E.isLeft(result)) {
      return E.left({ type: "PROVIDER_ERROR", error: result.left })
    }

    return E.right(result.right)
  }

  public registerWorkspaceProvider(provider: WorkspaceProvider) {
    if (this.registeredProviders.has(provider.providerID)) {
      console.warn(
        "Ignoring attempt to re-register workspace provider that is already existing:",
        provider
      )
      return
    }

    this.registeredProviders.set(provider.providerID, markRaw(provider))
  }
}
