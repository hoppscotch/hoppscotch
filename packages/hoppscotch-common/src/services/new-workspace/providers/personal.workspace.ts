import { HoppCollection, makeCollection } from "@hoppscotch/data"
import { Service } from "dioc"
import * as E from "fp-ts/Either"
import { Ref, computed, markRaw, ref, shallowRef } from "vue"

import PersonalWorkspaceSelector from "~/components/workspace/PersonalWorkspaceSelector.vue"
import { useStreamStatic } from "~/composables/stream"

import {
  addRESTCollection,
  addRESTFolder,
  editRESTCollection,
  editRESTFolder,
  editRESTRequest,
  navigateToFolderWithIndexPath,
  removeRESTCollection,
  removeRESTFolder,
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
  WorkspaceRequest,
} from "~/services/new-workspace/workspace"

import IconUser from "~icons/lucide/user"
import { NewWorkspaceService } from ".."
import { HoppRESTRequest } from "@hoppscotch/data"
import path from "path"
import {
  resolveSaveContextOnCollectionReorder,
  getFoldersByPath,
} from "~/helpers/collection/collection"

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
    collectionName: string,
    newCollectionID: string
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

          const newRootCollection = makeCollection({
            name: collectionName,
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

          return {
            type: "ok",
            data: {
              providerID: this.providerID,
              workspaceID: workspaceHandle.value.data.workspaceID,
              collectionID: newCollectionID,
              name: collectionName,
            },
          }
        })
      )
    )
  }

  public createRESTChildCollection(
    parentCollHandle: HandleRef<WorkspaceCollection>,
    collectionName: string
  ): Promise<E.Either<unknown, HandleRef<WorkspaceCollection>>> {
    if (
      parentCollHandle.value.type !== "ok" ||
      parentCollHandle.value.data.providerID !== this.providerID ||
      parentCollHandle.value.data.workspaceID !== "personal"
    ) {
      return Promise.resolve(E.left("INVALID_COLLECTION_HANDLE" as const))
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
              reason: "COLLECTION_INVALIDATED" as const,
            }
          }

          const { collectionID, providerID, workspaceID } =
            parentCollHandle.value.data

          addRESTFolder(collectionName, collectionID)

          platform.analytics?.logEvent({
            type: "HOPP_CREATE_COLLECTION",
            workspaceType: "personal",
            isRootCollection: false,
            platform: "rest",
          })

          return {
            type: "ok",
            data: {
              providerID,
              workspaceID,
              collectionID,
              name: collectionName,
            },
          }
        })
      )
    )
  }

  public editRESTCollection(
    collHandle: HandleRef<WorkspaceCollection>,
    updatedCollection: HoppCollection
  ): Promise<E.Either<unknown, HandleRef<boolean>>> {
    if (
      collHandle.value.type !== "ok" ||
      collHandle.value.data.providerID !== this.providerID ||
      collHandle.value.data.workspaceID !== "personal"
    ) {
      return Promise.resolve(E.left("INVALID_WORKSPACE_HANDLE" as const))
    }

    return Promise.resolve(
      E.right(
        computed(() => {
          if (
            collHandle.value.type !== "ok" ||
            collHandle.value.data.providerID !== this.providerID ||
            collHandle.value.data.workspaceID !== "personal"
          ) {
            return {
              type: "invalid" as const,
              reason: "WORKSPACE_INVALIDATED" as const,
            }
          }

          const { collectionID } = collHandle.value.data

          const collection: HoppCollection | null =
            navigateToFolderWithIndexPath(
              this.restCollectionState.value.state,
              collectionID.split("/").map((id) => parseInt(id))
            )

          if (!collection) {
            return {
              type: "invalid" as const,
              reason: "COLLECTION_NOT_FOUND" as const,
            }
          }

          const isRootCollection = collectionID.split("/").length === 1

          if (isRootCollection) {
            editRESTCollection(parseInt(collectionID), updatedCollection)
          } else {
            editRESTFolder(collectionID, updatedCollection)
          }

          return {
            type: "ok",
            data: true,
          }
        })
      )
    )
  }

  public removeRESTRootCollection(
    collHandle: HandleRef<WorkspaceCollection>
  ): Promise<E.Either<unknown, HandleRef<boolean>>> {
    if (
      collHandle.value.type !== "ok" ||
      collHandle.value.data.providerID !== this.providerID ||
      collHandle.value.data.workspaceID !== "personal"
    ) {
      return Promise.resolve(E.left("INVALID_WORKSPACE_HANDLE" as const))
    }

    return Promise.resolve(
      E.right(
        computed(() => {
          if (
            collHandle.value.type !== "ok" ||
            collHandle.value.data.providerID !== this.providerID ||
            collHandle.value.data.workspaceID !== "personal"
          ) {
            return {
              type: "invalid" as const,
              reason: "WORKSPACE_INVALIDATED" as const,
            }
          }

          const { collectionID } = collHandle.value.data

          const collectionIndex = parseInt(collectionID)

          const collectionToRemove = navigateToFolderWithIndexPath(
            restCollectionStore.value.state,
            [collectionIndex]
          )

          removeRESTCollection(
            collectionIndex,
            collectionToRemove ? collectionToRemove.id : undefined
          )

          resolveSaveContextOnCollectionReorder({
            lastIndex: collectionIndex,
            newIndex: -1,
            folderPath: "", // root collection
            length: this.restCollectionState.value.state.length,
          })

          return {
            type: "ok",
            data: true,
          }
        })
      )
    )
  }

  public removeRESTChildCollection(
    parentCollHandle: HandleRef<WorkspaceCollection>
  ): Promise<E.Either<unknown, HandleRef<boolean>>> {
    if (
      parentCollHandle.value.type !== "ok" ||
      parentCollHandle.value.data.providerID !== this.providerID ||
      parentCollHandle.value.data.workspaceID !== "personal"
    ) {
      return Promise.resolve(E.left("INVALID_COLLECTION_HANDLE" as const))
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
              reason: "COLLECTION_INVALIDATED" as const,
            }
          }

          const { collectionID } = parentCollHandle.value.data

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

          const parentFolder = collectionID.split("/").slice(0, -1).join("/") // remove last folder to get parent folder
          resolveSaveContextOnCollectionReorder({
            lastIndex: this.pathToLastIndex(collectionID),
            newIndex: -1,
            folderPath: parentFolder,
            length: getFoldersByPath(
              this.restCollectionState.value.state,
              parentFolder
            ).length,
          })

          return {
            type: "ok",
            data: true,
          }
        })
      )
    )
  }

  public createRESTRequest(
    parentCollHandle: HandleRef<WorkspaceCollection>,
    newRequest: HoppRESTRequest
  ): Promise<E.Either<unknown, HandleRef<WorkspaceRequest>>> {
    if (
      parentCollHandle.value.type !== "ok" ||
      parentCollHandle.value.data.providerID !== this.providerID ||
      parentCollHandle.value.data.workspaceID !== "personal"
    ) {
      return Promise.resolve(E.left("INVALID_COLLECTION_HANDLE" as const))
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
              reason: "COLLECTION_INVALIDATED" as const,
            }
          }

          const { collectionID, providerID, workspaceID } =
            parentCollHandle.value.data

          const insertionIndex = saveRESTRequestAs(collectionID, newRequest)

          platform.analytics?.logEvent({
            type: "HOPP_SAVE_REQUEST",
            workspaceType: "personal",
            createdNow: true,
            platform: "rest",
          })

          const requestID = `${collectionID}/${insertionIndex}`

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
  ): Promise<E.Either<unknown, HandleRef<boolean>>> {
    if (
      requestHandle.value.type !== "ok" ||
      requestHandle.value.data.providerID !== this.providerID ||
      requestHandle.value.data.workspaceID !== "personal"
    ) {
      return Promise.resolve(E.left("INVALID_REQUEST_HANDLE" as const))
    }

    return Promise.resolve(
      E.right(
        computed(() => {
          if (
            requestHandle.value.type !== "ok" ||
            requestHandle.value.data.providerID !== this.providerID ||
            requestHandle.value.data.workspaceID !== "personal"
          ) {
            return {
              type: "invalid" as const,
              reason: "REQUEST_INVALIDATED" as const,
            }
          }

          const { collectionID, requestID } = requestHandle.value.data
          const requestIndex = parseInt(requestID.split("/").slice(-1)[0])

          const requestToRemove = navigateToFolderWithIndexPath(
            restCollectionStore.value.state,
            collectionID.split("/").map((id) => parseInt(id))
          )?.requests[requestIndex]

          removeRESTRequest(collectionID, requestIndex, requestToRemove?.id)

          return {
            type: "ok",
            data: true,
          }
        })
      )
    )
  }

  public updateRESTRequest(
    requestHandle: HandleRef<WorkspaceRequest>,
    updatedRequest: HoppRESTRequest
  ): Promise<E.Either<unknown, HandleRef<boolean>>> {
    if (
      requestHandle.value.type !== "ok" ||
      requestHandle.value.data.providerID !== this.providerID ||
      requestHandle.value.data.workspaceID !== "personal"
    ) {
      return Promise.resolve(E.left("INVALID_REQUEST_HANDLE" as const))
    }

    return Promise.resolve(
      E.right(
        computed(() => {
          if (
            requestHandle.value.type !== "ok" ||
            requestHandle.value.data.providerID !== this.providerID ||
            requestHandle.value.data.workspaceID !== "personal"
          ) {
            return {
              type: "invalid" as const,
              reason: "REQUEST_INVALIDATED" as const,
            }
          }

          const { collectionID, requestID } = requestHandle.value.data

          try {
            const requestIndex = parseInt(requestID)
            editRESTRequest(collectionID, requestIndex, updatedRequest)

            platform.analytics?.logEvent({
              type: "HOPP_SAVE_REQUEST",
              platform: "rest",
              createdNow: false,
              workspaceType: "personal",
            })
          } catch (err) {
            return {
              type: "invalid" as const,
              reason: "REQUEST_PATH_NOT_FOUND" as const,
            }
          }

          return {
            type: "ok",
            data: true,
          }
        })
      )
    )
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

          if (!collectionID) {
            return {
              type: "invalid" as const,
              reason: "INVALID_COLLECTION_HANDLE" as const,
            }
          }

          const collection = navigateToFolderWithIndexPath(
            this.restCollectionState.value.state,
            collectionID.split("/").map((x) => parseInt(x))
          ) as HoppCollection

          const { providerID, workspaceID } = workspaceHandle.value.data

          return {
            type: "ok",
            data: {
              providerID,
              workspaceID,
              collectionID,
              name: collection?.name,
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

          if (!requestID) {
            return {
              type: "invalid" as const,
              reason: "INVALID_REQUEST_HANDLE" as const,
            }
          }

          const { providerID, workspaceID } = workspaceHandle.value.data

          const collectionID = requestID.split("/").slice(0, -1).join("/")
          const requestIndexPath = requestID.split("/").slice(-1)[0]

          if (!requestIndexPath) {
            return {
              type: "invalid" as const,
              reason: "INVALID_REQUEST_HANDLE" as const,
            }
          }

          const requestIndex = parseInt(requestIndexPath)

          // Navigate to the collection containing the request
          const collection = navigateToFolderWithIndexPath(
            this.restCollectionState.value.state,
            collectionID.split("/").map((x) => parseInt(x))
          )

          // Grab the request with it's index
          const request = collection?.requests[requestIndex] as HoppRESTRequest

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
              mayHaveMoreContent: ref(false),

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
                        name: childColl.name,
                      },
                    }
                  })

                  const requests = item.requests.map((req, id) => {
                    return <RESTCollectionViewItem>{
                      type: "request",
                      value: {
                        requestID: `${collectionID}/${id}`,
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
      },
    })
  }
}
