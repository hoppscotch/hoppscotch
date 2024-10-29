import { ChildrenResult, SmartTreeAdapter } from "@hoppscotch/ui/helpers"
import { Ref } from "vue"
import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import { computed } from "vue"

export type Collection = {
  type: "collections"
  isLastItem: boolean
  data: {
    parentIndex: null
    data: HoppCollection
  }
}

type Folder = {
  type: "folders"
  isLastItem: boolean
  data: {
    parentIndex: string
    data: HoppCollection
  }
}

type Requests = {
  type: "requests"
  isLastItem: boolean
  data: {
    parentIndex: string
    data: HoppRESTRequest
  }
}

export type CollectionNode = Collection | Folder | Requests

export class TestRunnerCollectionsAdapter
  implements SmartTreeAdapter<CollectionNode>
{
  constructor(public data: Ref<HoppCollection[]>) {}

  navigateToFolderWithIndexPath(
    collections: HoppCollection[],
    indexPaths: number[]
  ) {
    if (indexPaths.length === 0) return null

    let target = collections[indexPaths.shift() as number]

    while (indexPaths.length > 0)
      target = target.folders[indexPaths.shift() as number]

    return target !== undefined ? target : null
  }

  getChildren(id: string | null): Ref<ChildrenResult<any>> {
    return computed(() => {
      if (id === null) {
        const data = this.data.value.map((item, index) => ({
          id: `folder-${index.toString()}`,
          data: {
            type: "collections",
            isLastItem: index === this.data.value.length - 1,
            data: {
              parentIndex: null,
              data: item,
            },
          },
        }))
        return {
          status: "loaded",
          data: data,
        } as ChildrenResult<Collection>
      }

      const childType = id.split("-")[0]

      if (childType === "request") {
        return {
          status: "loaded",
          data: [],
        }
      }

      const folderId = id.split("-")[1]

      const indexPath = folderId.split("/").map((x) => parseInt(x))

      const item = this.navigateToFolderWithIndexPath(
        this.data.value,
        indexPath
      )

      if (item) {
        const data = [
          ...item.folders.map((folder, index) => ({
            id: `folder-${folderId}/${index}`,
            data: {
              isLastItem:
                item.folders && item.folders.length > 1
                  ? index === item.folders.length - 1
                  : false,
              type: "folders",
              isSelected: true,
              data: {
                parentIndex: id,
                data: folder,
              },
            },
          })),
          ...item.requests.map((requests, index) => ({
            id: `request-${id}/${index}`,
            data: {
              isLastItem:
                item.requests && item.requests.length > 1
                  ? index === item.requests.length - 1
                  : false,
              type: "requests",
              isSelected: true,
              data: {
                parentIndex: id,
                data: requests,
              },
            },
          })),
        ]

        return {
          status: "loaded",
          data: data,
        } as ChildrenResult<Folder | Request>
      } else {
        return {
          status: "loaded",
          data: [],
        }
      }
    })
  }
}
