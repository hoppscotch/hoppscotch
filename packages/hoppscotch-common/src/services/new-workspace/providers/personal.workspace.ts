import {
  HoppCollection,
  HoppRESTRequest,
  makeCollection,
} from "@hoppscotch/data"
import { Service } from "dioc"
import * as E from "fp-ts/Either"
import { get } from "lodash-es"
import { v4 as uuid } from "uuid"
import { Ref, computed, markRaw, ref, shallowReactive, shallowRef } from "vue"

import PersonalWorkspaceSelector from "~/components/workspace/PersonalWorkspaceSelector.vue"
import { useStreamStatic } from "~/composables/stream"

import { addRESTCollection, restCollectionStore } from "~/newstore/collections"
import { platform } from "~/platform"

import { HandleRef } from "~/services/new-workspace/handle"
import { WorkspaceProvider } from "~/services/new-workspace/provider"
import {
  RESTCollectionChildrenView,
  RESTCollectionViewItem,
  RootRESTCollectionView,
} from "~/services/new-workspace/view"
import {
  Workspace,
  WorkspaceCollection,
  WorkspaceDecor,
} from "~/services/new-workspace/workspace"

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

  private collectionIDMap = shallowReactive(
    new WeakMap<HoppCollection, string>()
  )

  private reqIDMap = shallowReactive(new WeakMap<HoppRESTRequest, string>())

  private collectionIDPathMap = shallowReactive(new Map<string, number[]>())

  private generatedUUIDs = new Set<string>()

  private generateUniqueUUID() {
    let id = uuid()

    while (this.generatedUUIDs.has(id)) {
      id = uuid()
    }

    this.generatedUUIDs.add(id)

    return id
  }

  private resolvePathFromCollectionID(id: string): number[] | undefined {
    return this.collectionIDPathMap.get(id)
  }

  private resolveCollectionFromCollectionID(
    id: string
  ): HoppCollection | undefined {
    const path = this.resolvePathFromCollectionID(id)

    if (path === undefined) return

    const collPath = path.flatMap((x, i) =>
      i === 0 ? [x.toString()] : ["folders", x.toString()]
    )

    const coll = get(this.restCollectionState.value.state, collPath) as
      | HoppCollection
      | undefined

    return coll
  }

  private getIssuedInstanceIDForCollection(
    coll: HoppCollection,
    location: number[]
  ) {
    const id = this.collectionIDMap.has(coll)
      ? this.collectionIDMap.get(coll)!
      : this.generateUniqueUUID()

    this.collectionIDPathMap.set(id, location)
    this.collectionIDMap.set(coll, id)

    return id
  }

  private getIssuedInstanceIDForRequest(req: HoppRESTRequest) {
    const id = this.reqIDMap.get(req) ?? this.generateUniqueUUID()

    this.reqIDMap.set(req, id)

    return id
  }

  public createRESTChildCollection(
    parentCollHandle: HandleRef<WorkspaceCollection>,
    collectionName: string
  ): Promise<E.Either<unknown, HandleRef<WorkspaceCollection>>> {
    throw new Error("TODO: Method not implemented.")
  }

  public createRESTRootCollection(
    workspaceHandle: HandleRef<Workspace>,
    collectionName: string
  ): Promise<E.Either<unknown, HandleRef<WorkspaceCollection>>> {
    if (
      workspaceHandle.value.type !== "ok" ||
      workspaceHandle.value.data.providerID !== this.providerID ||
      workspaceHandle.value.data.workspaceID !== "personal"
    ) {
      return Promise.resolve(E.left("INVALID_WORKSPACE_HANDLE" as const))
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
              type: "invalid",
              reason: "WORKSPACE_INVALIDATED" as const,
            }
          }

          addRESTCollection(
            makeCollection({
              name: collectionName,
              folders: [],
              requests: [],
              headers: [],
              auth: {
                authType: "inherit",
                authActive: false,
              },
            })
          )

          platform.analytics?.logEvent({
            type: "HOPP_CREATE_COLLECTION",
            platform: "rest",
            workspaceType: "personal",
            isRootCollection: true,
          })

          return {
            type: "ok",
            data: {
              providerID: this.providerID,
              workspaceID: workspaceHandle.value.data.workspaceID,
              collectionID: "",
              name: collectionName,
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
    if (
      workspaceHandle.value.type !== "ok" ||
      workspaceHandle.value.data.providerID !== this.providerID ||
      workspaceHandle.value.data.workspaceID !== "personal"
    ) {
      return Promise.resolve(E.left("INVALID_WORKSPACE_HANDLE" as const))
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
              type: "invalid",
              reason: "WORKSPACE_INVALIDATED" as const,
            }
          }

          // TODO: The way the IDs are issued, this will make it so we need a view
          // before the ID is issued correctly
          const coll = this.resolveCollectionFromCollectionID(collectionID)

          if (coll === undefined) {
            return {
              type: "invalid",
              reason: "INVALID_COLL_ID" as const,
            }
          }

          return {
            type: "ok",
            data: {
              providerID: this.providerID,
              workspaceID: workspaceHandle.value.data.workspaceID,
              collectionID,
              name: coll.name,
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
              mayHaveMoreContent: ref(false),

              content: computed(() => {
                const path = this.resolvePathFromCollectionID(collectionID)
                const coll =
                  this.resolveCollectionFromCollectionID(collectionID)

                if (coll === undefined || path === undefined) {
                  console.warn("Collection against ID was not resolvable")

                  return []
                }

                const collections = coll.folders.map((childColl, i) => {
                  const id = this.getIssuedInstanceIDForCollection(childColl, [
                    ...path,
                    i,
                  ])

                  return <RESTCollectionViewItem>{
                    type: "collection",
                    value: {
                      collectionID: id,
                      name: coll.name,
                    },
                  }
                })

                const requests = coll.requests.map((req, i) => {
                  const id = this.getIssuedInstanceIDForRequest(req)

                  return <RESTCollectionViewItem>{
                    type: "request",
                    value: {
                      requestID: id,
                      name: req.name,
                      method: req.method,
                    },
                  }
                })

                return [...collections, ...requests]
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
              mayHaveMoreContent: ref(false),

              collections: computed(() => {
                return this.restCollectionState.value.state.map((coll, i) => {
                  const id = this.getIssuedInstanceIDForCollection(coll, [i])

                  return {
                    collectionID: id,
                    name: coll.name,
                  }
                })
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
        collectionsAreReadonly: false,
      },
    })
  }
}
