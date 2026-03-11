import { HoppCollection } from "@hoppscotch/data"
import { ChildrenResult, SmartTreeAdapter } from "@hoppscotch/ui"
import { Ref, computed } from "vue"
import { navigateToFolderWithIndexPath } from "~/newstore/collections"
import { RESTCollectionViewItem } from "~/services/new-workspace/view"

export class WorkspaceRESTSearchCollectionTreeAdapter
  implements SmartTreeAdapter<RESTCollectionViewItem>
{
  constructor(public data: Ref<HoppCollection[]>) {}

  getChildren(
    nodeID: string | null
  ): Ref<ChildrenResult<RESTCollectionViewItem>> {
    return computed(() => {
      if (nodeID === null) {
        return {
          status: "loaded" as const,
          data: this.data.value.map((item, index) => ({
            id: index.toString(),

            data: <RESTCollectionViewItem>{
              type: "collection",
              value: {
                collectionID: index.toString(),
                isLastItem: index === this.data.value.length - 1,
                name: item.name,
                parentCollectionID: null,
              },
            },
          })),
        }
      }

      const indexPath = nodeID.split("/").map((x) => parseInt(x, 10))

      const item = navigateToFolderWithIndexPath(this.data.value, indexPath)

      if (item) {
        const collections = item.folders.map(
          (childCollection, childCollectionID) => {
            return {
              id: `${nodeID}/${childCollectionID}`,
              data: <RESTCollectionViewItem>{
                type: "collection",
                value: {
                  isLastItem:
                    childCollectionID === item.folders.length - 1,
                  collectionID: `${nodeID}/${childCollectionID}`,
                  name: childCollection.name,
                  parentCollectionID: nodeID,
                },
              },
            }
          }
        )

        const requests = item.requests.map((request, requestID) => {
          return {
            id: `${nodeID}/${requestID}`,
            data: <RESTCollectionViewItem>{
              type: "request",
              value: {
                isLastItem:
                    requestID === item.requests.length - 1,
                parentCollectionID: nodeID,
                collectionID: nodeID,
                requestID: `${nodeID}/${requestID}`,
                request,
              },
            },
          }
        })

        return {
          status: "loaded" as const,
          data: [...collections, ...requests],
        }
      }

      return {
        status: "loading" as const,
      }
    })
  }
}
