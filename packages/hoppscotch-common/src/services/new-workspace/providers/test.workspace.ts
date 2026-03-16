import { computed, markRaw, reactive, ref } from "vue"
import { Service } from "dioc"
import { WorkspaceProvider } from "../provider"
import * as E from "fp-ts/Either"
import { HoppCollection } from "@hoppscotch/data"
import { Handle, HandleRef } from "../handle"
import { Workspace, WorkspaceCollection } from "../workspace"
import { NewWorkspaceService } from ".."
import TestWorkspaceSelector from "~/components/workspace/TestWorkspaceSelector.vue"
import { RESTCollectionChildrenView, RootRESTCollectionView } from "../view"
import IconUser from "~icons/lucide/user"
import { get } from "lodash-es"

type TestReqDef = {
  name: string
}

type TestCollDef = {
  name: string
  collections: TestCollDef[]
  requests: TestReqDef[]
}

const testData = reactive({
  workspaceA: {
    name: "Workspace A",
    collections: [
      <TestCollDef>{
        name: "Collection A",
        collections: [
          {
            name: "Collection B",
            collections: [
              { name: "Collection C", collections: [], requests: [] },
            ],
            requests: [],
          },
        ],
        requests: [{ name: "Request C" }],
      },
    ],
  },
  workspaceB: {
    name: "Workspace B",
    collections: [
      <TestCollDef>{
        name: "Collection D",
        collections: [{ name: "Collection E", collections: [], requests: [] }],
        requests: [{ name: "Request F" }],
      },
    ],
  },
})

export class TestWorkspaceProviderService
  extends Service
  implements WorkspaceProvider
{
  public static readonly ID = "TEST_WORKSPACE_PROVIDER_SERVICE"

  public providerID = "TEST_WORKSPACE_PROVIDER"

  public workspaceDecor = ref({
    workspaceSelectorComponent: markRaw(TestWorkspaceSelector),
    headerCurrentIcon: markRaw(IconUser),
    workspaceSelectorPriority: 10,
  })

  private readonly workspaceService = this.bind(NewWorkspaceService)

  override onServiceInit() {
    this.workspaceService.registerWorkspaceProvider(this)
  }

  public createRESTRootCollection(
    workspaceHandle: Handle<Workspace>,
    newCollection: Partial<Omit<HoppCollection, "id">> & { name: string }
  ): Promise<
    E.Either<"INVALID_WORKSPACE_HANDLE", Handle<WorkspaceCollection>>
  > {
    const workspaceHandleRef = workspaceHandle.get()

    if (workspaceHandleRef.value.type !== "ok") {
      return Promise.resolve(E.left("INVALID_WORKSPACE_HANDLE" as const))
    }

    const workspaceID = workspaceHandleRef.value.data.workspaceID

    const newCollID =
      testData[workspaceID as keyof typeof testData].collections.length

    testData[workspaceID as keyof typeof testData].collections.push({
      name: newCollection.name,
      collections: [],
      requests: [],
    })

    return this.getRESTCollectionHandle(workspaceHandle, newCollID.toString())
  }

  public createRESTChildCollection(
    parentCollectionHandle: Handle<WorkspaceCollection>,
    newChildCollection: Partial<HoppCollection> & { name: string }
  ): Promise<E.Either<unknown, Handle<WorkspaceCollection>>> {
    // TODO: Implement
    throw new Error("Method not implemented.")
  }

  public getWorkspaceHandle(
    workspaceID: string
  ): Promise<E.Either<never, Handle<Workspace>>> {
    return Promise.resolve(
      E.right({
        get: () =>
          computed(() => {
            if (!(workspaceID in testData)) {
              return {
                type: "invalid" as const,
                reason: "WORKSPACE_WENT_OUT" as const,
              }
            }

            return {
              type: "ok" as const,
              data: {
                providerID: this.providerID,
                workspaceID,
                name: testData[workspaceID as keyof typeof testData].name,
              },
            }
          }) as HandleRef<Workspace>,
      })
    )
  }

  public getRESTCollectionHandle(
    workspaceHandle: Handle<Workspace>,
    collectionID: string
  ): Promise<
    E.Either<"INVALID_WORKSPACE_HANDLE", Handle<WorkspaceCollection>>
  > {
    return Promise.resolve(
      E.right({
        get: () =>
          computed(() => {
            const workspaceHandleRef = workspaceHandle.get()

            if (workspaceHandleRef.value.type !== "ok") {
              return {
                type: "invalid" as const,
                reason: "INVALID_WORKSPACE_HANDLE" as const,
              }
            }

            const workspaceID = workspaceHandleRef.value.data.workspaceID
            const collectionPath = collectionID
              .split("/")
              .flatMap((x) => ["collections", x])

            const result: TestCollDef | undefined = get(
              testData[workspaceID as keyof typeof testData],
              collectionPath
            )

            if (!result) {
              return {
                type: "invalid" as const,
                reason: "INVALID_COLL_ID",
              }
            }

            return {
              type: "ok" as const,
              data: {
                providerID: this.providerID,
                workspaceID,
                collectionID,
                name: result.name,
              },
            }
          }) as HandleRef<WorkspaceCollection>,
      })
    )
  }

  public getRESTCollectionChildrenView(
    collectionHandle: Handle<WorkspaceCollection>
  ): Promise<E.Either<never, Handle<RESTCollectionChildrenView>>> {
    return Promise.resolve(
      E.right({
        get: () =>
          computed(() => {
            const collectionHandleRef = collectionHandle.get()

            if (collectionHandleRef.value.type === "invalid") {
              return {
                type: "invalid" as const,
                reason: "COLL_HANDLE_IS_INVALID" as const,
              }
            }

            const workspaceID = collectionHandleRef.value.data.workspaceID
            const collectionID = collectionHandleRef.value.data.collectionID

            if (!(workspaceID in testData)) {
              return {
                type: "invalid" as const,
                reason: "WORKSPACE_NOT_PRESENT" as const,
              }
            }

            const collectionPath = collectionID
              .split("/")
              .flatMap((x) => ["collections", x])

            return markRaw({
              type: "ok" as const,
              data: {
                providerID: this.providerID,
                workspaceID,
                collectionID,

                loading: ref(false),

                content: computed(() => [
                  ...(
                    get(testData[workspaceID as keyof typeof testData], [
                      ...collectionPath,
                      "collections",
                    ]) as TestCollDef[]
                  ).map((item, i) => ({
                    type: "collection" as const,
                    value: {
                      collectionID: `${collectionID}/${i}`,
                      name: item.name,
                    },
                  })),
                  ...(
                    get(testData[workspaceID as keyof typeof testData], [
                      ...collectionPath,
                      "requests",
                    ]) as TestReqDef[]
                  ).map((item, i) => ({
                    type: "request" as const,
                    value: {
                      requestID: `${collectionID}/${i}`,
                      name: item.name,
                      method: "get",
                    },
                  })),
                ]),
              },
            })
          }) as HandleRef<RESTCollectionChildrenView>,
      })
    )
  }

  public getRESTRootCollectionView(
    workspaceHandle: Handle<Workspace>
  ): Promise<E.Either<never, Handle<RootRESTCollectionView>>> {
    return Promise.resolve(
      E.right({
        get: () =>
          computed(() => {
            const workspaceHandleRef = workspaceHandle.get()

            if (workspaceHandleRef.value.type === "invalid") {
              return {
                type: "invalid" as const,
                reason: "WORKSPACE_IS_INVALID" as const,
              }
            }

            const workspaceID = workspaceHandleRef.value.data.workspaceID

            if (!(workspaceID in testData)) {
              return {
                type: "invalid" as const,
                reason: "WORKSPACE_NOT_PRESENT" as const,
              }
            }

            return markRaw({
              type: "ok" as const,
              data: {
                providerID: this.providerID,
                workspaceID,

                loading: ref(false),

                collections: computed(() => {
                  return testData[
                    workspaceID as keyof typeof testData
                  ].collections.map((x, i) => ({
                    collectionID: i.toString(),
                    name: x.name,
                  }))
                }),
              },
            })
          }) as HandleRef<RootRESTCollectionView>,
      })
    )
  }

  public getWorkspaceCandidates() {
    return computed(() =>
      Object.keys(testData).map((workspaceID) => ({
        id: workspaceID,
        name: testData[workspaceID as keyof typeof testData].name,
      }))
    )
  }

  // The remaining methods are stubs — this provider exists only for
  // development/testing of the workspace UI; unimplemented paths throw
  // so they're caught immediately rather than silently returning wrong data.

  public getRESTRequestHandle(): Promise<E.Either<never, never>> {
    throw new Error("not implemented")
  }
  public getRESTEnvironmentHandle(): Promise<E.Either<never, never>> {
    throw new Error("not implemented")
  }
  public getRESTCollectionLevelAuthHeadersView(): Promise<
    E.Either<never, never>
  > {
    throw new Error("not implemented")
  }
  public getRESTSearchResultsView(): Promise<E.Either<never, never>> {
    throw new Error("not implemented")
  }
  public getRESTCollectionJSONView(): Promise<E.Either<never, never>> {
    throw new Error("not implemented")
  }
  public getRESTEnvironmentsView(): Promise<E.Either<never, never>> {
    throw new Error("not implemented")
  }
  public updateRESTCollection(): Promise<E.Either<never, never>> {
    throw new Error("not implemented")
  }
  public removeRESTCollection(): Promise<E.Either<never, never>> {
    throw new Error("not implemented")
  }
  public createRESTRequest(): Promise<E.Either<never, never>> {
    throw new Error("not implemented")
  }
  public updateRESTRequest(): Promise<E.Either<never, never>> {
    throw new Error("not implemented")
  }
  public removeRESTRequest(): Promise<E.Either<never, never>> {
    throw new Error("not implemented")
  }
  public importRESTCollections(): Promise<E.Either<never, never>> {
    throw new Error("not implemented")
  }
  public exportRESTCollections(): Promise<E.Either<never, never>> {
    throw new Error("not implemented")
  }
  public exportRESTCollection(): Promise<E.Either<never, never>> {
    throw new Error("not implemented")
  }
  public reorderRESTCollection(): Promise<E.Either<never, never>> {
    throw new Error("not implemented")
  }
  public moveRESTCollection(): Promise<E.Either<never, never>> {
    throw new Error("not implemented")
  }
  public reorderRESTRequest(): Promise<E.Either<never, never>> {
    throw new Error("not implemented")
  }
  public moveRESTRequest(): Promise<E.Either<never, never>> {
    throw new Error("not implemented")
  }
  public createRESTEnvironment(): Promise<E.Either<never, never>> {
    throw new Error("not implemented")
  }
  public duplicateRESTEnvironment(): Promise<E.Either<never, never>> {
    throw new Error("not implemented")
  }
  public updateRESTEnvironment(): Promise<E.Either<never, never>> {
    throw new Error("not implemented")
  }
  public removeRESTEnvironment(): Promise<E.Either<never, never>> {
    throw new Error("not implemented")
  }
  public importRESTEnvironments(): Promise<E.Either<never, never>> {
    throw new Error("not implemented")
  }
  public exportRESTEnvironments(): Promise<E.Either<never, never>> {
    throw new Error("not implemented")
  }
  public exportRESTEnvironment(): Promise<E.Either<never, never>> {
    throw new Error("not implemented")
  }
}
