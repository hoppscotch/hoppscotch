import { HoppCollection } from "@hoppscotch/data"
import { ChildrenResult, SmartTreeAdapter } from "@hoppscotch/ui"
import { Ref, computed, ref } from "vue"
import { navigateToFolderWithIndexPath } from "~/newstore/collections"
import { RESTCollectionViewItem } from "~/services/new-workspace/view"

export class WorkspaceRESTSearchCollectionTreeAdapter
  implements SmartTreeAdapter<RESTCollectionViewItem>
{
  constructor(public data: Ref<HoppCollection[]>) {}

  getChildren(
    nodeID: string | null
  ): Ref<ChildrenResult<RESTCollectionViewItem>> {
    const result = ref<ChildrenResult<RESTCollectionViewItem>>({
      status: "loading",
    })

    return computed(() => {
      if (nodeID === null) {
        result.value = {
          status: "loaded",
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
      } else {
        const indexPath = nodeID.split("/").map((x) => parseInt(x))

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
                      item.folders?.length > 1
                        ? childCollectionID === item.folders.length - 1
                        : false,
                    collectionID: `${nodeID}/${childCollectionID}`,
                    name: childCollection.name,
                    parentCollectionID: nodeID,
                  },
                },
              }
            }
          )

          const requests = item.requests.map((request, requestID) => {
            // TODO: Replace `parentCollectionID` with `collectionID`
            return {
              id: `${nodeID}/${requestID}`,
              data: <RESTCollectionViewItem>{
                type: "request",
                value: {
                  isLastItem:
                    item.requests?.length > 1
                      ? requestID === item.requests.length - 1
                      : false,
                  parentCollectionID: nodeID,
                  collectionID: nodeID,
                  requestID: `${nodeID}/${requestID}`,
                  request,
                },
              },
            }
          })

          result.value = {
            status: "loaded",
            data: [...collections, ...requests],
          }
        }
      }

      return result.value
    })
  }
}
