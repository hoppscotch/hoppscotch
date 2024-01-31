import { computed, markRaw, reactive, ref } from "vue"
import { useTimestamp } from "@vueuse/core"
import { Service } from "dioc"
import { WorkspaceProvider } from "../provider"
import * as E from "fp-ts/Either"
import { HandleRef } from "../handle"
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

const timestamp = useTimestamp({ interval: 3000 })
// const timestamp = ref(Date.now())

const testData = reactive({
  workspaceA: {
    name: computed(() => `Workspace A: ${timestamp.value}`),
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

;(window as any).testData = testData

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

  constructor() {
    super()

    this.workspaceService.registerWorkspaceProvider(this)
  }

  public createRESTRootCollection(
    workspaceHandle: HandleRef<Workspace>,
    collectionName: string
  ): Promise<
    E.Either<"INVALID_WORKSPACE_HANDLE", HandleRef<WorkspaceCollection>>
  > {
    if (workspaceHandle.value.type !== "ok") {
      return Promise.resolve(E.left("INVALID_WORKSPACE_HANDLE" as const))
    }

    const workspaceID = workspaceHandle.value.data.workspaceID

    const newCollID =
      testData[workspaceID as keyof typeof testData].collections.length

    testData[workspaceID as keyof typeof testData].collections.push({
      name: collectionName,
      collections: [],
      requests: [],
    })

    return this.getCollectionHandle(workspaceHandle, newCollID.toString())
  }

  public createRESTChildCollection(
    parentCollHandle: HandleRef<WorkspaceCollection>,
    collectionName: string
  ): Promise<E.Either<unknown, HandleRef<WorkspaceCollection>>> {
    // TODO: Implement
    throw new Error("Method not implemented.")
  }

  public getWorkspaceHandle(
    workspaceID: string
  ): Promise<E.Either<never, HandleRef<Workspace>>> {
    return Promise.resolve(
      E.right(
        computed(() => {
          if (!(workspaceID in testData)) {
            return {
              type: "invalid",
              reason: "WORKSPACE_WENT_OUT" as const,
            }
          }

          return {
            type: "ok",
            data: {
              providerID: this.providerID,
              workspaceID,
              name: testData[workspaceID as keyof typeof testData].name,
              collectionsAreReadonly: false,
            },
          }
        })
      )
    )
  }

  public getCollectionHandle(
    workspaceHandle: HandleRef<Workspace>,
    collectionID: string
  ): Promise<
    E.Either<"INVALID_WORKSPACE_HANDLE", HandleRef<WorkspaceCollection>>
  > {
    return Promise.resolve(
      E.right(
        computed(() => {
          if (workspaceHandle.value.type !== "ok") {
            return {
              type: "invalid",
              reason: "WORKSPACE_INVALIDATED" as const,
            }
          }

          const workspaceID = workspaceHandle.value.data.workspaceID
          const collectionPath = collectionID
            .split("/")
            .flatMap((x) => ["collections", x])

          const result: TestCollDef | undefined = get(
            testData[workspaceID as keyof typeof testData],
            collectionPath
          )

          if (!result) {
            return {
              type: "invalid",
              reason: "INVALID_COLL_ID",
            }
          }

          return {
            type: "ok",
            data: {
              providerID: this.providerID,
              workspaceID,
              collectionID,
              name: result.name,
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
          if (collectionHandle.value.type === "invalid") {
            return {
              type: "invalid",
              reason: "COLL_HANDLE_IS_INVALID" as const,
            }
          }

          const workspaceID = collectionHandle.value.data.workspaceID
          const collectionID = collectionHandle.value.data.collectionID

          if (!(workspaceID in testData)) {
            return {
              type: "invalid",
              reason: "WORKSPACE_NOT_PRESENT" as const,
            }
          }

          const collectionPath = collectionID
            .split("/")
            .flatMap((x) => ["collections", x])

          return markRaw({
            type: "ok",
            data: {
              providerID: this.providerID,
              workspaceID,
              collectionID,

              mayHaveMoreContent: ref(false),
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

              loadMore(_count: number) {
                return Promise.resolve()
              },
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
          if (workspaceHandle.value.type === "invalid") {
            return {
              type: "invalid",
              reason: "WORKSPACE_IS_INVALID" as const,
            }
          }

          const workspaceID = workspaceHandle.value.data.workspaceID

          if (!(workspaceID in testData)) {
            return {
              type: "invalid",
              reason: "WORKSPACE_NOT_PRESENT" as const,
            }
          }

          return markRaw({
            type: "ok",
            data: {
              providerID: this.providerID,
              workspaceID,

              mayHaveMoreContent: ref(false),
              loading: ref(false),

              collections: computed(() => {
                return testData[
                  workspaceID as keyof typeof testData
                ].collections.map((x, i) => ({
                  collectionID: i.toString(),
                  name: x.name,
                }))
              }),

              loadMore() {
                return Promise.resolve()
              },
            },
          })
        })
      )
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
}
