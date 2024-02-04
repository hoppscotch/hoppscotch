import { HoppCollection, makeCollection } from "@hoppscotch/data"
import { Service } from "dioc"
import * as E from "fp-ts/Either"
import { Ref, computed, markRaw, nextTick, ref, shallowRef } from "vue"

import PersonalWorkspaceSelector from "~/components/workspace/PersonalWorkspaceSelector.vue"
import { useStreamStatic } from "~/composables/stream"

import {
  addRESTCollection,
  addRESTFolder,
  cascadeParentCollectionForHeaderAuth,
  editRESTRequest,
  navigateToFolderWithIndexPath,
  removeRESTRequest,
  restCollectionStore,
  saveRESTRequestAs,
} from "~/newstore/collections"
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

import { cloneDeep } from "lodash-es"
import {
  getRequestsByPath,
  resolveSaveContextOnRequestReorder,
} from "~/helpers/collection/request"
import { RESTTabService } from "~/services/tab/rest"
import IconUser from "~icons/lucide/user"
import { NewWorkspaceService } from ".."
import { HoppRESTRequest } from "@hoppscotch/data"

export class PersonalWorkspaceProviderService
  extends Service
  implements WorkspaceProvider
{
  public static readonly ID = "PERSONAL_WORKSPACE_PROVIDER_SERVICE"

  public readonly providerID = "PERSONAL_WORKSPACE_PROVIDER"

  private workspaceService = this.bind(NewWorkspaceService)
  private tabs = this.bind(RESTTabService)

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

  private navigateToFolderWithIndexPath(
    collections: HoppCollection[],
    indexPaths: number[]
  ) {
    if (indexPaths.length === 0) return null

    let target = collections[indexPaths.shift() as number]

    while (indexPaths.length > 0)
      target = target?.folders[indexPaths.shift() as number]

    return target !== undefined ? target : null
  }

  public createRESTChildCollection(
    parentCollHandle: HandleRef<WorkspaceCollection>,
    collectionName: string,
    path: string
  ): Promise<E.Either<unknown, HandleRef<WorkspaceCollection>>> {
    if (
      parentCollHandle.value.type !== "ok" ||
      parentCollHandle.value.data.providerID !== this.providerID ||
      parentCollHandle.value.data.workspaceID !== "personal"
    ) {
      return Promise.resolve(E.left("INVALID_WORKSPACE_HANDLE" as const))
    }

    return Promise.resolve(
      E.right(
        computed(() => {
          if (
            parentCollHandle.value.type !== "ok" ||
            parentCollHandle.value.data.providerID !== this.providerID ||
            parentCollHandle.value.data.workspaceID !== "personal"
          ) {
            return {
              type: "invalid" as const,
              reason: "WORKSPACE_INVALIDATED" as const,
            }
          }

          addRESTFolder(collectionName, path)

          platform.analytics?.logEvent({
            type: "HOPP_CREATE_COLLECTION",
            workspaceType: "personal",
            isRootCollection: false,
            platform: "rest",
          })

          return {
            type: "ok",
            data: {
              providerID: this.providerID,
              workspaceID: parentCollHandle.value.data.workspaceID,
              collectionID: parentCollHandle.value.data.collectionID,
              name: collectionName,
            },
          }
        })
      )
    )
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
              type: "invalid" as const,
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

  public createRESTRequest(
    parentCollHandle: HandleRef<WorkspaceCollection>,
    requestName: string,
    path: string
  ): Promise<E.Either<unknown, HandleRef<WorkspaceCollection>>> {
    if (
      parentCollHandle.value.type !== "ok" ||
      parentCollHandle.value.data.providerID !== this.providerID ||
      parentCollHandle.value.data.workspaceID !== "personal"
    ) {
      return Promise.resolve(E.left("INVALID_WORKSPACE_HANDLE" as const))
    }

    return Promise.resolve(
      E.right(
        computed(() => {
          if (
            parentCollHandle.value.type !== "ok" ||
            parentCollHandle.value.data.providerID !== this.providerID ||
            parentCollHandle.value.data.workspaceID !== "personal"
          ) {
            return {
              type: "invalid" as const,
              reason: "WORKSPACE_INVALIDATED" as const,
            }
          }

          const newRequest = {
            ...cloneDeep(this.tabs.currentActiveTab.value.document.request),
            name: requestName,
          }

          const insertionIndex = saveRESTRequestAs(path, newRequest)

          const { auth, headers } = cascadeParentCollectionForHeaderAuth(
            path,
            "rest"
          )

          this.tabs.createNewTab({
            request: newRequest,
            isDirty: false,
            saveContext: {
              originLocation: "user-collection",
              folderPath: path,
              requestIndex: insertionIndex,
            },
            inheritedProperties: {
              auth,
              headers,
            },
          })

          platform.analytics?.logEvent({
            type: "HOPP_SAVE_REQUEST",
            workspaceType: "personal",
            createdNow: true,
            platform: "rest",
          })

          return {
            type: "ok",
            data: {
              providerID: this.providerID,
              workspaceID: parentCollHandle.value.data.workspaceID,
              collectionID: parentCollHandle.value.data.collectionID,
              name: requestName,
            },
          }
        })
      )
    )
  }

  public removeRESTRequest(
    parentCollHandle: HandleRef<WorkspaceCollection>,
    path: string,
    requestIndex: number
  ): Promise<E.Either<unknown, HandleRef<WorkspaceCollection>>> {
    if (
      parentCollHandle.value.type !== "ok" ||
      parentCollHandle.value.data.providerID !== this.providerID ||
      parentCollHandle.value.data.workspaceID !== "personal"
    ) {
      return Promise.resolve(E.left("INVALID_WORKSPACE_HANDLE" as const))
    }

    return Promise.resolve(
      E.right(
        computed(() => {
          if (
            parentCollHandle.value.type !== "ok" ||
            parentCollHandle.value.data.providerID !== this.providerID ||
            parentCollHandle.value.data.workspaceID !== "personal"
          ) {
            return {
              type: "invalid" as const,
              reason: "WORKSPACE_INVALIDATED" as const,
            }
          }

          const possibleTab = this.tabs.getTabRefWithSaveContext({
            originLocation: "user-collection",
            folderPath: path,
            requestIndex,
          })

          // If there is a tab attached to this request, dissociate its state and mark it dirty
          if (possibleTab) {
            possibleTab.value.document.saveContext = null
            possibleTab.value.document.isDirty = true
          }

          console.log(
            `REST collection store state is `,
            restCollectionStore.value.state
          )

          const requestToRemove = navigateToFolderWithIndexPath(
            restCollectionStore.value.state,
            path.split("/").map((i) => parseInt(i))
          )?.requests[requestIndex]

          removeRESTRequest(path, requestIndex, requestToRemove?.id)

          // the same function is used to reorder requests since after removing, it's basically doing reorder
          resolveSaveContextOnRequestReorder({
            lastIndex: requestIndex,
            newIndex: -1,
            folderPath: path,
            length: getRequestsByPath(
              this.restCollectionState.value.state,
              path
            ).length,
          })

          return {
            type: "ok",
            data: {
              providerID: this.providerID,
              workspaceID: parentCollHandle.value.data.workspaceID,
              collectionID: parentCollHandle.value.data.workspaceID,
              name: "" as const,
            },
          }
        })
      )
    )
  }

  public selectRESTRequest(
    parentCollHandle: HandleRef<WorkspaceCollection>,
    collPath: string,
    requestIndex: string,
    request: HoppRESTRequest
  ): Promise<E.Either<unknown, HandleRef<WorkspaceCollection>>> {
    if (
      parentCollHandle.value.type !== "ok" ||
      parentCollHandle.value.data.providerID !== this.providerID ||
      parentCollHandle.value.data.workspaceID !== "personal"
    ) {
      return Promise.resolve(E.left("INVALID_WORKSPACE_HANDLE" as const))
    }

    return Promise.resolve(
      E.right(
        computed(() => {
          if (
            parentCollHandle.value.type !== "ok" ||
            parentCollHandle.value.data.providerID !== this.providerID ||
            parentCollHandle.value.data.workspaceID !== "personal"
          ) {
            return {
              type: "invalid" as const,
              reason: "WORKSPACE_INVALIDATED" as const,
            }
          }

          // If there is a request with this save context, switch into it
          let possibleTab = null

          const { auth, headers } = cascadeParentCollectionForHeaderAuth(
            collPath,
            "rest"
          )
          possibleTab = this.tabs.getTabRefWithSaveContext({
            originLocation: "user-collection",
            requestIndex: parseInt(requestIndex),
            folderPath: collPath!,
          })
          if (possibleTab) {
            this.tabs.setActiveTab(possibleTab.value.id)
          } else {
            // If not, open the request in a new tab
            this.tabs.createNewTab({
              request: cloneDeep(request),
              isDirty: false,
              saveContext: {
                originLocation: "user-collection",
                folderPath: collPath!,
                requestIndex: parseInt(requestIndex),
              },
              inheritedProperties: {
                auth,
                headers,
              },
            })
          }

          return {
            type: "ok",
            data: {
              providerID: this.providerID,
              workspaceID: parentCollHandle.value.data.workspaceID,
              collectionID: parentCollHandle.value.data.workspaceID,
              name: "",
            },
          }
        })
      )
    )
  }

  public duplicateRESTRequest(
    parentCollHandle: HandleRef<WorkspaceCollection>,
    collPath: string,
    request: HoppRESTRequest
  ): Promise<E.Either<unknown, HandleRef<WorkspaceCollection>>> {
    if (
      parentCollHandle.value.type !== "ok" ||
      parentCollHandle.value.data.providerID !== this.providerID ||
      parentCollHandle.value.data.workspaceID !== "personal"
    ) {
      return Promise.resolve(E.left("INVALID_WORKSPACE_HANDLE" as const))
    }

    return Promise.resolve(
      E.right(
        computed(() => {
          if (
            parentCollHandle.value.type !== "ok" ||
            parentCollHandle.value.data.providerID !== this.providerID ||
            parentCollHandle.value.data.workspaceID !== "personal"
          ) {
            return {
              type: "invalid" as const,
              reason: "WORKSPACE_INVALIDATED" as const,
            }
          }

          saveRESTRequestAs(collPath, request)

          return {
            type: "ok",
            data: {
              providerID: this.providerID,
              workspaceID: parentCollHandle.value.data.workspaceID,
              collectionID: parentCollHandle.value.data.workspaceID,
              name: "",
            },
          }
        })
      )
    )
  }

  public editRESTRequest(
    parentCollHandle: HandleRef<WorkspaceCollection>,
    collPath: string,
    requestIndex: number,
    request: HoppRESTRequest
  ): Promise<E.Either<unknown, HandleRef<WorkspaceCollection>>> {
    if (
      parentCollHandle.value.type !== "ok" ||
      parentCollHandle.value.data.providerID !== this.providerID ||
      parentCollHandle.value.data.workspaceID !== "personal"
    ) {
      return Promise.resolve(E.left("INVALID_WORKSPACE_HANDLE" as const))
    }

    return Promise.resolve(
      E.right(
        computed(() => {
          if (
            parentCollHandle.value.type !== "ok" ||
            parentCollHandle.value.data.providerID !== this.providerID ||
            parentCollHandle.value.data.workspaceID !== "personal"
          ) {
            return {
              type: "invalid" as const,
              reason: "WORKSPACE_INVALIDATED" as const,
            }
          }

          const possibleActiveTab = this.tabs.getTabRefWithSaveContext({
            originLocation: "user-collection",
            requestIndex,
            collPath,
          })

          editRESTRequest(collPath, requestIndex, request)

          if (possibleActiveTab) {
            possibleActiveTab.value.document.request.name = request.name
            nextTick(() => {
              possibleActiveTab.value.document.isDirty = false
            })
          }

          return {
            type: "ok",
            data: {
              providerID: this.providerID,
              workspaceID: parentCollHandle.value.data.workspaceID,
              collectionID: parentCollHandle.value.data.workspaceID,
              name: "",
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

          return {
            type: "ok",
            data: {
              providerID: this.providerID,
              workspaceID: workspaceHandle.value.data.workspaceID,
              collectionID,
              name: "" as const,
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
                const indexPath = collectionID
                  .split("/")
                  .map((x) => parseInt(x))

                const item = this.navigateToFolderWithIndexPath(
                  this.restCollectionState.value.state,
                  indexPath
                )

                if (item) {
                  const collections = item.folders.map((childColl, id) => {
                    return <RESTCollectionViewItem>{
                      type: "collection",
                      value: {
                        collectionID: `${collectionID}/${id}`,
                        name: childColl.name,
                      },
                    }
                  })

                  const requests = item.requests.map((req, id) => {
                    return <RESTCollectionViewItem>{
                      type: "request",
                      value: {
                        requestID: `${collectionID}/${id}`,
                        name: req.name,
                        method: req.method,
                        request: req,
                      },
                    }
                  })

                  return [...collections, ...requests]
                }
                return []
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
                return this.restCollectionState.value.state.map((coll, id) => {
                  return {
                    collectionID: id.toString(),
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
