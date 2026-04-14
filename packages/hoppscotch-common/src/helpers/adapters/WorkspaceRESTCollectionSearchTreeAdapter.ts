import { HoppCollection } from "@hoppscotch/data"
import { ChildrenResult, SmartTreeAdapter } from "@hoppscotch/ui"
import { Ref, computed } from "vue"
import { RESTCollectionViewItem } from "~/services/new-workspace/view"

// Shape covers both `HoppCollection` (personal — uses `folders`) and
// `TeamCollection` (teams — uses `children`). Normalized at access time
// so a single adapter handles both workspaces.
type SearchTreeNode = {
  name?: string
  title?: string
  folders?: SearchTreeNode[] | null
  children?: SearchTreeNode[] | null
  requests?: Array<{ name?: string; title?: string; [key: string]: unknown }> | null
}

const getChildCollections = (node: SearchTreeNode): SearchTreeNode[] =>
  node.folders ?? node.children ?? []

const getNodeName = (node: SearchTreeNode): string =>
  node.name ?? node.title ?? ""

// Local tree walk — does not depend on `folders` shape unlike the
// personal-workspace `navigateToFolderWithIndexPath` helper.
const navigateToNode = (
  roots: SearchTreeNode[],
  indexPath: number[]
): SearchTreeNode | null => {
  if (indexPath.length === 0) return null
  let current: SearchTreeNode | undefined = roots[indexPath[0]]
  for (let i = 1; i < indexPath.length && current; i++) {
    current = getChildCollections(current)[indexPath[i]]
  }
  return current ?? null
}

export class WorkspaceRESTSearchCollectionTreeAdapter
  implements SmartTreeAdapter<RESTCollectionViewItem>
{
  constructor(public data: Ref<HoppCollection[]>) {}

  getChildren(
    nodeID: string | null
  ): Ref<ChildrenResult<RESTCollectionViewItem>> {
    return computed(() => {
      const roots = this.data.value as unknown as SearchTreeNode[]

      if (nodeID === null) {
        return {
          status: "loaded" as const,
          data: roots.map((item, index) => ({
            id: index.toString(),

            data: <RESTCollectionViewItem>{
              type: "collection",
              value: {
                collectionID: index.toString(),
                isLastItem: index === roots.length - 1,
                name: getNodeName(item),
                parentCollectionID: null,
              },
            },
          })),
        }
      }

      const indexPath = nodeID.split("/").map((x) => parseInt(x, 10))
      const item = navigateToNode(roots, indexPath)

      if (item) {
        const childCollections = getChildCollections(item)
        const collections = childCollections.map(
          (childCollection, childCollectionID) => {
            return {
              id: `${nodeID}/${childCollectionID}`,
              data: <RESTCollectionViewItem>{
                type: "collection",
                value: {
                  isLastItem:
                    childCollectionID === childCollections.length - 1,
                  collectionID: `${nodeID}/${childCollectionID}`,
                  name: getNodeName(childCollection),
                  parentCollectionID: nodeID,
                },
              },
            }
          }
        )

        const requestsList = item.requests ?? []
        const requests = requestsList.map((request, requestID) => {
          return {
            id: `${nodeID}/${requestID}`,
            data: <RESTCollectionViewItem>{
              type: "request",
              value: {
                isLastItem: requestID === requestsList.length - 1,
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
        status: "loaded" as const,
        data: [],
      }
    })
  }
}
