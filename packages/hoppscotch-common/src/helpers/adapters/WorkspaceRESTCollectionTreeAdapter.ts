import { ChildrenResult, SmartTreeAdapter } from "@hoppscotch/ui"
import * as E from "fp-ts/Either"
import { EffectScope, Ref, effectScope, ref, watchEffect } from "vue"
import { NewWorkspaceService } from "~/services/new-workspace"
import { Handle } from "~/services/new-workspace/handle"
import { RESTCollectionViewItem } from "~/services/new-workspace/view"
import { Workspace } from "~/services/new-workspace/workspace"

export class WorkspaceRESTCollectionTreeAdapter
  implements SmartTreeAdapter<RESTCollectionViewItem>
{
  private scope: EffectScope

  constructor(
    private workspaceHandle: Handle<Workspace>,
    private workspaceService: NewWorkspaceService
  ) {
    this.scope = effectScope()
  }

  public dispose() {
    this.scope.stop()
  }

  public getChildren(
    nodeID: string | null,
    nodeType?: string
  ): Ref<ChildrenResult<RESTCollectionViewItem>> {
    const workspaceHandleRef = this.workspaceHandle.get()

    if (workspaceHandleRef.value.type !== "ok") {
      throw new Error("Cannot issue children with invalid workspace handle")
    }

    const result = ref<ChildrenResult<RESTCollectionViewItem>>({
      status: "loading",
    })

    if (nodeID !== null) {
      ;(async () => {
        if (nodeType === "request") {
          result.value = {
            status: "loaded",
            data: [],
          }
          return
        }

        const collectionHandleResult =
          await this.workspaceService.getRESTCollectionHandle(
            this.workspaceHandle,
            nodeID
          )

        if (E.isLeft(collectionHandleResult)) {
          result.value = { status: "loaded", data: [] }
          return
        }

        const collectionHandle = collectionHandleResult.right

        const collectionChildrenResult =
          await this.workspaceService.getRESTCollectionChildrenView(
            collectionHandle
          )

        if (E.isLeft(collectionChildrenResult)) {
          result.value = { status: "loaded", data: [] }
          return
        }

        const collectionChildrenViewHandle =
          collectionChildrenResult.right.get()

        this.scope.run(() => {
          watchEffect(() => {
            if (collectionChildrenViewHandle.value.type !== "ok") return

            if (collectionChildrenViewHandle.value.data.loading.value) {
              result.value = {
                status: "loading",
              }
            } else {
              result.value = {
                status: "loaded",
                data: collectionChildrenViewHandle.value.data.content.value.map(
                  (item) => ({
                    id:
                      item.type === "request"
                        ? item.value.requestID
                        : item.value.collectionID,

                    data: item,
                  })
                ),
              }
            }
          })
        })
      })()
    } else {
      ;(async () => {
        const viewResult =
          await this.workspaceService.getRESTRootCollectionView(
            this.workspaceHandle
          )

        if (E.isLeft(viewResult)) {
          result.value = { status: "loaded", data: [] }
          return
        }

        const viewHandle = viewResult.right.get()

        this.scope.run(() => {
          watchEffect(() => {
            if (viewHandle.value.type !== "ok") return

            if (viewHandle.value.data.loading.value) {
              result.value = {
                status: "loading",
              }
            } else {
              result.value = {
                status: "loaded",
                data: viewHandle.value.data.collections.value.map((coll) => ({
                  id: coll.collectionID,

                  data: {
                    type: "collection",
                    value: coll,
                  },
                })),
              }
            }
          })
        })
      })()
    }

    return result
  }
}
